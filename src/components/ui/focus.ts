/** Focus helpers used by the modal dialog. */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest('[hidden]'));
}

/**
 * Pure helper: where should Tab go so focus stays inside the dialog?
 * Returns -1 when the browser's default behaviour is fine.
 */
export function nextTrapIndex(count: number, currentIndex: number, shiftKey: boolean): number {
  if (count === 0) return -1;
  if (currentIndex === -1) return shiftKey ? count - 1 : 0;
  if (shiftKey) return currentIndex === 0 ? count - 1 : -1;
  return currentIndex === count - 1 ? 0 : -1;
}
