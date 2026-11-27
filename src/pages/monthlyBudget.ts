import { dataManager } from '../data/dataManager.js';
import { budgetRows, copyBudget, baseBudget } from '../services/budgetService.js';
import { monthSummary } from '../services/calculationService.js';
import { baselineIncome } from '../services/forecastService.js';
import { dueItems } from '../services/recurringService.js';
import { sharedVsIndividual, spendingByPerson } from '../services/reportService.js';
import type { RolloverRule } from '../models/types.js';
import { openForm } from '../components/formModal.js';
import { emptyState, monthPicker, pageHeader, progressBar } from '../components/ui.js';
import { escapeHtml, formatMoney } from '../utils/format.js';
import { addMonthKey, monthRange, todayStr } from '../utils/dateUtils.js';

const view = { month: todayStr().slice(0, 7) };
const RULES: { v: RolloverRule; l: string }[] = [
  { v: 'reset', l: 'Reset each month' },
  { v: 'carry-unused', l: 'Carry unused budget forward' },
  { v: 'carry-both', l: 'Carry unused and reduce after overspending' },
];

export function renderMonthlyBudget(container: HTMLElement): void {
  const { data } = dataManager;
  const money = (n: number) => formatMoney(n, data.settings.currency);
  const month = view.month;
  const rows = budgetRows(data, month);
  const sum = monthSummary(data, month);
  const { from, to } = monthRange(month);
  const expectedRecurring = dueItems(data, from, to).filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0);
  const plannedExpenses = rows.filter((r) => r.kind === 'expense').reduce((s, r) => s + r.planned, 0);
  const plannedSavings = rows.filter((r) => r.kind === 'savings').reduce((s, r) => s + r.planned, 0);
  const plannedIncome = baselineIncome(data, month);
  const split = sharedVsIndividual(data, from, to);
  const persons = spendingByPerson(data, from, to);
  const stat = (label: string, value: number, cls = '') => `<div class="col-6 col-lg-3"><div class="card h-100"><div class="card-body"><div class="small text-body-secondary">${label}</div><div class="stat-value ${cls}">${money(value)}</div></div></div></div>`;
  const ruleLabel = (id: string) => RULES.find((r) => r.v === (data.categories.find((c) => c.id === id)?.rollover ?? 'reset'))!.l;

  container.innerHTML = `
    ${pageHeader('Monthly Budget', `${monthPicker('mb-month', month)}
      <button class="btn btn-outline-secondary btn-sm" data-action="copy-prev">Copy previous month</button>
      <button class="btn btn-outline-secondary btn-sm" data-action="copy-other">Copy another month</button>`, 'One combined household budget')}
    <div class="row g-3 mb-3">
      ${stat('Planned income (average)', plannedIncome)}${stat('Actual income', sum.income, 'text-positive')}
      ${stat('Planned expenses', plannedExpenses)}${stat('Actual expenses', sum.expenses)}
      ${stat('Unpaid recurring (forecast)', expectedRecurring)}${stat('Planned savings', plannedSavings)}
      ${stat('Actual savings', sum.savings)}${stat('Remaining household budget', sum.remaining, sum.remaining < 0 ? 'text-negative' : 'text-positive')}
    </div>
    <div class="card mb-3"><div class="table-responsive">${rows.length ? `<table class="table align-middle mb-0">
      <thead><tr><th>Category</th><th class="text-end d-none d-lg-table-cell">Base</th><th class="text-end d-none d-lg-table-cell">Rollover</th>
        <th class="text-end">Budget</th><th class="text-end">Actual</th><th class="text-end">Remaining</th><th style="min-width:8rem" class="d-none d-md-table-cell">Used</th><th></th></tr></thead>
      <tbody>${rows.map((r) => `<tr>
        <td><i class="bi bi-${r.icon} me-1"></i>${escapeHtml(r.name)}<div class="small text-body-secondary">${r.status === 'exceeded' ? '<span class="text-negative">Exceeded</span>' : r.status === 'warning' ? '<span class="text-warning-hf">Approaching limit</span>' : 'Within budget'} · ${escapeHtml(ruleLabel(r.categoryId))}</div></td>
        <td class="text-end d-none d-lg-table-cell">${money(r.base)}</td><td class="text-end d-none d-lg-table-cell">${money(r.rollover)}</td>
        <td class="text-end">${money(r.planned)}</td><td class="text-end">${money(r.actual)}</td>
        <td class="text-end ${r.remaining < 0 ? 'text-negative' : 'text-positive'}">${r.remaining < 0 ? '-' : ''}${money(Math.abs(r.remaining))}</td>
        <td class="d-none d-md-table-cell">${progressBar(r.percent, r.status, r.name)}<div class="small text-body-secondary">${r.percent}%</div></td>
        <td class="text-end"><button class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="${r.categoryId}" aria-label="Edit budget"><i class="bi bi-pencil"></i></button></td></tr>`).join('')}</tbody></table>` : emptyState('No budgets or spending in this month.')}</div></div>
    <div class="row g-3">
      <div class="col-12 col-md-6"><div class="card h-100"><div class="card-body"><h2 class="h6">Shared vs individual expenses</h2>
        <div>Shared: ${money(split.shared)}</div><div>Individual: ${money(split.individual)}</div></div></div></div>
      <div class="col-12 col-md-6"><div class="card h-100"><div class="card-body"><h2 class="h6">Responsibility per person</h2>
        ${persons.map((p) => `<div>${escapeHtml(p.name)}: ${money(p.responsible)} <span class="text-body-secondary">(paid ${money(p.paid)})</span></div>`).join('')}</div></div></div>
    </div>`;

  container.querySelector('#mb-month')!.addEventListener('change', (e) => {
    const v = (e.target as HTMLInputElement).value;
    if (v) { view.month = v; renderMonthlyBudget(container); }
  });

  container.onclick = (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'copy-prev') {
      dataManager.update((d) => copyBudget(d, addMonthKey(month, -1), month));
    } else if (btn.dataset.action === 'copy-other') {
      openForm({
        title: 'Copy budget from another month',
        fields: [{ name: 'from', label: 'Copy from month', type: 'month', value: addMonthKey(month, -1), required: true, col: 'col-12' }],
        onSave: (v) => { dataManager.update((d) => copyBudget(d, v.from, month)); },
      });
    } else if (btn.dataset.action === 'edit') {
      const cat = data.categories.find((c) => c.id === btn.dataset.id)!;
      openForm({
        title: `Budget: ${cat.name}`,
        fields: [
          { name: 'amount', label: `Budget for ${month}`, type: 'number', value: baseBudget(data, cat, month), required: true, help: 'Changes only this month.' },
          { name: 'default', label: 'Default monthly target', type: 'number', value: cat.monthlyBudget, help: 'Used for months without an adjustment.' },
          { name: 'rollover', label: 'Rollover rule', type: 'select', options: RULES, value: cat.rollover ?? 'reset', col: 'col-12' },
        ],
        onSave: (v) => {
          if (Number(v.amount) < 0 || Number(v.default) < 0) return 'Budgets cannot be negative.';
          dataManager.update((d) => {
            const c = d.categories.find((x) => x.id === cat.id)!;
            c.monthlyBudget = Number(v.default);
            c.rollover = v.rollover as RolloverRule;
            (d.monthlyOverrides[month] ??= {})[c.id] = Number(v.amount);
          });
        },
      });
    }
  };
}
