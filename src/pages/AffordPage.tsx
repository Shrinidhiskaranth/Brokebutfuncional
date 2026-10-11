import { useMemo } from 'react';
import { Chip } from '../components/ui/Controls';
import { useToast } from '../hooks/useToast';
import { LIMITS, QUICK_PURCHASES } from '../constants';
import { ForecastChart } from '../components/charts/ForecastChart';
import { applyDecision, buildForecast, buildSavingMoves, computeSnapshot, judgeDecision, riskRank } from '../domain/finance';
import { formatINR } from '../utils/money';
import type { Decision, MonthState, Snapshot } from '../types';
import { useFinance } from '../hooks/useFinance';
import { draftToDecision, emptyDraft } from '../features/afford/affordDraft';
import type { AffordDraft } from '../features/afford/affordDraft';
import { PageHeading } from './PageHeading';

const ACTION_LABEL: Record<Decision['kind'], string> = {
  buy: 'I bought it',
  cancel: 'Cancel it',
  habit: "I'll do it",
  earn: 'Add the money',
};
const TONE_BG = { good: 'mint', warn: 'yellow', bad: 'pink' } as const;

type Change = 'better' | 'worse' | 'same';

interface CompareRowProps {
  label: string;
  before: string;
  after: string;
  change: Change;
}

function CompareRow({ label, before, after, change }: CompareRowProps) {
  return (
    <div className="cmp-row">
      <dt>{label}</dt>
      <dd className="num">
        {change === 'same' ? (
          after
        ) : (
          <>
            <span className="was">
              <span className="sr-only">from </span>
              {before}
            </span>{' '}
            <span className={change === 'better' ? 'up' : 'down'}>
              <span className="sr-only">to </span>
              {after}
            </span>
          </>
        )}
      </dd>
    </div>
  );
}

/** Compare two numbers where a higher value is better (or lower, when `higherIsBetter` is false). */
function compareNumbers(before: number, after: number, higherIsBetter = true): Change {
  if (Math.abs(after - before) < 0.5) return 'same';
  return after > before === higherIsBetter ? 'better' : 'worse';
}

interface AffordResultProps {
  state: MonthState;
  snap: Snapshot;
  draft: AffordDraft;
  onClear: () => void;
  onConfirm: (decision: Decision, after: Snapshot) => void;
}

/**
 * The simulation result: a verdict plus before → after for the six things the
 * brief names: remaining balance, daily allowance, savings goals, monthly
 * forecast, financial risk and financial health.
 */
export function AffordResult({ state, snap, draft, onClear, onConfirm }: AffordResultProps) {
  const decision = draftToDecision(state, draft);
  const simulated = useMemo(() => (decision ? applyDecision(state, decision, () => 'preview') : null), [decision, state]);
  const after = useMemo(() => (simulated ? computeSnapshot(simulated) : null), [simulated]);

  if (!decision || !after || !simulated) {
    const typedBadAmount = !draft.decision && draft.amount.trim() !== '';
    return (
      <div className="answer idle">
        <p className="big-q" aria-hidden="true">
          ?
        </p>
        <p>{typedBadAmount ? 'Enter a price above ₹0 (numbers only).' : 'Type a price or tap an example. Your answer shows up here.'}</p>
      </div>
    );
  }

  const verdict = judgeDecision(snap, after, decision, state);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const riskChange: Change =
    riskRank(after.risk.level) === riskRank(snap.risk.level) ? 'same' : riskRank(after.risk.level) < riskRank(snap.risk.level) ? 'better' : 'worse';

  return (
    <div className={`answer tone-${TONE_BG[verdict.tone]}`}>
      <p className="label">{decision.kind === 'buy' ? `Can I afford ${decision.name}?` : decision.name}</p>
      <p className="word">{verdict.title}</p>
      <p className="verdict-msg">{verdict.message}</p>
      <dl className="compare">
        <CompareRow label="Remaining balance" before={formatINR(snap.free)} after={formatINR(after.free)} change={compareNumbers(snap.free, after.free)} />
        <CompareRow label="Daily allowance" before={formatINR(snap.perDay)} after={formatINR(after.perDay)} change={compareNumbers(snap.perDay, after.perDay)} />
        <CompareRow label="Savings goals funded" before={pct(snap.goalsFunded)} after={pct(after.goalsFunded)} change={compareNumbers(snap.goalsFunded * 100, after.goalsFunded * 100)} />
        <CompareRow label="Monthly forecast" before={formatINR(snap.monthEnd)} after={formatINR(after.monthEnd)} change={compareNumbers(snap.monthEnd, after.monthEnd)} />
        <CompareRow label="Financial risk" before={snap.risk.level} after={after.risk.level} change={riskChange} />
        <CompareRow label="Financial health" before={`${snap.score}/100`} after={`${after.score}/100`} change={compareNumbers(snap.score, after.score)} />
      </dl>
      <ForecastChart series={buildForecast(state, snap)} compare={buildForecast(simulated, after)} today={state.day} label="Monthly forecast" />
      <div className="two">
        <button type="button" className="btn" onClick={onClear}>
          {decision.kind === 'buy' ? 'Skip it' : 'Not now'}
        </button>
        <button type="button" className="btn ink" onClick={() => onConfirm(decision, after)}>
          {ACTION_LABEL[decision.kind]}
        </button>
      </div>
    </div>
  );
}

