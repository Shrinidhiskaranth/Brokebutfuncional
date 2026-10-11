import { describe, expect, it } from 'vitest';
import { example, ids, must, simpleMonth } from '../test/fixtures';
import {
  applyDecision,
  assessRisk,
  buildCalendar,
  buildForecast,
  buildQuickWins,
  buildSavingMoves,
  computeSnapshot,
  judgeDecision,
  payDueBills,
  riskRank,
  scoreHealth,
  statusLine,
} from './finance';
import { formatINR } from '../utils/money';
import type { Decision, MonthState } from '../types';

const withTx = (extra: MonthState['transactions']): MonthState =>
  simpleMonth({ transactions: [...simpleMonth().transactions, ...extra] });

describe('computeSnapshot', () => {
  it('connects balance, bills, free money and the daily allowance', () => {
    const s = computeSnapshot(simpleMonth());
    expect(s.balance).toBe(6000);
    expect(s.billsLeft).toBe(400);
    expect(s.free).toBe(5600);
    expect(s.daysLeft).toBe(21);
    expect(s.perDay).toBeCloseTo(5600 / 21);
  });

  it('forecasts the month end from the usual daily spend', () => {
    const s = computeSnapshot(simpleMonth());
    expect(s.usualDaily).toBe(100);
    expect(s.monthEnd).toBe(5600 - 100 - 2000);
    expect(s.brokeOnDay).toBeNull();
  });

  it('predicts the day money runs out', () => {
    const s = computeSnapshot(withTx([{ id: 'big', day: 3, amount: 4000, category: 'food', note: 'Party', kind: 'spend' }]));
    expect(s.brokeOnDay).not.toBeNull();
    expect(s.brokeOnDay ?? 0).toBeGreaterThan(10);
    expect(s.brokeOnDay ?? 99).toBeLessThanOrEqual(30);
  });

  it('keeps surprises out of the usual daily spend but takes them from free money', () => {
    const base = computeSnapshot(simpleMonth());
    const hit = computeSnapshot(withTx([{ id: 's', day: 9, amount: 900, category: 'other', note: 'Repair', kind: 'surprise' }]));
    expect(hit.usualDaily).toBe(base.usualDaily);
    expect(hit.free).toBe(base.free - 900);
    expect(hit.unexpected).toBe(900);
  });

  it('treats savings as money set aside, not spent', () => {
    const s = computeSnapshot(withTx([{ id: 'sv', day: 4, amount: 400, category: 'other', note: 'EF', kind: 'save', goalId: 'g1' }]));
    expect(s.saved).toBe(400);
    expect(s.savedByGoal.g1).toBe(400);
    expect(s.balance).toBe(5600);
  });

  it('ignores cancelled subscriptions in upcoming bills', () => {
    const m = simpleMonth();
    m.bills = m.bills.map((b) => (b.id === 's1' ? { ...b, active: false } : b));
    expect(computeSnapshot(m).billsLeft).toBe(300);
  });

  it('never returns a negative daily allowance', () => {
    const s = computeSnapshot(simpleMonth({ budget: 1000 }));
    expect(s.free).toBeLessThan(0);
    expect(s.perDay).toBe(0);
    expect(s.brokeOnDay).toBe(10);
  });

  it('matches the example month the app opens with', () => {
    const s = computeSnapshot(example());
    expect(s.total).toBe(10300);
    expect(s.billsLeft).toBe(977);
    expect(Math.round(s.leftToday)).toBe(102);
    expect(s.brokeOnDay).toBe(26);
    expect(s.score).toBe(41);
  });

  it('adds up: spent + saved + bills left + free = total', () => {
    const s = computeSnapshot(example());
    expect(s.spent + s.saved + s.billsLeft + s.free).toBe(s.total);
  });
});

describe('scoreHealth', () => {
  it('stays within 0–100 and explains itself with five factors', () => {
    const best = scoreHealth({ monthEnd: 5000, usualDaily: 0, perDay: 500, saved: 2000, budget: 10000, subscriptionsMonthly: 0, emergencySaved: 2000 });
    const worst = scoreHealth({ monthEnd: -5000, usualDaily: 900, perDay: 0, saved: 0, budget: 10000, subscriptionsMonthly: 2000, emergencySaved: 0 });
    expect(best.score).toBe(100);
    expect(best.mood.label).toBe('Thriving');
    expect(worst.score).toBe(0);
    expect(worst.mood.tone).toBe('bad');
    expect(best.factors).toHaveLength(5);
  });
});

describe('payDueBills', () => {
  it('pays active bills that are due, records them and does not mutate the input', () => {
    const m = { ...simpleMonth(), day: 20 };
    const { state, paid } = payDueBills(m, ids());
    expect(paid.map((b) => b.name)).toEqual(['Phone']);
    expect(must(state.bills.find((b) => b.id === 'b2')).paid).toBe(true);
    expect(state.transactions.at(-1)?.kind).toBe('bill');
    expect(must(m.bills.find((b) => b.id === 'b2')).paid).toBe(false);
  });

  it('skips cancelled subscriptions', () => {
    const m = { ...simpleMonth(), day: 30 };
    m.bills = m.bills.map((b) => (b.id === 's1' ? { ...b, active: false } : b));
    expect(payDueBills(m, ids()).paid.map((p) => p.name)).toEqual(['Phone']);
  });
});

