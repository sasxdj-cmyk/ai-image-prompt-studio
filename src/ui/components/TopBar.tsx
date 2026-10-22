import { UI_LOCALES } from '../../i18n';
import { MODEL_PROFILES } from '../../models/profiles';
import { DONATION_URL } from '../../donation';
import { useApp } from '../../state/AppProvider';
import { useT } from '../useT';

/** Application header: brand, navigation and global selectors. */
export function TopBar() {
  const { state, dispatch, profile } = useApp();
  const t = useT();
  const locale = state.preferences.uiLocale;

  const tabs: { id: 'categories' | 'presets' | 'history' | 'settings'; label: string }[] = [
    { id: 'categories', label: t('nav.categories') },
    { id: 'presets', label: t('nav.presets') },
    { id: 'history', label: t('nav.history') },
    { id: 'settings', label: t('nav.settings') },
  ];

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          ✦
        </span>
        <div>
          <h1>{t('app.name')}</h1>
          <p>{t('app.tagline')}</p>
        </div>
      </div>

      <nav className="tabs" aria-label={t('app.name')}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={state.ui.panel === tab.id ? 'tab active' : 'tab'}
            aria-current={state.ui.panel === tab.id ? 'page' : undefined}
            onClick={() => dispatch({ type: 'set-panel', panel: tab.id })}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="topbar-controls">
        <label className="field inline">
          <span>{t('topbar.language')}</span>
          <select
            value={locale}
            onChange={(event) =>
              dispatch({ type: 'set-preferences', preferences: { uiLocale: event.target.value as 'en' | 'it' } })
            }
          >
            {UI_LOCALES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field inline">
          <span>{t('topbar.promptLanguage')}</span>
          <select
            value={state.preferences.promptLocale}
            onChange={(event) =>
              dispatch({
                type: 'set-preferences',
                preferences: { promptLocale: event.target.value as 'en' | 'it' },
              })
            }
          >
            {UI_LOCALES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field inline">
          <span title={t('topbar.modelProfileHelp')}>{t('topbar.modelProfile')}</span>
          <select
            value={state.preferences.profileId}
            onChange={(event) => {
              dispatch({
                type: 'set-preferences',
                preferences: { profileId: event.target.value },
              });
              dispatch({
                type: 'toast',
                message: 'status.profileChanged',
              });
            }}
          >
            {MODEL_PROFILES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name[locale]}
              </option>
            ))}
          </select>
        </label>

        <label className="field inline" title={t('random.densityHint')}>
          <span>{t('random.density')}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={state.preferences.randomDensity}
            onChange={(event) =>
              dispatch({
                type: 'set-preferences',
                preferences: { randomDensity: Number(event.target.value) },
              })
            }
          />
        </label>

        <a
          className="btn donate"
          href={DONATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          title={t('action.donateHint')}
        >
          <span aria-hidden="true">♥</span> {t('action.donate')}
        </a>

        <span
          className={`pill subtle profile-pill ${profile.verification === 'verified' ? 'ok' : ''}`}
          title={`${profile.reference} - ${t(
            profile.verification === 'verified'
              ? 'model.verified'
              : profile.verification === 'partial'
                ? 'model.partial'
                : profile.verification === 'evergreen'
                  ? 'model.evergreen'
                  : 'model.unverified',
          )}`}
        >
          {profile.verification === 'verified' ? '✓' : '○'}{' '}
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
      </div>
    </header>
  );
}
