/** App-wide constants: the rules of the challenge live here. */
import type { CategoryKey } from './domain/types';

export const MONTH_DAYS = 30;
export const MONTHLY_BUDGET = 10_000;
export const STORAGE_KEY = 'bbf:state:v3';
export const SCHEMA_VERSION = 3;

/** Hard limits applied to every user input. */
export const LIMITS = {
  maxAmount: 1_000_000,
  maxTextLength: 60,
  maxTransactions: 2_000,
} as const;

export type ToneColor = 'yellow' | 'sky' | 'pink' | 'lilac' | 'mint' | 'orange';

export const CATEGORIES: Readonly<Record<CategoryKey, { label: string; tone: ToneColor }>> = {
  food: { label: 'Food', tone: 'yellow' },
  travel: { label: 'Travel', tone: 'sky' },
  fun: { label: 'Fun', tone: 'pink' },
  shopping: { label: 'Shopping', tone: 'lilac' },
  other: { label: 'Other', tone: 'mint' },
};

export const CATEGORY_KEYS: readonly CategoryKey[] = ['food', 'travel', 'fun', 'shopping', 'other'];

export const isCategoryKey = (value: unknown): value is CategoryKey =>
  typeof value === 'string' && (CATEGORY_KEYS as readonly string[]).includes(value);

export interface QuickPurchase {
  pick: string;
  name: string;
  amount: number;
  category: CategoryKey;
}

export const QUICK_PURCHASES: readonly QuickPurchase[] = [
  { pick: 'concert', name: 'Concert ticket', amount: 1200, category: 'fun' },
  { pick: 'dinner', name: 'Order dinner', amount: 350, category: 'food' },
  { pick: 'shoes', name: 'New sneakers', amount: 2499, category: 'shopping' },
  { pick: 'trip', name: 'Weekend trip', amount: 1800, category: 'travel' },
];

export const SURPRISES: readonly { note: string; amount: number }[] = [
  { note: 'Phone screen cracked', amount: 900 },
  { note: "Friend's birthday gift", amount: 400 },
  { note: 'Doctor visit + medicine', amount: 350 },
  { note: 'Late-night cab', amount: 240 },
  { note: 'Lost metro card', amount: 150 },
];
