import { createContext } from 'react';
import type { MonthState, Snapshot } from '../types';
import type { Action } from '../state/reducer';

export interface FinanceContextValue {
  state: MonthState;
  snapshot: Snapshot;
  /** Returns nothing; read the new state from the next render. */
  dispatch: (action: Action) => void;
  undo: () => void;
  canUndo: boolean;
}

export const FinanceContext = createContext<FinanceContextValue | null>(null);
