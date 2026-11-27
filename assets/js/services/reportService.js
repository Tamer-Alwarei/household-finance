import { allocate } from './calculationService.js';
import { roundMoney } from '../utils/format.js';
const inRange = (date, from, to) => date >= from && date <= to;
export function spendingByCategory(data, from, to) {
    const totals = new Map();
    for (const t of data.transactions) {
        if (t.type !== 'expense' || !inRange(t.date, from, to))
            continue;
        totals.set(t.categoryId, (totals.get(t.categoryId) ?? 0) + t.amount);
    }
    return [...totals.entries()]
        .map(([id, total]) => ({ name: data.categories.find((c) => c.id === id)?.name ?? id, total: roundMoney(total) }))
        .sort((a, b) => b.total - a.total);
}
export function spendingByPerson(data, from, to) {
    const rows = data.people.map((p) => ({ id: p.id, name: p.name, paid: 0, responsible: 0 }));
    for (const t of data.transactions) {
        if (t.type !== 'expense' || !inRange(t.date, from, to))
            continue;
        const a = allocate(t, data.people);
        rows.forEach((r) => {
            if (r.id === t.paidBy)
                r.paid += t.amount;
            r.responsible += a[r.id] ?? 0;
        });
    }
    return rows.map((r) => ({ name: r.name, paid: roundMoney(r.paid), responsible: roundMoney(r.responsible) }));
}
export function sharedVsIndividual(data, from, to) {
    let shared = 0;
    let individual = 0;
    for (const t of data.transactions) {
        if (t.type !== 'expense' || !inRange(t.date, from, to))
            continue;
        if (t.sharing.method === 'individual')
            individual += t.amount;
        else
            shared += t.amount;
    }
    return { shared: roundMoney(shared), individual: roundMoney(individual) };
}
export function incomeVsExpensesByMonth(data, from, to) {
    const map = new Map();
    for (const t of data.transactions) {
        if (!inRange(t.date, from, to) || (t.type !== 'income' && t.type !== 'expense'))
            continue;
        const m = map.get(t.date.slice(0, 7)) ?? { income: 0, expenses: 0 };
        if (t.type === 'income')
            m.income += t.amount;
        else
            m.expenses += t.amount;
        map.set(t.date.slice(0, 7), m);
    }
    return [...map.entries()].sort().map(([month, v]) => ({ month, income: roundMoney(v.income), expenses: roundMoney(v.expenses) }));
}
export function toCsv(header, rows) {
    const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
    return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}
//# sourceMappingURL=reportService.js.map