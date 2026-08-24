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
  standardWorkDays: number,
  nonWorkingDays: number[] = [5, 6]
): MonthSummary {
  const targetHours = round1(standardWorkDays * DEFAULT_DAILY_HOURS);
  const reportedHours = round1(
    records.reduce((s, r) => s + (r.totalHoursDecimal || 0), 0)
  );
  const remainingHours = round1(Math.max(targetHours - reportedHours, 0));

  // Calculate fully updated weekdays (only days with clockin and clockout on working days)
  const updatedFullyDays = records.filter((r) => {
    const dParts = r.date.split("-");
    const dateObj = new Date(parseInt(dParts[0], 10), parseInt(dParts[1], 10) - 1, parseInt(dParts[2], 10));
    const dayOfWeek = dateObj.getDay();
    const isWorkday = !nonWorkingDays.includes(dayOfWeek);
    if (isWorkday) {
      return Boolean(r.entry && r.exit);
    }
    return false;
  }).length;

  const remainingWorkdays = Math.max(0, standardWorkDays - updatedFullyDays);

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