import { describe, expect, it } from 'vitest';
import { DICTIONARIES, detectLocale, interpolate, missingKeys, translate } from './index';
import { en } from './en';
import { it as italian } from './it';

/**
 * The raw source of every application file, so the keys used in the code can
 * be checked against the dictionary.
 */
const SOURCES = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function collectSources(): string[] {
  return Object.entries(SOURCES)
    .filter(([path]) => !path.includes('.test.') && !path.includes('/data/'))
    .map(([, content]) => content);
}

describe('i18n', () => {
  it('translates a known key', () => {
    expect(translate('en', 'action.generate')).toBe('Generate prompt');
    expect(translate('it', 'action.generate')).toBe('Genera prompt');
  });

  it('falls back to English for a missing key', () => {
    expect(translate('it', 'does.not.exist')).toBe('does.not.exist');
  });

  it('has no missing translation between English and Italian', () => {
    expect(missingKeys('en', 'it')).toEqual([]);
  });

  it('defines the same keys in every dictionary', () => {
    const reference = Object.keys(en).sort();
    for (const [locale, dictionary] of Object.entries(DICTIONARIES)) {
      expect(Object.keys(dictionary).sort(), locale).toEqual(reference);
    }
  });

  it('has no empty string in the dictionaries', () => {
    for (const [locale, dictionary] of Object.entries(DICTIONARIES)) {
      for (const [key, value] of Object.entries(dictionary)) {
        expect(value.trim().length, `${locale}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('interpolates parameters', () => {
    expect(interpolate('Hello {name}', { name: 'World' })).toBe('Hello World');
    expect(interpolate('Hello {name}', {})).toBe('Hello {name}');
  });

  it('interpolates inside a translated string', () => {
    expect(translate('en', 'summary.total', { count: 3, categories: 2 })).toContain('3');
  });

  it('detects the browser language', () => {
    expect(detectLocale(['it-IT', 'en-US'])).toBe('it');
    expect(detectLocale(['en-GB'])).toBe('en');
    expect(detectLocale(['fr-FR'])).toBe('en');
  });

  it('keeps the Italian dictionary aligned with the reference', () => {
    expect(Object.keys(italian).length).toBe(Object.keys(en).length);
  });

  it('has a translation for every key used in the code', () => {
    const known = new Set(Object.keys(en));
    const missing: string[] = [];
    for (const content of collectSources()) {
      for (const match of content.matchAll(/\bt\(\s*'([a-z0-9._-]+)'/gi)) {
        const key = match[1];
        if (key && !known.has(key)) missing.push(key);
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });
});
