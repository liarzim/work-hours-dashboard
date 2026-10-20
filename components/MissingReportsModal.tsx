"use client";

import { useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { MissingReportItem } from "@/lib/types";
import { useMissingReports } from "@/lib/client";
import { AlertTriangleIcon, PencilIcon, XIcon } from "./Icons";
import { HEBREW_MONTHS } from "@/lib/types";

interface Props {
  onClose: () => void;
  onEditDate: (date: string, item?: MissingReportItem) => void;
  onBulkUpdate: (dates: string[]) => void;
  onQuickSave: (updates: {
    date: string;
    entry?: string;
    exit?: string;
    classification: string;
    vacationDays?: number;
    sickDays?: number;
    reserveDays?: number;
  }) => Promise<void>;
}

export default function MissingReportsModal({
  onClose,
  onEditDate,
  onBulkUpdate,
  onQuickSave,
}: Props) {
  const { data, isLoading, error } = useMissingReports();
  const { mutate } = useSWRConfig();

  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const missingList: MissingReportItem[] = data?.missing ?? [];

  // Group months present in missing list
  const monthOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const item of missingList) {
      const key = `${item.year}-${String(item.month).padStart(2, "0")}`;
      const monthName = HEBREW_MONTHS[item.month - 1] || `${item.month}`;
      const label = `${monthName} ${item.year}`;
      const cur = map.get(key);
      if (cur) {
        cur.count++;
      } else {
        map.set(key, { label, count: 1 });
      }
    }
    return Array.from(map.entries()).map(([key, val]) => ({
      key,
      label: `${val.label} (${val.count})`,
    }));
  }, [missingList]);

  // Filtered list
  const filtered = useMemo(() => {
    return missingList.filter((item) => {
      if (selectedMonth !== "all") {
        const itemKey = `${item.year}-${String(item.month).padStart(2, "0")}`;
        if (itemKey !== selectedMonth) return false;
      }
      if (selectedType !== "all") {
        const mType = item.missingType || "full";
        if (mType !== selectedType) return false;
      }
      if (search) {
        const hay = `${item.dateDisplay} ${item.date} ${item.dayName} ${item.notes ?? ""} ${item.entry ?? ""} ${item.exit ?? ""}`;
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }, [missingList, selectedMonth, selectedType, search]);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDates(filtered.map((item) => item.date));
    } else {
      setSelectedDates([]);
    }
  };

  const toggleCheck = (date: string, checked: boolean) => {
    if (checked) {
      setSelectedDates((prev) => [...prev, date]);
    } else {
      setSelectedDates((prev) => prev.filter((d) => d !== date));
    }
  };

  // Quick 1-click action handler
  const handleQuickAction = async (
    item: MissingReportItem,
    type: "vacation" | "sick" | "standard"
  ) => {
    const actionKey = `${item.date}-${type}`;
    setActionInProgress(actionKey);
    try {
      if (type === "vacation") {
        await onQuickSave({
          date: item.date,
          classification: "חופש",
          vacationDays: 1,
          sickDays: 0,
          reserveDays: 0,
        });
      } else if (type === "sick") {
        await onQuickSave({
          date: item.date,
          classification: "מחלה",
          vacationDays: 0,
          sickDays: 1,
          reserveDays: 0,
        });
      } else if (type === "standard") {
        // Standard hours: Thursday usually 8.5h (08:30-17:00), Sun-Wed 9.0h (08:30-17:30)
        const isThu = item.dayName.includes("חמישי") || item.dailyStandard === 8.5;
        const exitTime = isThu ? "17:00" : "17:30";
        await onQuickSave({
          date: item.date,
          entry: "08:30",
          exit: exitTime,
          classification: "עבודה",
          vacationDays: 0,
          sickDays: 0,
          reserveDays: 0,
        });
      }
      // Revalidate missing reports list and active month
      await mutate("/api/reports/missing");
      await mutate(`/api/reports?year=${item.year}&month=${item.month}`);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-amber-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-xs">
              <AlertTriangleIcon className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                דיווחים חסרים במערכת
              </h2>
              <p className="text-xs text-slate-500">
                {isLoading
                  ? "טוען דיווחים חסרים..."
                  : `נמצאו ${missingList.length} ימי עבודה בעבר ללא דיווח (כולל חודשים קודמים)`}
              </p>
              {data?.breakdown && missingList.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px]">
                  <span className="rounded-md bg-rose-50 px-2 py-0.5 font-bold text-rose-700 border border-rose-200">
                    מלא: {data.breakdown.full}
                  </span>
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-800 border border-amber-300">
                    חסר כניסה: {data.breakdown.missingEntry}
                  </span>
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 font-bold text-blue-700 border border-blue-200">
                    חסר יציאה: {data.breakdown.missingExit}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="סגירה"
            className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-600 transition"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Filters and search */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-3">
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setSelectedDates([]);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-brand-500"
          >
            <option value="all">כל החודשים ({missingList.length})</option>
            {monthOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setSelectedDates([]);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-brand-500"
          >
            <option value="all">כל הסוגים</option>
            <option value="full">דיווח חסר מלא ({data?.breakdown?.full ?? 0})</option>
            <option value="missing_entry">חסר כניסה ({data?.breakdown?.missingEntry ?? 0})</option>
            <option value="missing_exit">חסר יציאה ({data?.breakdown?.missingExit ?? 0})</option>
          </select>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי תאריך / יום..."
            className="flex-1 min-w-[140px] sm:max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-brand-500"
          />

          {selectedDates.length > 0 && (
            <button
              onClick={() => onBulkUpdate(selectedDates)}
              className="ms-auto rounded-xl bg-brand-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700"
            >
              עדכון מרוכז ({selectedDates.length})
            </button>
          )}
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
              שגיאה בטעינת דיווחים חסרים: {String(error.message || error)}
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              <p className="text-xs">סורק ימי עבודה מכל החודשים...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-2">🎉</span>
              <p className="text-base font-bold text-slate-800">
                אין דיווחים חסרים!
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                כל ימי העבודה בעבר מולאו כהלכה או הוגדרו כחופשה, מחלה או חג.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3 text-xs text-slate-400 pb-1 border-b border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      filtered.length > 0 &&
                      selectedDates.length === filtered.length
                    }
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                  <span>בחר הכל ({filtered.length})</span>
                </label>
                <span>פעולות מהירות לעדכון</span>
              </div>

              {filtered.map((item) => {
                const isSelected = selectedDates.includes(item.date);
                const isWorking = actionInProgress?.startsWith(item.date);
                return (
                  <div
                    key={item.date}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 transition ${
                      isSelected
                        ? "border-amber-300 bg-amber-50/80 shadow-xs"
                        : "border-slate-100 bg-white hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => toggleCheck(item.date, e.target.checked)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {item.dateDisplay}
                          </span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {item.dayName}
                          </span>
                          {item.missingType === "missing_exit" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                              ⚠️ חסר חלקי - יציאה (כניסה: {item.entry})
                            </span>
                          ) : item.missingType === "missing_entry" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/90 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300">
                              ⚠️ חסר חלקי - כניסה (יציאה: {item.exit})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                              ⚠️ דיווח חסר מלא
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          תקן יומי: {item.dailyStandard} שעות
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 ms-auto">
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => handleQuickAction(item, "standard")}
                        className="rounded-xl border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
                        title="הזנת שעות תקן מלאות (08:30 עד 17:30 / 17:00)"
                      >
                        ⏱️ שעות תקן
                      </button>
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => handleQuickAction(item, "vacation")}
                        className="rounded-xl border border-purple-200 bg-purple-50/80 px-2.5 py-1 text-xs font-semibold text-purple-700 transition hover:bg-purple-100 disabled:opacity-50"
                        title="הגדרה כיום חופש מלא"
                      >
                        🏖️ חופש
                      </button>
                      <button
                        type="button"
                        disabled={isWorking}
                        onClick={() => handleQuickAction(item, "sick")}
                        className="rounded-xl border border-amber-200 bg-amber-50/80 px-2.5 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                        title="הגדרה כיום מחלה מלא"
                      >
                        🩹 מחלה
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditDate(item.date, item)}
                        className="rounded-xl border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200"
                        title="עריכת דיווח מלאה"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-3.5">
          <div className="text-xs text-slate-400">
            {selectedDates.length > 0
              ? `${selectedDates.length} ימים נבחרו מתוך ${filtered.length}`
              : `סה"כ ${filtered.length} דיווחים חסרים`}
          </div>
          <div className="flex items-center gap-2">
            {selectedDates.length > 0 && (
              <button
                type="button"
                onClick={() => onBulkUpdate(selectedDates)}
                className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700"
              >
                עדכון מרוכז לרשומות שנבחרו
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              סגירה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
