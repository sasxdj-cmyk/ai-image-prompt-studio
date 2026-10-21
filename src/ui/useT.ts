import { useCallback } from 'react';
import { translate } from '../i18n';
import { useApp } from '../state/AppProvider';

export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

/** Translation function bound to the current interface language. */
export function useT(): TranslateFn {
  const { state } = useApp();
  const locale = state.preferences.uiLocale;
  return useCallback(
    (key: string, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale],
  );
}
