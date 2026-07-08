import { HEBREW_DAYS } from "./types";
import type { DayRecord, ReportInput, StandardSettings } from "./types";
import { daysInMonth, decimalToHhmm, hhmmToDecimal, isoToDdmmyyyy, round1 } from "./date";

/**
 * In-memory mock data source. Active whenever Google credentials are absent,
 * so the UI is fully usable out of the box. Mirrors the sheet semantics:
 * a pre-generated row per calendar date, raw writes, derived recalculation.
 */

const MOCK_YEARS = [2025, 2026, 2027];
const VACATION_BALANCE_START = 42.0;

interface MockStore {
  records: Map<string, DayRecord>; // key = ISO date
  settings: StandardSettings;
}

declare global {
  // eslint-disable-next-line no-var
  var __mockStore: MockStore | undefined;
}

function defaultStandardDays(year: number, month: number): number {
  let count = 0;
  for (let d = 1; d <= daysInMonth(year, month); d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 5 && dow !== 6) count++; // work week = Sun-Thu
  }
  return count;
}

function buildStore(): MockStore {
  const records = new Map<string, DayRecord>();
  const years: Record<string, number[]> = {};

  let rowIndex = 2;
  for (const year of MOCK_YEARS) {
    years[String(year)] = Array.from({ length: 12 }, (_, m) =>
      defaultStandardDays(year, m + 1)
    );
    for (let month = 1; month <= 12; month++) {
      for (let d = 1; d <= daysInMonth(year, month); d++) {
        const date = new Date(year, month - 1, d);
        const dow = date.getDay();
        const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const weekend = dow === 5 || dow === 6;
        const dailyStandard = weekend ? 0 : dow === 4 ? 8.5 : 9;
        records.set(iso, {
          rowIndex: rowIndex++,
          tab: "",
          date: iso,
          dateDisplay: isoToDdmmyyyy(iso),
          entry: "",
          exit: "",
          totalHours: "0:00",
          totalHoursDecimal: 0,
          dailyStandard,
          overtimeDecimal: 0,
          vacationDays: 0,
          reserveDays: 0,
          sickDays: 0,
          classification: weekend ? 'סופ"ש' : "עבודה",
          notes: "",
          uniqueNotes: "",
          orderType: "",
          dayName: HEBREW_DAYS[dow],
          vacationBalance: VACATION_BALANCE_START,
          monthlyStandardHours: 192,
        });
      }
    }
  }

  const store: MockStore = {
    records,
    settings: { annualVacationQuota: 21, years },
  };

  // Demo reports matching the reference screenshots (July 2026).
  seed(store, "2026-07-01", "07:30", "16:30");
  seed(store, "2026-07-05", "06:57", "17:07");
  seed(store, "2026-07-06", "07:30", "16:30");

  // Reserve-duty demo data for the drill-down chart.
  for (const iso of ["2025-11-02", "2025-11-03", "2025-11-04", "2025-11-05"]) {
    seedReserve(store, iso, 'צו 8');
  }
  for (const iso of ["2026-03-08", "2026-03-09"]) {
    seedReserve(store, iso, "");
  }

  return store;
}

function seedReserve(store: MockStore, iso: string, orderType: string): void {
  const rec = store.records.get(iso);
  if (!rec) return;
  rec.reserveDays = 1;
  rec.classification = "מילואים";
  rec.orderType = orderType;
}

function seed(store: MockStore, iso: string, entry: string, exit: string): void {
  const rec = store.records.get(iso);
  if (!rec) return;
  applyRawInput(rec, { date: iso, entry, exit, classification: "עבודה" });
}

/** Recompute derived fields the way the sheet formulas would. */
function applyRawInput(rec: DayRecord, input: ReportInput): void {
  rec.entry = input.entry ?? "";
  rec.exit = input.exit ?? "";
  rec.classification = input.classification || rec.classification;
  rec.vacationDays = input.vacationDays || 0;
  rec.reserveDays = input.reserveDays || 0;
  rec.sickDays = input.sickDays || 0;
  if (input.notes !== undefined) rec.notes = input.notes;

  const total =
    rec.entry && rec.exit
      ? Math.max(hhmmToDecimal(rec.exit) - hhmmToDecimal(rec.entry), 0)
      : 0;
  rec.totalHoursDecimal = round1(total);
  rec.totalHours = decimalToHhmm(total);
  rec.overtimeDecimal = round1(Math.max(total - rec.dailyStandard, 0));
}

