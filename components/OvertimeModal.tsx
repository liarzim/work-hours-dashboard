"use client";

import { useMemo } from "react";
import { DayRecord, MonthSummary } from "@/lib/types";
import { HEBREW_MONTHS } from "@/lib/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  summary: MonthSummary;
  records: DayRecord[];
  year: number;
  month: number;
}

export default function OvertimeModal({
  isOpen,
  onClose,
  summary,
  records,
  year,
  month,
}: Props) {
  const term = summary.activeEmploymentTerm;
  const rate = term?.hourlyRate || 0;
  const isHourly = term?.employmentType === "hourly";
  const isGlobal = term?.employmentType === "global";

  // Filter records that have overtime (> 0)
  const overtimeDays = useMemo(() => {
    return records
      .filter((r) => (r.overtimeDecimal || 0) > 0)
      .map((r) => {
        const ot125 = r.overtime125Decimal || 0;
        const ot150 = r.overtime150Decimal || 0;
        let dayCost = 0;
        if (rate > 0) {
          if (isHourly) {
            dayCost = ot125 * (rate * 1.25) + ot150 * (rate * 1.5);
          } else if (!isGlobal) {
            // monthly with overtime: net addition 25% and 50%
            dayCost = ot125 * (rate * 0.25) + ot150 * (rate * 0.5);
          }
        }
        return {
          ...r,
          ot125,
          ot150,
          dayCost: Math.round(dayCost * 100) / 100,
        };
      });
  }, [records, rate, isHourly, isGlobal]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-lg">
              ⏱️
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                פירוט שעות נוספות — {HEBREW_MONTHS[month - 1]} {year}
              </h2>
              <p className="text-xs text-slate-400">
                סוג חוזה: {term?.name || "ברירת מחדל"} ({isHourly ? "שעתי" : isGlobal ? "גלובלי" : "חודשי עם שעות נוספות"})
                {rate > 0 ? ` • ערך שעה: ₪${rate}` : " • לא הוגדר ערך שעה"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-100 text-center">
          <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs">
            <span className="block text-[11px] font-medium text-slate-500">סה"כ שעות נוספות</span>
            <span className="text-lg font-bold text-slate-800">
              {(summary.overtimeHoursThisMonth || 0).toFixed(1)} ש'
            </span>
          </div>
          <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs">
            <span className="block text-[11px] font-medium text-slate-500">מדרגת 125% (שעתיים ראשונות)</span>
            <span className="text-lg font-bold text-indigo-600">
              {(summary.ot125HoursThisMonth || 0).toFixed(1)} ש'
            </span>
          </div>
          <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs">
            <span className="block text-[11px] font-medium text-slate-500">מדרגת 150% (משעה 3 ומעלה)</span>
            <span className="text-lg font-bold text-purple-600">
              {(summary.ot150HoursThisMonth || 0).toFixed(1)} ש'
            </span>
          </div>
          <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs">
            <span className="block text-[11px] font-medium text-slate-500">
              {isHourly ? "עלות ש\"נ מלאה" : isGlobal ? "תוספת גלובלית" : "תוספת ש\"נ לתלוש"}
            </span>
            <span className="text-lg font-extrabold text-emerald-600">
              {rate > 0 ? (
                `₪${(isHourly ? summary.overtimeFullPay : summary.overtimeAdditionPay || 0)?.toLocaleString()}`
              ) : (
                <span className="text-xs text-slate-400 font-normal">הגדר ערך שעה</span>
              )}
            </span>
          </div>
        </div>

        {/* Days Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {overtimeDays.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <span className="text-3xl block mb-2">🎉</span>
              <p className="font-semibold text-slate-600 text-sm">אין שעות נוספות בחודש זה</p>
              <p className="text-xs mt-1">כל שעות העבודה שדווחו היו במסגרת התקן היומי.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <th className="px-3 py-2.5">תאריך ויום</th>
                    <th className="px-3 py-2.5 text-center">כניסה - יציאה</th>
                    <th className="px-3 py-2.5 text-center">סה"כ שעות</th>
                    <th className="px-3 py-2.5 text-center">תקן יומי</th>
                    <th className="px-3 py-2.5 text-center text-indigo-700">ש"נ 125%</th>
                    <th className="px-3 py-2.5 text-center text-purple-700">ש"נ 150%</th>
                    {rate > 0 && <th className="px-3 py-2.5 text-center text-emerald-700">עלות יומית</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overtimeDays.map((d) => (
                    <tr key={d.date} className="hover:bg-slate-50/70 transition">
                      <td className="px-3 py-2.5 font-medium text-slate-800">
                        {d.dateDisplay} <span className="text-slate-400 font-normal">({d.dayName})</span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-slate-600">
                        {d.entry} - {d.exit}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-slate-700">
                        {d.totalHoursDecimal.toFixed(1)}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-500">
                        {d.dailyStandard.toFixed(1)}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-indigo-600">
                        {d.ot125 > 0 ? `${d.ot125.toFixed(1)}ש'` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-purple-600">
                        {d.ot150 > 0 ? `${d.ot150.toFixed(1)}ש'` : "—"}
                      </td>
                      {rate > 0 && (
                        <td className="px-3 py-2.5 text-center font-bold text-emerald-600">
                          ₪{d.dayCost.toFixed(2)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Legal Explanatory Note */}
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-500 space-y-1">
            <span className="font-bold text-slate-700 block">ℹ️ חישוב לפי חוק שעות עבודה ומנוחה בישראל:</span>
            <p>
              • <strong>2 השעות הנוספות הראשונות ביום:</strong> תעריף 125% (לעובד חודשי: תוספת 25% מעבר למשכורת הבסיס).
            </p>
            <p>
              • <strong>החל מהשעה הנוספת השלישית:</strong> תעריף 150% (לעובד חודשי: תוספת 50% מעבר למשכורת הבסיס).
            </p>
            {rate > 0 && !isHourly && (
              <p className="text-emerald-700 font-medium">
                • שווי רכיב שעות נוספות מלא (125%/150%): ₪{(summary.overtimeFullPay || 0).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-3 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition cursor-pointer"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
