/**
 * Built-in catalog assembly.
 *
 * The manifest owns the structure, the JSON fragments own the content. They
 * are merged here into a single validated `CatalogDocument`.
 */
import type { CatalogDocument, CatalogEntry, ValidationReport } from './types';
import { CATEGORY_MANIFEST, CATALOG_GROUPS } from './manifest';
import { validateCatalogDocument } from './validate';

import fragmentSubjectBody from './data/01-subject-body.json';
import fragmentAppearance from './data/02-appearance.json';
import fragmentHair from './data/03-hair.json';
import fragmentWardrobe from './data/04-wardrobe.json';
import fragmentFootwearAccessories from './data/05-footwear-accessories.json';
import fragmentPoseScene from './data/06-pose-scene.json';
import fragmentCaptureFinish from './data/07-capture-finish.json';

export interface CatalogFragment {
  categories: { id: string; entries: CatalogEntry[] }[];
}

const FRAGMENTS: CatalogFragment[] = [
  fragmentSubjectBody as unknown as CatalogFragment,
  fragmentAppearance as unknown as CatalogFragment,
  fragmentHair as unknown as CatalogFragment,
  fragmentWardrobe as unknown as CatalogFragment,
  fragmentFootwearAccessories as unknown as CatalogFragment,
  fragmentPoseScene as unknown as CatalogFragment,
  fragmentCaptureFinish as unknown as CatalogFragment,
];

export const BUILTIN_CATALOG_VERSION = '1.0.0';
export const BUILTIN_CATALOG_GENERATED_AT = '2026-10-21';

let cached: CatalogDocument | undefined;

/** Merge manifest and fragments into a catalog document. */
export function buildBuiltinCatalog(): CatalogDocument {
  const entriesByCategory = new Map<string, CatalogEntry[]>();
  for (const fragment of FRAGMENTS) {
    for (const category of fragment.categories) {
      if (entriesByCategory.has(category.id)) {
        throw new Error(`Duplicate catalog fragment for category "${category.id}"`);
      }
      entriesByCategory.set(category.id, category.entries);
    }
  }

  const categories = CATEGORY_MANIFEST.map((manifestItem) => {
    const entries = entriesByCategory.get(manifestItem.id);
    if (!entries) {
      throw new Error(`Catalog fragment missing for category "${manifestItem.id}"`);
    }
    return { ...manifestItem, entries };
  });

  const known = new Set(CATEGORY_MANIFEST.map((item) => item.id));
  for (const id of entriesByCategory.keys()) {
    if (!known.has(id)) {
      throw new Error(`Catalog fragment "${id}" is not declared in the manifest`);
    }
  }

  return {
    schemaVersion: 1,
    catalogVersion: BUILTIN_CATALOG_VERSION,
    name: 'AI Image Prompt Studio base catalog',
    generatedAt: BUILTIN_CATALOG_GENERATED_AT,
    groups: CATALOG_GROUPS,
    categories,
  };
}

/** The bundled catalog (memoised). */
export function getBuiltinCatalog(): CatalogDocument {
  if (!cached) cached = buildBuiltinCatalog();
  return cached;
}

/** Validation report of the bundled catalog. */
export function validateBuiltinCatalog(): ValidationReport {
  return validateCatalogDocument(getBuiltinCatalog());
}

/** Number of options contained in the catalog. */
export function countEntries(catalog: CatalogDocument): number {
  return catalog.categories.reduce((total, category) => total + category.entries.length, 0);
}
