/**
 * The finance engine. Pure functions only: state in, numbers out.
 * No React, no storage, no randomness, so it is fully unit-testable.
 *
 *   free        = balance − bills still due this month
 *   perDay      = free ÷ days left (including today)
 *   usualDaily  = everyday spending so far ÷ days passed − habit savings
 *   monthEnd    = free − usualDaily × remaining days
 */
import { MONTH_DAYS } from '../constants';
import { clamp, formatINR, sum } from '../utils/money';
import type { Bill, CategoryKey, Decision, ForecastPoint, HealthFactor, IdFactory, MonthState, RiskLevel, Snapshot, Tone } from '../types';

const isActive = (bill: Bill): boolean => bill.active;

export function computeSnapshot(state: MonthState): Snapshot {
  const { day, budget } = state;
  const daysLeft = MONTH_DAYS - day + 1;

  let earned = 0;
  let spent = 0;
  let saved = 0;
  let everyday = 0;
  let spentToday = 0;
  let unexpected = 0;
  const savedByGoal: Record<string, number> = {};
  const byCategory: Partial<Record<CategoryKey, number>> = {};
  const byDay: Record<number, number> = {};

  for (const tx of state.transactions) {
    if (tx.kind === 'income') {
      earned += tx.amount;
    } else if (tx.kind === 'save') {
      saved += tx.amount;
      const goalId = tx.goalId ?? '';
      savedByGoal[goalId] = (savedByGoal[goalId] ?? 0) + tx.amount;
    } else {
      spent += tx.amount;
      if (tx.kind !== 'bill') {
        byCategory[tx.category] = (byCategory[tx.category] ?? 0) + tx.amount;
        byDay[tx.day] = (byDay[tx.day] ?? 0) + tx.amount;
      }
      if (tx.kind === 'spend') {
        everyday += tx.amount;
        if (tx.day === day) spentToday += tx.amount;
      }
      if (tx.kind === 'surprise') unexpected += tx.amount;
    }
  }

  const total = budget + earned;
  const balance = total - spent - saved;
  const upcomingBills = state.bills.filter((b) => isActive(b) && !b.paid).sort((a, b) => a.due - b.due);
  const billsLeft = sum(upcomingBills, (b) => b.amount);
  const free = balance - billsLeft;
  const perDay = Math.max(0, free) / daysLeft;
  const leftToday = Math.max(0, perDay - spentToday);

  const habitSavings = sum(state.habits, (h) => h.perDay);
  const usualDaily = Math.max(0, everyday / Math.max(1, day) - habitSavings);
  const restOfToday = Math.max(0, usualDaily - spentToday);
  const monthEnd = free - restOfToday - usualDaily * (MONTH_DAYS - day);

  let brokeOnDay: number | null = null;
  if (free <= 0) {
    brokeOnDay = day;
  } else if (usualDaily > 0) {
    const d = day + Math.floor((free - restOfToday) / usualDaily) + 1;
    if (d <= MONTH_DAYS) brokeOnDay = Math.max(day, d);
  }

  const subscriptionsMonthly = sum(
    state.bills.filter((b) => b.type === 'subscription' && isActive(b)),
    (b) => b.amount,
  );
  const allBillsMonthly = sum(state.bills.filter(isActive), (b) => b.amount);
  const plannedDaily = Math.max(1, (budget - allBillsMonthly) / MONTH_DAYS);
  const emergencyGoal = state.goals.find((g) => g.emergency) ?? state.goals[0];
  const emergencySaved = emergencyGoal ? (savedByGoal[emergencyGoal.id] ?? 0) : 0;

  const health = scoreHealth({ monthEnd, usualDaily, perDay, saved, budget, subscriptionsMonthly, emergencySaved });
  const risk = assessRisk({ free, monthEnd, brokeOnDay, usualDaily, perDay });
  const goalTarget = sum(state.goals, (g) => g.target);
  const goalSaved = sum(state.goals, (g) => Math.min(g.target, savedByGoal[g.id] ?? 0));
  const goalsFunded = goalTarget > 0 ? clamp((goalSaved + Math.max(0, monthEnd)) / goalTarget, 0, 1) : 1;

  return {
    day,
    daysLeft,
    total,
    earned,
    spent,
    saved,
    savedByGoal,
    balance,
    upcomingBills,
    billsLeft,
    free,
    perDay,
    spentToday,
    leftToday,
    usualDaily,
    monthEnd,
    brokeOnDay,
    unexpected,
    subscriptionsMonthly,
    plannedDaily,
    byCategory,
    byDay,
    risk,
    goalTarget,
    goalSaved,
    goalsFunded,
    ...health,
  };
}

