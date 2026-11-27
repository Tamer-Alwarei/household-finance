import { dataManager } from '../data/dataManager.js';
import { validateTransaction } from '../services/validationService.js';
import { confirmDialog } from '../components/confirmationDialog.js';
import { ensureModal, hideModal, showModal } from '../components/modal.js';
import { escapeHtml, formatMoney } from '../utils/format.js';
import { generateId } from '../utils/idGenerator.js';
// Kept at module level so filters survive re-renders (e.g. after a save).
const state = { search: '', type: '', category: '', sortKey: 'date', sortDir: -1, selected: new Set() };
const TYPES = ['expense', 'income', 'savings', 'transfer'];
const STATUSES = ['planned', 'unpaid', 'paid', 'overdue'];
const METHODS = [
    { value: 'equal', label: 'Equal (default shares)' },
    { value: 'percentage', label: 'Custom percentages' },
    { value: 'fixed', label: 'Fixed amounts' },
    { value: 'individual', label: 'Individual (one person)' },
];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function visibleTransactions() {
    const { data } = dataManager;
    const catName = (id) => data.categories.find((c) => c.id === id)?.name ?? id;
    const q = state.search.trim().toLowerCase();
    return data.transactions
        .filter((t) => (!state.type || t.type === state.type) && (!state.category || t.categoryId === state.category))
        .filter((t) => !q || `${t.title} ${t.notes ?? ''} ${catName(t.categoryId)}`.toLowerCase().includes(q))
        .sort((a, b) => {
        const va = state.sortKey === 'category' ? catName(a.categoryId) : a[state.sortKey];
        const vb = state.sortKey === 'category' ? catName(b.categoryId) : b[state.sortKey];
        return (va < vb ? -1 : va > vb ? 1 : 0) * state.sortDir;
    });
}
function tableRowsHtml() {
    const { data } = dataManager;
    const money = (n) => formatMoney(n, data.settings.currency);
    const catName = (id) => data.categories.find((c) => c.id === id)?.name ?? id;
    const personName = (id) => data.people.find((p) => p.id === id)?.name ?? id;
    const rows = visibleTransactions();
    if (!rows.length) {
        return `<tr><td colspan="8" class="text-center text-body-secondary py-5">
      ${data.transactions.length ? 'No transactions match the filters.' : 'No transactions yet. Add one or load demo data on the Dashboard.'}
    </td></tr>`;
    }
    return rows.map((t) => `
    <tr>
      <td><input class="form-check-input row-select" type="checkbox" data-id="${t.id}" aria-label="Select" ${state.selected.has(t.id) ? 'checked' : ''}></td>
      <td class="text-nowrap">${t.date}</td>
      <td>${escapeHtml(t.title)}<div class="d-md-none small text-body-secondary">${escapeHtml(catName(t.categoryId))}</div></td>
      <td class="d-none d-md-table-cell">${escapeHtml(catName(t.categoryId))}</td>
      <td class="d-none d-lg-table-cell">${escapeHtml(cap(t.type))}</td>
      <td class="d-none d-lg-table-cell">${escapeHtml(personName(t.paidBy))}</td>
      <td class="d-none d-xl-table-cell"><span class="badge text-bg-${t.status === 'paid' ? 'success' : t.status === 'overdue' ? 'danger' : 'secondary'}">${t.status}</span></td>
      <td class="text-end text-nowrap ${t.type === 'income' ? 'text-positive' : ''}">${t.type === 'income' ? '+' : ''}${money(t.amount)}</td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="${t.id}" aria-label="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-secondary" data-action="duplicate" data-id="${t.id}" aria-label="Duplicate"><i class="bi bi-copy"></i></button>
        <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${t.id}" aria-label="Delete"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`).join('');
}
function sortHeader(key, label, cls = '') {
    const arrow = state.sortKey === key ? (state.sortDir === 1 ? ' <i class="bi bi-caret-up-fill"></i>' : ' <i class="bi bi-caret-down-fill"></i>') : '';
    return `<th class="${cls}"><button class="btn btn-link p-0 text-reset fw-semibold text-decoration-none" data-sort="${key}">${label}${arrow}</button></th>`;
}
export function renderTransactions(container) {
    const { data } = dataManager;
    const options = (items, sel, all) => `<option value="">${all}</option>` + items.map((i) => `<option value="${i.v}" ${i.v === sel ? 'selected' : ''}>${escapeHtml(i.l)}</option>`).join('');
    container.innerHTML = `
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h1 class="h3 mb-0">Transactions</h1>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary btn-sm" id="tx-export"><i class="bi bi-download me-1"></i>CSV</button>
        <button class="btn btn-outline-danger btn-sm" id="tx-bulk-delete" hidden></button>
        <button class="btn btn-primary btn-sm" id="tx-add"><i class="bi bi-plus-lg me-1"></i>Add</button>
      </div>
    </div>
    <div class="row g-2 mb-3">
      <div class="col-12 col-md-6 col-lg-5">
        <input type="search" class="form-control" id="tx-search" placeholder="Search title, notes, category" value="${escapeHtml(state.search)}">
      </div>
      <div class="col-6 col-md-3 col-lg-3">
        <select class="form-select" id="tx-type" aria-label="Type">${options(TYPES.map((t) => ({ v: t, l: cap(t) })), state.type, 'All types')}</select>
      </div>
      <div class="col-6 col-md-3 col-lg-4">
        <select class="form-select" id="tx-category" aria-label="Category">${options(data.categories.map((c) => ({ v: c.id, l: c.name })), state.category, 'All categories')}</select>
      </div>
    </div>
    <div class="card"><div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead><tr>
          <th style="width:2rem"><input class="form-check-input" type="checkbox" id="tx-select-all" aria-label="Select all"></th>
          ${sortHeader('date', 'Date')}${sortHeader('title', 'Title')}${sortHeader('category', 'Category', 'd-none d-md-table-cell')}
          <th class="d-none d-lg-table-cell">Type</th><th class="d-none d-lg-table-cell">Paid by</th><th class="d-none d-xl-table-cell">Status</th>
          ${sortHeader('amount', 'Amount', 'text-end')}<th></th>
        </tr></thead>
        <tbody id="tx-body">${tableRowsHtml()}</tbody>
      </table>
    </div></div>`;
    const refresh = () => {
        container.querySelector('#tx-body').innerHTML = tableRowsHtml();
        updateBulkButton(container);
    };
    const on = (sel, ev, fn) => container.querySelector(sel).addEventListener(ev, fn);
    on('#tx-search', 'input', (e) => { state.search = e.target.value; refresh(); });
    on('#tx-type', 'change', (e) => { state.type = e.target.value; refresh(); });
    on('#tx-category', 'change', (e) => { state.category = e.target.value; refresh(); });
    on('#tx-add', 'click', () => openForm());
    on('#tx-export', 'click', exportCsv);
    on('#tx-select-all', 'change', (e) => {
        const checked = e.target.checked;
        visibleTransactions().forEach((t) => (checked ? state.selected.add(t.id) : state.selected.delete(t.id)));
        refresh();
    });
    on('#tx-bulk-delete', 'click', async () => {
        const ids = [...state.selected];
        if (await confirmDialog(`Delete ${ids.length} selected transaction(s)?`)) {
            state.selected.clear();
            dataManager.deleteTransactions(ids);
        }
    });
    // Delegated listeners: rows are re-rendered often.
    container.onclick = async (e) => {
        const target = e.target;
        const sortBtn = target.closest('[data-sort]');
        if (sortBtn) {
            const key = sortBtn.dataset.sort;
            state.sortDir = state.sortKey === key ? -state.sortDir : 1;
            state.sortKey = key;
            renderTransactions(container);
            return;
        }
        const btn = target.closest('[data-action]');
        if (!btn)
            return;
        const tx = dataManager.data.transactions.find((t) => t.id === btn.dataset.id);
        if (!tx)
            return;
        if (btn.dataset.action === 'edit')
            openForm(tx);
        else if (btn.dataset.action === 'duplicate') {
            dataManager.addTransaction({ ...tx, id: generateId(), title: `${tx.title} (copy)`, sharing: structuredClone(tx.sharing) });
        }
        else if (await confirmDialog(`Delete "${tx.title}"?`)) {
            state.selected.delete(tx.id);
            dataManager.deleteTransactions([tx.id]);
        }
    };
    container.onchange = (e) => {
        const box = e.target;
        if (!box.classList.contains('row-select'))
            return;
        box.checked ? state.selected.add(box.dataset.id) : state.selected.delete(box.dataset.id);
        updateBulkButton(container);
    };
    updateBulkButton(container);
}
function updateBulkButton(container) {
    const btn = container.querySelector('#tx-bulk-delete');
    btn.hidden = state.selected.size === 0;
    btn.innerHTML = `<i class="bi bi-trash me-1"></i>Delete (${state.selected.size})`;
}
function csvCell(v) {
    return `"${String(v).replace(/"/g, '""')}"`;
}
function exportCsv() {
    const { data } = dataManager;
    const catName = (id) => data.categories.find((c) => c.id === id)?.name ?? id;
    const personName = (id) => data.people.find((p) => p.id === id)?.name ?? id;
    const lines = [['Date', 'Title', 'Type', 'Category', 'Paid by', 'Status', 'Amount', 'Notes'].join(',')];
    for (const t of visibleTransactions()) {
        lines.push([t.date, t.title, t.type, catName(t.categoryId), personName(t.paidBy), t.status, t.amount, t.notes ?? ''].map(csvCell).join(','));
    }
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'transactions.csv' });
    a.click();
    URL.revokeObjectURL(url);
}
const FORM_SHELL = `
  <div class="modal-dialog modal-dialog-scrollable modal-fullscreen-sm-down"><form class="modal-content" id="tx-form" novalidate>
    <div class="modal-header"><h5 class="modal-title" id="tx-form-title"></h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
    <div class="modal-body" id="tx-form-body"></div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="submit" class="btn btn-primary">Save</button>
    </div>
  </form></div>`;
