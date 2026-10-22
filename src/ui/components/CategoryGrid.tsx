import { useMemo } from 'react';
import type { CategoryDef } from '../../catalog/types';
import { useApp } from '../../state/AppProvider';
import { useT } from '../useT';

interface CategoryGridProps {
  categories: CategoryDef[];
}

/**
 * The synthetic categories: the eleven groups of the catalog.
 *
 * Clicking a group reveals its categories underneath, and clicking one of
 * those opens its options in the main panel.
 */
export function CategoryGrid({ categories }: CategoryGridProps) {
  const { state, dispatch, catalog } = useApp();
  const t = useT();
  const locale = state.preferences.uiLocale;

  const groups = useMemo(
    () => [...catalog.groups].sort((a, b) => a.order - b.order),
    [catalog.groups],
  );

  const byGroup = useMemo(() => {
    const map = new Map<string, CategoryDef[]>();
    for (const category of categories) {
      const list = map.get(category.group) ?? [];
      list.push(category);
      map.set(category.group, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    }
    return map;
  }, [categories]);

  const activeGroup = groups.find((group) => group.id === state.ui.activeGroupId);
  const activeCategories = activeGroup ? byGroup.get(activeGroup.id) ?? [] : [];

  const countIn = (list: CategoryDef[]) =>
    list.reduce(
      (sum, category) => sum + (state.selections[category.id]?.length ?? 0),
      0,
    );

  return (
    <div className="category-grid-wrap">
      <nav className="group-grid" aria-label={t('panel.categories')}>
        {groups.map((group) => {
          const list = byGroup.get(group.id) ?? [];
          const selected = countIn(list);
          const isActive = state.ui.activeGroupId === group.id;
          return (
            <button
              key={group.id}
              type="button"
              className={isActive ? 'group-button active' : 'group-button'}
              aria-current={isActive ? 'true' : undefined}
              onClick={() => dispatch({ type: 'set-active-group', groupId: group.id })}
            >
              <span className="group-button-name">{group.name[locale]}</span>
              <span className="group-button-meta">
                {t('category.subcategoryCount', { count: list.length })}
                {selected > 0 && <span className="badge">{selected}</span>}
              </span>
            </button>
          );
        })}
      </nav>

      {activeGroup && activeCategories.length > 0 && (
        <div className="subgroup-bar" role="group" aria-label={t('category.subcategories')}>
          {activeCategories.map((category) => {
            const isActive = state.ui.activeCategoryId === category.id;
            const selected = state.selections[category.id]?.length ?? 0;
            return (
              <button
                key={category.id}
                type="button"
                className={isActive ? 'subgroup-chip active' : 'subgroup-chip'}
                aria-pressed={isActive}
                title={category.description[locale]}
                onClick={() =>
                  dispatch({
                    type: 'set-active-category',
                    categoryId: category.id,
                    groupId: activeGroup.id,
                  })
                }
              >
                {category.name[locale]}
                {selected > 0 && <span className="badge">{selected}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
