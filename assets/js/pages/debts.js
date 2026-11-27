import { dataManager } from '../data/dataManager.js';
import { openForm } from '../components/formModal.js';
import { confirmDialog } from '../components/confirmationDialog.js';
import { emptyState, pageHeader, personOptions, progressBar } from '../components/ui.js';
import { escapeHtml, formatMoney, roundMoney } from '../utils/format.js';
import { generateId } from '../utils/idGenerator.js';
import { todayStr } from '../utils/dateUtils.js';
// Interest for one month on the remaining balance; the rest of the payment is principal.
export const monthlyInterest = (d) => roundMoney((d.balance * d.rate) / 100 / 12);
export function renderDebts(container) {
    const { data } = dataManager;
    const money = (n) => formatMoney(n, data.settings.currency);
    const active = data.debts.filter((d) => d.balance > 0);
    const totalBalance = active.reduce((s, d) => s + d.balance, 0);
    const monthly = active.reduce((s, d) => s + d.monthlyPayment, 0);
    const stat = (label, v) => `<div class="col-6 col-lg-3"><div class="card h-100"><div class="card-body"><div class="small text-body-secondary">${label}</div><div class="stat-value">${v}</div></div></div></div>`;
    container.innerHTML = `
    ${pageHeader('Debts', '<button class="btn btn-primary btn-sm" data-action="add"><i class="bi bi-plus-lg me-1"></i>Add debt</button>', 'Principal repayment is not consumption; interest is a financing cost.')}
    <div class="row g-3 mb-3">${stat('Outstanding debt', money(totalBalance))}${stat('Monthly payments', money(monthly))}${stat('Annual payments', money(monthly * 12))}${stat('Interest this month (est.)', money(active.reduce((s, d) => s + monthlyInterest(d), 0)))}</div>
    <div class="row g-3">${data.debts.length ? data.debts.map((d) => {
        const paid = Math.max(0, d.original - d.balance);
        const pct = d.original > 0 ? Math.round((paid / d.original) * 100) : 0;
        const interest = monthlyInterest(d);
        const who = data.people.find((p) => p.id === d.responsible)?.name ?? d.responsible;
        return `<div class="col-12 col-lg-6"><div class="card h-100"><div class="card-body">
        <h2 class="h5">${escapeHtml(d.name)} <small class="text-body-secondary">${escapeHtml(d.lender)}</small></h2>
        <div>Remaining ${money(d.balance)} of ${money(d.original)} · ${d.rate}% interest · ${escapeHtml(who)}</div>
        ${progressBar(pct, 'ok', d.name)}<div class="small text-body-secondary mb-1">${pct}% repaid</div>
        <div class="small">Monthly payment ${money(d.monthlyPayment)}: about ${money(Math.min(interest, d.monthlyPayment))} interest + ${money(Math.max(d.monthlyPayment - interest, 0))} principal</div>
        <div class="mt-3 d-flex gap-1"><button class="btn btn-sm btn-success" data-action="pay" data-id="${d.id}">Record payment</button>
          <button class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="${d.id}" aria-label="Edit"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${d.id}" aria-label="Delete"><i class="bi bi-trash"></i></button></div>
      </div></div></div>`;
    }).join('') : `<div class="col-12">${emptyState('No debts tracked.')}</div>`}</div>`;
    container.onclick = async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn)
            return;
        const debt = data.debts.find((d) => d.id === btn.dataset.id);
        const act = btn.dataset.action;
        if (act === 'add' || (act === 'edit' && debt))
            openDebtForm(debt);
        else if (act === 'delete' && debt && (await confirmDialog(`Delete "${debt.name}"?`)))
            dataManager.update((d) => (d.debts = d.debts.filter((x) => x.id !== debt.id)));
        else if (act === 'pay' && debt) {
            openForm({
                title: `Payment: ${debt.name}`,
                fields: [
                    { name: 'date', label: 'Date', type: 'date', value: todayStr(), required: true },
                    { name: 'amount', label: 'Total payment', type: 'number', value: debt.monthlyPayment, required: true },
                    { name: 'interest', label: 'Of which interest', type: 'number', value: Math.min(monthlyInterest(debt), debt.monthlyPayment) },
                    { name: 'paidBy', label: 'Paid by', type: 'select', options: personOptions(data.people), value: debt.responsible },
                ],
                onSave: (v) => {
                    const amount = Number(v.amount);
                    const interest = Number(v.interest) || 0;
                    if (!(amount > 0) || interest < 0 || interest > amount)
                        return 'Interest must be between 0 and the payment.';
                    const principal = roundMoney(amount - interest);
                    dataManager.update((d) => {
                        d.debts.find((x) => x.id === debt.id).balance = Math.max(0, roundMoney(debt.balance - principal));
                        // Only interest is an expense; principal reduces the debt and is stored as a transfer so it is not consumption.
                        const base = { date: v.date, paidBy: v.paidBy, sharing: { method: 'individual', values: { [debt.responsible]: 100 } }, status: 'paid', categoryId: 'debt' };
                        const demo = debt.id.startsWith('demo-') ? 'demo-' : '';
                        if (interest > 0)
                            d.transactions.push({ ...base, id: `${demo}${generateId('di')}`, title: `${debt.name}: interest`, amount: interest, type: 'expense' });
                        if (principal > 0)
                            d.transactions.push({ ...base, id: `${demo}${generateId('dp')}`, title: `${debt.name}: principal`, amount: principal, type: 'transfer' });
                    });
                },
            });
        }
    };
}
function openDebtForm(debt) {
    const { data } = dataManager;
    openForm({
        title: debt ? 'Edit debt' : 'Add debt',
        fields: [
            { name: 'name', label: 'Loan name', type: 'text', value: debt?.name, required: true },
            { name: 'lender', label: 'Lender', type: 'text', value: debt?.lender },
            { name: 'original', label: 'Original amount', type: 'number', value: debt?.original, required: true },
            { name: 'balance', label: 'Remaining balance', type: 'number', value: debt?.balance, required: true },
            { name: 'rate', label: 'Interest rate (% per year)', type: 'number', value: debt?.rate ?? 0 },
            { name: 'monthly', label: 'Monthly payment', type: 'number', value: debt?.monthlyPayment, required: true },
            { name: 'startDate', label: 'Start date', type: 'date', value: debt?.startDate ?? todayStr() },
            { name: 'responsible', label: 'Responsible person', type: 'select', options: personOptions(data.people), value: debt?.responsible },
            { name: 'notes', label: 'Notes', type: 'textarea', value: debt?.notes, col: 'col-12' },
        ],
        onSave: (v) => {
            if (Number(v.original) <= 0 || Number(v.balance) < 0 || Number(v.monthly) <= 0)
                return 'Check the amounts.';
            dataManager.update((d) => {
                const t = debt ? d.debts.find((x) => x.id === debt.id) : { id: generateId('d') };
                Object.assign(t, { name: v.name, lender: v.lender, original: Number(v.original), balance: Number(v.balance), rate: Number(v.rate) || 0, monthlyPayment: Number(v.monthly), startDate: v.startDate, responsible: v.responsible, notes: v.notes || undefined });
                if (!debt)
                    d.debts.push(t);
            });
        },
    });
}
//# sourceMappingURL=debts.js.map