describe('decisions', () => {
  const m = simpleMonth();
  const before = computeSnapshot(m);
  const run = (d: Decision) => {
    const after = computeSnapshot(applyDecision(m, d, ids()));
    return { after, verdict: judgeDecision(before, after, d, m) };
  };

  it('a small purchase is a yes', () => {
    const { after, verdict } = run({ kind: 'buy', name: 'Chai', amount: 20, category: 'food' });
    expect(verdict.title).toBe('Go for it!');
    expect(after.free).toBe(before.free - 20);
  });

  it('a purchase that breaks the bills is a no', () => {
    const { verdict } = run({ kind: 'buy', name: 'Laptop', amount: 9000, category: 'shopping' });
    expect(verdict.tone).toBe('bad');
    expect(verdict.message).toMatch(/short/);
  });

  it('a big purchase that squeezes the allowance is tight', () => {
    expect(run({ kind: 'buy', name: 'Shoes', amount: 1500, category: 'shopping' }).verdict.title).toBe('Yes, but tight');
  });

  it('cancelling an unpaid subscription frees money now', () => {
    const { after, verdict } = run({ kind: 'cancel', billId: 's1', name: 'Cancel Music' });
    expect(after.free).toBe(before.free + 100);
    expect(verdict.tone).toBe('good');
  });

  it('cancelling an already-paid subscription saves from next month', () => {
    const paid = simpleMonth();
    paid.bills = paid.bills.map((b) => (b.id === 's1' ? { ...b, paid: true } : b));
    const d: Decision = { kind: 'cancel', billId: 's1', name: 'Cancel Music' };
    const v = judgeDecision(computeSnapshot(paid), computeSnapshot(applyDecision(paid, d, ids())), d, paid);
    expect(v.title).toBe('Next month');
  });

  it('a habit lowers the usual daily spend and improves the forecast', () => {
    const { after } = run({ kind: 'habit', name: 'Cook', amount: 50 });
    expect(after.usualDaily).toBe(50);
    expect(after.monthEnd).toBeGreaterThan(before.monthEnd);
  });

  it('extra income raises the allowance', () => {
    expect(run({ kind: 'earn', name: 'Gig', amount: 1500 }).after.perDay).toBeGreaterThan(before.perDay);
  });
});

describe('UI helpers', () => {
  it('statusLine warns when money will run out', () => {
    expect(statusLine(computeSnapshot(example())).text).toMatch(/Day 26/);
    expect(statusLine(computeSnapshot(simpleMonth())).tone).toBe('good');
  });

  it('buildQuickWins offers to cancel the biggest unpaid subscription first', () => {
    const m = example();
    const wins = buildQuickWins(m, computeSnapshot(m));
    expect(wins.length).toBeGreaterThan(0);
    expect(wins.length).toBeLessThanOrEqual(3);
    expect(wins[0]?.title).toBe('Cancel Netflix');
  });

  it('buildCalendar marks past, today and future days', () => {
    const m = example();
    const days = buildCalendar(m, computeSnapshot(m));
    expect(days).toHaveLength(30);
    expect(days[11]?.status).toBe('today');
    expect(days[20]?.status).toBe('future');
    expect(['under', 'over']).toContain(days[0]?.status);
    expect(days[17]?.hasBill).toBe(true);
  });

  it('buildSavingMoves lists active subscriptions plus habits and income', () => {
    const moves = buildSavingMoves(example());
    expect(moves.map((m) => m.label)).toContain('Cancel Netflix');
    expect(moves.at(-1)?.decision.kind).toBe('earn');
  });

  it('formatINR uses Indian grouping and a real minus sign', () => {
    expect(formatINR(123456)).toBe('₹1,23,456');
    expect(formatINR(-40.4)).toBe('−₹40');
    expect(formatINR(Number.NaN)).toBe('₹0');
  });
});

describe('financial risk, goals and forecast', () => {
  it('rates risk High when money runs out, Medium when the margin is thin, Low otherwise', () => {
    expect(assessRisk({ free: 2000, monthEnd: -100, brokeOnDay: 26, usualDaily: 200, perDay: 140 }).level).toBe('High');
    expect(assessRisk({ free: 2000, monthEnd: 300, brokeOnDay: null, usualDaily: 100, perDay: 140 }).level).toBe('Medium');
    expect(assessRisk({ free: 2000, monthEnd: 900, brokeOnDay: null, usualDaily: 100, perDay: 140 }).level).toBe('Low');
    expect(riskRank('Low')).toBeLessThan(riskRank('High'));
  });

  it('includes risk and goal funding in the snapshot', () => {
    const s = computeSnapshot(example());
    expect(s.risk.level).toBe('High');
    expect(s.goalTarget).toBe(3000);
    expect(s.goalSaved).toBe(800);
    expect(s.goalsFunded).toBeCloseTo(800 / 3000);
  });

  it('counts the month-end surplus towards goals', () => {
    const s = computeSnapshot(simpleMonth());
    expect(s.goalsFunded).toBe(1);
  });

  it('builds a 30-day forecast that ends at the month-end forecast', () => {
    const m = example();
    const s = computeSnapshot(m);
    const points = buildForecast(m, s);
    expect(points).toHaveLength(30);
    expect(points[0]?.projected).toBe(false);
    expect(points[29]?.projected).toBe(true);
    expect(points[29]?.balance ?? 0).toBeCloseTo(s.monthEnd);
  });
});
