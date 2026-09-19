/** One journal row = one calendar date. Mirrors the 31-column sheet schema (A:AE). */
export interface DayRecord {
  /** 1-based row index in the sheet (header = row 1). */
  rowIndex: number;
  /** Tab (sheet) name this record lives in; "" = default/first tab. */
  tab: string;
  /** ISO date yyyy-mm-dd */
  date: string;
  /** dd/mm/yyyy as stored in the sheet */
  dateDisplay: string;
  entry: string; // כניסה HH:mm
  exit: string; // יציאה HH:mm
  totalHours: string; // סה"כ שעות HH:mm
  totalHoursDecimal: number; // תרגום שעות לעשרוני
  dailyStandard: number; // תקן יומי (עשרוני)
  overtimeDecimal: number; // שעות נוספות עשרוני
  vacationDays: number; // ימי חופש
  reserveDays: number; // ימי מילואים
  sickDays: number; // ימי מחלה
  classification: string; // סיווג
  notes: string; // הערות
  uniqueNotes: string; // הערות ייחודיות
  orderType: string; // סוג צו
  dayName: string; // יום
  vacationBalance: number; // יתרת חופשה
  monthlyStandardHours: number; // תקן שעות חודשי
}

export interface MonthSummary {
  year: number;
  month: number; // 1-12
  targetHours: number; // יעד שעות
  reportedHours: number; // דווח בפועל
  remainingHours: number; // יתרה להשלמה
  remainingWorkdays: number; // ימי עבודה פוטנציאליים שנותרו
  forecastHoursPerDay: number; // תחזית שעות/יום
  approxRemainingDays: number; // כ-X ימים (יתרה חלקי תקן יומי ממוצע)
  vacationUsedThisMonth: number;
  sickDaysThisMonth: number;
  reserveDaysThisMonth: number;
  vacationBalance: number; // יתרת חופשה לניצול
  standardWorkDays: number; // תקן ימי עבודה לחודש (מהגדרות)
  estimatedVacationBalanceYearEnd?: number; // הערכה לאחר חופשות עתידיות
  activeEmploymentTerm?: EmploymentTerm; // תנאי העסקה שבתוקף בחודש זה
}

export type EmploymentType = "monthly_overtime" | "global" | "hourly" | "custom";

export interface EmploymentTerm {
  id?: string;
  userId?: string;
  name: string;
  employmentType: EmploymentType;
  startDate: string; // ISO YYYY-MM-DD
  endDate?: string | null; // ISO YYYY-MM-DD or null for current
  jobScopePct: number; // 100 = 100%
  dailyStandardSunWed: number; // e.g. 9.0
  dailyStandardThu: number; // e.g. 8.5
  overtimeEligible: boolean;
  notes?: string;
}

/** Diagnostics about the whole journal, shown after sync. */
export interface JournalInfo {
  tabs: string[];
  totalRecords: number;
  firstDate: string; // ISO
  lastDate: string; // ISO
}

export interface MonthData {
  records: DayRecord[];
  summary: MonthSummary;
  mode: "live" | "mock";
  info: JournalInfo;
}

/** Reserve-duty aggregation for the drill-down chart. */
export interface ReserveBucket {
  /** Year (years view) or month 1-12 (months view). */
  key: number;
  tzav8: number; // ימי מילואים בצו 8
  regular: number; // ימי מילואים רגילים
}

export interface ReserveSummary {
  years: ReserveBucket[];
  /** key = year, value = 12 monthly buckets (only months with data). */
  months: Record<string, ReserveBucket[]>;
}

/** Payload written back to the sheet (raw fields only — formulas do the rest). */
export interface ReportInput {
  date: string; // ISO yyyy-mm-dd
  entry?: string; // HH:mm
  exit?: string; // HH:mm
  classification: string;
  vacationDays?: number;
  reserveDays?: number;
  sickDays?: number;
  notes?: string;
  uniqueNotes?: string;
  orderType?: string;
}

export interface StandardSettings {
  annualVacationQuota: number; // ימים בשנה
  /** key = year, value = 12 monthly standard work-day counts (Jan..Dec) */
  years: Record<string, number[]>;
}

export const CLASSIFICATIONS = [
  "עבודה",
  "חופש",
  "מחלה",
  "מילואים",
  "חג",
  "ערב חג",
  "סופ\"ש",
  "עבודה במילואים",
] as const;

export const HEBREW_MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
] as const;

export const HEBREW_DAYS = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
] as const;