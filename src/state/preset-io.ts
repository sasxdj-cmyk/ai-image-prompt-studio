/**
 * Preset import and export.
 *
 * The format is plain JSON so a preset file can be inspected, edited by hand
 * and shared. The import is defensive: a broken file never destroys the
 * existing presets.
 */
import type { Preset } from './persistence';

export const PRESET_EXPORT_KIND = 'preset-export';
export const PRESET_EXPORT_VERSION = 1;

export interface PresetExport {
  kind: typeof PRESET_EXPORT_KIND;
  version: number;
  exportedAt: string;
  presets: Preset[];
}

/** Build the export payload. */
export function buildPresetExport(presets: Preset[], now = new Date()): PresetExport {
  return {
    kind: PRESET_EXPORT_KIND,
    version: PRESET_EXPORT_VERSION,
    exportedAt: now.toISOString(),
    presets,
  };
}

/** Serialise the presets. */
export function serializePresets(presets: Preset[], now = new Date()): string {
  return JSON.stringify(buildPresetExport(presets, now), null, 2);
}

/**
 * Parse a preset file.
 *
 * @returns the imported presets, or the reason why the file was refused.
 */
export function parsePresetImport(raw: string): { presets?: Preset[]; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'The file is not valid JSON.' };
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { error: 'The file does not contain a preset export.' };
  }
  const candidate = parsed as Partial<PresetExport>;
  if (candidate.kind !== PRESET_EXPORT_KIND) {
    return { error: 'The file does not contain a preset export.' };
  }
  if (!Array.isArray(candidate.presets)) {
    return { error: 'The preset export contains no presets.' };
  }
  const presets: Preset[] = [];
  for (const item of candidate.presets) {
    if (typeof item !== 'object' || item === null) continue;
    if (typeof item.id !== 'string' || typeof item.name !== 'string') continue;
    const selections: Preset['selections'] = {};
    if (typeof item.selections === 'object' && item.selections !== null) {
      for (const [categoryId, ids] of Object.entries(item.selections)) {
        if (!Array.isArray(ids)) continue;
        const clean = ids.filter((id): id is string => typeof id === 'string');
        if (clean.length > 0) selections[categoryId] = clean;
      }
    }
    presets.push({
      id: item.id,
      name: item.name,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date(0).toISOString(),
      profileId: typeof item.profileId === 'string' ? item.profileId : 'general',
      selections,
    });
  }
  return { presets };
}
