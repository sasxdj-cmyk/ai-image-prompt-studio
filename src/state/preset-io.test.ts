import { describe, expect, it } from 'vitest';
import { buildPresetExport, parsePresetImport, serializePresets, PRESET_EXPORT_KIND } from './preset-io';
import type { Preset } from './persistence';

const preset: Preset = {
  id: 'p1',
  name: 'Autumn street style',
  createdAt: '2026-10-01T10:00:00.000Z',
  profileId: 'flux2',
  selections: { 'subject.look': ['subject.look.streetwear'] },
};

describe('preset import and export', () => {
  it('round-trips the presets', () => {
    const text = serializePresets([preset], new Date('2026-10-21T00:00:00.000Z'));
    const result = parsePresetImport(text);
    expect(result.error).toBeUndefined();
    expect(result.presets).toHaveLength(1);
    expect(result.presets?.[0]?.name).toBe('Autumn street style');
    expect(result.presets?.[0]?.selections).toEqual(preset.selections);
    expect(result.presets?.[0]?.profileId).toBe('flux2');
  });

  it('writes a readable export', () => {
    const payload = buildPresetExport([preset]);
    expect(payload.kind).toBe(PRESET_EXPORT_KIND);
    expect(payload.version).toBe(1);
    expect(payload.presets).toHaveLength(1);
  });

  it('refuses a file that is not a preset export', () => {
    expect(parsePresetImport('not json').error).toBeDefined();
    expect(parsePresetImport('{"kind":"other"}').error).toBeDefined();
    expect(parsePresetImport('{"kind":"preset-export"}').error).toBeDefined();
  });

  it('skips the broken presets inside a valid file', () => {
    const text = JSON.stringify({
      kind: PRESET_EXPORT_KIND,
      version: 1,
      presets: [{ nope: true }, { id: 'p2', name: 'Second' }],
    });
    const result = parsePresetImport(text);
    expect(result.presets).toHaveLength(1);
    expect(result.presets?.[0]?.id).toBe('p2');
    expect(result.presets?.[0]?.selections).toEqual({});
  });

  it('discards the selection ids that are not strings', () => {
    const text = JSON.stringify({
      kind: PRESET_EXPORT_KIND,
      version: 1,
      presets: [{ id: 'p3', name: 'Third', selections: { 'subject.look': ['a', 5, null] } }],
    });
    const result = parsePresetImport(text);
    expect(result.presets?.[0]?.selections).toEqual({ 'subject.look': ['a'] });
  });
});
