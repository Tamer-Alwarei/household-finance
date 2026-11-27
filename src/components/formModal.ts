import { ensureModal, hideModal, showModal } from './modal.js';
import { escapeHtml } from '../utils/format.js';

export interface Field {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'month' | 'select' | 'textarea' | 'checkbox';
  value?: string | number | boolean;
  options?: { v: string; l: string }[];
  required?: boolean;
  step?: string;
  col?: string; // bootstrap column classes, defaults to half width from sm up
  help?: string;
}

export interface FormConfig {
  title: string;
  fields: Field[];
  // Return an error message to keep the dialog open, or nothing to close it.
  onSave: (values: Record<string, string>) => string | void;
}

const SHELL = `
  <div class="modal-dialog modal-dialog-scrollable modal-fullscreen-sm-down"><form class="modal-content" id="gf-form" novalidate>
    <div class="modal-header"><h5 class="modal-title" id="gf-title"></h5>
      <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
    <div class="modal-body"><div class="alert alert-danger" id="gf-error" hidden role="alert"></div><div class="row g-3" id="gf-body"></div></div>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="submit" class="btn btn-primary">Save</button>
    </div>
  </form></div>`;

function fieldHtml(f: Field): string {
  const id = `gf-${f.name}`;
  const col = f.col ?? 'col-12 col-sm-6';
  const v = f.value ?? '';
  let input: string;
  if (f.type === 'select') {
    input = `<select class="form-select" name="${f.name}" id="${id}">${(f.options ?? []).map((o) => `<option value="${escapeHtml(o.v)}" ${o.v === String(v) ? 'selected' : ''}>${escapeHtml(o.l)}</option>`).join('')}</select>`;
  } else if (f.type === 'textarea') {
    input = `<textarea class="form-control" name="${f.name}" id="${id}" rows="2">${escapeHtml(String(v))}</textarea>`;
  } else if (f.type === 'checkbox') {
    return `<div class="${col}"><div class="form-check"><input class="form-check-input" type="checkbox" name="${f.name}" id="${id}" ${v ? 'checked' : ''}><label class="form-check-label" for="${id}">${escapeHtml(f.label)}</label></div></div>`;
  } else {
    input = `<input class="form-control" type="${f.type}" ${f.type === 'number' ? `step="${f.step ?? '0.01'}"` : ''} name="${f.name}" id="${id}" value="${escapeHtml(String(v))}" ${f.required ? 'required' : ''}>`;
  }
  return `<div class="${col}"><label class="form-label" for="${id}">${escapeHtml(f.label)}</label>${input}${f.help ? `<div class="form-text">${escapeHtml(f.help)}</div>` : ''}</div>`;
}

export function openForm(cfg: FormConfig): void {
  const modal = ensureModal('generic-modal', SHELL);
  modal.querySelector('#gf-title')!.textContent = cfg.title;
  modal.querySelector('#gf-body')!.innerHTML = cfg.fields.map(fieldHtml).join('');
  const err = modal.querySelector<HTMLElement>('#gf-error')!;
  err.hidden = true;
  const form = modal.querySelector<HTMLFormElement>('#gf-form')!;
  form.onsubmit = (e) => {
    e.preventDefault();
    const values: Record<string, string> = {};
    for (const f of cfg.fields) {
      const el = form.elements.namedItem(f.name) as HTMLInputElement;
      values[f.name] = f.type === 'checkbox' ? (el.checked ? 'true' : '') : el.value.trim();
    }
    const missing = cfg.fields.find((f) => f.required && !values[f.name]);
    const message = missing ? `${missing.label} is required.` : cfg.onSave(values);
    err.hidden = !message;
    if (message) err.textContent = message;
    else hideModal(modal);
  };
  showModal(modal);
}
