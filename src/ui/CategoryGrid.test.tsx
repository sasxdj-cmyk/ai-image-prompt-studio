// @vitest-environment jsdom
/**
 * Component tests for the category grid: a grid of buttons, one per
 * category, and the removable selection tags.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { App } from './App';
import { AppProvider } from '../state/AppProvider';
import type { KeyValueStorage } from '../state/persistence';

class MemoryStorage implements KeyValueStorage {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

function renderApp() {
  return render(
    <AppProvider storage={new MemoryStorage()} clipboardWriter={vi.fn(async () => undefined)}>
      <App />
    </AppProvider>,
  );
}

/** The panel of the active category, where the options are listed. */
function panel(categoryName: string) {
  return screen.getByRole('region', { name: categoryName });
}

afterEach(() => {
  cleanup();
});

describe('category grid', () => {
  it('shows every category as a button in a grid', () => {
    renderApp();
    const grid = screen.getByRole('navigation', { name: 'Category browser' });
    expect(grid.className).toContain('category-grid');
    expect(grid.querySelectorAll('.grid-button').length).toBe(72);
  });

  it('has no search field and no dropdown', () => {
    renderApp();
    expect(document.querySelector('.category-bar-search')).toBeNull();
    expect(document.querySelector('.cat-dropdown')).toBeNull();
    expect(screen.queryByPlaceholderText('Find a category')).toBeNull();
  });

  it('does not render the old left column anymore', () => {
    const { container } = renderApp();
    expect(container.querySelector('.category-nav')).toBeNull();
  });

  it('highlights the selected category', () => {
    renderApp();
    const active = document.querySelectorAll('.grid-button.active');
    expect(active.length).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Body position' }));
    expect(screen.getByRole('button', { name: 'Body position' }).className).toContain('active');
    expect(
      document.querySelectorAll('.grid-button.active').length,
    ).toBe(1);
  });

  it('opens the options of the clicked category in the panel', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Editorial character' }));
    expect(within(panel('Editorial character')).getByRole('button', { name: 'Fashion editorial' })).toBeTruthy();
  });

  it('adds a selection to the tags', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Editorial character' }));
    fireEvent.click(within(panel('Editorial character')).getByRole('button', { name: 'Fashion editorial' }));
    const tags = screen.getByRole('region', { name: 'Selections' });
    expect(tags.textContent).toContain('Fashion editorial');
  });

  it('shows how many options are selected on the button', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Editorial character' }));
    fireEvent.click(within(panel('Editorial character')).getByRole('button', { name: 'Fashion editorial' }));
    const button = screen.getByRole('button', { name: /Editorial character/ });
    expect(button.textContent).toContain('1');
  });
});

describe('subcategories', () => {
  it('shows the subcategories of the active category', () => {
    renderApp();
    expect(screen.queryByRole('group', { name: 'Subcategories' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^Garments/ }));
    const bar = screen.getByRole('group', { name: 'Subcategories' });
    expect(within(bar).getByRole('button', { name: 'Outerwear & coats' })).toBeTruthy();
    expect(within(bar).getByRole('button', { name: 'All options' })).toBeTruthy();
  });

  it('does not show subcategories for a category without them', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /^Editorial character/ }));
    expect(screen.queryByRole('group', { name: 'Subcategories' })).toBeNull();
  });

  it('filters the options of the panel to the selected subcategory', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /^Garments/ }));
    const bar = screen.getByRole('group', { name: 'Subcategories' });
    fireEvent.click(within(bar).getByRole('button', { name: 'Outerwear & coats' }));

    const panel = screen.getByRole('region', { name: 'Garments' });
    expect(within(panel).getByRole('button', { name: 'Trench coat' })).toBeTruthy();
    expect(within(panel).queryByRole('button', { name: 'White poplin shirt' })).toBeNull();
  });

  it('goes back to all the options when the subcategory is clicked again', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /^Garments/ }));
    const bar = screen.getByRole('group', { name: 'Subcategories' });
    fireEvent.click(within(bar).getByRole('button', { name: 'Outerwear & coats' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Subcategories' })).getByRole('button', { name: 'Outerwear & coats' }));

    const panel = screen.getByRole('region', { name: 'Garments' });
    expect(within(panel).getByRole('button', { name: 'White poplin shirt' })).toBeTruthy();
  });

  it('resets the subcategory when another category is activated', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /^Garments/ }));
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Subcategories' })).getByRole('button', { name: 'Outerwear & coats' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /^Editorial character/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Garments/ }));

    const panel = screen.getByRole('region', { name: 'Garments' });
    expect(within(panel).getByRole('button', { name: 'White poplin shirt' })).toBeTruthy();
  });
});

describe('selection tags', () => {
  it('lists only the selected options, each with a remove button', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Editorial character' }));
    fireEvent.click(within(panel('Editorial character')).getByRole('button', { name: 'Fashion editorial' }));

    const tags = screen.getByRole('region', { name: 'Selections' });
    const chips = within(tags).getAllByRole('button', { name: /Remove/ });
    expect(chips).toHaveLength(1);
    expect(tags.textContent).toContain('Fashion editorial');
  });

  it('removes a tag when the x is pressed', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Editorial character' }));
    fireEvent.click(within(panel('Editorial character')).getByRole('button', { name: 'Fashion editorial' }));

    const tags = screen.getByRole('region', { name: 'Selections' });
    fireEvent.click(within(tags).getByRole('button', { name: /Remove/ }));

    expect(
      within(screen.getByRole('region', { name: 'Selections' })).queryByRole('button', { name: /Remove/ }),
    ).toBeNull();
  });

  it('keeps the other selections when one tag is removed', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Editorial character' }));
    fireEvent.click(within(panel('Editorial character')).getByRole('button', { name: 'Fashion editorial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Body position' }));
    fireEvent.click(within(panel('Body position')).getByRole('button', { name: 'Walking' }));

    const tags = screen.getByRole('region', { name: 'Selections' });
    expect(tags.textContent).toContain('Fashion editorial');
    expect(tags.textContent).toContain('Walking');

    fireEvent.click(within(tags).getAllByRole('button', { name: /Remove/ })[0]!);
    const after = screen.getByRole('region', { name: 'Selections' });
    expect(after.textContent).not.toContain('Fashion editorial');
    expect(after.textContent).toContain('Walking');
  });
});
