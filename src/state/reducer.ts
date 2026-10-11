/**
 * Every state change goes through this pure reducer. Each payload is
 * re-validated here (defence in depth), so invalid input leaves state unchanged.
 */
import { LIMITS, MONTH_DAYS } from '../constants';
import { applyDecision, computeSnapshot, payDueBills } from '../domain/finance';
import { createExampleMonth, createFreshMonth, startNextMonth } from '../domain/months';
import { parseAmount, parseCategory, parseDay, sanitizeText } from '../utils/sanitize';
import type { Bill, Decision, IdFactory, MonthState } from '../types';

export type Action =
  | { type: 'LOG_SPEND'; payload: { amount: unknown; category?: unknown; note?: unknown; unexpected?: boolean } }
  | { type: 'DELETE_TRANSACTION'; payload: { id: string } }
  | { type: 'NEXT_DAY' }
  | { type: 'APPLY_DECISION'; payload: unknown }
  | { type: 'TOGGLE_SUBSCRIPTION'; payload: { id: string } }
  | { type: 'ADD_BILL'; payload: { name: unknown; amount: unknown; due: unknown; type: unknown } }
  | { type: 'LOG_INCOME'; payload: { amount: unknown; note?: unknown } }
  | { type: 'SAVE_TO_GOAL'; payload: { goalId: string; amount: unknown } }
  | { type: 'ADD_GOAL'; payload: { name: unknown; target: unknown } }
  | { type: 'DELETE_GOAL'; payload: { id: string } }
  | { type: 'DISMISS_WELCOME' }
  | { type: 'LOAD_EXAMPLE' }
  | { type: 'START_FRESH' };

/** Upper bound on savings goals, to keep the UI usable. */
export const MAX_GOALS = 8;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** Validate an untrusted decision; returns a clean Decision or null. */
export function cleanDecision(state: MonthState, raw: unknown): Decision | null {
  if (!isRecord(raw)) return null;
  const name = sanitizeText(raw.name) || 'Purchase';
  switch (raw.kind) {
    case 'buy': {
      const amount = parseAmount(raw.amount);
      return amount ? { kind: 'buy', name, amount, category: parseCategory(raw.category, 'shopping') } : null;
    }
    case 'earn':
    case 'habit': {
      const amount = parseAmount(raw.amount);
      return amount ? { kind: raw.kind === 'earn' ? 'earn' : 'habit', name, amount } : null;
    }
    case 'cancel': {
      const bill = state.bills.find((b) => b.id === raw.billId && b.type === 'subscription' && b.active);
      return bill ? { kind: 'cancel', name, billId: bill.id } : null;
    }
    default:
      return null;
  }
}

export function reducer(state: MonthState, action: Action, newId: IdFactory): MonthState {
  const atCapacity = state.transactions.length >= LIMITS.maxTransactions;

  switch (action.type) {
    case 'LOG_SPEND': {
      const { payload } = action;
      const amount = parseAmount(payload.amount);
      if (!amount || atCapacity) return state;
      const fallbackNote = payload.unexpected ? 'Unexpected expense' : 'Spend';
      return {
        ...state,
        transactions: [
          ...state.transactions,
          {
            id: newId(),
            day: state.day,
            amount,
            category: parseCategory(payload.category, 'food'),
            note: sanitizeText(payload.note) || fallbackNote,
            kind: payload.unexpected ? 'surprise' : 'spend',
          },
        ],
      };
    }

    case 'LOG_INCOME': {
      const amount = parseAmount(action.payload.amount);
      if (!amount || atCapacity) return state;
      return {
        ...state,
        transactions: [
          ...state.transactions,
          {
            id: newId(),
            day: state.day,
            amount,
            category: 'other',
            note: sanitizeText(action.payload.note) || 'Money in',
            kind: 'income',
          },
        ],
      };
    }

    case 'DELETE_TRANSACTION': {
      const target = state.transactions.find((t) => t.id === action.payload.id);
      if (!target || target.kind === 'bill') return state; // bills are system-generated
      return { ...state, transactions: state.transactions.filter((t) => t.id !== target.id) };
    }

    case 'NEXT_DAY': {
      if (state.day >= MONTH_DAYS) {
        return startNextMonth(state, Math.max(0, computeSnapshot(state).balance), newId);
      }
      return payDueBills({ ...state, day: state.day + 1 }, newId).state;
    }

    case 'APPLY_DECISION': {
      const decision = cleanDecision(state, action.payload);
      return decision && !atCapacity ? applyDecision(state, decision, newId) : state;
    }

    case 'TOGGLE_SUBSCRIPTION': {
      const exists = state.bills.some((b) => b.id === action.payload.id && b.type === 'subscription');
      if (!exists) return state;
      return {
        ...state,
        bills: state.bills.map((b) => (b.id === action.payload.id ? { ...b, active: !b.active } : b)),
      };
    }

    case 'ADD_BILL': {
      const { payload } = action;
      const name = sanitizeText(payload.name);
      const amount = parseAmount(payload.amount);
      const due = parseDay(payload.due);
      if (!name || !amount || !due) return state;
      const bill: Bill = {
        id: newId(),
        name,
        amount,
        due,
        type: payload.type === 'subscription' ? 'subscription' : 'bill',
        paid: false,
        active: true,
      };
      return payDueBills({ ...state, bills: [...state.bills, bill] }, newId).state;
    }

    case 'SAVE_TO_GOAL': {
      const goal = state.goals.find((g) => g.id === action.payload.goalId);
      const amount = parseAmount(action.payload.amount);
      if (!goal || !amount || atCapacity) return state;
      if (computeSnapshot(state).free < amount) return state; // can't save money you don't have
      return {
        ...state,
        transactions: [
          ...state.transactions,
          { id: newId(), day: state.day, amount, category: 'other', note: goal.name, kind: 'save', goalId: goal.id },
        ],
      };
    }

    case 'ADD_GOAL': {
      const name = sanitizeText(action.payload.name);
      const target = parseAmount(action.payload.target);
      if (!name || !target || state.goals.length >= MAX_GOALS) return state;
      return { ...state, goals: [...state.goals, { id: newId(), name, target }] };
    }

    case 'DELETE_GOAL': {
      const goal = state.goals.find((g) => g.id === action.payload.id);
      if (!goal || goal.emergency) return state; // the emergency fund is permanent
      // Money saved in the goal goes back into the spendable balance.
      return {
        ...state,
        goals: state.goals.filter((g) => g.id !== goal.id),
        transactions: state.transactions.filter((t) => !(t.kind === 'save' && t.goalId === goal.id)),
      };
    }

    case 'DISMISS_WELCOME':
      return state.welcome ? { ...state, welcome: false } : state;

    case 'LOAD_EXAMPLE':
      return createExampleMonth(newId);

    case 'START_FRESH':
      return createFreshMonth(newId);

    default:
      return state;
  }
}

/* ---------- one-step undo on top of the month reducer ---------- */

export interface HistoryState {
  present: MonthState;
  past: MonthState | null;
}

export type HistoryAction = Action | { type: 'UNDO' };

export function historyReducer(history: HistoryState, action: HistoryAction, newId: IdFactory): HistoryState {
  if (action.type === 'UNDO') {
    return history.past ? { present: history.past, past: null } : history;
  }
  const next = reducer(history.present, action, newId);
  return next === history.present ? history : { present: next, past: history.present };
}
