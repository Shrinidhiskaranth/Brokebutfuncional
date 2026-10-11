/**
 * Persistence in localStorage. Data read back is untrusted: it is parsed
 * defensively, validated field by field and re-sanitised. Anything that does
 * not match the schema is rejected and the app falls back to defaults.
 */
import { LIMITS, MONTH_DAYS, SCHEMA_VERSION, STORAGE_KEY, isCategoryKey } from '../constants';
import { sanitizeText } from '../utils/sanitize';
import type { Bill, Goal, Habit, MonthState, Transaction, TransactionKind } from '../types';

type Rec = Record<string, unknown>;

const KINDS: readonly TransactionKind[] = ['spend', 'oneoff', 'surprise', 'bill', 'income', 'save'];
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64;
const isAmount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= LIMITS.maxAmount * 10;
const isDay = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= MONTH_DAYS;
const isKind = (v: unknown): v is TransactionKind => typeof v === 'string' && (KINDS as readonly string[]).includes(v);

function toTransaction(v: unknown): Transaction | null {
  if (!isRec(v) || !isId(v.id) || !isDay(v.day) || !isAmount(v.amount) || !isCategoryKey(v.category) || !isKind(v.kind)) {
    return null;
  }
  if (typeof v.note !== 'string') return null;
  if (v.kind === 'save' && !isId(v.goalId)) return null;
  const tx: Transaction = { id: v.id, day: v.day, amount: v.amount, category: v.category, note: sanitizeText(v.note), kind: v.kind };
  return isId(v.goalId) ? { ...tx, goalId: v.goalId } : tx;
}

function toBill(v: unknown): Bill | null {
  if (!isRec(v) || !isId(v.id) || typeof v.name !== 'string' || !isAmount(v.amount) || !isDay(v.due)) return null;
  if ((v.type !== 'bill' && v.type !== 'subscription') || typeof v.paid !== 'boolean' || typeof v.active !== 'boolean') return null;
  return { id: v.id, name: sanitizeText(v.name), amount: v.amount, due: v.due, type: v.type, paid: v.paid, active: v.active };
}

function toGoal(v: unknown): Goal | null {
  if (!isRec(v) || !isId(v.id) || typeof v.name !== 'string' || !isAmount(v.target) || v.target <= 0) return null;
  return { id: v.id, name: sanitizeText(v.name), target: v.target, emergency: v.emergency === true };
}

function toHabit(v: unknown): Habit | null {
  if (!isRec(v) || !isId(v.id) || typeof v.name !== 'string' || !isAmount(v.perDay)) return null;
  return { id: v.id, name: sanitizeText(v.name), perDay: v.perDay };
}

/** Convert every item or reject the whole list. */
function all<T>(list: unknown, convert: (v: unknown) => T | null, max = Infinity): T[] | null {
  if (!Array.isArray(list) || list.length > max) return null;
  const out: T[] = [];
  for (const item of list) {
    const converted = convert(item);
    if (converted === null) return null;
    out.push(converted);
  }
  return out;
}

/** Validate an unknown value as a MonthState. Returns a cleaned copy or null. */
export function validateState(value: unknown): MonthState | null {
  if (!isRec(value) || value.version !== SCHEMA_VERSION) return null;
  if (!isDay(value.day) || !isAmount(value.budget)) return null;
  if (typeof value.month !== 'number' || !Number.isInteger(value.month) || value.month < 1) return null;
  const transactions = all(value.transactions, toTransaction, LIMITS.maxTransactions);
  const bills = all(value.bills, toBill, 200);
  const goals = all(value.goals, toGoal, 50);
  const habits = all(value.habits, toHabit, 50);
  if (!transactions || !bills || !goals || !habits) return null;
  return {
    version: SCHEMA_VERSION,
    month: value.month,
    day: value.day,
    budget: value.budget,
    welcome: value.welcome === true,
    transactions,
    bills,
    goals,
    habits,
  };
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const defaultStorage = (): StorageLike | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined; // access can throw in sandboxed or privacy modes
  }
};

/** Read state. Never throws: private mode, quota errors and corrupt JSON all return null. */
export function loadState(storage: StorageLike | undefined = defaultStorage()): MonthState | null {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return raw ? validateState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Write state. Failures are ignored because the app works without storage. */
export function saveState(state: MonthState, storage: StorageLike | undefined = defaultStorage()): boolean {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return storage !== undefined;
  } catch {
    return false;
  }
}
