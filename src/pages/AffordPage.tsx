import { useMemo } from 'react';
import { Chip } from '../components/ui/Controls';
import { useToast } from '../components/ui/toastContext';
import { LIMITS, QUICK_PURCHASES } from '../config';
import { applyDecision, buildSavingMoves, computeSnapshot, judgeDecision } from '../domain/finance';
import { formatINR } from '../domain/money';
import type { Decision, MonthState, Snapshot } from '../domain/types';
import { useFinance } from '../state/financeContext';
import { draftToDecision, emptyDraft } from './affordDraft';
import type { AffordDraft } from './affordDraft';
import { PageHeading } from './PageHeading';

const ACTION_LABEL: Record<Decision['kind'], string> = {
  buy: 'I bought it',
  cancel: 'Cancel it',
  habit: "I'll do it",
  earn: 'Add the money',
};
const TONE_BG = { good: 'mint', warn: 'yellow', bad: 'pink' } as const;

interface CompareRowProps {
  label: string;
  before: number;
  after: number;
  format?: (value: number) => string;
  higherIsBetter?: boolean;
}

function CompareRow({ label, before, after, format = formatINR, higherIsBetter = true }: CompareRowProps) {
  const same = Math.abs(after - before) < 1;
  const better = higherIsBetter ? after > before : after < before;
  return (
    <div className="cmp-row">
      <dt>{label}</dt>
      <dd className="num">
        {same ? (
          format(after)
        ) : (
          <>
            <span className="was">
              <span className="sr-only">from </span>
              {format(before)}
            </span>{' '}
            <span className={better ? 'up' : 'down'}>
              <span className="sr-only">to </span>
              {format(after)}
            </span>
          </>
        )}
      </dd>
    </div>
  );
}

interface AffordResultProps {
  state: MonthState;
  snap: Snapshot;
  draft: AffordDraft;
  onClear: () => void;
  onConfirm: (decision: Decision, after: Snapshot) => void;
}

export function AffordResult({ state, snap, draft, onClear, onConfirm }: AffordResultProps) {
  const decision = draftToDecision(state, draft);
  const after = useMemo(
    () => (decision ? computeSnapshot(applyDecision(state, decision, () => 'preview')) : null),
    [decision, state],
  );

  if (!decision || !after) {
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
  const brokeFmt = (d: number) => (d > 30 ? 'Never' : `Day ${d}`);
  return (
    <div className={`answer tone-${TONE_BG[verdict.tone]}`}>
      <p className="label">{decision.kind === 'buy' ? `Can I afford ${decision.name}?` : decision.name}</p>
      <p className="word">{verdict.title}</p>
      <p className="verdict-msg">{verdict.message}</p>
      <dl className="compare">
        <CompareRow label="You can spend per day" before={snap.perDay} after={after.perDay} />
        <CompareRow label="Left at month end" before={snap.monthEnd} after={after.monthEnd} />
        <CompareRow label="You go broke on" before={snap.brokeOnDay ?? 31} after={after.brokeOnDay ?? 31} format={brokeFmt} />
        <CompareRow label="Money health" before={snap.score} after={after.score} format={(v) => `${Math.round(v)}/100`} />
      </dl>
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
