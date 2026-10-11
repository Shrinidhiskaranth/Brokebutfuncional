import { memo } from 'react';
import { MONTH_DAYS } from '../../constants';
import type { ForecastPoint } from '../../types';
import { formatINR } from '../../utils/money';

interface ForecastChartProps {
  /** Balance per day: history then projection. */
  series: ForecastPoint[];
  /** Optional "what if" projection drawn on top, for before/after comparison. */
  compare?: ForecastPoint[];
  today: number;
  label: string;
}

const W = 600;
const H = 220;
const PAD = { top: 16, right: 16, bottom: 28, left: 52 };

/** Pick a round grid step so there are 3–6 horizontal lines. */
function niceStep(range: number): number {
  const steps = [500, 1000, 2000, 2500, 5000, 10000, 20000];
  return steps.find((s) => range / s <= 5) ?? 50000;
}

function toPath(points: ForecastPoint[], x: (d: number) => number, y: (v: number) => number): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.day).toFixed(1)} ${y(p.balance).toFixed(1)}`).join(' ');
}

const shortINR = (v: number): string => {
  if (v === 0) return '₹0';
  const k = Math.abs(v) / 1000;
  return `${v < 0 ? '−' : ''}₹${Number.isInteger(k) ? k : k.toFixed(1)}k`;
};

/**
 * Monthly forecast line chart. History is solid, the projection dashed, and an
 * optional comparison line shows the effect of a decision. Pure SVG, no library.
 */
export const ForecastChart = memo(function ForecastChart({ series, compare, today, label }: ForecastChartProps) {
  const values = [...series, ...(compare ?? [])].map((p) => p.balance);
  const step = niceStep(Math.max(...values, 0) - Math.min(...values, 0) || 1000);
  const max = Math.ceil(Math.max(...values, 0) / step) * step || step;
  const min = Math.min(0, Math.floor(Math.min(...values) / step) * step);
  const x = (d: number) => PAD.left + ((d - 1) / (MONTH_DAYS - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + ((max - v) / (max - min)) * (H - PAD.top - PAD.bottom);

  const history = series.filter((p) => !p.projected);
  const lastHistory = history[history.length - 1];
  const projection = lastHistory ? [lastHistory, ...series.filter((p) => p.projected)] : series;
  const end = series[series.length - 1];
  const compareEnd = compare?.[compare.length - 1];
  const compareLine = compare && lastHistory ? [lastHistory, ...compare.filter((p) => p.projected)] : compare;

  const grid: number[] = [];
  for (let v = min; v <= max; v += step) grid.push(v);

  const summary = `${label}: ${formatINR(lastHistory?.balance ?? 0)} at the end of today, forecast ${formatINR(end?.balance ?? 0)} on Day ${MONTH_DAYS}${
    compareEnd ? `, or ${formatINR(compareEnd.balance)} with this decision` : ''
  }.`;

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} preserveAspectRatio="xMidYMid meet">
        {min < 0 && <rect className="chart-danger" x={PAD.left} y={y(0)} width={W - PAD.left - PAD.right} height={y(min) - y(0)} />}
        {grid.map((v) => (
          <g key={v}>
            <line className={v === 0 ? 'chart-zero' : 'chart-grid'} x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
            <text className="chart-label" x={PAD.left - 8} y={y(v) + 4} textAnchor="end">
              {shortINR(v)}
            </text>
          </g>
        ))}
        {[1, 10, 20, 30].map((d) => (
          <text key={d} className="chart-label" x={x(d)} y={H - 8} textAnchor="middle">
            Day {d}
          </text>
        ))}
        <line className="chart-today" x1={x(today)} x2={x(today)} y1={PAD.top} y2={H - PAD.bottom} />
        <path className="chart-history" d={toPath(history, x, y)} />
        <path className="chart-projection" d={toPath(projection, x, y)} />
        {compareLine && <path className={`chart-compare ${(compareEnd?.balance ?? 0) < 0 ? 'is-bad' : 'is-good'}`} d={toPath(compareLine, x, y)} />}
        {lastHistory && <circle className="chart-dot" cx={x(lastHistory.day)} cy={y(lastHistory.balance)} r={6} />}
        {end && <circle className={`chart-end ${end.balance < 0 ? 'is-bad' : ''}`} cx={x(end.day)} cy={y(end.balance)} r={5} />}
      </svg>
      <figcaption className="chart-legend">
        <span>
          <i className="lg-history" aria-hidden="true" />
          So far
        </span>
        <span>
          <i className="lg-projection" aria-hidden="true" />
          {compare ? 'Without it' : 'Forecast at your usual pace'}
        </span>
        {compare && (
          <span>
            <i className={`lg-compare ${(compareEnd?.balance ?? 0) < 0 ? 'is-bad' : 'is-good'}`} aria-hidden="true" />
            With it
          </span>
        )}
      </figcaption>
    </figure>
  );
});
