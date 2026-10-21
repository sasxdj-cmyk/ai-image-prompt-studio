import { useEffect } from 'react';
import { useApp } from '../../state/AppProvider';
import { useActions } from '../useActions';
import { useT } from '../useT';

/** Toast notifications and modal confirmations. */
export function Overlays() {
  const { state, dispatch } = useApp();
  const t = useT();
  const { applyGenerated } = useActions();

  useEffect(() => {
    if (!state.ui.toast) return;
    const timer = setTimeout(() => dispatch({ type: 'dismiss-toast' }), 3200);
    return () => clearTimeout(timer);
  }, [state.ui.toast, dispatch]);

  const dialog = state.ui.dialog;

  return (
    <>
      {state.ui.toast && (
        <div className={`toast ${state.ui.toast.kind}`} role="status" aria-live="polite">
          <span>{t(state.ui.toast.message)}</span>
          <button
            type="button"
            className="icon-button"
            aria-label={t('action.dismiss')}
            onClick={() => dispatch({ type: 'dismiss-toast' })}
          >
            ×
          </button>
        </div>
      )}

      {dialog && (
        <div className="modal-backdrop" role="presentation" onClick={() => dispatch({ type: 'close-dialog' })}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="modal-title">
              {t(dialog.kind === 'clear-all' ? 'confirm.clearAll.title' : 'confirm.replacePrompt.title')}
            </h2>
            <p>
              {t(
                dialog.kind === 'clear-all'
                  ? 'confirm.clearAll.message'
                  : 'confirm.replacePrompt.message',
              )}
            </p>
            <div className="modal-actions">
              {dialog.kind === 'replace-prompt' && (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => dispatch({ type: 'close-dialog' })}
                >
                  {t('confirm.keepManual')}
                </button>
              )}
              <button
                type="button"
                className="btn ghost"
                onClick={() => dispatch({ type: 'close-dialog' })}
              >
                {t('action.cancel')}
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  if (dialog.kind === 'clear-all') dispatch({ type: 'clear-all' });
                  else applyGenerated();
                  dispatch({ type: 'close-dialog' });
                }}
              >
                {t(dialog.kind === 'clear-all' ? 'action.clearAll' : 'confirm.replaceAnyway')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
