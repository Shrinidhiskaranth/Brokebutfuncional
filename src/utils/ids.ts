import type { IdFactory } from '../types';

let counter = 0;

/** Unique id generator using the Web Crypto API, with a safe fallback. */
export const newId: IdFactory = () => {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  counter += 1;
  return `id-${Date.now().toString(36)}-${counter}`;
};

/** Deterministic ids for tests: "t1", "t2", … */
export function createSequentialIds(prefix = 't'): IdFactory {
  let n = 0;
  return () => `${prefix}${++n}`;
}
