import { useCallback, useEffect, useState } from 'react';
import { SpendDialog } from './components/dialogs/SpendDialog';
import type { SpendPreset } from './components/dialogs/SpendDialog';
import { AppShell } from './components/layout/AppShell';
import { isTabId } from './components/layout/tabs';
import type { TabId } from './components/layout/tabs';
import { useToast } from './components/ui/toastContext';
import { MONTH_DAYS, SURPRISES } from './config';
import { computeSnapshot, payDueBills } from './domain/finance';
import { formatINR } from './domain/money';
import { AffordPage } from './pages/AffordPage';
import { emptyDraft } from './pages/affordDraft';
import type { AffordDraft } from './pages/affordDraft';
import { MoneyPage } from './pages/MoneyPage';
import { TodayPage } from './pages/TodayPage';
import { useFinance } from './state/financeContext';

function readTabFromHash(): TabId {
  const hash = typeof window === 'undefined' ? '' : window.location.hash.slice(1);
  return isTabId(hash) ? hash : 'home';
}

interface AppProps {
  /** Injectable for tests so the surprise expense is predictable. */
  random?: () => number;
}

export default function App({ random = Math.random }: AppProps) {
  const { state, dispatch, undo } = useFinance();
  const toast = useToast();
  const [tab, setTab] = useState<TabId>(readTabFromHash);
  const [navigated, setNavigated] = useState(false);
  const [draft, setDraft] = useState<AffordDraft>(emptyDraft);
  const [spendPreset, setSpendPreset] = useState<SpendPreset | null>(null);

  const goTo = useCallback((next: TabId) => {
    setTab(next);
    setNavigated(true);
    try {
      window.history.replaceState(null, '', `#${next}`);
    } catch {
      // Some sandboxed frames block history; navigation still works without it.
    }
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const onHash = () => setTab(readTabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

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

  const openSurprise = () => {
    const pick = SURPRISES[Math.floor(random() * SURPRISES.length)] ?? SURPRISES[0];
    setSpendPreset({ amount: pick?.amount, note: pick?.note, category: 'other', unexpected: true });
  };

  // Only move focus after the user navigates, never on first load.
  const focusOnMount = navigated;

  return (
    <AppShell tab={tab} onTab={goTo} day={state.day} onNextDay={nextDay}>
      {tab === 'home' && (
        <TodayPage
          focusOnMount={focusOnMount}
          onSpend={() => setSpendPreset({})}
          onSurprise={openSurprise}
          onAfford={() => goTo('afford')}
          onSeeAll={() => goTo('money')}
          onTryWin={(win) => {
            setDraft({ ...emptyDraft(), decision: win.decision });
            goTo('afford');
          }}
        />
      )}
      {tab === 'afford' && (
        <AffordPage focusOnMount={focusOnMount} draft={draft} onDraftChange={setDraft} onDone={() => goTo('home')} />
      )}
      {tab === 'money' && <MoneyPage focusOnMount={focusOnMount} />}

      {spendPreset && <SpendDialog preset={spendPreset} onClose={() => setSpendPreset(null)} />}
    </AppShell>
  );
}
