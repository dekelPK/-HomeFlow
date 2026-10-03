/** Fixed = recurring with a default amount; variable = entered by hand each month. */
export type ItemKind = 'fixed' | 'variable';

export interface TemplateItem {
  id: string;
  name: string;
  kind: ItemKind;
  /** Default monthly amount. Used to prefill fixed items in new months. */
  defaultAmount: number | null;
  /** Archived items no longer appear in new months, but stay in history. */
  archived?: boolean;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  /** Index into the categorical palette – fixed per category, never re-assigned. */
  colorSlot: number;
  items: TemplateItem[];
  archived?: boolean;
}

export interface IncomeTemplate {
  id: string;
  name: string;
  /** Recurring incomes are prefilled with their default amount every month. */
  recurring: boolean;
  defaultAmount: number | null;
  archived?: boolean;
}

export interface Settings {
  monthlyBudget: number | null;
  categories: Category[];
  incomes: IncomeTemplate[];
}

export interface ExpenseEntry {
  id: string;
  categoryId: string;
  /** Template item this entry belongs to; null for one-off entries added in the month. */
  itemId: string | null;
  name: string;
  kind: ItemKind;
  amount: number | null;
  /**
   * Fixed entries start unpaid (they count as "expected"); ticking them moves them to "paid".
   * Variable entries count as paid as soon as they have an amount.
   */
  paid: boolean;
  note?: string;
  /** Optional, informational only – never used in calculations. */
  paidBy?: string;
}

export interface IncomeEntry {
  id: string;
  templateId: string | null;
  name: string;
  amount: number | null;
}

export interface MonthData {
  /** YYYY-MM */
  key: string;
  budget: number | null;
  expenses: ExpenseEntry[];
  incomes: IncomeEntry[];
}

export interface AppData {
  version: 1;
  settings: Settings;
  months: Record<string, MonthData>;
}
