import { addDays, addMonths, parseDate, todayStr } from '../utils/dateUtils.js';
import { roundMoney } from '../utils/format.js';
export const FREQUENCIES = [
    { value: 'weekly', label: 'Weekly', perYear: 52 },
    { value: 'biweekly', label: 'Every two weeks', perYear: 26 },
    { value: 'monthly', label: 'Monthly', perYear: 12 },
    { value: 'quarterly', label: 'Quarterly', perYear: 4 },
    { value: 'semiannual', label: 'Every six months', perYear: 2 },
    { value: 'annual', label: 'Annual', perYear: 1 },
];
const monthStep = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };
const perYear = (f) => FREQUENCIES.find((x) => x.value === f).perYear;
// Price effective on a date: history entries are never rewritten.
export function amountOn(bill, date) {
    const hist = [...bill.amountHistory].sort((a, b) => a.from.localeCompare(b.from));
    let amount = hist[0]?.amount ?? 0;
    for (const h of hist)
        if (h.from <= date)
            amount = h.amount;
    return amount;
}
export const currentAmount = (bill) => amountOn(bill, todayStr());
export const annualCost = (bill, amount = currentAmount(bill)) => roundMoney(amount * perYear(bill.frequency));
// Planning value only; not a payment made every month.
export const monthlyEquivalent = (bill, amount = currentAmount(bill)) => roundMoney(annualCost(bill, amount) / 12);
// Due dates in [from, to]; month-based frequencies keep the start day and clamp to month end.
export function occurrences(bill, from, to) {
    const out = [];
    const end = bill.endDate && bill.endDate < to ? bill.endDate : to;
    const step = monthStep[bill.frequency];
    const anchor = parseDate(bill.startDate).d;
    for (let k = 0; k < 2000; k++) {
        const due = step
            ? addMonths(bill.startDate, k * step, anchor)
            : addDays(bill.startDate, k * (bill.frequency === 'weekly' ? 7 : 14));
        if (due > end)
            break;
        if (due >= from)
            out.push(due);
    }
    return out;
}
export function paymentFor(data, bill, due) {
    return data.transactions.find((t) => t.recurringBillId === bill.id && t.dueDate === due);
}
export function dueItems(data, from, to) {
    const today = todayStr();
    const items = [];
    for (const bill of data.recurringBills.filter((b) => b.active)) {
        for (const due of occurrences(bill, from, to)) {
            const paid = !!paymentFor(data, bill, due);
            items.push({ bill, due, amount: amountOn(bill, due), paid, overdue: !paid && due < today });
        }
    }
    return items.sort((a, b) => a.due.localeCompare(b.due));
}
// Creates the actual transaction once; a second call for the same due date does nothing (no double counting).
export function markPaid(data, bill, due, paidOn = todayStr()) {
    if (paymentFor(data, bill, due))
        return;
    data.transactions.push({
        id: `${bill.id.startsWith('demo-') ? 'demo-' : ''}rb-${bill.id}-${due}`,
        title: bill.name, amount: amountOn(bill, due), type: 'expense', categoryId: bill.categoryId,
        date: paidOn, paidBy: bill.paidBy, sharing: bill.sharing, status: 'paid',
        recurringBillId: bill.id, dueDate: due,
    });
}
//# sourceMappingURL=recurringService.js.map