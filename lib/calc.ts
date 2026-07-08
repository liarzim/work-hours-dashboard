import type { DayRecord, MonthSummary } from "./types";
import { round1, todayIso } from "./date";

const DEFAULT_DAILY_HOURS = 9;

/**
 * Pure KPI computation for one month of records.
 * targetHours = standard work days (from settings) * 9h, as displayed in the
 * "הגדרות" screen (e.g. July: 22 days -> 198.0h).
 */
export function computeMonthSummary(
  year: number,
  month: number,
  records: DayRecord[],
  standardWorkDays: number
): MonthSummary {
  const targetHours = round1(standardWorkDays * DEFAULT_DAILY_HOURS);
  const reportedHours = round1(
    records.reduce((s, r) => s + (r.totalHoursDecimal || 0), 0)
  );
  const remainingHours = round1(Math.max(targetHours - reportedHours, 0));

  const today = todayIso();

  // Potential remaining workdays: days from today onward with a positive daily
  // standard (i.e. not weekend/holiday) and no hours reported yet.
  const remainingWorkdays = records.filter(
    (r) =>
      r.date >= today &&
      r.dailyStandard > 0 &&
      (r.totalHoursDecimal || 0) === 0 &&
      !r.vacationDays &&
      !r.sickDays &&
      !r.reserveDays
  ).length;

  const forecastHoursPerDay =
    remainingWorkdays > 0 ? round1(remainingHours / remainingWorkdays) : 0;

  const vacationUsedThisMonth = round1(
    records.reduce((s, r) => s + (r.vacationDays || 0), 0)
  );
  const sickDaysThisMonth = round1(
    records.reduce((s, r) => s + (r.sickDays || 0), 0)
  );
  const reserveDaysThisMonth = round1(
    records.reduce((s, r) => s + (r.reserveDays || 0), 0)
  );

  // Latest non-zero cumulative vacation balance within the month.
  let vacationBalance = 0;
  for (const r of records) {
    if (r.vacationBalance) vacationBalance = r.vacationBalance;
  }
  vacationBalance = round1(vacationBalance);

  return {
    year,
    month,
    targetHours,
    reportedHours,
    remainingHours,
    remainingWorkdays,
    forecastHoursPerDay,
    approxRemainingDays: round1(remainingHours / DEFAULT_DAILY_HOURS),
    vacationUsedThisMonth,
    sickDaysThisMonth,
    reserveDaysThisMonth,
    vacationBalance,
    standardWorkDays,
  };
}