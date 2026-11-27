// Date helpers work on plain YYYY-MM-DD strings to avoid timezone surprises.
export const pad = (n: number) => String(n).padStart(2, '0');

export function parseDate(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split('-').map(Number);
  return { y, m, d };
}

export const fmtDate = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export const todayStr = () => new Date().toISOString().slice(0, 10);
export const monthOf = (date: string) => date.slice(0, 7);

export function addDays(s: string, n: number): string {
  const { y, m, d } = parseDate(s);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return fmtDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

// Adds months and clamps to month end (31 Jan + 1 month = 28/29 Feb) while keeping the anchor day.
export function addMonths(s: string, n: number, anchorDay = parseDate(s).d): string {
  const { y, m } = parseDate(s);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return fmtDate(ny, nm, Math.min(anchorDay, daysInMonth(ny, nm)));
}

export function addMonthKey(key: string, n: number): string {
  return addMonths(`${key}-01`, n).slice(0, 7);
}

export function monthRange(key: string): { from: string; to: string } {
  const { y, m } = parseDate(`${key}-01`);
  return { from: `${key}-01`, to: fmtDate(y, m, daysInMonth(y, m)) };
}
