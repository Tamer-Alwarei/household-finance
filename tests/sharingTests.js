import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allocate, monthSummary } from '../assets/js/services/calculationService.js';
import { balances, outstanding } from '../assets/js/services/settlementService.js';
import { createDefaultData } from '../assets/js/data/defaults.js';

const people = [{ id: 'p1', name: 'A', sharePercent: 50 }, { id: 'p2', name: 'B', sharePercent: 50 }];
const tx = (o = {}) => ({ id: 'x', title: 't', amount: 1000, type: 'expense', categoryId: 'c', date: '2026-11-05', paidBy: 'p1', status: 'paid', sharing: { method: 'equal' }, ...o });
const dataWith = (transactions, settlements = []) => ({ ...createDefaultData(), people, transactions, settlements });

test('equal sharing splits 50/50', () => assert.deepEqual(allocate(tx(), people), { p1: 500, p2: 500 }));
test('allocations always sum to the amount (rounding)', () => {
  const a = allocate(tx({ amount: 0.03 }), people);
  assert.equal(Math.round((a.p1 + a.p2) * 100), 3);
});
test('custom percentage, fixed and individual sharing', () => {
  assert.deepEqual(allocate(tx({ sharing: { method: 'percentage', values: { p1: 70, p2: 30 } } }), people), { p1: 700, p2: 300 });
  assert.deepEqual(allocate(tx({ sharing: { method: 'fixed', values: { p1: 400, p2: 600 } } }), people), { p1: 400, p2: 600 });
  assert.deepEqual(allocate(tx({ sharing: { method: 'individual', values: { p2: 100 } } }), people), { p1: 0, p2: 1000 });
});

test('payer and responsibility are separate: electricity example', () => {
  const rows = balances(dataWith([tx()]));
  assert.equal(rows[0].paid, 1000);
  assert.equal(rows[1].paid, 0);
  assert.equal(rows[1].net, -500);
  assert.deepEqual(outstanding(dataWith([tx()])), { debtor: 'p2', creditor: 'p1', amount: 500 });
});

test('partial and full settlements reduce the balance without changing household totals', () => {
  const txs = [tx()];
  const partial = dataWith(txs, [{ id: 's', date: '2026-11-06', from: 'p2', to: 'p1', amount: 200 }]);
  assert.equal(outstanding(partial).amount, 300);
  const full = dataWith(txs, [{ id: 's', date: '2026-11-06', from: 'p2', to: 'p1', amount: 500 }]);
  assert.equal(outstanding(full), null);
  assert.deepEqual(monthSummary(full, '2026-11'), monthSummary(dataWith(txs), '2026-11'));
});

test('savings and transfers are not expenses; income counted once', () => {
  const d = dataWith([tx(), tx({ id: 'i', type: 'income', amount: 5000 }), tx({ id: 's', type: 'savings', amount: 300 }), tx({ id: 't', type: 'transfer', amount: 999 })]);
  assert.deepEqual(monthSummary(d, '2026-11'), { income: 5000, expenses: 1000, savings: 300, remaining: 3700 });
});

test('individual expense paid by its owner does not distort settlement', () => {
  const d = dataWith([tx({ sharing: { method: 'individual', values: { p1: 100 } } })]);
  assert.equal(outstanding(d), null);
});
