export function roundMoney(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}
export function formatMoney(n, currency) {
    return new Intl.NumberFormat('da-DK', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
}
export function currentMonthKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export function monthLabel(key) {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
export function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
//# sourceMappingURL=format.js.map