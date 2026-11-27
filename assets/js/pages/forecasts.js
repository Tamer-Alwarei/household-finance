import { dataManager } from '../data/dataManager.js';
import { SCENARIOS, forecast } from '../services/forecastService.js';
import { drawChart } from '../components/charts.js';
import { pageHeader } from '../components/ui.js';
import { formatMoney } from '../utils/format.js';
import { todayStr } from '../utils/dateUtils.js';
// Scenario inputs live only in memory; they never change actual records or budgets.
const scenario = { ...SCENARIOS[0] };
export function renderForecasts(container) {
    const { data } = dataManager;
    const money = (n) => formatMoney(n, data.settings.currency);
    const start = todayStr().slice(0, 7);
    const rows = forecast(data, start, scenario);
    const avgExpense = rows.reduce((s, r) => s + r.expenses, 0) / 12;
    const num = (id, label, v) => `<div class="col-6 col-md-3"><label class="form-label small" for="${id}">${label}</label><input class="form-control form-control-sm" type="number" id="${id}" value="${v}"></div>`;
    container.innerHTML = `
    ${pageHeader('12-Month Forecast', '', 'Projected values only. They are never included in actual totals.')}
    <div class="card mb-3"><div class="card-body">
      <div class="d-flex flex-wrap gap-2 mb-3">${SCENARIOS.map((s) => `<button class="btn btn-sm ${s.name === scenario.name ? 'btn-primary' : 'btn-outline-primary'}" data-preset="${s.name}">${s.name}</button>`).join('')}</div>
      <div class="row g-2">${num('sc-income', 'Income change %', scenario.incomePct)}${num('sc-elec', 'Electricity change %', scenario.electricityPct)}${num('sc-save', 'Extra monthly savings', scenario.extraSavings)}${num('sc-extra', 'New monthly expense (e.g. car)', scenario.extraExpense)}</div>
    </div></div>
    <div class="card mb-3"><div class="card-body"><div style="height:280px"><canvas id="fc-chart"></canvas></div></div></div>
    <div class="card"><div class="table-responsive"><table class="table table-sm align-middle mb-0">
      <thead><tr><th>Month</th><th class="text-end">Income</th><th class="text-end">Expenses</th><th class="text-end d-none d-md-table-cell">of which bills</th><th class="text-end d-none d-md-table-cell">Savings</th><th class="text-end d-none d-lg-table-cell">Debt</th><th class="text-end">Cash flow</th><th class="text-end d-none d-lg-table-cell">Savings balance</th></tr></thead>
      <tbody>${rows.map((r) => `<tr class="${r.expenses > avgExpense * 1.15 ? 'table-warning' : ''}"><td>${r.month}${r.expenses > avgExpense * 1.15 ? ' <span class="badge text-bg-warning">High</span>' : ''}</td>
        <td class="text-end">${money(r.income)}</td><td class="text-end">${money(r.expenses)}</td><td class="text-end d-none d-md-table-cell">${money(r.recurring)}</td>
        <td class="text-end d-none d-md-table-cell">${money(r.savings)}</td><td class="text-end d-none d-lg-table-cell">${money(r.debt)}</td>
        <td class="text-end ${r.net < 0 ? 'text-negative' : 'text-positive'}">${money(r.net)}</td><td class="text-end d-none d-lg-table-cell">${money(r.savingsBalance)}</td></tr>`).join('')}</tbody></table></div></div>`;
    drawChart('fc-chart', {
        type: 'bar',
        data: {
            labels: rows.map((r) => r.month),
            datasets: [
                { label: 'Income', data: rows.map((r) => r.income), backgroundColor: '#198754' },
                { label: 'Expenses', data: rows.map((r) => r.expenses), backgroundColor: '#dc3545' },
                { type: 'line', label: 'Cash flow', data: rows.map((r) => r.net), borderColor: '#0d6efd' },
            ],
        },
        options: { responsive: true, maintainAspectRatio: false },
    });
    const bind = (id, key) => container.querySelector(`#${id}`).addEventListener('change', (e) => {
        scenario[key] = Number(e.target.value) || 0;
        scenario.name = 'Custom';
        renderForecasts(container);
    });
    bind('sc-income', 'incomePct');
    bind('sc-elec', 'electricityPct');
    bind('sc-save', 'extraSavings');
    bind('sc-extra', 'extraExpense');
    container.onclick = (e) => {
        const name = e.target.closest('[data-preset]')?.dataset.preset;
        const preset = SCENARIOS.find((s) => s.name === name);
        if (preset) {
            Object.assign(scenario, preset);
            renderForecasts(container);
        }
    };
}
//# sourceMappingURL=forecasts.js.map