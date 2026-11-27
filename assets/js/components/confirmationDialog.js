import { ensureModal, hideModal, showModal } from './modal.js';
import { escapeHtml } from '../utils/format.js';
export function confirmDialog(message, confirmLabel = 'Delete') {
    const el = ensureModal('confirm-modal', `
    <div class="modal-dialog modal-dialog-centered"><div class="modal-content">
      <div class="modal-header"><h5 class="modal-title">Please confirm</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
      <div class="modal-body" id="confirm-message"></div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-danger" id="confirm-ok"></button>
      </div>
    </div></div>`);
    el.querySelector('#confirm-message').innerHTML = escapeHtml(message);
    el.querySelector('#confirm-ok').textContent = confirmLabel;
    return new Promise((resolve) => {
        let result = false;
        const ok = el.querySelector('#confirm-ok');
        const onOk = () => { result = true; hideModal(el); };
        ok.addEventListener('click', onOk, { once: true });
        el.addEventListener('hidden.bs.modal', () => {
            ok.removeEventListener('click', onOk);
            resolve(result);
        }, { once: true });
        showModal(el);
    });
}
//# sourceMappingURL=confirmationDialog.js.map