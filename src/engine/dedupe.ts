/**
 * Text normalisation and redundancy detection.
 *
 * Two entries are redundant when they contribute the same information twice.
 * Exact duplicates are detected on the normalised prompt text; near duplicates
 * are detected through the explicit `synonyms` list of the catalog entries,
 * which keeps the behaviour predictable and data-driven.
 */

/** Lower-case, strip punctuation, collapse whitespace. */
export function normalizeFragment(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,;:!?"'`()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Remove trailing separators so fragments can be joined with commas safely. */
export function cleanFragment(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\s,;:.!?]+$/g, '')
    .trim();
}

export interface Redundancy {
  /** Entry that repeats information already present. */
  entryId: string;
  /** Entry that already carried the information. */
  keptEntryId: string;
  kind: 'duplicate' | 'synonym';
  /** The shared normalised token for synonym matches. */
  shared?: string;
}

/**
 * Detect redundant fragments.
 *
 * @param fragments ordered list of `{ entryId, text, synonyms }`
 */
export function findRedundancy(
  fragments: ReadonlyArray<{ entryId: string; text: string; synonyms?: string[] }>,
): Redundancy[] {
  const found: Redundancy[] = [];
  const seenText = new Map<string, string>();
  const seenSynonyms = new Map<string, string>();

  for (const fragment of fragments) {
    const normalized = normalizeFragment(fragment.text);
    if (normalized !== '') {
      const previous = seenText.get(normalized);
      if (previous) {
        found.push({
          entryId: fragment.entryId,
          keptEntryId: previous,
          kind: 'duplicate',
        });
        continue;
      }
      seenText.set(normalized, fragment.entryId);
    }

    let redundant: Redundancy | undefined;
    for (const synonym of fragment.synonyms ?? []) {
      const key = normalizeFragment(synonym);
      if (key === '') continue;
      const previous = seenSynonyms.get(key);
      if (previous) {
        redundant = { entryId: fragment.entryId, keptEntryId: previous, kind: 'synonym', shared: synonym };
        break;
      }
    }
    if (redundant) {
      found.push(redundant);
      continue;
    }
    for (const synonym of fragment.synonyms ?? []) {
      const key = normalizeFragment(synonym);
      if (key !== '') seenSynonyms.set(key, fragment.entryId);
    }
  }

  return found;
}
