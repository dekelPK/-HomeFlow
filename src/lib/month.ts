import type { AppData, ExpenseEntry, IncomeEntry, MonthData, Settings } from './types';

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function addMonths(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

export function monthName(key: string): string {
  return HE_MONTHS[Number(key.split('-')[1]) - 1];
}

export function monthLabel(key: string): string {
  return `${monthName(key)} ${key.split('-')[0]}`;
}

/** Builds a fresh month from the remembered categories, fixed expenses and recurring incomes. */
export function createMonth(key: string, settings: Settings): MonthData {
  const expenses: ExpenseEntry[] = [];
  for (const cat of settings.categories) {
    if (cat.archived) continue;
    for (const item of cat.items) {
      if (item.archived) continue;
      expenses.push({
        id: uid(),
        categoryId: cat.id,
        itemId: item.id,
        name: item.name,
        kind: item.kind,
        amount: item.kind === 'fixed' ? item.defaultAmount : null,
        paid: false,
      });
    }
  }
  const incomes: IncomeEntry[] = settings.incomes
    .filter((t) => !t.archived)
    .map((t) => ({
      id: uid(),
      templateId: t.id,
      name: t.name,
      amount: t.recurring ? t.defaultAmount : null,
    }));
  return { key, budget: settings.monthlyBudget, expenses, incomes };
}

/** Months from `currentKey` on are created automatically; earlier ones only on request. */
export function shouldAutoCreate(key: string, currentKey: string): boolean {
  return key >= currentKey;
}

export function ensureMonth(data: AppData, key: string): AppData {
  if (data.months[key]) return data;
  return { ...data, months: { ...data.months, [key]: createMonth(key, data.settings) } };
}

/**
 * After a template change, bring already-created current/future months in line:
 * add entries for new items and update untouched fixed amounts. Past months are history and stay as-is.
 */
export function syncOpenMonths(data: AppData, prev: Settings, currentKey: string): AppData {
  const months = { ...data.months };
  const prevItems = new Map(prev.categories.flatMap((c) => c.items.map((i) => [i.id, i] as const)));
  const prevIncomes = new Map(prev.incomes.map((i) => [i.id, i] as const));

  for (const key of Object.keys(months)) {
    if (key < currentKey) continue;
    const month = months[key];
    let expenses = month.expenses;
    let incomes = month.incomes;

    for (const cat of data.settings.categories) {
      for (const item of cat.items) {
        const old = prevItems.get(item.id);
        const has = expenses.some((e) => e.itemId === item.id);
        if (!has && !item.archived && !cat.archived) {
          expenses = [...expenses, {
            id: uid(), categoryId: cat.id, itemId: item.id, name: item.name, kind: item.kind,
            amount: item.kind === 'fixed' ? item.defaultAmount : null, paid: false,
          }];
          continue;
        }
        if (!old) continue;
        expenses = expenses.map((e) => {
          if (e.itemId !== item.id) return e;
          const next = { ...e, name: e.name === old.name ? item.name : e.name, kind: item.kind };
          // Amount was never overridden for this month → follow the new default.
          const untouched = e.amount === (old.kind === 'fixed' ? old.defaultAmount : null);
          if (!e.paid && untouched) next.amount = item.kind === 'fixed' ? item.defaultAmount : null;
          return next;
        });
      }
    }

    for (const t of data.settings.incomes) {
      const old = prevIncomes.get(t.id);
      const has = incomes.some((i) => i.templateId === t.id);
      if (!has && !t.archived) {
        incomes = [...incomes, { id: uid(), templateId: t.id, name: t.name, amount: t.recurring ? t.defaultAmount : null }];
        continue;
      }
      if (!old) continue;
      incomes = incomes.map((i) => {
        if (i.templateId !== t.id) return i;
        const untouched = i.amount === (old.recurring ? old.defaultAmount : null);
        return {
          ...i,
          name: i.name === old.name ? t.name : i.name,
          amount: untouched ? (t.recurring ? t.defaultAmount : null) : i.amount,
        };
      });
    }

    // Items removed from the template disappear from open months unless something was entered for them.
    const archived = new Set(
      data.settings.categories.flatMap((c) => c.items.filter((i) => c.archived || i.archived).map((i) => i.id)),
    );
    const templates = new Map(data.settings.categories.flatMap((c) => c.items.map((i) => [i.id, i] as const)));
    expenses = expenses.filter((e) => {
      if (!e.itemId || !archived.has(e.itemId) || e.paid) return true;
      const t = templates.get(e.itemId)!;
      return e.amount != null && e.amount !== (t.kind === 'fixed' ? t.defaultAmount : null);
    });
    const archivedIncomes = new Set(data.settings.incomes.filter((t) => t.archived).map((t) => t.id));
    const incomeTemplates = new Map(data.settings.incomes.map((t) => [t.id, t] as const));
    incomes = incomes.filter((i) => {
      if (!i.templateId || !archivedIncomes.has(i.templateId)) return true;
      const t = incomeTemplates.get(i.templateId)!;
      return i.amount != null && i.amount !== (t.recurring ? t.defaultAmount : null);
    });

    const budget = month.budget === prev.monthlyBudget ? data.settings.monthlyBudget : month.budget;
    months[key] = { ...month, expenses, incomes, budget };
  }
  return { ...data, months };
}
