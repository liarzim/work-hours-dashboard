"use client";

import { useMemo, useState, useEffect } from "react";
import { DayRecord, HEBREW_MONTHS, MonthData } from "@/lib/types";
import { PencilIcon } from "./Icons";

interface Props {
  data?: MonthData;
  year: number;
  month: number;
  onYear: (y: number) => void;
  onMonth: (m: number) => void;
  onEdit: (rec: DayRecord) => void;
  onBulkUpdate: (dates: string[]) => void;
}

const CLASS_STYLES: Record<string, string> = {
  עבודה: "bg-emerald-50 text-emerald-700",
  'סופ"ש': "bg-slate-100 text-slate-500",
  סופשבוע: "bg-slate-100 text-slate-500",
  חופש: "bg-amber-50 text-amber-700",
  מחלה: "bg-rose-50 text-rose-700",
  מילואים: "bg-indigo-50 text-indigo-700",
  חג: "bg-purple-50 text-purple-700",
  "ערב חג": "bg-purple-50 text-purple-600",
  "חול המועד": "bg-purple-50 text-purple-600",
  "עבודה במילואים": "bg-cyan-50 text-cyan-750 border border-cyan-200",
};

function classChip(c: string) {
  return CLASS_STYLES[c] ?? "bg-slate-100 text-slate-600";
}

export default function ReportsScreen({ data, year, month, onYear, onMonth, onEdit, onBulkUpdate }: Props) {
  const [classFilter, setClassFilter] = useState("הכל");
  const [search, setSearch] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  const records = data?.records ?? [];

  // Reset selection when year/month changes
  useEffect(() => {
    setSelectedDates([]);
  }, [year, month]);

  const classifications = useMemo(() => {
    const s = new Set(records.map((r) => r.classification).filter(Boolean));
    return ["הכל", ...Array.from(s)];
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (classFilter !== "הכל" && r.classification !== classFilter) return false;
      if (search) {
        const hay = `${r.dateDisplay} ${r.notes} ${r.uniqueNotes} ${r.classification} ${r.dayName}`;
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }, [records, classFilter, search]);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const ys: number[] = [];
    for (let y = 2019; y <= current + 1; y++) ys.push(y);
    if (!ys.includes(year)) ys.push(year);
    return ys.sort();
  }, [year]);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDates(filtered.map((r) => r.date));
    } else {
      setSelectedDates([]);
    }
  };

  const handleRowCheck = (date: string, checked: boolean) => {
    if (checked) {
      setSelectedDates((prev) => [...prev, date]);
    } else {
      setSelectedDates((prev) => prev.filter((d) => d !== date));
    }
  };

  const selectCls =
    "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="space-y-4">
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
        <select value={year} onChange={(e) => onYear(parseInt(e.target.value, 10))} className={selectCls} aria-label="שנה">
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={month} onChange={(e) => onMonth(parseInt(e.target.value, 10))} className={selectCls} aria-label="חודש">
          {HEBREW_MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>{name}</option>
          ))}
        </select>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={selectCls} aria-label="סיווג">
          {classifications.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש בהערות / תאריך..."
          className="ms-auto w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {/* Bulk actions bar */}
      {selectedDates.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-brand-200 bg-brand-50/70 px-5 py-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-sm font-semibold text-brand-800">
            {selectedDates.length} רשומות נבחרו לעדכון
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onBulkUpdate(selectedDates)}
              className="rounded-xl bg-brand-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700"
            >
              עדכון מרוכז
            </button>
            <button
              onClick={() => setSelectedDates([])}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              ביטול בחירה
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-xs text-slate-500">
                <th className="px-4 py-3 text-center" style={{ width: "40px" }}>
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedDates.length === filtered.length}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-right font-medium">תאריך</th>
                <th className="px-4 py-3 text-center font-medium">כניסה - יציאה</th>
                <th className="px-4 py-3 text-center font-medium">סה"כ</th>
                <th className="px-4 py-3 text-center font-medium">סיווג</th>
                <th className="px-4 py-3 text-center font-medium">סוג צו</th>
                <th className="px-4 py-3 text-center font-medium">היעדרויות</th>
                <th className="px-4 py-3 text-right font-medium">הערות</th>
                <th className="px-4 py-3 text-center font-medium">פעולה</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const absences: string[] = [];
                if (r.vacationDays) absences.push(`חופש ${r.vacationDays}`);
                if (r.sickDays) absences.push(`מחלה ${r.sickDays}`);
                if (r.reserveDays) absences.push(`מילואים ${r.reserveDays}`);
                const [d, m, y] = r.dateDisplay.split("/");
                return (
                  <tr key={r.date} className="border-b border-slate-50 transition hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedDates.includes(r.date)}
                        onChange={(e) => handleRowCheck(r.date, e.target.checked)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-800">
                        {parseInt(d, 10)}.{parseInt(m, 10)}.{y}
                      </div>
                      <div className="text-[11px] text-slate-400">{r.dayName}</div>
                    </td>
                    <td className="px-4 py-2.5 text-center text-brand-700">
                      {r.entry && r.exit ? (
                        <span dir="ltr" className="font-medium">
                          {r.entry} — {r.exit}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-slate-800">
                      {(r.totalHoursDecimal || 0).toFixed(1)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {r.classification && (
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${classChip(r.classification)}`}>
                          {r.classification}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs font-bold text-indigo-600">
                      {r.orderType || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-amber-700">
                      {absences.length ? absences.join(" · ") : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="max-w-[220px] px-4 py-2.5 text-xs text-slate-500">
                      {r.notes && <div className="truncate text-slate-700 font-medium" title={r.notes}>{r.notes}</div>}
                      {r.uniqueNotes && <div className="truncate text-brand-600 font-bold mt-0.5" title={r.uniqueNotes}>{r.uniqueNotes}</div>}
                      {!r.notes && !r.uniqueNotes && <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => onEdit(r)}
                        aria-label={`עריכת ${r.dateDisplay}`}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-50 hover:text-brand-600"
                      >
                        <PencilIcon />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-400">
                    אין רשומות להצגה בחודש זה
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}