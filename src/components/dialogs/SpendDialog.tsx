import { useId, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { CATEGORIES, CATEGORY_KEYS, LIMITS } from '../../config';
import { computeSnapshot } from '../../domain/finance';
import { formatINR } from '../../domain/money';
import { parseAmount } from '../../domain/sanitize';
import type { CategoryKey } from '../../domain/types';
import { useFinance } from '../../state/financeContext';
import { Chip, Switch } from '../ui/Controls';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/toastContext';

export interface SpendPreset {
  amount?: number;
  note?: string;
  category?: CategoryKey;
  unexpected?: boolean;
}

interface SpendDialogProps {
  preset?: SpendPreset;
  onClose: () => void;
}

/** "I spent money" form with a live preview of what the spend does to the month. */
export function SpendDialog({ preset = {}, onClose }: SpendDialogProps) {
  const { state, snapshot, dispatch, undo } = useFinance();
  const toast = useToast();
  const amountRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const ids = { title: `${uid}-title`, amount: `${uid}-amount`, error: `${uid}-error`, note: `${uid}-note`, preview: `${uid}-preview` };

  const [amount, setAmount] = useState(preset.amount ? String(preset.amount) : '');
  const [category, setCategory] = useState<CategoryKey>(preset.category ?? 'food');
  const [note, setNote] = useState(preset.note ?? '');
  const [unexpected, setUnexpected] = useState(preset.unexpected ?? false);
  const [error, setError] = useState('');

  const parsed = parseAmount(amount);
  const preview = useMemo(() => {
    if (!parsed) return null;
    return computeSnapshot({
      ...state,
      transactions: [
        ...state.transactions,
        { id: 'preview', day: state.day, amount: parsed, category, note: '', kind: unexpected ? 'surprise' : 'spend' },
      ],
    });
  }, [parsed, state, category, unexpected]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!parsed) {
      setError('Enter an amount above ₹0, using numbers only.');
      amountRef.current?.focus();
      return;
    }
    dispatch({ type: 'LOG_SPEND', payload: { amount: parsed, category, note, unexpected } });
    const left = preview ? preview.leftToday : snapshot.leftToday;
    toast(`Saved ${formatINR(parsed)}. You can still spend ${formatINR(left)} today.`, { onUndo: undo });
    onClose();
  };

  return (
    <Modal labelledBy={ids.title} onClose={onClose} initialFocusRef={amountRef} className={unexpected ? 'tone-pink' : ''}>
      <form onSubmit={onSubmit} noValidate>
        <div className="sheet-h">
          <h2 id={ids.title}>{unexpected ? 'Uh oh, surprise expense' : 'I spent money'}</h2>
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

        <div className="field">
          <label htmlFor={ids.note}>
            Note <span className="muted">(optional)</span>
          </label>
          <input
            id={ids.note}
            className="input"
            maxLength={LIMITS.maxTextLength}
            autoComplete="off"
            placeholder="e.g. Pizza with friends"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="check">
          <Switch checked={unexpected} label="This was unexpected" onChange={() => setUnexpected((v) => !v)} />
          <span aria-hidden="true">
            This was unexpected <span className="muted small">(repair, doctor…)</span>
          </span>
        </div>

        <div className="live" id={ids.preview} aria-live="polite">
          {preview && parsed ? (
            <>
              <p>
                After this you can spend <strong>{formatINR(preview.perDay)}/day</strong> (now {formatINR(snapshot.perDay)}).
              </p>
              {!unexpected && parsed > snapshot.leftToday && (
                <p className="warn-text">That&apos;s {formatINR(parsed - snapshot.leftToday)} over today&apos;s limit.</p>
              )}
              {preview.free < 0 && <p className="warn-text">You won&apos;t have enough left for your bills.</p>}
            </>
          ) : (
            <p>Type an amount to see what it does to your month.</p>
          )}
        </div>

        <button type="submit" className="btn orange wide">
          Save
        </button>
      </form>
    </Modal>
  );
}
