import { dataManager } from '../data/dataManager.js';
import { budgetVsActual, monthSummary, personBreakdown } from '../services/calculationService.js';
import { buildAlerts } from '../services/alertService.js';
import { currentMonthKey, escapeHtml, formatMoney, monthLabel } from '../utils/format.js';

export function renderDashboard(container: HTMLElement): void {
  const { data } = dataManager;
  const cur = data.settings.currency;
  const month = currentMonthKey();
  const money = (n: number) => formatMoney(n, cur);
  const s = monthSummary(data, month);
  const rows = budgetVsActual(data, month);
  const people = personBreakdown(data, month);
  const recent = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const catName = (id: string) => data.categories.find((c) => c.id === id)?.name ?? id;
  const personName = (id: string) => data.people.find((p) => p.id === id)?.name ?? id;

  const alerts = buildAlerts(data).slice(0, 8);
  const alertsHtml = alerts.length ? `<div class="card mb-3"><div class="card-body"><h2 class="h6">Alerts</h2>${alerts.map((a) => `<div class="small text-${a.level === 'info' ? 'body-secondary' : a.level}"><i class="bi bi-exclamation-circle me-1"></i>${escapeHtml(a.text)}</div>`).join('')}</div></div>` : '';

  // Cards: 1 per row on phones, 2 on sm, 4 on lg+.
  const stat = (label: string, value: number, cls = '') => `
    <div class="col-12 col-sm-6 col-lg-3">
      <div class="card h-100"><div class="card-body">
        <div class="text-body-secondary small">${label}</div>
        <div class="stat-value ${cls}">${money(value)}</div>
      </div></div>
    </div>`;

  const barClass = { ok: 'bg-success', warning: 'bg-warning', exceeded: 'bg-danger' };
  const budgetHtml = rows.length
    ? rows.map((r) => `
      <div class="mb-3">
        <div class="d-flex justify-content-between small">
          <span><i class="bi bi-${r.icon} me-1"></i>${escapeHtml(r.name)}</span>
          <span class="${r.remaining < 0 ? 'text-negative' : 'text-positive'}">
            ${r.remaining < 0 ? money(-r.remaining) + ' over' : money(r.remaining) + ' left'}
          </span>
        </div>
        <div class="progress" role="progressbar" aria-label="${escapeHtml(r.name)} budget used" aria-valuenow="${r.percent}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar ${barClass[r.status]}" style="width:${Math.min(r.percent, 100)}%"></div>
        </div>
        <div class="text-body-secondary small">${money(r.actual)} of ${money(r.planned)} (${r.percent}%)</div>
      </div>`).join('')
    : '<p class="text-body-secondary mb-0">No category budgets set.</p>';

  const peopleHtml = people.map((r) => `
    <div class="col-12 col-md-6">
      <div class="border rounded p-3 h-100">
        <div class="fw-semibold mb-1">${escapeHtml(r.person.name)}</div>
        <div class="small">Paid: ${money(r.paid)}</div>
        <div class="small">Responsible for: ${money(r.responsible)}</div>
        <div class="small ${r.balance < 0 ? 'text-negative' : 'text-positive'}">
          ${r.balance < 0 ? 'Owes ' + money(-r.balance) : r.balance > 0 ? 'Is owed ' + money(r.balance) : 'Settled'}
        </div>
      </div>
    </div>`).join('');

  const txHtml = recent.length
    ? recent.map((t) => `
      <tr>
        <td>${t.date}</td>
        <td>${escapeHtml(t.title)}</td>
        <td class="d-none d-md-table-cell">${escapeHtml(catName(t.categoryId))}</td>
        <td class="d-none d-lg-table-cell">${escapeHtml(personName(t.paidBy))}</td>
        <td class="text-end ${t.type === 'income' ? 'text-positive' : ''}">${t.type === 'income' ? '+' : ''}${money(t.amount)}</td>
      </tr>`).join('')
    : '<tr><td colspan="5" class="text-center text-body-secondary py-4">No transactions yet.</td></tr>';

  container.innerHTML = `
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <div>
        <h1 class="h3 mb-0">Dashboard</h1>
        <div class="text-body-secondary">${monthLabel(month)} &middot; combined household</div>
      </div>
      <div>
        ${data.demo
          ? '<button class="btn btn-outline-danger btn-sm" id="demo-remove"><i class="bi bi-trash me-1"></i>Remove demo data</button>'
          : '<button class="btn btn-primary btn-sm" id="demo-load"><i class="bi bi-database-add me-1"></i>Load demo data</button>'}
      </div>
    </div>

    ${alertsHtml}
    <div class="row g-3 mb-3">
      ${stat('Income', s.income, 'text-positive')}
      ${stat('Expenses', s.expenses)}
      ${stat('Savings', s.savings)}
      ${stat('Remaining', s.remaining, s.remaining < 0 ? 'text-negative' : 'text-positive')}
    </div>

    <div class="row g-3">
      <div class="col-12 col-xl-7">
        <div class="card h-100"><div class="card-body">
          <h2 class="h5">Budget vs actual</h2>${budgetHtml}
        </div></div>
      </div>
      <div class="col-12 col-xl-5">
        <div class="card h-100"><div class="card-body">
          <h2 class="h5">Who paid what</h2>
          <div class="row g-2">${peopleHtml}</div>
        </div></div>
      </div>
      <div class="col-12">
        <div class="card"><div class="card-body">
          <h2 class="h5">Recent transactions</h2>
          <div class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead><tr>
                <th>Date</th><th>Title</th>
                <th class="d-none d-md-table-cell">Category</th>
                <th class="d-none d-lg-table-cell">Paid by</th>
                <th class="text-end">Amount</th>
              </tr></thead>
              <tbody>${txHtml}</tbody>
            </table>
          </div>
        </div></div>
      </div>
    </div>`;

  container.querySelector('#demo-load')?.addEventListener('click', () => dataManager.loadDemoData());
  container.querySelector('#demo-remove')?.addEventListener('click', () => dataManager.removeDemoData());
}
