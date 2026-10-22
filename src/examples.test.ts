import { describe, expect, it } from 'vitest';
import packageFile from '../docs/examples/catalog-package-1.1.0.json';
import presetFile from '../docs/examples/presets-example.json';
import { applyCatalogPackage, parseCatalogPackage } from './updates/catalog-updates';
import { getBuiltinCatalog } from './catalog/builtin';
import { parsePresetImport } from './state/preset-io';
import { indexCatalog } from './engine/compatibility';

/**
 * The example files shipped in docs/examples must stay importable: this test
 * runs them through the real parsers, so a stale example fails the build.
 */
describe('shipped example files', () => {
  it('ships a valid catalog package', () => {
    const parsed = parseCatalogPackage(JSON.stringify(packageFile));
    expect(parsed.error).toBeUndefined();
    expect(parsed.package).toBeDefined();
  });

  it('applies the example package to the bundled catalog', () => {
    const parsed = parseCatalogPackage(JSON.stringify(packageFile));
    const outcome = applyCatalogPackage(getBuiltinCatalog(), parsed.package!);
    expect(outcome.status).toBe('applied');
    if (outcome.status !== 'applied') return;
    const scene = outcome.catalog.categories.find((category) => category.id === 'scene.atmosphere');
    expect(scene?.entries.some((entry) => entry.id === 'scene.atmosphere.heat-haze')).toBe(true);
    expect(scene?.entries.some((entry) => entry.id === 'scene.atmosphere.dust-motes')).toBe(true);
    // the entries that were already there are kept
    expect(scene?.entries.some((entry) => entry.id === 'scene.atmosphere.sunny')).toBe(true);
  });

  it('keeps the example package consistent with the catalog it patches', () => {
    const parsed = parseCatalogPackage(JSON.stringify(packageFile));
    const catalog = getBuiltinCatalog();
    const index = indexCatalog(catalog);
    for (const category of parsed.package!.categories) {
      for (const entry of category.entries) {
        if (!index.entries.has(entry.id)) continue;
        const existing = index.entries.get(entry.id)!;
        expect(entry.label.en, entry.id).toBe(existing.label.en);
        expect(entry.prompt.en, entry.id).toBe(existing.prompt.en);
      }
    }
  });

  it('ships a valid preset export', () => {
    const result = parsePresetImport(JSON.stringify(presetFile));
    expect(result.error).toBeUndefined();
    expect(result.presets).toHaveLength(2);
  });

  it('uses only entry ids that exist in the catalog', () => {
    const result = parsePresetImport(JSON.stringify(presetFile));
    const index = indexCatalog(getBuiltinCatalog());
    for (const preset of result.presets ?? []) {
      for (const ids of Object.values(preset.selections)) {
        for (const id of ids) {
          expect(index.entries.has(id), `${preset.name}: ${id}`).toBe(true);
        }
      }
    }
  });

  it('names only categories that exist in the catalog', () => {
    const result = parsePresetImport(JSON.stringify(presetFile));
    const index = indexCatalog(getBuiltinCatalog());
    for (const preset of result.presets ?? []) {
      for (const categoryId of Object.keys(preset.selections)) {
        expect(index.categories.has(categoryId), `${preset.name}: ${categoryId}`).toBe(true);
      }
    }
  });
});
