import { useMemo } from 'react';
import type { CategoryDef } from '../../catalog/types';
import { useApp } from '../../state/AppProvider';
import { useT } from '../useT';

interface CategoryGridProps {
  categories: CategoryDef[];
}

/**
 * The categories as a grid of buttons.
 *
 * Clicking a button activates the category: its subgroups appear right below
 * the grid and can be selected one by one. The active category is highlighted
 * and shows how many options are active.
 */
export function CategoryGrid({ categories }: CategoryGridProps) {
  const { state, dispatch } = useApp();
  const t = useT();
  const locale = state.preferences.uiLocale;

  const ordered = useMemo(
    () => [...categories].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
    [categories],
  );

  const active = useMemo(
    () => ordered.find((category) => category.id === state.ui.activeCategoryId),
    [ordered, state.ui.activeCategoryId],
  );

  return (
    <div className="category-grid-wrap">
      <nav className="category-grid" aria-label={t('panel.categories')}>
        {ordered.map((category) => {
          const count = state.selections[category.id]?.length ?? 0;
          const isActive = state.ui.activeCategoryId === category.id;
          return (
            <button
              key={category.id}
              type="button"
              className={isActive ? 'grid-button active' : 'grid-button'}
              aria-current={isActive ? 'true' : undefined}
              title={`${category.name[locale]} — ${category.description[locale]}`}
              onClick={() => dispatch({ type: 'set-active-category', categoryId: category.id })}
            >
              <span className="grid-button-label">{category.name[locale]}</span>
              {count > 0 && <span className="badge">{count}</span>}
            </button>
          );
        })}
      </nav>

      {active && active.subgroups && active.subgroups.length > 0 && (
        <div className="subgroup-bar" role="group" aria-label={t('category.subgroups')}>
          <button
            type="button"
            className={state.ui.activeSubgroupId === null ? 'subgroup-chip active' : 'subgroup-chip'}
            aria-pressed={state.ui.activeSubgroupId === null}
            onClick={() =>
              dispatch({ type: 'set-active-subgroup', categoryId: active.id, subgroupId: null })
            }
          >
            {t('category.allSubgroups')}
          </button>
          {active.subgroups.map((subgroup) => {
            const isActive = state.ui.activeSubgroupId === subgroup.id;
            const count = active.entries.filter((entry) => entry.group === subgroup.id).length;
            const selected = (state.selections[active.id] ?? []).filter((id) =>
              active.entries.some((entry) => entry.id === id && entry.group === subgroup.id),
            ).length;
            return (
              <button
                key={subgroup.id}
                type="button"
                className={isActive ? 'subgroup-chip active' : 'subgroup-chip'}
                aria-pressed={isActive}
                title={`${count} option(s)`}
                onClick={() =>
                  dispatch({
                    type: 'set-active-subgroup',
                    categoryId: active.id,
                    subgroupId: isActive ? null : subgroup.id,
                  })
                }
              >
                {subgroup.name[locale]}
                {selected > 0 && <span className="badge">{selected}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
