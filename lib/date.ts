/** Date helpers shared by server and client. */

/** dd/mm/yyyy (also d.m.yy, d-m-yyyy) -> yyyy-mm-dd (empty when unparsable) */
export function ddmmyyyyToIso(s: string): string {
  const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/.exec((s ?? "").trim());
  if (!m) return "";
  const [, d, mo, y] = m;
  const year = y.length === 2 ? `20${y}` : y;
  const month = parseInt(mo, 10);
  const day = parseInt(d, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** yyyy-mm-dd -> dd/mm/yyyy */
export function isoToDdmmyyyy(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** "HH:mm" or "HH:mm:ss" -> decimal hours (0 for blank/invalid) */
export function hhmmToDecimal(s: string): number {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec((s ?? "").trim());
  if (!m) return 0;
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
}

export function decimalToHhmm(d: number): string {
  const h = Math.floor(d);
  const min = Math.round((d - h) * 60);
  return `${h}:${String(min).padStart(2, "0")}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}