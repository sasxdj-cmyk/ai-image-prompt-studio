/**
 * Application state and reducer.
 *
 * The reducer is a pure function so the behaviour can be unit tested without
 * a DOM. Storage side effects live in the provider component.
 */
import type { CatalogGroupId, SelectionMap } from '../catalog/types';
import type { HistoryEntry, Preferences, Preset } from './persistence';
import { DEFAULT_PREFERENCES } from './persistence';

export type PanelId = 'categories' | 'presets' | 'history' | 'settings';

export type PromptSource = 'empty' | 'generated' | 'manual';

export interface ToastState {
  message: string;
  kind: 'ok' | 'error';
  id: number;
}

export type DialogState =
  | { kind: 'clear-all' }
  | { kind: 'replace-prompt' }
  | { kind: 'delete-preset'; id: string };

export interface AppState {
  selections: SelectionMap;
  prompt: string;
  negative: string;
  promptSource: PromptSource;
  /** Signature of the selections that produced the current prompt. */
  generatedSignature: string;
  preferences: Preferences;
  presets: Preset[];
  history: HistoryEntry[];
  catalogVersion: string;
  catalogSchemaVersion: number;
  ui: {
    panel: PanelId;
    activeCategoryId: string | null;
    /** Subgroup of the active category, null means "all of them". */
    activeSubgroupId: string | null;
    search: string;
    groupFilter: CatalogGroupId | 'all';
    toast: ToastState | null;
    dialog: DialogState | null;
  };
}

export type Action =
  | { type: 'set-preferences'; preferences: Partial<Preferences> }
  | { type: 'toggle-entry'; categoryId: string; entryId: string }
  | { type: 'set-single'; categoryId: string; entryId: string }
  | { type: 'clear-category'; categoryId: string }
  | { type: 'clear-all' }
  | { type: 'set-prompt'; prompt: string; source: PromptSource }
  | { type: 'set-negative'; negative: string }
  | { type: 'generate'; prompt: string; signature: string }
  | { type: 'randomize'; selections: SelectionMap }
  | { type: 'save-preset'; preset: Preset }
  | { type: 'delete-preset'; id: string }
  | { type: 'duplicate-preset'; id: string }
  | { type: 'load-preset'; preset: Preset }
  | { type: 'import-presets'; presets: Preset[] }
  | { type: 'clear-history' }
  | { type: 'add-history'; entry: HistoryEntry }
  | { type: 'set-panel'; panel: PanelId }
  | { type: 'set-active-category'; categoryId: string | null }
  | { type: 'set-active-subgroup'; categoryId: string; subgroupId: string | null }
  | { type: 'set-search'; search: string }
  | { type: 'set-group-filter'; group: CatalogGroupId | 'all' }
  | { type: 'toast'; message: string; kind?: 'ok' | 'error' }
  | { type: 'dismiss-toast' }
  | { type: 'open-dialog'; dialog: DialogState }
  | { type: 'close-dialog' }
  | { type: 'set-catalog-version'; version: string; schemaVersion: number };

export function createInitialState(partial: Partial<AppState> = {}): AppState {
  return {
    selections: {},
    prompt: '',
    negative: '',
    promptSource: 'empty',
    generatedSignature: '',
    preferences: { ...DEFAULT_PREFERENCES },
    presets: [],
    history: [],
    catalogVersion: '0.0.0',
    catalogSchemaVersion: 1,
    ui: {
      panel: 'categories',
      activeCategoryId: null,
      activeSubgroupId: null,
      search: '',
      groupFilter: 'all',
      toast: null,
      dialog: null,
    },
    ...partial,
  };
}

/** Stable signature of a selection set, used to detect outdated prompts. */
export function selectionSignature(selections: SelectionMap, profileId: string): string {
  const parts = Object.keys(selections)
    .sort()
    .map((categoryId) => `${categoryId}:${[...(selections[categoryId] ?? [])].sort().join('|')}`)
    .join(';');
  return `${profileId}::${parts}`;
}

