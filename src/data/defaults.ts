import type { AppData, Category, Transaction } from '../models/types.js';
import { addMonthKey, fmtDate, todayStr } from '../utils/dateUtils.js';

const cat = (id: string, name: string, icon: string, monthlyBudget: number): Category =>
  ({ id, name, icon, monthlyBudget, archived: false, rollover: 'reset' });

export function createDefaultData(): AppData {
  return {
    version: 2,
    settings: { budgetModel: 'combined', currency: 'DKK', defaultSharing: { method: 'equal' }, warnPercent: 80 },
    people: [
      { id: 'person-1', name: 'Person 1', sharePercent: 50 },
      { id: 'person-2', name: 'Person 2', sharePercent: 50 },
    ],
    categories: [
      cat('housing', 'Housing', 'house', 9000),
      cat('electricity', 'Electricity', 'lightning-charge', 1200),
      cat('insurance', 'Insurance', 'shield-check', 0),
      cat('groceries', 'Groceries', 'basket', 5000),
      cat('transport', 'Transportation', 'bus-front', 2000),
      cat('subscriptions', 'Subscriptions', 'collection-play', 500),
      { ...cat('salary', 'Salary', 'cash-stack', 0), kind: 'income' },
      { ...cat('savings', 'Savings', 'piggy-bank', 3000), kind: 'savings' },
      cat('debt', 'Debt repayment', 'bank', 0),
    ],
    transactions: [],
    recurringBills: [],
    settlements: [],
    savingsGoals: [],
    sinkingFunds: [],
    debts: [],
    monthlyOverrides: {},
    lastSaved: null,
    lastBackup: null,
    demo: false,
  };
}

const dayIn = (monthKey: string, day: number) => {
  const [y, m] = monthKey.split('-').map(Number);
  return fmtDate(y, m, day);
};

// Everything demo has an id starting with "demo-" so it can be removed without touching real data.
export function addDemoData(data: AppData): void {
  const mk = todayStr().slice(0, 7);
  const prev = addMonthKey(mk, -1);
  const eq = { method: 'equal' as const };
  const solo = (p: string) => ({ method: 'individual' as const, values: { [p]: 100 } });
  let n = 0;
  const t = (
    monthKey: string, day: number, title: string, amount: number, type: Transaction['type'],
    categoryId: string, paidBy: string, sharing: Transaction['sharing'],
  ): Transaction => ({
    id: `demo-tx-${++n}`, title: `[Demo] ${title}`, amount, type, categoryId,
    date: dayIn(monthKey, day), paidBy, sharing, status: 'paid',
  });
  for (const m of [prev, mk]) {
    data.transactions.push(
      t(m, 1, 'Salary Person 1', 32000, 'income', 'salary', 'person-1', solo('person-1')),
      t(m, 1, 'Salary Person 2', 28000, 'income', 'salary', 'person-2', solo('person-2')),
      t(m, 2, 'Rent', 9000, 'expense', 'housing', 'person-1', eq),
      t(m, 5, 'Electricity bill', m === mk ? 1450 : 1100, 'expense', 'electricity', 'person-1', eq),
      t(m, 8, 'Supermarket', m === mk ? 4500 : 4800, 'expense', 'groceries', 'person-2', eq),
      t(m, 3, 'Monthly transit pass', 700, 'expense', 'transport', 'person-2', solo('person-2')),
      t(m, 10, 'Streaming services', m === mk ? 650 : 450, 'expense', 'subscriptions', 'person-1', eq),
      t(m, 4, 'Emergency fund', 3000, 'savings', 'savings', 'person-1', eq),
    );
  }
  data.recurringBills.push(
    { id: 'demo-rb-1', name: '[Demo] Car insurance', categoryId: 'insurance', frequency: 'annual', startDate: `${mk.slice(0, 4)}-01-15`,
      active: true, paidBy: 'person-1', sharing: eq, amountHistory: [{ from: `${Number(mk.slice(0, 4)) - 1}-01-15`, amount: 5400 }, { from: `${mk.slice(0, 4)}-01-15`, amount: 5850 }] },
    { id: 'demo-rb-2', name: '[Demo] Home insurance', categoryId: 'insurance', frequency: 'semiannual', startDate: `${mk.slice(0, 4)}-03-10`,
      active: true, paidBy: 'person-2', sharing: eq, amountHistory: [{ from: `${mk.slice(0, 4)}-03-10`, amount: 3000 }] },
    { id: 'demo-rb-3', name: '[Demo] Internet', categoryId: 'subscriptions', frequency: 'monthly', startDate: `${prev}-20`,
      active: true, paidBy: 'person-2', sharing: eq, amountHistory: [{ from: `${prev}-20`, amount: 299 }] },
    { id: 'demo-rb-4', name: '[Demo] Water bill', categoryId: 'housing', frequency: 'quarterly', startDate: `${prev}-25`,
      active: true, paidBy: 'person-1', sharing: eq, amountHistory: [{ from: `${prev}-25`, amount: 1200 }] },
  );
  const c = (id: string, date: string, amount: number) => ({ id: `demo-c-${id}`, date, amount });
  data.savingsGoals.push(
    { id: 'demo-sg-1', name: '[Demo] Emergency fund', target: 60000, owner: 'shared', monthlyTarget: 3000, targetDate: dayIn(addMonthKey(mk, 12), 1),
      contributions: [c('1', dayIn(prev, 4), 3000), c('2', dayIn(mk, 4), 3000)] },
    { id: 'demo-sg-2', name: '[Demo] Holidays', target: 20000, owner: 'shared', monthlyTarget: 1000,
      contributions: [c('3', dayIn(prev, 6), 1000)] },
  );
  data.sinkingFunds.push(
    { id: 'demo-sf-1', name: '[Demo] Christmas', target: 6000, expectedDate: `${mk.slice(0, 4)}-12-20`, owner: 'shared', contributions: [c('4', dayIn(mk, 5), 1500)] },
  );
  data.debts.push(
    { id: 'demo-d-1', name: '[Demo] Car loan', lender: 'Demo Bank', original: 80000, balance: 52000, rate: 4.5, monthlyPayment: 2500, startDate: '2024-01-01', responsible: 'person-1' },
  );
  data.settlements.push({ id: 'demo-s-1', date: dayIn(mk, 12), from: 'person-2', to: 'person-1', amount: 1000, note: '[Demo] Partial settlement' });
  data.demo = true;
}

export function removeDemoData(data: AppData): void {
  const keep = <T extends { id: string }>(l: T[]) => l.filter((x) => !x.id.startsWith('demo-'));
  data.transactions = keep(data.transactions);
  data.recurringBills = keep(data.recurringBills);
  data.savingsGoals = keep(data.savingsGoals);
  data.sinkingFunds = keep(data.sinkingFunds);
  data.debts = keep(data.debts);
  data.settlements = keep(data.settlements);
  data.demo = false;
}

