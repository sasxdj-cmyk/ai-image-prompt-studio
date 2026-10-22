import { useMemo, useState } from 'react';
import type { CatalogEntry, CategoryDef } from '../../catalog/types';
import { groupEntries } from '../../catalog/validate';
import { useApp } from '../../state/AppProvider';
import { useT } from '../useT';

interface CategoryPanelProps {
  category: CategoryDef;
}

/** Main area of the category browser: the options of one category. */
export function CategoryPanel({ category }: CategoryPanelProps) {
  const { state, dispatch } = useApp();
  const t = useT();
  const [search, setSearch] = useState('');
  const locale = state.preferences.uiLocale;

  const selected = useMemo(() => new Set(state.selections[category.id] ?? []), [state.selections, category.id]);

  /** Only the options of the active subgroup, when one is selected. */
  const scopedEntries = useMemo(
    () =>
      state.ui.activeSubgroupId
        ? category.entries.filter((entry) => entry.group === state.ui.activeSubgroupId)
        : category.entries,
    [category.entries, state.ui.activeSubgroupId],
  );

  const groups = useMemo(() => groupEntries({ ...category, entries: scopedEntries }), [category, scopedEntries]);

  const filterEntry = (entry: CatalogEntry): boolean => {
    const needle = search.trim().toLowerCase();
    if (!needle) return true;
    return (
      entry.label[locale].toLowerCase().includes(needle) ||
      entry.label.en.toLowerCase().includes(needle) ||
      entry.prompt[locale].toLowerCase().includes(needle) ||
      entry.prompt.en.toLowerCase().includes(needle) ||
      (entry.tags ?? []).some((tag) => tag.toLowerCase().includes(needle))
    );
  };

  const visibleGroups = groups
    .map((group) => ({ ...group, entries: group.entries.filter(filterEntry) }))
    .filter((group) => group.entries.length > 0);

  const totalVisible = visibleGroups.reduce((sum, group) => sum + group.entries.length, 0);
  const limit = category.maxSelections;
  const isSingle = category.control === 'single';

  const toggle = (entryId: string) => {
    if (isSingle) {
      dispatch({ type: 'set-single', categoryId: category.id, entryId });
      return;
    }
    dispatch({ type: 'toggle-entry', categoryId: category.id, entryId });
  };

  return (
    <section className="category-panel" aria-labelledby={`category-${category.id}`}>
      <header className="category-header">
        <div>
          <h2 id={`category-${category.id}`}>{category.name[locale]}</h2>
          <p className="category-description">{category.description[locale]}</p>
        </div>
        <div className="category-meta">
          <span className="pill">
            {t('category.selected', { count: selected.size })}
            {limit !== undefined && ` · ${t('category.limit', { max: limit })}`}
          </span>
          {selected.size > 0 && (
            <button
              type="button"
              className="btn ghost small"
              onClick={() => dispatch({ type: 'clear-category', categoryId: category.id })}
            >
              {t('category.clearCategory')}
            </button>
          )}
        </div>
      </header>

      <div className="category-search">
        <label className="sr-only" htmlFor="option-search">
          {t('search.placeholder')}
        </label>
        <input
          id="option-search"
          type="search"
          value={search}
          placeholder={t('search.placeholder')}
          onChange={(event) => setSearch(event.target.value)}
        />
        {search && (
          <span className="pill subtle">{t('search.results', { count: totalVisible })}</span>
        )}
      </div>

      {visibleGroups.length === 0 && <p className="empty">{t('search.noResults')}</p>}

      {visibleGroups.map((group) => {
        const subgroupName = category.subgroups?.find((sub) => sub.id === group.subgroup)?.name[locale];
        return (
          <div className="option-group" key={group.subgroup ?? 'default'}>
            {subgroupName && <h3 className="option-group-title">{subgroupName}</h3>}
            <div className={category.control === 'chips' || category.control === 'swatch' ? 'chip-grid' : 'option-grid'}>
              {group.entries.map((entry) => {
                const active = selected.has(entry.id);
                const atLimit = !isSingle && limit !== undefined && selected.size >= limit && !active;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    className={active ? `option active ${category.control}` : `option ${category.control}`}
                    aria-pressed={active}
                    disabled={atLimit}
                    title={entry.notes ? entry.notes[locale] : undefined}
                    onClick={() => toggle(entry.id)}
                  >
                    {entry.color && <span className="swatch" style={{ background: entry.color }} aria-hidden="true" />}
                    <span className="option-label">{entry.label[locale]}</span>
                    {entry.notes && <span className="option-note">{entry.notes[locale]}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
