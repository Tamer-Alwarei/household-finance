import { addMonthKey, monthRange } from '../utils/dateUtils.js';
import { roundMoney } from '../utils/format.js';
import { baseBudget, kindOf } from './budgetService.js';
import { occurrences, amountOn } from './recurringService.js';
import { balanceOf, requiredMonthly } from './savingsService.js';
export const SCENARIOS = [
    { name: 'Expected', incomePct: 0, electricityPct: 0, extraSavings: 0, extraExpense: 0 },
    { name: 'Conservative', incomePct: -10, electricityPct: 20, extraSavings: 0, extraExpense: 0 },
    { name: 'Optimistic', incomePct: 5, electricityPct: -5, extraSavings: 0, extraExpense: 0 },
];
// Average monthly income over up to the last 3 months that have income records.
export function baselineIncome(data, fromMonth) {
    const totals = [];
    for (let i = 0; i <= 3 && totals.length < 3; i++) {
        const m = addMonthKey(fromMonth, -i);
        const sum = data.transactions.filter((t) => t.type === 'income' && t.date.startsWith(m)).reduce((s, t) => s + t.amount, 0);
        if (sum > 0)
            totals.push(sum);
    }
    return totals.length ? roundMoney(totals.reduce((a, b) => a + b, 0) / totals.length) : 0;
}
// Pure projection: never reads from or writes to actual totals.
export function forecast(data, startMonth, scenario = SCENARIOS[0]) {
    const income = baselineIncome(data, startMonth) * (1 + scenario.incomePct / 100);
    const startSavings = roundMoney(data.savingsGoals.reduce((s, g) => s + balanceOf(g.contributions), 0) + data.sinkingFunds.reduce((s, f) => s + balanceOf(f.contributions), 0));
    const rows = [];
    let savingsBalance = startSavings;
    for (let i = 0; i < 12; i++) {
        const month = addMonthKey(startMonth, i);
        const { from, to } = monthRange(month);
        const mult = (catId) => (catId === 'electricity' ? 1 + scenario.electricityPct / 100 : 1);
        const recurringByCat = {};
        for (const b of data.recurringBills.filter((x) => x.active)) {
            for (const due of occurrences(b, from, to)) {
                recurringByCat[b.categoryId] = (recurringByCat[b.categoryId] ?? 0) + amountOn(b, due);
            }
        }
        // Per category use the larger of budget and known bills so bills are not counted twice.
        let expenses = 0;
        let recurring = 0;
        for (const c of data.categories.filter((c) => !c.archived && kindOf(c) === 'expense')) {
            const rec = recurringByCat[c.id] ?? 0;
            recurring += rec * mult(c.id);
            expenses += Math.max(baseBudget(data, c, month), rec) * mult(c.id);
        }
        const goalSavings = data.savingsGoals.reduce((s, g) => s + g.monthlyTarget, 0);
        const fundSavings = data.sinkingFunds.reduce((s, f) => s + (f.expectedDate >= from ? requiredMonthly(f, from) : 0), 0);
        const savings = goalSavings + fundSavings + scenario.extraSavings;
        const debt = data.debts.filter((d) => d.balance > 0).reduce((s, d) => s + d.monthlyPayment, 0);
        expenses += scenario.extraExpense;
        savingsBalance += savings;
        rows.push({
            month, income: roundMoney(income), expenses: roundMoney(expenses), recurring: roundMoney(recurring),
            savings: roundMoney(savings), debt: roundMoney(debt),
            net: roundMoney(income - expenses - savings - debt), savingsBalance: roundMoney(savingsBalance),
        });
    }
    return rows;
}
//# sourceMappingURL=forecastService.js.map