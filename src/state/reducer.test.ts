import { describe, expect, it } from 'vitest';
import { createInitialState, reducer, selectionSignature, type AppState } from './reducer';

function stateWith(partial: Partial<AppState> = {}): AppState {
  return createInitialState(partial);
}

describe('reducer', () => {
  it('toggles an entry in a multiple selection category', () => {
    let state = stateWith();
    state = reducer(state, { type: 'toggle-entry', categoryId: 'subject.look', entryId: 'a' });
    expect(state.selections['subject.look']).toEqual(['a']);
    state = reducer(state, { type: 'toggle-entry', categoryId: 'subject.look', entryId: 'a' });
    expect(state.selections['subject.look']).toBeUndefined();
  });

  it('keeps the categories independent', () => {
    let state = stateWith();
    state = reducer(state, { type: 'toggle-entry', categoryId: 'subject.look', entryId: 'a' });
    state = reducer(state, { type: 'toggle-entry', categoryId: 'pose.body', entryId: 'b' });
    state = reducer(state, { type: 'clear-category', categoryId: 'pose.body' });
    expect(state.selections['subject.look']).toEqual(['a']);
    expect(state.selections['pose.body']).toBeUndefined();
  });

  it('replaces the value of a single selection category', () => {
    let state = stateWith();
    state = reducer(state, { type: 'set-single', categoryId: 'subject.age', entryId: 'a' });
    state = reducer(state, { type: 'set-single', categoryId: 'subject.age', entryId: 'b' });
    expect(state.selections['subject.age']).toEqual(['b']);
  });

  it('unsets a single selection when it is selected again', () => {
    let state = stateWith();
    state = reducer(state, { type: 'set-single', categoryId: 'subject.age', entryId: 'a' });
    state = reducer(state, { type: 'set-single', categoryId: 'subject.age', entryId: 'a' });
    expect(state.selections['subject.age']).toBeUndefined();
  });

  it('clears the selections and the prompt but keeps the preferences', () => {
    let state = stateWith({
      selections: { 'subject.look': ['a'] },
      prompt: 'something',
      promptSource: 'generated',
      preferences: { ...createInitialState().preferences, uiLocale: 'it' },
    });
    state = reducer(state, { type: 'clear-all' });
    expect(state.selections).toEqual({});
    expect(state.prompt).toBe('');
    expect(state.promptSource).toBe('empty');
    expect(state.preferences.uiLocale).toBe('it');
  });

  it('marks an edited prompt as manual', () => {
    let state = stateWith();
    state = reducer(state, { type: 'set-prompt', prompt: 'edited by hand', source: 'manual' });
    expect(state.promptSource).toBe('manual');
    expect(state.prompt).toBe('edited by hand');
  });

  it('keeps the selections when the model profile changes', () => {
    let state = stateWith({ selections: { 'subject.look': ['a'] } });
    state = reducer(state, { type: 'set-preferences', preferences: { profileId: 'flux2' } });
    expect(state.selections['subject.look']).toEqual(['a']);
    expect(state.preferences.profileId).toBe('flux2');
  });

  it('keeps the selections when the interface language changes', () => {
    let state = stateWith({ selections: { 'subject.look': ['a'] } });
    state = reducer(state, { type: 'set-preferences', preferences: { uiLocale: 'it' } });
    expect(state.selections['subject.look']).toEqual(['a']);
    expect(state.preferences.uiLocale).toBe('it');
  });

  it('keeps the selections when the prompt language changes', () => {
    let state = stateWith({ selections: { 'subject.look': ['a'] } });
    state = reducer(state, { type: 'set-preferences', preferences: { promptLocale: 'it' } });
    expect(state.selections['subject.look']).toEqual(['a']);
  });

  it('activates a subcategory and resets it with the category', () => {
    let state = stateWith();
    state = reducer(state, { type: 'set-active-category', categoryId: 'wardrobe.garments' });
    expect(state.ui.activeCategoryId).toBe('wardrobe.garments');
    expect(state.ui.activeSubgroupId).toBeNull();

    state = reducer(state, {
      type: 'set-active-subgroup',
      categoryId: 'wardrobe.garments',
      subgroupId: 'outerwear',
    });
    expect(state.ui.activeSubgroupId).toBe('outerwear');

    // activating the same category again keeps the subcategory
    state = reducer(state, { type: 'set-active-category', categoryId: 'wardrobe.garments' });
    expect(state.ui.activeSubgroupId).toBe('outerwear');

    // another category starts fresh
    state = reducer(state, { type: 'set-active-category', categoryId: 'subject.look' });
    expect(state.ui.activeSubgroupId).toBeNull();
  });

  it('stores and deletes presets', () => {
    const preset = {
      id: 'p1',
      name: 'Test',
      createdAt: '2026-01-01T00:00:00.000Z',
      profileId: 'general',
      selections: { 'subject.look': ['a'] },
    };
    let state = stateWith();
    state = reducer(state, { type: 'save-preset', preset });
    expect(state.presets).toHaveLength(1);
    state = reducer(state, { type: 'delete-preset', id: 'p1' });
    expect(state.presets).toHaveLength(0);
  });

  it('duplicates a preset without touching the original', () => {
    const preset = {
      id: 'p1',
      name: 'Test',
      createdAt: '2026-01-01T00:00:00.000Z',
      profileId: 'general',
      selections: { 'subject.look': ['a'] },
    };
    let state = stateWith({ presets: [preset] });
    state = reducer(state, { type: 'duplicate-preset', id: 'p1' });
    expect(state.presets).toHaveLength(2);
    expect(state.presets[0]?.id).not.toBe('p1');
    expect(state.presets[0]?.selections).toEqual(preset.selections);
  });

  it('imports presets and skips the known ones', () => {
    const preset = {
      id: 'p1',
      name: 'Test',
      createdAt: '2026-01-01T00:00:00.000Z',
      profileId: 'general',
      selections: {},
    };
    let state = stateWith({ presets: [preset] });
    state = reducer(state, { type: 'import-presets', presets: [preset] });
    expect(state.presets).toHaveLength(1);
  });

  it('caps the history at 50 entries', () => {
    let state = stateWith();
    for (let index = 0; index < 60; index += 1) {
      state = reducer(state, {
        type: 'add-history',
        entry: {
          id: String(index),
          createdAt: '2026-01-01T00:00:00.000Z',
          prompt: `prompt ${index}`,
          negative: '',
          profileId: 'general',
        },
      });
    }
    expect(state.history).toHaveLength(50);
    expect(state.history[0]?.prompt).toBe('prompt 59');
  });

  it('computes a stable signature', () => {
    const a = selectionSignature({ 'subject.look': ['a', 'b'] }, 'general');
    const b = selectionSignature({ 'subject.look': ['b', 'a'] }, 'general');
    const c = selectionSignature({ 'subject.look': ['a', 'b'] }, 'flux2');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