interface AffordPageProps {
  focusOnMount: boolean;
  draft: AffordDraft;
  onDraftChange: (draft: AffordDraft) => void;
  onDone: () => void;
}

export function AffordPage({ focusOnMount, draft, onDraftChange, onDone }: AffordPageProps) {
  const { state, snapshot, dispatch, undo } = useFinance();
  const toast = useToast();
  const typing = draft.decision === null;
  const moves = buildSavingMoves(state);

  const confirm = (decision: Decision, after: Snapshot) => {
    dispatch({ type: 'APPLY_DECISION', payload: decision });
    const msg: Record<Decision['kind'], string> = {
      buy: `Bought ${decision.name}.`,
      cancel: `${decision.name.replace(/^Cancel /, '')} cancelled.`,
      habit: `“${decision.name}” added to your plan.`,
      earn: 'Money added.',
    };
    toast(`${msg[decision.kind]} New daily limit: ${formatINR(after.perDay)}.`, { onUndo: undo });
    onDraftChange(emptyDraft());
    onDone();
  };

  const updateTyped = (patch: Partial<Pick<AffordDraft, 'name' | 'amount'>>) => {
    const base = typing ? draft : emptyDraft();
    onDraftChange({ ...base, ...patch, pick: '', decision: null });
  };

  return (
    <>
      <PageHeading focusOnMount={focusOnMount} subtitle="Check before you buy. Nothing changes until you say so.">
        Can I afford it?
      </PageHeading>
      <div className="grid">
        <div className="s5 col">
          <form className="card form-card" aria-labelledby="buy-h" noValidate onSubmit={(e) => e.preventDefault()}>
            <h2 id="buy-h" className="card-title">
              I want to buy…
            </h2>
            <div className="field">
              <label htmlFor="afford-name">What is it?</label>
              <input
                id="afford-name"
                className="input"
                autoComplete="off"
                maxLength={LIMITS.maxTextLength}
                placeholder="e.g. Headphones"
                value={typing ? draft.name : ''}
                onChange={(e) => updateTyped({ name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="afford-amount">Price (₹)</label>
              <div className="price">
                <span aria-hidden="true">₹</span>
                <input
                  id="afford-amount"
                  className="input"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={9}
                  placeholder="0"
                  value={typing ? draft.amount : ''}
                  onChange={(e) => updateTyped({ amount: e.target.value })}
                />
              </div>
            </div>
            <fieldset className="field">
              <legend>Or tap an example</legend>
              <div className="chips">
                {QUICK_PURCHASES.map((q) => (
                  <Chip
                    key={q.pick}
                    pressed={draft.pick === q.pick}
                    onClick={() =>
                      onDraftChange({ name: q.name, amount: String(q.amount), category: q.category, pick: q.pick, decision: null })
                    }
                  >
                    {q.name} · {formatINR(q.amount)}
                  </Chip>
                ))}
              </div>
            </fieldset>
          </form>

          <section className="card tone-lilac" aria-labelledby="moves-h">
            <h2 id="moves-h" className="card-title">
              Or try a money-saving move
            </h2>
            <p className="small muted">See how much it helps first.</p>
            <div className="chips">
              {moves.map((m) => (
                <Chip key={m.pick} pressed={draft.pick === m.pick} onClick={() => onDraftChange({ ...emptyDraft(), pick: m.pick, decision: m.decision })}>
                  {m.label}
                </Chip>
              ))}
            </div>
          </section>
        </div>

        <section className="card s7 result-card" aria-labelledby="result-h">
          <h2 id="result-h" className="sr-only">
            Answer
          </h2>
          <div aria-live="polite">
            <AffordResult
              state={state}
              snap={snapshot}
              draft={draft}
              onClear={() => onDraftChange(emptyDraft())}
              onConfirm={confirm}
            />
          </div>
        </section>
      </div>
    </>
  );
}
