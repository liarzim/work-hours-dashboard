import { HEBREW_DAYS } from "./types";
import type { DayRecord } from "./types";
import { ddmmyyyyToIso, hhmmToDecimal } from "./date";

/** Column indexes (0-based) in the journal sheet, columns A..AE. */
export const COL = {
  DATE: 0, // תאריך
  ENTRY: 1, // כניסה
  EXIT: 2, // יציאה
  TOTAL_HOURS: 3, // סה"כ שעות
  DAILY_STANDARD_RAW: 4, // תקן יומי
  OVERTIME: 5, // שעות נוספות
  OT_120: 6, // ש"נ 120%
  OT_150: 7, // ש"נ 150%
  OT_200: 8, // ש"נ 200%
  VACATION_DAYS: 9, // ימי חופש
  RESERVE_DAYS: 10, // ימי מילואים
  SICK_DAYS: 11, // ימי מחלה
  CLASSIFICATION: 12, // סיווג
  NOTES: 13, // הערות
  UNIQUE_NOTES: 14, // הערות ייחודיות
  ORDER_TYPE: 15, // סוג צו
  MONTH: 16, // חודש
  YEAR: 17, // שנה
  WEEK: 18, // שבוע
  DAY_NAME: 19, // יום
  DAILY_STANDARD_DEC: 20, // תקן יומי עשרוני
  TOTAL_HOURS_DEC: 21, // תרגום שעות לעשרוני
  OVERTIME_DEC: 22, // שעות נוספות עשרוני
  HOURS_INT: 23, // שעות
  MINUTES_INT: 24, // דקות
  DAILY_VACATION_QUOTA: 25, // מכסת חופשה יומית
  CUM_VACATION_QUOTA: 26, // מכסת חופשה מצטברת
  VACATION_BALANCE: 27, // יתרת חופשה
  EOM_VACATION: 28, // חופשה בסוף החודש
  MAX_MONTHLY_HOURS: 29, // שעות חודשיות מקסימליות
  MONTHLY_STANDARD: 30, // תקן שעות חודשי
} as const;

export const LAST_COLUMN_LETTER = "AE";

/** Classification marking a standards-definition row, not a day report. */
export const STANDARD_ROW_CLASSIFICATION = "הגדרת תקן";

/**
 * Legacy sheets persist monthly standards as special rows at the bottom of
 * the journal: date = first of month, column E = standard work days,
 * column AE = monthly target hours. They reuse real dates (e.g. 01/07/2026),
 * so they MUST be kept out of the day-record stream.
 */
export function parseStandardRow(
  row: unknown[]
): { year: number; month: number; days: number } | null {
  if (str(row[COL.CLASSIFICATION]) !== STANDARD_ROW_CLASSIFICATION) return null;
  const iso = ddmmyyyyToIso(str(row[COL.DATE]));
  if (!iso) return null;
  const days = num(row[COL.DAILY_STANDARD_RAW]); // column E holds day count here
  if (!days) return null;
  return {
    year: parseInt(iso.slice(0, 4), 10),
    month: parseInt(iso.slice(5, 7), 10),
    days,
  };
}

function num(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(String(v).replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  // Broken-formula artifacts (#REF!, #VALUE!, #N/A, #DIV/0! ...) count as empty.
  return s.startsWith("#") ? "" : s;
}

/** Parse one raw sheet row into a DayRecord. Returns null for non-date rows. */
export function parseRow(row: unknown[], rowIndex: number, tab = ""): DayRecord | null {
  const dateDisplay = str(row[COL.DATE]);
  const iso = ddmmyyyyToIso(dateDisplay);
  if (!iso) return null;

  const totalHours = str(row[COL.TOTAL_HOURS]);
  const entry = str(row[COL.ENTRY]);
  const exit = str(row[COL.EXIT]);

  // Total hours: prefer the sheet's decimal column, then the HH:mm total,
  // and finally derive from the raw entry/exit times. The last fallback keeps
  // the dashboard correct even when copied sheets lose their formulas
  // (#REF!/#VALUE! parse to 0 while the raw times survive).
  let totalDec = num(row[COL.TOTAL_HOURS_DEC]) || hhmmToDecimal(totalHours);
  if (!totalDec && entry && exit) {
    const derived = hhmmToDecimal(exit) - hhmmToDecimal(entry);
    if (derived > 0) totalDec = Math.round(derived * 100) / 100;
  }

  // Daily standard / day name: fall back to calendar-derived values when the
  // sheet cells are empty or their formulas broke (Sun-Wed 9h, Thu 8.5h).
  const dow = new Date(`${iso}T00:00:00`).getDay();
  let dailyStandard = num(row[COL.DAILY_STANDARD_DEC]) || num(row[COL.DAILY_STANDARD_RAW]);
  const classification = str(row[COL.CLASSIFICATION]);
  // Standards-definition rows reuse first-of-month dates — not day reports.
  if (classification === STANDARD_ROW_CLASSIFICATION) return null;
  const nonWorking = ['סופ"ש', "סופשבוע", "חג", "שבת"].includes(classification);
  if (!dailyStandard && !nonWorking && dow !== 5 && dow !== 6) {
    dailyStandard = dow === 4 ? 8.5 : 9;
  }
  const dayName = str(row[COL.DAY_NAME]) || HEBREW_DAYS[dow];

  return {
    rowIndex,
    tab,
    date: iso,
    dateDisplay,
    entry,
    exit,
    totalHours,
    totalHoursDecimal: totalDec,
    dailyStandard,
    overtimeDecimal:
      num(row[COL.OVERTIME_DEC]) ||
      Math.max(Math.round((totalDec - dailyStandard) * 100) / 100, 0),
    vacationDays: num(row[COL.VACATION_DAYS]),
    reserveDays: num(row[COL.RESERVE_DAYS]),
    sickDays: num(row[COL.SICK_DAYS]),
    classification,
    notes: str(row[COL.NOTES]),
    uniqueNotes: str(row[COL.UNIQUE_NOTES]),
    orderType: str(row[COL.ORDER_TYPE]),
    dayName,
    vacationBalance: num(row[COL.VACATION_BALANCE]),
    monthlyStandardHours: num(row[COL.MONTHLY_STANDARD]),
  };
}