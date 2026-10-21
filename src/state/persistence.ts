/**
 * Local persistence.
 *
 * Everything is stored in `localStorage` under versioned keys. Reads are
 * defensive: a corrupted or outdated value never breaks the application, it
 * falls back to the defaults and reports the problem.
 */
import type { Locale, SelectionMap } from '../catalog/types';

export const STORAGE_PREFIX = 'aips.v1';
export const STORAGE_KEYS = {
  preferences: `${STORAGE_PREFIX}.preferences`,
  presets: `${STORAGE_PREFIX}.presets`,
  history: `${STORAGE_PREFIX}.history`,
  session: `${STORAGE_PREFIX}.session`,
  catalog: `${STORAGE_PREFIX}.catalog`,
  catalogHistory: `${STORAGE_PREFIX}.catalog.history`,
} as const;

/** Minimal storage contract, so tests can inject a fake implementation. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Returns the browser storage, or null when it is unavailable (private mode). */
export function getBrowserStorage(): KeyValueStorage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = `${STORAGE_PREFIX}.probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

export interface Preferences {
  uiLocale: Locale;
  promptLocale: Locale;
  profileId: string;
  randomDensity: number;
  allowOnlineUpdates: boolean;
  manifestUrl: string;
}

export const DEFAULT_PREFERENCES: Preferences = {
  uiLocale: 'en',
  promptLocale: 'en',
  profileId: 'general',
  randomDensity: 0.6,
  allowOnlineUpdates: false,
  manifestUrl: '',
};

export interface Preset {
  id: string;
  name: string;
  createdAt: string;
  profileId: string;
  selections: SelectionMap;
}

export interface HistoryEntry {
  id: string;
  createdAt: string;
  prompt: string;
  negative: string;
  profileId: string;
}

export interface SessionState {
  selections: SelectionMap;
  prompt: string;
  negative: string;
  promptSource: 'empty' | 'generated' | 'manual';
  generatedSignature: string;
}

export interface LoadResult<T> {
  value: T;
  /** True when the stored value was unusable and the default was used. */
  recovered: boolean;
  reason?: string;
}

interface ReadResult {
  /** A value was stored under the key. */
  present: boolean;
  /** The stored value could not be parsed. */
  corrupted: boolean;
  value?: unknown;
}

function readJson(storage: KeyValueStorage | null, key: string): ReadResult {
  if (!storage) return { present: false, corrupted: false };
  const raw = storage.getItem(key);
  if (raw === null) return { present: false, corrupted: false };
  try {
    return { present: true, corrupted: false, value: JSON.parse(raw) as unknown };
  } catch {
    return { present: true, corrupted: true };
  }
}

function writeJson(storage: KeyValueStorage | null, key: string, value: unknown): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Keep only `{ categoryId: string[] }` shaped objects. */
export function sanitizeSelectionMap(value: unknown): SelectionMap {
  if (!isRecord(value)) return {};
  const result: SelectionMap = {};
  for (const [categoryId, ids] of Object.entries(value)) {
    if (!Array.isArray(ids)) continue;
    const clean = ids.filter((id): id is string => typeof id === 'string');
    if (clean.length > 0) result[categoryId] = clean;
  }
  return result;
}

export function loadPreferences(storage: KeyValueStorage | null): LoadResult<Preferences> {
  const raw = readJson(storage, STORAGE_KEYS.preferences);
  if (!raw.present) return { value: { ...DEFAULT_PREFERENCES }, recovered: false };
  if (raw.corrupted || !isRecord(raw.value)) {
    return { value: { ...DEFAULT_PREFERENCES }, recovered: true, reason: 'corrupted preferences' };
  }
  const record = raw.value;
  const value: Preferences = {
    uiLocale: record.uiLocale === 'it' || record.uiLocale === 'en' ? record.uiLocale : DEFAULT_PREFERENCES.uiLocale,
    promptLocale:
      record.promptLocale === 'it' || record.promptLocale === 'en'
        ? record.promptLocale
        : DEFAULT_PREFERENCES.promptLocale,
    profileId: typeof record.profileId === 'string' ? record.profileId : DEFAULT_PREFERENCES.profileId,
    randomDensity:
      typeof record.randomDensity === 'number' && Number.isFinite(record.randomDensity)
        ? Math.min(1, Math.max(0, record.randomDensity))
        : DEFAULT_PREFERENCES.randomDensity,
    allowOnlineUpdates: record.allowOnlineUpdates === true,
    manifestUrl: typeof record.manifestUrl === 'string' ? record.manifestUrl : '',
  };
  return { value, recovered: false };
}

export function savePreferences(storage: KeyValueStorage | null, preferences: Preferences): boolean {
  return writeJson(storage, STORAGE_KEYS.preferences, preferences);
}

export function loadPresets(storage: KeyValueStorage | null): LoadResult<Preset[]> {
  const raw = readJson(storage, STORAGE_KEYS.presets);
  if (!raw.present) return { value: [], recovered: false };
  if (raw.corrupted || !Array.isArray(raw.value)) {
    return { value: [], recovered: true, reason: 'corrupted presets' };
  }
  const presets: Preset[] = [];
  for (const item of raw.value) {
    if (!isRecord(item)) continue;
    if (typeof item.id !== 'string' || typeof item.name !== 'string') continue;
    presets.push({
      id: item.id,
      name: item.name,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date(0).toISOString(),
      profileId: typeof item.profileId === 'string' ? item.profileId : 'general',
      selections: sanitizeSelectionMap(item.selections),
    });
  }
  return { value: presets, recovered: false };
}

export function savePresets(storage: KeyValueStorage | null, presets: Preset[]): boolean {
  return writeJson(storage, STORAGE_KEYS.presets, presets);
}

export function loadHistory(storage: KeyValueStorage | null): LoadResult<HistoryEntry[]> {
  const raw = readJson(storage, STORAGE_KEYS.history);
  if (!raw.present) return { value: [], recovered: false };
  if (raw.corrupted || !Array.isArray(raw.value)) {
    return { value: [], recovered: true, reason: 'corrupted history' };
  }
  const history: HistoryEntry[] = [];
  for (const item of raw.value) {
    if (!isRecord(item)) continue;
    if (typeof item.prompt !== 'string') continue;
    history.push({
      id: typeof item.id === 'string' ? item.id : String(history.length),
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date(0).toISOString(),
      prompt: item.prompt,
      negative: typeof item.negative === 'string' ? item.negative : '',
      profileId: typeof item.profileId === 'string' ? item.profileId : 'general',
    });
  }
  return { value: history, recovered: false };
}

export function saveHistory(storage: KeyValueStorage | null, history: HistoryEntry[]): boolean {
  return writeJson(storage, STORAGE_KEYS.history, history);
}

export function loadSession(storage: KeyValueStorage | null): LoadResult<SessionState> {
  const raw = readJson(storage, STORAGE_KEYS.session);
  if (!raw.present) {
    return {
      value: {
        selections: {},
        prompt: '',
        negative: '',
        promptSource: 'empty',
        generatedSignature: '',
      },
      recovered: false,
    };
  }
  if (raw.corrupted || !isRecord(raw.value)) {
    return {
      value: {
        selections: {},
        prompt: '',
        negative: '',
        promptSource: 'empty',
        generatedSignature: '',
      },
      recovered: true,
      reason: 'corrupted session',
    };
  }
  const record = raw.value;
  const source = record.promptSource;
  return {
    value: {
      selections: sanitizeSelectionMap(record.selections),
      prompt: typeof record.prompt === 'string' ? record.prompt : '',
      negative: typeof record.negative === 'string' ? record.negative : '',
      promptSource: source === 'generated' || source === 'manual' ? source : 'empty',
      generatedSignature: typeof record.generatedSignature === 'string' ? record.generatedSignature : '',
    },
    recovered: false,
  };
}

export function saveSession(storage: KeyValueStorage | null, session: SessionState): boolean {
  return writeJson(storage, STORAGE_KEYS.session, session);
}

/** Remove every key owned by the application. */
export function clearAllStoredData(storage: KeyValueStorage | null): void {
  if (!storage) return;
  for (const key of Object.values(STORAGE_KEYS)) {
    try {
      storage.removeItem(key);
    } catch {
      /* ignore: a failing removal must not break the app */
    }
  }
}
