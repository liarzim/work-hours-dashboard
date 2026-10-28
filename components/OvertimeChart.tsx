"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useOvertimeSummary } from "@/lib/client";
import { HEBREW_MONTHS, HEBREW_DAYS } from "@/lib/types";
import { ChevronRight } from "./Icons";

export const COLOR_OT125 = "#f59e0b"; // 125% overtime — Amber
export const COLOR_OT150 = "#4f46e5"; // 150% overtime — Indigo

interface ChartItem {
  key: number | string;
  label: string;
  fullLabel?: string;
  ot125: number;
  ot150: number;
  total: number;
  isWeekend?: boolean;
}

function CustomTooltip({
  active,
  payload,
  label,
  level,
  year,
  month,
}: {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  level: "years" | "months" | "days";
  year: number | null;
  month: number | null;
}) {
  if (!active || !payload || !payload.length) return null;

  const dataRow = payload[0]?.payload as ChartItem | undefined;
  if (!dataRow) return null;

  const ot125 = dataRow.ot125 ?? 0;
  const ot150 = dataRow.ot150 ?? 0;
  const total = dataRow.total ?? Math.round((ot125 + ot150) * 100) / 100;

  let title = String(label);
  if (level === "years") {
    title = `שנת ${label}`;
  } else if (level === "months" && year) {
    title = `${dataRow.fullLabel || label} ${year}`;
  } else if (level === "days" && year && month) {
    title = `${dataRow.fullLabel || label} (${dataRow.label}/${String(month).padStart(2, "0")}/${year})`;
  }

  return (
    <div
      dir="rtl"
      className="min-w-[170px] rounded-xl border border-slate-200/90 bg-white/95 p-3 text-xs shadow-lg backdrop-blur-xs select-none"
    >
      <div className="mb-2 border-b border-slate-100 pb-1.5 font-bold text-slate-800 text-[13px]">
        {title}
      </div>

      <div className="space-y-1.5 py-0.5">
        <div className="flex items-center justify-between gap-4 text-slate-600">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLOR_OT125 }}
            />
            <span>ש"נ 125%:</span>
          </span>
          <span className="font-bold text-slate-800">{ot125} שעות</span>
        </div>

        <div className="flex items-center justify-between gap-4 text-slate-600">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLOR_OT150 }}
            />
            <span>ש"נ 150%:</span>
          </span>
          <span className="font-bold text-slate-800">{ot150} שעות</span>
        </div>
      </div>

      <div className="-mx-3 -mb-3 mt-2.5 flex items-center justify-between rounded-b-xl border-t border-slate-100 bg-amber-50/70 px-3 py-2 font-bold text-slate-900">
        <span className="text-amber-900">סה״כ שעות נוספות:</span>
        <span className="text-[13px] font-extrabold text-amber-900">{total} שעות</span>
      </div>
    </div>
  );
}

interface OvertimeChartProps {
  onInteraction?: () => void;
}

