// Storage abstraction: swap this implementation (e.g. IndexedDB) without touching the rest of the app.
export interface StorageAdapter {
  load(): string | null;
  save(json: string): void;
}

const KEY = 'household-finance:data';

export class LocalStorageAdapter implements StorageAdapter {
  load(): string | null {
    return localStorage.getItem(KEY);
  }

  save(json: string): void {
    // Throws on quota / unavailable storage; the caller surfaces it to the user.
    localStorage.setItem(KEY, json);
  }
}
