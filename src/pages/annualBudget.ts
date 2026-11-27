import { dataManager } from '../data/dataManager.js';
import { actualFor, kindOf, baseBudget } from '../services/budgetService.js';
import { monthSummary } from '../services/calculationService.js';
import { baselineIncome } from '../services/forecastService.js';
import { dueItems } from '../services/recurringService.js';
import { pageHeader } from '../components/ui.js';
import { escapeHtml, formatMoney } from '../utils/format.js';
import { monthRange, todayStr } from '../utils/dateUtils.js';

const view = { year: Number(todayStr().slice(0, 4)) };

export function renderAnnualBudget(container: HTMLElement): void {
  const { data } = dataManager;
  const money = (n: number) => formatMoney(n, data.settings.currency);
  const months = (y: number) => Array.from({ length: 12 }, (_, k) => `${y}-${String(k + 1).padStart(2, '0')}`);

  const table = (y: number) => months(y).map((m) => {
    const s = monthSummary(data, m);
    const { from, to } = monthRange(m);
    const plannedExpenses = data.categories.filter((c) => !c.archived && kindOf(c) === 'expense').reduce((t, c) => t + baseBudget(data, c, m), 0);
    const plannedSavings = data.categories.filter((c) => !c.archived && kindOf(c) === 'savings').reduce((t, c) => t + baseBudget(data, c, m), 0);
    const recurring = dueItems(data, from, to).reduce((t, i) => t + i.amount, 0);
    return { m, plannedIncome: baselineIncome(data, m), s, plannedExpenses, plannedSavings, recurring };
  });
  const cur = table(view.year);
  const prev = table(view.year - 1);
  const total = (rows: typeof cur, f: (r: (typeof cur)[0]) => number) => rows.reduce((t, r) => t + f(r), 0);
  const shared = data.transactions.filter((t) => t.type === 'expense' && t.date.startsWith(String(view.year)));
  const sharedTotal = shared.filter((t) => t.sharing.method !== 'individual').reduce((s, t) => s + t.amount, 0);
  const individualTotal = shared.filter((t) => t.sharing.method === 'individual').reduce((s, t) => s + t.amount, 0);

  const diff = (a: number, b: number) => (b === 0 ? '-' : `${a - b >= 0 ? '+' : ''}${Math.round(((a - b) / b) * 100)}%`);
  const stat = (label: string, value: string) => `<div class="col-6 col-lg-3"><div class="card h-100"><div class="card-body"><div class="small text-body-secondary">${label}</div><div class="stat-value">${value}</div></div></div></div>`;

  // Annual category budget = sum of the 12 monthly bases.
  const catRows = data.categories.filter((c) => !c.archived && kindOf(c) !== 'income').map((c) => {
    const planned = months(view.year).reduce((t, m) => t + baseBudget(data, c, m), 0);
    const actual = months(view.year).reduce((t, m) => t + actualFor(data, c, m), 0);
    return { c, planned, actual };
  }).filter((r) => r.planned > 0 || r.actual > 0);

  container.innerHTML = `
    ${pageHeader('Annual Budget', `<div class="btn-group btn-group-sm"><button class="btn btn-outline-secondary" data-year="-1" aria-label="Previous year"><i class="bi bi-chevron-left"></i></button>
      <span class="btn btn-outline-secondary disabled">${view.year}</span><button class="btn btn-outline-secondary" data-year="1" aria-label="Next year"><i class="bi bi-chevron-right"></i></button></div>`, 'One combined annual household budget')}
    <div class="row g-3 mb-3">
      ${stat('Actual income', money(total(cur, (r) => r.s.income)))}${stat('Planned expenses', money(total(cur, (r) => r.plannedExpenses)))}
      ${stat('Actual expenses', money(total(cur, (r) => r.s.expenses)))}${stat('Recurring bills (expected)', money(total(cur, (r) => r.recurring)))}
      ${stat('Planned savings', money(total(cur, (r) => r.plannedSavings)))}${stat('Actual savings', money(total(cur, (r) => r.s.savings)))}
      ${stat('Shared / individual', `${money(sharedTotal)} / ${money(individualTotal)}`)}${stat('Remaining annual budget', money(total(cur, (r) => r.s.remaining)))}
    </div>
    <div class="card mb-3"><div class="card-body pb-0"><h2 class="h5">Month by month</h2></div><div class="table-responsive"><table class="table table-sm align-middle mb-0">
      <thead><tr><th>Month</th><th class="text-end d-none d-lg-table-cell">Planned income</th><th class="text-end">Income</th><th class="text-end d-none d-md-table-cell">Planned exp.</th><th class="text-end">Expenses</th><th class="text-end d-none d-md-table-cell">Savings</th><th class="text-end">Remaining</th></tr></thead>
      <tbody>${cur.map((r) => `<tr><td>${r.m}</td><td class="text-end d-none d-lg-table-cell">${money(r.plannedIncome)}</td><td class="text-end">${money(r.s.income)}</td>
        <td class="text-end d-none d-md-table-cell">${money(r.plannedExpenses)}</td><td class="text-end ${r.s.expenses > r.plannedExpenses && r.plannedExpenses > 0 ? 'text-negative' : ''}">${money(r.s.expenses)}</td>
        <td class="text-end d-none d-md-table-cell">${money(r.s.savings)}</td><td class="text-end ${r.s.remaining < 0 ? 'text-negative' : ''}">${money(r.s.remaining)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="row g-3">
      <div class="col-12 col-xl-7"><div class="card h-100"><div class="card-body"><h2 class="h5">Annual category budget vs actual</h2>
        <div class="table-responsive"><table class="table table-sm mb-0"><thead><tr><th>Category</th><th class="text-end">Planned</th><th class="text-end">Actual</th><th class="text-end">Difference</th></tr></thead>
        <tbody>${catRows.map(({ c, planned, actual }) => `<tr><td>${escapeHtml(c.name)}</td><td class="text-end">${money(planned)}</td><td class="text-end">${money(actual)}</td>
          <td class="text-end ${planned - actual < 0 ? 'text-negative' : 'text-positive'}">${money(planned - actual)}</td></tr>`).join('')}</tbody></table></div></div></div></div>
      <div class="col-12 col-xl-5"><div class="card h-100"><div class="card-body"><h2 class="h5">Compared with ${view.year - 1}</h2>
        <table class="table table-sm mb-0"><thead><tr><th></th><th class="text-end">${view.year}</th><th class="text-end">${view.year - 1}</th><th class="text-end">Change</th></tr></thead><tbody>
        ${[['Income', (r: (typeof cur)[0]) => r.s.income], ['Expenses', (r: (typeof cur)[0]) => r.s.expenses], ['Savings', (r: (typeof cur)[0]) => r.s.savings]].map(([label, f]) => {
          const a = total(cur, f as (r: (typeof cur)[0]) => number); const b = total(prev, f as (r: (typeof cur)[0]) => number);
          return `<tr><td>${label}</td><td class="text-end">${money(a)}</td><td class="text-end">${money(b)}</td><td class="text-end">${diff(a, b)}</td></tr>`;
        }).join('')}</tbody></table>
        ${total(prev, (r) => r.s.income + r.s.expenses) === 0 ? '<div class="small text-body-secondary mt-2">No data for the previous year, so comparisons are not meaningful.</div>' : ''}</div></div></div>
    </div>`;

  container.onclick = (e) => {
    const step = (e.target as HTMLElement).closest<HTMLElement>('[data-year]')?.dataset.year;
    if (step) { view.year += Number(step); renderAnnualBudget(container); }
  };
}
