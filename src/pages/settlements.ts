import { dataManager } from '../data/dataManager.js';
import { balances, outstanding } from '../services/settlementService.js';
import { openForm } from '../components/formModal.js';
import { confirmDialog } from '../components/confirmationDialog.js';
import { emptyState, pageHeader, personOptions } from '../components/ui.js';
import { escapeHtml, formatMoney } from '../utils/format.js';
import { generateId } from '../utils/idGenerator.js';
import { todayStr } from '../utils/dateUtils.js';

export function renderSettlements(container: HTMLElement): void {
  const { data } = dataManager;
  const money = (n: number) => formatMoney(n, data.settings.currency);
  const name = (id: string) => escapeHtml(data.people.find((p) => p.id === id)?.name ?? id);
  const rows = balances(data);
  const owe = outstanding(data);
  const history = [...data.settlements].sort((a, b) => b.date.localeCompare(a.date));

  container.innerHTML = `
    ${pageHeader('Settlements', '<button class="btn btn-primary btn-sm" data-action="add"><i class="bi bi-plus-lg me-1"></i>Record settlement</button>', 'Shared expenses: who paid vs who is responsible')}
    <div class="alert ${owe ? 'alert-warning' : 'alert-success'}">
      ${owe ? `<strong>${name(owe.debtor)}</strong> owes <strong>${name(owe.creditor)}</strong> ${money(owe.amount)}.` : 'Everything is settled.'}
    </div>
    <div class="card mb-3"><div class="table-responsive"><table class="table align-middle mb-0">
      <thead><tr><th>Person</th><th class="text-end">Paid</th><th class="text-end">Responsible</th>
        <th class="text-end d-none d-md-table-cell">Settled out</th><th class="text-end d-none d-md-table-cell">Settled in</th><th class="text-end">Net</th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${name(r.personId)}</td><td class="text-end">${money(r.paid)}</td><td class="text-end">${money(r.responsible)}</td>
        <td class="text-end d-none d-md-table-cell">${money(r.settledOut)}</td><td class="text-end d-none d-md-table-cell">${money(r.settledIn)}</td>
        <td class="text-end ${r.net < 0 ? 'text-negative' : 'text-positive'}">${r.net > 0 ? 'Is owed ' : r.net < 0 ? 'Owes ' : ''}${money(Math.abs(r.net))}</td></tr>`).join('')}</tbody>
    </table></div></div>
    <h2 class="h5">Settlement history</h2>
    <div class="card"><div class="table-responsive">${history.length ? `<table class="table align-middle mb-0">
      <thead><tr><th>Date</th><th>From → To</th><th class="d-none d-md-table-cell">Note</th><th class="text-end">Amount</th><th></th></tr></thead>
      <tbody>${history.map((s) => `<tr><td>${s.date}</td><td>${name(s.from)} → ${name(s.to)}</td><td class="d-none d-md-table-cell">${escapeHtml(s.note ?? '')}</td>
        <td class="text-end">${money(s.amount)}</td><td class="text-end"><button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${s.id}" aria-label="Delete"><i class="bi bi-trash"></i></button></td></tr>`).join('')}</tbody></table>` : emptyState('No settlements recorded yet.')}</div></div>
    <p class="small text-body-secondary mt-2">Settlements only move money between the two people. They never count as household income or expenses.</p>`;

  container.onclick = async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'delete') {
      if (await confirmDialog('Delete this settlement?')) dataManager.update((d) => (d.settlements = d.settlements.filter((s) => s.id !== btn.dataset.id)));
      return;
    }
    const people = personOptions(data.people);
    openForm({
      title: 'Record settlement',
      fields: [
        { name: 'date', label: 'Date', type: 'date', value: todayStr(), required: true },
        { name: 'amount', label: 'Amount', type: 'number', value: owe?.amount ?? '', required: true },
        { name: 'from', label: 'Paid by', type: 'select', options: people, value: owe?.debtor ?? people[0].v },
        { name: 'to', label: 'Received by', type: 'select', options: people, value: owe?.creditor ?? people[1].v },
        { name: 'note', label: 'Note', type: 'text', col: 'col-12' },
      ],
      onSave: (v) => {
        if (v.from === v.to) return 'Choose two different people.';
        if (!(Number(v.amount) > 0)) return 'Amount must be greater than 0.';
        dataManager.update((d) => d.settlements.push({ id: generateId('s'), date: v.date, from: v.from, to: v.to, amount: Number(v.amount), note: v.note || undefined }));
      },
    });
  };
}
