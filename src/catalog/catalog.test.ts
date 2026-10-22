import { describe, expect, it } from 'vitest';
import { BUILTIN_CATALOG_VERSION, buildBuiltinCatalog, countEntries, getBuiltinCatalog, validateBuiltinCatalog } from './builtin';
import { CATEGORY_MANIFEST, CATALOG_GROUPS } from './manifest';
import { validateCatalogDocument } from './validate';
import { LOCALES } from './types';

describe('built-in catalog', () => {
  it('is valid', () => {
    const report = validateBuiltinCatalog();
    expect(report.errors).toEqual([]);
  });

  it('declares a version and a schema', () => {
    const catalog = getBuiltinCatalog();
    expect(catalog.schemaVersion).toBe(1);
    expect(catalog.catalogVersion).toBe(BUILTIN_CATALOG_VERSION);
    expect(catalog.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('contains every category of the manifest and nothing else', () => {
    const catalog = getBuiltinCatalog();
    expect(catalog.categories.length).toBe(CATEGORY_MANIFEST.length);
    const manifestIds = CATEGORY_MANIFEST.map((item) => item.id).sort();
    const catalogIds = catalog.categories.map((item) => item.id).sort();
    expect(catalogIds).toEqual(manifestIds);
  });

  it('uses unique entry ids across the whole catalog', () => {
    const seen = new Set<string>();
    for (const category of getBuiltinCatalog().categories) {
      for (const entry of category.entries) {
        expect(seen.has(entry.id)).toBe(false);
        seen.add(entry.id);
      }
    }
  });

  it('translates every label and prompt into every shipped locale', () => {
    for (const category of getBuiltinCatalog().categories) {
      for (const entry of category.entries) {
        for (const locale of LOCALES) {
          expect(entry.label[locale].trim().length, `${entry.id} label ${locale}`).toBeGreaterThan(0);
          expect(entry.prompt[locale].trim().length, `${entry.id} prompt ${locale}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('has no empty or whitespace-only prompt fragment', () => {
    for (const category of getBuiltinCatalog().categories) {
      for (const entry of category.entries) {
        expect(entry.prompt.en.trim(), entry.id).not.toBe('');
        expect(entry.prompt.it.trim(), entry.id).not.toBe('');
      }
    }
  });

  it('gives every category a description and a control type', () => {
    for (const category of getBuiltinCatalog().categories) {
      expect(category.description.en.length).toBeGreaterThan(10);
      expect(category.description.it.length).toBeGreaterThan(10);
      expect(['single', 'multi', 'chips', 'swatch']).toContain(category.control);
    }
  });

  it('uses one group per category and every group is declared', () => {
    const groupIds = new Set(CATALOG_GROUPS.map((group) => group.id));
    for (const category of getBuiltinCatalog().categories) {
      expect(groupIds.has(category.group)).toBe(true);
    }
  });

  it('assigns a unique order to every category', () => {
    const orders = getBuiltinCatalog().categories.map((category) => category.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('ships a substantial catalog', () => {
    const catalog = getBuiltinCatalog();
    expect(catalog.categories.length).toBeGreaterThanOrEqual(50);
    expect(countEntries(catalog)).toBeGreaterThanOrEqual(500);
  });

  it('covers the documented wardrobe depth', () => {
    const wardrobe = getBuiltinCatalog().categories.find((category) => category.id === 'wardrobe.garments');
    expect(wardrobe).toBeDefined();
    const subgroups = new Set(wardrobe?.entries.map((entry) => entry.group));
    expect(subgroups.has('outerwear')).toBe(true);
    expect(subgroups.has('tailoring')).toBe(true);
    expect(subgroups.has('dresses')).toBe(true);
    expect(subgroups.size).toBeGreaterThanOrEqual(10);
  });

  it('rejects a broken catalog', () => {
    const broken = { ...getBuiltinCatalog(), catalogVersion: 'not-a-version' };
    const report = validateCatalogDocument(broken);
    expect(report.errors.length).toBeGreaterThan(0);
  });

  it('rejects a catalog with a duplicated entry id', () => {
    const catalog = buildBuiltinCatalog();
    const first = catalog.categories[0];
    const second = catalog.categories[1];
    if (!first || !second) throw new Error('the catalog is too small for this test');
    second.entries.push({ ...first.entries[0]! });
    const report = validateCatalogDocument(catalog);
    expect(report.errors.some((error) => error.message.includes('already used'))).toBe(true);
  });
});

describe('catalog provenance', () => {
  const verifiedEntries = () =>
    getBuiltinCatalog()
      .categories.flatMap((category) => category.entries)
      .filter((entry) => entry.status === 'verified');

  it('gives every verified entry a source with a URL and a date', () => {
    for (const entry of verifiedEntries()) {
      expect(entry.source, entry.id).toBeDefined();
      expect(entry.source?.url, entry.id).toMatch(/^https:\/\//);
      expect(entry.source?.consulted, entry.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.source?.title.length, entry.id).toBeGreaterThan(10);
    }
  });

  it('does not mark an entry as verified without a source', () => {
    for (const entry of getBuiltinCatalog().categories.flatMap((category) => category.entries)) {
      if (entry.status === 'verified') {
        expect(entry.source, entry.id).toBeDefined();
      }
    }
  });

  it('verifies exactly the entries that were checked against a source', () => {
    const ids = verifiedEntries()
      .map((entry) => entry.id)
      .sort();
    expect(ids).toEqual([
      'capture.dof.bokeh',
      'capture.dof.deep',
      'capture.lighting.type.rembrandt',
      'footwear.style.espadrilles',
      'wardrobe.materials.wool-gabardine',
      'wardrobe.materials.wool-melton',
    ]);
  });

  it('keeps the unverified entries clearly marked', () => {
    const others = getBuiltinCatalog()
      .categories.flatMap((category) => category.entries)
      .filter((entry) => entry.status !== 'verified');
    expect(others.length).toBeGreaterThan(700);
    for (const entry of others) {
      expect(['evergreen', 'unverified', 'partial']).toContain(entry.status);
    }
  });
});
