/**
 * Catalog updates.
 *
 * The bundled catalog is always available. Updates are optional: they can be
 * imported from a local JSON file or, if the user explicitly enables it,
 * fetched from a manifest URL. Only JSON data is read - never code.
 */
import type { CatalogDocument, CategoryDef, ValidationReport } from '../catalog/types';
import { validateCatalogDocument, validateCatalogFragment } from '../catalog/validate';
import { CURRENT_SCHEMA_VERSION } from '../catalog/validate';
import { STORAGE_KEYS, type KeyValueStorage } from '../state/persistence';

export const CATALOG_PACKAGE_KIND = 'catalog-package';

export interface CatalogPackage {
  kind: typeof CATALOG_PACKAGE_KIND;
  schemaVersion: number;
  catalogVersion: string;
  baseCatalogVersion?: string;
  publishedAt?: string;
  description?: string;
  /** Categories whose entries are replaced by the package. */
  categories: { id: string; entries: CategoryDef['entries'] }[];
  removedCategoryIds?: string[];
  removedEntryIds?: string[];
}

export interface UpdateManifest {
  catalogVersion: string;
  packageUrl: string;
  publishedAt?: string;
  notes?: string;
  schemaVersion?: number;
}

export type UpdateOutcome =
  | { status: 'applied'; catalog: CatalogDocument }
  | { status: 'rejected'; reason: string; report?: ValidationReport };

/** Compare two semantic versions. Returns -1, 0 or 1. */
export function compareVersions(a: string, b: string): number {
  const parse = (value: string): number[] =>
    value
      .split('.')
      .map((part) => Number.parseInt(part, 10))
      .map((part) => (Number.isFinite(part) ? part : 0));
  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l > r) return 1;
    if (l < r) return -1;
  }
  return 0;
}

/** Parse and validate a catalog package coming from a file or a download. */
export function parseCatalogPackage(raw: string): { package?: CatalogPackage; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'The file is not valid JSON.' };
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { error: 'The file does not contain a catalog package.' };
  }
  const candidate = parsed as Partial<CatalogPackage>;
  if (candidate.kind !== CATALOG_PACKAGE_KIND) {
    return { error: 'The file does not contain a catalog package.' };
  }
  if (candidate.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return {
      error: `The package uses an unsupported data format version (${String(candidate.schemaVersion)}).`,
    };
  }
  if (typeof candidate.catalogVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(candidate.catalogVersion)) {
    return { error: 'The package does not declare a valid catalog version.' };
  }
  const report = validateCatalogFragment({ categories: candidate.categories ?? [] });
  if (report.errors.length > 0) {
    return { error: report.errors[0]?.message ?? 'The package contains invalid data.' };
  }
  return { package: candidate as CatalogPackage };
}

/** Apply a validated package to a catalog. */
export function applyCatalogPackage(current: CatalogDocument, pkg: CatalogPackage): UpdateOutcome {
  if (pkg.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return { status: 'rejected', reason: `Unsupported data format version (${pkg.schemaVersion}).` };
  }
  if (compareVersions(pkg.catalogVersion, current.catalogVersion) < 0) {
    return { status: 'rejected', reason: 'The package is older than the installed catalog.' };
  }

  const removedCategories = new Set(pkg.removedCategoryIds ?? []);
  const removedEntries = new Set(pkg.removedEntryIds ?? []);

  const categories: CategoryDef[] = [];
  for (const category of current.categories) {
    if (removedCategories.has(category.id)) continue;
    const replacement = pkg.categories?.find((item) => item.id === category.id);
    const entries = replacement
      ? replacement.entries.filter((entry) => !removedEntries.has(entry.id))
      : category.entries.filter((entry) => !removedEntries.has(entry.id));
    categories.push({ ...category, entries });
  }

  for (const item of pkg.categories ?? []) {
    if (categories.some((category) => category.id === item.id)) continue;
    if (removedCategories.has(item.id)) continue;
    const known = current.categories.find((category) => category.id === item.id);
    if (!known) {
      return {
        status: 'rejected',
        reason: `The package introduces the unknown category "${item.id}".`,
      };
    }
  }

  const next: CatalogDocument = {
    ...current,
    catalogVersion: pkg.catalogVersion,
    generatedAt: pkg.publishedAt ?? current.generatedAt,
    categories,
  };

  const report = validateCatalogDocument(next);
  if (report.errors.length > 0) {
    return { status: 'rejected', reason: report.errors[0]?.message ?? 'The resulting catalog is invalid.', report };
  }
  return { status: 'applied', catalog: next };
}

/** Fetch an update manifest. Never throws: offline is a normal outcome. */
export async function fetchUpdateManifest(
  manifestUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ manifest?: UpdateManifest; error?: string; offline?: boolean }> {
  if (!manifestUrl) return { error: 'No update manifest URL is configured.' };
  let response: Response;
  try {
    response = await fetchImpl(manifestUrl, { headers: { accept: 'application/json' } });
  } catch {
    return { error: 'No connection available.', offline: true };
  }
  if (!response.ok) {
    return { error: `The update manifest could not be read (HTTP ${response.status}).` };
  }
  try {
    const data = (await response.json()) as UpdateManifest;
    if (typeof data.catalogVersion !== 'string' || typeof data.packageUrl !== 'string') {
      return { error: 'The update manifest is not valid.' };
    }
    return { manifest: data };
  } catch {
    return { error: 'The update manifest is not valid JSON.' };
  }
}

/** Download a catalog package. */
export async function fetchCatalogPackage(
  packageUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ raw?: string; error?: string; offline?: boolean }> {
  try {
    const response = await fetchImpl(packageUrl, { headers: { accept: 'application/json' } });
    if (!response.ok) {
      return { error: `The package could not be downloaded (HTTP ${response.status}).` };
    }
    return { raw: await response.text() };
  } catch {
    return { error: 'No connection available.', offline: true };
  }
}

/** Store the current catalog and keep the previous ones for rollback. */
export function saveCatalogWithHistory(
  storage: KeyValueStorage | null,
  catalog: CatalogDocument,
  previous?: CatalogDocument,
): void {
  if (!storage) return;
  const history = loadCatalogHistory(storage);
  const nextHistory = previous ? [previous, ...history].slice(0, 3) : history;
  try {
    storage.setItem(STORAGE_KEYS.catalogHistory, JSON.stringify(nextHistory));
    storage.setItem(STORAGE_KEYS.catalog, JSON.stringify(catalog));
  } catch {
    /* storage full or unavailable: the bundled catalog stays in use */
  }
}

/** Previous catalog versions, newest first. */
export function loadCatalogHistory(storage: KeyValueStorage | null): CatalogDocument[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEYS.catalogHistory);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CatalogDocument =>
        typeof item === 'object' && item !== null && Array.isArray((item as CatalogDocument).categories),
    );
  } catch {
    return [];
  }
}

/** Read the catalog stored locally, if any. */
export function loadStoredCatalog(storage: KeyValueStorage | null): CatalogDocument | undefined {
  if (!storage) return undefined;
  try {
    const raw = storage.getItem(STORAGE_KEYS.catalog);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CatalogDocument;
    const report = validateCatalogDocument(parsed);
    if (report.errors.length > 0) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

/** Remove the stored catalog and its history (back to the bundled version). */
export function clearStoredCatalog(storage: KeyValueStorage | null): void {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEYS.catalog);
    storage.removeItem(STORAGE_KEYS.catalogHistory);
  } catch {
    /* ignore */
  }
}
