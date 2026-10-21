import { useMemo } from 'react';
import type { CatalogDocument, PromptWarning, WarningCode } from '../../catalog/types';
import { buildPrompt } from '../../engine/prompt';
import { getGeneralProfile, getProfile } from '../../models/profiles';
import { useApp } from '../../state/AppProvider';
import { useT, type TranslateFn } from '../useT';

/** List of conflicts, redundancies and other checks. */
export function WarningsPanel() {
  const { state, catalog } = useApp();
  const t = useT();
  const locale = state.preferences.uiLocale;

  const warnings = useMemo(() => {
    const profile = getProfile(state.preferences.profileId) ?? getGeneralProfile();
    const result = buildPrompt({
      catalog,
      selections: state.selections,
      profile,
      promptLocale: state.preferences.promptLocale,
    });
    return result.warnings.filter((warning) => warning.code !== 'empty');
  }, [catalog, state.selections, state.preferences.profileId, state.preferences.promptLocale]);

  return (
    <section className="panel warnings-panel" aria-labelledby="warnings-title">
      <header className="panel-header">
        <h2 id="warnings-title">{t('warnings.title')}</h2>
        {warnings.length > 0 && <span className="pill warn">{warnings.length}</span>}
      </header>
      {warnings.length === 0 ? (
        <p className="empty">{t('warnings.none')}</p>
      ) : (
        <ul className="warning-list">
          {warnings.map((warning, index) => (
            <li key={`${warning.code}-${index}`} className={`warning ${warning.code}`}>
              <span className="warning-tag">{warningTitle(warning.code, t)}</span>
              <span className="warning-message">{describeWarning(warning, catalog, locale, t)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function warningTitle(code: WarningCode, t: TranslateFn): string {
  const map: Record<string, string> = {
    conflict: 'warnings.conflict',
    'soft-conflict': 'warnings.softConflict',
    duplicate: 'warnings.duplicate',
    synonym: 'warnings.synonym',
    'missing-requirement': 'warnings.missingRequirement',
    'max-selections': 'warnings.maxSelections',
    'unknown-entry': 'warnings.unknownEntry',
    'negative-unsupported': 'warnings.negativeUnsupported',
    'incompatible-category': 'warnings.incompatibleCategory',
  };
  const key = map[code];
  return key ? t(key) : code;
}

function entryLabel(catalog: CatalogDocument, entryId: string, locale: 'en' | 'it'): string {
  for (const category of catalog.categories) {
    const entry = category.entries.find((item) => item.id === entryId);
    if (entry) return entry.label[locale];
  }
  return entryId;
}

function describeWarning(
  warning: PromptWarning,
  catalog: CatalogDocument,
  locale: 'en' | 'it',
  t: TranslateFn,
): string {
  const names = warning.entryIds.map((id) => entryLabel(catalog, id, locale));
  switch (warning.code) {
    case 'conflict':
      return t('warning.detail.conflict', { a: names[0] ?? '', b: names[1] ?? '' });
    case 'soft-conflict':
      return t('warning.detail.soft-conflict', { a: names[0] ?? '', b: names[1] ?? '' });
    case 'duplicate':
      return t('warning.detail.duplicate', { name: names[0] ?? '' });
    case 'synonym':
      return t('warning.detail.synonym', { a: names[0] ?? '', b: names[1] ?? '' });
    case 'missing-requirement':
      return t('warning.detail.missing-requirement', { name: names[0] ?? '', needs: names.slice(1).join(', ') });
    case 'max-selections':
      return t('warning.detail.max-selections', { count: names.length });
    case 'unknown-entry':
      return t('warning.detail.unknown-entry', { count: names.length });
    case 'negative-unsupported':
      return warning.message;
    default:
      return warning.message;
  }
}
