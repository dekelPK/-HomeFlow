import type { Category, ExpenseEntry, MonthData } from './types';

const amt = (n: number | null) => n ?? 0;

/** Money that already left the account. */
export function isSpent(e: ExpenseEntry): boolean {
  if (e.amount == null) return false;
  return e.kind === 'variable' || e.paid;
}

/** Fixed expenses with a known amount that haven't been marked paid yet. */
export function isPending(e: ExpenseEntry): boolean {
  return e.kind === 'fixed' && !e.paid && e.amount != null && e.amount > 0;
}

export interface MonthSummary {
  income: number;
  spent: number;
  pending: number;
  /** spent + pending: what the month is expected to cost in total. */
  forecast: number;
  /** income − spent */
  left: number;
  /** income − forecast */
  forecastLeft: number;
  budget: number | null;
  budgetLeft: number | null;
  /** 0..∞ share of the budget already spent. */
  budgetUsed: number | null;
}

export function summarize(month: MonthData): MonthSummary {
  const income = month.incomes.reduce((s, i) => s + amt(i.amount), 0);
  let spent = 0;
  let pending = 0;
  for (const e of month.expenses) {
    if (isSpent(e)) spent += amt(e.amount);
    else if (isPending(e)) pending += amt(e.amount);
  }
  const budget = month.budget && month.budget > 0 ? month.budget : null;
  return {
    income,
    spent,
    pending,
    forecast: spent + pending,
    left: income - spent,
    forecastLeft: income - spent - pending,
    budget,
    budgetLeft: budget == null ? null : budget - spent,
    budgetUsed: budget == null ? null : spent / budget,
  };
}

export interface CategoryTotal {
  category: Pick<Category, 'id' | 'name' | 'emoji' | 'colorSlot'>;
  spent: number;
  pending: number;
}

export function categoryTotals(month: MonthData, categories: Category[]): CategoryTotal[] {
  const byId = new Map<string, CategoryTotal>();
  for (const c of categories) byId.set(c.id, { category: c, spent: 0, pending: 0 });
  for (const e of month.expenses) {
    let t = byId.get(e.categoryId);
    if (!t) {
      t = { category: { id: e.categoryId, name: e.categoryId, emoji: '•', colorSlot: -1 }, spent: 0, pending: 0 };
      byId.set(e.categoryId, t);
    }
    if (isSpent(e)) t.spent += amt(e.amount);
    else if (isPending(e)) t.pending += amt(e.amount);
  }
  return [...byId.values()].filter((t) => t.spent > 0 || t.pending > 0);
}

export interface ItemGroup {
  key: string;
  name: string;
  kind: ExpenseEntry['kind'];
  entries: ExpenseEntry[];
  total: number;
}

/** Groups a category's entries by template item (several "סופר" rows → one group). */
export function groupEntries(entries: ExpenseEntry[], category: Category | undefined): ItemGroup[] {
  const order = new Map(category?.items.map((it, i) => [it.id, i]) ?? []);
  const groups = new Map<string, ItemGroup>();
  for (const e of entries) {
    const key = e.itemId ?? `adhoc:${e.id}`;
    let g = groups.get(key);
    if (!g) {
      g = { key, name: e.name, kind: e.kind, entries: [], total: 0 };
      groups.set(key, g);
    }
    g.entries.push(e);
    g.total += amt(e.amount);
  }
  const rank = (g: ItemGroup) => order.get(g.entries[0].itemId ?? '') ?? Number.MAX_SAFE_INTEGER;
  return [...groups.values()].sort((a, b) => rank(a) - rank(b));
}

export function pctChange(now: number, before: number): number | null {
  if (before <= 0) return null;
  return ((now - before) / before) * 100;
}
