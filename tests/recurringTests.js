import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amountOn, annualCost, markPaid, monthlyEquivalent, occurrences, dueItems } from '../assets/js/services/recurringService.js';
import { createDefaultData } from '../assets/js/data/defaults.js';
import { addMonths } from '../assets/js/utils/dateUtils.js';

const bill = (o = {}) => ({
  id: 'b1', name: 'Bill', categoryId: 'housing', frequency: 'monthly', startDate: '2026-01-31', active: true, paidBy: 'p1',
  sharing: { method: 'equal' }, amountHistory: [{ from: '2026-01-31', amount: 100 }], ...o,
});

test('month-end dates clamp and keep the anchor day', () => {
  assert.deepEqual(occurrences(bill(), '2026-01-01', '2026-04-30'), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
});
test('leap years: 31 Jan + 1 month = 29 Feb 2028', () => assert.equal(addMonths('2028-01-31', 1), '2028-02-29'));
test('weekly, biweekly, quarterly, six-month and annual frequencies', () => {
  assert.equal(occurrences(bill({ frequency: 'weekly', startDate: '2026-01-01' }), '2026-01-01', '2026-01-31').length, 5);
  assert.deepEqual(occurrences(bill({ frequency: 'biweekly', startDate: '2026-01-01' }), '2026-01-01', '2026-02-01'), ['2026-01-01', '2026-01-15', '2026-01-29']);
  assert.equal(occurrences(bill({ frequency: 'quarterly', startDate: '2026-01-10' }), '2026-01-01', '2026-12-31').length, 4);
  assert.equal(occurrences(bill({ frequency: 'semiannual', startDate: '2026-01-10' }), '2026-01-01', '2026-12-31').length, 2);
  assert.equal(occurrences(bill({ frequency: 'annual', startDate: '2026-01-10' }), '2026-01-01', '2027-12-31').length, 2);
});
test('end date stops occurrences', () => assert.equal(occurrences(bill({ endDate: '2026-02-28' }), '2026-01-01', '2026-12-31').length, 2));

test('3,000 every six months = 500 monthly equivalent and 6,000 annual', () => {
  const b = bill({ frequency: 'semiannual', amountHistory: [{ from: '2020-01-01', amount: 3000 }] });
  assert.equal(monthlyEquivalent(b), 500);
  assert.equal(annualCost(b), 6000);
});

test('price history keeps old amounts by effective date', () => {
  const b = bill({ amountHistory: [{ from: '2025-01-01', amount: 5400 }, { from: '2026-01-01', amount: 5850 }, { from: '2027-01-01', amount: 6100 }] });
  assert.equal(amountOn(b, '2025-06-01'), 5400);
  assert.equal(amountOn(b, '2026-06-01'), 5850);
  assert.equal(amountOn(b, '2027-06-01'), 6100);
});

test('marking paid creates one transaction and never duplicates', () => {
  const d = { ...createDefaultData(), recurringBills: [bill()] };
  markPaid(d, d.recurringBills[0], '2026-01-31', '2026-01-30');
  markPaid(d, d.recurringBills[0], '2026-01-31', '2026-01-30');
  assert.equal(d.transactions.length, 1);
  assert.equal(d.transactions[0].amount, 100);
  const item = dueItems(d, '2026-01-01', '2026-01-31')[0];
  assert.equal(item.paid, true);
});

test('a later price change does not rewrite a paid transaction', () => {
  const d = { ...createDefaultData(), recurringBills: [bill()] };
  markPaid(d, d.recurringBills[0], '2026-01-31');
  d.recurringBills[0].amountHistory.push({ from: '2026-02-01', amount: 150 });
  assert.equal(d.transactions[0].amount, 100);
  assert.equal(amountOn(d.recurringBills[0], '2026-03-31'), 150);
});
