import { useState } from 'react';
import type { CategoryTotal } from '../lib/calc';
import { ils } from '../lib/format';
import type { HistoryPoint } from '../lib/insights';

export const seriesVar = (slot: number) => (slot >= 0 && slot < 8 ? `var(--series-${slot + 1})` : 'var(--series-other)');

/** Donut of where the money went, with the total in the middle. */
export function Donut({ totals }: { totals: CategoryTotal[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const sum = totals.reduce((s, t) => s + t.spent, 0);
  const r = 70;
  const c = 2 * Math.PI * r;
  const gap = totals.length > 1 ? 2 : 0;
  let offset = 0;
  const hovered = totals.find((t) => t.category.id === hover);
  return (
    <svg viewBox="0 0 180 180" className="donut" role="img" aria-label={`חלוקת הוצאות, סה״כ ${ils(sum)}`}>
      <circle cx="90" cy="90" r={r} className="donut-track" />
      {sum > 0 &&
        totals.map((t) => {
          const len = (t.spent / sum) * c;
          const seg = (
            <circle
              key={t.category.id}
              cx="90"
              cy="90"
              r={r}
              fill="none"
              stroke={seriesVar(t.category.colorSlot)}
              strokeWidth={hover === t.category.id ? 24 : 20}
              strokeDasharray={`${Math.max(len - gap, 0.5)} ${c}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 90 90)"
              onMouseEnter={() => setHover(t.category.id)}
              onMouseLeave={() => setHover(null)}
            >
              <title>{`${t.category.name}: ${ils(t.spent)} (${Math.round((t.spent / sum) * 100)}%)`}</title>
            </circle>
          );
          offset += len;
          return seg;
        })}
      <text x="90" y="84" textAnchor="middle" className="donut-label">
        {hovered ? hovered.category.name : 'סה״כ'}
      </text>
      <text x="90" y="106" textAnchor="middle" className="donut-value">
        {ils(hovered ? hovered.spent : sum)}
      </text>
    </svg>
  );
}

/** One bar per month (expected total), current month highlighted. */
export function HistoryBars({ points, current }: { points: HistoryPoint[]; current: string }) {
  const max = Math.max(...points.map((p) => p.total), 1);
  return (
    <div className="hbars" role="list">
      {points.map((p) => (
        <div className="hbar-row" role="listitem" key={p.key} title={`${p.label}: ${ils(p.total)}`}>
          <span className="hbar-label">{p.label}</span>
          <span className="hbar-track">
            <span
              className={`hbar-fill${p.key === current ? ' current' : ''}`}
              style={{ width: `${(p.total / max) * 100}%` }}
            />
          </span>
          <span className="hbar-value">{ils(p.total)}</span>
        </div>
      ))}
    </div>
  );
}
