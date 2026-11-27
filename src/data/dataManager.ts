import type { AppData, Transaction } from '../models/types.js';
import { LocalStorageAdapter, type StorageAdapter } from './storage.js';
import { createDefaultData, addDemoData, removeDemoData } from './defaults.js';
import { migrate } from './dataMigration.js';

type Listener = () => void;

// Single source of truth. Pages read `data` and change it through update(), which auto-saves.
class DataManager {
  private adapter: StorageAdapter = new LocalStorageAdapter();
  private listeners: Listener[] = [];
  data: AppData;
  lastError: string | null = null;

  constructor() {
    this.data = this.read();
  }

  private read(): AppData {
    try {
      const raw = this.adapter.load();
      if (raw) return migrate(JSON.parse(raw));
    } catch (e) {
      this.lastError = `Could not read saved data: ${(e as Error).message}`;
    }
    return createDefaultData();
  }

  onChange(fn: Listener): void {
    this.listeners.push(fn);
  }

  private commit(): void {
    this.data.lastSaved = new Date().toISOString();
    try {
      this.adapter.save(JSON.stringify(this.data));
      this.lastError = null;
    } catch (e) {
      this.lastError = `Save failed: ${(e as Error).message}`;
    }
    this.listeners.forEach((fn) => fn());
  }

  // Run a mutation on the data, then save and re-render.
  update(fn: (data: AppData) => void): void {
    fn(this.data);
    this.commit();
  }

  replaceAll(data: AppData): void {
    this.data = data;
    this.commit();
  }

  // Download-ready JSON; also records the backup time.
  exportJson(): string {
    this.data.lastBackup = new Date().toISOString();
    this.commit();
    return JSON.stringify(this.data, null, 2);
  }

  addTransaction(tx: Transaction): void {
    this.update((d) => d.transactions.push(tx));
  }

  updateTransaction(tx: Transaction): void {
    this.update((d) => {
      const i = d.transactions.findIndex((t) => t.id === tx.id);
      if (i >= 0) d.transactions[i] = tx;
    });
  }

  deleteTransactions(ids: string[]): void {
    this.update((d) => (d.transactions = d.transactions.filter((t) => !ids.includes(t.id))));
  }

  loadDemoData(): void {
    this.update((d) => { removeDemoData(d); addDemoData(d); });
  }

  removeDemoData(): void {
    this.update(removeDemoData);
  }

  reset(): void {
    this.replaceAll(createDefaultData());
  }
}

export const dataManager = new DataManager();
