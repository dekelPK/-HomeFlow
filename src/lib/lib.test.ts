import { describe, expect, it } from 'vitest';
import { categoryTotals, groupEntries, summarize } from './calc';
import { defaultData } from './defaults';
import { insights } from './insights';
import { addMonths, createMonth, ensureMonth, syncOpenMonths } from './month';
import type { AppData } from './types';

const fresh = (): AppData => defaultData();

describe('createMonth', () => {
  it('prefills fixed expenses and leaves variable ones empty', () => {
    const m = createMonth('2026-10', fresh().settings);
    const rent = m.expenses.find((e) => e.name === 'שכירות')!;
    const super_ = m.expenses.find((e) => e.name === 'קניות אוכל / סופר')!;
    expect(rent.amount).toBe(6200);
    expect(rent.paid).toBe(false);
    expect(super_.amount).toBeNull();
    expect(m.budget).toBe(15000);
    expect(m.incomes.map((i) => i.name)).toEqual(['משכורת דקלה', 'משכורת אבי', 'הכנסה נוספת']);
  });

  it('skips archived items', () => {
    const d = fresh();
    d.settings.categories[0].items[0].archived = true;
    const m = createMonth('2026-10', d.settings);
    expect(m.expenses.some((e) => e.name === 'שכירות')).toBe(false);
  });
});

describe('summarize', () => {
  it('splits paid vs expected and computes what is left', () => {
    const m = createMonth('2026-10', fresh().settings);
    m.incomes[0].amount = 12000;
    m.incomes[1].amount = 10000;
    const set = (name: string, amount: number) => {
      const e = m.expenses.find((x) => x.name === name)!;
      e.amount = amount;
      return e;
    };
    set('שכירות', 6200).paid = true;
    set('קניות אוכל / סופר', 320);
    m.expenses.push({ ...m.expenses.find((e) => e.name === 'קניות אוכל / סופר')!, id: 'x', amount: 450 });

    const s = summarize(m);
    expect(s.income).toBe(22000);
    expect(s.spent).toBe(6200 + 320 + 450);
    expect(s.pending).toBe(600 + 250); // ארנונה + ועד בית
    expect(s.forecast).toBe(s.spent + s.pending);
    expect(s.left).toBe(22000 - s.spent);
    expect(s.budgetLeft).toBe(15000 - s.spent);
  });

  it('groups multiple entries of the same item', () => {
    const d = fresh();
    const m = createMonth('2026-10', d.settings);
    const base = m.expenses.find((e) => e.name === 'קניות אוכל / סופר')!;
    base.amount = 320;
    m.expenses.push({ ...base, id: 'a', amount: 450 }, { ...base, id: 'b', amount: 185 });
    const food = d.settings.categories.find((c) => c.id === 'food')!;
    const groups = groupEntries(m.expenses.filter((e) => e.categoryId === 'food'), food);
    expect(groups[0].name).toBe('קניות אוכל / סופר');
    expect(groups[0].total).toBe(955);
    expect(groups[0].entries).toHaveLength(3);
    expect(categoryTotals(m, d.settings.categories).find((t) => t.category.id === 'food')!.spent).toBe(955);
  });
});

describe('syncOpenMonths', () => {
  it('updates untouched fixed amounts in open months but keeps overrides and history', () => {
    let d = fresh();
    d = ensureMonth(d, '2026-09');
    d = ensureMonth(d, '2026-10');
    d = ensureMonth(d, '2026-11');
    // November rent overridden by hand
    d.months['2026-11'].expenses.find((e) => e.name === 'שכירות')!.amount = 6500;

    const prev = d.settings;
    const settings = structuredClone(prev);
    settings.categories[0].items[0].defaultAmount = 6400;
    settings.categories[2].items.push({ id: 'food-new', name: 'מאפייה', kind: 'variable', defaultAmount: null });
    d = syncOpenMonths({ ...d, settings }, prev, '2026-10');

    const rent = (k: string) => d.months[k].expenses.find((e) => e.itemId === 'home-1')!.amount;
    expect(rent('2026-09')).toBe(6200);
    expect(rent('2026-10')).toBe(6400);
    expect(rent('2026-11')).toBe(6500);
    expect(d.months['2026-10'].expenses.some((e) => e.itemId === 'food-new')).toBe(true);
    expect(d.months['2026-09'].expenses.some((e) => e.itemId === 'food-new')).toBe(false);
  });
});

describe('insights', () => {
  it('compares to the previous month overall and per category', () => {
    let d = fresh();
    d = ensureMonth(d, '2026-09');
    d = ensureMonth(d, addMonths('2026-09', 1));
    const setFood = (k: string, n: number) => {
      d.months[k].expenses.find((e) => e.name === 'קניות אוכל / סופר')!.amount = n;
    };
    setFood('2026-09', 1000);
    setFood('2026-10', 1200);
    const out = insights(d, '2026-10');
    expect(out[0].text).toBe('באוקטובר הוצאתם ₪200 יותר מספטמבר');
    expect(out[1].text).toBe('אוכל היה גבוה ב-20% לעומת החודש הקודם');
  });
});

describe('archiving', () => {
  it('removes untouched entries of archived items from open months only', () => {
    let d = fresh();
    d = ensureMonth(d, '2026-09');
    d = ensureMonth(d, '2026-10');
    const prev = d.settings;
    const settings = structuredClone(prev);
    settings.categories[0].items.find((i) => i.name === 'גז')!.archived = true;
    d = syncOpenMonths({ ...d, settings }, prev, '2026-10');
    expect(d.months['2026-10'].expenses.some((e) => e.name === 'גז')).toBe(false);
    expect(d.months['2026-09'].expenses.some((e) => e.name === 'גז')).toBe(true);
  });
});
