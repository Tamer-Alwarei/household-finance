import { dataManager } from '../data/dataManager.js';
import { validateImport } from '../data/dataMigration.js';
import { openForm } from '../components/formModal.js';
import { confirmDialog } from '../components/confirmationDialog.js';
import { downloadFile, pageHeader } from '../components/ui.js';
import { escapeHtml } from '../utils/format.js';
import { generateId } from '../utils/idGenerator.js';
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString() : 'never');
export function renderSettings(container) {
    const { data } = dataManager;
    const used = (id) => data.transactions.some((t) => t.categoryId === id) || data.recurringBills.some((b) => b.categoryId === id);
    container.innerHTML = `
    ${pageHeader('Settings')}
    <div class="row g-3">
      <div class="col-12 col-xl-6"><div class="card h-100"><div class="card-body">
        <h2 class="h5">Household</h2>
        <form id="set-form" class="row g-2">
          <div class="col-12 col-sm-6"><label class="form-label" for="s-currency">Currency code</label><input class="form-control" id="s-currency" value="${escapeHtml(data.settings.currency)}" maxlength="3"></div>
          <div class="col-12 col-sm-6"><label class="form-label" for="s-warn">Budget warning at (%)</label><input class="form-control" type="number" id="s-warn" value="${data.settings.warnPercent}"></div>
          ${data.people.map((p, i) => `
            <div class="col-8"><label class="form-label" for="s-name-${i}">Person ${i + 1} name</label><input class="form-control" id="s-name-${i}" value="${escapeHtml(p.name)}"></div>
            <div class="col-4"><label class="form-label" for="s-pct-${i}">Share %</label><input class="form-control" type="number" id="s-pct-${i}" value="${p.sharePercent}"></div>`).join('')}
          <div class="col-12"><div class="alert alert-danger py-2" id="set-error" hidden></div><button class="btn btn-primary" type="submit">Save settings</button></div>
        </form>
      </div></div></div>

      <div class="col-12 col-xl-6"><div class="card h-100"><div class="card-body">
        <h2 class="h5">Backup and data</h2>
        <p class="small mb-2">Last saved: ${fmtTime(data.lastSaved)}<br>Last backup: ${fmtTime(data.lastBackup)}</p>
        <div class="d-flex flex-wrap gap-2 mb-3">
          <button class="btn btn-outline-primary btn-sm" data-action="export"><i class="bi bi-download me-1"></i>Download JSON backup</button>
          <label class="btn btn-outline-primary btn-sm mb-0">Restore from JSON<input type="file" accept="application/json,.json" id="s-import" hidden></label>
          ${data.demo ? '<button class="btn btn-outline-danger btn-sm" data-action="demo-remove">Remove demo data</button>' : '<button class="btn btn-outline-secondary btn-sm" data-action="demo-load">Load demo data</button>'}
          <button class="btn btn-danger btn-sm" data-action="reset">Reset all data</button>
        </div>
        <div class="alert alert-danger py-2" id="import-error" hidden></div>
        <p class="small text-body-secondary mb-0">Data lives in this browser profile's LocalStorage. Clearing browser data deletes it, and two computers do not sync automatically: move data with JSON backups.</p>
      </div></div></div>

      <div class="col-12"><div class="card"><div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-2"><h2 class="h5 mb-0">Categories</h2><button class="btn btn-primary btn-sm" data-action="cat-add"><i class="bi bi-plus-lg me-1"></i>Add</button></div>
        <div class="table-responsive"><table class="table table-sm align-middle mb-0"><thead><tr><th>Name</th><th class="d-none d-md-table-cell">Kind</th><th class="text-end">Monthly budget</th><th></th></tr></thead>
        <tbody>${data.categories.map((c) => `<tr class="${c.archived ? 'text-body-secondary' : ''}"><td><i class="bi bi-${c.icon} me-1"></i>${escapeHtml(c.name)}${c.archived ? ' (archived)' : ''}</td>
          <td class="d-none d-md-table-cell">${c.kind ?? 'expense'}</td><td class="text-end">${c.monthlyBudget}</td>
          <td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-secondary" data-action="cat-edit" data-id="${c.id}" aria-label="Edit"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-secondary" data-action="cat-archive" data-id="${c.id}" aria-label="${c.archived ? 'Restore' : 'Archive'}"><i class="bi bi-archive"></i></button>
          ${used(c.id) ? '' : `<button class="btn btn-sm btn-outline-danger" data-action="cat-delete" data-id="${c.id}" aria-label="Delete"><i class="bi bi-trash"></i></button>`}</td></tr>`).join('')}</tbody></table></div>
        <p class="small text-body-secondary mt-2 mb-0">Categories with history can only be archived, never deleted.</p>
      </div></div></div>
    </div>`;
    container.querySelector('#set-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const val = (id) => container.querySelector(`#${id}`).value.trim();
        const pcts = data.people.map((_, i) => Number(val(`s-pct-${i}`)));
        const err = container.querySelector('#set-error');
        const message = pcts.reduce((a, b) => a + b, 0) !== 100 ? 'Shares must total exactly 100%.' : !/^[A-Za-z]{3}$/.test(val('s-currency')) ? 'Currency must be a 3-letter code, e.g. DKK.' : data.people.some((_, i) => !val(`s-name-${i}`)) ? 'Names are required.' : '';
        err.hidden = !message;
        if (message) {
            err.textContent = message;
            return;
        }
        dataManager.update((d) => {
            d.settings.currency = val('s-currency').toUpperCase();
            d.settings.warnPercent = Number(val('s-warn')) || 80;
            d.people.forEach((p, i) => { p.name = val(`s-name-${i}`); p.sharePercent = pcts[i]; });
        });
    });
    container.querySelector('#s-import').addEventListener('change', async (e) => {
        const input = e.target;
        const file = input.files?.[0];
        const err = container.querySelector('#import-error');
        err.hidden = true;
        if (!file)
            return;
        try {
            const imported = validateImport(JSON.parse(await file.text()));
            const summary = `Replace current data with this file? It contains ${imported.transactions.length} transactions, ${imported.recurringBills.length} recurring bills, ${imported.savingsGoals.length} goals and ${imported.debts.length} debts. A safety copy of the current data is kept in this browser first.`;
            if (await confirmDialog(summary, 'Restore')) {
                try {
                    localStorage.setItem('household-finance:pre-restore', JSON.stringify(dataManager.data));
                }
                catch { /* quota: restore still proceeds after confirmation */ }
                dataManager.replaceAll(imported);
            }
        }
        catch (ex) {
            err.textContent = `Import failed: ${ex.message}`;
            err.hidden = false;
        }
        input.value = '';
    });
    container.onclick = async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn)
            return;
        const cat = data.categories.find((c) => c.id === btn.dataset.id);
        switch (btn.dataset.action) {
            case 'export':
                downloadFile(`household-finance-${new Date().toISOString().slice(0, 10)}.json`, dataManager.exportJson(), 'application/json');
                break;
            case 'demo-load':
                dataManager.loadDemoData();
                break;
            case 'demo-remove':
                dataManager.removeDemoData();
                break;
            case 'reset':
                if (await confirmDialog('Delete ALL data and start fresh? Download a backup first if unsure.', 'Reset everything'))
                    dataManager.reset();
                break;
            case 'cat-add':
            case 'cat-edit':
                openCategoryForm(cat);
                break;
            case 'cat-archive':
                if (cat)
                    dataManager.update(() => (cat.archived = !cat.archived));
                break;
            case 'cat-delete':
                if (cat && (await confirmDialog(`Delete category "${cat.name}"?`)))
                    dataManager.update((d) => (d.categories = d.categories.filter((c) => c.id !== cat.id)));
                break;
        }
    };
}
function openCategoryForm(cat) {
    openForm({
        title: cat ? 'Edit category' : 'Add category',
        fields: [
            { name: 'name', label: 'Name', type: 'text', value: cat?.name, required: true },
            { name: 'icon', label: 'Icon (Bootstrap icon name)', type: 'text', value: cat?.icon ?? 'tag' },
            { name: 'kind', label: 'Kind', type: 'select', value: cat?.kind ?? 'expense', options: [{ v: 'expense', l: 'Expense' }, { v: 'savings', l: 'Savings' }, { v: 'income', l: 'Income' }] },
            { name: 'budget', label: 'Monthly budget', type: 'number', value: cat?.monthlyBudget ?? 0 },
        ],
        onSave: (v) => {
            if (Number(v.budget) < 0)
                return 'Budget cannot be negative.';
            dataManager.update((d) => {
                const c = cat ? d.categories.find((x) => x.id === cat.id) : { id: generateId('cat'), archived: false, rollover: 'reset' };
                Object.assign(c, { name: v.name, icon: v.icon || 'tag', kind: v.kind, monthlyBudget: Number(v.budget) });
                if (!cat)
                    d.categories.push(c);
            });
        },
    });
}
//# sourceMappingURL=settings.js.map