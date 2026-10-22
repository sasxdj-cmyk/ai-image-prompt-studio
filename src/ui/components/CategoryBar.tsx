import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CategoryDef } from '../../catalog/types';
import { groupEntries } from '../../catalog/validate';
import { useApp } from '../../state/AppProvider';
import { useT } from '../useT';

interface CategoryBarProps {
  categories: CategoryDef[];
}

/**
 * Horizontal category bar, built like the favourites bar of a browser:
 * every category is a tab, hovering opens a dropdown with its options.
 */
export function CategoryBar({ categories }: CategoryBarProps) {
  const { state, dispatch } = useApp();
  const t = useT();
  const locale = state.preferences.uiLocale;
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  /** How the current dropdown was opened: by hover, by click or by keyboard. */
  const openedBy = useRef<'hover' | 'click' | 'focus' | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const anchors = useRef(new Map<string, HTMLButtonElement>());
  /** Position of the dropdown, relative to the bar. */
  const [dropdownPos, setDropdownPos] = useState<{ left: number; top: number } | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const open = useCallback(
    (id: string, source: 'hover' | 'click' | 'focus' = 'click') => {
      cancelClose();
      openedBy.current = source;
      setOpenId(id);
    },
    [cancelClose],
  );

  const close = useCallback(() => {
    openedBy.current = null;
    setOpenId(null);
    setDropdownPos(null);
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => close(), 180);
  }, [cancelClose, close]);

  useEffect(() => cancelClose, [cancelClose]);

  // position the dropdown under its tab, relative to the bar
  const position = useCallback(
    (id: string) => {
      const anchor = anchors.current.get(id);
      const bar = barRef.current;
      if (!anchor || !bar) return false;
      const anchorRect = anchor.getBoundingClientRect();
      const barRect = bar.getBoundingClientRect();
      if (anchorRect.bottom < 0 || anchorRect.top > window.innerHeight) return false;
      setDropdownPos({
        left: Math.max(0, Math.min(anchorRect.left - barRect.left, barRect.width - 320)),
        top: barRect.height,
      });
      return true;
    },
    [],
  );

  useEffect(() => {
    if (!openId) return;
    position(openId);
  }, [openId, position]);

  // follow the tab when the bar is scrolled
  useEffect(() => {
    if (!openId) return;
    const onScroll = () => {
      if (!position(openId)) close();
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [openId, position, close]);

  // close when clicking outside the bar
  useEffect(() => {
    if (!openId) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (barRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [openId, close]);

  // close with Escape
  useEffect(() => {
    if (!openId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openId, close]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return categories;
    return categories.filter(
      (category) =>
        category.name[locale].toLowerCase().includes(needle) ||
        category.name.en.toLowerCase().includes(needle) ||
        category.id.includes(needle),
    );
  }, [categories, search, locale]);

  const selectCategory = (categoryId: string) => {
    dispatch({ type: 'set-active-category', categoryId });
  };

  const openCategory = openId ? categories.find((category) => category.id === openId) : undefined;

  return (
    <div className="category-bar" ref={barRef}>
      <div className="category-bar-search">
        <label className="sr-only" htmlFor="category-bar-search">
          {t('category.search')}
        </label>
        <input
          id="category-bar-search"
          type="search"
          value={search}
          placeholder={t('category.search')}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <ul className="category-bar-list">
        {visible.map((category) => {
          const count = state.selections[category.id]?.length ?? 0;
          const isActive = state.ui.activeCategoryId === category.id;
          const isOpen = openId === category.id;
          return (
            <li
              key={category.id}
              className="bar-item"
              onMouseEnter={() => open(category.id, 'hover')}
              onMouseLeave={scheduleClose}
            >
              <button
                ref={(element) => {
                  if (element) anchors.current.set(category.id, element);
                  else anchors.current.delete(category.id);
                }}
                type="button"
                className={isActive ? 'category-tab active' : 'category-tab'}
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-current={isActive ? 'true' : undefined}
                onClick={() => {
                  selectCategory(category.id);
                  // a click on an already opened dropdown closes it, but a click
                  // on a dropdown that the hover just opened keeps it open
                  if (isOpen && openedBy.current === 'click') close();
                  else open(category.id, 'click');
                }}
                onFocus={() => open(category.id, 'focus')}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                    selectCategory(category.id);
                    open(category.id, 'click');
                  }
                }}
              >
                {category.name[locale]}
                {count > 0 && <span className="badge">{count}</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {visible.length === 0 && <p className="empty category-bar-empty">{t('search.noResults')}</p>}

      {openCategory && dropdownPos && (
        <CategoryDropdown
          category={openCategory}
          position={dropdownPos}
          onKeepOpen={cancelClose}
          onClose={close}
          onOpenInPanel={() => {
            selectCategory(openCategory.id);
            close();
          }}
        />
      )}
    </div>
  );
}

interface CategoryDropdownProps {
  category: CategoryDef;
  position: { left: number; top: number };
  onKeepOpen: () => void;
  onClose: () => void;
  onOpenInPanel: () => void;
}

/** The dropdown of one category: its options, grouped by subgroup. */
function CategoryDropdown({
  category,
  position,
  onKeepOpen,
  onClose,
  onOpenInPanel,
}: CategoryDropdownProps) {
  const { state, dispatch } = useApp();
  const t = useT();
  const locale = state.preferences.uiLocale;
  const groups = useMemo(() => groupEntries(category), [category]);
  const selected = state.selections[category.id] ?? [];
  const limit = category.maxSelections;
  const isSingle = category.control === 'single';

  const toggle = (entryId: string) => {
    if (isSingle) dispatch({ type: 'set-single', categoryId: category.id, entryId });
    else dispatch({ type: 'toggle-entry', categoryId: category.id, entryId });
  };

  return (
    <div
      className="cat-dropdown"
      role="group"
      aria-label={category.name[locale]}
      style={{ left: position.left, top: position.top }}
      onMouseEnter={onKeepOpen}
      onMouseLeave={onClose}
    >
      <div className="cat-dropdown-head">
        <strong>{category.name[locale]}</strong>
        <p>{category.description[locale]}</p>
      </div>

      <div className="cat-dropdown-body">
        {groups.map((group) => {
          const subgroupName = category.subgroups?.find((sub) => sub.id === group.subgroup)?.name[locale];
          return (
            <div className="dd-group" key={group.subgroup ?? 'default'}>
              {subgroupName && <h4>{subgroupName}</h4>}
              <div className="dd-options">
                {group.entries.map((entry) => {
                  const active = selected.includes(entry.id);
                  const atLimit =
                    !isSingle && limit !== undefined && selected.length >= limit && !active;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className={active ? 'dd-option active' : 'dd-option'}
                      aria-pressed={active}
                      disabled={atLimit}
                      onClick={() => toggle(entry.id)}
                    >
                      {entry.label[locale]}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" className="cat-dropdown-more" onClick={onOpenInPanel}>
        {t('category.openFull')}
      </button>
    </div>
  );
}
