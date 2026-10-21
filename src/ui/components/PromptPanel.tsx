import { useMemo } from 'react';
import { useApp } from '../../state/AppProvider';
import { useActions } from '../useActions';
import { useT } from '../useT';

/** Prompt preview, negative prompt and the global actions. */
export function PromptPanel() {
  const { state, dispatch, stale, copyPrompt, copyBoth } = useApp();
  const t = useT();
  const { generate, regenerate, random, clearAll, selectionCount } = useActions();

  const stats = useMemo(() => {
    const text = state.prompt.trim();
    return {
      characters: text.length,
      words: text ? text.split(/\s+/).length : 0,
    };
  }, [state.prompt]);

  return (
    <section className="panel prompt-panel" aria-labelledby="prompt-title">
      <header className="panel-header">
        <h2 id="prompt-title">{t('prompt.title')}</h2>
        <span className={state.promptSource === 'manual' ? 'pill manual' : 'pill subtle'}>
          {state.promptSource === 'manual' ? t('prompt.manual') : t('prompt.generated')}
        </span>
      </header>

      <div className="prompt-actions">
        <button type="button" className="btn primary" onClick={generate} title={t('action.generateHint')}>
          {t('action.generate')}
        </button>
        <button type="button" className="btn" onClick={regenerate} title={t('action.regenerate')}>
          {t('action.regenerate')}
        </button>
        <button type="button" className="btn" onClick={random} title={t('action.randomHint')}>
          {t('action.random')}
        </button>
        <button type="button" className="btn danger ghost" onClick={clearAll} title={t('action.clearAllHint')}>
          {t('action.clearAll')}
        </button>
      </div>

      {stale && (
        <p className="notice" role="status">
          {t('prompt.staleHint')}
        </p>
      )}

      <label className="sr-only" htmlFor="prompt-text">
        {t('prompt.title')}
      </label>
      <textarea
        id="prompt-text"
        className="prompt-text"
        value={state.prompt}
        spellCheck={false}
        placeholder={t('prompt.placeholder')}
        onChange={(event) => dispatch({ type: 'set-prompt', prompt: event.target.value, source: 'manual' })}
      />

      <div className="prompt-footer">
        <span className="pill subtle">
          {t('prompt.characters', { count: stats.characters })} · {t('prompt.words', { count: stats.words })}
        </span>
        <span className="pill subtle">{t('status.selectionCount', { count: selectionCount })}</span>
        <div className="prompt-buttons">
          <button type="button" className="btn small" onClick={() => void copyPrompt()}>
            {t('action.copy')}
          </button>
          {state.negative.trim() && (
            <button type="button" className="btn small" onClick={() => void copyBoth()}>
              {t('action.copyBoth')}
            </button>
          )}
        </div>
      </div>

      <div className="negative-block">
        <label htmlFor="negative-text">
          {t('prompt.negative')} <span className="pill subtle">{t('prompt.negativeHint')}</span>
        </label>
        <textarea
          id="negative-text"
          className="prompt-text small"
          value={state.negative}
          spellCheck={false}
          placeholder="blurry, extra fingers, watermark"
          onChange={(event) => dispatch({ type: 'set-negative', negative: event.target.value })}
        />
      </div>
    </section>
  );
}
