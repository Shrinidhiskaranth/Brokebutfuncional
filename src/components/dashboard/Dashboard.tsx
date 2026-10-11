/** Cards on the Today page. Each one reads from the shared finance snapshot. */
import { memo } from 'react';
import { CATEGORIES, CATEGORY_KEYS, MONTH_DAYS } from '../../constants';
import { buildCalendar, buildForecast, buildQuickWins, statusLine } from '../../domain/finance';
import type { DayStatus, QuickWin } from '../../domain/finance';
import { formatINR } from '../../utils/money';
import type { MonthState, Snapshot } from '../../types';
import { ForecastChart } from '../charts/ForecastChart';
import { Icon } from '../ui/Icon';

export function Welcome({ onDismiss }: { onDismiss: () => void }) {
  return (
    <section className="card tone-sky welcome" aria-labelledby="welcome-h">
      <h2 id="welcome-h">How it works</h2>
      <ol className="steps">
        <li>
          You get <strong>₹10,000 for 30 days</strong>. Bills are set aside for you automatically.
        </li>
        <li>
          The big yellow number is <strong>what you can spend today</strong> and still make it.
        </li>
        <li>
          Want something? Tap <strong>Can I afford it?</strong> before you buy.
        </li>
      </ol>
      <button type="button" className="btn sm" onClick={onDismiss}>
        Got it
      </button>
    </section>
  );
}

interface HeroProps {
  snap: Snapshot;
  onSpend: () => void;
  onIncome: () => void;
  onSurprise: () => void;
  onAfford: () => void;
}

/** The one number that matters most: what you can spend today and still last the month. */
export const Hero = memo(function Hero({ snap, onSpend, onIncome, onSurprise, onAfford }: HeroProps) {
  const status = statusLine(snap);
  return (
    <section className="card tone-yellow hero s8" aria-labelledby="hero-label">
      <p className="sticker" aria-hidden="true">
        <b>{snap.daysLeft}</b>
        <span>days left</span>
      </p>
      <h2 className="label" id="hero-label">
        You can spend today
      </h2>
      <p className="big num" key={Math.round(snap.leftToday)} data-testid="today-allowance">
        {formatINR(snap.leftToday)}
      </p>
      <p className="sub">
        {snap.spentToday > 0 ? (
          <>
            You&apos;ve spent <strong>{formatINR(snap.spentToday)}</strong> of today&apos;s{' '}
            <strong>{formatINR(snap.perDay)}</strong>.
          </>
        ) : (
          <>That&apos;s your daily limit for the next {snap.daysLeft} days.</>
        )}
      </p>
      <p className={`status status-${status.tone}`}>
        <span className="dot" aria-hidden="true" />
        <span>{status.text}</span>
      </p>
      <div className="row-btns">
        <button type="button" className="btn orange" onClick={onSpend}>
          <Icon name="plus" /> I spent money
        </button>
        <button type="button" className="btn" onClick={onIncome}>
          <Icon name="coin" /> Money in
        </button>
        <button type="button" className="btn" onClick={onSurprise}>
          <Icon name="bolt" /> Surprise expense
        </button>
        <button type="button" className="btn" onClick={onAfford}>
          Can I afford it?
        </button>
      </div>
    </section>
  );
});

const RING_C = 2 * Math.PI * 60;

