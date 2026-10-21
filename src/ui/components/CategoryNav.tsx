import { useEffect, useMemo, useState } from 'react';
import type { CatalogGroupId, CategoryDef } from '../../catalog/types';
import { useApp } from '../../state/AppProvider';
import { useT } from '../useT';

interface CategoryNavProps {
  categories: CategoryDef[];
}

/** Left column: search, group filter and the list of categories. */
export function CategoryNav({ categories }: CategoryNavProps) {
  const { state, dispatch, catalog } = useApp();
  const t = useT();
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<CatalogGroupId | 'all'>('all');

  const groups = useMemo(() => {
    const map = new Map<CatalogGroupId, { id: CatalogGroupId; name: string; count: number }>();
    for (const category of categories) {
      const existing = map.get(category.group);
      if (existing) existing.count += 1;
      else map.set(category.group, { id: category.group, name: category.group, count: 1 });
    }
    return [...map.values()];
  }, [categories]);

  const groupNames = useMemo(() => {
    const map = new Map<CatalogGroupId, string>();
    const locale = state.preferences.uiLocale;
    for (const catalogGroup of catalog.groups ?? []) {
      map.set(catalogGroup.id, catalogGroup.name[locale]);
    }
    return map;
  }, [catalog.groups, state.preferences.uiLocale]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return categories.filter((category) => {
      if (group !== 'all' && category.group !== group) return false;
      if (!needle) return true;
      const locale = state.preferences.uiLocale;
      return (
        category.name[locale].toLowerCase().includes(needle) ||
        category.name.en.toLowerCase().includes(needle) ||
        category.id.includes(needle)
      );
    });
  }, [categories, group, search, state.preferences.uiLocale]);

  // focusing the first match keeps the panel in sync with the filter
  useEffect(() => {
    const first = filtered[0];
    if (first && !filtered.some((category) => category.id === state.ui.activeCategoryId)) {
      dispatch({ type: 'set-active-category', categoryId: first.id });
    }
  }, [filtered, state.ui.activeCategoryId, dispatch]);

  const selectedCount = (categoryId: string) => state.selections[categoryId]?.length ?? 0;

  return (
    <nav className="category-nav" aria-label={t('panel.categories')}>
      <div className="nav-search">
        <label className="sr-only" htmlFor="category-search">
          {t('search.placeholder')}
        </label>
        <input
          id="category-search"
          type="search"
          value={search}
          placeholder={t('search.placeholder')}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="nav-filters" role="group" aria-label={t('panel.groupFilter')}>
        <button
          type="button"
          className={group === 'all' ? 'chip active' : 'chip'}
          onClick={() => setGroup('all')}
        >
          {t('panel.allCategories')}
        </button>
        {groups.map((item) => (
          <button
            key={item.id}
            type="button"
            className={group === item.id ? 'chip active' : 'chip'}
            onClick={() => setGroup(item.id)}
          >
            {groupNames.get(item.id) ?? item.id}
          </button>
        ))}
      </div>

      <p className="nav-count">{t('panel.resultCount', { count: filtered.length })}</p>

      <ul className="category-list">
        {filtered.map((category) => {
          const count = selectedCount(category.id);
          const active = state.ui.activeCategoryId === category.id;
          return (
            <li key={category.id}>
              <button
                type="button"
                className={active ? 'category-link active' : 'category-link'}
                aria-current={active ? 'true' : undefined}
                onClick={() => dispatch({ type: 'set-active-category', categoryId: category.id })}
              >
                <span className="category-name">
                  {category.name[state.preferences.uiLocale]}
                </span>
                {count > 0 && <span className="badge">{count}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
