import { CategoryBreakdown, HealthCard, Hero, MoneySplit, MonthCalendar, QuickWins, Welcome } from '../components/dashboard/Dashboard';
import { TransactionList } from '../components/ui/TransactionList';
import { useToast } from '../components/ui/toastContext';
import type { QuickWin } from '../domain/finance';
import { useFinance } from '../state/financeContext';
import { PageHeading } from './PageHeading';

interface TodayPageProps {
  focusOnMount: boolean;
  onSpend: () => void;
  onSurprise: () => void;
  onAfford: () => void;
  onSeeAll: () => void;
  onTryWin: (win: QuickWin) => void;
}

export function TodayPage({ focusOnMount, onSpend, onSurprise, onAfford, onSeeAll, onTryWin }: TodayPageProps) {
  const { state, snapshot, dispatch, undo } = useFinance();
  const toast = useToast();
  const recent = state.transactions
    .filter((t) => t.kind !== 'save')
    .slice()
    .sort((a, b) => b.day - a.day)
    .slice(0, 5);

  return (
    <>
      <PageHeading focusOnMount={focusOnMount}>Hey, here&apos;s your money today</PageHeading>
      {state.welcome && <Welcome onDismiss={() => dispatch({ type: 'DISMISS_WELCOME' })} />}
      <div className="grid">
        <Hero snap={snapshot} onSpend={onSpend} onSurprise={onSurprise} onAfford={onAfford} />
        <HealthCard snap={snapshot} />
        <MoneySplit snap={snapshot} />
        <QuickWins state={state} snap={snapshot} onTry={onTryWin} />
        <MonthCalendar state={state} snap={snapshot} />
        <CategoryBreakdown snap={snapshot} />
        <section className="card s12" aria-labelledby="recent-h">
          <div className="card-h">
            <h2 id="recent-h" className="card-title">
              Recent
            </h2>
            <button type="button" className="link small" onClick={onSeeAll}>
              See all
            </button>
          </div>
          <TransactionList
            items={recent}
            empty="Nothing yet. Tap “I spent money” to start."
            onDelete={(tx) => {
              dispatch({ type: 'DELETE_TRANSACTION', payload: { id: tx.id } });
              toast(`Deleted “${tx.note}”.`, { onUndo: undo });
            }}
          />
        </section>
      </div>
    </>
  );
}
