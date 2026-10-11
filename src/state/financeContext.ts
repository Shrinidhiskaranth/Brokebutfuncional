import { createContext, useContext } from 'react';
import type { MonthState, Snapshot } from '../domain/types';
import type { Action } from './reducer';

export interface FinanceContextValue {
  state: MonthState;
  snapshot: Snapshot;
  /** Returns nothing; read the new state from the next render. */
  dispatch: (action: Action) => void;
  undo: () => void;
  canUndo: boolean;
}

export const FinanceContext = createContext<FinanceContextValue | null>(null);

export function useFinance(): FinanceContextValue {
  const value = useContext(FinanceContext);
  if (!value) throw new Error('useFinance must be used inside <FinanceProvider>');
  return value;
}
