/** Core domain types. Everything in the app is derived from a MonthState. */

export type CategoryKey = 'food' | 'travel' | 'fun' | 'shopping' | 'other';

/**
 * - spend:    everyday spending (shapes your usual daily spend)
 * - oneoff:   a planned purchase made through "Can I afford it?"
 * - surprise: an unexpected expense
 * - bill:     a bill or subscription, paid automatically on its due day
 * - income:   money in
 * - save:     money moved into a savings goal
 */
export type TransactionKind = 'spend' | 'oneoff' | 'surprise' | 'bill' | 'income' | 'save';

export interface Transaction {
  id: string;
  /** Day of the month, 1–30 */
  day: number;
  /** Whole rupees, always positive */
  amount: number;
  category: CategoryKey;
  note: string;
  kind: TransactionKind;
  /** Only for kind === 'save' */
  goalId?: string;
}

export type BillType = 'bill' | 'subscription';

export interface Bill {
  id: string;
  name: string;
  amount: number;
  /** Day of the month it is charged */
  due: number;
  type: BillType;
  paid: boolean;
  /** false once a subscription is cancelled */
  active: boolean;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  emergency?: boolean;
}

export interface Habit {
  id: string;
  name: string;
  /** Rupees saved per day */
  perDay: number;
}

export interface MonthState {
  version: number;
  month: number;
  day: number;
  budget: number;
  welcome: boolean;
  transactions: Transaction[];
  bills: Bill[];
  goals: Goal[];
  habits: Habit[];
}

export type Decision =
  | { kind: 'buy'; name: string; amount: number; category: CategoryKey }
  | { kind: 'earn'; name: string; amount: number }
  | { kind: 'habit'; name: string; amount: number }
  | { kind: 'cancel'; name: string; billId: string };

export type Tone = 'good' | 'warn' | 'bad';

export interface HealthFactor {
  label: string;
  max: number;
  value: number;
}

export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface ForecastPoint {
  day: number;
  /** Money left (balance) at the end of this day */
  balance: number;
  /** true for days after today (projected), false for real history */
  projected: boolean;
}

export interface Snapshot {
  day: number;
  daysLeft: number;
  total: number;
  earned: number;
  spent: number;
  saved: number;
  savedByGoal: Record<string, number>;
  balance: number;
  upcomingBills: Bill[];
  billsLeft: number;
  /** Balance minus bills still due this month */
  free: number;
  /** Safe daily allowance for the rest of the month */
  perDay: number;
  spentToday: number;
  leftToday: number;
  /** Average everyday spend per day, minus habit savings */
  usualDaily: number;
  monthEnd: number;
  brokeOnDay: number | null;
  unexpected: number;
  subscriptionsMonthly: number;
  plannedDaily: number;
  byCategory: Partial<Record<CategoryKey, number>>;
  byDay: Record<number, number>;
  /** Financial risk, derived from the forecast and spending pace */
  risk: { level: RiskLevel; tone: Tone; reason: string };
  goalTarget: number;
  goalSaved: number;
  /** Share of all goal targets covered by savings plus the forecast month-end surplus (0–1) */
  goalsFunded: number;
  score: number;
  mood: { label: string; tone: Tone };
  factors: HealthFactor[];
}

export type IdFactory = () => string;
