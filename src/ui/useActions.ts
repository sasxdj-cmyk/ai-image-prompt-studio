import { useCallback } from 'react';
import { useApp } from '../state/AppProvider';
import { selectionSignature } from '../state/reducer';

/** Global actions: generate, random, clear all. */
export function useActions() {
  const { state, dispatch, buildFor, randomize, catalog } = useApp();

  const applyGenerated = useCallback(() => {
    const prompt = buildFor(state.selections);
    const signature = selectionSignature(state.selections, state.preferences.profileId);
    dispatch({ type: 'generate', prompt, signature });
    if (prompt.trim()) {
      dispatch({
        type: 'add-history',
        entry: {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
          prompt,
          negative: state.negative,
          profileId: state.preferences.profileId,
        },
      });
    }
  }, [buildFor, dispatch, state.selections, state.negative, state.preferences.profileId]);

  const generate = useCallback(() => {
    if (state.promptSource === 'manual' && state.prompt.trim() !== '') {
      dispatch({ type: 'open-dialog', dialog: { kind: 'replace-prompt' } });
      return;
    }
    applyGenerated();
  }, [applyGenerated, dispatch, state.prompt, state.promptSource]);

  const regenerate = useCallback(() => {
    applyGenerated();
  }, [applyGenerated]);

  const random = useCallback(() => {
    randomize();
    dispatch({ type: 'toast', message: 'status.ready' });
  }, [dispatch, randomize]);

  const clearAll = useCallback(() => {
    const hasSelections = Object.keys(state.selections).length > 0;
    if (hasSelections || state.prompt.trim()) {
      dispatch({ type: 'open-dialog', dialog: { kind: 'clear-all' } });
      return;
    }
    dispatch({ type: 'clear-all' });
  }, [dispatch, state.prompt, state.selections]);

  const selectionCount = Object.values(state.selections).reduce((sum, ids) => sum + ids.length, 0);

  return {
    generate,
    regenerate,
    applyGenerated,
    random,
    clearAll,
    selectionCount,
    categoryCount: Object.keys(state.selections).length,
    catalogSize: catalog.categories.length,
  };
}
