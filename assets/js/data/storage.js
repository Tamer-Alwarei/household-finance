const KEY = 'household-finance:data';
export class LocalStorageAdapter {
    load() {
        return localStorage.getItem(KEY);
    }
    save(json) {
        // Throws on quota / unavailable storage; the caller surfaces it to the user.
        localStorage.setItem(KEY, json);
    }
}
//# sourceMappingURL=storage.js.map