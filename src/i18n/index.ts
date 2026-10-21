/**
 * Internationalisation.
 *
 * The interface language and the prompt language are two independent
 * settings: the interface can be Italian while the generated prompt stays
 * in English.
 */
import type { Locale } from '../catalog/types';
import { en, type Dictionary } from './en';
import { it } from './it';

export type { TranslationKey } from './en';

export const DICTIONARIES: Record<Locale, Dictionary> = { en, it };

export const UI_LOCALES: { id: Locale; label: string; short: string }[] = [
  { id: 'en', label: 'English', short: 'EN' },
  { id: 'it', label: 'Italiano', short: 'IT' },
];

export const DEFAULT_UI_LOCALE: Locale = 'en';

/** Replace `{name}` placeholders. */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

/** Translate a key, falling back to English and then to the key itself. */
export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const dictionary = DICTIONARIES[locale] ?? DICTIONARIES.en;
  const template = dictionary[key] ?? DICTIONARIES.en[key] ?? key;
  return interpolate(template, params);
}

/** Keys present in the reference dictionary but missing in the target one. */
export function missingKeys(reference: Locale = 'en', target: Locale = 'it'): string[] {
  const source = DICTIONARIES[reference];
  const comparison = DICTIONARIES[target];
  const missing = Object.keys(source).filter((key) => !(key in comparison));
  const extra = Object.keys(comparison).filter((key) => !(key in source));
  return [...missing.map((key) => `${key} (missing)`), ...extra.map((key) => `${key} (unused)`)];
}

/** Best effort detection of the browser language. */
export function detectLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const code = language.slice(0, 2).toLowerCase();
    if (code === 'it') return 'it';
    if (code === 'en') return 'en';
  }
  return DEFAULT_UI_LOCALE;
}
