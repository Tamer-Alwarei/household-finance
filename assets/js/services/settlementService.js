import { allocate } from './calculationService.js';
import { roundMoney } from '../utils/format.js';
// Settlements move money between people only; they never touch income or expenses.
export function balances(data) {
    const rows = data.people.map((p) => ({ personId: p.id, paid: 0, responsible: 0, settledOut: 0, settledIn: 0, net: 0 }));
    const row = (id) => rows.find((r) => r.personId === id);
    for (const t of data.transactions) {
        if (t.type !== 'expense')
            continue;
        const alloc = allocate(t, data.people);
        const payer = row(t.paidBy);
        if (payer)
            payer.paid += t.amount;
        rows.forEach((r) => (r.responsible += alloc[r.personId] ?? 0));
    }
    for (const s of data.settlements) {
        const from = row(s.from);
        const to = row(s.to);
        if (from)
            from.settledOut += s.amount;
        if (to)
            to.settledIn += s.amount;
    }
    rows.forEach((r) => {
        r.paid = roundMoney(r.paid);
        r.responsible = roundMoney(r.responsible);
        r.net = roundMoney(r.paid - r.responsible + r.settledOut - r.settledIn);
    });
    return rows;
}
// Who owes whom after settlements (two-person household).
export function outstanding(data) {
    const rows = balances(data);
    const creditor = rows.reduce((a, b) => (b.net > a.net ? b : a));
    const debtor = rows.reduce((a, b) => (b.net < a.net ? b : a));
    if (creditor.net <= 0)
        return null;
    return { debtor: debtor.personId, creditor: creditor.personId, amount: creditor.net };
}
//# sourceMappingURL=settlementService.js.map