interface RiskInput {
  free: number;
  monthEnd: number;
  brokeOnDay: number | null;
  usualDaily: number;
  perDay: number;
}

const RISK_TONE: Record<RiskLevel, Tone> = { Low: 'good', Medium: 'warn', High: 'bad' };

/** Financial risk: High if you will run out, Medium if the margin is thin or you overspend. */
export function assessRisk({ free, monthEnd, brokeOnDay, usualDaily, perDay }: RiskInput): Snapshot['risk'] {
  let level: RiskLevel = 'Low';
  let reason = 'You are on track to finish the month with money left.';
  if (free < 0 || brokeOnDay !== null || monthEnd < 0) {
    level = 'High';
    reason = brokeOnDay !== null ? `At this pace your money runs out on Day ${brokeOnDay}.` : 'You are forecast to overspend this month.';
  } else if (monthEnd < 500 || usualDaily > perDay) {
    level = 'Medium';
    reason = 'Your safety margin for the month is thin.';
  }
  return { level, tone: RISK_TONE[level], reason };
}

/** Numeric rank for comparing risk levels (lower is safer). */
export const riskRank = (level: RiskLevel): number => ({ Low: 1, Medium: 2, High: 3 })[level];

/**
 * Balance at the end of each day: real history up to today, then a projection
 * at the usual daily spend with upcoming bills taken on their due days.
 * The final point always equals the snapshot's month-end forecast.
 */
export function buildForecast(state: MonthState, snap: Snapshot): ForecastPoint[] {
  const points: ForecastPoint[] = [];
  let balance = state.budget;
  for (let d = 1; d <= state.day; d += 1) {
    for (const tx of state.transactions) {
      if (tx.day === d) balance += tx.kind === 'income' ? tx.amount : -tx.amount;
    }
    points.push({ day: d, balance, projected: false });
  }
  let projected = balance - Math.max(0, snap.usualDaily - snap.spentToday);
  // Bills already overdue but unpaid are taken immediately.
  projected -= sum(
    snap.upcomingBills.filter((b) => b.due <= state.day),
    (b) => b.amount,
  );
  const last = points[points.length - 1];
  if (last) last.balance = projected;
  for (let d = state.day + 1; d <= MONTH_DAYS; d += 1) {
    projected -= snap.usualDaily + sum(
      snap.upcomingBills.filter((b) => b.due === d),
      (b) => b.amount,
    );
    points.push({ day: d, balance: projected, projected: true });
  }
  return points;
}

interface HealthInput {
  monthEnd: number;
  usualDaily: number;
  perDay: number;
  saved: number;
  budget: number;
  subscriptionsMonthly: number;
  emergencySaved: number;
}

