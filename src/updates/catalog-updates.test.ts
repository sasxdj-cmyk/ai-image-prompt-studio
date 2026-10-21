import { describe, expect, it } from 'vitest';
import { getBuiltinCatalog } from '../catalog/builtin';
import { applyCatalogPackage, compareVersions, fetchCatalogPackage, fetchUpdateManifest, loadCatalogHistory, loadStoredCatalog, parseCatalogPackage, saveCatalogWithHistory, CATALOG_PACKAGE_KIND } from './catalog-updates';
import { STORAGE_KEYS, type KeyValueStorage } from '../state/persistence';

class MemoryStorage implements KeyValueStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

const catalog = getBuiltinCatalog();

function packageJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    kind: CATALOG_PACKAGE_KIND,
    schemaVersion: 1,
    catalogVersion: '1.1.0',
    baseCatalogVersion: catalog.catalogVersion,
    publishedAt: '2026-11-01',
    description: 'Test package',
    categories: [
      {
        id: 'subject.look',
        entries: [
          {
            id: 'subject.look.new-entry',
            label: { en: 'New entry', it: 'Nuova voce' },
            prompt: { en: 'new editorial look', it: 'nuovo look editoriale' },
          },
        ],
      },
    ],
    ...overrides,
  });
}

describe('catalog updates', () => {
  it('compares versions', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
    expect(compareVersions('1.2.0', '1.1.9')).toBe(1);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('2.0', '2.0.0')).toBe(0);
  });

  it('rejects a file that is not a package', () => {
    expect(parseCatalogPackage('not json').error).toBeDefined();
    expect(parseCatalogPackage('{"kind":"other"}').error).toBeDefined();
  });

  it('rejects a package with an unsupported schema', () => {
    const result = parseCatalogPackage(
      JSON.stringify({ kind: CATALOG_PACKAGE_KIND, schemaVersion: 99, catalogVersion: '1.0.0', categories: [] }),
    );
    expect(result.error).toContain('unsupported');
  });

  it('rejects a package with invalid entries', () => {
    const result = parseCatalogPackage(
      JSON.stringify({
        kind: CATALOG_PACKAGE_KIND,
        schemaVersion: 1,
        catalogVersion: '1.0.0',
        categories: [{ id: 'subject.look', entries: [{ id: 'Bad Id' }] }],
      }),
    );
    expect(result.error).toBeDefined();
  });

  it('applies a valid package', () => {
    const parsed = parseCatalogPackage(packageJson());
    expect(parsed.package).toBeDefined();
    const outcome = applyCatalogPackage(catalog, parsed.package!);
    expect(outcome.status).toBe('applied');
    if (outcome.status !== 'applied') return;
    expect(outcome.catalog.catalogVersion).toBe('1.1.0');
    const look = outcome.catalog.categories.find((category) => category.id === 'subject.look');
    expect(look?.entries.some((entry) => entry.id === 'subject.look.new-entry')).toBe(true);
    expect(look?.entries.some((entry) => entry.id === 'subject.look.editorial')).toBe(false);
  });

  it('refuses to downgrade', () => {
    const parsed = parseCatalogPackage(packageJson({ catalogVersion: '0.9.0' }));
    const outcome = applyCatalogPackage(catalog, parsed.package!);
    expect(outcome.status).toBe('rejected');
  });

  it('refuses to introduce an unknown category', () => {
    const parsed = parseCatalogPackage(
      packageJson({
        categories: [
          {
            id: 'unknown.category',
            entries: [
              {
                id: 'unknown.category.entry',
                label: { en: 'Entry', it: 'Voce' },
                prompt: { en: 'something', it: 'qualcosa' },
              },
            ],
          },
        ],
      }),
    );
    expect(parsed.package).toBeDefined();
    const outcome = applyCatalogPackage(catalog, parsed.package!);
    expect(outcome.status).toBe('rejected');
  });

  it('keeps a rollback point and can restore it', () => {
    const storage = new MemoryStorage();
    const parsed = parseCatalogPackage(packageJson());
    const outcome = applyCatalogPackage(catalog, parsed.package!);
    expect(outcome.status).toBe('applied');
    if (outcome.status !== 'applied') return;
    saveCatalogWithHistory(storage, outcome.catalog, catalog);
    expect(loadStoredCatalog(storage)?.catalogVersion).toBe('1.1.0');
    const history = loadCatalogHistory(storage);
    expect(history).toHaveLength(1);
    expect(history[0]?.catalogVersion).toBe(catalog.catalogVersion);
  });

  it('ignores a corrupted stored catalog', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEYS.catalog, '{{{');
    expect(loadStoredCatalog(storage)).toBeUndefined();
  });

  it('reports offline as a normal outcome', async () => {
    const failing = async () => {
      throw new Error('network down');
    };
    const result = await fetchUpdateManifest('https://example.org/manifest.json', failing as unknown as typeof fetch);
    expect(result.offline).toBe(true);
    expect(result.manifest).toBeUndefined();
  });

  it('reads a valid manifest', async () => {
    const ok = (async () =>
      new Response(JSON.stringify({ catalogVersion: '1.2.0', packageUrl: 'https://example.org/pkg.json' }), {
        status: 200,
      })) as unknown as typeof fetch;
    const result = await fetchUpdateManifest('https://example.org/manifest.json', ok);
    expect(result.manifest?.catalogVersion).toBe('1.2.0');
  });

  it('downloads a package', async () => {
    const ok = (async () => new Response(packageJson(), { status: 200 })) as unknown as typeof fetch;
    const result = await fetchCatalogPackage('https://example.org/pkg.json', ok);
    expect(result.raw).toContain(CATALOG_PACKAGE_KIND);
  });
});
