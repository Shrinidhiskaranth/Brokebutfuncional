import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ConfirmDialog } from '../components/dialogs/ConfirmDialog';
import { Chip, Switch } from '../components/ui/Controls';
import { Icon } from '../components/ui/Icon';
import { TransactionList } from '../components/ui/TransactionList';
import { useToast } from '../components/ui/toastContext';
import { LIMITS, MONTH_DAYS } from '../config';
import { clamp, formatINR } from '../domain/money';
import { parseAmount, parseDay, sanitizeText } from '../domain/sanitize';
import type { Bill, BillType } from '../domain/types';
import { useFinance } from '../state/financeContext';
import { PageHeading } from './PageHeading';

type BillErrors = Partial<Record<'name' | 'amount' | 'due', string>>;

function BillStatus({ bill }: { bill: Bill }) {
  if (!bill.active) return <span className="pill pill-off">Cancelled</span>;
  if (bill.paid) return <span className="pill pill-paid">Paid</span>;
  return <span className="pill pill-due">Day {bill.due}</span>;
}

function AddBillForm({ onDone }: { onDone: () => void }) {
  const { state, dispatch, undo } = useFinance();
  const toast = useToast();
  const uid = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState(String(clamp(state.day + 2, 1, MONTH_DAYS)));
  const [type, setType] = useState<BillType>('bill');
  const [errors, setErrors] = useState<BillErrors>({});

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = { name: sanitizeText(name), amount: parseAmount(amount), due: parseDay(due) };
    const next: BillErrors = {};
    if (!clean.name) next.name = 'Give the bill a name.';
    if (!clean.amount) next.amount = 'Enter an amount above ₹0.';
    if (!clean.due) next.due = `Pick a day from 1 to ${MONTH_DAYS}.`;
    setErrors(next);
    const firstError = (['name', 'amount', 'due'] as const).find((k) => next[k]);
    if (firstError) {
      document.getElementById(`${uid}-${firstError}`)?.focus();
      return;
    }
    dispatch({ type: 'ADD_BILL', payload: { ...clean, type } });
    toast(`${clean.name} added.`, { onUndo: undo });
    onDone();
  };

  const fieldProps = (key: keyof BillErrors) => ({
    id: `${uid}-${key}`,
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `${uid}-${key}-err` : undefined,
  });
  const fieldError = (key: keyof BillErrors) =>
    errors[key] ? (
      <p className="error" id={`${uid}-${key}-err`}>
        {errors[key]}
      </p>
    ) : null;

  return (
    <form className="add-bill" aria-label="Add a bill" noValidate onSubmit={onSubmit}>
      <div className="two">
        <div className="field">
          <label htmlFor={`${uid}-name`}>Name</label>
          <input
            {...fieldProps('name')}
            ref={nameRef}
            className="input"
            maxLength={LIMITS.maxTextLength}
            autoComplete="off"
            placeholder="e.g. Gym"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {fieldError('name')}
        </div>
        <div className="field">
          <label htmlFor={`${uid}-amount`}>Amount (₹)</label>
          <input
            {...fieldProps('amount')}
            className="input"
            inputMode="numeric"
            autoComplete="off"
            maxLength={9}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {fieldError('amount')}
        </div>
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor={`${uid}-due`}>Due on day (1–{MONTH_DAYS})</label>
          <input
            {...fieldProps('due')}
            className="input"
            inputMode="numeric"
            autoComplete="off"
            maxLength={2}
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
          {fieldError('due')}
        </div>
        <div className="field">
          <label htmlFor={`${uid}-type`}>Type</label>
          <select
            id={`${uid}-type`}
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value === 'subscription' ? 'subscription' : 'bill')}
          >
            <option value="bill">Bill</option>
            <option value="subscription">Subscription</option>
          </select>
        </div>
      </div>
      <div className="two">
        <button type="button" className="btn" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn orange">
          Add it
        </button>
      </div>
    </form>
  );
}

type ResetKind = 'fresh' | 'example';

