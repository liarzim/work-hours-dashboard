import "server-only";
import type {
  DayRecord,
  MonthData,
  ReportInput,
  ReserveBucket,
  ReserveSummary,
  StandardSettings,
} from "./types";
import { computeMonthSummary } from "./calc";
import * as mock from "./mock";
import { currentMode } from "./config";
import { createSupabaseServerClient } from "./supabase/server";
import { deriveDayRecord } from "./derive";
import { daysInMonth } from "./date";

/**
 * Retrieve the authenticated user from Supabase.
 * Throws an error if not logged in.
 */
async function getAuthenticatedUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("משתמש לא מחובר");
  }
  return user;
}

export { currentMode };

export async function getMonthData(
  year: number,
  month: number,
  force = false
): Promise<MonthData> {
  const mode = currentMode();
  if (mode === "mock") {
    const records = mock.mockReadMonth(year, month);
    const settings = mock.mockReadSettings();
    const standardDays =
      settings.years[String(year)]?.[month - 1] || fallbackStandardDays(records);
    const summary = computeMonthSummary(year, month, records, standardDays);
    const all = mock.mockAllRecords();
    const info = {
      tabs: ["mock"],
      totalRecords: all.length,
      firstDate: all[0]?.date ?? "",
      lastDate: all[all.length - 1]?.date ?? "",
    };
    return { records, summary, mode: "mock", info };
  }

  // Live Supabase Mode - Fetch user once
  const user = await getAuthenticatedUser();
  const userId = user.id;
  const supabase = createSupabaseServerClient();

  const lastDay = daysInMonth(year, month);
  const startDateYtd = `${year}-01-01`;
  const endDateMonth = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const endDateYear = `${year}-12-31`;

  // 1. Prepare parallel query promises
  const profilePromise = supabase
    .from("profiles")
    .select("annual_vacation_quota")
    .eq("id", userId)
    .single();

  const standardsPromise = supabase
    .from("workday_standards")
    .select("*")
    .eq("user_id", userId);

  const reportsPromise = supabase
    .from("reports")
    .select("*")
    .eq("user_id", userId)
    .gte("date", startDateYtd)
    .lte("date", endDateYear)
    .order("date", { ascending: true });

  const priorVacationsPromise = supabase
    .from("reports")
    .select("vacation_days, date")
    .eq("user_id", userId)
    .lt("date", startDateYtd)
    .gt("vacation_days", 0);

  const countPromise = supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const firstReportPromise = supabase
    .from("reports")
    .select("date")
    .eq("user_id", userId)
    .order("date", { ascending: true })
    .limit(1);

  const lastReportPromise = supabase
    .from("reports")
    .select("date")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1);

  // 2. Fetch all data concurrently in parallel
  const [
    profileRes,
    standardsRes,
    reportsRes,
    countRes,
    firstReportRes,
    lastReportRes,
    priorVacationsRes
  ] = await Promise.all([
    profilePromise,
    standardsPromise,
    reportsPromise,
    countPromise,
    firstReportPromise,
    lastReportPromise,
    priorVacationsPromise
  ]);

  if (reportsRes.error) throw new Error("שגיאה בטעינת הדיווחים מהמסד");

  const annualVacationQuota = profileRes.data?.annual_vacation_quota ?? 22.0;

  // Calculate firstYear and firstMonth from database
  const firstReportDate = firstReportRes.data?.[0]?.date ?? "";
  const firstYear = firstReportDate ? parseInt(firstReportDate.slice(0, 4), 10) : year;
  const firstMonth = firstReportDate ? parseInt(firstReportDate.slice(5, 7), 10) : 1;

  // Calculate vacation days used in all years strictly prior to current year
  let usedBeforeSelectedYear = 0;
  const priorVacations = priorVacationsRes.data || [];
  if (firstReportDate && firstYear < year) {
    for (const r of priorVacations) {
      usedBeforeSelectedYear += Number(r.vacation_days || 0);
    }
  }

  // Monthly accrual rate (e.g. 1.75 days per month)
  const monthlyAccrualRate = annualVacationQuota / 12;

  // Total months elapsed since starting of data to the currently viewed month inclusive
  const elapsedMonths = (year - firstYear) * 12 + (month - firstMonth) + 1;
  const totalAccumulatedQuotaForThisMonth = elapsedMonths * monthlyAccrualRate;

  // Process standards to find standardDays
  const years: Record<string, number[]> = {};
  if (standardsRes.data && standardsRes.data.length > 0) {
    for (const s of standardsRes.data) {
      years[String(s.year)] = [
        s.m1, s.m2, s.m3, s.m4, s.m5, s.m6,
        s.m7, s.m8, s.m9, s.m10, s.m11, s.m12
      ];
    }
  }
  const standardDays = years[String(year)]?.[month - 1] || defaultStandardDays(year, month);

  // 3. Build YTD vacation days mapping
  const vacationDaysMap = new Map<string, number>();
  const reportsMap = new Map<string, any>();
  const dbReports = reportsRes.data;
  if (dbReports) {
    for (const r of dbReports) {
      vacationDaysMap.set(r.date, Number(r.vacation_days || 0));
      // Only keep records of the specific month in reportsMap
      if (r.date.startsWith(`${year}-${String(month).padStart(2, "0")}`)) {
        reportsMap.set(r.date, r);
      }
    }
  }

  // Calculate YTD running sum for every single day in the month
  let runningSum = 0;
  const ytdUsedMap = new Map<string, number>();
  
  const formatLocalIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const currentDay = new Date(year, 0, 1);
  const endDayStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  
  while (true) {
    const iso = formatLocalIso(currentDay);
    runningSum += vacationDaysMap.get(iso) ?? 0;
    ytdUsedMap.set(iso, runningSum);
    if (iso === endDayStr) break;
    currentDay.setDate(currentDay.getDate() + 1);
  }

  // Calculate total vacation used for the entire year (including future months)
  let totalVacationUsedAllYear = runningSum;
  const endDayYearStr = `${year}-12-31`;
  while (true) {
    const iso = formatLocalIso(currentDay);
    if (iso === endDayYearStr) break;
    currentDay.setDate(currentDay.getDate() + 1);
    const nextIso = formatLocalIso(currentDay);
    totalVacationUsedAllYear += vacationDaysMap.get(nextIso) ?? 0;
  }

  // 4. Generate fully populated list of DayRecord for the selected month
  const records: DayRecord[] = [];
  for (let d = 1; d <= lastDay; d++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dbRow = reportsMap.get(iso);
    const ytdUsed = ytdUsedMap.get(iso) ?? 0;

    // Total used since starting of data up to this day
    const totalUsedSinceStart = usedBeforeSelectedYear + ytdUsed;

    if (dbRow) {
      records.push(deriveDayRecord(dbRow, totalAccumulatedQuotaForThisMonth, totalUsedSinceStart, month));
    } else {
      const defaultRaw = {
        date: iso,
        entry: null,
        exit: null,
        vacation_days: 0,
        sick_days: 0,
        reserve_days: 0,
        classification: "",
        notes: null,
        unique_notes: null,
        order_type: null,
      };
      records.push(deriveDayRecord(defaultRaw, totalAccumulatedQuotaForThisMonth, totalUsedSinceStart, month));
    }
  }

  const summary = computeMonthSummary(year, month, records, standardDays);

  // Year-end estimate calculation
  const elapsedMonthsYearEnd = (year - firstYear) * 12 + (12 - firstMonth) + 1;
  const totalAccumulatedQuotaYearEnd = elapsedMonthsYearEnd * monthlyAccrualRate;
  const totalUsedYearEnd = usedBeforeSelectedYear + totalVacationUsedAllYear;
  summary.estimatedVacationBalanceYearEnd = Math.round((totalAccumulatedQuotaYearEnd - totalUsedYearEnd) * 10) / 10;

  const count = countRes.count ?? countRes.data?.length ?? 0;
  const firstDate = firstReportRes.data?.[0]?.date ?? "";
  const lastDate = lastReportRes.data?.[0]?.date ?? "";

  const info = {
    tabs: ["database"],
    totalRecords: count,
    firstDate,
    lastDate,
  };

  return { records, summary, mode: "live", info };
}

