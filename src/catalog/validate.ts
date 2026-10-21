/**
 * Schema validation for catalog data.
 *
 * The validator is intentionally dependency free and returns a list of
 * human readable issues instead of throwing, so that both the UI (inline
 * feedback) and the tests can use it.
 */
import type {
  CatalogEntry,
  CategoryDef,
  LocalizedText,
  ValidationIssue,
  ValidationReport,
} from './types';
import { LOCALES, isLocale } from './types';

export const CURRENT_SCHEMA_VERSION = 1;

const ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkLocalized(
  value: unknown,
  path: string,
  errors: ValidationIssue[],
  { required = true }: { required?: boolean } = {},
): value is LocalizedText {
  if (value === undefined) {
    if (required) errors.push({ path, message: 'missing localized text' });
    return false;
  }
  if (!isRecord(value)) {
    errors.push({ path, message: 'localized text must be an object with "en" and "it"' });
    return false;
  }
  let ok = true;
  for (const locale of LOCALES) {
    const raw = value[locale];
    if (typeof raw !== 'string' || raw.trim() === '') {
      errors.push({ path: `${path}.${locale}`, message: 'localized string is required and must be non-empty' });
      ok = false;
    }
  }
  for (const key of Object.keys(value)) {
    if (!isLocale(key)) {
      errors.push({ path: `${path}.${key}`, message: `unknown locale "${key}"` });
      ok = false;
    }
  }
  return ok;
}

function validateEntry(
  entry: unknown,
  path: string,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
): void {
  if (!isRecord(entry)) {
    errors.push({ path, message: 'entry must be an object' });
    return;
  }
  const id = entry.id;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    errors.push({ path: `${path}.id`, message: 'entry id must be lowercase dot-namespaced (e.g. "wardrobe.jacket.leather")' });
  }
  checkLocalized(entry.label, `${path}.label`, errors);
  checkLocalized(entry.prompt, `${path}.prompt`, errors);
  if (entry.group !== undefined && typeof entry.group !== 'string') {
    errors.push({ path: `${path}.group`, message: 'group must be a string' });
  }
  if (entry.tags !== undefined) {
    if (!Array.isArray(entry.tags) || entry.tags.some((t) => typeof t !== 'string')) {
      errors.push({ path: `${path}.tags`, message: 'tags must be an array of strings' });
    }
  }
  for (const key of ['synonyms', 'conflicts', 'softConflicts', 'requires'] as const) {
    const value = entry[key];
    if (value !== undefined && (!Array.isArray(value) || value.some((v) => typeof v !== 'string'))) {
      errors.push({ path: `${path}.${key}`, message: `${key} must be an array of entry ids` });
    }
  }
  if (entry.weight !== undefined && (typeof entry.weight !== 'number' || entry.weight <= 0)) {
    errors.push({ path: `${path}.weight`, message: 'weight must be a positive number' });
  }
  if (typeof entry.color === 'string' && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(entry.color)) {
    errors.push({ path: `${path}.color`, message: 'color must be a hex value' });
  }
  if (entry.notes !== undefined) checkLocalized(entry.notes, `${path}.notes`, errors, { required: false });
  if (entry.status !== undefined && !['verified', 'unverified', 'partial', 'evergreen'].includes(String(entry.status))) {
    errors.push({ path: `${path}.status`, message: 'unknown verification status' });
  }
  if (entry.source !== undefined) {
    if (!isRecord(entry.source) || typeof entry.source.title !== 'string') {
      errors.push({ path: `${path}.source`, message: 'source must be an object with a title' });
    } else if (entry.source.kind && !['evergreen', 'terminology', 'trend', 'documentation'].includes(String(entry.source.kind))) {
      errors.push({ path: `${path}.source.kind`, message: 'unknown source kind' });
    }
  }
  void warnings;
}

