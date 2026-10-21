/**
 * Randomiser.
 *
 * Builds a plausible combination from the local catalog. It never touches the
 * catalog itself, never calls a remote service and never uses an AI model.
 * A seeded PRNG keeps the behaviour reproducible for tests.
 */
import type { CatalogDocument, CatalogEntry, ModelProfile, SelectionMap } from '../catalog/types';
import { normalizeFragment } from './dedupe';
import { indexCatalog } from './compatibility';
import { effectiveCategoryOrder } from './prompt';

/** Deterministic PRNG (mulberry32). */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RandomizeOptions {
  catalog: CatalogDocument;
  profile?: ModelProfile | null;
  /** 0 = minimal, 1 = everything. Default 0.6. */
  density?: number;
  /** Seed for reproducible results. */
  seed?: number;
  /** Hard cap on the number of selected entries. */
  maxFragments?: number;
}

function pickWeighted(entries: CatalogEntry[], random: () => number): CatalogEntry | undefined {
  const total = entries.reduce((sum, entry) => sum + (entry.weight ?? 1), 0);
  if (total <= 0) return undefined;
  let threshold = random() * total;
  for (const entry of entries) {
    threshold -= entry.weight ?? 1;
    if (threshold <= 0) return entry;
  }
  return entries[entries.length - 1];
}

/**
 * Produce a random but coherent selection map.
 */
export function randomizeSelections(options: RandomizeOptions): SelectionMap {
  const { catalog, profile } = options;
  const density = Math.min(1, Math.max(0, options.density ?? 0.6));
  const maxFragments = options.maxFragments ?? 26;
  const random = createRandom(options.seed ?? Math.floor(Math.random() * 2 ** 31));
  const index = indexCatalog(catalog);
  const order = effectiveCategoryOrder(catalog, profile);

  const selections: SelectionMap = {};
  const picked = new Set<string>();
  const pickedTexts = new Set<string>();
  const pickedSynonyms = new Set<string>();
  let total = 0;

  for (const categoryId of order) {
    if (total >= maxFragments) break;
    const category = index.categories.get(categoryId);
    if (!category) continue;

    // how many entries this category may contribute
    const limit = category.maxSelections ?? 1;
    const wanted = category.control === 'single' ? 1 : Math.max(1, Math.round(density * limit));

    // decide whether the category takes part at all
    const participation = category.control === 'single' ? density * 0.9 + 0.1 : density;
    if (random() > participation) continue;

    const selected: string[] = [];
    for (let i = 0; i < wanted; i += 1) {
      if (total >= maxFragments) break;
      const eligible = category.entries.filter((entry) => {
        if (picked.has(entry.id)) return false;
        // hard conflicts in either direction are not allowed
        for (const other of picked) {
          if (entry.conflicts?.includes(other) ?? false) return false;
          const otherEntry = index.entries.get(other);
          if (otherEntry?.conflicts?.includes(entry.id) ?? false) return false;
        }
        // unmet requirements are skipped: the random result stays coherent
        if ((entry.requires ?? []).some((required) => !picked.has(required))) return false;
        // do not repeat the same wording
        const text = normalizeFragment(entry.prompt.en);
        if (text && pickedTexts.has(text)) return false;
        for (const synonym of entry.synonyms ?? []) {
          const key = normalizeFragment(synonym);
          if (key && pickedSynonyms.has(key)) return false;
        }
        return true;
      });
      if (eligible.length === 0) break;

      // soft conflicts are unlikely, not forbidden
      const safe = eligible.filter(
        (entry) =>
          ![...picked].some((other) => {
            const otherEntry = index.entries.get(other);
            return (
              (entry.softConflicts?.includes(other) ?? false) ||
              (otherEntry?.softConflicts?.includes(entry.id) ?? false)
            );
          }),
      );
      const pool = safe.length > 0 ? safe : eligible;
      const chosen = pickWeighted(pool, random);
      if (!chosen) break;

      picked.add(chosen.id);
      selected.push(chosen.id);
      const text = normalizeFragment(chosen.prompt.en);
      if (text) pickedTexts.add(text);
      for (const synonym of chosen.synonyms ?? []) {
        const key = normalizeFragment(synonym);
        if (key) pickedSynonyms.add(key);
      }
      total += 1;
    }

    if (selected.length > 0) selections[categoryId] = selected;
  }

  return selections;
}