function fallbackStandardDays(records: DayRecord[]): number {
  return records.filter((r) => r.dailyStandard > 0).length;
}

function defaultStandardDays(year: number, month: number): number {
  let count = 0;
  const days = daysInMonth(year, month);
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 5 && dow !== 6) count++;
  }
  return count;
}

export async function getReserveSummary(force = false): Promise<ReserveSummary> {
  const mode = currentMode();
  let all: { date: string; reserve_days: number; notes: string | null; order_type: string | null }[] = [];

  if (mode === "mock") {
    all = mock.mockAllRecords()
      .filter((r) => r.reserveDays > 0)
      .map((r) => ({
        date: r.date,
        reserve_days: r.reserveDays,
        notes: r.notes || null,
        order_type: r.orderType || null,
      }));
  } else {
    const user = await getAuthenticatedUser();
    const userId = user.id;
    const supabase = createSupabaseServerClient();

    const { data: dbData, error } = await supabase
      .from("reports")
      .select("date, reserve_days, notes, order_type")
      .eq("user_id", userId)
      .gt("reserve_days", 0)
      .order("date", { ascending: true });

    if (error) throw new Error("שגיאה באחזור נתוני מילואים");
    all = dbData || [];
  }

  const perYear = new Map<number, ReserveBucket>();
  const perMonth = new Map<number, Map<number, ReserveBucket>>();

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const isTzav8 = (notes: string) => /צו\s*8/.test(notes ?? "");

  for (const r of all || []) {
    const year = parseInt(r.date.slice(0, 4), 10);
    const month = parseInt(r.date.slice(5, 7), 10);
    const tzav8 = isTzav8(r.notes || "") || r.order_type === "צו 8";
    const days = Number(r.reserve_days || 0);

    let y = perYear.get(year);
    if (!y) perYear.set(year, (y = { key: year, tzav8: 0, regular: 0 }));
    if (tzav8) y.tzav8 = round2(y.tzav8 + days);
    else y.regular = round2(y.regular + days);

    let ms = perMonth.get(year);
    if (!ms) perMonth.set(year, (ms = new Map()));
    let m = ms.get(month);
    if (!m) ms.set(month, (m = { key: month, tzav8: 0, regular: 0 }));
    if (tzav8) m.tzav8 = round2(m.tzav8 + days);
    else m.regular = round2(m.regular + days);
  }

  const years = Array.from(perYear.values()).sort((a, b) => a.key - b.key);
  const months: Record<string, ReserveBucket[]> = {};
  perMonth.forEach((ms, year) => {
    months[String(year)] = Array.from(ms.values()).sort((a, b) => a.key - b.key);
  });

  return { years, months };
}

