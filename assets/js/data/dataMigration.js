import { createDefaultData } from './defaults.js';
export const CURRENT_VERSION = 2;
// Fills in collections/fields added in later versions so old saved data keeps working.
export function migrate(raw) {
    const base = createDefaultData();
    const data = { ...base, ...raw, settings: { ...base.settings, ...(raw.settings ?? {}) } };
    // v1 data had no category kind; infer it from the starter ids.
    data.categories.forEach((c) => { c.kind ?? (c.kind = c.id === 'salary' ? 'income' : c.id === 'savings' ? 'savings' : 'expense'); c.rollover ?? (c.rollover = 'reset'); });
    data.version = CURRENT_VERSION;
    return data;
}
// Throws a readable error if imported JSON is not usable.
export function validateImport(value) {
    if (!value || typeof value !== 'object')
        throw new Error('File is not a JSON object.');
    const v = value;
    if (typeof v.version !== 'number')
        throw new Error('Missing "version" field.');
    if (v.version > CURRENT_VERSION)
        throw new Error(`Data version ${v.version} is newer than this app supports.`);
    if (!Array.isArray(v.people) || v.people.length < 2)
        throw new Error('"people" must contain two people.');
    if (!Array.isArray(v.categories))
        throw new Error('"categories" must be a list.');
    if (!Array.isArray(v.transactions))
        throw new Error('"transactions" must be a list.');
    return migrate(v);
}
//# sourceMappingURL=dataMigration.js.map