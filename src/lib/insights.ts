import { categoryTotals, pctChange, summarize } from './calc';
import { ils } from './format';
import { addMonths, monthLabel, monthName } from './month';
import type { AppData } from './types';

export interface HistoryPoint {
  key: string;
  label: string;
  total: number;
  income: number;
}

/** Up to `count` existing months ending at `key` (inclusive). */
export function history(data: AppData, key: string, count = 6): HistoryPoint[] {
  return Object.keys(data.months)
    .filter((k) => k <= key)
    .sort()
    .slice(-count)
    .map((k) => {
      const s = summarize(data.months[k]);
      return { key: k, label: monthLabel(k), total: s.forecast, income: s.income };
    });
}

export function previousMonthKey(data: AppData, key: string): string | null {
  const prev = addMonths(key, -1);
  return data.months[prev] ? prev : null;
}

export interface Insight {
  text: string;
  direction: 'up' | 'down' | 'same';
}

export function insights(data: AppData, key: string): Insight[] {
  const prevKey = previousMonthKey(data, key);
  if (!prevKey) return [];
  const now = summarize(data.months[key]);
  const before = summarize(data.months[prevKey]);
  const out: Insight[] = [];

  const diff = now.forecast - before.forecast;
  const m = monthName(key);
  const pm = monthName(prevKey);
  if (Math.round(diff) === 0) {
    out.push({ text: `ב${m} הוצאתם בדיוק כמו ב${pm}`, direction: 'same' });
  } else {
    out.push({
      text: `ב${m} הוצאתם ${ils(Math.abs(diff))} ${diff > 0 ? 'יותר' : 'פחות'} מ${pm}`,
      direction: diff > 0 ? 'up' : 'down',
    });
  }

  const cats = data.settings.categories;
  const prevTotals = new Map(categoryTotals(data.months[prevKey], cats).map((t) => [t.category.id, t.spent + t.pending]));
  const changes = categoryTotals(data.months[key], cats)
    .map((t) => ({ t, pct: pctChange(t.spent + t.pending, prevTotals.get(t.category.id) ?? 0) }))
    .filter((c): c is { t: typeof c.t; pct: number } => c.pct != null && Math.abs(c.pct) >= 10)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 3);
  for (const { t, pct } of changes) {
    out.push({
      text: `${t.category.name} היה ${pct > 0 ? 'גבוה' : 'נמוך'} ב-${Math.round(Math.abs(pct))}% לעומת החודש הקודם`,
      direction: pct > 0 ? 'up' : 'down',
    });
  }
  return out;
}
