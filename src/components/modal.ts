// Thin wrapper around Bootstrap's global modal API (loaded via script tag).
declare const bootstrap: {
  Modal: { getOrCreateInstance(el: Element): { show(): void; hide(): void } };
};

// Modals live on <body>, not inside #app, so page re-renders never destroy an open dialog.
export function ensureModal(id: string, html: string): HTMLElement {
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

export const showModal = (el: HTMLElement) => bootstrap.Modal.getOrCreateInstance(el).show();
export const hideModal = (el: HTMLElement) => bootstrap.Modal.getOrCreateInstance(el).hide();
