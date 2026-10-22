import { useMemo } from 'react';
import { useApp } from '../../state/AppProvider';
import { useT } from '../useT';

/**
 * The selected options, one tag each, with a button to remove it.
 * Only the options that are actually selected are listed.
 */
export function SummaryPanel() {
  const { state, dispatch, catalog } = useApp();
  const t = useT();
  const locale = state.preferences.uiLocale;

  const tags = useMemo(() => {
    const result: { id: string; label: string; category: string; categoryId: string }[] = [];
    for (const category of catalog.categories) {
      const ids = state.selections[category.id];
      if (!ids || ids.length === 0) continue;
      for (const id of ids) {
        const entry = category.entries.find((item) => item.id === id);
        if (entry) {
          result.push({
            id,
            label: entry.label[locale],
            category: category.name[locale],
            categoryId: category.id,
          });
        }
      }
    }
    return result;
  }, [catalog.categories, state.selections, locale]);

  return (
    <section className="panel summary-panel" aria-labelledby="summary-title">
      <header className="panel-header">
        <h2 id="summary-title">{t('summary.title')}</h2>
        <span className="pill subtle">{t('status.selectionCount', { count: tags.length })}</span>
      </header>

      {tags.length === 0 ? (
        <p className="empty">{t('summary.empty')}</p>
      ) : (
        <ul className="selection-tags">
          {tags.map((tag) => (
            <li key={tag.id}>
              <span className="tag" title={`${tag.category} — ${tag.label}`}>
                {tag.label}
                <button
                  type="button"
                  className="tag-remove"
                  aria-label={`${t('summary.remove')}: ${tag.label}`}
                  onClick={() =>
                    dispatch({
                      type: 'toggle-entry',
                      categoryId: tag.categoryId,
                      entryId: tag.id,
                    })
                  }
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
