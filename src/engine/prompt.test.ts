import { describe, expect, it } from 'vitest';
import type { CatalogDocument, ModelProfile } from '../catalog/types';
import { buildPrompt, effectiveCategoryOrder, GENERAL_PROFILE_ID } from './prompt';
import { getGeneralProfile } from '../models/profiles';
import { getBuiltinCatalog } from '../catalog/builtin';

const catalog = getBuiltinCatalog();

function entryId(categoryId: string, suffix: string): string {
  const category = catalog.categories.find((item) => item.id === categoryId);
  const entry = category?.entries.find((item) => item.id.endsWith(suffix));
  if (!entry) throw new Error(`Missing test entry ${categoryId}.${suffix}`);
  return entry.id;
}

describe('prompt generation', () => {
  it('produces an empty prompt when nothing is selected', () => {
    const result = buildPrompt({ catalog, selections: {}, promptLocale: 'en' });
    expect(result.prompt).toBe('');
    expect(result.fragments).toHaveLength(0);
    expect(result.warnings.some((warning) => warning.code === 'empty')).toBe(true);
  });

  it('builds a prompt from a single category', () => {
    const id = entryId('subject.look', 'editorial');
    const result = buildPrompt({ catalog, selections: { 'subject.look': [id] }, promptLocale: 'en' });
    expect(result.prompt).toBe('fashion editorial');
    expect(result.fragments).toHaveLength(1);
  });

  it('joins fragments with commas and no duplicate separators', () => {
    const result = buildPrompt({
      catalog,
      selections: {
        'subject.look': [entryId('subject.look', 'editorial')],
        'body.build': [entryId('body.build', 'slim')],
        'pose.body': [entryId('pose.body', 'standing')],
      },
      promptLocale: 'en',
    });
    expect(result.prompt.split(', ').length).toBe(3);
    expect(result.prompt).not.toMatch(/,\s*,/);
    expect(result.prompt).not.toMatch(/,\s*$/);
    expect(result.prompt).not.toMatch(/^\s*,/);
  });

  it('respects the logical category order', () => {
    const result = buildPrompt({
      catalog,
      selections: {
        'pose.body': [entryId('pose.body', 'standing')],
        'subject.look': [entryId('subject.look', 'editorial')],
        'body.build': [entryId('body.build', 'slim')],
      },
      promptLocale: 'en',
    });
    const order = result.fragments.map((fragment) => fragment.categoryId);
    expect(order.indexOf('subject.look')).toBeLessThan(order.indexOf('body.build'));
    expect(order.indexOf('body.build')).toBeLessThan(order.indexOf('pose.body'));
  });

  it('keeps empty categories out of the prompt', () => {
    const result = buildPrompt({
      catalog,
      selections: {
        'subject.look': [entryId('subject.look', 'editorial')],
        'body.build': [],
      },
      promptLocale: 'en',
    });
    expect(result.prompt).toBe('fashion editorial');
    expect(result.fragments).toHaveLength(1);
  });

  it('never invents content that was not selected', () => {
    const result = buildPrompt({
      catalog,
      selections: { 'subject.look': [entryId('subject.look', 'editorial')] },
      promptLocale: 'en',
    });
    expect(result.prompt).not.toMatch(/sneaker|jacket|light|background/i);
  });

  it('is deterministic for the same selections', () => {
    const selections = {
      'subject.look': [entryId('subject.look', 'editorial')],
      'body.build': [entryId('body.build', 'slim')],
    };
    const first = buildPrompt({ catalog, selections, promptLocale: 'en' });
    const second = buildPrompt({ catalog, selections, promptLocale: 'en' });
    expect(first.prompt).toBe(second.prompt);
  });

  it('uses the prompt locale for the fragments', () => {
    const selections = { 'subject.look': [entryId('subject.look', 'editorial')] };
    const english = buildPrompt({ catalog, selections, promptLocale: 'en' });
    const italian = buildPrompt({ catalog, selections, promptLocale: 'it' });
    expect(english.prompt).toBe('fashion editorial');
    expect(italian.prompt).toBe('editoriale di moda');
  });

  it('leaves out entries that exceed the category limit and reports it', () => {
    const category = catalog.categories.find((item) => item.id === 'wardrobe.garments');
    if (!category) throw new Error('missing category');
    const limit = category.maxSelections;
    if (limit === undefined) throw new Error('missing limit');
    const ids = category.entries.slice(0, limit + 1).map((entry) => entry.id);
    const result = buildPrompt({ catalog, selections: { 'wardrobe.garments': ids }, promptLocale: 'en' });
    expect(result.fragments).toHaveLength(limit);
    expect(result.omitted.some((item) => item.reason === 'max-selections')).toBe(true);
    expect(result.warnings.some((warning) => warning.code === 'max-selections')).toBe(true);
  });

  it('drops a conflicting entry but keeps the selection visible', () => {
    const dress = entryId('wardrobe.garments', 'slip-dress');
    const top = entryId('wardrobe.garments', 'silk-camisole');
    const result = buildPrompt({
      catalog,
      selections: { 'wardrobe.garments': [dress, top] },
      promptLocale: 'en',
    });
    // the catalog order decides which one survives, so the result is stable
    expect(result.fragments).toHaveLength(1);
    const survivor = result.fragments[0]?.entryId;
    expect([dress, top]).toContain(survivor);
    const dropped = survivor === dress ? top : dress;
    expect(result.omitted.some((item) => item.entryId === dropped && item.reason === 'conflict')).toBe(true);
    expect(result.warnings.some((warning) => warning.code === 'conflict')).toBe(true);
  });

  it('ignores selections that no longer exist in the catalog', () => {
    const result = buildPrompt({
      catalog,
      selections: { 'subject.look': ['subject.look.does-not-exist'] },
      promptLocale: 'en',
    });
    expect(result.prompt).toBe('');
    expect(result.warnings.some((warning) => warning.code === 'unknown-entry')).toBe(true);
  });

  it('keeps the negative prompt separate and never fills it', () => {
    const result = buildPrompt({
      catalog,
      selections: { 'subject.look': [entryId('subject.look', 'editorial')] },
      promptLocale: 'en',
      negative: 'blurry, watermark',
    });
    expect(result.negative).toBe('blurry, watermark');
    expect(result.prompt).not.toMatch(/blurry/);
  });

  it('warns when the profile does not document a negative prompt', () => {
    const profile: ModelProfile = {
      ...getGeneralProfile(),
      id: 'no-negative',
      negative: { supported: false },
    };
    const result = buildPrompt({
      catalog,
      selections: {},
      promptLocale: 'en',
      profile,
      negative: 'watermark',
    });
    expect(result.warnings.some((warning) => warning.code === 'negative-unsupported')).toBe(true);
  });

  it('uses the profile prefix and sentence style', () => {
    const profile: ModelProfile = {
      ...getGeneralProfile(),
      id: 'prefixed',
      promptStyle: 'sentences',
      prefix: { en: 'a photograph of', it: 'una fotografia di' },
    };
    const result = buildPrompt({
      catalog,
      selections: { 'subject.look': [entryId('subject.look', 'editorial')] },
      promptLocale: 'en',
      profile,
    });
    expect(result.prompt.startsWith('a photograph of, fashion editorial')).toBe(true);
    expect(result.prompt.endsWith('.')).toBe(true);
  });

  it('omits the categories excluded by the profile', () => {
    const profile: ModelProfile = {
      ...getGeneralProfile(),
      id: 'no-scene',
      omit: ['scene.type', 'scene.details'],
    };
    const result = buildPrompt({
      catalog,
      selections: {
        'subject.look': [entryId('subject.look', 'editorial')],
        'scene.type': [entryId('scene.type', 'studio')],
      },
      promptLocale: 'en',
      profile,
    });
    expect(result.fragments.map((fragment) => fragment.categoryId)).not.toContain('scene.type');
  });

  it('falls back to the general profile when none is selected', () => {
    const result = buildPrompt({ catalog, selections: {}, promptLocale: 'en', profile: null });
    expect(result.profileId).toBe(GENERAL_PROFILE_ID);
  });

  it('keeps every category of the catalog in the effective order', () => {
    const order = effectiveCategoryOrder(catalog, getGeneralProfile());
    expect(order.length).toBe(catalog.categories.length);
  });

  it('never repeats the same wording twice', () => {
    const custom: CatalogDocument = {
      ...catalog,
      categories: catalog.categories.map((category) =>
        category.id === 'appearance.skin.features'
          ? {
              ...category,
              entries: [
                {
                  id: 'appearance.skin.features.a',
                  label: { en: 'A', it: 'A' },
                  prompt: { en: 'soft freckles', it: 'lentiggini delicate' },
                },
                {
                  id: 'appearance.skin.features.b',
                  label: { en: 'B', it: 'B' },
                  prompt: { en: 'Soft freckles.', it: 'Lentiggini delicate.' },
                },
              ],
            }
          : category,
      ),
    };
    const result = buildPrompt({
      catalog: custom,
      selections: { 'appearance.skin.features': ['appearance.skin.features.a', 'appearance.skin.features.b'] },
      promptLocale: 'en',
    });
    expect(result.fragments).toHaveLength(1);
    expect(result.warnings.some((warning) => warning.code === 'duplicate')).toBe(true);
  });
});
