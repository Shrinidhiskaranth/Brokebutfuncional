import { Suspense, lazy, useCallback, useState } from 'react';
import type { SpendPreset } from './components/dialogs/SpendDialog';
import { AppShell } from './components/layout/AppShell';
import { PageSkeleton } from './components/ui/PageSkeleton';
import { MONTH_DAYS, SURPRISES } from './constants';
import { computeSnapshot, payDueBills } from './domain/finance';
import type { QuickWin } from './domain/finance';
import { emptyDraft } from './features/afford/affordDraft';
import type { AffordDraft } from './features/afford/affordDraft';
import { useFinance } from './hooks/useFinance';
import { useHashTab } from './hooks/useHashTab';
import { useTheme } from './hooks/useTheme';
import { useToast } from './hooks/useToast';
import { TodayPage } from './pages/TodayPage';
import { formatINR } from './utils/money';

// Secondary screens and dialogs are code-split: they load on first use,
// keeping the initial bundle small for a fast first paint.
const AffordPage = lazy(() => import('./pages/AffordPage').then((m) => ({ default: m.AffordPage })));
const MoneyPage = lazy(() => import('./pages/MoneyPage').then((m) => ({ default: m.MoneyPage })));
const SpendDialog = lazy(() => import('./components/dialogs/SpendDialog').then((m) => ({ default: m.SpendDialog })));

interface AppProps {
  /** Injectable for tests so the surprise expense is predictable. */
  random?: () => number;
}

export default function App({ random = Math.random }: AppProps) {
  const { state, dispatch, undo } = useFinance();
  const toast = useToast();
  const { tab, navigated, goTo } = useHashTab();
  const { theme, toggleTheme } = useTheme();
  const [draft, setDraft] = useState<AffordDraft>(emptyDraft);
  const [spendPreset, setSpendPreset] = useState<SpendPreset | null>(null);

  const nextDay = () => {
    if (state.day >= MONTH_DAYS) {
      dispatch({ type: 'NEXT_DAY' });
      toast(`Month ${state.month + 1} started. Fresh ₹10,000!`, { onUndo: undo });
      return;
    }
    // Preview the same pure update the reducer will make, to describe it.
    const preview = payDueBills({ ...state, day: state.day + 1 }, () => 'preview');
    const paidText = preview.paid.map((b) => `${b.name} ${formatINR(b.amount)}`).join(', ');
    const allowance = computeSnapshot(preview.state).leftToday;
    dispatch({ type: 'NEXT_DAY' });
    toast(
      `Day ${state.day + 1}. ${paidText ? `${paidText} paid automatically. ` : ''}You can spend ${formatINR(allowance)} today.`,
      { onUndo: undo },
    );
  };

  const openSpend = useCallback(() => setSpendPreset({ flow: 'spend' }), []);
  const openIncome = useCallback(() => setSpendPreset({ flow: 'income' }), []);
  const openSurprise = useCallback(() => {
    const pick = SURPRISES[Math.floor(random() * SURPRISES.length)] ?? SURPRISES[0];
    setSpendPreset({ flow: 'spend', amount: pick?.amount, note: pick?.note, category: 'other', unexpected: true });
  }, [random]);
  const tryWin = useCallback(
    (win: QuickWin) => {
      setDraft({ ...emptyDraft(), decision: win.decision });
      goTo('afford');
    },
    [goTo],
  );

  return (
    <AppShell tab={tab} onTab={goTo} day={state.day} onNextDay={nextDay} theme={theme} onToggleTheme={toggleTheme}>
      <Suspense fallback={<PageSkeleton />}>
        {tab === 'home' && (
          <TodayPage
            focusOnMount={navigated}
            onSpend={openSpend}
            onIncome={openIncome}
            onSurprise={openSurprise}
            onAfford={() => goTo('afford')}
            onSeeAll={() => goTo('money')}
            onTryWin={tryWin}
          />
        )}
        {tab === 'afford' && <AffordPage focusOnMount={navigated} draft={draft} onDraftChange={setDraft} onDone={() => goTo('home')} />}
        {tab === 'money' && <MoneyPage focusOnMount={navigated} />}
      </Suspense>

      {spendPreset && (
        <Suspense fallback={null}>
          <SpendDialog preset={spendPreset} onClose={() => setSpendPreset(null)} />
        </Suspense>
      )}
    </AppShell>
  );
}