let toastCounter = 0;

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'set-preferences':
      return { ...state, preferences: { ...state.preferences, ...action.preferences } };

    case 'toggle-entry': {
      const current = state.selections[action.categoryId] ?? [];
      const exists = current.includes(action.entryId);
      const next = exists
        ? current.filter((id) => id !== action.entryId)
        : [...current, action.entryId];
      const selections = { ...state.selections };
      if (next.length === 0) delete selections[action.categoryId];
      else selections[action.categoryId] = next;
      return { ...state, selections };
    }

    case 'set-single': {
      const selections = { ...state.selections };
      if (state.selections[action.categoryId]?.includes(action.entryId)) {
        delete selections[action.categoryId];
      } else {
        selections[action.categoryId] = [action.entryId];
      }
      return { ...state, selections };
    }

    case 'clear-category': {
      const selections = { ...state.selections };
      delete selections[action.categoryId];
      return { ...state, selections };
    }

    case 'clear-all':
      return {
        ...state,
        selections: {},
        prompt: '',
        promptSource: 'empty',
        generatedSignature: '',
      };

    case 'set-prompt':
      return {
        ...state,
        prompt: action.prompt,
        promptSource: action.source,
      };

    case 'set-negative':
      return { ...state, negative: action.negative };

    case 'generate':
      return {
        ...state,
        prompt: action.prompt,
        promptSource: 'generated',
        generatedSignature: action.signature,
      };

    case 'randomize':
      return { ...state, selections: action.selections };

    case 'save-preset':
      return { ...state, presets: [action.preset, ...state.presets] };

    case 'delete-preset':
      return { ...state, presets: state.presets.filter((preset) => preset.id !== action.id) };

    case 'duplicate-preset': {
      const source = state.presets.find((preset) => preset.id === action.id);
      if (!source) return state;
      const copy: Preset = {
        ...source,
        id: `${source.id}-copy-${Date.now()}`,
        name: `${source.name} (copy)`,
        createdAt: new Date().toISOString(),
      };
      return { ...state, presets: [copy, ...state.presets] };
    }

    case 'load-preset':
      return {
        ...state,
        selections: action.preset.selections,
        preferences: { ...state.preferences, profileId: action.preset.profileId },
      };

    case 'import-presets': {
      const known = new Set(state.presets.map((preset) => preset.id));
      const fresh = action.presets.filter((preset) => !known.has(preset.id));
      return { ...state, presets: [...fresh, ...state.presets] };
    }

    case 'clear-history':
      return { ...state, history: [] };

    case 'add-history':
      return { ...state, history: [action.entry, ...state.history].slice(0, 50) };

    case 'set-panel':
      return { ...state, ui: { ...state.ui, panel: action.panel } };

    case 'set-active-category':
      return {
        ...state,
        ui: {
          ...state.ui,
          activeCategoryId: action.categoryId,
          // a new category starts without a subgroup
          activeSubgroupId: state.ui.activeCategoryId === action.categoryId ? state.ui.activeSubgroupId : null,
        },
      };

    case 'set-active-subgroup':
      return {
        ...state,
        ui: {
          ...state.ui,
          activeCategoryId: action.categoryId,
          activeSubgroupId: action.subgroupId,
        },
      };

    case 'set-search':
      return { ...state, ui: { ...state.ui, search: action.search } };

    case 'set-group-filter':
      return { ...state, ui: { ...state.ui, groupFilter: action.group } };

    case 'toast':
      toastCounter += 1;
      return {
        ...state,
        ui: {
          ...state.ui,
          toast: { message: action.message, kind: action.kind ?? 'ok', id: toastCounter },
        },
      };

    case 'dismiss-toast':
      return { ...state, ui: { ...state.ui, toast: null } };

    case 'open-dialog':
      return { ...state, ui: { ...state.ui, dialog: action.dialog } };

    case 'close-dialog':
      return { ...state, ui: { ...state.ui, dialog: null } };

    case 'set-catalog-version':
      return { ...state, catalogVersion: action.version, catalogSchemaVersion: action.schemaVersion };

    default:
      return state;
  }
}
