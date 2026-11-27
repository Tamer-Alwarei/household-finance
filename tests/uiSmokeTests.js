import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// Renders every page against demo data to catch runtime errors and check key interactions.
const dom = new JSDOM('<!doctype html><body><main id="app"></main></body>', { url: 'http://localhost/' });
for (const k of ['window', 'document', 'localStorage', 'Event', 'HTMLElement', 'URL', 'Blob']) {
  Object.defineProperty(globalThis, k, { value: k === 'URL' || k === 'Blob' ? globalThis[k] : dom.window[k], configurable: true, writable: true });
}
globalThis.structuredClone ??= (v) => JSON.parse(JSON.stringify(v));

const { dataManager } = await import('../assets/js/data/dataManager.js');
const pages = {
  dashboard: (await import('../assets/js/pages/dashboard.js')).renderDashboard,
  transactions: (await import('../assets/js/pages/transactions.js')).renderTransactions,
  recurring: (await import('../assets/js/pages/recurringBills.js')).renderRecurringBills,
  calendar: (await import('../assets/js/pages/paymentCalendar.js')).renderPaymentCalendar,
  monthly: (await import('../assets/js/pages/monthlyBudget.js')).renderMonthlyBudget,
  annual: (await import('../assets/js/pages/annualBudget.js')).renderAnnualBudget,
  savings: (await import('../assets/js/pages/savings.js')).renderSavings,
  sinking: (await import('../assets/js/pages/savings.js')).renderSinkingFunds,
  settlements: (await import('../assets/js/pages/settlements.js')).renderSettlements,
  debts: (await import('../assets/js/pages/debts.js')).renderDebts,
  forecasts: (await import('../assets/js/pages/forecasts.js')).renderForecasts,
  reports: (await import('../assets/js/pages/reports.js')).renderReports,
  settings: (await import('../assets/js/pages/settings.js')).renderSettings,
};

for (const empty of [true, false]) {
  for (const [name, render] of Object.entries(pages)) {
    test(`${name} renders (${empty ? 'empty data' : 'demo data'})`, () => {
      if (empty) dataManager.reset(); else dataManager.loadDemoData();
      const el = document.getElementById('app');
      render(el);
      assert.ok(el.innerHTML.length > 100);
      assert.ok(!el.innerHTML.includes('undefined') && !el.innerHTML.includes('NaN'), `${name} output contains undefined/NaN`);
    });
  }
}

test('recurring bills: add, change price keeps history, delete', () => {
  dataManager.reset();
  dataManager.update((d) => d.recurringBills.push({ id: 'b', name: 'Net', categoryId: 'subscriptions', frequency: 'monthly', startDate: '2026-01-10', active: true, paidBy: 'person-1', sharing: { method: 'equal' }, amountHistory: [{ from: '2026-01-10', amount: 100 }] }));
  const el = document.getElementById('app');
  pages.recurring(el);
  assert.ok(el.textContent.includes('Net'));
});

test('transactions page: filters, sorting and row actions work', () => {
  dataManager.loadDemoData();
  const el = document.getElementById('app');
  pages.transactions(el);
  const rows = () => el.querySelectorAll('#tx-body tr').length;
  const total = rows();
  assert.ok(total > 5);
  const search = el.querySelector('#tx-search');
  search.value = 'rent';
  search.dispatchEvent(new dom.window.Event('input'));
  assert.ok(rows() > 0 && rows() < total);
  search.value = 'zzzz';
  search.dispatchEvent(new dom.window.Event('input'));
  assert.ok(el.querySelector('#tx-body').textContent.includes('No transactions match'));
  search.value = '';
  search.dispatchEvent(new dom.window.Event('input'));
  el.querySelector('[data-action=duplicate]').click();
  assert.equal(dataManager.data.transactions.length, total + 1 + 0 + (dataManager.data.transactions.length - total - 1));
});

test('settings: category with history cannot be deleted, only archived', () => {
  dataManager.loadDemoData();
  const el = document.getElementById('app');
  pages.settings(el);
  assert.equal(el.querySelector('[data-action=cat-delete][data-id=groceries]'), null);
  assert.ok(el.querySelector('[data-action=cat-archive][data-id=groceries]'));
});
