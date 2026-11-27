import { escapeHtml } from '../utils/format.js';

export function pageHeader(title: string, actionsHtml = '', subtitle = ''): string {
  return `<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
    <div><h1 class="h3 mb-0">${escapeHtml(title)}</h1>${subtitle ? `<div class="text-body-secondary">${escapeHtml(subtitle)}</div>` : ''}</div>
    <div class="d-flex flex-wrap gap-2">${actionsHtml}</div></div>`;
}

export function emptyState(message: string): string {
  return `<div class="text-center text-body-secondary py-4">${escapeHtml(message)}</div>`;
}

export function progressBar(percent: number, status: 'ok' | 'warning' | 'exceeded' = 'ok', label = ''): string {
  const cls = { ok: 'bg-success', warning: 'bg-warning', exceeded: 'bg-danger' }[status];
  return `<div class="progress" role="progressbar" aria-label="${escapeHtml(label)}" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar ${cls}" style="width:${Math.min(percent, 100)}%"></div></div>`;
}

export function downloadFile(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}

// Month input shared by several pages.
export function monthPicker(id: string, value: string): string {
  return `<input type="month" class="form-control form-control-sm" id="${id}" value="${value}" aria-label="Month" style="width:11rem">`;
}

export const personOptions = (people: { id: string; name: string }[], extra: { v: string; l: string }[] = []) =>
  [...extra, ...people.map((p) => ({ v: p.id, l: p.name }))];