function getStore(): MockStore {
  if (!globalThis.__mockStore) globalThis.__mockStore = buildStore();
  return globalThis.__mockStore;
}

/* ------------------------------------------------------------- public API */

export function mockReadMonth(year: number, month: number): DayRecord[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const out: DayRecord[] = [];
  getStore().records.forEach((r) => {
    if (r.date.startsWith(prefix)) out.push(r);
  });
  out.sort((a, b) => a.date.localeCompare(b.date));

  // Recompute a running vacation balance so the KPI reacts to absences.
  let used = 0;
  getStore().records.forEach((r) => {
    if (r.date <= `${prefix}-31`) used += r.vacationDays;
  });
  const balance = round1(VACATION_BALANCE_START - used);
  return out.map((r) => ({ ...r, vacationBalance: balance }));
}

export function mockWriteReport(input: ReportInput): DayRecord {
  const rec = getStore().records.get(input.date);
  if (!rec) {
    throw new Error(`לא נמצאה שורה לתאריך ${isoToDdmmyyyy(input.date)}`);
  }
  applyRawInput(rec, input);
  return { ...rec };
}

export function mockAllRecords(): DayRecord[] {
  const out = Array.from(getStore().records.values());
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

export function mockReadSettings(): StandardSettings {
  return JSON.parse(JSON.stringify(getStore().settings));
}

export function mockWriteSettings(s: StandardSettings): void {
  getStore().settings = JSON.parse(JSON.stringify(s));
}

export function mockWriteReportsBatch(
  dates: string[],
  updates: Partial<ReportInput>,
  fieldsToUpdate: string[]
): void {
  const store = getStore();
  const fieldsSet = new Set(fieldsToUpdate);

  for (const date of dates) {
    const rec = store.records.get(date);
    if (!rec) continue;

    // Apply updates only for selected fields
    if (fieldsSet.has("classification")) {
      rec.classification = updates.classification ?? rec.classification;
      const isAbsence = rec.classification !== "עבודה" && rec.classification !== "עבודה במילואים";
      if (isAbsence) {
        rec.entry = "";
        rec.exit = "";
      }
    }
    if (fieldsSet.has("entry")) {
      rec.entry = updates.entry ?? "";
    }
    if (fieldsSet.has("exit")) {
      rec.exit = updates.exit ?? "";
    }
    if (fieldsSet.has("vacationDays")) {
      rec.vacationDays = updates.vacationDays ?? 0;
    }
    if (fieldsSet.has("sickDays")) {
      rec.sickDays = updates.sickDays ?? 0;
    }
    if (fieldsSet.has("reserveDays")) {
      rec.reserveDays = updates.reserveDays ?? 0;
    }
    if (fieldsSet.has("notes")) {
      rec.notes = updates.notes ?? "";
    }
    if (fieldsSet.has("uniqueNotes")) {
      rec.uniqueNotes = updates.uniqueNotes ?? "";
    }
    if (fieldsSet.has("orderType")) {
      rec.orderType = updates.orderType ?? "";
    }

    // Auto update orderType based on classification/reserveDays rules
    const hasReserve = rec.classification === "מילואים" || rec.classification === "עבודה במילואים" || rec.reserveDays > 0;
    if (!hasReserve) {
      rec.orderType = "";
    } else if (hasReserve && fieldsSet.has("classification") && !rec.orderType) {
      rec.orderType = "מילואים רגילים";
    }

    // Recompute total hours
    const total =
      rec.entry && rec.exit
        ? Math.max(hhmmToDecimal(rec.exit) - hhmmToDecimal(rec.entry), 0)
        : 0;
    rec.totalHoursDecimal = round1(total);
    rec.totalHours = decimalToHhmm(total);
    rec.overtimeDecimal = round1(Math.max(total - rec.dailyStandard, 0));
  }
}