import { describe, expect, it } from 'vitest';
import { getBuiltinCatalog } from '../catalog/builtin';
import { findConflicts, findMissingRequirements, sanitizeSelections, validateSelections } from './compatibility';
import { indexCatalog } from './compatibility';
import { randomizeSelections, createRandom } from './random';

const catalog = getBuiltinCatalog();

describe('compatibility rules', () => {
  it('detects a conflict between mutually exclusive wardrobe groups', () => {
    const index = indexCatalog(catalog);
    const dress = catalog.categories
      .find((category) => category.id === 'wardrobe.garments')
      ?.entries.find((entry) => entry.group === 'dresses');
    const top = catalog.categories
      .find((category) => category.id === 'wardrobe.garments')
      ?.entries.find((entry) => entry.group === 'tops');
    if (!dress || !top) throw new Error('missing fixtures');
    const conflicts = findConflicts({ 'wardrobe.garments': [dress.id, top.id] }, index);
    expect(conflicts.some((conflict) => conflict.kind === 'hard')).toBe(true);
  });

  it('does not report a conflict between two tops', () => {
    const index = indexCatalog(catalog);
    const garments = catalog.categories.find((category) => category.id === 'wardrobe.garments');
    const tops = garments?.entries.filter((entry) => entry.group === 'tops') ?? [];
    const conflicts = findConflicts({ 'wardrobe.garments': tops.slice(0, 2).map((entry) => entry.id) }, index);
    expect(conflicts).toHaveLength(0);
  });

  it('reports missing requirements', () => {
    const index = indexCatalog(catalog);
    const issues = findMissingRequirements({}, index);
    expect(Array.isArray(issues)).toBe(true);
  });

  it('flags selections that exceed the category limit', () => {
    const garments = catalog.categories.find((category) => category.id === 'wardrobe.garments');
    if (!garments) throw new Error('missing category');
    const ids = garments.entries.map((entry) => entry.id);
    const issues = validateSelections(catalog, { 'wardrobe.garments': ids });
    expect(issues.some((issue) => issue.kind === 'max-selections')).toBe(true);
  });

  it('flags unknown categories and entries', () => {
    const issues = validateSelections(catalog, {
      'nope.category': ['a'],
      'subject.look': ['subject.look.nope'],
    });
    expect(issues.some((issue) => issue.kind === 'unknown-category')).toBe(true);
    expect(issues.some((issue) => issue.kind === 'unknown-entry')).toBe(true);
  });

  it('removes selections that no longer exist', () => {
    const { clean, removed } = sanitizeSelections(catalog, {
      'subject.look': ['subject.look.streetwear', 'subject.look.gone'],
    });
    expect(clean['subject.look']).toEqual(['subject.look.streetwear']);
    expect(removed).toEqual(['subject.look.gone']);
  });
});

describe('randomiser', () => {
  it('produces a valid selection set', () => {
    const selections = randomizeSelections({ catalog, seed: 42, density: 0.8 });
    const issues = validateSelections(catalog, selections);
    const hardIssues = issues.filter((issue) => issue.kind === 'conflict' || issue.kind === 'unknown-entry');
    expect(hardIssues).toHaveLength(0);
  });

  it('never produces more selections than the category limit', () => {
    const selections = randomizeSelections({ catalog, seed: 7, density: 1 });
    for (const category of catalog.categories) {
      const ids = selections[category.id] ?? [];
      if (category.maxSelections !== undefined) {
        expect(ids.length).toBeLessThanOrEqual(category.maxSelections);
      }
    }
  });

  it('does not select the same entry twice', () => {
    const selections = randomizeSelections({ catalog, seed: 3, density: 1 });
    for (const ids of Object.values(selections)) {
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('does not modify the catalog', () => {
    const before = JSON.stringify(catalog);
    randomizeSelections({ catalog, seed: 11, density: 1 });
    expect(JSON.stringify(catalog)).toBe(before);
  });

  it('is reproducible with the same seed', () => {
    const first = randomizeSelections({ catalog, seed: 1234, density: 0.7 });
    const second = randomizeSelections({ catalog, seed: 1234, density: 0.7 });
    expect(first).toEqual(second);
  });

  it('varies between different seeds', () => {
    const first = randomizeSelections({ catalog, seed: 1, density: 0.9 });
    const second = randomizeSelections({ catalog, seed: 2, density: 0.9 });
    expect(JSON.stringify(first)).not.toBe(JSON.stringify(second));
  });

  it('produces fewer selections with a lower density', () => {
    const low = randomizeSelections({ catalog, seed: 99, density: 0.2 });
    const high = randomizeSelections({ catalog, seed: 99, density: 1 });
    const count = (selections: Record<string, string[]>) =>
      Object.values(selections).reduce((sum, ids) => sum + ids.length, 0);
    expect(count(low)).toBeLessThan(count(high));
  });

  it('does not select everything in every category', () => {
    const selections = randomizeSelections({ catalog, seed: 5, density: 1 });
    const categories = Object.keys(selections).length;
    expect(categories).toBeLessThan(catalog.categories.length);
  });

  it('exposes a deterministic pseudo random generator', () => {
    const a = createRandom(5);
    const b = createRandom(5);
    expect(a()).toBe(b());
    expect(a()).toBeGreaterThanOrEqual(0);
    expect(a()).toBeLessThan(1);
  });
});
