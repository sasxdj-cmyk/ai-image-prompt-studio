import { useMemo, useRef, useState } from 'react';
import { UI_LOCALES } from '../../i18n';
import { MODEL_PROFILES } from '../../models/profiles';
import {
  applyCatalogPackage,
  compareVersions,
  fetchCatalogPackage,
  fetchUpdateManifest,
  loadCatalogHistory,
  parseCatalogPackage,
} from '../../updates/catalog-updates';
import { useApp } from '../../state/AppProvider';
import { useT } from '../useT';

/** Settings: languages, model profile details, catalog management, privacy. */
export function SettingsPanel() {
  const { state, dispatch, catalog, profile, installCatalog, storage } = useApp();
  const t = useT();
  const locale = state.preferences.uiLocale;
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const history = useMemo(() => loadCatalogHistory(storage), [storage]);
  const previous = history[0];

  const checkForUpdates = async () => {
    setBusy(true);
    const manifestResult = await fetchUpdateManifest(state.preferences.manifestUrl);
    if (!manifestResult.manifest) {
      dispatch({
        type: 'toast',
        message: manifestResult.offline ? 'settings.updateOffline' : 'settings.updateFail',
        kind: 'error',
      });
      if (manifestResult.error && !manifestResult.offline) {
        dispatch({ type: 'toast', message: `settings.updateFail`, kind: 'error' });
      }
      setBusy(false);
      return;
    }
    if (compareVersions(manifestResult.manifest.catalogVersion, catalog.catalogVersion) <= 0) {
      dispatch({ type: 'toast', message: 'settings.updateUpToDate' });
      setBusy(false);
      return;
    }
    const packageResult = await fetchCatalogPackage(manifestResult.manifest.packageUrl);
    if (!packageResult.raw) {
      dispatch({
        type: 'toast',
        message: packageResult.offline ? 'settings.updateOffline' : 'settings.updateFail',
        kind: 'error',
      });
      setBusy(false);
      return;
    }
    const parsed = parseCatalogPackage(packageResult.raw);
    if (!parsed.package) {
      dispatch({ type: 'toast', message: 'error.packageInvalid', kind: 'error' });
      setBusy(false);
      return;
    }
    const outcome = applyCatalogPackage(catalog, parsed.package);
    if (outcome.status === 'applied') {
      installCatalog(outcome.catalog);
      dispatch({ type: 'toast', message: 'settings.updateOk', kind: 'ok' });
    } else {
      dispatch({ type: 'toast', message: 'settings.updateFail', kind: 'error' });
    }
    setBusy(false);
  };

  const importPackage = async (file: File) => {
    const text = await file.text();
    const parsed = parseCatalogPackage(text);
    if (!parsed.package) {
      dispatch({ type: 'toast', message: 'error.packageInvalid', kind: 'error' });
      return;
    }
    const outcome = applyCatalogPackage(catalog, parsed.package);
    if (outcome.status === 'applied') {
      installCatalog(outcome.catalog);
      dispatch({ type: 'toast', message: 'settings.updateOk' });
    } else {
      dispatch({ type: 'toast', message: 'settings.updateFail', kind: 'error' });
    }
  };

  return (
    <section className="panel wide-panel" aria-labelledby="settings-title">
      <header className="panel-header">
        <h2 id="settings-title">{t('settings.title')}</h2>
      </header>

      <div className="settings-grid">
        <div className="settings-block">
          <h3>{t('settings.language')}</h3>
          <div className="radio-row">
            {UI_LOCALES.map((item) => (
              <label key={item.id} className="radio">
                <input
                  type="radio"
                  name="ui-locale"
                  checked={state.preferences.uiLocale === item.id}
                  onChange={() =>
                    dispatch({ type: 'set-preferences', preferences: { uiLocale: item.id } })
                  }
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>

          <h3>{t('settings.promptLanguage')}</h3>
          <div className="radio-row">
            {UI_LOCALES.map((item) => (
              <label key={item.id} className="radio">
                <input
                  type="radio"
                  name="prompt-locale"
                  checked={state.preferences.promptLocale === item.id}
                  onChange={() =>
                    dispatch({ type: 'set-preferences', preferences: { promptLocale: item.id } })
                  }
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          <p className="muted">{t('settings.promptLanguageHint')}</p>
        </div>

        <div className="settings-block">
          <h3>{t('settings.profile')}</h3>
          <label className="field">
            <span>{t('topbar.modelProfile')}</span>
            <select
              value={state.preferences.profileId}
              onChange={(event) =>
                dispatch({ type: 'set-preferences', preferences: { profileId: event.target.value } })
              }
            >
              {MODEL_PROFILES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name[locale]}
                </option>
              ))}
            </select>
          </label>

          <div className="profile-card">
            <p className="profile-description">{profile.description[locale]}</p>
            <dl>
              <dt>{t('model.reference')}</dt>
              <dd>{profile.reference}</dd>
              <dt>{t('model.negative')}</dt>
              <dd>
                {profile.negative.supported
                  ? t('model.negativeSupported')
                  : t('model.negativeUnsupported')}
                {profile.negative.note && <span className="muted"> {profile.negative.note[locale]}</span>}
              </dd>
              <dt>{t('model.guidance')}</dt>
              <dd>{profile.guidance?.[locale]}</dd>
              <dt>{t('model.source')}</dt>
              <dd>
                {profile.source?.title}
                {profile.source?.url && (
                  <>
                    {' — '}
                    <a href={profile.source.url} target="_blank" rel="noreferrer noopener">
                      {profile.source.url}
                    </a>
                  </>
                )}
              </dd>
              <dt>{t('model.verifiedOn', { date: profile.verifiedOn ?? '-' })}</dt>
              <dd>
                <span className={`pill ${profile.verification === 'verified' ? 'ok' : 'subtle'}`}>
                  {t(
                    profile.verification === 'verified'
                      ? 'model.verified'
                      : profile.verification === 'partial'
                        ? 'model.partial'
                        : profile.verification === 'evergreen'
                          ? 'model.evergreen'
                          : 'model.unverified',
                  )}
                </span>
              </dd>
            </dl>
          </div>
        </div>

        <div className="settings-block">
          <h3>{t('settings.catalog')}</h3>
          <dl>
            <dt>{t('settings.catalogVersion')}</dt>
            <dd>{catalog.catalogVersion}</dd>
            <dt>{t('settings.catalogSchema')}</dt>
            <dd>{catalog.schemaVersion}</dd>
            <dt>{t('settings.catalogUpdated')}</dt>
            <dd>{catalog.generatedAt}</dd>
            <dt>{t('panel.resultCount', { count: catalog.categories.length })}</dt>
            <dd>
              {catalog.categories.reduce((sum, category) => sum + category.entries.length, 0)} options
            </dd>
          </dl>

          <label className="radio">
            <input
              type="checkbox"
              checked={state.preferences.allowOnlineUpdates}
              onChange={(event) =>
                dispatch({
                  type: 'set-preferences',
                  preferences: { allowOnlineUpdates: event.target.checked },
                })
              }
            />
            <span>{t('settings.allowOnlineUpdates')}</span>
          </label>
          <p className="muted">{t('settings.allowOnlineUpdatesHint')}</p>

          <label className="field">
            <span>{t('settings.manifestUrl')}</span>
            <input
              type="url"
              value={state.preferences.manifestUrl}
              placeholder="https://example.org/catalog/manifest.json"
              onChange={(event) =>
                dispatch({ type: 'set-preferences', preferences: { manifestUrl: event.target.value } })
              }
            />
          </label>

          <div className="button-row">
            <button
              type="button"
              className="btn"
              disabled={!state.preferences.allowOnlineUpdates || !state.preferences.manifestUrl || busy}
              onClick={() => void checkForUpdates()}
            >
              {t('settings.checkUpdates')}
            </button>
            <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
              {t('settings.importPackage')}
            </button>
            <button
              type="button"
              className="btn"
              disabled={!previous}
              title={previous ? undefined : t('settings.rollbackUnavailable')}
              onClick={() => {
                if (!previous) return;
                installCatalog(previous);
                dispatch({ type: 'toast', message: 'status.catalogUpdated' });
              }}
            >
              {t('settings.rollback')}
            </button>
          </div>
          <p className="muted">{t('settings.importPackageHint')}</p>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importPackage(file);
              event.target.value = '';
            }}
          />
        </div>

        <div className="settings-block">
          <h3>{t('settings.privacy')}</h3>
          <p className="muted">{t('settings.privacyText')}</p>
          <button
            type="button"
            className="btn danger ghost"
            onClick={() => {
              dispatch({ type: 'set-preferences', preferences: { profileId: 'general', randomDensity: 0.6 } });
              dispatch({ type: 'toast', message: 'settings.resetDone' });
            }}
          >
            {t('settings.reset')}
          </button>
        </div>
      </div>
    </section>
  );
}
