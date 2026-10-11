import { CATEGORIES } from '../../config';
import type { ToneColor } from '../../config';
import { formatINR } from '../../domain/money';
import type { Transaction, TransactionKind } from '../../domain/types';
import { Icon } from './Icon';
import type { IconName } from './Icon';

const KIND_META: Record<Exclude<TransactionKind, 'spend'>, { label: string; tone: ToneColor; icon: IconName }> = {
  oneoff: { label: 'Purchase', tone: 'lilac', icon: 'shopping' },
  surprise: { label: 'Unexpected', tone: 'pink', icon: 'bolt' },
  bill: { label: 'Bill · paid automatically', tone: 'sky', icon: 'bill' },
  income: { label: 'Money in', tone: 'mint', icon: 'coin' },
  save: { label: 'Saved to goal', tone: 'mint', icon: 'piggy' },
};

function metaFor(tx: Transaction): { label: string; tone: ToneColor; icon: IconName } {
  if (tx.kind === 'spend') {
    const cat = CATEGORIES[tx.category];
    return { label: cat.label, tone: cat.tone, icon: tx.category };
  }
  return KIND_META[tx.kind];
}

interface TransactionRowProps {
  tx: Transaction;
  onDelete?: (tx: Transaction) => void;
}

export function TransactionRow({ tx, onDelete }: TransactionRowProps) {
  const meta = metaFor(tx);
  const sign = tx.kind === 'income' ? '+' : tx.kind === 'save' ? '' : '−';
  return (
    <li className="row">
      <div className="row-l">
        <span className={`ic tone-${meta.tone}`}>
          <Icon name={meta.icon} />
        </span>
        <div className="row-text">
          <p className="row-t">{tx.note}</p>
          <p className="row-s">
            Day {tx.day} · {meta.label}
          </p>
        </div>
      </div>
      <div className="row-r">
        <span className={`amt num${tx.kind === 'income' ? ' plus' : ''}`}>
          {sign}
          {formatINR(tx.amount)}
        </span>
        {onDelete && tx.kind !== 'bill' && (
          <button
            type="button"
            className="icon-btn"
            aria-label={`Delete ${tx.note}, ${formatINR(tx.amount)}`}
            onClick={() => onDelete(tx)}
          >
            <Icon name="trash" />
          </button>
        )}
      </div>
    </li>
  );
}

interface TransactionListProps {
  items: Transaction[];
  empty: string;
  onDelete?: (tx: Transaction) => void;
}

export function TransactionList({ items, empty, onDelete }: TransactionListProps) {
  if (items.length === 0) return <p className="muted">{empty}</p>;
  return (
    <ul className="list">
      {items.map((tx) => (
        <TransactionRow key={tx.id} tx={tx} onDelete={onDelete} />
      ))}
    </ul>
  );
}
