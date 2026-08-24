"use client";

export interface HolidaySetting {
  date: string; // YYYY-MM-DD
  name: string; // e.g. "פסח א"
  category: string; // e.g. "חג", "ערב חג", "חול המועד"
}

export const DEFAULT_CLASSIFICATIONS = [
  "עבודה",
  "חופש",
  "מחלה",
  "מילואים",
  "חג",
  "ערב חג",
  "סופ\"ש",
  "עבודה במילואים",
];

export const DEFAULT_ORDER_TYPES = [
  "מילואים רגילים",
  "צו 8",
];

export const DEFAULT_HOLIDAYS: HolidaySetting[] = [
  { date: "2026-04-02", name: "ערב פסח", category: "ערב חג" },
  { date: "2026-04-03", name: "פסח א'", category: "חג" },
  { date: "2026-04-09", name: "שביעי של פסח", category: "חג" },
  { date: "2026-05-21", name: "ערב שבועות", category: "ערב חג" },
  { date: "2026-05-22", name: "שבועות", category: "חג" },
  { date: "2026-09-11", name: "ערב ראש השנה", category: "ערב חג" },
  { date: "2026-09-12", name: "ראש השנה א'", category: "חג" },
  { date: "2026-09-13", name: "ראש השנה ב'", category: "חג" },
  { date: "2026-09-20", name: "ערב יום כיפור", category: "ערב חג" },
  { date: "2026-09-21", name: "יום כיפור", category: "חג" },
  { date: "2026-09-25", name: "ערב סוכות", category: "ערב חג" },
  { date: "2026-09-26", name: "סוכות א'", category: "חג" },
  { date: "2026-10-02", name: "שמיני עצרת / שמחת תורה", category: "חג" },
];

export function getClassifications(): string[] {
  if (typeof window === "undefined") return DEFAULT_CLASSIFICATIONS;
  try {
    const val = localStorage.getItem("work-hours-classifications");
    return val ? JSON.parse(val) : DEFAULT_CLASSIFICATIONS;
  } catch {
    return DEFAULT_CLASSIFICATIONS;
  }
}

export function saveClassifications(list: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("work-hours-classifications", JSON.stringify(list));
}

export function getOrderTypes(): string[] {
  if (typeof window === "undefined") return DEFAULT_ORDER_TYPES;
  try {
    const val = localStorage.getItem("work-hours-ordertypes");
    return val ? JSON.parse(val) : DEFAULT_ORDER_TYPES;
  } catch {
    return DEFAULT_ORDER_TYPES;
  }
}

export function saveOrderTypes(list: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("work-hours-ordertypes", JSON.stringify(list));
}

export function getHolidays(): HolidaySetting[] {
  if (typeof window === "undefined") return DEFAULT_HOLIDAYS;
  try {
    const val = localStorage.getItem("work-hours-holidays");
    return val ? JSON.parse(val) : DEFAULT_HOLIDAYS;
  } catch {
    return DEFAULT_HOLIDAYS;
  }
}

export function saveHolidays(list: HolidaySetting[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("work-hours-holidays", JSON.stringify(list));
}

export const DEFAULT_HOLIDAY_NAMES = [
  "ערב פסח",
  "פסח א'",
  "שביעי של פסח",
  "ערב שבועות",
  "שבועות",
  "ערב ראש השנה",
  "ראש השנה א'",
  "ראש השנה ב'",
  "ערב יום כיפור",
  "יום כיפור",
  "ערב סוכות",
  "סוכות א'",
  "שמיני עצרת / שמחת תורה",
  "יום העצמאות",
  "יום הזיכרון",
  "פורים",
  "חנוכה",
];

export function getHolidayNames(): string[] {
  if (typeof window === "undefined") return DEFAULT_HOLIDAY_NAMES;
  try {
    const val = localStorage.getItem("work-hours-holidaynames");
    return val ? JSON.parse(val) : DEFAULT_HOLIDAY_NAMES;
  } catch {
    return DEFAULT_HOLIDAY_NAMES;
  }
}

export function saveHolidayNames(list: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("work-hours-holidaynames", JSON.stringify(list));
}

export const DEFAULT_NON_WORKING_DAYS = [5, 6]; // Friday & Saturday

export function getNonWorkingDays(): number[] {
  if (typeof window === "undefined") return DEFAULT_NON_WORKING_DAYS;
  try {
    const val = localStorage.getItem("work-hours-non-working-days");
    return val ? JSON.parse(val) : DEFAULT_NON_WORKING_DAYS;
  } catch {
    return DEFAULT_NON_WORKING_DAYS;
  }
}

export function saveNonWorkingDays(days: number[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("work-hours-non-working-days", JSON.stringify(days));
}

