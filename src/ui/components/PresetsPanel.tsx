import { useMemo, useState } from 'react';
import type { Preset } from '../../state/persistence';
import { useApp } from '../../state/AppProvider';
import { useT } from '../useT';

/** Presets: save, reload, duplicate, export and import selection sets. */
export function PresetsPanel() {
  const { state, dispatch } = useApp();
  const t = useT();
  const [name, setName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const locale = state.preferences.uiLocale;

  const saveCurrent = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const preset: Preset = {
      id: `preset-${Date.now()}`,
      name: trimmed,
      createdAt: new Date().toISOString(),
      profileId: state.preferences.profileId,
      selections: state.selections,
    };
    dispatch({ type: 'save-preset', preset });
    dispatch({ type: 'toast', message: 'presets.saved' });
    setName('');
  };

  const exportPresets = () => {
    const payload = JSON.stringify(
      { kind: 'preset-export', version: 1, presets: state.presets },
      null,
      2,
    );
    try {
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'ai-image-prompt-studio-presets.json';
      anchor.click();
      URL.revokeObjectURL(url);
      dispatch({ type: 'toast', message: 'presets.exported' });
    } catch {
      dispatch({ type: 'toast', message: 'presets.exportFail', kind: 'error' });
    }
  };

  const importPresets = (file: File) => {
    void file.text().then((text) => {
      try {
        const parsed = JSON.parse(text) as { kind?: string; presets?: Preset[] };
        if (parsed.kind !== 'preset-export' || !Array.isArray(parsed.presets)) throw new Error('invalid');
        dispatch({ type: 'import-presets', presets: parsed.presets });
        dispatch({ type: 'toast', message: 'presets.imported' });
        setImportError(null);
      } catch {
        setImportError(t('presets.importFail'));
        dispatch({ type: 'toast', message: 'presets.importFail', kind: 'error' });
      }
    });
  };

  const totalSelections = useMemo(
    () =>
      state.presets.reduce(
        (sum, preset) => sum + Object.values(preset.selections).reduce((n, ids) => n + ids.length, 0),
        0,
      ),
    [state.presets],
  );

  return (
    <section className="panel wide-panel" aria-labelledby="presets-title">
      <header className="panel-header">
        <h2 id="presets-title">{t('presets.title')}</h2>
        <span className="pill subtle">{t('presets.selectionCount', { count: totalSelections })}</span>
      </header>
      <p className="muted">{t('presets.subtitle')}</p>

      <div className="preset-save">
        <label className="field">
          <span>{t('presets.name')}</span>
          <input
            type="text"
            value={name}
            placeholder={t('presets.namePlaceholder')}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') saveCurrent();
            }}
          />
        </label>
        <button type="button" className="btn primary" onClick={saveCurrent} disabled={!name.trim()}>
          {t('presets.save')}
        </button>
        <button type="button" className="btn" onClick={exportPresets} disabled={state.presets.length === 0}>
          {t('action.export')}
        </button>
        <label className="btn file-button">
          {t('action.import')}
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) importPresets(file);
              event.target.value = '';
            }}
          />
        </label>
      </div>

      {importError && <p className="notice error">{importError}</p>}

      {state.presets.length === 0 ? (
        <p className="empty">{t('presets.empty')}</p>
      ) : (
        <ul className="preset-list">
          {state.presets.map((preset) => {
            const count = Object.values(preset.selections).reduce((n, ids) => n + ids.length, 0);
            return (
              <li key={preset.id} className="preset-item">
                <div>
                  <strong>{preset.name}</strong>
                  <span className="muted">
                    {t('presets.createdAt', { date: new Date(preset.createdAt).toLocaleString(locale) })} ·{' '}
                    {t('presets.selectionCount', { count })}
                  </span>
                </div>
                <div className="preset-actions">
                  <button
                    type="button"
                    className="btn small"
                    title={t('presets.restoreHint')}
                    onClick={() => {
                      dispatch({ type: 'load-preset', preset });
                      dispatch({ type: 'toast', message: 'presets.loaded' });
                    }}
                  >
                    {t('presets.restore')}
                  </button>
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => {
                      dispatch({ type: 'duplicate-preset', id: preset.id });
                      dispatch({ type: 'toast', message: 'presets.duplicated' });
                    }}
                  >
                    {t('action.duplicate')}
                  </button>
                  <button
                    type="button"
                    className="btn small danger ghost"
                    onClick={() => {
                      dispatch({ type: 'delete-preset', id: preset.id });
                      dispatch({ type: 'toast', message: 'presets.deleted' });
                    }}
                  >
                    {t('action.delete')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
