/**
 * Clipboard helper.
 *
 * The writer is injectable so the behaviour can be tested without a browser.
 */
export type ClipboardWriter = (text: string) => Promise<void>;

export interface CopyResult {
  ok: boolean;
  error?: string;
}

function defaultWriter(): ClipboardWriter {
  return async (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    throw new Error('The clipboard is not available in this context.');
  };
}

/** Copy a text to the clipboard. */
export async function copyText(
  text: string,
  writer: ClipboardWriter = defaultWriter(),
): Promise<CopyResult> {
  if (!text) return { ok: false, error: 'There is nothing to copy.' };
  try {
    await writer(text);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Copy failed.' };
  }
}

/** Build the combined text of the positive and the negative prompt. */
export function combinePrompts(prompt: string, negative: string): string {
  const positive = prompt.trim();
  const negativeText = negative.trim();
  if (!negativeText) return positive;
  if (!positive) return negativeText;
  return `${positive}\n\nNegative prompt: ${negativeText}`;
}
