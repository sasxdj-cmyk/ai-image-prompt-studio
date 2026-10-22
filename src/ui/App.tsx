import { useEffect, useMemo } from 'react';
import { DONATION_URL } from '../donation';
import { useApp } from '../state/AppProvider';
import { CategoryBar } from './components/CategoryBar';
import { CategoryPanel } from './components/CategoryPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { Overlays } from './components/Overlays';
import { PresetsPanel } from './components/PresetsPanel';
import { PromptPanel } from './components/PromptPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { SummaryPanel } from './components/SummaryPanel';
import { TopBar } from './components/TopBar';
import { WarningsPanel } from './components/WarningsPanel';
import { useT } from './useT';

export function App() {
  const { state, dispatch, catalog } = useApp();
  const t = useT();

  const activeCategory = useMemo(() => {
    const byId = catalog.categories.find((category) => category.id === state.ui.activeCategoryId);
    return byId ?? catalog.categories[0];
  }, [catalog.categories, state.ui.activeCategoryId]);

  useEffect(() => {
    if (!state.ui.activeCategoryId && catalog.categories[0]) {
      dispatch({ type: 'set-active-category', categoryId: catalog.categories[0].id });
    }
  }, [state.ui.activeCategoryId, catalog.categories, dispatch]);

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        {t('app.skipToContent')}
      </a>
      <TopBar />
      <CategoryBar categories={catalog.categories} />
      <main className="layout" id="main">
        {state.ui.panel === 'categories' && (
          <>
            {activeCategory && <CategoryPanel category={activeCategory} />}
          </>
        )}
        {state.ui.panel === 'presets' && <PresetsPanel />}
        {state.ui.panel === 'history' && <HistoryPanel />}
        {state.ui.panel === 'settings' && <SettingsPanel />}

        <aside className="rail" aria-label={t('prompt.title')}>
          <PromptPanel />
          <SummaryPanel />
          <WarningsPanel />
        </aside>
      </main>
      <footer className="footer">
        <span>
          {t('status.catalogLoaded', {
            version: catalog.catalogVersion,
            categories: catalog.categories.length,
            entries: catalog.categories.reduce((sum, category) => sum + category.entries.length, 0),
          })}
        </span>
        <a
          className="footer-donate"
          href={DONATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          title={t('action.donateHint')}
        >
          <span aria-hidden="true">♥</span> {t('action.donate')}
        </a>
      </footer>
      <Overlays />
    </div>
  );
}
