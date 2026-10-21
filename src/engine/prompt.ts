/**
 * Prompt assembly.
 *
 * The builder is deterministic: the same selections, catalog and profile
 * always produce the same prompt. It never invents content, never adds
 * unselected options and never reorders a category against the profile.
 */
import type {
  BuildResult,
  CatalogDocument,
  CatalogEntry,
  Locale,
  ModelProfile,
  OmittedEntry,
  PromptFragment,
  PromptWarning,
  SelectionMap,
} from '../catalog/types';
import { cleanFragment, findRedundancy } from './dedupe';
import { exclusiveGroupConflict, indexCatalog } from './compatibility';

export interface BuildPromptInput {
  catalog: CatalogDocument;
  selections: SelectionMap;
  profile?: ModelProfile | null;
  promptLocale: Locale;
  /** Negative prompt written by the user (never generated automatically). */
  negative?: string;
}

/** General purpose profile used when no model specific profile is selected. */
export const GENERAL_PROFILE_ID = 'general';

interface Candidate {
  entry: CatalogEntry;
  categoryId: string;
  categoryOrder: number;
  entryIndex: number;
}

/**
 * Effective assembly order: the profile order first, then every remaining
 * catalog category that the profile did not mention (and did not omit).
 */
export function effectiveCategoryOrder(catalog: CatalogDocument, profile?: ModelProfile | null): string[] {
  const byId = new Map(catalog.categories.map((c) => [c.id, c] as const));
  const omitted = new Set(profile?.omit ?? []);
  const ordered: string[] = [];

  for (const id of profile?.order ?? []) {
    if (byId.has(id) && !omitted.has(id) && !ordered.includes(id)) ordered.push(id);
  }
  const rest = catalog.categories
    .filter((c) => !omitted.has(c.id) && !ordered.includes(c.id))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  for (const category of rest) ordered.push(category.id);
  return ordered;
}

function collectCandidates(catalog: CatalogDocument, selections: SelectionMap, order: string[]): {
  candidates: Candidate[];
  unknown: string[];
} {
  const index = indexCatalog(catalog);
  const orderIndex = new Map(order.map((id, i) => [id, i] as const));
  const candidates: Candidate[] = [];
  const unknown: string[] = [];

  for (const [categoryId, ids] of Object.entries(selections)) {
    const category = index.categories.get(categoryId);
    if (!category) {
      unknown.push(...ids);
      continue;
    }
    for (const id of ids) {
      const entry = index.entries.get(id);
      if (!entry || index.categoryOfEntry.get(id) !== categoryId) {
        unknown.push(id);
        continue;
      }
      candidates.push({
        entry,
        categoryId,
        categoryOrder: orderIndex.get(categoryId) ?? Number.MAX_SAFE_INTEGER,
        entryIndex: category.entries.indexOf(entry),
      });
    }
  }
  return { candidates, unknown };
}

/**
 * Build the final prompt.
 */
