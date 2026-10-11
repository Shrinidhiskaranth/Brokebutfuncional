import { describe, expect, it } from 'vitest';
import { parseAmount, parseCategory, parseDay, sanitizeText } from './sanitize';

describe('sanitizeText', () => {
  it('trims, collapses whitespace and limits length', () => {
    expect(sanitizeText('   Pizza    with   friends  ')).toBe('Pizza with friends');
    expect(sanitizeText('x'.repeat(200))).toHaveLength(60);
  });

  it('removes angle brackets so markup cannot be stored', () => {
    expect(sanitizeText('<img src=x onerror=alert(1)>Chai')).toBe('img src=x onerror=alert(1)Chai');
  });

  it('strips control, zero-width and bidi-override characters', () => {
    expect(sanitizeText('Ch\u0000ai\u200B\u202E')).toBe('Chai');
  });

  it('returns an empty string for non-strings', () => {
    expect(sanitizeText(42)).toBe('');
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText({ toString: () => '<b>' })).toBe('');
  });
});

describe('parseAmount', () => {
  it('accepts plain, comma and rupee formatted numbers', () => {
    expect(parseAmount('1200')).toBe(1200);
    expect(parseAmount('1,200')).toBe(1200);
    expect(parseAmount('₹ 350')).toBe(350);
    expect(parseAmount(99.6)).toBe(100);
  });

  it.each(['0', '-5', 'abc', '12abc', '', '1e5', NaN, Infinity, 5_000_000, undefined, '1.2.3', {}])(
    'rejects %s',
    (bad) => {
      expect(parseAmount(bad)).toBeNull();
    },
  );

  it('allows zero only when asked', () => {
    expect(parseAmount('0', { allowZero: true })).toBe(0);
  });
});

describe('parseDay', () => {
  it('accepts days 1 to 30 only', () => {
    expect(parseDay('1')).toBe(1);
    expect(parseDay(30)).toBe(30);
    for (const bad of [0, 31, '2.5', 'x', -1, '']) expect(parseDay(bad)).toBeNull();
  });
});

describe('parseCategory', () => {
  it('keeps allow-listed categories and falls back otherwise', () => {
    expect(parseCategory('food')).toBe('food');
    expect(parseCategory('__proto__')).toBe('other');
    expect(parseCategory('nope', 'fun')).toBe('fun');
  });
});
