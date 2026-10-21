import { useMemo } from 'react';
import { useApp } from '../../state/AppProvider';
import { useT } from '../useT';

/** Right rail: everything that is currently selected, with a remove button. */
export function SummaryPanel() {
  const { state, dispatch, catalog } = useApp();
  const t = useT();
  const locale = state.preferences.uiLocale;

  const groups = useMemo(() => {
    const result: { categoryId: string; title: string; entries: { id: string; label: string }[] }[] = [];
    for (const category of catalog.categories) {
      const ids = state.selections[category.id];
      if (!ids || ids.length === 0) continue;
      const entries = ids
        .map((id) => {
          const entry = category.entries.find((item) => item.id === id);
          return entry ? { id, label: entry.label[locale] } : undefined;
        })
        .filter((entry): entry is { id: string; label: string } => Boolean(entry));
      result.push({ categoryId: category.id, title: category.name[locale], entries });
    }
    return result;
  }, [catalog.categories, state.selections, locale]);

  const total = groups.reduce((sum, group) => sum + group.entries.length, 0);

  return (
    <section className="panel summary-panel" aria-labelledby="summary-title">
      <header className="panel-header">
        <h2 id="summary-title">{t('summary.title')}</h2>
        <span className="pill subtle">
          {t('summary.total', { count: total, categories: groups.length })}
        </span>
      </header>

      {groups.length === 0 ? (
        <p className="empty">{t('summary.empty')}</p>
      ) : (
        <div className="summary-groups">
          {groups.map((group) => (
            <div key={group.categoryId} className="summary-group">
              <h3>{group.title}</h3>
              <ul className="summary-list">
                {group.entries.map((entry) => (
                  <li key={entry.id}>
                    <span>{entry.label}</span>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`${t('summary.remove')}: ${entry.label}`}
                      onClick={() =>
                        dispatch({ type: 'toggle-entry', categoryId: group.categoryId, entryId: entry.id })
                      }
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
