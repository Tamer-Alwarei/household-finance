import { dataManager } from '../data/dataManager.js';
import { FREQUENCIES, annualCost, currentAmount, dueItems, monthlyEquivalent } from '../services/recurringService.js';
import { allocate } from '../services/calculationService.js';
import { validateSharing } from '../services/validationService.js';
import { openForm } from '../components/formModal.js';
import { confirmDialog } from '../components/confirmationDialog.js';
import { emptyState, pageHeader, personOptions } from '../components/ui.js';
import { escapeHtml, formatMoney } from '../utils/format.js';
import { generateId } from '../utils/idGenerator.js';
import { addDays, todayStr } from '../utils/dateUtils.js';
export function renderRecurringBills(container) {
    const { data } = dataManager;
    const money = (n) => formatMoney(n, data.settings.currency);
    const catName = (id) => escapeHtml(data.categories.find((c) => c.id === id)?.name ?? id);
    const freqLabel = (f) => FREQUENCIES.find((x) => x.value === f).label;
    const today = todayStr();
    const active = data.recurringBills.filter((b) => b.active);
    const annualTotal = active.reduce((s, b) => s + annualCost(b), 0);
    const nextDue = (b) => dueItems({ ...data, recurringBills: [b] }, today, addDays(today, 800)).find((i) => !i.paid)?.due ?? '-';
    const shareText = (b) => {
        const a = allocate({ id: '', title: '', amount: currentAmount(b), type: 'expense', categoryId: '', date: today, paidBy: b.paidBy, sharing: b.sharing, status: 'planned' }, data.people);
        return data.people.map((p) => `${escapeHtml(p.name)} ${money(a[p.id])}`).join(' / ');
    };
    container.innerHTML = `
    ${pageHeader('Recurring Bills', '<button class="btn btn-primary btn-sm" data-action="add"><i class="bi bi-plus-lg me-1"></i>Add bill</button>', 'Forecasts only. A payment becomes an actual transaction when marked paid.')}
    <div class="row g-3 mb-3">
      <div class="col-6 col-lg-3"><div class="card"><div class="card-body"><div class="small text-body-secondary">Active bills</div><div class="stat-value">${active.length}</div></div></div></div>
      <div class="col-6 col-lg-3"><div class="card"><div class="card-body"><div class="small text-body-secondary">Expected annual cost</div><div class="stat-value">${money(annualTotal)}</div></div></div></div>
      <div class="col-12 col-lg-6"><div class="card"><div class="card-body"><div class="small text-body-secondary">Monthly equivalent (planning value)</div><div class="stat-value">${money(annualTotal / 12)}</div></div></div></div>
    </div>
    <div class="card"><div class="table-responsive">${data.recurringBills.length ? `<table class="table align-middle mb-0">
      <thead><tr><th>Name</th><th class="d-none d-md-table-cell">Frequency</th><th class="text-end">Amount</th><th class="text-end d-none d-lg-table-cell">Monthly eq.</th><th class="text-end d-none d-lg-table-cell">Annual</th>
        <th class="d-none d-md-table-cell">Next due</th><th class="d-none d-xl-table-cell">Each person's share</th><th></th></tr></thead>
      <tbody>${data.recurringBills.map((b) => `<tr class="${b.active ? '' : 'text-body-secondary'}">
        <td>${escapeHtml(b.name)}<div class="small text-body-secondary">${catName(b.categoryId)}${b.active ? '' : ' · inactive'}</div></td>
        <td class="d-none d-md-table-cell">${freqLabel(b.frequency)}</td>
        <td class="text-end">${money(currentAmount(b))}</td>
        <td class="text-end d-none d-lg-table-cell">${money(monthlyEquivalent(b))}</td>
        <td class="text-end d-none d-lg-table-cell">${money(annualCost(b))}</td>
        <td class="d-none d-md-table-cell">${b.active ? nextDue(b) : '-'}</td>
        <td class="d-none d-xl-table-cell small">${shareText(b)}</td>
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-outline-secondary" data-action="history" data-id="${b.id}" aria-label="Price history"><i class="bi bi-graph-up"></i></button>
          <button class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="${b.id}" aria-label="Edit"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${b.id}" aria-label="Delete"><i class="bi bi-trash"></i></button></td></tr>`).join('')}</tbody></table>` : emptyState('No recurring bills yet.')}</div></div>`;
    container.onclick = async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn)
            return;
        const bill = data.recurringBills.find((b) => b.id === btn.dataset.id);
        const action = btn.dataset.action;
        if (action === 'add' || action === 'edit')
            openBillForm(bill);
        else if (action === 'delete' && bill && (await confirmDialog(`Delete "${bill.name}"? Payments already recorded stay in Transactions.`))) {
            dataManager.update((d) => (d.recurringBills = d.recurringBills.filter((b) => b.id !== bill.id)));
        }
        else if (action === 'history' && bill) {
            openForm({
                title: `Price history: ${bill.name}`,
                fields: [{ name: 'info', label: '', type: 'textarea', col: 'col-12', value: [...bill.amountHistory].sort((a, b) => a.from.localeCompare(b.from)).map((h) => `${h.from}: ${money(h.amount)}`).join('\n') }],
                onSave: () => undefined,
            });
        }
    };
}
function openBillForm(bill) {
    const { data } = dataManager;
    const people = personOptions(data.people);
    const method = bill?.sharing.method ?? 'equal';
    const vals = bill?.sharing.values ?? {};
    openForm({
        title: bill ? 'Edit recurring bill' : 'Add recurring bill',
        fields: [
            { name: 'name', label: 'Name', type: 'text', value: bill?.name, required: true, col: 'col-12' },
            { name: 'amount', label: bill ? 'Amount (a change is effective from the date below)' : 'Amount', type: 'number', value: bill ? currentAmount(bill) : '', required: true },
            { name: 'effective', label: 'Price effective from', type: 'date', value: bill ? todayStr() : '' },
            { name: 'categoryId', label: 'Category', type: 'select', options: data.categories.map((c) => ({ v: c.id, l: c.name })), value: bill?.categoryId },
            { name: 'frequency', label: 'Frequency', type: 'select', options: FREQUENCIES.map((f) => ({ v: f.value, l: f.label })), value: bill?.frequency ?? 'monthly' },
            { name: 'startDate', label: 'Start date (first due date)', type: 'date', value: bill?.startDate ?? todayStr(), required: true },
            { name: 'endDate', label: 'End date (optional)', type: 'date', value: bill?.endDate },
            { name: 'paidBy', label: 'Paid by', type: 'select', options: people, value: bill?.paidBy },
            { name: 'method', label: 'Responsibility', type: 'select', value: method, options: [{ v: 'equal', l: 'Equal (default shares)' }, { v: 'percentage', l: 'Custom percentages' }, { v: 'fixed', l: 'Fixed amounts' }, { v: 'individual', l: 'Individual' }] },
            ...data.people.map((p) => ({ name: `share-${p.id}`, label: `${p.name}: % / amount / 100 if individual owner`, type: 'number', value: vals[p.id] ?? '', help: 'Only used for non-equal sharing' })),
            { name: 'active', label: 'Active', type: 'checkbox', value: bill?.active ?? true },
            { name: 'notes', label: 'Notes', type: 'textarea', value: bill?.notes, col: 'col-12' },
        ],
        onSave: (v) => {
            const amount = Number(v.amount);
            if (!(amount > 0))
                return 'Amount must be greater than 0.';
            const values = {};
            data.people.forEach((p) => (values[p.id] = Number(v[`share-${p.id}`]) || 0));
            const sharing = v.method === 'equal' ? { method: 'equal' } : { method: v.method, values };
            const err = validateSharing(sharing, amount, data.people);
            if (err)
                return err;
            dataManager.update((d) => {
                const target = bill ? d.recurringBills.find((b) => b.id === bill.id) : { id: generateId('rb'), amountHistory: [{ from: v.startDate, amount }] };
                Object.assign(target, {
                    name: v.name, categoryId: v.categoryId, frequency: v.frequency, startDate: v.startDate,
                    endDate: v.endDate || undefined, active: !!v.active, paidBy: v.paidBy, sharing, notes: v.notes || undefined,
                });
                // A price change adds a dated history entry; earlier prices and paid transactions stay untouched.
                if (bill && amount !== currentAmount(bill))
                    target.amountHistory.push({ from: v.effective || todayStr(), amount });
                if (!bill)
                    d.recurringBills.push(target);
            });
        },
    });
}
//# sourceMappingURL=recurringBills.js.map