export async function saveReport(input: ReportInput): Promise<DayRecord | null> {
  const mode = currentMode();
  if (mode === "mock") return mock.mockWriteReport(input);

  const user = await getAuthenticatedUser();
  const userId = user.id;
  const supabase = createSupabaseServerClient();

  const isAbsence = input.classification !== "עבודה" && input.classification !== "עבודה במילואים";
  const notesText = input.notes || "";
  const hasReserve = input.classification === "מילואים" || input.classification === "עבודה במילואים" || (input.reserveDays ?? 0) > 0;
  const orderType = hasReserve
    ? (input.orderType || (/צו\s*8/.test(notesText) ? "צו 8" : "מילואים רגילים"))
    : null;

  const { data, error } = await supabase
    .from("reports")
    .upsert(
      {
        user_id: userId,
        date: input.date,
        entry: isAbsence ? null : (input.entry || null),
        exit: isAbsence ? null : (input.exit || null),
        vacation_days: input.vacationDays ?? 0,
        sick_days: input.sickDays ?? 0,
        reserve_days: input.reserveDays ?? 0,
        classification: input.classification,
        notes: input.notes || null,
        unique_notes: input.uniqueNotes || null,
        order_type: orderType,
      },
      { onConflict: "user_id, date" }
    )
    .select()
    .single();

  if (error) throw new Error(error.message || "שגיאה בעדכון הנתונים במסד");

  // Re-fetch to return fully derived record
  const [y, m, d] = input.date.split("-").map(Number);
  const monthData = await getMonthData(y, m);
  return monthData.records.find((r) => r.date === input.date) || null;
}

export async function saveReportsBatch(
  dates: string[],
  updates: Partial<ReportInput>,
  fieldsToUpdate: string[]
): Promise<void> {
  const mode = currentMode();
  if (mode === "mock") {
    mock.mockWriteReportsBatch(dates, updates, fieldsToUpdate);
    return;
  }

  const user = await getAuthenticatedUser();
  const userId = user.id;
  const supabase = createSupabaseServerClient();

  // Load existing records from db
  const { data: dbReports, error: fetchError } = await supabase
    .from("reports")
    .select("*")
    .eq("user_id", userId)
    .in("date", dates);

  if (fetchError) throw new Error("שגיאה באחזור רשומות מהמסד");

  const reportsMap = new Map<string, any>();
  if (dbReports) {
    for (const r of dbReports) {
      reportsMap.set(r.date, r);
    }
  }

  const fieldsSet = new Set(fieldsToUpdate);
  const rows = dates.map((date) => {
    const existing = reportsMap.get(date) || {
      user_id: userId,
      date,
      entry: null,
      exit: null,
      vacation_days: 0,
      sick_days: 0,
      reserve_days: 0,
      classification: "",
      notes: null,
      unique_notes: null,
      order_type: null,
    };

    const row = { ...existing };

    if (fieldsSet.has("classification")) {
      row.classification = updates.classification ?? row.classification;
      const isAbsence = row.classification !== "עבודה" && row.classification !== "עבודה במילואים";
      if (isAbsence) {
        row.entry = null;
        row.exit = null;
      }
    }
    if (fieldsSet.has("entry")) {
      row.entry = updates.entry ?? null;
    }
    if (fieldsSet.has("exit")) {
      row.exit = updates.exit ?? null;
    }
    if (fieldsSet.has("vacationDays")) {
      row.vacation_days = updates.vacationDays ?? 0;
    }
    if (fieldsSet.has("sickDays")) {
      row.sick_days = updates.sickDays ?? 0;
    }
    if (fieldsSet.has("reserveDays")) {
      row.reserve_days = updates.reserveDays ?? 0;
    }
    if (fieldsSet.has("notes")) {
      row.notes = updates.notes || null;
    }
    if (fieldsSet.has("uniqueNotes")) {
      row.unique_notes = updates.uniqueNotes || null;
    }
    
    // Recalculate orderType based on classification/reserve_days rules
    const hasReserve = row.classification === "מילואים" || row.classification === "עבודה במילואים" || row.reserve_days > 0;
    if (fieldsSet.has("orderType")) {
      row.order_type = hasReserve ? (updates.orderType || null) : null;
    } else if (hasReserve && !row.order_type) {
      row.order_type = /צו\s*8/.test(row.notes || "") ? "צו 8" : "מילואים רגילים";
    } else if (!hasReserve) {
      row.order_type = null;
    }

    return row;
  });

  const { error: upsertError } = await supabase
    .from("reports")
    .upsert(rows, { onConflict: "user_id, date" });

  if (upsertError) throw new Error(upsertError.message || "שגיאה בשמירת הדיווחים במסד");
}