/** Money health 0–100 from five weighted, explainable factors. */
export function scoreHealth(input: HealthInput): Pick<Snapshot, 'score' | 'mood' | 'factors'> {
  const { monthEnd, usualDaily, perDay, saved, budget, subscriptionsMonthly, emergencySaved } = input;
  const factors: HealthFactor[] = [
    { label: 'Money left at month end', max: 35, value: clamp(17.5 + monthEnd / 60, 0, 35) },
    {
      label: 'Daily spending vs limit',
      max: 25,
      value: perDay <= 0 ? 0 : clamp((1.5 - usualDaily / perDay) / 0.7, 0, 1) * 25,
    },
    { label: 'Saving for goals', max: 20, value: clamp(saved / (budget * 0.1), 0, 1) * 20 },
    { label: 'Subscriptions', max: 10, value: clamp((0.1 - subscriptionsMonthly / budget) / 0.07, 0, 1) * 10 },
    { label: 'Emergency savings', max: 10, value: clamp(emergencySaved / 1000, 0, 1) * 10 },
  ];
  const score = Math.round(sum(factors, (f) => f.value));
  const mood: { label: string; tone: Tone } =
    score >= 70
      ? { label: 'Thriving', tone: 'good' }
      : score >= 45
        ? { label: 'Hanging in there', tone: 'warn' }
        : { label: 'Danger zone', tone: 'bad' };
  return { score, mood, factors };
}

/** Pay every active, unpaid bill whose due day has arrived. Never mutates the input. */
export function payDueBills(state: MonthState, newId: IdFactory): { state: MonthState; paid: Bill[] } {
  const paid: Bill[] = [];
  const transactions = [...state.transactions];
  const bills = state.bills.map((bill) => {
    if (bill.paid || !bill.active || bill.due > state.day) return bill;
    paid.push(bill);
    transactions.push({ id: newId(), day: state.day, amount: bill.amount, category: 'other', note: bill.name, kind: 'bill' });
    return { ...bill, paid: true };
  });
  return { state: { ...state, bills, transactions }, paid };
}

/** Apply a decision to a month. Used for previews (on a copy) and for real once confirmed. */
export function applyDecision(state: MonthState, decision: Decision, newId: IdFactory): MonthState {
  switch (decision.kind) {
    case 'buy':
      return {
        ...state,
        transactions: [
          ...state.transactions,
          { id: newId(), day: state.day, amount: decision.amount, category: decision.category, note: decision.name, kind: 'oneoff' },
        ],
      };
    case 'earn':
      return {
        ...state,
        transactions: [
          ...state.transactions,
          { id: newId(), day: state.day, amount: decision.amount, category: 'other', note: decision.name, kind: 'income' },
        ],
      };
    case 'cancel':
      return { ...state, bills: state.bills.map((b) => (b.id === decision.billId ? { ...b, active: false } : b)) };
    case 'habit':
      return { ...state, habits: [...state.habits, { id: newId(), name: decision.name, perDay: decision.amount }] };
  }
}

export interface Verdict {
  tone: Tone;
  title: string;
  message: string;
}

/** Turn a before/after comparison into a plain-language verdict. */
export function judgeDecision(before: Snapshot, after: Snapshot, decision: Decision, state: MonthState): Verdict {
  if (decision.kind === 'cancel') {
    const bill = state.bills.find((b) => b.id === decision.billId);
    if (bill?.paid) {
      return {
        tone: 'warn',
        title: 'Next month',
        message: `${bill.name} is already paid this month. You'll save ${formatINR(bill.amount)} every month after.`,
      };
    }
  }
  if (decision.kind !== 'buy') {
    return { tone: 'good', title: 'Smart move!', message: 'This gives you more to spend every day.' };
  }
  if (after.free < 0) {
    return { tone: 'bad', title: 'Nope', message: `You'd be ${formatINR(-after.free)} short for your bills.` };
  }
  const brokeSooner = after.brokeOnDay !== null && (before.brokeOnDay === null || after.brokeOnDay < before.brokeOnDay);
  if (brokeSooner || after.perDay < 50) {
    return {
      tone: 'bad',
      title: 'Not now',
      message:
        after.brokeOnDay !== null
          ? `You'd be broke by Day ${after.brokeOnDay}.`
          : `You'd have only ${formatINR(after.perDay)} a day left.`,
    };
  }
  if (after.perDay < before.perDay * 0.85) {
    return { tone: 'warn', title: 'Yes, but tight', message: "You'll have to spend less for the rest of the month." };
  }
  return { tone: 'good', title: 'Go for it!', message: 'It barely changes your month. Enjoy!' };
}

