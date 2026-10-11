/**
 * Input sanitisation. Every value typed by the user passes through one of
 * these functions before it reaches application state. React escapes all
 * rendered text as well, so stored text can never become markup.
 */
import { LIMITS, MONTH_DAYS, isCategoryKey } from '../config';
import type { CategoryKey } from './types';

// Control, zero-width and bidi-override characters can spoof or break displayed text.
// eslint-disable-next-line no-control-regex -- matching control characters is the purpose of this pattern
const UNSAFE_CHARS = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
const ANGLE_BRACKETS = /[<>]/g;

/** Clean a short free-text label (notes, names). Returns '' for non-strings. */
export function sanitizeText(input: unknown, maxLength: number = LIMITS.maxTextLength): string {
  if (typeof input !== 'string') return '';
  return input
    .normalize('NFC')
    .replace(UNSAFE_CHARS, '')
    .replace(ANGLE_BRACKETS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Parse a rupee amount. Accepts numbers or strings like "1,200" or "₹ 350".
 * Returns a whole number in (0, maxAmount] or null when invalid.
 */
export function parseAmount(input: unknown, options: { allowZero?: boolean } = {}): number | null {
  let value: number;
  if (typeof input === 'string') {
    const cleaned = input.replace(/[₹,\s]/g, '');
    if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
    value = Number(cleaned);
  } else if (typeof input === 'number') {
    value = input;
  } else {
    return null;
  }
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > LIMITS.maxAmount) return null;
  if (rounded === 0 && !options.allowZero) return null;
  return rounded;
}

/** Parse a day of the month (1–30). Returns null when invalid. */
export function parseDay(input: unknown): number | null {
  const value = typeof input === 'string' && input.trim() !== '' ? Number(input.trim()) : input;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > MONTH_DAYS) return null;
  return value;
}

/** Return the category if it is on the allow-list, otherwise the fallback. */
export function parseCategory(input: unknown, fallback: CategoryKey = 'other'): CategoryKey {
  return isCategoryKey(input) ? input : fallback;
}
