import { dataManager } from '../data/dataManager.js';
import { dueItems, markPaid } from '../services/recurringService.js';
import { emptyState, monthPicker, pageHeader } from '../components/ui.js';
import { escapeHtml, formatMoney } from '../utils/format.js';
import { addDays, daysInMonth, fmtDate, monthRange, parseDate, todayStr } from '../utils/dateUtils.js';
const view = { month: todayStr().slice(0, 7), mode: 'month', person: '', category: '', status: '' };
const matches = (i) => (!view.person || i.bill.paidBy === view.person) &&
    (!view.category || i.bill.categoryId === view.category) &&
    (!view.status || (view.status === 'paid' ? i.paid : view.status === 'overdue' ? i.overdue : !i.paid && !i.overdue));
export function renderPaymentCalendar(container) {
    const { data } = dataManager;
    const money = (n) => formatMoney(n, data.settings.currency);
    const today = todayStr();
    const catName = (id) => data.categories.find((c) => c.id === id)?.name ?? id;
    const personName = (id) => data.people.find((p) => p.id === id)?.name ?? id;
    const badge = (i) => (i.paid ? 'success' : i.overdue ? 'danger' : 'secondary');
    const statusText = (i) => (i.paid ? 'Paid' : i.overdue ? 'Overdue' : 'Unpaid');
    const itemHtml = (i, showDate = true) => `
    <div class="d-flex justify-content-between align-items-center border-bottom py-2 gap-2">
      <div class="min-w-0"><div class="fw-semibold">${escapeHtml(i.bill.name)}</div>
        <div class="small text-body-secondary">${showDate ? i.due + ' · ' : ''}${escapeHtml(catName(i.bill.categoryId))} · ${escapeHtml(personName(i.bill.paidBy))}</div></div>
      <div class="text-end text-nowrap">${money(i.amount)}<div><span class="badge text-bg-${badge(i)}">${statusText(i)}</span></div></div>
      ${i.paid ? '' : `<button class="btn btn-sm btn-outline-success" data-pay="${i.bill.id}|${i.due}" aria-label="Mark paid"><i class="bi bi-check-lg"></i></button>`}
    </div>`;
    const upcoming = (days) => dueItems(data, today, addDays(today, days)).filter((i) => !i.paid && matches(i));
    const overdue = dueItems(data, addDays(today, -365), addDays(today, -1)).filter((i) => i.overdue && matches(i));
    // Expected total per month of the year, highlighting months well above average.
    const year = Number(view.month.slice(0, 4));
    const yearTotals = Array.from({ length: 12 }, (_, k) => {
        const m = `${year}-${String(k + 1).padStart(2, '0')}`;
        const { from, to } = monthRange(m);
        return { m, total: dueItems(data, from, to).filter(matches).reduce((s, i) => s + i.amount, 0) };
    });
    const avg = yearTotals.reduce((s, y) => s + y.total, 0) / 12;
    const { from, to } = monthRange(view.month);
    const items = dueItems(data, from, to).filter(matches);
    const monthTotal = items.reduce((s, i) => s + i.amount, 0);
    const { y, m } = parseDate(from);
    const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday first
    const cells = Array.from({ length: firstWeekday }, () => '<div class="border bg-body-tertiary"></div>');
    for (let d = 1; d <= daysInMonth(y, m); d++) {
        const date = fmtDate(y, m, d);
        const day = items.filter((i) => i.due === date);
        cells.push(`<div class="border p-1 small ${date === today ? 'bg-primary-subtle' : ''}" style="min-height:5.5rem"><div class="fw-semibold">${d}</div>${day.map((i) => `<div class="badge text-bg-${badge(i)} d-block text-truncate text-start mb-1" title="${escapeHtml(i.bill.name)}">${escapeHtml(i.bill.name)}</div>`).join('')}</div>`);
    }
    const select = (id, opts, cur, all) => `<select class="form-select form-select-sm" id="${id}" aria-label="${all}" style="width:auto"><option value="">${all}</option>${opts.map((o) => `<option value="${o.v}" ${o.v === cur ? 'selected' : ''}>${escapeHtml(o.l)}</option>`).join('')}</select>`;
    container.innerHTML = `
    ${pageHeader('Payment Calendar', '', 'Expected recurring bills. Marking paid creates the actual transaction.')}
    <div class="d-flex flex-wrap gap-2 mb-3 align-items-center">
      ${monthPicker('cal-month', view.month)}
      <div class="btn-group btn-group-sm" role="group">
        <button class="btn btn-outline-primary ${view.mode === 'month' ? 'active' : ''}" data-mode="month">Month</button>
        <button class="btn btn-outline-primary ${view.mode === 'year' ? 'active' : ''}" data-mode="year">Year</button>
      </div>
      ${select('cal-person', data.people.map((p) => ({ v: p.id, l: p.name })), view.person, 'All people')}
      ${select('cal-category', data.categories.map((c) => ({ v: c.id, l: c.name })), view.category, 'All categories')}
      ${select('cal-status', [{ v: 'paid', l: 'Paid' }, { v: 'unpaid', l: 'Unpaid' }, { v: 'overdue', l: 'Overdue' }], view.status, 'All statuses')}
    </div>
    <div class="row g-3">
      <div class="col-12 col-xl-8">
        <div class="card"><div class="card-body">
          ${view.mode === 'month' ? `
            <h2 class="h5">Expected in ${view.month}: ${money(monthTotal)}</h2>
            <div class="d-none d-md-grid" style="grid-template-columns:repeat(7,1fr)">
              ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<div class="text-center small fw-semibold">${d}</div>`).join('')}${cells.join('')}
            </div>
            <div class="d-md-none">${items.length ? items.map((i) => itemHtml(i)).join('') : emptyState('No bills this month.')}</div>`
        : `<h2 class="h5">Expected per month in ${year}</h2>
            <div class="row g-2">${yearTotals.map((t) => `<div class="col-6 col-md-4 col-lg-3"><div class="border rounded p-2 ${avg > 0 && t.total > avg * 1.3 ? 'border-danger' : ''}">
              <div class="small text-body-secondary">${t.m}${avg > 0 && t.total > avg * 1.3 ? ' · expensive month' : ''}</div><div class="fw-semibold">${money(t.total)}</div></div></div>`).join('')}</div>`}
        </div></div>
      </div>
      <div class="col-12 col-xl-4">
        <div class="card mb-3"><div class="card-body"><h2 class="h6 text-danger">Overdue</h2>${overdue.length ? overdue.map((i) => itemHtml(i)).join('') : '<div class="small text-body-secondary">Nothing overdue.</div>'}</div></div>
        <div class="card mb-3"><div class="card-body"><h2 class="h6">Next 7 days</h2>${upcoming(7).length ? upcoming(7).map((i) => itemHtml(i)).join('') : '<div class="small text-body-secondary">Nothing due.</div>'}</div></div>
        <div class="card"><div class="card-body"><h2 class="h6">Next 30 days</h2>${upcoming(30).length ? upcoming(30).map((i) => itemHtml(i)).join('') : '<div class="small text-body-secondary">Nothing due.</div>'}</div></div>
      </div>
    </div>`;
    const bind = (id, key) => container.querySelector(`#${id}`).addEventListener('change', (e) => {
        const v = e.target.value;
        if (key === 'month' && !v)
            return;
        view[key] = v;
        renderPaymentCalendar(container);
    });
    bind('cal-month', 'month');
    bind('cal-person', 'person');
    bind('cal-category', 'category');
    bind('cal-status', 'status');
    container.onclick = (e) => {
        const t = e.target;
        const mode = t.closest('[data-mode]')?.dataset.mode;
        if (mode) {
            view.mode = mode;
            renderPaymentCalendar(container);
            return;
        }
        const pay = t.closest('[data-pay]')?.dataset.pay;
        if (!pay)
            return;
        const [billId, due] = pay.split('|');
        dataManager.update((d) => {
            const bill = d.recurringBills.find((b) => b.id === billId);
            if (bill)
                markPaid(d, bill, due);
        });
    };
}
//# sourceMappingURL=paymentCalendar.js.map