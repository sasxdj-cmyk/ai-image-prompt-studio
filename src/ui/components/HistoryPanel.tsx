import { useApp } from '../../state/AppProvider';
import { useT } from '../useT';

/** The prompts generated during this session. */
export function HistoryPanel() {
  const { state, dispatch, copy } = useApp();
  const t = useT();
  const locale = state.preferences.uiLocale;

  return (
    <section className="panel wide-panel" aria-labelledby="history-title">
      <header className="panel-header">
        <h2 id="history-title">{t('history.title')}</h2>
        {state.history.length > 0 && (
          <button
            type="button"
            className="btn small danger ghost"
            onClick={() => {
              dispatch({ type: 'clear-history' });
              dispatch({ type: 'toast', message: 'history.cleared' });
            }}
          >
            {t('history.clear')}
          </button>
        )}
      </header>
      <p className="muted">{t('history.subtitle')}</p>

      {state.history.length === 0 ? (
        <p className="empty">{t('history.empty')}</p>
      ) : (
        <ul className="history-list">
          {state.history.map((entry) => (
            <li key={entry.id} className="history-item">
              <p className="history-prompt">{entry.prompt}</p>
              <div className="history-meta">
                <span className="muted">{new Date(entry.createdAt).toLocaleString(locale)}</span>
                <button
                  type="button"
                  className="btn small"
                  onClick={() => {
                    dispatch({ type: 'set-prompt', prompt: entry.prompt, source: 'manual' });
                    dispatch({ type: 'set-negative', negative: entry.negative });
                    dispatch({ type: 'toast', message: 'history.restore' });
                  }}
                >
                  {t('history.restore')}
                </button>
                <button type="button" className="btn small" onClick={() => void copy(entry.prompt)}>
                  {t('action.copy')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
