/** Factories for month states: the example month, a blank month, and the roll-over. */
import { MONTHLY_BUDGET, SCHEMA_VERSION } from '../config';
import { payDueBills } from './finance';
import { sum } from './money';
import type { Bill, BillType, CategoryKey, Goal, IdFactory, MonthState, Transaction, TransactionKind } from './types';

/** A realistic student month paused on Day 12, so the app opens with real data. */
export function createExampleMonth(newId: IdFactory): MonthState {
  const bill = (name: string, amount: number, due: number, type: BillType = 'bill'): Bill => ({
    id: newId(),
    name,
    amount,
    due,
    type,
    paid: false,
    active: true,
  });
  const emergency: Goal = { id: newId(), name: 'Emergency fund', target: 1500, emergency: true };
  const concert: Goal = { id: newId(), name: 'Concert ticket', target: 1500 };
  const day = 12;

  const tx = (
    txDay: number,
    amount: number,
    category: CategoryKey,
    note: string,
    kind: TransactionKind = 'spend',
    goalId?: string,
  ): Transaction => ({ id: newId(), day: txDay, amount, category, note, kind, ...(goalId ? { goalId } : {}) });

  const history: Transaction[] = [
    tx(1, 40, 'food', 'Chai + bun'),
    tx(1, 280, 'food', 'Biryani delivery'),
    tx(2, 90, 'travel', 'Rapido to college'),
    tx(3, 120, 'shopping', 'Stationery'),
    tx(3, 60, 'food', 'Canteen lunch'),
    tx(4, 320, 'food', 'Zomato with roommates'),
    tx(4, 500, 'other', 'Emergency fund', 'save', emergency.id),
    tx(5, 250, 'fun', 'Movie ticket'),
    tx(6, 85, 'food', 'Momos'),
    tx(6, 210, 'food', 'Blinkit snacks'),
    tx(7, 340, 'shopping', 'Groceries'),
    tx(7, 300, 'other', 'Concert ticket', 'save', concert.id),
    tx(8, 70, 'travel', 'Auto'),
    tx(8, 300, 'other', 'Sold old textbooks', 'income'),
    tx(9, 45, 'food', 'Cold coffee'),
    tx(10, 450, 'other', 'Laptop charger died', 'surprise'),
    tx(11, 180, 'food', 'Pizza'),
    tx(11, 60, 'food', 'Chai ×3'),
    tx(12, 40, 'food', 'Morning chai'),
  ];

  const bills = [
    bill('Hostel mess fee', 2500, 1),
    bill('Metro pass', 500, 3),
    bill('Phone recharge', 299, 18),
    bill('Electricity share', 350, 25),
    bill('Spotify', 119, 5, 'subscription'),
    bill('iCloud', 75, 9, 'subscription'),
    bill('Netflix', 199, 20, 'subscription'),
    bill('YouTube Premium', 129, 22, 'subscription'),
  ].map((b) => {
    if (b.due > day) return b;
    history.push(tx(b.due, b.amount, 'other', b.name, 'bill'));
    return { ...b, paid: true };
  });

  return {
    version: SCHEMA_VERSION,
    month: 1,
    day,
    budget: MONTHLY_BUDGET,
    welcome: true,
    habits: [],
    goals: [emergency, concert],
    bills,
    transactions: history.sort((a, b) => a.day - b.day),
  };
}

/** An empty month starting on Day 1 with the full budget. */
export function createFreshMonth(newId: IdFactory): MonthState {
  return {
    version: SCHEMA_VERSION,
    month: 1,
    day: 1,
    budget: MONTHLY_BUDGET,
    welcome: false,
    habits: [],
    bills: [],
    goals: [{ id: newId(), name: 'Emergency fund', target: 1500, emergency: true }],
    transactions: [],
  };
}

/** Start the next month: fresh budget, leftover cash carried over, goal savings kept, bills reset. */
export function startNextMonth(state: MonthState, leftover: number, newId: IdFactory): MonthState {
  const savings = state.transactions.filter((t) => t.kind === 'save').map((t) => ({ ...t, day: 1 }));
  const carried: Transaction[] =
    leftover > 0
      ? [{ id: newId(), day: 1, amount: Math.round(leftover), category: 'other', note: 'Left over from last month', kind: 'income' }]
      : [];
  const next: MonthState = {
    ...state,
    month: state.month + 1,
    day: 1,
    // Savings stay in their goals, so they are added back to the budget they came from.
    budget: MONTHLY_BUDGET + sum(savings, (t) => t.amount),
    welcome: false,
    bills: state.bills.map((b) => ({ ...b, paid: false })),
    transactions: [...savings, ...carried],
  };
  return payDueBills(next, newId).state;
}