export async function getSettings(): Promise<StandardSettings> {
  const mode = currentMode();
  if (mode === "mock") return mock.mockReadSettings();

  const user = await getAuthenticatedUser();
  const userId = user.id;
  const supabase = createSupabaseServerClient();

  const profilePromise = supabase
    .from("profiles")
    .select("annual_vacation_quota")
    .eq("id", userId)
    .single();

  const standardsPromise = supabase
    .from("workday_standards")
    .select("*")
    .eq("user_id", userId);

  const [profileRes, standardsRes] = await Promise.all([profilePromise, standardsPromise]);

  const profile = profileRes.data;
  const standards = standardsRes.data;

  const years: Record<string, number[]> = {};
  if (standards && standards.length > 0) {
    for (const s of standards) {
      years[String(s.year)] = [
        s.m1,
        s.m2,
        s.m3,
        s.m4,
        s.m5,
        s.m6,
        s.m7,
        s.m8,
        s.m9,
        s.m10,
        s.m11,
        s.m12,
      ];
    }
  }

  // Pre-populate defaults for last year, current year, and next year if missing
  const currentYearNum = new Date().getFullYear();
  const defaultYearsList = [currentYearNum - 1, currentYearNum, currentYearNum + 1];
  for (const y of defaultYearsList) {
    const yStr = String(y);
    if (!years[yStr]) {
      years[yStr] = Array.from({ length: 12 }, (_, m) => {
        let count = 0;
        const days = new Date(y, m + 1, 0).getDate();
        for (let d = 1; d <= days; d++) {
          const dow = new Date(y, m, d).getDay();
          if (dow !== 5 && dow !== 6) count++;
        }
        return count;
      });
    }
  }

  return {
    annualVacationQuota: profile?.annual_vacation_quota ?? 22.0,
    years,
  };
}

export async function saveSettings(s: StandardSettings): Promise<void> {
  const mode = currentMode();
  if (mode === "mock") {
    mock.mockWriteSettings(s);
    return;
  }

  const user = await getAuthenticatedUser();
  const userId = user.id;
  const supabase = createSupabaseServerClient();

  // 1. Update Profile vacation quota
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ annual_vacation_quota: s.annualVacationQuota })
    .eq("id", userId);

  if (profileError) throw new Error("שגיאה בעדכון מכסת חופשה");

  // 2. Upsert workday standards for each year
  for (const [yearStr, months] of Object.entries(s.years)) {
    const year = parseInt(yearStr, 10);
    const { error: stdError } = await supabase
      .from("workday_standards")
      .upsert(
        {
          user_id: userId,
          year,
          m1: months[0] ?? 22,
          m2: months[1] ?? 22,
          m3: months[2] ?? 22,
          m4: months[3] ?? 22,
          m5: months[4] ?? 22,
          m6: months[5] ?? 22,
          m7: months[6] ?? 22,
          m8: months[7] ?? 22,
          m9: months[8] ?? 22,
          m10: months[9] ?? 22,
          m11: months[10] ?? 22,
          m12: months[11] ?? 22,
        },
        { onConflict: "user_id, year" }
      );

    if (stdError) throw new Error("שגיאה בעדכון ימי תקן");
  }
}