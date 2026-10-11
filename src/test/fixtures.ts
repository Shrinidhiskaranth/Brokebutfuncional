import { createExampleMonth, createFreshMonth } from '../domain/months';
import type { MonthState } from '../types';
import { createSequentialIds } from '../utils/ids';

export const example = (): MonthState => createExampleMonth(createSequentialIds('e'));
export const fresh = (): MonthState => createFreshMonth(createSequentialIds('f'));
export const ids = () => createSequentialIds('t');

/** A small month with round numbers for arithmetic tests (Day 10). */
export function simpleMonth(overrides: Partial<MonthState> = {}): MonthState {
  return {
    version: 3,
    month: 1,
    day: 10,
    budget: 10000,
    welcome: false,
    habits: [],
    goals: [{ id: 'g1', name: 'Emergency fund', target: 1000, emergency: true }],
    bills: [
      { id: 'b1', name: 'Rent share', amount: 3000, due: 1, type: 'bill', paid: true, active: true },
      { id: 'b2', name: 'Phone', amount: 300, due: 20, type: 'bill', paid: false, active: true },
      { id: 's1', name: 'Music', amount: 100, due: 25, type: 'subscription', paid: false, active: true },
    ],
    transactions: [
      { id: 'x1', day: 1, amount: 3000, category: 'other', note: 'Rent share', kind: 'bill' },
      { id: 'x2', day: 2, amount: 500, category: 'food', note: 'Food', kind: 'spend' },
      { id: 'x3', day: 5, amount: 500, category: 'fun', note: 'Movie', kind: 'spend' },
    ],
    ...overrides,
  };
}

/** Look up an item or fail the test with a clear message (avoids non-null assertions). */
export function must<T>(value: T | undefined | null, what = 'value'): T {
  if (value === undefined || value === null) throw new Error(`Expected ${what} to exist`);
  return value;
}
