/**
 * Compatibility rules.
 *
 * All rules are data driven (the `conflicts`, `softConflicts` and `requires`
 * fields of the catalog entries) so that they can be tested in isolation and
 * extended by editing data only.
 */
import type { CatalogDocument, CatalogEntry, CategoryDef, SelectionMap } from '../catalog/types';

export interface ConflictIssue {
  kind: 'hard' | 'soft';
  entryIds: [string, string];
  categoryIds: [string, string];
  detail: string;
}

export interface RequirementIssue {
  entryId: string;
  missing: string[];
}

export interface SelectionIssue {
  categoryId: string;
  kind: 'unknown-category' | 'unknown-entry' | 'max-selections' | 'conflict' | 'soft-conflict' | 'missing-requirement';
  entryIds: string[];
  message: string;
}

export interface CatalogIndex {
  categories: Map<string, CategoryDef>;
  entries: Map<string, CatalogEntry>;
  categoryOfEntry: Map<string, string>;
}

/** Build lookup maps for a catalog (O(n) once, then O(1) lookups). */
export function indexCatalog(catalog: CatalogDocument): CatalogIndex {
  const categories = new Map<string, CategoryDef>();
  const entries = new Map<string, CatalogEntry>();
  const categoryOfEntry = new Map<string, string>();
  for (const category of catalog.categories) {
    categories.set(category.id, category);
    for (const entry of category.entries) {
      entries.set(entry.id, entry);
      categoryOfEntry.set(entry.id, category.id);
    }
  }
  return { categories, entries, categoryOfEntry };
}

/** Remove selection ids that do not exist in the catalog any more. */
export function sanitizeSelections(catalog: CatalogDocument, selections: SelectionMap): {
  clean: SelectionMap;
  removed: string[];
} {
  const index = indexCatalog(catalog);
  const clean: SelectionMap = {};
  const removed: string[] = [];
  for (const [categoryId, ids] of Object.entries(selections)) {
    const kept = ids.filter((id) => {
      const known = index.entries.has(id) && index.categoryOfEntry.get(id) === categoryId;
      if (!known) removed.push(id);
      return known;
    });
    if (kept.length > 0) clean[categoryId] = kept;
  }
  return { clean, removed };
}

/**
 * Two entries of the same category conflict when they sit in subgroups that
 * the category declares mutually exclusive (a dress next to a top).
 */
export function exclusiveGroupConflict(
  category: CategoryDef | undefined,
  a: CatalogEntry,
  b: CatalogEntry,
): boolean {
  if (!category?.exclusiveGroups?.length) return false;
  const exclusive = new Set(category.exclusiveGroups);
  const aGroup = a.group ?? null;
  const bGroup = b.group ?? null;
  if (aGroup === bGroup) return false;
  return exclusive.has(aGroup ?? '') || exclusive.has(bGroup ?? '');
}

/** Detect hard and soft conflicts between the selected entries. */
export function findConflicts(
  selections: SelectionMap,
  index: CatalogIndex,
): ConflictIssue[] {
  const issues: ConflictIssue[] = [];
  const active: Array<{ id: string; entry: CatalogEntry; categoryId: string }> = [];
  for (const [categoryId, ids] of Object.entries(selections)) {
    for (const id of ids) {
      const entry = index.entries.get(id);
      if (entry) active.push({ id, entry, categoryId });
    }
  }
  for (let i = 0; i < active.length; i += 1) {
    const a = active[i];
    if (!a) continue;
    for (let j = i + 1; j < active.length; j += 1) {
      const b = active[j];
      if (!b) continue;
      const aHard = a.entry.conflicts?.includes(b.id) ?? false;
      const bHard = b.entry.conflicts?.includes(a.id) ?? false;
      if (aHard || bHard) {
        issues.push({
          kind: 'hard',
          entryIds: [a.id, b.id],
          categoryIds: [a.categoryId, b.categoryId],
          detail: `"${a.id}" and "${b.id}" cannot be combined`,
        });
        continue;
      }
      if (
        a.categoryId === b.categoryId &&
        exclusiveGroupConflict(index.categories.get(a.categoryId), a.entry, b.entry)
      ) {
        issues.push({
          kind: 'hard',
          entryIds: [a.id, b.id],
          categoryIds: [a.categoryId, b.categoryId],
          detail: `"${a.id}" and "${b.id}" belong to mutually exclusive parts of the same category`,
        });
        continue;
      }
      const aSoft = a.entry.softConflicts?.includes(b.id) ?? false;
      const bSoft = b.entry.softConflicts?.includes(a.id) ?? false;
      if (aSoft || bSoft) {
        issues.push({
          kind: 'soft',
          entryIds: [a.id, b.id],
          categoryIds: [a.categoryId, b.categoryId],
          detail: `"${a.id}" and "${b.id}" are an unusual combination`,
        });
      }
    }
  }
  return issues;
}

/** Find selected entries whose `requires` list is not satisfied. */
export function findMissingRequirements(
  selections: SelectionMap,
  index: CatalogIndex,
): RequirementIssue[] {
  const issues: RequirementIssue[] = [];
  const active = new Set<string>();
  for (const ids of Object.values(selections)) for (const id of ids) active.add(id);
  for (const ids of Object.values(selections)) {
    for (const id of ids) {
      const entry = index.entries.get(id);
      if (!entry?.requires?.length) continue;
      const missing = entry.requires.filter((required) => !active.has(required));
      if (missing.length > 0) issues.push({ entryId: id, missing });
    }
  }
  return issues;
}

/** Full validation of a selection map against the catalog. */
export function validateSelections(
  catalog: CatalogDocument,
  selections: SelectionMap,
): SelectionIssue[] {
  const index = indexCatalog(catalog);
  const issues: SelectionIssue[] = [];

  for (const [categoryId, ids] of Object.entries(selections)) {
    const category = index.categories.get(categoryId);
    if (!category) {
      issues.push({
        categoryId,
        kind: 'unknown-category',
        entryIds: ids,
        message: `Unknown category "${categoryId}"`,
      });
      continue;
    }
    for (const id of ids) {
      if (!index.entries.has(id) || index.categoryOfEntry.get(id) !== categoryId) {
        issues.push({
          categoryId,
          kind: 'unknown-entry',
          entryIds: [id],
          message: `Unknown entry "${id}" in category "${categoryId}"`,
        });
      }
    }
    if (category.maxSelections !== undefined && ids.length > category.maxSelections) {
      issues.push({
        categoryId,
        kind: 'max-selections',
        entryIds: ids.slice(category.maxSelections),
        message: `"${categoryId}" allows at most ${category.maxSelections} selection(s)`,
      });
    }
  }

  for (const conflict of findConflicts(selections, index)) {
    issues.push({
      categoryId: conflict.categoryIds[0] ?? '',
      kind: conflict.kind === 'hard' ? 'conflict' : 'soft-conflict',
      entryIds: conflict.entryIds,
      message: conflict.detail,
    });
  }

  for (const requirement of findMissingRequirements(selections, index)) {
    issues.push({
      categoryId: index.categoryOfEntry.get(requirement.entryId) ?? '',
      kind: 'missing-requirement',
      entryIds: [requirement.entryId, ...requirement.missing],
      message: `"${requirement.entryId}" expects ${requirement.missing.join(', ')} to be selected`,
    });
  }

  return issues;
}
