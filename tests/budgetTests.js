import { test } from 'node:test';
import assert from 'node:assert/strict';
import { budgetRows, copyBudget } from '../assets/js/services/budgetService.js';
import { goalStats, requiredMonthly, balanceOf } from '../assets/js/services/savingsService.js';
import { forecast, SCENARIOS } from '../assets/js/services/forecastService.js';
import { createDefaultData } from '../assets/js/data/defaults.js';
import { validateImport, migrate } from '../assets/js/data/dataMigration.js';

const spend = (id, categoryId, amount, date) => ({ id, title: id, amount, type: 'expense', categoryId, date, paidBy: 'person-1', sharing: { method: 'equal' }, status: 'paid' });

test('budget vs actual: remaining, percent and status', () => {
  const d = createDefaultData();
  d.transactions.push(spend('a', 'groceries', 4500, '2026-11-02'), spend('b', 'electricity', 1450, '2026-11-02'));
  const rows = Object.fromEntries(budgetRows(d, '2026-11').map((r) => [r.categoryId, r]));
  assert.equal(rows.groceries.remaining, 500);
  assert.equal(rows.groceries.status, 'warning');
  assert.equal(rows.electricity.remaining, -250);
  assert.equal(rows.electricity.status, 'exceeded');
});

test('rollover is derived and the base budget stays untouched', () => {
  const d = createDefaultData();
  d.categories.find((c) => c.id === 'groceries').rollover = 'carry-unused';
  d.transactions.push(spend('a', 'groceries', 4000, '2026-10-02'));
  const row = budgetRows(d, '2026-11').find((r) => r.categoryId === 'groceries');
  assert.equal(row.base, 5000);
  assert.equal(row.rollover, 1000);
  assert.equal(row.planned, 6000);
});
test('carry-both reduces next month after overspending; reset ignores it', () => {
  const d = createDefaultData();
  d.transactions.push(spend('a', 'groceries', 5600, '2026-10-02'));
  d.categories.find((c) => c.id === 'groceries').rollover = 'carry-both';
  assert.equal(budgetRows(d, '2026-11').find((r) => r.categoryId === 'groceries').planned, 4400);
  d.categories.find((c) => c.id === 'groceries').rollover = 'reset';
  assert.equal(budgetRows(d, '2026-11').find((r) => r.categoryId === 'groceries').planned, 5000);
});
test('copying a budget uses overrides and leaves defaults alone', () => {
  const d = createDefaultData();
  d.monthlyOverrides['2026-10'] = { groceries: 7000 };
  copyBudget(d, '2026-10', '2026-11');
  assert.equal(d.monthlyOverrides['2026-11'].groceries, 7000);
  assert.equal(d.categories.find((c) => c.id === 'groceries').monthlyBudget, 5000);
});

test('sinking fund: 6,000 insurance needs 500 per month', () => {
  const f = { id: 'f', name: 'Insurance', target: 6000, expectedDate: '2027-01-01', owner: 'shared', contributions: [] };
  assert.equal(requiredMonthly(f, '2026-01-01'), 500);
});
test('savings contributions, withdrawals and transfers net out', () => {
  const a = { target: 1000, contributions: [{ amount: 600 }, { amount: -100 }] };
  const b = { target: 1000, contributions: [{ amount: 100 }] };
  assert.deepEqual(goalStats(a), { balance: 500, remaining: 500, percent: 50 });
  assert.equal(balanceOf(a.contributions) + balanceOf(b.contributions), 600);
});

test('forecast is pure, 12 months, and does not double count bills in a category', () => {
  const d = createDefaultData();
  d.transactions.push({ ...spend('i', 'salary', 50000, '2026-10-01'), type: 'income' });
  d.recurringBills.push({ id: 'b', name: 'Water', categoryId: 'housing', frequency: 'monthly', startDate: '2026-01-05', active: true, paidBy: 'person-1', sharing: { method: 'equal' }, amountHistory: [{ from: '2026-01-05', amount: 300 }] });
  const before = JSON.stringify(d);
  const rows = forecast(d, '2026-11', SCENARIOS[0]);
  assert.equal(rows.length, 12);
  assert.equal(JSON.stringify(d), before);
  const cat = d.categories.filter((c) => (c.kind ?? 'expense') === 'expense').reduce((s, c) => s + c.monthlyBudget, 0);
  assert.equal(rows[0].expenses, cat);
  assert.equal(rows[0].income, 50000);
});
test('scenarios change projections but not data', () => {
  const d = createDefaultData();
  d.transactions.push({ ...spend('i', 'salary', 10000, '2026-10-01'), type: 'income' });
  const base = forecast(d, '2026-11', SCENARIOS[0])[0];
  const worse = forecast(d, '2026-11', { ...SCENARIOS[0], incomePct: -10, electricityPct: 50, extraExpense: 1000 })[0];
  assert.equal(worse.income, 9000);
  assert.ok(worse.expenses > base.expenses);
});

test('import validation rejects bad data and migrates old data', () => {
  assert.throws(() => validateImport(null));
  assert.throws(() => validateImport({}), /version/);
  assert.throws(() => validateImport({ version: 99, people: [], categories: [], transactions: [] }), /newer/);
  const old = createDefaultData();
  delete old.recurringBills;
  old.version = 1;
  const ok = validateImport(old);
  assert.deepEqual(ok.recurringBills, []);
  assert.equal(ok.version, 2);
  assert.equal(migrate({ ...old, categories: [{ id: 'salary', name: 's', icon: 'x', monthlyBudget: 0, archived: false }] }).categories[0].kind, 'income');
});
