import { dataManager } from '../data/dataManager.js';
import type { AppData, Contribution, SavingsGoal, SinkingFund } from '../models/types.js';
import { behindSchedule, expectedCompletion, goalStats, requiredMonthly } from '../services/savingsService.js';
import { openForm } from '../components/formModal.js';
import { confirmDialog } from '../components/confirmationDialog.js';
import { emptyState, pageHeader, personOptions, progressBar } from '../components/ui.js';
import { escapeHtml, formatMoney } from '../utils/format.js';
import { generateId } from '../utils/idGenerator.js';
import { addMonths, todayStr } from '../utils/dateUtils.js';

type Kind = 'goal' | 'fund';
type Item = SavingsGoal | SinkingFund;

const list = (d: AppData, kind: Kind): Item[] => (kind === 'goal' ? d.savingsGoals : d.sinkingFunds);

// One page implementation serves both savings goals and sinking funds; they share contribution logic.
function renderList(container: HTMLElement, kind: Kind): void {
  const { data } = dataManager;
  const money = (n: number) => formatMoney(n, data.settings.currency);
  const title = kind === 'goal' ? 'Savings Goals' : 'Sinking Funds';
  const owner = (o: string) => (o === 'shared' ? 'Shared' : data.people.find((p) => p.id === o)?.name ?? o);
  const items = list(data, kind);
  const total = items.reduce((s, i) => s + goalStats(i).balance, 0);

  const card = (i: Item) => {
    const st = goalStats(i);
    const extra = kind === 'goal'
      ? (() => { const g = i as SavingsGoal; const exp = expectedCompletion(g); return `<div class="small">Monthly target: ${money(g.monthlyTarget)}${g.targetDate ? ` · Target date ${g.targetDate}` : ''}</div>
          <div class="small">Expected completion: ${exp ?? 'unknown'} ${behindSchedule(g) ? '<span class="badge text-bg-warning">Behind schedule</span>' : ''}</div>`; })()
      : (() => { const f = i as SinkingFund; const req = requiredMonthly(f); return `<div class="small">Expected expense: ${f.expectedDate}</div>
          <div class="small">Needs ${money(req)} / month ${st.percent < 100 && f.expectedDate < todayStr() ? '<span class="badge text-bg-danger">Overdue</span>' : ''}</div>`; })();
    return `<div class="col-12 col-lg-6"><div class="card h-100"><div class="card-body">
      <div class="d-flex justify-content-between"><h2 class="h5 mb-1">${escapeHtml(i.name)}</h2><span class="badge text-bg-light border">${escapeHtml(owner(i.owner))}</span></div>
      <div class="mb-1">${money(st.balance)} of ${money(i.target)} · ${money(st.remaining)} remaining</div>
      ${progressBar(st.percent, st.percent >= 100 ? 'ok' : 'ok', i.name)}<div class="small text-body-secondary mb-1">${st.percent}% funded</div>
      ${extra}
      <details class="mt-2"><summary class="small">Contribution history (${i.contributions.length})</summary>
        <ul class="list-unstyled small mb-0 mt-1">${[...i.contributions].sort((a, b) => b.date.localeCompare(a.date)).map((c) => `<li>${c.date}: <span class="${c.amount < 0 ? 'text-negative' : 'text-positive'}">${money(c.amount)}</span> ${escapeHtml(c.note ?? '')}</li>`).join('') || '<li>None yet</li>'}</ul></details>
      <div class="mt-3 d-flex flex-wrap gap-1">
        <button class="btn btn-sm btn-success" data-action="contribute" data-id="${i.id}">Contribute / withdraw</button>
        <button class="btn btn-sm btn-outline-secondary" data-action="transfer" data-id="${i.id}">Transfer</button>
        <button class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="${i.id}" aria-label="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${i.id}" aria-label="Delete"><i class="bi bi-trash"></i></button>
      </div></div></div></div>`;
  };

  container.innerHTML = `
    ${pageHeader(title, `<button class="btn btn-primary btn-sm" data-action="add"><i class="bi bi-plus-lg me-1"></i>Add</button>`, `Total earmarked: ${money(total)}`)}
    <div class="row g-3">${items.length ? items.map(card).join('') : `<div class="col-12">${emptyState('Nothing here yet.')}</div>`}</div>
    <p class="small text-body-secondary mt-3">Balances are earmarked allocations tracked here. Moving money between goals is an internal transfer and never counts as income or an expense.</p>`;

  container.onclick = async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!btn) return;
    const item = items.find((i) => i.id === btn.dataset.id);
    const act = btn.dataset.action;
    if (act === 'add' || (act === 'edit' && item)) openItemForm(kind, item);
    else if (act === 'delete' && item && (await confirmDialog(`Delete "${item.name}" and its history?`))) {
      dataManager.update((d) => { const l = list(d, kind); l.splice(l.findIndex((x) => x.id === item.id), 1); });
    } else if (act === 'contribute' && item) {
      openForm({
        title: `Contribute to ${item.name}`,
        fields: [
          { name: 'date', label: 'Date', type: 'date', value: todayStr(), required: true },
          { name: 'amount', label: 'Amount (negative = withdrawal)', type: 'number', required: true },
          { name: 'note', label: 'Note', type: 'text', col: 'col-12' },
        ],
        onSave: (v) => {
          const amount = Number(v.amount);
          if (!amount) return 'Amount cannot be 0.';
          if (goalStats(item).balance + amount < 0) return 'Withdrawal is larger than the balance.';
          dataManager.update((d) => list(d, kind).find((x) => x.id === item.id)!.contributions.push({ id: generateId('c'), date: v.date, amount, note: v.note || undefined }));
        },
      });
    } else if (act === 'transfer' && item) {
      const others = items.filter((i) => i.id !== item.id);
      if (!others.length) { openForm({ title: 'Transfer', fields: [{ name: 'x', label: 'You need a second item to transfer to.', type: 'checkbox', col: 'col-12' }], onSave: () => undefined }); return; }
      openForm({
        title: `Transfer from ${item.name}`,
        fields: [
          { name: 'to', label: 'Transfer to', type: 'select', options: others.map((o) => ({ v: o.id, l: o.name })), col: 'col-12' },
          { name: 'amount', label: 'Amount', type: 'number', required: true },
          { name: 'date', label: 'Date', type: 'date', value: todayStr() },
        ],
        onSave: (v) => {
          const amount = Number(v.amount);
          if (!(amount > 0)) return 'Amount must be greater than 0.';
          if (amount > goalStats(item).balance) return 'Amount is larger than the available balance.';
          dataManager.update((d) => {
            const l = list(d, kind);
            const note = `Transfer ${item.name} → ${l.find((x) => x.id === v.to)!.name}`;
            l.find((x) => x.id === item.id)!.contributions.push({ id: generateId('c'), date: v.date, amount: -amount, note });
            l.find((x) => x.id === v.to)!.contributions.push({ id: generateId('c'), date: v.date, amount, note });
          });
        },
      });
    }
  };
}

