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
 * Clicking a button selects the category: its options are then shown in the
 * main panel. There is no search and no dropdown, the grid is the whole
 * navigation.
 */
export function CategoryGrid({ categories }: CategoryGridProps) {
  const { state, dispatch } = useApp();
  const t = useT();
  const locale = state.preferences.uiLocale;

  const ordered = useMemo(
    () => [...categories].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
    [categories],
  );

  return (
    <nav className="category-grid-wrap" aria-label={t('panel.categories')}>
      <ul className="category-grid">
        {ordered.map((category) => {
          const count = state.selections[category.id]?.length ?? 0;
          const isActive = state.ui.activeCategoryId === category.id;
          return (
            <li key={category.id}>
              <button
                type="button"
                className={isActive ? 'grid-button active' : 'grid-button'}
                aria-current={isActive ? 'true' : undefined}
                title={`${category.name[locale]} — ${category.description[locale]}`}
                onClick={() => dispatch({ type: 'set-active-category', categoryId: category.id })}
              >
                <span className="grid-button-label">{category.name[locale]}</span>
                {count > 0 && <span className="badge">{count}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
