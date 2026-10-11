import { useCallback, useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import { computeSnapshot } from '../domain/finance';
import { createExampleMonth } from '../domain/months';
import type { IdFactory, MonthState } from '../domain/types';
import { FinanceContext } from './financeContext';
import type { FinanceContextValue } from './financeContext';
import { newId as defaultNewId } from './ids';
import { historyReducer } from './reducer';
import type { Action, HistoryAction, HistoryState } from './reducer';
import { loadState, saveState } from './storage';

interface FinanceProviderProps {
  children: ReactNode;
  /** Starting month (tests). Defaults to saved state, then the example month. */
  initialState?: MonthState;
  newId?: IdFactory;
  persist?: boolean;
}

export function FinanceProvider({ children, initialState, newId = defaultNewId, persist = true }: FinanceProviderProps) {
  const [history, send] = useReducer(
    (h: HistoryState, action: HistoryAction) => historyReducer(h, action, newId),
    undefined,
    (): HistoryState => ({
      present: initialState ?? (persist ? loadState() : null) ?? createExampleMonth(newId),
      past: null,
    }),
  );

  useEffect(() => {
    if (persist) saveState(history.present);
  }, [history.present, persist]);

  const snapshot = useMemo(() => computeSnapshot(history.present), [history.present]);
  const dispatch = useCallback((action: Action) => send(action), []);
  const undo = useCallback(() => send({ type: 'UNDO' }), []);

  const value = useMemo<FinanceContextValue>(
    () => ({ state: history.present, snapshot, dispatch, undo, canUndo: history.past !== null }),
    [history, snapshot, dispatch, undo],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}
