import { roundMoney } from '../utils/format.js';
const inMonth = (t, month) => t.date.startsWith(month);
// How an expense is divided between people. Always sums exactly to tx.amount.
export function allocate(tx, people) {
    const out = {};
    const { method, values } = tx.sharing;
    if (method === 'fixed' && values) {
        people.forEach((p) => (out[p.id] = roundMoney(values[p.id] ?? 0)));
    }
    else {
        const pct = {};
        people.forEach((p) => {
            if (method === 'equal')
                pct[p.id] = p.sharePercent;
            else
                pct[p.id] = values?.[p.id] ?? 0;
        });
        people.forEach((p) => (out[p.id] = roundMoney((tx.amount * pct[p.id]) / 100)));
    }
    // Put any rounding remainder on the last person so allocations equal the full amount.
    const last = people[people.length - 1];
    const sum = Object.values(out).reduce((a, b) => a + b, 0);
    out[last.id] = roundMoney(out[last.id] + tx.amount - sum);
    return out;
}
export function monthSummary(data, month) {
    let income = 0, expenses = 0, savings = 0;
    for (const t of data.transactions) {
        if (!inMonth(t, month))
            continue;
        if (t.type === 'income')
            income += t.amount;
        else if (t.type === 'expense')
            expenses += t.amount;
        else if (t.type === 'savings')
            savings += t.amount;
    }
    return {
        income: roundMoney(income),
        expenses: roundMoney(expenses),
        savings: roundMoney(savings),
        remaining: roundMoney(income - expenses - savings),
    };
}
// Paid vs responsible for shared expenses; balance > 0 means the person is owed money.
export function personBreakdown(data, month) {
    const rows = data.people.map((person) => ({ person, paid: 0, responsible: 0, balance: 0 }));
    for (const t of data.transactions) {
        if (t.type !== 'expense' || !inMonth(t, month))
            continue;
        const alloc = allocate(t, data.people);
        for (const r of rows) {
            if (t.paidBy === r.person.id)
                r.paid += t.amount;
            r.responsible += alloc[r.person.id];
        }
    }
    rows.forEach((r) => {
        r.paid = roundMoney(r.paid);
        r.responsible = roundMoney(r.responsible);
        r.balance = roundMoney(r.paid - r.responsible);
    });
    return rows;
}
export { budgetRows as budgetVsActual } from './budgetService.js';
//# sourceMappingURL=calculationService.js.map