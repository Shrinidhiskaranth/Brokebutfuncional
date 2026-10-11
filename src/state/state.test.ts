import { describe, expect, it } from 'vitest';
import { STORAGE_KEY } from '../config';
import { computeSnapshot } from '../domain/finance';
import type { MonthState } from '../domain/types';
import { example, fresh, ids, must, simpleMonth } from '../test/fixtures';
import { cleanDecision, historyReducer, reducer } from './reducer';
import type { Action } from './reducer';
import { loadState, saveState, validateState } from './storage';

const run = (state: MonthState, action: Action) => reducer(state, action, ids());
const lastTx = (state: MonthState) => must(state.transactions.at(-1), 'last transaction');
const bill = (state: MonthState, id: string) => must(state.bills.find((b) => b.id === id), `bill ${id}`);

describe('reducer', () => {
  it('logs a valid spend and sanitises its note', () => {
    const next = run(simpleMonth(), { type: 'LOG_SPEND', payload: { amount: '250', category: 'food', note: '  <b>Momos</b> ' } });
    expect(lastTx(next)).toMatchObject({ amount: 250, note: 'bMomos/b', kind: 'spend', day: 10 });
  });

  it('records unexpected spends separately', () => {
    expect(lastTx(run(simpleMonth(), { type: 'LOG_SPEND', payload: { amount: 300, unexpected: true } })).kind).toBe('surprise');
  });

  it.each(['0', '-10', 'abc', 10_000_000])('rejects the invalid amount %s without changing state', (amount) => {
    const m = simpleMonth();
    expect(run(m, { type: 'LOG_SPEND', payload: { amount } })).toBe(m);
  });

  it('falls back to a safe category for unknown input', () => {
    expect(lastTx(run(simpleMonth(), { type: 'LOG_SPEND', payload: { amount: 10, category: 'constructor' } })).category).toBe('food');
  });

  it('deletes user transactions but never auto-paid bills', () => {
    const m = simpleMonth();
    expect(run(m, { type: 'DELETE_TRANSACTION', payload: { id: 'x2' } }).transactions).toHaveLength(2);
    expect(run(m, { type: 'DELETE_TRANSACTION', payload: { id: 'x1' } })).toBe(m);
  });

  it('moves to the next day and auto-pays bills due that day', () => {
    const next = run({ ...simpleMonth(), day: 19 }, { type: 'NEXT_DAY' });
    expect(next.day).toBe(20);
    expect(bill(next, 'b2').paid).toBe(true);
  });

  it('rolls into a new month after Day 30, carrying leftover money', () => {
    const m = { ...simpleMonth(), day: 30, bills: simpleMonth().bills.map((b) => ({ ...b, paid: true })) };
    const leftover = computeSnapshot(m).balance;
    const next = run(m, { type: 'NEXT_DAY' });
    expect(next.month).toBe(2);
    expect(next.day).toBe(1);
    expect(must(next.transactions.find((t) => t.note === 'Left over from last month')).amount).toBe(leftover);
    expect(bill(next, 'b1').paid).toBe(true);
    expect(bill(next, 'b2').paid).toBe(false);
  });

  it('applies only valid decisions', () => {
    const m = simpleMonth();
    expect(run(m, { type: 'APPLY_DECISION', payload: { kind: 'buy', name: 'X', amount: 'free' } })).toBe(m);
    expect(run(m, { type: 'APPLY_DECISION', payload: { kind: 'cancel', billId: 'b1' } })).toBe(m);
    expect(bill(run(m, { type: 'APPLY_DECISION', payload: { kind: 'cancel', billId: 's1', name: 'Cancel Music' } }), 's1').active).toBe(false);
  });

  it('toggles subscriptions but not regular bills', () => {
    const off = run(simpleMonth(), { type: 'TOGGLE_SUBSCRIPTION', payload: { id: 's1' } });
    expect(bill(off, 's1').active).toBe(false);
    expect(bill(run(off, { type: 'TOGGLE_SUBSCRIPTION', payload: { id: 's1' } }), 's1').active).toBe(true);
    const m = simpleMonth();
    expect(run(m, { type: 'TOGGLE_SUBSCRIPTION', payload: { id: 'b1' } })).toBe(m);
  });

  it('adds a bill with validation and pays it at once if already due', () => {
    const m = simpleMonth();
    expect(run(m, { type: 'ADD_BILL', payload: { name: '', amount: 100, due: 12, type: 'bill' } })).toBe(m);
    expect(run(m, { type: 'ADD_BILL', payload: { name: 'Gym', amount: 100, due: 31, type: 'bill' } })).toBe(m);
    const later = run(m, { type: 'ADD_BILL', payload: { name: 'Gym', amount: 400, due: 15, type: 'subscription' } });
    expect(later.bills.at(-1)).toMatchObject({ type: 'subscription', paid: false });
    const now = run(m, { type: 'ADD_BILL', payload: { name: 'Late fee', amount: 50, due: 2, type: 'bill' } });
    expect(now.bills.at(-1)?.paid).toBe(true);
    expect(lastTx(now).note).toBe('Late fee');
  });

  it('saves to a goal only when the money is free', () => {
    const m = simpleMonth();
    expect(lastTx(run(m, { type: 'SAVE_TO_GOAL', payload: { goalId: 'g1', amount: 100 } })).kind).toBe('save');
    expect(run(m, { type: 'SAVE_TO_GOAL', payload: { goalId: 'g1', amount: 999999 } })).toBe(m);
    expect(run(m, { type: 'SAVE_TO_GOAL', payload: { goalId: 'missing', amount: 100 } })).toBe(m);
  });

  it('resets to the example or a fresh month', () => {
    expect(run(simpleMonth(), { type: 'LOAD_EXAMPLE' }).day).toBe(12);
    const f = run(simpleMonth(), { type: 'START_FRESH' });
    expect(f.day).toBe(1);
    expect(f.transactions).toHaveLength(0);
  });

  it('cleanDecision rejects junk and defaults the category safely', () => {
    expect(cleanDecision(simpleMonth(), null)).toBeNull();
    expect(cleanDecision(simpleMonth(), { kind: 'hack' })).toBeNull();
    expect(cleanDecision(simpleMonth(), { kind: 'buy', name: 'X', amount: 5, category: '__proto__' })).toMatchObject({ category: 'shopping' });
  });
});

