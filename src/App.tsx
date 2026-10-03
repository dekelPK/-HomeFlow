import { useCallback, useEffect, useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Expenses } from './components/Expenses';
import { Income } from './components/Income';
import { Settings } from './components/Settings';
import { AmountInput } from './components/AmountInput';
import { defaultData } from './lib/defaults';
import { addMonths, createMonth, monthKey, monthLabel, shouldAutoCreate, syncOpenMonths } from './lib/month';
import { load, save } from './lib/storage';
import type { AppData, MonthData, Settings as S } from './lib/types';
import { ils } from './lib/format';

type Tab = 'home' | 'expenses' | 'income' | 'settings';

const TABS: [Tab, string, string][] = [
  ['home', '🏦', 'ראשי'],
  ['expenses', '💸', 'הוצאות'],
  ['income', '💰', 'הכנסות'],
  ['settings', '⚙️', 'הגדרות'],
];

export default function App() {
  const currentKey = monthKey(new Date());
  const [data, setData] = useState<AppData>(load);
  const [key, setKey] = useState(currentKey);
  const [tab, setTab] = useState<Tab>('home');
  const [editBudget, setEditBudget] = useState(false);

  useEffect(() => save(data), [data]);

  // New months are created automatically from the remembered template.
  useEffect(() => {
    if (!data.months[key] && shouldAutoCreate(key, currentKey)) {
      setData((d) => (d.months[key] ? d : { ...d, months: { ...d.months, [key]: createMonth(key, d.settings) } }));
    }
  }, [key, currentKey, data.months]);

  const month = data.months[key] as MonthData | undefined;

  const updateMonth = useCallback(
    (fn: (m: MonthData) => MonthData) =>
      setData((d) => (d.months[key] ? { ...d, months: { ...d.months, [key]: fn(d.months[key]) } } : d)),
    [key],
  );

  const updateSettings = useCallback(
    (fn: (s: S) => S) => setData((d) => syncOpenMonths({ ...d, settings: fn(d.settings) }, d.settings, currentKey)),
    [currentKey],
  );

  const setItemDefault = (itemId: string, amount: number | null) =>
    setData((d) => {
      const settings: S = {
        ...d.settings,
        categories: d.settings.categories.map((c) => ({
          ...c,
          items: c.items.map((i) => (i.id === itemId ? { ...i, defaultAmount: amount } : i)),
        })),
      };
      return syncOpenMonths({ ...d, settings }, d.settings, currentKey);
    });

  const setIncomeDefault = (templateId: string, amount: number | null) =>
    setData((d) => {
      const settings: S = {
        ...d.settings,
        incomes: d.settings.incomes.map((t) => (t.id === templateId ? { ...t, recurring: true, defaultAmount: amount } : t)),
      };
      return syncOpenMonths({ ...d, settings }, d.settings, currentKey);
    });

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">HomeFlow</div>
        <nav className="month-nav" aria-label="בחירת חודש">
          <button className="icon-btn" aria-label="החודש הקודם" onClick={() => setKey(addMonths(key, -1))}>›</button>
          <span className="month-title">{monthLabel(key)}</span>
          <button className="icon-btn" aria-label="החודש הבא" onClick={() => setKey(addMonths(key, 1))}>‹</button>
          {key !== currentKey && (
            <button className="btn ghost small" onClick={() => setKey(currentKey)}>היום</button>
          )}
        </nav>
        {month && tab === 'home' && (
          <div className="budget-edit">
            {editBudget ? (
              <>
                <AmountInput
                  value={month.budget}
                  label="תקציב לחודש הזה"
                  autoFocus
                  onChange={(v) => updateMonth((m) => ({ ...m, budget: v }))}
                />
                <button className="btn small" onClick={() => setEditBudget(false)}>סיום</button>
              </>
            ) : (
              <button className="link small" onClick={() => setEditBudget(true)}>
                תקציב החודש: {month.budget ? ils(month.budget) : 'לא הוגדר'} ✎
              </button>
            )}
          </div>
        )}
      </header>

      <main className="content">
        {tab === 'settings' ? (
          <Settings
            data={data}
            updateSettings={updateSettings}
            replaceData={setData}
            resetAll={() => setData(defaultData())}
          />
        ) : !month ? (
          <section className="card empty">
            <p>אין נתונים עבור {monthLabel(key)}.</p>
            <button
              className="btn"
              onClick={() => setData((d) => ({ ...d, months: { ...d.months, [key]: createMonth(key, d.settings) } }))}
            >
              להתחיל לעקוב אחרי {monthLabel(key)}
            </button>
          </section>
        ) : tab === 'home' ? (
          <Dashboard data={data} month={month} onGoExpenses={() => setTab('expenses')} onGoIncome={() => setTab('income')} />
        ) : tab === 'expenses' ? (
          <Expenses month={month} categories={data.settings.categories} updateMonth={updateMonth} setItemDefault={setItemDefault} />
        ) : (
          <Income month={month} templates={data.settings.incomes} updateMonth={updateMonth} setIncomeDefault={setIncomeDefault} />
        )}
      </main>

      <nav className="tabbar" aria-label="ניווט">
        {TABS.map(([id, icon, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
            <span aria-hidden>{icon}</span>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
