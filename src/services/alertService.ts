import type { AppData } from '../models/types.js';
import { budgetRows } from './budgetService.js';
import { dueItems } from './recurringService.js';
import { behindSchedule, goalStats, requiredMonthly } from './savingsService.js';
import { addDays, todayStr } from '../utils/dateUtils.js';

export interface Alert {
  level: 'danger' | 'warning' | 'info';
  text: string;
}

export function buildAlerts(data: AppData): Alert[] {
  const today = todayStr();
  const month = today.slice(0, 7);
  const alerts: Alert[] = [];
  for (const i of dueItems(data, addDays(today, -60), addDays(today, 7))) {
    if (i.paid) continue;
    alerts.push(i.overdue
      ? { level: 'danger', text: `${i.bill.name} was due ${i.due} and is not paid.` }
      : { level: 'info', text: `${i.bill.name} is due ${i.due}.` });
  }
  for (const r of budgetRows(data, month)) {
    if (r.status === 'exceeded') alerts.push({ level: 'danger', text: `${r.name} is over budget.` });
    else if (r.status === 'warning') alerts.push({ level: 'warning', text: `${r.name} has used ${r.percent}% of its budget.` });
  }
  for (const g of data.savingsGoals) if (behindSchedule(g)) alerts.push({ level: 'warning', text: `Savings goal "${g.name}" is behind schedule.` });
  for (const f of data.sinkingFunds) {
    if (goalStats(f).percent < 100 && f.expectedDate < addDays(today, 60) && requiredMonthly(f) > 0) alerts.push({ level: 'warning', text: `Sinking fund "${f.name}" is underfunded for ${f.expectedDate}.` });
  }
  return alerts;
}
