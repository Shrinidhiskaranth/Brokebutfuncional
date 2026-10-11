import { useContext } from 'react';
import { FinanceContext } from '../context/financeContext';
import type { FinanceContextValue } from '../context/financeContext';

/** Access the month state, the derived snapshot and the dispatcher. */
export function useFinance(): FinanceContextValue {
  const value = useContext(FinanceContext);
  if (!value) throw new Error('useFinance must be used inside <FinanceProvider>');
  return value;
}