function openForm(existing) {
    const { data } = dataManager;
    const modal = ensureModal('tx-modal', FORM_SHELL);
    const tx = existing ?? {
        id: generateId(), title: '', amount: 0, type: 'expense', categoryId: data.categories[0]?.id ?? '',
        date: new Date().toISOString().slice(0, 10), paidBy: data.people[0].id,
        sharing: { method: data.settings.defaultSharing.method }, status: 'paid',
    };
    modal.querySelector('#tx-form-title').textContent = existing ? 'Edit transaction' : 'Add transaction';
    const sel = (name, items, cur) => `<select class="form-select" name="${name}" id="f-${name}">${items.map((i) => `<option value="${i.v}" ${i.v === cur ? 'selected' : ''}>${escapeHtml(i.l)}</option>`).join('')}</select>`;
    modal.querySelector('#tx-form-body').innerHTML = `
    <div class="alert alert-danger" id="tx-error" hidden role="alert"></div>
    <div class="row g-3">
      <div class="col-12"><label class="form-label" for="f-title">Title</label>
        <input class="form-control" name="title" id="f-title" value="${escapeHtml(tx.title)}" required></div>
      <div class="col-12 col-sm-6"><label class="form-label" for="f-amount">Amount (${data.settings.currency})</label>
        <input class="form-control" type="number" step="0.01" min="0" name="amount" id="f-amount" value="${tx.amount || ''}" required></div>
      <div class="col-12 col-sm-6"><label class="form-label" for="f-date">Date</label>
        <input class="form-control" type="date" name="date" id="f-date" value="${tx.date}" required></div>
      <div class="col-12 col-sm-6"><label class="form-label" for="f-type">Type</label>${sel('type', TYPES.map((t) => ({ v: t, l: cap(t) })), tx.type)}</div>
      <div class="col-12 col-sm-6"><label class="form-label" for="f-categoryId">Category</label>${sel('categoryId', data.categories.map((c) => ({ v: c.id, l: c.name })), tx.categoryId)}</div>
      <div class="col-12 col-sm-6"><label class="form-label" for="f-paidBy">Paid by / recipient</label>${sel('paidBy', data.people.map((p) => ({ v: p.id, l: p.name })), tx.paidBy)}</div>
      <div class="col-12 col-sm-6"><label class="form-label" for="f-status">Status</label>${sel('status', STATUSES.map((s) => ({ v: s, l: cap(s) })), tx.status)}</div>
      <div class="col-12" id="sharing-section">
        <label class="form-label" for="f-method">Responsibility (who owes the expense)</label>
        ${sel('method', METHODS.map((m) => ({ v: m.value, l: m.label })), tx.sharing.method)}
        <div class="row g-2 mt-1" id="sharing-detail"></div>
      </div>
      <div class="col-12"><label class="form-label" for="f-notes">Notes</label>
        <textarea class="form-control" name="notes" id="f-notes" rows="2">${escapeHtml(tx.notes ?? '')}</textarea></div>
    </div>`;
    const form = modal.querySelector('#tx-form');
    const field = (id) => form.querySelector(`#f-${id}`);
    const renderSharingDetail = (method, values) => {
        const detail = form.querySelector('#sharing-detail');
        if (method === 'equal') {
            detail.innerHTML = `<div class="col-12 small text-body-secondary">Split using the default shares: ${data.people.map((p) => `${escapeHtml(p.name)} ${p.sharePercent}%`).join(', ')}.</div>`;
        }
        else if (method === 'individual') {
            const cur = data.people.find((p) => values[p.id] === 100)?.id ?? data.people[0].id;
            detail.innerHTML = `<div class="col-12"><select class="form-select" name="responsible" aria-label="Responsible person">${data.people.map((p) => `<option value="${p.id}" ${p.id === cur ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select></div>`;
        }
        else {
            detail.innerHTML = data.people.map((p) => `
        <div class="col-12 col-sm-6"><div class="input-group">
          <span class="input-group-text">${escapeHtml(p.name)}</span>
          <input class="form-control" type="number" step="0.01" min="0" data-person="${p.id}" aria-label="${escapeHtml(p.name)} share" value="${values[p.id] ?? ''}">
          <span class="input-group-text">${method === 'percentage' ? '%' : data.settings.currency}</span>
        </div></div>`).join('');
        }
    };
    const readSharing = () => {
        const method = field('method').value;
        if (method === 'equal')
            return { method };
        if (method === 'individual') {
            const who = form.querySelector('[name=responsible]').value;
            return { method, values: { [who]: 100 } };
        }
        const values = {};
        form.querySelectorAll('[data-person]').forEach((i) => (values[i.dataset.person] = Number(i.value) || 0));
        return { method, values };
    };
    // Sharing only matters for expenses; other types belong to the recipient/payer alone.
    const syncType = () => {
        form.querySelector('#sharing-section').hidden = field('type').value !== 'expense';
    };
    renderSharingDetail(tx.sharing.method, tx.sharing.values ?? {});
    syncType();
    field('method').addEventListener('change', () => renderSharingDetail(field('method').value, {}));
    field('type').addEventListener('change', syncType);
    form.onsubmit = (e) => {
        e.preventDefault();
        const type = field('type').value;
        const paidBy = field('paidBy').value;
        const updated = {
            ...tx,
            title: field('title').value.trim(),
            amount: Number(field('amount').value),
            date: field('date').value,
            type, paidBy,
            categoryId: field('categoryId').value,
            status: field('status').value,
            notes: field('notes').value.trim() || undefined,
            sharing: type === 'expense' ? readSharing() : { method: 'individual', values: { [paidBy]: 100 } },
        };
        const error = validateTransaction(updated, data.people);
        const box = form.querySelector('#tx-error');
        box.hidden = !error;
        if (error) {
            box.textContent = error;
            return;
        }
        existing ? dataManager.updateTransaction(updated) : dataManager.addTransaction(updated);
        hideModal(modal);
    };
    showModal(modal);
}
//# sourceMappingURL=transactions.js.map