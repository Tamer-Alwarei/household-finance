// Modals live on <body>, not inside #app, so page re-renders never destroy an open dialog.
export function ensureModal(id, html) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement('div');
        el.id = id;
        el.className = 'modal fade';
        el.tabIndex = -1;
        el.innerHTML = html;
        document.body.appendChild(el);
    }
    return el;
}
export const showModal = (el) => bootstrap.Modal.getOrCreateInstance(el).show();
export const hideModal = (el) => bootstrap.Modal.getOrCreateInstance(el).hide();
//# sourceMappingURL=modal.js.map