import { describe, expect, it } from 'vitest';
import { combinePrompts, copyText } from './clipboard';

describe('clipboard', () => {
  it('copies the text with the injected writer', async () => {
    const written: string[] = [];
    const result = await copyText('fashion editorial', async (text) => {
      written.push(text);
    });
    expect(result.ok).toBe(true);
    expect(written).toEqual(['fashion editorial']);
  });

  it('reports a failure without throwing', async () => {
    const result = await copyText('text', async () => {
      throw new Error('denied');
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('denied');
  });

  it('refuses to copy an empty text', async () => {
    const result = await copyText('', async () => undefined);
    expect(result.ok).toBe(false);
  });

  it('combines the positive and the negative prompt', () => {
    expect(combinePrompts('a', '')).toBe('a');
    expect(combinePrompts('', 'b')).toBe('b');
    expect(combinePrompts('a', 'b')).toBe('a\n\nNegative prompt: b');
  });
});
