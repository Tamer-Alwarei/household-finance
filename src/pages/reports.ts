import { dataManager } from '../data/dataManager.js';
import { incomeVsExpensesByMonth, sharedVsIndividual, spendingByCategory, spendingByPerson, toCsv } from '../services/reportService.js';
import { amountOn } from '../services/recurringService.js';
import { drawChart } from '../components/charts.js';
import { downloadFile, pageHeader } from '../components/ui.js';
import { escapeHtml, formatMoney } from '../utils/format.js';
import { addMonthKey, monthRange, todayStr } from '../utils/dateUtils.js';

const range = { from: monthRange(addMonthKey(todayStr().slice(0, 7), -5)).from, to: monthRange(todayStr().slice(0, 7)).to };

export function renderReports(container: HTMLElement): void {
  const { data } = dataManager;
  const money = (n: number) => formatMoney(n, data.settings.currency);
  const byCat = spendingByCategory(data, range.from, range.to);
  const byPerson = spendingByPerson(data, range.from, range.to);
  const split = sharedVsIndividual(data, range.from, range.to);
  const monthly = incomeVsExpensesByMonth(data, range.from, range.to);
  const bills = data.recurringBills.filter((b) => b.amountHistory.length > 1);

  container.innerHTML = `
    ${pageHeader('Reports', `<button class="btn btn-outline-secondary btn-sm" data-export="csv"><i class="bi bi-filetype-csv me-1"></i>CSV</button>
      <button class="btn btn-outline-secondary btn-sm" data-export="json"><i class="bi bi-filetype-json me-1"></i>JSON</button>`)}
    <div class="row g-2 mb-3">
      <div class="col-6 col-md-3"><label class="form-label small" for="rp-from">From</label><input class="form-control form-control-sm" type="date" id="rp-from" value="${range.from}"></div>
      <div class="col-6 col-md-3"><label class="form-label small" for="rp-to">To</label><input class="form-control form-control-sm" type="date" id="rp-to" value="${range.to}"></div>
    </div>
    <div class="row g-3">
      <div class="col-12 col-lg-6"><div class="card h-100"><div class="card-body"><h2 class="h5">Spending by category</h2><div style="height:260px"><canvas id="rp-cat"></canvas></div></div></div></div>
      <div class="col-12 col-lg-6"><div class="card h-100"><div class="card-body"><h2 class="h5">Income vs expenses by month</h2><div style="height:260px"><canvas id="rp-month"></canvas></div></div></div></div>
      <div class="col-12 col-md-6"><div class="card h-100"><div class="card-body"><h2 class="h5">By person</h2>
        <table class="table table-sm mb-0"><thead><tr><th></th><th class="text-end">Paid</th><th class="text-end">Responsible</th></tr></thead><tbody>
        ${byPerson.map((p) => `<tr><td>${escapeHtml(p.name)}</td><td class="text-end">${money(p.paid)}</td><td class="text-end">${money(p.responsible)}</td></tr>`).join('')}</tbody></table></div></div></div>
      <div class="col-12 col-md-6"><div class="card h-100"><div class="card-body"><h2 class="h5">Shared vs individual</h2>
        <div>Shared: ${money(split.shared)}</div><div>Individual: ${money(split.individual)}</div></div></div></div>
      <div class="col-12"><div class="card"><div class="card-body"><h2 class="h5">Recurring bill price changes</h2>
        ${bills.length ? bills.map((b) => `<div><strong>${escapeHtml(b.name)}</strong>: ${[...b.amountHistory].sort((a, c) => a.from.localeCompare(c.from)).map((h) => `${h.from} ${money(amountOn(b, h.from))}`).join(' → ')}</div>`).join('') : '<div class="text-body-secondary">No price changes recorded.</div>'}</div></div></div>
    </div>`;

  drawChart('rp-cat', { type: 'doughnut', data: { labels: byCat.map((c) => c.name), datasets: [{ data: byCat.map((c) => c.total) }] }, options: { responsive: true, maintainAspectRatio: false } });
  drawChart('rp-month', {
    type: 'bar',
    data: { labels: monthly.map((m) => m.month), datasets: [{ label: 'Income', data: monthly.map((m) => m.income), backgroundColor: '#198754' }, { label: 'Expenses', data: monthly.map((m) => m.expenses), backgroundColor: '#dc3545' }] },
    options: { responsive: true, maintainAspectRatio: false },
  });

  for (const key of ['from', 'to'] as const) {
    container.querySelector(`#rp-${key}`)!.addEventListener('change', (e) => {
      const v = (e.target as HTMLInputElement).value;
      if (v) { range[key] = v; renderReports(container); }
    });
  }
  container.onclick = (e) => {
    const kind = (e.target as HTMLElement).closest<HTMLElement>('[data-export]')?.dataset.export;
    if (kind === 'csv') downloadFile('spending-by-category.csv', toCsv(['Category', 'Total'], byCat.map((c) => [c.name, c.total])), 'text/csv;charset=utf-8');
    if (kind === 'json') downloadFile('report.json', JSON.stringify({ range, byCategory: byCat, byPerson, sharedVsIndividual: split, monthly }, null, 2), 'application/json');
  };
}
