import { useState } from 'react';
import { groupEntries, isPending } from '../lib/calc';
import { ils } from '../lib/format';
import { uid } from '../lib/month';
import type { Category, ExpenseEntry, MonthData, TemplateItem } from '../lib/types';
import { AmountInput } from './AmountInput';

interface Props {
  month: MonthData;
  categories: Category[];
  updateMonth: (fn: (m: MonthData) => MonthData) => void;
  setItemDefault: (itemId: string, amount: number | null) => void;
}

export function Expenses({ month, categories, updateMonth, setItemDefault }: Props) {
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);

  const patch = (id: string, p: Partial<ExpenseEntry>) =>
    updateMonth((m) => ({ ...m, expenses: m.expenses.map((e) => (e.id === id ? { ...e, ...p } : e)) }));
  const remove = (id: string) => updateMonth((m) => ({ ...m, expenses: m.expenses.filter((e) => e.id !== id) }));
  const addLike = (e: ExpenseEntry) =>
    updateMonth((m) => {
      const idx = m.expenses.map((x) => x.itemId === e.itemId && x.categoryId === e.categoryId).lastIndexOf(true);
      const extra: ExpenseEntry = { ...e, id: uid(), kind: 'variable', amount: null, paid: false, note: undefined };
      const list = [...m.expenses];
      list.splice(idx + 1, 0, extra);
      return { ...m, expenses: list };
    });
  const addAdhoc = (categoryId: string, name: string) =>
    updateMonth((m) => ({
      ...m,
      expenses: [...m.expenses, { id: uid(), categoryId, itemId: null, name, kind: 'variable', amount: null, paid: false }],
    }));

  // Categories that exist in this month, in settings order (archived ones still show if they have entries).
  const cats = categories.filter((c) => month.expenses.some((e) => e.categoryId === c.id));
  const toggle = (id: string) =>
    setClosed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="stack">
      <p className="muted small hint">
        מזינים סכום ליד ההוצאה. הוצאות קבועות (🔁) נכנסות אוטומטית — מסמנים ✓ כשהן יורדות מהחשבון.
      </p>
      {cats.map((cat) => {
        const entries = month.expenses.filter((e) => e.categoryId === cat.id);
        const groups = groupEntries(entries, cat);
        const total = entries.reduce((s, e) => s + (e.amount ?? 0), 0);
        const pending = entries.filter(isPending).reduce((s, e) => s + (e.amount ?? 0), 0);
        const open = !closed.has(cat.id);
        const items = new Map(cat.items.map((i) => [i.id, i]));
        return (
          <section className="card cat-card" key={cat.id}>
            <button className="cat-head" onClick={() => toggle(cat.id)} aria-expanded={open}>
              <span className="cat-title">{cat.emoji} {cat.name}</span>
              <span className="cat-total">
                {ils(total)}
                {pending > 0 && <span className="muted small"> (מתוכם {ils(pending)} צפוי)</span>}
              </span>
              <span className="chev" aria-hidden>{open ? '▾' : '◂'}</span>
            </button>
            {open && (
              <div className="rows">
                {groups.map((g) => (
                  <Group
                    key={g.key}
                    group={g}
                    template={g.entries[0].itemId ? items.get(g.entries[0].itemId) : undefined}
                    patch={patch}
                    remove={remove}
                    addLike={addLike}
                    setItemDefault={setItemDefault}
                  />
                ))}
                {adding === cat.id ? (
                  <form
                    className="row adhoc"
                    onSubmit={(ev) => {
                      ev.preventDefault();
                      const name = new FormData(ev.currentTarget).get('name')?.toString().trim();
                      if (name) addAdhoc(cat.id, name);
                      setAdding(null);
                    }}
                  >
                    <input name="name" placeholder="שם ההוצאה" autoFocus aria-label="שם ההוצאה החדשה" />
                    <button type="submit" className="btn small">הוסף</button>
                    <button type="button" className="btn ghost small" onClick={() => setAdding(null)}>ביטול</button>
                  </form>
                ) : (
                  <button className="link add-adhoc" onClick={() => setAdding(cat.id)}>+ הוצאה אחרת ב{cat.name}</button>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

interface GroupProps {
  group: ReturnType<typeof groupEntries>[number];
  template: TemplateItem | undefined;
  patch: (id: string, p: Partial<ExpenseEntry>) => void;
  remove: (id: string) => void;
  addLike: (e: ExpenseEntry) => void;
  setItemDefault: (itemId: string, amount: number | null) => void;
}

function Group({ group, template, patch, remove, addLike, setItemDefault }: GroupProps) {
  const multi = group.entries.length > 1;
  return (
    <div className={`group${multi ? ' multi' : ''}`}>
      {group.entries.map((e, i) => {
        const fixed = e.kind === 'fixed';
        const overridden = fixed && template && template.kind === 'fixed' && e.amount !== template.defaultAmount;
        const canDelete = multi || e.itemId == null;
        return (
          <div className={`row${fixed && e.paid ? ' paid' : ''}`} key={e.id}>
            <div className="row-name">
              {i === 0 || !multi ? group.name : <span className="muted">{group.name}</span>}
              {fixed && <span className="tag" title="הוצאה קבועה">🔁</span>}
              {overridden && template && (
                <div className="muted small">
                  ברירת מחדל {template.defaultAmount == null ? '—' : ils(template.defaultAmount)} ·{' '}
                  <button className="link small" onClick={() => setItemDefault(template.id, e.amount)}>
                    לקבוע כברירת מחדל
                  </button>
                </div>
              )}
            </div>
            {fixed && (
              <label className="paid-toggle" title={e.paid ? 'שולם' : 'עוד לא שולם'}>
                <input type="checkbox" checked={e.paid} onChange={(ev) => patch(e.id, { paid: ev.target.checked })} />
                <span>{e.paid ? 'שולם' : 'צפוי'}</span>
              </label>
            )}
            <AmountInput value={e.amount} label={group.name} onChange={(v) => patch(e.id, { amount: v })} />
            <div className="row-actions">
              {i === group.entries.length - 1 && (
                <button className="icon-btn" title={`הוצאה נוספת: ${group.name}`} aria-label={`הוצאה נוספת: ${group.name}`} onClick={() => addLike(e)}>
                  +
                </button>
              )}
              {canDelete && (
                <button className="icon-btn ghost" title="מחיקה" aria-label="מחיקה" onClick={() => remove(e.id)}>
                  ×
                </button>
              )}
            </div>
          </div>
        );
      })}
      {multi && (
        <div className="group-total">
          סה״כ {group.name}: <b>{ils(group.total)}</b>
        </div>
      )}
    </div>
  );
}
