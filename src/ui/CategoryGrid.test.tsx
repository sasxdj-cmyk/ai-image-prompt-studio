// @vitest-environment jsdom
/**
 * Component tests for the category navigation: the synthetic categories (the
 * eleven groups), their subcategories and the removable selection tags.
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

/** The synthetic category (group) buttons. */
function group(name: string) {
  return screen.getByRole('button', { name: new RegExp(`^${name}`) });
}

/** The subcategory chips of the open group. */
function subcategories() {
  return screen.getByRole('group', { name: 'Subcategories' });
}

/** Open a group, then one of its subcategories. */
function openCategory(groupName: string, categoryName: string) {
  fireEvent.click(group(groupName));
  fireEvent.click(within(subcategories()).getByRole('button', { name: categoryName }));
}

/** The panel of the active category. */
function panel(categoryName: string) {
  return screen.getByRole('region', { name: categoryName });
}

afterEach(() => {
  cleanup();
});

describe('synthetic categories', () => {
  it('shows the eleven groups as a grid of buttons', () => {
    renderApp();
    const grid = screen.getByRole('navigation', { name: 'Category browser' });
    expect(grid.className).toContain('group-grid');
    expect(grid.querySelectorAll('.group-button').length).toBe(11);
  });

  it('has no search field and no dropdown', () => {
    renderApp();
    expect(document.querySelector('.category-bar-search')).toBeNull();
    expect(document.querySelector('.cat-dropdown')).toBeNull();
  });

  it('does not render the old left column anymore', () => {
    const { container } = renderApp();
    expect(container.querySelector('.category-nav')).toBeNull();
  });

  it('highlights the open group', () => {
    renderApp();
    const active = document.querySelectorAll('.group-button.active');
    expect(active.length).toBe(1);

    fireEvent.click(group('Clothing'));
    expect(group('Clothing').className).toContain('active');
    expect(document.querySelectorAll('.group-button.active').length).toBe(1);
  });

  it('shows the subcategories of the open group', () => {
    renderApp();
    fireEvent.click(group('Clothing'));
    const chips = within(subcategories()).getAllByRole('button');
    expect(chips.map((chip) => chip.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Garments'),
        expect.stringContaining('Colour palette'),
      ]),
    );
  });

  it('changes the subcategories when another group is opened', () => {
    renderApp();
    fireEvent.click(group('Clothing'));
    expect(within(subcategories()).getByRole('button', { name: /Garments/ })).toBeTruthy();

    fireEvent.click(group('Shoes & footwear'));
    expect(within(subcategories()).getByRole('button', { name: /Shoe type/ })).toBeTruthy();
    expect(within(subcategories()).queryByRole('button', { name: /Garments/ })).toBeNull();
  });

  it('opens the options of a subcategory in the panel', () => {
    renderApp();
    openCategory('Subject & character', 'Editorial character');
    expect(within(panel('Editorial character')).getByRole('button', { name: 'Fashion editorial' })).toBeTruthy();
  });

  it('asks to pick a subcategory when none is open', () => {
    renderApp();
    expect(screen.getByText(/Pick a subcategory above/)).toBeTruthy();
  });

  it('adds a selection to the tags', () => {
    renderApp();
    openCategory('Subject & character', 'Editorial character');
    fireEvent.click(within(panel('Editorial character')).getByRole('button', { name: 'Fashion editorial' }));
    const tags = screen.getByRole('region', { name: 'Selections' });
    expect(tags.textContent).toContain('Fashion editorial');
  });

  it('counts the active options on the group and on the subcategory', () => {
    renderApp();
    openCategory('Subject & character', 'Editorial character');
    fireEvent.click(within(panel('Editorial character')).getByRole('button', { name: 'Fashion editorial' }));
    expect(within(subcategories()).getByRole('button', { name: /Editorial character/ }).textContent).toContain('1');
    expect(group('Subject & character').textContent).toContain('1');
  });
});

describe('selection tags', () => {
  it('lists only the selected options, each with a remove button', () => {
    renderApp();
    openCategory('Subject & character', 'Editorial character');
    fireEvent.click(within(panel('Editorial character')).getByRole('button', { name: 'Fashion editorial' }));

    const tags = screen.getByRole('region', { name: 'Selections' });
    const chips = within(tags).getAllByRole('button', { name: /Remove/ });
    expect(chips).toHaveLength(1);
    expect(tags.textContent).toContain('Fashion editorial');
  });

  it('removes a tag when the x is pressed', () => {
    renderApp();
    openCategory('Subject & character', 'Editorial character');
    fireEvent.click(within(panel('Editorial character')).getByRole('button', { name: 'Fashion editorial' }));

    const tags = screen.getByRole('region', { name: 'Selections' });
    fireEvent.click(within(tags).getByRole('button', { name: /Remove/ }));

    expect(
      within(screen.getByRole('region', { name: 'Selections' })).queryByRole('button', { name: /Remove/ }),
    ).toBeNull();
  });

  it('keeps the other selections when one tag is removed', () => {
    renderApp();
    openCategory('Subject & character', 'Editorial character');
    fireEvent.click(within(panel('Editorial character')).getByRole('button', { name: 'Fashion editorial' }));
    openCategory('Pose & composition', 'Body position');
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
