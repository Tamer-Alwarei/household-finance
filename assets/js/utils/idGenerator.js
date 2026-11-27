export function generateId(prefix = 'tx') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
//# sourceMappingURL=idGenerator.js.map