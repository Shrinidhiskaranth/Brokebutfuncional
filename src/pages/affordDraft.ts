import type { CategoryKey, Decision, MonthState } from '../domain/types';
import { cleanDecision } from '../state/reducer';

export interface AffordDraft {
  name: string;
  amount: string;
  category: CategoryKey;
  pick: string;
  /** Set when a saving move or quick win is chosen instead of typing a purchase. */
  decision: Decision | null;
}

export const emptyDraft = (): AffordDraft => ({ name: '', amount: '', category: 'shopping', pick: '', decision: null });

/** Turn the page draft into a validated decision, or null if incomplete/invalid. */
export function draftToDecision(state: MonthState, draft: AffordDraft): Decision | null {
  const raw = draft.decision ?? { kind: 'buy', name: draft.name || 'it', amount: draft.amount, category: draft.category };
  return cleanDecision(state, raw);
}
