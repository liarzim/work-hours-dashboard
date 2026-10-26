"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { DayRecord, HEBREW_MONTHS, MonthData } from "@/lib/types";
import { PencilIcon } from "./Icons";
import { getHolidays, getNonWorkingDays, HolidaySetting } from "@/lib/settingsStore";
import { getDayOfWeekFromIso } from "@/lib/date";

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
  const normC = (c || "").replace(/""/g, '"').replace(/^["']|["']$/g, "").trim();
  if (normC === "חופשה") return CLASS_STYLES["חופש"];
  if (normC === 'סופ"ש' || normC === "סופש" || normC.includes("סופ")) return CLASS_STYLES['סופ"ש'];
  return CLASS_STYLES[normC] ?? "bg-slate-100 text-slate-600";
}

export default function ReportsScreen({ data, year, month, onYear, onMonth, onEdit, onBulkUpdate }: Props) {
  const [classFilter, setClassFilter] = useState("הכל");
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  // Holidays & Non-working days settings
  const [holidays, setHolidays] = useState<HolidaySetting[]>([]);
  const [nonWorkingDays, setNonWorkingDays] = useState<number[]>([5, 6]);

  useEffect(() => {
    setHolidays(getHolidays());
    setNonWorkingDays(getNonWorkingDays());

    const handleStorage = () => {
      setHolidays(getHolidays());
      setNonWorkingDays(getNonWorkingDays());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const holidayDatesSet = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);
  const holidayMap = useMemo(() => new Map(holidays.map((h) => [h.date, h])), [holidays]);
  const nonWorkingDaysSet = useMemo(() => new Set(nonWorkingDays), [nonWorkingDays]);

  const todayIso = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const todayRowRef = useRef<HTMLTableRowElement | null>(null);

  const records = data?.records ?? [];

  // Automatically scroll to today's row when viewing current month/year
  useEffect(() => {
    const now = new Date();
    if (year === now.getFullYear() && month === now.getMonth() + 1) {
      const timer = setTimeout(() => {
        if (todayRowRef.current) {
          todayRowRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [year, month, records.length]);

  // Reset selection when year/month or filters change
  useEffect(() => {
    setSelectedDates([]);
  }, [year, month, showMissingOnly, classFilter]);

  const getEffectiveClassification = (r: DayRecord): string => {
    if (r.classification) {
      return r.classification.replace(/""/g, '"').replace(/^["']|["']$/g, "").trim();
    }
    if (r.date > todayIso) {
      const hol = holidayMap.get(r.date);
      if (hol) return hol.category;
  
      const dow = getDayOfWeekFromIso(r.date);
      if (nonWorkingDaysSet.has(dow)) return 'סופ"ש';
    }
    return "";
  };

  const getEffectiveNotes = (r: DayRecord): string => {
    if (r.notes) return r.notes;
    if (r.date > todayIso) {
      const hol = holidayMap.get(r.date);
      if (hol) return hol.name;
    }
    return "";
  };

  // Check if a day record is a missing report and its type
  const getMissingReportType = (r: DayRecord): "full" | "missing_entry" | "missing_exit" | null => {
    // 1. Must not be a future date
    if (r.date > todayIso) return null;

    // 2. Must not be a defined non-working day (e.g. weekend)


    const dow = getDayOfWeekFromIso(r.date);
    if (nonWorkingDaysSet.has(dow)) return null;

    // 3. Must not be a holiday from the holidays settings table
    if (holidayDatesSet.has(r.date)) return null;

    // 4. Must not have an excused absence / weekend / holiday classification
    const normC = (r.classification || "").replace(/""/g, '"').replace(/^["']|["']$/g, "").trim();
    if (
      normC === "חופש" ||
      normC === "חופשה" ||
      normC === "מחלה" ||
      normC === "מילואים" ||
      normC === "עבודה במילואים" ||
      normC === "חג" ||
      normC === "ערב חג" ||
      normC === "חול המועד" ||
      normC === 'סופ"ש' ||
      normC === "סופש" ||
      normC === "סופשבוע"
    ) {
      return null;
    }

    // 5. Must not have any absence days recorded
    if ((r.vacationDays ?? 0) > 0 || (r.sickDays ?? 0) > 0 || (r.reserveDays ?? 0) > 0) {
      return null;
    }

    // 6. Check entry and exit
    const hasEntry = Boolean(r.entry && r.entry.trim() !== "");
    const hasExit = Boolean(r.exit && r.exit.trim() !== "");

    if (hasEntry && hasExit) {
      return null; // Complete report!
    }

    // If it's today and neither entry nor exit has been reported yet, it's not missing yet
    if (r.date === todayIso && !hasEntry && !hasExit) {
      return null;
    }

    if (!hasEntry && !hasExit) {
      return "full";
    }
    if (!hasEntry && hasExit) {
      return "missing_entry";
    }
    return "missing_exit";
  };

  // Map of dates to their missing type
  const missingMap = useMemo(() => {
    const map = new Map<string, "full" | "missing_entry" | "missing_exit">();
    for (const r of records) {
      const type = getMissingReportType(r);
      if (type) map.set(r.date, type);
    }
    return map;
  }, [records, todayIso, nonWorkingDaysSet, holidayDatesSet]);

  const missingDatesSet = useMemo(() => new Set(missingMap.keys()), [missingMap]);

  const missingBreakdown = useMemo(() => {
    let full = 0;
    let missingEntry = 0;
    let missingExit = 0;
    missingMap.forEach((type) => {
      if (type === "full") full++;
      else if (type === "missing_entry") missingEntry++;
      else if (type === "missing_exit") missingExit++;
    });
    return { full, missingEntry, missingExit };
  }, [missingMap]);

  const classifications = useMemo(() => {
    const s = new Set<string>();
    records.forEach((r) => {
      const c = getEffectiveClassification(r);
      if (c) s.add(c);
    });
    const list = ["הכל", ...Array.from(s)];
    if (missingDatesSet.size > 0) {
      list.push("דיווחים חסרים");
      if (missingBreakdown.full > 0) list.push("דיווח חסר מלא");
      if (missingBreakdown.missingEntry > 0) list.push("דיווח חסר חלקי - כניסה");
      if (missingBreakdown.missingExit > 0) list.push("דיווח חסר חלקי - יציאה");
    }
    return list;
  }, [records, missingDatesSet, missingBreakdown, holidayMap, nonWorkingDaysSet, todayIso]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const missingType = missingMap.get(r.date);
      const isMissing = Boolean(missingType);
      const effClass = getEffectiveClassification(r);
      const effNotes = getEffectiveNotes(r);

      if (showMissingOnly && !isMissing) return false;
      if (classFilter === "דיווחים חסרים") {
        if (!isMissing) return false;
      } else if (classFilter === "דיווח חסר מלא") {
        if (missingType !== "full") return false;
      } else if (classFilter === "דיווח חסר חלקי - כניסה") {
        if (missingType !== "missing_entry") return false;
      } else if (classFilter === "דיווח חסר חלקי - יציאה") {
        if (missingType !== "missing_exit") return false;
      } else if (classFilter !== "הכל" && effClass !== classFilter) {
        return false;
      }
      if (search) {
        const hay = `${r.dateDisplay} ${effNotes} ${r.uniqueNotes ?? ""} ${effClass} ${r.dayName ?? ""} ${isMissing ? "חסר דיווח חסרים חלקי כניסה יציאה" : ""}`;
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }, [records, classFilter, showMissingOnly, search, missingMap, holidayMap, nonWorkingDaysSet, todayIso]);

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
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 sm:p-4 shadow-card">
        <select value={year} onChange={(e) => onYear(parseInt(e.target.value, 10))} className={`${selectCls} flex-1 sm:flex-initial min-w-[85px]`} aria-label="שנה">
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={month} onChange={(e) => onMonth(parseInt(e.target.value, 10))} className={`${selectCls} flex-1 sm:flex-initial min-w-[95px]`} aria-label="חודש">
          {HEBREW_MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>{name}</option>
          ))}
        </select>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={`${selectCls} flex-1 sm:flex-initial min-w-[95px]`} aria-label="סיווג">
          {classifications.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowMissingOnly((prev) => !prev)}
          className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition border cursor-pointer ${
            showMissingOnly
              ? "bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-300"
              : missingDatesSet.size > 0
              ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
              : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
          }`}
          title={
            missingDatesSet.size > 0
              ? `סה"כ דיווחים חסרים: ${missingDatesSet.size} (מלא: ${missingBreakdown.full}, חסר כניסה: ${missingBreakdown.missingEntry}, חסר יציאה: ${missingBreakdown.missingExit})`
              : "אין דיווחים חסרים"
          }
        >
          <span>⚠️</span>
          <span>דיווחים חסרים</span>
          <span
            className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold ${
              showMissingOnly
                ? "bg-white text-amber-800"
                : missingDatesSet.size > 0
                ? "bg-amber-200 text-amber-950"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {missingDatesSet.size}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            const curY = now.getFullYear();
            const curM = now.getMonth() + 1;
            if (year !== curY || month !== curM) {
              onYear(curY);
              onMonth(curM);
            }
            setTimeout(() => {
              todayRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
            }, 250);
          }}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100 transition cursor-pointer"
          title="קפיצה מהירה לתאריך של היום ומיקוד"
        >
          <span>📍</span>
          <span>היום</span>
        </button>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש בהערות / תאריך..."
          className="w-full sm:w-auto sm:max-w-xs sm:ms-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
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
                const missingType = missingMap.get(r.date);
                const isMissing = Boolean(missingType) || Boolean((r.entry && !r.exit) || (!r.entry && r.exit));
                const isToday = r.date === todayIso;
                return (
                  <tr
                    key={r.date}
                    ref={isToday ? todayRowRef : undefined}
                    className={`border-b transition ${
                      isToday
                        ? "bg-blue-50/70 hover:bg-blue-100/70 border-y-2 border-brand-400"
                        : isMissing
                        ? "bg-amber-50/90 hover:bg-amber-100/80 border-s-4 border-s-amber-400 border-b-amber-200/60"
                        : "border-slate-50 hover:bg-slate-50/60"
                    }`}
                  >
                    <td className="px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedDates.includes(r.date)}
                        onChange={(e) => handleRowCheck(r.date, e.target.checked)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      {isToday ? (
                        <div className="relative inline-flex flex-col rounded-xl border-2 border-brand-600 bg-white px-3 py-1.5 shadow-sm animate-today-blink">
                          <span className="absolute -top-2.5 right-2 inline-flex items-center gap-0.5 rounded bg-brand-600 text-white text-[10px] font-black px-1.5 py-0.2 shadow-xs whitespace-nowrap">
                            היום 📍
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-extrabold text-brand-900 text-sm">
                              {r.dateDisplay}
                            </span>
                          </div>
                          <div className="text-[11px] font-bold text-brand-700">{r.dayName}</div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            {isMissing && (
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${
                                  missingType === "missing_exit"
                                    ? "bg-rose-500"
                                    : missingType === "missing_entry"
                                    ? "bg-amber-500"
                                    : "bg-amber-500"
                                }`}
                                title={
                                  missingType === "missing_exit"
                                    ? "דיווח חסר חלקי - יציאה"
                                    : missingType === "missing_entry"
                                    ? "דיווח חסר חלקי - כניסה"
                                    : "דיווח חסר מלא"
                                }
                              />
                            )}
                            <span className={`font-semibold ${isMissing ? "text-amber-950 font-bold" : "text-slate-800"}`}>
                              {r.dateDisplay}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">{r.dayName}</div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center text-brand-700">
                      {r.shifts && r.shifts.length > 1 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span dir="ltr" className="font-semibold text-xs text-brand-900">
                            {r.entry} — {r.exit}
                          </span>
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 border border-brand-200 cursor-help"
                            title={r.shifts.map((s, i) => `${s.description || `מקטע ${i + 1}`}: ${s.entry} - ${s.exit}`).join("\n")}
                          >
                            <span>{r.shifts.length} מקטעים</span>
                          </span>
                        </div>
                      ) : missingType === "missing_exit" || (r.entry && !r.exit) ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span dir="ltr" className="font-semibold text-xs text-amber-950">
                            {r.entry} — <span className="text-rose-500 font-extrabold">--:--</span>
                          </span>
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.2 text-[10px] font-bold text-rose-700 border border-rose-200">
                            חסרה יציאה
                          </span>
                        </div>
                      ) : missingType === "missing_entry" || (!r.entry && r.exit) ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span dir="ltr" className="font-semibold text-xs text-amber-950">
                            <span className="text-rose-500 font-extrabold">--:--</span> — {r.exit}
                          </span>
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100/90 px-2 py-0.2 text-[10px] font-bold text-amber-900 border border-amber-300">
                            חסרה כניסה
                          </span>
                        </div>
                      ) : missingType === "full" ? (
                        <span className="inline-block rounded-md bg-amber-100/90 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                          לא מולא
                        </span>
                      ) : r.entry && r.exit ? (
                        <span dir="ltr" className="font-medium">
                          {r.entry} — {r.exit}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-slate-800">
                      {isMissing ? (
                        <span className="font-semibold text-amber-600 text-xs">0.0</span>
                      ) : (
                        <div>
                          <div>{(r.totalHoursDecimal || 0).toFixed(1)}</div>
                          {(r.overtimeDecimal || 0) > 0 && (
                            <div className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 py-0.2 mt-0.5 inline-block">
                              +{(r.overtimeDecimal || 0).toFixed(1)} ש"נ
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {missingType === "full" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-200/80 px-2.5 py-0.5 text-xs font-bold text-amber-900 shadow-2xs whitespace-nowrap">
                          <span>⚠️</span>
                          <span>דיווח חסר מלא</span>
                        </span>
                      ) : missingType === "missing_entry" || (!r.entry && r.exit) ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 shadow-2xs whitespace-nowrap">
                          <span>⚠️</span>
                          <span>חסר חלקי - כניסה</span>
                        </span>
                      ) : missingType === "missing_exit" || (r.entry && !r.exit) ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-800 shadow-2xs whitespace-nowrap">
                          <span>⚠️</span>
                          <span>חסר חלקי - יציאה</span>
                        </span>
                      ) : (() => {
                        const effC = getEffectiveClassification(r);
                        return effC ? (
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${classChip(effC)}`}>
                            {effC}
                          </span>
                        ) : null;
                      })()}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs font-bold text-indigo-600">
                      {r.orderType || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-amber-700">
                      {absences.length ? absences.join(" · ") : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="max-w-[220px] px-4 py-2.5 text-xs text-slate-500">
                      {(() => {
                        const effNotes = getEffectiveNotes(r);
                        return (
                          <>
                            {effNotes && <div className="truncate text-slate-700 font-medium" title={effNotes}>{effNotes}</div>}
                            {r.uniqueNotes && <div className="truncate text-brand-600 font-bold mt-0.5" title={r.uniqueNotes}>{r.uniqueNotes}</div>}
                            {!effNotes && !r.uniqueNotes && <span className="text-slate-300">—</span>}
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => onEdit(r)}
                        aria-label={`עריכת ${r.dateDisplay}`}
                        className={`rounded-lg p-2 transition ${
                          isMissing
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                            : "text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                        }`}
                      >
                        <PencilIcon />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm">
                    {showMissingOnly || classFilter === "דיווחים חסרים" ? (
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                        <span className="text-3xl">🎉</span>
                        <span className="font-bold text-slate-700">כל הכבוד! אין דיווחים חסרים לחודש זה</span>
                        <span className="text-xs text-slate-400">כל ימי העבודה בעבר מולאו או הוגדרו כחופשה/חג/סופ"ש כראוי.</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowMissingOnly(false);
                            if (classFilter === "דיווחים חסרים") setClassFilter("הכל");
                          }}
                          className="mt-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                        >
                          הצג את כל הדיווחים
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400">אין רשומות להצגה בחודש זה</span>
                    )}
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