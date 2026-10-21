import { describe, expect, it } from 'vitest';
import {
  clearAllStoredData,
  DEFAULT_PREFERENCES,
  loadHistory,
  loadPreferences,
  loadPresets,
  loadSession,
  saveHistory,
  savePreferences,
  savePresets,
  saveSession,
  STORAGE_KEYS,
  type KeyValueStorage,
} from './persistence';

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
  get size(): number {
    return this.map.size;
  }
}

describe('persistence', () => {
  it('returns the defaults when nothing is stored', () => {
    const storage = new MemoryStorage();
    const result = loadPreferences(storage);
    expect(result.value).toEqual(DEFAULT_PREFERENCES);
    expect(result.recovered).toBe(false);
  });

  it('round-trips the preferences', () => {
    const storage = new MemoryStorage();
    savePreferences(storage, { ...DEFAULT_PREFERENCES, uiLocale: 'it', profileId: 'flux2' });
    const loaded = loadPreferences(storage);
    expect(loaded.value.uiLocale).toBe('it');
    expect(loaded.value.profileId).toBe('flux2');
  });

  it('recovers from corrupted preferences without throwing', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEYS.preferences, '{not json');
    const loaded = loadPreferences(storage);
    expect(loaded.value).toEqual(DEFAULT_PREFERENCES);
    expect(loaded.recovered).toBe(true);
  });

  it('ignores invalid preference values', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      STORAGE_KEYS.preferences,
      JSON.stringify({ uiLocale: 'xx', promptLocale: 42, randomDensity: 'high', profileId: 7 }),
    );
    const loaded = loadPreferences(storage);
    expect(loaded.value.uiLocale).toBe(DEFAULT_PREFERENCES.uiLocale);
    expect(loaded.value.promptLocale).toBe(DEFAULT_PREFERENCES.promptLocale);
    expect(loaded.value.randomDensity).toBe(DEFAULT_PREFERENCES.randomDensity);
    expect(loaded.value.profileId).toBe(DEFAULT_PREFERENCES.profileId);
  });

  it('round-trips presets and skips broken ones', () => {
    const storage = new MemoryStorage();
    savePresets(storage, [
      { id: 'a', name: 'First', createdAt: '2026-01-01T00:00:00.000Z', profileId: 'general', selections: { 'subject.look': ['x'] } },
    ]);
    storage.setItem(STORAGE_KEYS.presets, JSON.stringify([{ nope: true }, { id: 'b', name: 'Second' }]));
    const loaded = loadPresets(storage);
    expect(loaded.value).toHaveLength(1);
    expect(loaded.value[0]?.name).toBe('Second');
    expect(loaded.value[0]?.selections).toEqual({});
  });

  it('recovers from a corrupted session', () => {
    const storage = new MemoryStorage();
    storage.setItem(STORAGE_KEYS.session, 'not json at all');
    const loaded = loadSession(storage);
    expect(loaded.value.selections).toEqual({});
    expect(loaded.value.prompt).toBe('');
    expect(loaded.recovered).toBe(true);
  });

  it('round-trips the session', () => {
    const storage = new MemoryStorage();
    saveSession(storage, {
      selections: { 'subject.look': ['subject.look.editorial'] },
      prompt: 'fashion editorial',
      negative: 'blurry',
      promptSource: 'manual',
      generatedSignature: 'abc',
    });
    const loaded = loadSession(storage);
    expect(loaded.value.prompt).toBe('fashion editorial');
    expect(loaded.value.promptSource).toBe('manual');
    expect(loaded.value.selections['subject.look']).toEqual(['subject.look.editorial']);
  });

  it('round-trips the history and caps it in the reducer', () => {
    const storage = new MemoryStorage();
    saveHistory(storage, [
      { id: '1', createdAt: '2026-01-01T00:00:00.000Z', prompt: 'a', negative: '', profileId: 'general' },
    ]);
    expect(loadHistory(storage).value).toHaveLength(1);
  });

  it('survives an unavailable storage', () => {
    expect(loadPreferences(null).value).toEqual(DEFAULT_PREFERENCES);
    expect(savePreferences(null, DEFAULT_PREFERENCES)).toBe(false);
    expect(loadPresets(null).value).toEqual([]);
  });

  it('clears only the application data', () => {
    const storage = new MemoryStorage();
    storage.setItem('other.app', 'keep me');
    savePreferences(storage, DEFAULT_PREFERENCES);
    savePresets(storage, []);
    clearAllStoredData(storage);
    expect(storage.getItem('other.app')).toBe('keep me');
    expect(storage.getItem(STORAGE_KEYS.preferences)).toBeNull();
  });
});