describe('historyReducer (undo)', () => {
  it('keeps one step of history and ignores no-op actions', () => {
    const start = { present: simpleMonth(), past: null };
    const after = historyReducer(start, { type: 'LOG_SPEND', payload: { amount: 50 } }, ids());
    expect(after.present.transactions).toHaveLength(4);
    expect(after.past).toBe(start.present);
    expect(historyReducer(after, { type: 'UNDO' }, ids()).present).toBe(start.present);
    expect(historyReducer(start, { type: 'LOG_SPEND', payload: { amount: 'x' } }, ids())).toBe(start);
    expect(historyReducer(start, { type: 'UNDO' }, ids())).toBe(start);
  });
});

describe('storage', () => {
  const memory = () => {
    const data = new Map<string, string>();
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
  };

  it('round-trips a valid month', () => {
    const store = memory();
    expect(saveState(example(), store)).toBe(true);
    expect(loadState(store)).toEqual(validateState(example()));
  });

  it('rejects corrupt or tampered data', () => {
    const store = memory();
    store.setItem(STORAGE_KEY, '{not json');
    expect(loadState(store)).toBeNull();
    const bad = example();
    bad.transactions = bad.transactions.map((t, i) => (i === 0 ? { ...t, amount: -100 } : t));
    expect(validateState(bad)).toBeNull();
    expect(validateState({ ...example(), version: 1 })).toBeNull();
    expect(validateState({ ...example(), day: 99 })).toBeNull();
    expect(validateState({ ...example(), transactions: 'x' })).toBeNull();
    expect(validateState('nope')).toBeNull();
  });

  it('re-sanitises text that was edited in storage', () => {
    const m = fresh();
    m.goals = m.goals.map((g) => ({ ...g, name: '<script>x</script>' }));
    expect(validateState(m)?.goals[0]?.name).toBe('scriptx/script');
  });

  it('never throws when storage is unavailable', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadState(broken)).toBeNull();
    expect(saveState(example(), broken)).toBe(false);
    expect(loadState(undefined)).toBeNull();
  });
});
