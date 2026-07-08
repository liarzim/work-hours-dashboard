import { HEBREW_DAYS } from "./types";
import type { DayRecord } from "./types";

/** Convert YYYY-MM-DD to DD/MM/YYYY */
export function isoToDdmmyyyy(iso: string): string {
  if (!iso || !iso.includes("-")) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Convert HH:mm to decimal hours (e.g. "07:30" -> 7.5) */
export function hhmmToDecimal(time: string | null | undefined): number {
  if (!time || !time.includes(":")) return 0;
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h + m / 60;
}

/** Convert decimal hours to HH:mm (e.g. 7.5 -> "07:30") */
export function decimalToHhmm(dec: number): string {
  if (dec <= 0) return "";
  const h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Derive standard work hours based on Hebrew day of week and classification */
export function calculateDailyStandard(dateIso: string, classification: string): number {
  const nonWorking = ["חופש", "חג", "שבת", "סופ\"ש", "סופשבוע"].includes(classification);
  if (nonWorking) return 0;
  
  const date = new Date(`${dateIso}T00:00:00`);
  const dow = date.getDay(); // 0 = Sunday, 4 = Thursday, 5 = Friday, 6 = Saturday
  
  if (dow === 5 || dow === 6) return 0; // Friday / Saturday
  return dow === 4 ? 8.5 : 9.0; // Thursday = 8.5, Sun-Wed = 9.0
}

interface RawReport {
  date: string;
  entry: string | null;
  exit: string | null;
  vacation_days: number;
  sick_days: number;
  reserve_days: number;
  classification: string;
  notes: string | null;
  unique_notes: string | null;
  order_type: string | null;
}

/** Derive a full DayRecord from a database report row */
export function deriveDayRecord(
  raw: RawReport,
  annualVacationQuota: number,
  ytdVacationUsedUpToDate: number,
  monthIndex: number // 1-12
): DayRecord {
  const entry = raw.entry ?? "";
  const exit = raw.exit ?? "";
  
  const entryDec = hhmmToDecimal(entry);
  const exitDec = hhmmToDecimal(exit);
  const totalHoursDecimal = Math.max(0, Math.round((exitDec - entryDec) * 100) / 100);
  const totalHours = totalHoursDecimal > 0 ? decimalToHhmm(totalHoursDecimal) : "";
  
  const dailyStandard = calculateDailyStandard(raw.date, raw.classification);
  const overtimeDecimal = Math.max(0, Math.round((totalHoursDecimal - dailyStandard) * 100) / 100);
  
  const date = new Date(`${raw.date}T00:00:00`);
  const dayName = HEBREW_DAYS[date.getDay()];
  
  // Vacation balance is the annual quota minus vacation used YTD (including today)
  const accruedQuota = annualVacationQuota;
  const vacationBalance = Math.round((accruedQuota - ytdVacationUsedUpToDate) * 10) / 10;
  
  return {
    rowIndex: 0, // Not applicable in database mode
    tab: "database",
    date: raw.date,
    dateDisplay: isoToDdmmyyyy(raw.date),
    entry,
    exit,
    totalHours,
    totalHoursDecimal,
    dailyStandard,
    overtimeDecimal,
    vacationDays: raw.vacation_days,
    reserveDays: raw.reserve_days,
    sickDays: raw.sick_days,
    classification: raw.classification,
    notes: raw.notes ?? "",
    uniqueNotes: raw.unique_notes ?? "",
    orderType: raw.order_type ?? "",
    dayName,
    vacationBalance,
    monthlyStandardHours: dailyStandard * 22 // cosmetic default
  };
}
