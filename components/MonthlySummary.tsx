"use client";

import { MonthSummary } from "@/lib/types";

function Row({
  label,
  value,
  sub,
  onClick,
  isClickable,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  onClick?: () => void;
  isClickable?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 transition ${
        isClickable
          ? "cursor-pointer hover:bg-indigo-50/80 hover:ring-1 hover:ring-indigo-200"
          : ""
      }`}
    >
      <div>
        <span className="text-sm text-slate-600 block">{label}</span>
        {sub && <span className="text-[11px] text-slate-400 block">{sub}</span>}
      </div>
      <div className="text-left font-bold text-brand-700 text-sm">{value}</div>
    </div>
  );
}

interface Props {
  summary: MonthSummary;
  onOpenOvertimeModal?: () => void;
}

export default function MonthlySummary({ summary, onOpenOvertimeModal }: Props) {
  const term = summary.activeEmploymentTerm;
  const isHourly = term?.employmentType === "hourly";
  const rate = term?.hourlyRate || 0;
  const otHours = summary.overtimeHoursThisMonth || 0;

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-bold text-slate-800">סיכום סטטוס חודשי</h2>
        {otHours > 0 && onOpenOvertimeModal && (
          <button
            type="button"
            onClick={onOpenOvertimeModal}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 cursor-pointer"
          >
            <span>פירוט ש"נ ⏱️</span>
          </button>
        )}
      </div>

      <Row label="יעד שעות" value={`${summary.targetHours.toFixed(1)} ש'`} />
      <Row label="דווח בפועל" value={`${summary.reportedHours.toFixed(1)} ש'`} />
      <Row label="יתרה להשלמה" value={`${summary.remainingHours.toFixed(1)} ש'`} />

      {/* Overtime Row */}
      <Row
        label="שעות נוספות"
        sub={
          otHours > 0 ? (
            <span className="text-indigo-600">
              {summary.ot125HoursThisMonth?.toFixed(1) || 0}ש' (125%) · {summary.ot150HoursThisMonth?.toFixed(1) || 0}ש' (150%)
            </span>
          ) : (
            "לא בוצעו החודש"
          )
        }
        value={
          <span className={otHours > 0 ? "text-indigo-700 font-extrabold" : "text-slate-400 font-normal"}>
            {otHours.toFixed(1)} ש'
          </span>
        }
        onClick={otHours > 0 ? onOpenOvertimeModal : undefined}
        isClickable={otHours > 0}
      />

      {/* Overtime / Earnings Pay Estimate */}
      <Row
        label={isHourly ? "שכר משוער כולל" : "תוספת ש\"נ לתלוש"}
        sub={
          rate > 0 ? (
            <span>לפי ערך שעה ₪{rate}</span>
          ) : (
            <span className="text-amber-600 font-medium">לא הוגדר ערך שעה בחוזה</span>
          )
        }
        value={
          rate > 0 ? (
            <span className="text-emerald-700 font-extrabold">
              ₪{(isHourly ? summary.totalEstimatedPay : summary.overtimeAdditionPay || 0)?.toLocaleString()}
            </span>
          ) : (
            <span className="text-slate-300 font-normal">—</span>
          )
        }
        onClick={otHours > 0 ? onOpenOvertimeModal : undefined}
        isClickable={otHours > 0}
      />

      <div className="rounded-xl bg-brand-600 px-4 py-4 text-white mt-2">
        <p className="text-xs font-medium text-brand-100">תחזית המשך עבודה:</p>
        <p className="mt-1 text-2xl font-bold">
          {summary.forecastHoursPerDay.toFixed(1)}{" "}
          <span className="text-base font-semibold">שעות/יום</span>
        </p>
        <p className="mt-1 text-xs text-brand-100">
          נותרו {summary.remainingWorkdays} ימי עבודה פוטנציאליים
        </p>
      </div>
    </section>
  );
}