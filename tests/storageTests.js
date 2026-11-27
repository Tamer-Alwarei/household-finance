import { test } from 'node:test';
import assert from 'node:assert/strict';

// Minimal in-memory localStorage so the real DataManager can run under Node.
function installStorage(quota = Infinity) {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { if (v.length > quota) throw new Error('QuotaExceededError'); store.set(k, v); },
    removeItem: (k) => store.delete(k),
  };
  return store;
}

const load = async (tag) => (await import(`../assets/js/data/dataManager.js?${tag}`)).dataManager;
const sample = (id) => ({ id, title: 'Test', amount: 10, type: 'expense', categoryId: 'groceries', date: '2026-11-01', paidBy: 'person-1', sharing: { method: 'equal' }, status: 'paid' });

test('create, edit, duplicate, delete persist across a reload', async () => {
  installStorage();
  const dm = await load('a');
  dm.addTransaction(sample('t1'));
  dm.updateTransaction({ ...sample('t1'), amount: 25 });
  dm.addTransaction({ ...sample('t1'), id: 't2' });
  dm.deleteTransactions(['t2']);
  const reloaded = await load('b');
  assert.equal(reloaded.data.transactions.length, 1);
  assert.equal(reloaded.data.transactions[0].amount, 25);
  assert.ok(reloaded.data.lastSaved);
});

test('categories are dynamic JSON data', async () => {
  installStorage();
  const dm = await load('c');
  dm.update((d) => d.categories.push({ id: 'pets', name: 'Pets', icon: 'heart', monthlyBudget: 300, archived: false }));
  assert.ok((await load('d')).data.categories.some((c) => c.id === 'pets'));
});

test('storage quota errors are reported, not hidden, and data stays in memory', async () => {
  installStorage(10);
  const dm = await load('e');
  dm.addTransaction(sample('big'));
  assert.match(dm.lastError, /Save failed/);
  assert.equal(dm.data.transactions.length, 1);
});

test('corrupt saved JSON falls back to defaults with a visible error', async () => {
  const store = installStorage();
  store.set('household-finance:data', '{not json');
  const dm = await load('f');
  assert.match(dm.lastError, /Could not read/);
  assert.equal(dm.data.transactions.length, 0);
});

test('demo data can be removed without touching real data', async () => {
  installStorage();
  const dm = await load('g');
  dm.addTransaction(sample('real'));
  dm.loadDemoData();
  assert.ok(dm.data.transactions.length > 1 && dm.data.savingsGoals.length > 0);
  dm.removeDemoData();
  assert.deepEqual(dm.data.transactions.map((t) => t.id), ['real']);
  assert.equal(dm.data.savingsGoals.length, 0);
});

test('JSON export round-trips through import validation', async () => {
  installStorage();
  const dm = await load('h');
  dm.addTransaction(sample('x'));
  const { validateImport } = await import('../assets/js/data/dataMigration.js');
  const back = validateImport(JSON.parse(dm.exportJson()));
  assert.equal(back.transactions.length, 1);
  assert.ok(dm.data.lastBackup);
});
