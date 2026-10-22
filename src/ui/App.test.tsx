// @vitest-environment jsdom
/**
 * Component tests for the React layer.
 *
 * The engine is covered by the unit tests, the whole flow by the browser
 * end-to-end run. These tests close the gap in between: they verify that the
 * interface is actually wired to the engine, the storage and the clipboard.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App';
import { AppProvider } from '../state/AppProvider';
import { DONATION_URL } from '../donation';
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

function renderApp(storage = new MemoryStorage(), writer = vi.fn(async () => undefined)) {
  return {
    storage,
    writer,
    ...render(
      <AppProvider storage={storage} clipboardWriter={writer}>
        <App />
      </AppProvider>,
    ),
  };
}

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

describe('interface', () => {
  it('shows the bundled catalog on start-up', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: 'AI Image Prompt Studio' })).toBeTruthy();
    const footer = screen.getByText(/Catalog 1\.0\.0 loaded/);
    expect(footer.textContent).toContain('72 categories');
  });

  it('lists the categories and opens one on click', () => {
    renderApp();
    const category = screen.getByRole('button', { name: 'Editorial character' });
    fireEvent.click(category);
    expect(screen.getByRole('heading', { name: 'Editorial character' })).toBeTruthy();
  });

  it('adds a selection to the summary', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Editorial character' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fashion editorial' }));
    const summary = screen.getByRole('region', { name: 'Selections' });
    expect(summary.textContent).toContain('Fashion editorial');
  });
});

describe('generation', () => {
  it('fills the prompt with the selected fragments', async () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Editorial character' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fashion editorial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate prompt' }));

    const textarea = screen.getByRole('textbox', { name: 'Prompt' }) as HTMLTextAreaElement;
    await waitFor(() => expect(textarea.value).toBe('fashion editorial'));
  });

  it('joins several categories with commas in the catalog order', async () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Editorial character' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fashion editorial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Body position' }));
    fireEvent.click(screen.getByRole('button', { name: 'Walking' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate prompt' }));

    const textarea = screen.getByRole('textbox', { name: 'Prompt' }) as HTMLTextAreaElement;
    await waitFor(() => expect(textarea.value).toBe('fashion editorial, walking'));
  });

  it('keeps a single selection category to one value', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Editorial character' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fashion editorial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Streetwear' }));
    const summary = screen.getByRole('region', { name: 'Selections' });
    expect(summary.textContent).toContain('Streetwear');
    expect(summary.textContent).not.toContain('Fashion editorial');
  });
});

describe('manual editing', () => {
  it('marks the prompt as manually edited', async () => {
    renderApp();
    const textarea = screen.getByRole('textbox', { name: 'Prompt' });
    fireEvent.change(textarea, { target: { value: 'my own prompt' } });
    await waitFor(() => expect(screen.getByText('Manually edited')).toBeTruthy());
  });

  it('asks before replacing a manual prompt and can keep it', async () => {
    renderApp();
    const textarea = screen.getByRole('textbox', { name: 'Prompt' });
    fireEvent.change(textarea, { target: { value: 'my own prompt' } });
    await waitFor(() => expect(screen.getByText('Manually edited')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Generate prompt' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Replace the edited prompt?')).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep my text' }));
    await waitFor(() => expect((textarea as HTMLTextAreaElement).value).toBe('my own prompt'));
  });
});

describe('global actions', () => {
  it('asks for a confirmation before clearing everything', async () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Editorial character' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fashion editorial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate prompt' }));

    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear all' }));

    const textarea = screen.getByRole('textbox', { name: 'Prompt' }) as HTMLTextAreaElement;
    await waitFor(() => expect(textarea.value).toBe(''));
  });

  it('keeps the catalog and the settings when clearing', async () => {
    const { storage } = renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Editorial character' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fashion editorial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear all' }));

    await waitFor(() => expect(screen.getByText(/Catalog 1\.0\.0 loaded/)).toBeTruthy());
    expect(storage.getItem('aips.v1.catalog')).toBeNull();
  });

  it('copies the prompt with the injected clipboard writer', async () => {
    const writer = vi.fn(async () => undefined);
    renderApp(new MemoryStorage(), writer);
    fireEvent.click(screen.getByRole('button', { name: 'Editorial character' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fashion editorial' }));
    fireEvent.click(screen.getByRole('button', { name: 'Generate prompt' }));

    const textarea = screen.getByRole('textbox', { name: 'Prompt' }) as HTMLTextAreaElement;
    await waitFor(() => expect(textarea.value).toBe('fashion editorial'));

    fireEvent.click(screen.getByRole('button', { name: 'Copy prompt' }));
    await waitFor(() => expect(writer).toHaveBeenCalledWith('fashion editorial'));
  });
});

describe('donation', () => {
  it('links to the PayPal profile in a safe new tab', () => {
    renderApp();
    const links = screen.getAllByRole('link', { name: /Donate/ });
    expect(links.length).toBeGreaterThanOrEqual(2);
    expect(DONATION_URL).toBe('https://paypal.me/SalvaCucca');
    for (const link of links) {
      expect(link.getAttribute('href')).toBe(DONATION_URL);
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }
  });

  it('translates the donation label', async () => {
    renderApp();
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0]!, { target: { value: 'it' } });
    await waitFor(() => expect(screen.getAllByRole('link', { name: /Dona/ }).length).toBeGreaterThan(0));
  });
});

describe('language and profile', () => {
  it('translates the interface and keeps the selections', async () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Editorial character' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fashion editorial' }));

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0]!, { target: { value: 'it' } });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Genera prompt' })).toBeTruthy());
    const summary = screen.getByRole('region', { name: 'Selezioni' });
    expect(summary.textContent).toContain('Editoriale di moda');
  });

  it('keeps the selections when the model profile changes', async () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Editorial character' }));
    fireEvent.click(screen.getByRole('button', { name: 'Fashion editorial' }));

    const selects = screen.getAllByRole('combobox');
    const profileSelect = selects[2] as HTMLSelectElement;
    fireEvent.change(profileSelect, { target: { value: 'flux2' } });

    await waitFor(() => expect(profileSelect.value).toBe('flux2'));
    const summary = screen.getByRole('region', { name: 'Selections' });
    expect(summary.textContent).toContain('Fashion editorial');
  });
});
