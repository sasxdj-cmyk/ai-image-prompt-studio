/**
 * Application provider: wires the reducer to the local storage and exposes
 * the derived state (catalog, profile, prompt) to the components.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import type { CatalogDocument, ModelProfile, SelectionMap } from '../catalog/types';
import { getBuiltinCatalog } from '../catalog/builtin';
import { buildPrompt } from '../engine/prompt';
import { randomizeSelections } from '../engine/random';
import { sanitizeSelections } from '../engine/compatibility';
import { getGeneralProfile, getProfile } from '../models/profiles';
import { copyText, combinePrompts, type ClipboardWriter } from '../clipboard';
import { loadStoredCatalog, saveCatalogWithHistory } from '../updates/catalog-updates';
import {
  getBrowserStorage,
  loadHistory,
  loadPreferences,
  loadPresets,
  loadSession,
  saveHistory,
  savePreferences,
  savePresets,
  saveSession,
  type KeyValueStorage,
} from './persistence';
import { createInitialState, reducer, selectionSignature, type Action, type AppState } from './reducer';

export interface AppContextValue {
  state: AppState;
  dispatch: (action: Action) => void;
  catalog: CatalogDocument;
  /** Install a new catalog version (after a validated update). */
  installCatalog: (catalog: CatalogDocument) => void;
  profile: ModelProfile;
  /** The prompt the current selections would produce. */
  generatedPrompt: string;
  /** True when the selections changed after the last generation. */
  stale: boolean;
  copy: (text: string) => Promise<boolean>;
  copyPrompt: () => Promise<boolean>;
  copyBoth: () => Promise<boolean>;
  /** Build a prompt for an arbitrary selection set with the active profile. */
  buildFor: (selections: SelectionMap) => string;
  randomize: () => void;
  storage: KeyValueStorage | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export interface AppProviderProps {
  children: ReactNode;
  /** Injected for tests. */
  storage?: KeyValueStorage | null;
  clipboardWriter?: ClipboardWriter;
  initialCatalog?: CatalogDocument;
}

export function AppProvider({
  children,
  storage: injectedStorage,
  clipboardWriter,
  initialCatalog,
}: AppProviderProps) {
  const storage = useMemo(
    () => (injectedStorage !== undefined ? injectedStorage : getBrowserStorage()),
    [injectedStorage],
  );

  const [catalog, setCatalog] = useState<CatalogDocument>(
    () => initialCatalog ?? loadStoredCatalog(storage) ?? getBuiltinCatalog(),
  );

  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const preferences = loadPreferences(storage).value;
    const presets = loadPresets(storage).value;
    const history = loadHistory(storage).value;
    const session = loadSession(storage).value;
    const clean = sanitizeSelections(catalog, session.selections).clean;
    return createInitialState({
      selections: clean,
      prompt: session.prompt,
      negative: session.negative,
      promptSource: session.promptSource,
      generatedSignature: session.generatedSignature,
      preferences,
      presets,
      history,
      catalogVersion: catalog.catalogVersion,
      catalogSchemaVersion: catalog.schemaVersion,
    });
  });

  useEffect(() => {
    savePreferences(storage, state.preferences);
  }, [storage, state.preferences]);

  useEffect(() => {
    savePresets(storage, state.presets);
  }, [storage, state.presets]);

  useEffect(() => {
    saveHistory(storage, state.history);
  }, [storage, state.history]);

  useEffect(() => {
    saveSession(storage, {
      selections: state.selections,
      prompt: state.prompt,
      negative: state.negative,
      promptSource: state.promptSource,
      generatedSignature: state.generatedSignature,
    });
  }, [storage, state.selections, state.prompt, state.negative, state.promptSource, state.generatedSignature]);

  const profile = useMemo(
    () => getProfile(state.preferences.profileId) ?? getGeneralProfile(),
    [state.preferences.profileId],
  );

  const buildFor = useCallback(
    (selections: SelectionMap) =>
      buildPrompt({
        catalog,
        selections,
        profile,
        promptLocale: state.preferences.promptLocale,
        negative: state.negative,
      }).prompt,
    [catalog, profile, state.preferences.promptLocale, state.negative],
  );

  const generatedPrompt = useMemo(() => buildFor(state.selections), [buildFor, state.selections]);

  const currentSignature = useMemo(
    () => selectionSignature(state.selections, state.preferences.profileId),
    [state.selections, state.preferences.profileId],
  );
  const stale = state.promptSource !== 'empty' && state.generatedSignature !== currentSignature;

  const installCatalog = useCallback(
    (next: CatalogDocument) => {
      const previous = loadStoredCatalog(storage);
      saveCatalogWithHistory(storage, next, previous ?? undefined);
      setCatalog(next);
      dispatch({ type: 'set-catalog-version', version: next.catalogVersion, schemaVersion: next.schemaVersion });
    },
    [storage],
  );

  const copy = useCallback(
    async (text: string) => {
      const result = await copyText(text, clipboardWriter);
      dispatch({
        type: 'toast',
        message: result.ok ? 'prompt.copyOk' : 'prompt.copyFail',
        kind: result.ok ? 'ok' : 'error',
      });
      return result.ok;
    },
    [clipboardWriter],
  );

  const randomize = useCallback(() => {
    const selections = randomizeSelections({
      catalog,
      profile,
      density: state.preferences.randomDensity,
    });
    dispatch({ type: 'randomize', selections });
  }, [catalog, profile, state.preferences.randomDensity]);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      dispatch,
      catalog,
      installCatalog,
      profile,
      generatedPrompt,
      stale,
      copy,
      copyPrompt: () => copy(state.prompt),
      copyBoth: () => copy(combinePrompts(state.prompt, state.negative)),
      buildFor,
      randomize,
      storage,
    }),
    [state, catalog, installCatalog, profile, generatedPrompt, stale, copy, buildFor, randomize, storage],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside an AppProvider');
  return context;
}