function openItemForm(kind: Kind, item?: Item): void {
  const { data } = dataManager;
  const g = item as SavingsGoal | undefined;
  const f = item as SinkingFund | undefined;
  const owners = personOptions(data.people, [{ v: 'shared', l: 'Shared' }]);
  openForm({
    title: `${item ? 'Edit' : 'Add'} ${kind === 'goal' ? 'savings goal' : 'sinking fund'}`,
    fields: [
      { name: 'name', label: 'Name', type: 'text', value: item?.name, required: true, col: 'col-12' },
      { name: 'target', label: 'Target amount', type: 'number', value: item?.target, required: true },
      { name: 'owner', label: 'Owner', type: 'select', options: owners, value: item?.owner ?? 'shared' },
      kind === 'goal'
        ? { name: 'date', label: 'Target date (optional)', type: 'date', value: g?.targetDate }
        : { name: 'date', label: 'Expected expense date', type: 'date', value: f?.expectedDate ?? addMonths(todayStr(), 12), required: true },
      ...(kind === 'goal' ? [{ name: 'monthly', label: 'Monthly contribution target', type: 'number' as const, value: g?.monthlyTarget ?? 0 }] : []),
    ],
    onSave: (v) => {
      if (!(Number(v.target) > 0)) return 'Target must be greater than 0.';
      dataManager.update((d) => {
        const l = list(d, kind);
        const target = item ? l.find((x) => x.id === item.id)! : ({ id: generateId(kind === 'goal' ? 'sg' : 'sf'), contributions: [] as Contribution[] } as Item);
        Object.assign(target, { name: v.name, target: Number(v.target), owner: v.owner });
        if (kind === 'goal') Object.assign(target, { targetDate: v.date || undefined, monthlyTarget: Number(v.monthly) || 0 });
        else Object.assign(target, { expectedDate: v.date });
        if (!item) l.push(target);
      });
    },
  });
}

export const renderSavings = (c: HTMLElement) => renderList(c, 'goal');
export const renderSinkingFunds = (c: HTMLElement) => renderList(c, 'fund');
