import type { DayRecord, MonthSummary, EmploymentTerm } from "./types";
import { round1, todayIso } from "./date";

const DEFAULT_DAILY_HOURS = 9;

/**
 * Pure KPI computation for one month of records.
 * targetHours = standard work days (from settings) * dailyStandard (from active employment term).
 */
export function computeMonthSummary(
  year: number,
  month: number,
  records: DayRecord[],
  standardWorkDays: number,
  nonWorkingDays: number[] = [5, 6],
  activeTerm?: EmploymentTerm
): MonthSummary {
  const isHourlyNoTarget = activeTerm?.employmentType === "hourly" && (activeTerm.dailyStandardSunWed === 0);
  const baseDailyHours = activeTerm?.dailyStandardSunWed ?? DEFAULT_DAILY_HOURS;
  const scopeRatio = (activeTerm?.jobScopePct ?? 100) / 100;
  const effectiveDailyStandard = baseDailyHours * scopeRatio;

  const targetHours = isHourlyNoTarget
    ? 0
    : round1(standardWorkDays * effectiveDailyStandard);

  const reportedHours = round1(
    records.reduce((s, r) => s + (r.totalHoursDecimal || 0), 0)
  );

  const remainingHours = isHourlyNoTarget
    ? 0
    : round1(Math.max(targetHours - reportedHours, 0));

  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;
  const curD = now.getDate();

  let remainingWorkdays = 0;

  if (year < curY || (year === curY && month < curM)) {
    remainingWorkdays = 0;
  } else if (year > curY || (year === curY && month > curM)) {
    const totalDays = new Date(year, month, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      if (!nonWorkingDays.includes(dow)) remainingWorkdays++;
    }
  } else {
    const totalDays = new Date(year, month, 0).getDate();
    const todayStr = todayIso();
    const todayRecord = records.find((r) => r.date === todayStr);
    const todayCompleted = Boolean(todayRecord && todayRecord.entry && todayRecord.exit);
    // Today counts as a remaining workday only if it is not yet completed
    // AND the current time is before 17:00 (workday cutoff).
    const isAfter17 = now.getHours() >= 17;
    const todayStillOpen = !todayCompleted && !isAfter17;
    const startD = todayStillOpen ? curD : curD + 1;

    for (let d = startD; d <= totalDays; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      if (!nonWorkingDays.includes(dow)) remainingWorkdays++;
    }
  }

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
    activeEmploymentTerm: activeTerm,
  };
}