export function MoneyPage({ focusOnMount }: { focusOnMount: boolean }) {
  const { state, snapshot, dispatch, undo } = useFinance();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [reset, setReset] = useState<ResetKind | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);

  const bills = state.bills.slice().sort((a, b) => a.due - b.due);
  const history = state.transactions.slice().sort((a, b) => b.day - a.day);

  const closeForm = () => {
    setAdding(false);
    requestAnimationFrame(() => addButtonRef.current?.focus());
  };

  return (
    <>
      <PageHeading focusOnMount={focusOnMount} subtitle="Bills, savings and everything you've spent.">
        My money
      </PageHeading>
      <div className="grid">
        <section className="card s7" aria-labelledby="bills-h">
          <div className="card-h">
            <h2 id="bills-h" className="card-title">
              Bills &amp; subscriptions
            </h2>
            <span className="pill pill-due">{formatINR(snapshot.billsLeft)} still to pay</span>
          </div>
          <p className="small muted">Paid automatically on the due day. Flip a switch to cancel a subscription.</p>
          {bills.length > 0 ? (
            <ul className="list">
              {bills.map((b) => (
                <li className={`row${b.active ? '' : ' is-off'}`} key={b.id}>
                  <div className="row-l">
                    <span className={`ic tone-${b.type === 'bill' ? 'sky' : 'pink'}`}>
                      <Icon name={b.type === 'bill' ? 'bill' : 'fun'} />
                    </span>
                    <div className="row-text">
                      <p className="row-t">{b.name}</p>
                      <p className="row-s">
                        {b.type === 'bill' ? 'Bill' : 'Subscription'} · {formatINR(b.amount)}
                        {b.type === 'subscription' ? '/mo' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="row-r">
                    <BillStatus bill={b} />
                    {b.type === 'subscription' && (
                      <Switch
                        checked={b.active}
                        label={`${b.name} subscription`}
                        onChange={() => {
                          dispatch({ type: 'TOGGLE_SUBSCRIPTION', payload: { id: b.id } });
                          toast(`${b.name} ${b.active ? 'cancelled' : 'turned back on'}.`, { onUndo: undo });
                        }}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No bills yet. Add rent, recharge or subscriptions below.</p>
          )}
          {adding ? (
            <AddBillForm onDone={closeForm} />
          ) : (
            <button ref={addButtonRef} type="button" className="btn sm add-btn" onClick={() => setAdding(true)}>
              <Icon name="plus" /> Add a bill
            </button>
          )}
        </section>

        <section className="card tone-mint s5" aria-labelledby="goals-h">
          <div className="card-h">
            <h2 id="goals-h" className="card-title">
              Savings goals
            </h2>
            <span className="pill">{formatINR(snapshot.saved)} saved</span>
          </div>
          <p className="small">Money you save here comes out of what you can spend.</p>
          <ul className="goals">
            {state.goals.map((g) => {
              const have = snapshot.savedByGoal[g.id] ?? 0;
              const pct = clamp((have / g.target) * 100, 0, 100);
              return (
                <li className="goal" key={g.id}>
                  <div className="goal-h">
                    <p className="goal-name">{g.name}</p>
                    <p className="num small">
                      {formatINR(have)} / {formatINR(g.target)}
                    </p>
                  </div>
                  <div
                    className="prog"
                    role="progressbar"
                    aria-label={`${g.name} progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(pct)}
                  >
                    <i style={{ width: `${pct}%` }} />
                  </div>
                  {pct >= 100 ? (
                    <p className="strong">Goal reached!</p>
                  ) : (
                    <div className="chips">
                      {[100, 250].map((amount) => (
                        <Chip
                          key={amount}
                          disabled={snapshot.free < amount}
                          onClick={() => {
                            dispatch({ type: 'SAVE_TO_GOAL', payload: { goalId: g.id, amount } });
                            toast(`${formatINR(amount)} saved to ${g.name}.`, { onUndo: undo });
                          }}
                        >
                          + Save {formatINR(amount)}
                        </Chip>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card s12" aria-labelledby="history-h">
          <div className="card-h">
            <h2 id="history-h" className="card-title">
              History
            </h2>
            <p className="small muted">{history.length} entries</p>
          </div>
          <TransactionList
            items={history}
            empty="Nothing yet."
            onDelete={(tx) => {
              dispatch({ type: 'DELETE_TRANSACTION', payload: { id: tx.id } });
              toast(`Deleted “${tx.note}”.`, { onUndo: undo });
            }}
          />
        </section>

        <div className="s12 reset-row">
          <button type="button" className="btn sm" onClick={() => setReset('fresh')}>
            Start my own month
          </button>
          <button type="button" className="btn sm" onClick={() => setReset('example')}>
            Reload example month
          </button>
        </div>
      </div>

      {reset && (
        <ConfirmDialog
          title={reset === 'fresh' ? 'Start your own month?' : 'Reload the example month?'}
          message={
            reset === 'fresh'
              ? 'This clears the example and starts Day 1 with ₹10,000. You can undo right after.'
              : 'This replaces your current month with the example student month.'
          }
          confirmLabel={reset === 'fresh' ? 'Start fresh' : 'Reload example'}
          onClose={() => setReset(null)}
          onConfirm={() => {
            dispatch({ type: reset === 'fresh' ? 'START_FRESH' : 'LOAD_EXAMPLE' });
            toast(reset === 'fresh' ? 'Fresh start: ₹10,000 for 30 days.' : 'Example month loaded.', { onUndo: undo });
            setReset(null);
          }}
        />
      )}
    </>
  );
}