/** Financial health score (0–100) with an explanation of its five factors. */
export const HealthCard = memo(function HealthCard({ snap }: { snap: Snapshot }) {
  return (
    <section className="card tone-pink health s4" aria-labelledby="health-h">
      <h2 className="label center" id="health-h">
        Financial health
      </h2>
      <div className="ring" role="img" aria-label={`Financial health ${snap.score} out of 100: ${snap.mood.label}`}>
        <svg viewBox="0 0 150 150" aria-hidden="true" focusable="false">
          <circle cx="75" cy="75" r="60" className="ring-base" />
          <circle
            cx="75"
            cy="75"
            r="60"
            className={`ring-value ring-${snap.mood.tone}`}
            strokeDasharray={RING_C.toFixed(1)}
            strokeDashoffset={(RING_C * (1 - snap.score / 100)).toFixed(1)}
          />
        </svg>
        <p className="ring-c" aria-hidden="true">
          <b>{snap.score}</b>
          <span>out of 100</span>
        </p>
      </div>
      <p className="mood">{snap.mood.label}</p>
      <details>
        <summary>Why this score?</summary>
        <ul className="why">
          {snap.factors.map((f) => (
            <li key={f.label}>
              <span>{f.label}</span>
              <span className="mini-bar" aria-hidden="true">
                <i style={{ width: `${(f.value / f.max) * 100}%` }} />
              </span>
              <b className="num">
                {Math.round(f.value)}/{f.max}
              </b>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
});

/** The four numbers the brief cares about, side by side. */
export const MonthMetrics = memo(function MonthMetrics({ snap }: { snap: Snapshot }) {
  const metrics = [
    { label: 'Remaining balance', value: formatINR(snap.free), note: 'after bills are set aside', bad: snap.free < 0 },
    { label: 'Daily allowance', value: formatINR(snap.perDay), note: `for the next ${snap.daysLeft} days`, bad: false },
    { label: 'Monthly forecast', value: formatINR(snap.monthEnd), note: `left on Day ${MONTH_DAYS} at your pace`, bad: snap.monthEnd < 0 },
  ];
  return (
    <section className="metrics s12" aria-label="Month at a glance">
      {metrics.map((m) => (
        <div className="metric card" key={m.label}>
          <p className="label">{m.label}</p>
          <p className={`metric-v num${m.bad ? ' down' : ''}`}>{m.value}</p>
          <p className="small muted">{m.note}</p>
        </div>
      ))}
      <div className={`metric card risk risk-${snap.risk.tone}`}>
        <p className="label">Financial risk</p>
        <p className="metric-v">
          <span className={`risk-badge risk-badge-${snap.risk.tone}`}>{snap.risk.level}</span>
        </p>
        <p className="small muted">{snap.risk.reason}</p>
      </div>
    </section>
  );
});

/** Monthly forecast: balance history plus the projection to Day 30. */
export const ForecastCard = memo(function ForecastCard({ state, snap }: { state: MonthState; snap: Snapshot }) {
  return (
    <section className="card s12" aria-labelledby="forecast-h">
      <div className="card-h">
        <h2 id="forecast-h" className="card-title">
          Monthly forecast
        </h2>
        <p className={`small strong${snap.monthEnd < 0 ? ' down' : ''}`}>
          Day {MONTH_DAYS}: {formatINR(snap.monthEnd)}
        </p>
      </div>
      <ForecastChart series={buildForecast(state, snap)} today={state.day} label="Monthly forecast" />
    </section>
  );
});

export const MoneySplit = memo(function MoneySplit({ snap }: { snap: Snapshot }) {
  const parts = [
    { label: 'Spent', value: snap.spent, tone: 'pink', note: 'incl. bills paid' },
    { label: 'Saved', value: snap.saved, tone: 'mint', note: 'in your goals' },
    { label: 'Bills coming', value: snap.billsLeft, tone: 'sky', note: 'kept aside for you' },
    { label: 'Free to use', value: Math.max(0, snap.free), tone: 'yellow', note: `for ${snap.daysLeft} more days` },
  ];
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const summary = parts.map((p) => `${p.label} ${formatINR(p.value)}`).join(', ');
  return (
    <section className="card s8" aria-labelledby="split-h">
      <h2 id="split-h" className="card-title">
        Where your {formatINR(snap.total)} is
      </h2>
      <div className="split" role="img" aria-label={summary}>
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <i key={p.label} className={`tone-${p.tone}`} style={{ width: `${(p.value / total) * 100}%` }} />
          ))}
      </div>
      <dl className="keys">
        {parts.map((p) => (
          <div className="key" key={p.label}>
            <dt>
              <span className={`sw tone-${p.tone}`} aria-hidden="true" />
              {p.label}
            </dt>
            <dd>
              <b className="num">{formatINR(p.value)}</b>
              <span>{p.note}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
});

interface QuickWinsProps {
  state: MonthState;
  snap: Snapshot;
  onTry: (win: QuickWin) => void;
}

export const QuickWins = memo(function QuickWins({ state, snap, onTry }: QuickWinsProps) {
  const wins = buildQuickWins(state, snap);
  return (
    <section className="card tone-mint s4" aria-labelledby="wins-h">
      <h2 id="wins-h" className="card-title">
        Quick wins
      </h2>
      {wins.length > 0 ? (
        <ul className="tips">
          {wins.map((w) => (
            <li className="tip" key={w.title}>
              <div>
                <p className="tip-t">{w.title}</p>
                <p className="small muted">{w.detail}</p>
              </div>
              <button type="button" className="btn sm" aria-label={`See effect: ${w.title}`} onClick={() => onTry(w)}>
                Try
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>You&apos;re doing everything right.</p>
      )}
    </section>
  );
});

const DAY_STATUS_TEXT: Record<DayStatus, string> = {
  under: 'under limit',
  over: 'over limit',
  today: 'today',
  future: 'coming up',
};

export const MonthCalendar = memo(function MonthCalendar({ state, snap }: { state: MonthState; snap: Snapshot }) {
  const days = buildCalendar(state, snap);
  return (
    <section className="card s7" aria-labelledby="cal-h">
      <div className="card-h">
        <h2 id="cal-h" className="card-title">
          Your 30 days
        </h2>
        <p className="small muted">Green = spent under {formatINR(snap.plannedDaily)} that day</p>
      </div>
      <ol className="cal">
        {days.map((d) => (
          <li key={d.day} className={`cal-${d.status}${d.hasBill ? ' has-bill' : ''}`}>
            <span aria-hidden="true">{d.day}</span>
            <span className="sr-only">
              {`Day ${d.day}, ${DAY_STATUS_TEXT[d.status]}${d.status === 'future' ? '' : `, spent ${formatINR(d.spent)}`}${
                d.hasBill ? ', bill due' : ''
              }`}
            </span>
          </li>
        ))}
      </ol>
      <ul className="legend" aria-label="Legend">
        <li>
          <i className="tone-mint" aria-hidden="true" />
          Under limit
        </li>
        <li>
          <i className="tone-pink" aria-hidden="true" />
          Over limit
        </li>
        <li>
          <i className="tone-orange" aria-hidden="true" />
          Today
        </li>
        <li>
          <i className="legend-dot" aria-hidden="true" />
          Bill day
        </li>
      </ul>
    </section>
  );
});

export const CategoryBreakdown = memo(function CategoryBreakdown({ snap }: { snap: Snapshot }) {
  const cats = CATEGORY_KEYS.map((key) => ({ key, value: snap.byCategory[key] ?? 0 }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
  const max = cats[0]?.value ?? 1;
  return (
    <section className="card s5" aria-labelledby="cat-h">
      <h2 id="cat-h" className="card-title">
        Spent on
      </h2>
      {cats.length > 0 ? (
        <ul className="cats">
          {cats.map(({ key, value }) => {
            const c = CATEGORIES[key];
            return (
              <li className="cat" key={key}>
                <span className={`ic tone-${c.tone}`}>
                  <Icon name={key} />
                </span>
                <span>{c.label}</span>
                <span className="bar" aria-hidden="true">
                  <i className={`tone-${c.tone}`} style={{ width: `${(value / max) * 100}%` }} />
                </span>
                <b className="num">{formatINR(value)}</b>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">Nothing spent yet.</p>
      )}
    </section>
  );
});
