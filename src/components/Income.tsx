import { useState } from 'react';
import { ils } from '../lib/format';
import { uid } from '../lib/month';
import type { IncomeEntry, IncomeTemplate, MonthData } from '../lib/types';
import { AmountInput } from './AmountInput';

interface Props {
  month: MonthData;
  templates: IncomeTemplate[];
  updateMonth: (fn: (m: MonthData) => MonthData) => void;
  setIncomeDefault: (templateId: string, amount: number | null) => void;
}

export function Income({ month, templates, updateMonth, setIncomeDefault }: Props) {
  const [adding, setAdding] = useState(false);
  const byId = new Map(templates.map((t) => [t.id, t]));
  const total = month.incomes.reduce((s, i) => s + (i.amount ?? 0), 0);

  const patch = (id: string, p: Partial<IncomeEntry>) =>
    updateMonth((m) => ({ ...m, incomes: m.incomes.map((i) => (i.id === id ? { ...i, ...p } : i)) }));
  const remove = (id: string) => updateMonth((m) => ({ ...m, incomes: m.incomes.filter((i) => i.id !== id) }));

  return (
    <div className="stack">
      <section className="card">
        <h2>💰 הכנסות</h2>
        <div className="rows">
          {month.incomes.map((inc) => {
            const t = inc.templateId ? byId.get(inc.templateId) : undefined;
            const differs = t?.recurring && inc.amount !== t.defaultAmount;
            return (
              <div className="row" key={inc.id}>
                <div className="row-name">
                  {inc.name}
                  {t?.recurring && <span className="tag" title="הכנסה קבועה">🔁</span>}
                  {t && (differs || !t.recurring) && inc.amount != null && (
                    <div className="muted small">
                      <button className="link small" onClick={() => setIncomeDefault(t.id, inc.amount)}>
                        לקבוע {ils(inc.amount)} כהכנסה קבועה
                      </button>
                    </div>
                  )}
                </div>
                <AmountInput value={inc.amount} label={inc.name} onChange={(v) => patch(inc.id, { amount: v })} />
                <div className="row-actions">
                  {!inc.templateId && (
                    <button className="icon-btn ghost" aria-label="מחיקה" title="מחיקה" onClick={() => remove(inc.id)}>
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {adding ? (
            <form
              className="row adhoc"
              onSubmit={(ev) => {
                ev.preventDefault();
                const name = new FormData(ev.currentTarget).get('name')?.toString().trim();
                if (name) updateMonth((m) => ({ ...m, incomes: [...m.incomes, { id: uid(), templateId: null, name, amount: null }] }));
                setAdding(false);
              }}
            >
              <input name="name" placeholder="למשל: החזר מס" autoFocus aria-label="שם ההכנסה" />
              <button type="submit" className="btn small">הוסף</button>
              <button type="button" className="btn ghost small" onClick={() => setAdding(false)}>ביטול</button>
            </form>
          ) : (
            <button className="link add-adhoc" onClick={() => setAdding(true)}>+ הכנסה חד־פעמית</button>
          )}
        </div>
        <div className="sum-line">
          <span>סה״כ הכנסות</span>
          <b>{ils(total)}</b>
        </div>
      </section>
    </div>
  );
}