export function buildPrompt(input: BuildPromptInput): BuildResult {
  const { catalog, selections, profile, promptLocale } = input;
  const warnings: PromptWarning[] = [];
  const omitted: OmittedEntry[] = [];
  const index = indexCatalog(catalog);

  const order = effectiveCategoryOrder(catalog, profile);
  const omittedCategories = new Set(profile?.omit ?? []);
  const { candidates, unknown } = collectCandidates(catalog, selections, order);

  if (unknown.length > 0) {
    warnings.push({
      code: 'unknown-entry',
      message: `${unknown.length} selection(s) no longer exist in the catalog and were ignored.`,
      entryIds: unknown,
      categoryIds: [],
    });
  }

  // categories excluded by the profile are not sent to the model
  const allowed = candidates.filter((candidate) => !omittedCategories.has(candidate.categoryId));
  if (allowed.length !== candidates.length) {
    warnings.push({
      code: 'incompatible-category',
      message: 'Some categories are not supported by the selected model profile and were left out.',
      entryIds: [],
      categoryIds: [],
    });
  }

  // 1. order candidates: category order, then the order inside the category
  const ordered = [...allowed].sort(
    (a, b) => a.categoryOrder - b.categoryOrder || a.entryIndex - b.entryIndex,
  );

  // 2. drop entries beyond the category limit
  const perCategory = new Map<string, number>();
  const limitOk: Candidate[] = [];
  for (const candidate of ordered) {
    const category = index.categories.get(candidate.categoryId);
    const limit = category?.maxSelections;
    const used = perCategory.get(candidate.categoryId) ?? 0;
    if (limit !== undefined && used >= limit) {
      omitted.push({
        entryId: candidate.entry.id,
        categoryId: candidate.categoryId,
        reason: 'max-selections',
      });
      continue;
    }
    perCategory.set(candidate.categoryId, used + 1);
    limitOk.push(candidate);
  }
  if (omitted.some((o) => o.reason === 'max-selections')) {
    warnings.push({
      code: 'max-selections',
      message: 'Some selections exceeded the maximum allowed for their category and were left out of the prompt.',
      entryIds: omitted.filter((o) => o.reason === 'max-selections').map((o) => o.entryId),
      categoryIds: [],
    });
  }

  // 3. hard conflicts: the later entry is left out, the selection stays visible
  const kept: Candidate[] = [];
  const activeIds = new Set<string>();
  for (const candidate of limitOk) {
    const conflict = kept.find((other) => {
      const declared =
        (other.entry.conflicts?.includes(candidate.entry.id) ?? false) ||
        (candidate.entry.conflicts?.includes(other.entry.id) ?? false);
      if (declared) return true;
      if (other.categoryId !== candidate.categoryId) return false;
      return exclusiveGroupConflict(
        index.categories.get(candidate.categoryId),
        other.entry,
        candidate.entry,
      );
    });
    if (conflict) {
      omitted.push({ entryId: candidate.entry.id, categoryId: candidate.categoryId, reason: 'conflict' });
      warnings.push({
        code: 'conflict',
        message: `"${candidate.entry.id}" contradicts "${conflict.entry.id}" and was left out of the prompt. The selection is kept so you can change it.`,
        entryIds: [conflict.entry.id, candidate.entry.id],
        categoryIds: [conflict.categoryId, candidate.categoryId],
      });
      continue;
    }
    kept.push(candidate);
    activeIds.add(candidate.entry.id);
  }

  // 4. soft conflicts are reported but both fragments stay
  for (let i = 0; i < kept.length; i += 1) {
    const a = kept[i];
    if (!a) continue;
    for (let j = i + 1; j < kept.length; j += 1) {
      const b = kept[j];
      if (!b) continue;
      const soft =
        (a.entry.softConflicts?.includes(b.entry.id) ?? false) ||
        (b.entry.softConflicts?.includes(a.entry.id) ?? false);
      if (soft) {
        warnings.push({
          code: 'soft-conflict',
          message: `"${a.entry.id}" and "${b.entry.id}" are an unusual combination.`,
          entryIds: [a.entry.id, b.entry.id],
          categoryIds: [a.categoryId, b.categoryId],
        });
      }
    }
  }

  // 5. missing requirements
  for (const candidate of kept) {
    const missing = (candidate.entry.requires ?? []).filter((id) => !activeIds.has(id));
    if (missing.length > 0) {
      warnings.push({
        code: 'missing-requirement',
        message: `"${candidate.entry.id}" works better together with ${missing.join(', ')}.`,
        entryIds: [candidate.entry.id, ...missing],
        categoryIds: [candidate.categoryId],
      });
    }
  }

  // 6. redundancy (exact duplicates and shared synonyms)
  const prepared = kept.map((candidate) => ({
    entryId: candidate.entry.id,
    categoryId: candidate.categoryId,
    text: cleanFragment(candidate.entry.prompt[promptLocale] || candidate.entry.prompt.en),
    synonyms: candidate.entry.synonyms,
  }));
  const redundancy = findRedundancy(prepared);
  const redundantIds = new Set(redundancy.map((r) => r.entryId));
  const finalCandidates = kept.filter((candidate) => !redundantIds.has(candidate.entry.id));
  for (const item of redundancy) {
    omitted.push({
      entryId: item.entryId,
      categoryId: index.categoryOfEntry.get(item.entryId) ?? '',
      reason: item.kind,
    });
    warnings.push({
      code: item.kind,
      message:
        item.kind === 'duplicate'
          ? `"${item.entryId}" repeats information already in the prompt and was removed.`
          : `"${item.entryId}" says the same thing as "${item.keptEntryId}" and was removed.`,
      entryIds: [item.keptEntryId, item.entryId],
      categoryIds: [],
    });
  }

  // 7. assemble
  const fragments: PromptFragment[] = finalCandidates.map((candidate, index) => ({
    entryId: candidate.entry.id,
    categoryId: candidate.categoryId,
    text: candidate.entry.prompt[promptLocale] || candidate.entry.prompt.en,
    index,
  }));

  const prefix = profile?.prefix ? cleanFragment(profile.prefix[promptLocale] || profile.prefix.en) : '';
  const body = fragments
    .map((fragment) => cleanFragment(fragment.text))
    .filter((text) => text.length > 0)
    .join(', ');
  let prompt = prefix && body ? `${prefix}, ${body}` : body || prefix;
  if (prompt && profile?.promptStyle === 'sentences') {
    prompt = `${prompt}.`;
  }
  prompt = prompt.replace(/\s*,\s*,+/g, ', ').replace(/,\s*$/, '').trim();

  const negative = (input.negative ?? '').trim();
  if (negative && profile && profile.negative.supported === false) {
    warnings.push({
      code: 'negative-unsupported',
      message: profile.negative.note
        ? `Negative prompt: ${profile.negative.note}`
        : `The "${profile.name.en}" profile reports no documented negative prompt support.`,
      entryIds: [],
      categoryIds: [],
    });
  }

  if (prompt === '') {
    warnings.push({
      code: 'empty',
      message: 'No selection produced a prompt yet.',
      entryIds: [],
      categoryIds: [],
    });
  }

  return {
    prompt,
    negative,
    fragments,
    warnings,
    omitted,
    profileId: profile?.id ?? GENERAL_PROFILE_ID,
  };
}
