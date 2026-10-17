export interface HolidaySetting {
  date: string; // YYYY-MM-DD
  name: string; // e.g. "פסח א"
  category: string; // e.g. "חג", "ערב חג", "חול המועד"
}

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

export const DEFAULT_HOLIDAYS_LIST = DEFAULT_HOLIDAYS;
export const DEFAULT_HOLIDAY_DATES = DEFAULT_HOLIDAYS.map((h) => h.date);