/** One-line status for the hero card. */
export function statusLine(snap: Snapshot): { tone: Tone; text: string } {
  if (snap.free < 0) return { tone: 'bad', text: 'Bills coming up are more than the money you have.' };
  if (snap.brokeOnDay !== null) return { tone: 'bad', text: `Slow down! At this rate you're broke on Day ${snap.brokeOnDay}.` };
  if (snap.usualDaily > snap.perDay * 0.9) {
    return { tone: 'warn', text: `Close to the limit. Keep today under ${formatINR(snap.perDay)}.` };
  }
  return { tone: 'good', text: `Nice! You'll end the month with about ${formatINR(snap.monthEnd)}.` };
}

export interface QuickWin {
  title: string;
  detail: string;
  decision: Decision;
}

/** Up to three concrete suggestions the user can simulate. */
export function buildQuickWins(state: MonthState, snap: Snapshot): QuickWin[] {
  const wins: QuickWin[] = [];
  const nextSub = state.bills
    .filter((b) => b.type === 'subscription' && b.active && !b.paid)
    .sort((a, b) => b.amount - a.amount)[0];
  if (nextSub) {
    wins.push({
      title: `Cancel ${nextSub.name}`,
      detail: `Saves ${formatINR(nextSub.amount)} before Day ${nextSub.due}`,
      decision: { kind: 'cancel', billId: nextSub.id, name: `Cancel ${nextSub.name}` },
    });
  }
  if (snap.usualDaily > snap.perDay) {
    const cut = Math.ceil((snap.usualDaily - snap.perDay) / 10) * 10;
    wins.push({
      title: `Spend ${formatINR(cut)} less a day`,
      detail: "That's all it takes to last the month",
      decision: { kind: 'habit', amount: cut, name: `Spend ${formatINR(cut)} less a day` },
    });
  }
  if (!state.habits.some((h) => h.name.startsWith('Cook'))) {
    wins.push({
      title: 'Cook instead of ordering',
      detail: 'Saves about ₹80 a day',
      decision: { kind: 'habit', amount: 80, name: 'Cook instead of ordering' },
    });
  }
  return wins.slice(0, 3);
}

export type DayStatus = 'under' | 'over' | 'today' | 'future';

export interface CalendarDay {
  day: number;
  spent: number;
  status: DayStatus;
  hasBill: boolean;
}

/** Data for the 30-day calendar. */
export function buildCalendar(state: MonthState, snap: Snapshot): CalendarDay[] {
  const billDays = new Set(state.bills.filter(isActive).map((b) => b.due));
  return Array.from({ length: MONTH_DAYS }, (_, i) => {
    const day = i + 1;
    const spent = snap.byDay[day] ?? 0;
    let status: DayStatus = 'future';
    if (day === state.day) status = 'today';
    else if (day < state.day) status = spent <= snap.plannedDaily ? 'under' : 'over';
    return { day, spent, status, hasBill: billDays.has(day) };
  });
}

export interface SavingMove {
  pick: string;
  label: string;
  decision: Decision;
}

/** Money-saving moves offered on the "Can I afford it?" page. */
export function buildSavingMoves(state: MonthState): SavingMove[] {
  return [
    ...state.bills
      .filter((b) => b.type === 'subscription' && b.active)
      .map<SavingMove>((b) => ({
        pick: `cancel-${b.id}`,
        label: `Cancel ${b.name}`,
        decision: { kind: 'cancel', billId: b.id, name: `Cancel ${b.name}` },
      })),
    { pick: 'cook', label: 'Cook instead of ordering', decision: { kind: 'habit', amount: 80, name: 'Cook instead of ordering' } },
    { pick: 'gig', label: 'Earn ₹1,500 from a gig', decision: { kind: 'earn', amount: 1500, name: 'Freelance gig' } },
  ];
}
