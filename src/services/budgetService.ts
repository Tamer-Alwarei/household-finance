import type { AppData, Category } from '../models/types.js';
import { addMonthKey } from '../utils/dateUtils.js';
import { roundMoney } from '../utils/format.js';

export type BudgetStatus = 'ok' | 'warning' | 'exceeded';

export interface CategoryRow {
  categoryId: string;
  name: string;
  icon: string;
  kind: 'expense' | 'savings';
  planned: number; // adjusted available budget (base + rollover)
  base: number;
  rollover: number;
  actual: number;
  remaining: number; // negative = overspent
  percent: number;
  status: BudgetStatus;
}

export const kindOf = (c: Category) => c.kind ?? 'expense';

// The base budget is never silently changed: a per-month override sits beside the default.
export function baseBudget(data: AppData, c: Category, month: string): number {
  return data.monthlyOverrides[month]?.[c.id] ?? c.monthlyBudget;
}

export function actualFor(data: AppData, c: Category, month: string): number {
  const type = kindOf(c) === 'savings' ? 'savings' : 'expense';
  return roundMoney(
    data.transactions
      .filter((t) => t.date.startsWith(month) && t.categoryId === c.id && t.type === type)
      .reduce((s, t) => s + t.amount, 0),
  );
}

// Rollover is stored nowhere: it is derived from last month so base budget stays visible and untouched.
export function rolloverFor(data: AppData, c: Category, month: string): number {
  const rule = c.rollover ?? 'reset';
  if (rule === 'reset') return 0;
  const prev = addMonthKey(month, -1);
  const left = baseBudget(data, c, prev) - actualFor(data, c, prev);
  return roundMoney(rule === 'carry-unused' ? Math.max(left, 0) : left);
}

export function budgetRows(data: AppData, month: string): CategoryRow[] {
  return data.categories
    .filter((c) => !c.archived && kindOf(c) !== 'income')
    .map((c) => {
      const base = baseBudget(data, c, month);
      const rollover = rolloverFor(data, c, month);
      const planned = roundMoney(base + rollover);
      const actual = actualFor(data, c, month);
      const percent = planned > 0 ? Math.round((actual / planned) * 100) : actual > 0 ? 999 : 0;
      const status: BudgetStatus = percent > 100 ? 'exceeded' : percent >= data.settings.warnPercent ? 'warning' : 'ok';
      return { categoryId: c.id, name: c.name, icon: c.icon, kind: kindOf(c) as 'expense' | 'savings', planned, base, rollover, actual, remaining: roundMoney(planned - actual), percent, status };
    })
    .filter((r) => r.base > 0 || r.actual > 0);
}

export function copyBudget(data: AppData, fromMonth: string, toMonth: string): void {
  data.monthlyOverrides[toMonth] = {};
  for (const c of data.categories) data.monthlyOverrides[toMonth][c.id] = baseBudget(data, c, fromMonth);
}
