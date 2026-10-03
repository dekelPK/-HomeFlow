import { useRef, useState } from 'react';
import { exportJson, importJson } from '../lib/storage';
import { uid } from '../lib/month';
import type { AppData, Category, IncomeTemplate, Settings as S, TemplateItem } from '../lib/types';
import { AmountInput } from './AmountInput';

interface Props {
  data: AppData;
  updateSettings: (fn: (s: S) => S) => void;
  replaceData: (d: AppData) => void;
  resetAll: () => void;
}

const EMOJIS = ['🏠', '🚗', '🛒', '🐶', '🧴', '🎬', '💳', '👶', '🎓', '💊', '✈️', '🎁', '📱', '💼'];

export function Settings({ data, updateSettings, replaceData, resetAll }: Props) {
  const { settings } = data;
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const patchCat = (id: string, p: Partial<Category>) =>
    updateSettings((s) => ({ ...s, categories: s.categories.map((c) => (c.id === id ? { ...c, ...p } : c)) }));
  const patchItem = (catId: string, itemId: string, p: Partial<TemplateItem>) =>
    updateSettings((s) => ({
      ...s,
      categories: s.categories.map((c) =>
        c.id === catId ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, ...p } : i)) } : c,
      ),
    }));
  const patchIncome = (id: string, p: Partial<IncomeTemplate>) =>
    updateSettings((s) => ({ ...s, incomes: s.incomes.map((i) => (i.id === id ? { ...i, ...p } : i)) }));

  const download = () => {
    const blob = new Blob([exportJson(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `homeflow-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="stack">
      <section className="card">
        <h2>תקציב חודשי</h2>
        <div className="row">
          <div className="row-name">
            תקציב ברירת מחדל לכל חודש
            <div className="muted small">אפשר לשנות לחודש מסוים במסך הראשי</div>
          </div>
          <AmountInput
            value={settings.monthlyBudget}
            label="תקציב חודשי"
            onChange={(v) => updateSettings((s) => ({ ...s, monthlyBudget: v }))}
          />
        </div>
      </section>

      <section className="card">
        <h2>הכנסות קבועות</h2>
        <div className="rows">
          {settings.incomes.filter((i) => !i.archived).map((inc) => (
            <div className="row settings-row" key={inc.id}>
              <input className="name-input" value={inc.name} aria-label="שם ההכנסה" onChange={(e) => patchIncome(inc.id, { name: e.target.value })} />
              <label className="check">
                <input type="checkbox" checked={inc.recurring} onChange={(e) => patchIncome(inc.id, { recurring: e.target.checked })} />
                חוזרת כל חודש
              </label>
              <AmountInput value={inc.defaultAmount} label={`סכום ${inc.name}`} onChange={(v) => patchIncome(inc.id, { defaultAmount: v })} />
              <button className="icon-btn ghost" aria-label="הסרה" title="הסרה מחודשים הבאים" onClick={() => patchIncome(inc.id, { archived: true })}>×</button>
            </div>
          ))}
          <button
            className="link add-adhoc"
            onClick={() =>
              updateSettings((s) => ({ ...s, incomes: [...s.incomes, { id: uid(), name: 'הכנסה חדשה', recurring: true, defaultAmount: null }] }))
            }
          >
            + הכנסה קבועה
          </button>
        </div>
      </section>

      <section className="card">
        <h2>קטגוריות והוצאות</h2>
        <p className="muted small">
          🔁 קבועה = נכנסת כל חודש עם הסכום שנקבע (למשל שכירות). משתנה = מופיעה ריקה ומזינים סכום.
          שינויים חלים על החודש הנוכחי ועל החודשים הבאים — חודשים קודמים נשארים כמו שהיו.
        </p>
        {settings.categories.filter((c) => !c.archived).map((cat) => (
          <details className="cat-settings" key={cat.id}>
            <summary>
              {cat.emoji} {cat.name} <span className="muted small">({cat.items.filter((i) => !i.archived).length})</span>
            </summary>
            <div className="row settings-row">
              <select value={cat.emoji} aria-label="אייקון" onChange={(e) => patchCat(cat.id, { emoji: e.target.value })}>
                {[...new Set([cat.emoji, ...EMOJIS])].map((e) => <option key={e}>{e}</option>)}
              </select>
              <input className="name-input" value={cat.name} aria-label="שם הקטגוריה" onChange={(e) => patchCat(cat.id, { name: e.target.value })} />
              <button
                className="btn ghost small"
                onClick={() => confirm(`להסיר את הקטגוריה "${cat.name}" מחודשים הבאים?`) && patchCat(cat.id, { archived: true })}
              >
                הסרת קטגוריה
              </button>
            </div>
            <div className="rows">
              {cat.items.filter((i) => !i.archived).map((item) => (
                <div className="row settings-row" key={item.id}>
                  <input className="name-input" value={item.name} aria-label="שם ההוצאה" onChange={(e) => patchItem(cat.id, item.id, { name: e.target.value })} />
                  <select
                    value={item.kind}
                    aria-label="סוג"
                    onChange={(e) => patchItem(cat.id, item.id, { kind: e.target.value as TemplateItem['kind'] })}
                  >
                    <option value="variable">משתנה</option>
                    <option value="fixed">🔁 קבועה</option>
                  </select>
                  {item.kind === 'fixed' ? (
                    <AmountInput value={item.defaultAmount} label={`סכום ${item.name}`} onChange={(v) => patchItem(cat.id, item.id, { defaultAmount: v })} />
                  ) : (
                    <span />
                  )}
                  <button className="icon-btn ghost" aria-label="הסרה" title="הסרה מחודשים הבאים" onClick={() => patchItem(cat.id, item.id, { archived: true })}>×</button>
                </div>
              ))}
              <button
                className="link add-adhoc"
                onClick={() =>
                  updateSettings((s) => ({
                    ...s,
                    categories: s.categories.map((c) =>
                      c.id === cat.id ? { ...c, items: [...c.items, { id: uid(), name: 'הוצאה חדשה', kind: 'variable', defaultAmount: null }] } : c,
                    ),
                  }))
                }
              >
                + הוצאה ב{cat.name}
              </button>
            </div>
          </details>
        ))}
        <button
          className="btn ghost"
          onClick={() =>
            updateSettings((s) => ({
              ...s,
              categories: [
                ...s.categories,
                {
                  id: uid(),
                  name: 'קטגוריה חדשה',
                  emoji: '📦',
                  colorSlot: Math.max(-1, ...s.categories.map((c) => c.colorSlot)) + 1,
                  items: [{ id: uid(), name: 'כללי', kind: 'variable', defaultAmount: null }],
                },
              ],
            }))
          }
        >
          + קטגוריה חדשה
        </button>
      </section>

      <section className="card">
        <h2>גיבוי ושחזור</h2>
        <p className="muted small">הנתונים נשמרים בדפדפן במכשיר הזה. כדי להעביר למכשיר אחר — מייצאים קובץ ומייבאים אותו שם.</p>
        <div className="btn-row">
          <button className="btn" onClick={download}>ייצוא לקובץ</button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>ייבוא מקובץ</button>
          <button
            className="btn danger"
            onClick={() => confirm('למחוק את כל הנתונים ולהתחיל מחדש?') && resetAll()}
          >
            איפוס
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              replaceData(importJson(await f.text()));
              setMsg('הנתונים יובאו בהצלחה');
            } catch {
              setMsg('הקובץ לא תקין');
            }
            e.target.value = '';
          }}
        />
        {msg && <p className="small">{msg}</p>}
      </section>
    </div>
  );
}
