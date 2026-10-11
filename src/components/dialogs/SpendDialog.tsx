import { useId, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CATEGORIES, CATEGORY_KEYS, LIMITS } from '../../constants';
import { computeSnapshot } from '../../domain/finance';
import { useFinance } from '../../hooks/useFinance';
import { useToast } from '../../hooks/useToast';
import type { CategoryKey, Transaction } from '../../types';
import { formatINR } from '../../utils/money';
import { parseAmount } from '../../utils/sanitize';
import { Chip, Switch } from '../ui/Controls';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';

export type MoneyFlow = 'spend' | 'income';

export interface SpendPreset {
  flow?: MoneyFlow;
  amount?: number;
  note?: string;
  category?: CategoryKey;
  unexpected?: boolean;
}

interface SpendDialogProps {
  preset?: SpendPreset;
  onClose: () => void;
}

/**
 * Log money going out ("I spent money", "Surprise expense") or coming in ("Money in"),
 * with a live preview of the new daily allowance before saving.
 */
export function SpendDialog({ preset = {}, onClose }: SpendDialogProps) {
  const { state, snapshot, dispatch, undo } = useFinance();
  const toast = useToast();
  const amountRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const ids = { title: `${uid}-title`, amount: `${uid}-amount`, error: `${uid}-error`, note: `${uid}-note`, preview: `${uid}-preview` };
  const income = preset.flow === 'income';

  const [amount, setAmount] = useState(preset.amount ? String(preset.amount) : '');
  const [category, setCategory] = useState<CategoryKey>(preset.category ?? 'food');
  const [note, setNote] = useState(preset.note ?? '');
  const [unexpected, setUnexpected] = useState(preset.unexpected ?? false);
  const [error, setError] = useState('');

  const parsed = parseAmount(amount);
  const preview = useMemo(() => {
    if (!parsed) return null;
    const tx: Transaction = income
      ? { id: 'preview', day: state.day, amount: parsed, category: 'other', note: '', kind: 'income' }
      : { id: 'preview', day: state.day, amount: parsed, category, note: '', kind: unexpected ? 'surprise' : 'spend' };
    return computeSnapshot({ ...state, transactions: [...state.transactions, tx] });
  }, [parsed, state, category, unexpected, income]);

  const title = income ? 'Money in' : unexpected ? 'Uh oh, surprise expense' : 'I spent money';

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!parsed) {
      setError('Enter an amount above ₹0, using numbers only.');
      amountRef.current?.focus();
      return;
    }
    if (income) {
      dispatch({ type: 'LOG_INCOME', payload: { amount: parsed, note } });
      toast(`Added ${formatINR(parsed)}. Daily allowance is now ${formatINR(preview?.perDay ?? snapshot.perDay)}.`, { onUndo: undo });
    } else {
      dispatch({ type: 'LOG_SPEND', payload: { amount: parsed, category, note, unexpected } });
      toast(`Saved ${formatINR(parsed)}. You can still spend ${formatINR(preview?.leftToday ?? snapshot.leftToday)} today.`, { onUndo: undo });
    }
    onClose();
  };

  return (
    <Modal
      labelledBy={ids.title}
      onClose={onClose}
      initialFocusRef={amountRef}
      className={income ? 'tone-mint' : unexpected ? 'tone-pink' : ''}
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="sheet-h">
          <h2 id={ids.title}>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        <div className="field">
          <label htmlFor={ids.amount} className="sr-only">
            Amount in rupees
          </label>
          <div className="amt-wrap">
            <span aria-hidden="true">₹</span>
            <input
              ref={amountRef}
              id={ids.amount}
              className="amt-in num"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              maxLength={9}
              value={amount}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? ids.error : ids.preview}
              onChange={(e) => {
                setAmount(e.target.value);
                if (error) setError('');
              }}
            />
          </div>
          {error && (
            <p className="error" id={ids.error} role="alert">
              {error}
            </p>
          )}
        </div>

        {!income && (
          <fieldset className="field">
            <legend>On what?</legend>
            <div className="chips">
              {CATEGORY_KEYS.map((key) => (
                <Chip key={key} pressed={category === key} onClick={() => setCategory(key)}>
                  {CATEGORIES[key].label}
                </Chip>
              ))}
            </div>
          </fieldset>
        )}

        <div className="field">
          <label htmlFor={ids.note}>
            {income ? 'From where?' : 'Note'} <span className="muted">(optional)</span>
          </label>
          <input
            id={ids.note}
            className="input"
            maxLength={LIMITS.maxTextLength}
            autoComplete="off"
            placeholder={income ? 'e.g. Pocket money, freelance gig' : 'e.g. Pizza with friends'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {!income && (
          <div className="check">
            <Switch checked={unexpected} label="This was unexpected" onChange={() => setUnexpected((v) => !v)} />
            <span aria-hidden="true">
              This was unexpected <span className="muted small">(repair, doctor…)</span>
            </span>
          </div>
        )}

        <div className="live" id={ids.preview} aria-live="polite">
          {preview && parsed ? (
            <>
              <p>
                Daily allowance: <strong>{formatINR(snapshot.perDay)}</strong> → <strong>{formatINR(preview.perDay)}</strong>
              </p>
              <p>
                Monthly forecast: <strong>{formatINR(snapshot.monthEnd)}</strong> → <strong>{formatINR(preview.monthEnd)}</strong>
              </p>
              {!income && !unexpected && parsed > snapshot.leftToday && (
                <p className="warn-text">That&apos;s {formatINR(parsed - snapshot.leftToday)} over today&apos;s limit.</p>
              )}
              {preview.free < 0 && <p className="warn-text">You won&apos;t have enough left for your bills.</p>}
            </>
          ) : (
            <p>Type an amount to see what it does to your month.</p>
          )}
        </div>

        <button type="submit" className="btn orange wide">
          {income ? 'Add money' : 'Save'}
        </button>
      </form>
    </Modal>
  );
}
