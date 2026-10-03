import { categoryTotals, summarize } from '../lib/calc';
import { ils } from '../lib/format';
import { history, insights } from '../lib/insights';
import { monthName } from '../lib/month';
import type { AppData, MonthData } from '../lib/types';
import { Donut, HistoryBars, seriesVar } from './charts';

interface Props {
  data: AppData;
  month: MonthData;
  onGoExpenses: () => void;
  onGoIncome: () => void;
}

export function Dashboard({ data, month, onGoExpenses, onGoIncome }: Props) {
  const s = summarize(month);
  const totals = categoryTotals(month, data.settings.categories);
  const pendingList = month.expenses.filter((e) => e.kind === 'fixed' && !e.paid && (e.amount ?? 0) > 0);
  const points = history(data, month.key);
  const notes = insights(data, month.key);
  const used = s.budgetUsed ?? 0;
  const maxCat = Math.max(...totals.map((t) => t.spent + t.pending), 1);

  return (
    <div className="stack">
      <section className="kpis">
        <button className="kpi" onClick={onGoIncome}>
          <span className="kpi-label">💰 הכנסות החודש</span>
          <span className="kpi-value">{ils(s.income)}</span>
        </button>
        <button className="kpi" onClick={onGoExpenses}>
          <span className="kpi-label">💸 הוצאות החודש</span>
          <span className="kpi-value">{ils(s.spent)}</span>
        </button>
        <div className={`kpi hero ${s.left < 0 ? 'neg' : ''}`}>
          <span className="kpi-label">🏦 נשאר החודש</span>
          <span className="kpi-value">{ils(s.left)}</span>
          <span className="kpi-sub">הכנסות − הוצאות</span>
        </div>
      </section>

      {s.budget != null && (
        <section className="card">
          <h2>תקציב חודשי</h2>
          <div className="budget-line">
            <span>תקציב: <b>{ils(s.budget)}</b></span>
            <span>הוצאנו: <b>{ils(s.spent)}</b></span>
            <span className={s.budgetLeft! < 0 ? 'neg-text' : ''}>
              {s.budgetLeft! < 0 ? 'חריגה' : 'נשאר'}: <b>{ils(Math.abs(s.budgetLeft!))}</b>
            </span>
          </div>
          <div
            className="progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(used * 100)}
            aria-label="ניצול התקציב"
          >
            <span
              className={`progress-fill ${used > 1 ? 'over' : used > 0.85 ? 'warn' : ''}`}
              style={{ width: `${Math.min(used, 1) * 100}%` }}
            />
            {s.pending > 0 && used < 1 && (
              <span
                className="progress-pending"
                style={{ width: `${Math.min(s.pending / s.budget, 1 - used) * 100}%` }}
                title={`צפוי עוד ${ils(s.pending)}`}
              />
            )}
          </div>
          <div className="muted small">
            נוצל {Math.round(used * 100)}% מהתקציב
            {s.pending > 0 && ` · כולל הצפוי: ${Math.round((s.forecast / s.budget) * 100)}%`}
          </div>
        </section>
      )}

      <section className="card">
        <h2>📅 תחזית לסוף החודש</h2>
        <dl className="forecast">
          <div><dt>הוצאות ששולמו</dt><dd>{ils(s.spent)}</dd></div>
          <div><dt>הוצאות שעדיין צפויות</dt><dd>{ils(s.pending)}</dd></div>
          <div className="total"><dt>סה״כ צפוי לחודש</dt><dd>{ils(s.forecast)}</dd></div>
          <div className={s.forecastLeft < 0 ? 'neg-text' : ''}>
            <dt>יתרה צפויה בסוף החודש</dt><dd>{ils(s.forecastLeft)}</dd>
          </div>
        </dl>
        {pendingList.length > 0 && (
          <ul className="pending-list">
            {pendingList.map((e) => (
              <li key={e.id}>
                <span>{e.name}</span>
                <span>{ils(e.amount ?? 0)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>📊 לאן הכסף הולך</h2>
        {totals.length === 0 ? (
          <p className="muted">עוד לא הוזנו הוצאות החודש. <button className="link" onClick={onGoExpenses}>להזנת הוצאות ←</button></p>
        ) : (
          <div className="cats">
            <Donut totals={totals.filter((t) => t.spent > 0)} />
            <table className="cat-table">
              <tbody>
                {[...totals]
                  .sort((a, b) => b.spent + b.pending - (a.spent + a.pending))
                  .map((t) => (
                    <tr key={t.category.id}>
                      <th scope="row">
                        <span className="swatch" style={{ background: seriesVar(t.category.colorSlot) }} />
                        {t.category.emoji} {t.category.name}
                      </th>
                      <td className="cat-bar-cell">
                        <span className="cat-bar">
                          <span style={{ width: `${(t.spent / maxCat) * 100}%`, background: seriesVar(t.category.colorSlot) }} />
                          <span className="cat-bar-pending" style={{ width: `${(t.pending / maxCat) * 100}%` }} />
                        </span>
                      </td>
                      <td className="num">
                        {ils(t.spent)}
                        {t.pending > 0 && <div className="muted small">+{ils(t.pending)} צפוי</div>}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">סה״כ</th>
                  <td />
                  <td className="num">{ils(s.spent)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>📈 השוואה לחודשים קודמים</h2>
        {points.length < 2 ? (
          <p className="muted">ההשוואה תופיע אחרי שיהיה יותר מחודש אחד במערכת.</p>
        ) : (
          <>
            <HistoryBars points={points} current={month.key} />
            <p className="muted small">סה״כ הוצאות לחודש (כולל הוצאות קבועות צפויות)</p>
          </>
        )}
        {notes.length > 0 && (
          <ul className="insights">
            {notes.map((n) => (
              <li key={n.text} className={n.direction}>
                <span aria-hidden>{n.direction === 'up' ? '▲' : n.direction === 'down' ? '▼' : '='}</span> {n.text}
              </li>
            ))}
          </ul>
        )}
        {points.length >= 2 && notes.length === 0 && (
          <p className="muted small">אין נתונים לחודש שלפני {monthName(month.key)} להשוואה.</p>
        )}
      </section>
    </div>
  );
}