function validateCategory(
  category: unknown,
  path: string,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
  seenEntryIds: Map<string, string>,
  requireMetadata = true,
): void {
  if (!isRecord(category)) {
    errors.push({ path, message: 'category must be an object' });
    return;
  }
  if (typeof category.id !== 'string' || !ID_PATTERN.test(category.id)) {
    errors.push({ path: `${path}.id`, message: 'category id must be lowercase dot-namespaced' });
  }
  if (requireMetadata) {
    if (typeof category.order !== 'number' || !Number.isFinite(category.order)) {
      errors.push({ path: `${path}.order`, message: 'category order must be a finite number' });
    }
    if (typeof category.group !== 'string') {
      errors.push({ path: `${path}.group`, message: 'category group is required' });
    }
    checkLocalized(category.name, `${path}.name`, errors);
    checkLocalized(category.description, `${path}.description`, errors);
    if (!['single', 'multi', 'chips', 'swatch'].includes(String(category.control))) {
      errors.push({ path: `${path}.control`, message: 'unknown control type' });
    }
    if (category.maxSelections !== undefined) {
      if (typeof category.maxSelections !== 'number' || category.maxSelections < 1) {
        errors.push({ path: `${path}.maxSelections`, message: 'maxSelections must be a number >= 1' });
      }
    }
    if (category.minSelections !== undefined) {
      if (typeof category.minSelections !== 'number' || category.minSelections < 0) {
        errors.push({ path: `${path}.minSelections`, message: 'minSelections must be a number >= 0' });
      }
    }
  }
  if (category.subgroups !== undefined) {
    if (!Array.isArray(category.subgroups)) {
      errors.push({ path: `${path}.subgroups`, message: 'subgroups must be an array' });
    } else {
      for (const [i, sub] of category.subgroups.entries()) {
        const subPath = `${path}.subgroups[${i}]`;
        if (!isRecord(sub) || typeof sub.id !== 'string' || typeof sub.order !== 'number') {
          errors.push({ path: subPath, message: 'subgroup requires id and order' });
          continue;
        }
        checkLocalized(sub.name, `${subPath}.name`, errors);
      }
    }
  }
  if (!Array.isArray(category.entries) || category.entries.length === 0) {
    errors.push({ path: `${path}.entries`, message: 'category must define at least one entry' });
    return;
  }
  const localIds = new Set<string>();
  for (const [i, entry] of category.entries.entries()) {
    const entryPath = `${path}.entries[${i}]`;
    validateEntry(entry, entryPath, errors, warnings);
    if (isRecord(entry) && typeof entry.id === 'string') {
      if (localIds.has(entry.id)) {
        errors.push({ path: `${entryPath}.id`, message: `duplicate entry id "${entry.id}" inside the category` });
      }
      localIds.add(entry.id);
      const previous = seenEntryIds.get(entry.id);
      if (previous) {
        errors.push({ path: `${entryPath}.id`, message: `entry id "${entry.id}" is already used in ${previous}` });
      } else {
        seenEntryIds.set(entry.id, path);
      }
    }
  }
}

/** Validate a full catalog document. */
export function validateCatalogDocument(catalog: unknown): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!isRecord(catalog)) {
    return { errors: [{ path: 'catalog', message: 'catalog must be an object' }], warnings };
  }
  if (catalog.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    errors.push({
      path: 'catalog.schemaVersion',
      message: `unsupported schema version ${String(catalog.schemaVersion)} (expected ${CURRENT_SCHEMA_VERSION})`,
    });
  }
  if (typeof catalog.catalogVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(catalog.catalogVersion)) {
    errors.push({ path: 'catalog.catalogVersion', message: 'catalogVersion must be a semantic version (x.y.z)' });
  }
  if (typeof catalog.name !== 'string' || catalog.name.trim() === '') {
    errors.push({ path: 'catalog.name', message: 'catalog name is required' });
  }
  if (!Array.isArray(catalog.groups) || catalog.groups.length === 0) {
    errors.push({ path: 'catalog.groups', message: 'at least one group is required' });
  }
  if (!Array.isArray(catalog.categories) || catalog.categories.length === 0) {
    errors.push({ path: 'catalog.categories', message: 'at least one category is required' });
    return { errors, warnings };
  }

  const seenCategoryIds = new Set<string>();
  const seenEntryIds = new Map<string, string>();
  const seenOrders = new Map<number, string>();

  for (const [i, category] of catalog.categories.entries()) {
    const path = `catalog.categories[${i}]`;
    validateCategory(category, path, errors, warnings, seenEntryIds);
    if (isRecord(category) && typeof category.id === 'string') {
      if (seenCategoryIds.has(category.id)) {
        errors.push({ path: `${path}.id`, message: `duplicate category id "${category.id}"` });
      }
      seenCategoryIds.add(category.id);
      if (typeof category.order === 'number') {
        const clash = seenOrders.get(category.order);
        if (clash) {
          warnings.push({
            path: `${path}.order`,
            message: `order ${category.order} is shared with "${clash}" - relative order may be ambiguous`,
          });
        } else {
          seenOrders.set(category.order, category.id);
        }
      }
    }
  }

  return { errors, warnings };
}

/** Validate a partial catalog (the payload of an update package). */
export function validateCatalogFragment(fragment: unknown): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  if (!isRecord(fragment)) {
    return { errors: [{ path: 'fragment', message: 'fragment must be an object' }], warnings };
  }
  if (!Array.isArray(fragment.categories) || fragment.categories.length === 0) {
    errors.push({ path: 'fragment.categories', message: 'fragment must contain at least one category' });
    return { errors, warnings };
  }
  const seenEntryIds = new Map<string, string>();
  for (const [i, category] of fragment.categories.entries()) {
    // a fragment only carries the entries: the metadata comes from the manifest
    validateCategory(category, `fragment.categories[${i}]`, errors, warnings, seenEntryIds, false);
  }
  return { errors, warnings };
}

/** Collect every entry of a category, grouped by subgroup id. */
export function groupEntries(category: CategoryDef): { subgroup: string | null; entries: CatalogEntry[] }[] {
  const groups = new Map<string | null, CatalogEntry[]>();
  for (const entry of category.entries) {
    const key = entry.group ?? null;
    const bucket = groups.get(key);
    if (bucket) bucket.push(entry);
    else groups.set(key, [entry]);
  }
  const order = new Map((category.subgroups ?? []).map((s) => [s.id, s.order] as const));
  return [...groups.entries()]
    .map(([subgroup, entries]) => ({ subgroup, entries }))
    .sort((a, b) => {
      const oa = a.subgroup ? (order.get(a.subgroup) ?? 999) : -1;
      const ob = b.subgroup ? (order.get(b.subgroup) ?? 999) : -1;
      return oa - ob;
    });
}