export default function OvertimeChart({ onInteraction }: OvertimeChartProps) {
  const { data, isLoading } = useOvertimeSummary();

  const [level, setLevel] = useState<"years" | "months" | "days">("years");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  // Level 1: Years view rows
  const yearRows: ChartItem[] = useMemo(() => {
    if (!data?.years) return [];
    return data.years.map((y) => ({
      key: y.key,
      label: String(y.key),
      fullLabel: `שנת ${y.key}`,
      ot125: y.ot125,
      ot150: y.ot150,
      total: y.total,
    }));
  }, [data]);

  // Level 2: Months view rows
  const monthRows: ChartItem[] = useMemo(() => {
    if (!data?.months || !selectedYear) return [];
    const months = data.months[String(selectedYear)] ?? [];
    const byMonth = new Map(months.map((m) => [m.key, m]));
    return Array.from({ length: 12 }, (_, i) => {
      const m = 12 - i; // Natural RTL Jan..Dec with Dec on the left, Jan on right
      const b = byMonth.get(m);
      const ot125 = b?.ot125 ?? 0;
      const ot150 = b?.ot150 ?? 0;
      return {
        key: m,
        label: HEBREW_MONTHS[m - 1].slice(0, 3),
        fullLabel: HEBREW_MONTHS[m - 1],
        ot125,
        ot150,
        total: Math.round((ot125 + ot150) * 100) / 100,
      };
    });
  }, [data, selectedYear]);

  // Level 3: Days in selected month & week
  const monthDays = useMemo(() => {
    if (!data?.days || !selectedYear || !selectedMonth) return [];
    return data.days[`${selectedYear}-${selectedMonth}`] ?? [];
  }, [data, selectedYear, selectedMonth]);

  // Distinct weeks in this month
  const availableWeeks = useMemo(() => {
    const map = new Map<number, string>();
    for (const d of monthDays) {
      if (!map.has(d.weekNumber)) {
        map.set(d.weekNumber, d.weekLabel);
      }
    }
    return Array.from(map.entries()).map(([num, label]) => ({ num, label }));
  }, [monthDays]);

  // Filter days for the selected week
  const dayRows: ChartItem[] = useMemo(() => {
    const days = monthDays.filter((d) => d.weekNumber === selectedWeek);
    return days.map((d) => ({
      key: d.date,
      label: `${String(d.dayOfMonth).padStart(2, "0")}/${String(selectedMonth).padStart(2, "0")}`,
      fullLabel: d.dayName,
      ot125: d.ot125,
      ot150: d.ot150,
      total: d.total,
      isWeekend: d.isWeekend,
    }));
  }, [monthDays, selectedWeek, selectedMonth]);

  // Current active rows
  const activeRows = useMemo(() => {
    if (level === "years") return yearRows;
    if (level === "months") return monthRows;
    return dayRows;
  }, [level, yearRows, monthRows, dayRows]);

  const totalHours = useMemo(() => {
    return Math.round(activeRows.reduce((s, r) => s + r.total, 0) * 100) / 100;
  }, [activeRows]);

  // Navigation handlers
  const handleBarClick = (payload: unknown) => {
    onInteraction?.();
    const p = payload as { payload?: ChartItem } | undefined;
    const k = p?.payload?.key;
    if (k === undefined) return;

    if (level === "years") {
      const yr = typeof k === "number" ? k : parseInt(String(k), 10);
      setSelectedYear(yr);
      setLevel("months");
    } else if (level === "months") {
      const mn = typeof k === "number" ? k : parseInt(String(k), 10);
      setSelectedMonth(mn);
      setSelectedWeek(1);
      setLevel("days");
    }
  };

  const goToYears = () => {
    onInteraction?.();
    setLevel("years");
    setSelectedYear(null);
    setSelectedMonth(null);
  };

  const goToMonths = () => {
    onInteraction?.();
    setLevel("months");
    setSelectedMonth(null);
  };

  if (isLoading && !data) {
    return <div className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />;
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card select-none">
      {/* Header Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Breadcrumbs Navigation */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={goToYears}
              className={`font-bold transition cursor-pointer ${
                level === "years"
                  ? "text-amber-800 font-extrabold"
                  : "text-slate-600 hover:text-amber-700"
              }`}
            >
              שעות נוספות לפי שנה
            </button>

            {level !== "years" && selectedYear && (
              <>
                <span className="text-slate-300">/</span>
                <button
                  type="button"
                  onClick={goToMonths}
                  className={`font-bold transition cursor-pointer ${
                    level === "months"
                      ? "text-amber-800 font-extrabold"
                      : "text-slate-600 hover:text-amber-700"
                  }`}
                >
                  שנת {selectedYear}
                </button>
              </>
            )}

            {level === "days" && selectedMonth && (
              <>
                <span className="text-slate-300">/</span>
                <span className="font-extrabold text-amber-800">
                  {HEBREW_MONTHS[selectedMonth - 1]} (ימי השבוע)
                </span>
              </>
            )}
          </div>

          {/* Drill level back button */}
          {level !== "years" && (
            <button
              type="button"
              onClick={level === "days" ? goToMonths : goToYears}
              className="mr-2 flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200 cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              <span>{level === "days" ? "חזרה לחודשים" : "חזרה לשנים"}</span>
            </button>
          )}
        </div>

        {/* Right Header Controls (Week Selector + Total Badge) */}
        <div className="flex items-center gap-2">
          {level === "days" && availableWeeks.length > 0 && (
            <div className="flex items-center gap-1">
              <label className="text-xs text-slate-500 font-medium">שבוע:</label>
              <select
                value={selectedWeek}
                onChange={(e) => {
                  onInteraction?.();
                  setSelectedWeek(parseInt(e.target.value, 10));
                }}
                className="text-xs font-bold border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 text-slate-800 outline-none focus:border-amber-500 cursor-pointer"
              >
                {availableWeeks.map((w) => (
                  <option key={w.num} value={w.num}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <span className="text-xs font-semibold text-amber-900 bg-amber-100/90 px-2.5 py-1 rounded-lg">
            {level === "years" && `סה"כ כל השנים: ${totalHours} שעות`}
            {level === "months" && `סה"כ שנת ${selectedYear}: ${totalHours} שעות`}
            {level === "days" && `סה"כ שבוע זה: ${totalHours} שעות`}
          </span>
        </div>
      </div>

      {/* Instruction hint */}
      <div className="mb-2 text-xs text-slate-400">
        {level === "years" && "לחיצה על שנה מציגה פירוט חודשי של שעות נוספות"}
        {level === "months" && "לחיצה על חודש מציגה את ימי השבוע בפועל עם תאריכים"}
        {level === "days" && "מוצגים ימי השבוע בפועל (ראשון עד שבת) עם תאריך מדויק"}
      </div>

      {!activeRows.length ? (
        <p className="py-16 text-center text-sm text-slate-400">
          אין נתוני שעות נוספות להצגה בטווח זה
        </p>
      ) : (
        <div className="h-72" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={activeRows}
              margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(245, 158, 11, 0.08)" }}
                content={(props: any) => (
                  <CustomTooltip
                    {...props}
                    level={level}
                    year={selectedYear}
                    month={selectedMonth}
                  />
                )}
              />
              <Legend
                formatter={(v) => (
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    {v === "ot125" ? 'ש"נ 125% (שעתיים ראשונות)' : 'ש"נ 150% (מעבר לשעתיים / סופ"ש)'}
                  </span>
                )}
              />
              <Bar
                dataKey="ot125"
                stackId="overtime"
                fill={COLOR_OT125}
                onClick={level !== "days" ? handleBarClick : undefined}
                cursor={level !== "days" ? "pointer" : "default"}
                maxBarSize={48}
              />
              <Bar
                dataKey="ot150"
                stackId="overtime"
                fill={COLOR_OT150}
                radius={[4, 4, 0, 0]}
                onClick={level !== "days" ? handleBarClick : undefined}
                cursor={level !== "days" ? "pointer" : "default"}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
