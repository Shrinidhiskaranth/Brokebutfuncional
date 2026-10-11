/** Numeric helpers shared by the domain and UI layers. */

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export function sum<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0);
}

const inrFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Format rupees with Indian digit grouping: 123456 → "₹1,23,456", -40 → "−₹40". */
export function formatINR(value: number): string {
  const rounded = Math.round(Number.isFinite(value) ? value : 0);
  const body = inrFormatter.format(Math.abs(rounded));
  return rounded < 0 ? `−₹${body}` : `₹${body}`;
}
