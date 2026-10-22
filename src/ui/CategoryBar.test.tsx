// @vitest-environment jsdom
/**
 * Component tests for the category bar (the "favourites bar" of the app):
 * the tabs at the top, the dropdown that opens on hover and the removable
 * selection tags.
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

/** The dropdown of a category, opened by clicking its tab. */
function openDropdown(categoryName: string) {
  fireEvent.click(screen.getByRole('button', { name: categoryName }));
  return screen.getByRole('group', { name: categoryName });
}

afterEach(() => {
  cleanup();
});

describe('category bar', () => {
  it('shows the categories as a horizontal bar of tabs', () => {
    renderApp();
    const bar = screen.getByRole('button', { name: 'Editorial character' });
    expect(bar.className).toContain('category-tab');
    expect(bar.closest('.category-bar')).toBeTruthy();
  });

  it('does not render the old left column anymore', () => {
    const { container } = renderApp();
    expect(container.querySelector('.category-nav')).toBeNull();
  });

  it('highlights the selected category', () => {
    renderApp();
    // the first category of the catalog is selected on start-up
    const activeTabs = screen.getAllByRole('button', { name: /./ }).filter((element) =>
      element.className.includes('category-tab active'),
    );
    expect(activeTabs.length).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Body position' }));
    expect(screen.getByRole('button', { name: 'Body position' }).className).toContain('active');
    expect(
      screen.getAllByRole('button', { name: /./ }).filter((element) =>
        element.className.includes('category-tab active'),
      ).length,
    ).toBe(1);
  });

  it('opens a dropdown with the options of the category', () => {
    renderApp();
    const dropdown = openDropdown('Editorial character');
    expect(within(dropdown).getByRole('button', { name: 'Fashion editorial' })).toBeTruthy();
    expect(within(dropdown).getByRole('button', { name: 'Streetwear' })).toBeTruthy();
  });

  it('selects an option straight from the dropdown', () => {
    renderApp();
    const dropdown = openDropdown('Editorial character');
    fireEvent.click(within(dropdown).getByRole('button', { name: 'Fashion editorial' }));

    const tags = screen.getByRole('region', { name: 'Selections' });
    expect(tags.textContent).toContain('Fashion editorial');
  });

  it('marks the chosen option inside the dropdown', () => {
    renderApp();
    const dropdown = openDropdown('Editorial character');
    fireEvent.click(within(dropdown).getByRole('button', { name: 'Fashion editorial' }));
    const option = within(screen.getByRole('group', { name: 'Editorial character' })).getByRole('button', {
      name: 'Fashion editorial',
    });
    expect(option.getAttribute('aria-pressed')).toBe('true');
  });

  it('filters the categories with the search field', () => {
    renderApp();
    const search = screen.getByPlaceholderText('Find a category');
    fireEvent.change(search, { target: { value: 'shoe' } });
    expect(screen.getByRole('button', { name: 'Shoe type' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Editorial character' })).toBeNull();
  });

  it('shows how many options are selected on the tab', () => {
    renderApp();
    const dropdown = openDropdown('Editorial character');
    fireEvent.click(within(dropdown).getByRole('button', { name: 'Fashion editorial' }));
    const tab = screen.getByRole('button', { name: /Editorial character/ });
    expect(tab.textContent).toContain('1');
  });
});

describe('selection tags', () => {
  it('lists only the selected options, each with a remove button', () => {
    renderApp();
    const dropdown = openDropdown('Editorial character');
    fireEvent.click(within(dropdown).getByRole('button', { name: 'Fashion editorial' }));
    fireEvent.click(within(dropdown).getByRole('button', { name: 'Streetwear' }));

    const tags = screen.getByRole('region', { name: 'Selections' });
    // the category is single selection: the last choice replaces the first one
    const chips = within(tags).getAllByRole('button', { name: /Remove/ });
    expect(chips).toHaveLength(1);
    expect(tags.textContent).toContain('Streetwear');
    expect(tags.textContent).not.toContain('Fashion editorial');
  });

  it('removes a tag when the x is pressed', () => {
    renderApp();
    const dropdown = openDropdown('Editorial character');
    fireEvent.click(within(dropdown).getByRole('button', { name: 'Fashion editorial' }));

    const tags = screen.getByRole('region', { name: 'Selections' });
    fireEvent.click(within(tags).getByRole('button', { name: /Remove/ }));

    expect(within(screen.getByRole('region', { name: 'Selections' })).queryByRole('button', { name: /Remove/ })).toBeNull();
  });

  it('keeps the other selections when one tag is removed', () => {
    renderApp();
    const dropdown = openDropdown('Editorial character');
    fireEvent.click(within(dropdown).getByRole('button', { name: 'Fashion editorial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Body position' }));
    const bodyDropdown = screen.getByRole('group', { name: 'Body position' });
    fireEvent.click(within(bodyDropdown).getByRole('button', { name: 'Walking' }));

    const tags = screen.getByRole('region', { name: 'Selections' });
    expect(tags.textContent).toContain('Fashion editorial');
    expect(tags.textContent).toContain('Walking');

    fireEvent.click(within(tags).getAllByRole('button', { name: /Remove/ })[0]!);
    const after = screen.getByRole('region', { name: 'Selections' });
    expect(after.textContent).not.toContain('Fashion editorial');
    expect(after.textContent).toContain('Walking');
  });
});
