import { HEBREW_DAYS } from "./types";
import type { DayRecord, EmploymentTerm, ReportShift } from "./types";
import { getDayOfWeekFromIso } from "./date";
import { DEFAULT_HOLIDAYS_LIST } from "./holidays";

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

export function isNonWorkingClassification(classification: string): boolean {
  if (!classification) return false;
  const c = classification.replace(/""/g, '"').replace(/^["']|["']$/g, "").trim();
  return [
    "חופש",
    "חופשה",
    "חג",
    "שבת",
    'סופ"ש',
    "סופש",
    "סופשבוע",
  ].includes(c) || c.includes("סופ");
}

/**
 * Sanitize and normalize a raw database report row so that:
 * 1. Weekdays (Sun-Thu) NEVER carry a weekend ('סופ"ש' / 'סופש') classification,
 *    and empty template rows on workdays without hours/absences get "" (or holiday category).
 * 2. Weekends (Fri-Sat) without reported hours or absences ALWAYS get 'סופ"ש' (or holiday category),
 *    never a leftover 'עבודה' from shifted/template imports.
 */
export function sanitizeRawReport<
  T extends {
    date: string;
    entry?: string | null;
    exit?: string | null;
    shifts?: ReportShift[] | any;
    vacation_days?: number | string | null;
    sick_days?: number | string | null;
    reserve_days?: number | string | null;
    classification?: string | null;
    notes?: string | null;
    unique_notes?: string | null;
    order_type?: string | null;
  }
>(raw: T): T {
  const cleanDate = (raw.date || "").slice(0, 10);
  if (!cleanDate || cleanDate.length < 10) return raw;

  const dow = getDayOfWeekFromIso(cleanDate); // 0 = Sunday ... 4 = Thursday, 5 = Friday, 6 = Saturday
  const isWeekend = dow === 5 || dow === 6;
  const holiday = DEFAULT_HOLIDAYS_LIST.find((h) => h.date === cleanDate);

  const hasEntry = Boolean(raw.entry && String(raw.entry).trim() !== "");
  const hasExit = Boolean(raw.exit && String(raw.exit).trim() !== "");
  let hasShifts = false;
  if (raw.shifts) {
    let parsed = raw.shifts;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        parsed = [];
      }
    }
    if (Array.isArray(parsed)) {
      hasShifts = parsed.some(
        (s: any) =>
          s &&
          ((s.entry && String(s.entry).trim() !== "") ||
            (s.exit && String(s.exit).trim() !== ""))
      );
    }
  }
  const hasHours = hasEntry || hasExit || hasShifts;

  const hasAbsenceDays = Boolean(
    Number(raw.vacation_days || 0) > 0 ||
      Number(raw.sick_days || 0) > 0 ||
      Number(raw.reserve_days || 0) > 0
  );

  const rawClass = (raw.classification || "")
    .replace(/""/g, '"')
    .replace(/^["']|["']$/g, "")
    .trim();

  const isWeekendClass =
    rawClass === 'סופ"ש' ||
    rawClass === "סופש" ||
    rawClass === "שבת" ||
    rawClass === "סופשבוע" ||
    rawClass.includes("סופ");

  const isExplicitAbsenceClass = [
    "חופש",
    "חופשה",
    "מחלה",
    "מילואים",
    "עבודה במילואים",
    "חג",
    "ערב חג",
    "חול המועד",
  ].includes(rawClass);

  if (isWeekend) {
    // Friday / Saturday
    if (hasHours) {
      const nextClass = !rawClass || isWeekendClass ? "עבודה" : rawClass;
      return { ...raw, classification: nextClass };
    }
    if (hasAbsenceDays || isExplicitAbsenceClass) {
      return { ...raw, classification: rawClass };
    }
    if (holiday) {
      return {
        ...raw,
        classification: holiday.category,
        notes: raw.notes || holiday.name,
      };
    }
    return { ...raw, classification: 'סופ"ש' };
  } else {
    // Sunday - Thursday (Workdays: NEVER weekend!)
    if (hasHours) {
      const nextClass = !rawClass || isWeekendClass ? "עבודה" : rawClass;
      return { ...raw, classification: nextClass };
    }
    if (hasAbsenceDays || isExplicitAbsenceClass) {
      return { ...raw, classification: rawClass };
    }
    if (holiday) {
      return {
        ...raw,
        classification: holiday.category,
        notes: raw.notes || holiday.name,
      };
    }
    // Unreported workday (no hours, no absence, no holiday): leave classification empty
    return { ...raw, classification: "" };
  }
}

/** Derive standard work hours based on Hebrew day of week, classification, and active employment term */
export function calculateDailyStandard(
  dateIso: string,
  classification: string,
  term?: EmploymentTerm
): number {
  const dow = getDayOfWeekFromIso(dateIso); // 0 = Sunday, 4 = Thursday, 5 = Friday, 6 = Saturday
  if (dow === 5 || dow === 6) return 0; // Friday / Saturday

  // On weekdays (Sun-Thu), only actual vacation/holiday classifications zero out the daily standard
  if (classification) {
    const c = classification.replace(/""/g, '"').replace(/^["']|["']$/g, "").trim();
    if (["חופש", "חופשה", "חג"].includes(c)) {
      return 0;
    }
  }

  // If term is hourly with 0 standard hours, daily standard is 0
  if (term?.employmentType === "hourly" && term.dailyStandardSunWed === 0) {
    return 0;
  }

  const baseSunWed = term?.dailyStandardSunWed ?? 9.0;
  const baseThu = term?.dailyStandardThu ?? 8.5;
  const scopeRatio = (term?.jobScopePct ?? 100) / 100;

  const rawStandard = dow === 4 ? baseThu : baseSunWed;
  return Math.round(rawStandard * scopeRatio * 100) / 100;
}

export interface RawReport {
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
  shifts?: ReportShift[] | any;
}

/** Derive a full DayRecord from a database report row */
export function deriveDayRecord(
  rawInput: RawReport,
  annualVacationQuota: number,
  ytdVacationUsedUpToDate: number,
  monthIndex: number, // 1-12
  term?: EmploymentTerm
): DayRecord {
  const raw = sanitizeRawReport(rawInput);
  const cleanDate = (raw.date || "").slice(0, 10);
  let rawShifts = raw.shifts;
  if (typeof rawShifts === "string") {
    try {
      rawShifts = JSON.parse(rawShifts);
    } catch {
      rawShifts = [];
    }
  }
  const shiftsArray = Array.isArray(rawShifts) ? rawShifts : [];
  const shifts: ReportShift[] = shiftsArray
    .filter((s: any) => s && (s.entry || s.exit))
    .map((s: any) => ({
      entry: s.entry ? String(s.entry).trim() : "",
      exit: s.exit ? String(s.exit).trim() : "",
      description: s.description ? String(s.description).trim() : undefined,
    }));

  let entry = raw.entry ?? "";
  let exit = raw.exit ?? "";
  let totalHoursDecimal = 0;

  if (shifts.length > 0) {
    for (const s of shifts) {
      if (s.entry && s.exit) {
        const sEntryDec = hhmmToDecimal(s.entry);
        const sExitDec = hhmmToDecimal(s.exit);
        const diff = Math.max(0, Math.round((sExitDec - sEntryDec) * 100) / 100);
        totalHoursDecimal += diff;
      }
    }
    totalHoursDecimal = Math.round(totalHoursDecimal * 100) / 100;
    if (!entry && shifts[0]?.entry) entry = shifts[0].entry;
    if (!exit && shifts[shifts.length - 1]?.exit) exit = shifts[shifts.length - 1].exit;
  } else {
    const entryDec = hhmmToDecimal(entry);
    const exitDec = hhmmToDecimal(exit);
    totalHoursDecimal = (entry && exit) ? Math.max(0, Math.round((exitDec - entryDec) * 100) / 100) : 0;
  }
  const totalHours = totalHoursDecimal > 0 ? decimalToHhmm(totalHoursDecimal) : "";
  
  const dailyStandard = calculateDailyStandard(cleanDate, raw.classification, term);
  
  // Overtime eligibility: if false (e.g. global contract with no daily overtime), overtime is 0
  const isOvertimeEligible = term ? term.overtimeEligible : true;
  const rawOvertime = Math.max(0, Math.round((totalHoursDecimal - dailyStandard) * 100) / 100);
  const overtimeDecimal = isOvertimeEligible ? rawOvertime : 0;

  // Regular hours (up to daily standard)
  const regularHoursDecimal = Math.min(totalHoursDecimal, dailyStandard);

  // Statutory Israeli Overtime breakdown:
  // First 2 overtime hours = 125%, beyond 2 hours = 150%
  const overtime125Decimal = isOvertimeEligible ? Math.min(overtimeDecimal, 2.0) : 0;
  const overtime150Decimal = isOvertimeEligible ? Math.max(0, Math.round((overtimeDecimal - 2.0) * 100) / 100) : 0;

  const dow = getDayOfWeekFromIso(cleanDate);
  const dayName = HEBREW_DAYS[dow];
  
  // Vacation balance is the annual quota minus vacation used YTD (including today)
  const accruedQuota = annualVacationQuota;
  const vacationBalance = Math.round((accruedQuota - ytdVacationUsedUpToDate) * 10) / 10;
  
  return {
    rowIndex: 0, // Not applicable in database mode
    tab: "database",
    date: cleanDate,
    dateDisplay: isoToDdmmyyyy(cleanDate),
    entry,
    exit,
    shifts: shifts.length > 0 ? shifts : undefined,
    totalHours,
    totalHoursDecimal,
    dailyStandard,
    overtimeDecimal,
    regularHoursDecimal,
    overtime125Decimal,
    overtime150Decimal,
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
