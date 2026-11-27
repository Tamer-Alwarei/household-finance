import { LocalStorageAdapter } from './storage.js';
import { createDefaultData, addDemoData, removeDemoData } from './defaults.js';
import { migrate } from './dataMigration.js';
// Single source of truth. Pages read `data` and change it through update(), which auto-saves.
class DataManager {
    constructor() {
        this.adapter = new LocalStorageAdapter();
        this.listeners = [];
        this.lastError = null;
        this.data = this.read();
    }
    read() {
        try {
            const raw = this.adapter.load();
            if (raw)
                return migrate(JSON.parse(raw));
        }
        catch (e) {
            this.lastError = `Could not read saved data: ${e.message}`;
        }
        return createDefaultData();
    }
    onChange(fn) {
        this.listeners.push(fn);
    }
    commit() {
        this.data.lastSaved = new Date().toISOString();
        try {
            this.adapter.save(JSON.stringify(this.data));
            this.lastError = null;
        }
        catch (e) {
            this.lastError = `Save failed: ${e.message}`;
        }
        this.listeners.forEach((fn) => fn());
    }
    // Run a mutation on the data, then save and re-render.
    update(fn) {
        fn(this.data);
        this.commit();
    }
    replaceAll(data) {
        this.data = data;
        this.commit();
    }
    // Download-ready JSON; also records the backup time.
    exportJson() {
        this.data.lastBackup = new Date().toISOString();
        this.commit();
        return JSON.stringify(this.data, null, 2);
    }
    addTransaction(tx) {
        this.update((d) => d.transactions.push(tx));
    }
    updateTransaction(tx) {
        this.update((d) => {
            const i = d.transactions.findIndex((t) => t.id === tx.id);
            if (i >= 0)
                d.transactions[i] = tx;
        });
    }
    deleteTransactions(ids) {
        this.update((d) => (d.transactions = d.transactions.filter((t) => !ids.includes(t.id))));
    }
    loadDemoData() {
        this.update((d) => { removeDemoData(d); addDemoData(d); });
    }
    removeDemoData() {
        this.update(removeDemoData);
    }
    reset() {
        this.replaceAll(createDefaultData());
    }
}
export const dataManager = new DataManager();
//# sourceMappingURL=dataManager.js.map