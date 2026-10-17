"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DayRecord } from "@/lib/types";
import { daysInMonth } from "@/lib/date";
import {
  getNonWorkingDays,
  getHolidays,
  HolidaySetting,
  getChartPalette,
  DEFAULT_CHART_PALETTE,
  ChartPalette,
} from "@/lib/settingsStore";

interface Props {
  records: DayRecord[];
  year: number;
  month: number;
  nonWorkingDays?: number[];
}

const CustomBarBackground = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (payload?.isMissing) {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="#fefce8"
          stroke="#fde047"
          strokeWidth={1}
          strokeDasharray="2 2"
          rx={4}
          ry={4}
        />
        <rect
          x={x}
          y={y + height - 12}
          width={width}
          height={12}
          fill="#eab308"
          rx={3}
          ry={3}
        />
      </g>
    );
  }
  if (!payload || !payload.isNonWorking) {
    return <rect x={x} y={y} width={width} height={height} fill="#f8fafc" rx={4} ry={4} />;
  }
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={payload.weekendColor || "#cbd5e1"}
      rx={4}
      ry={4}
    />
  );
};

export default function DailyChart({ records, year, month, nonWorkingDays: customNonWorking }: Props) {
  const [holidays, setHolidays] = useState<HolidaySetting[]>([]);
  const [palette, setPalette] = useState<ChartPalette>(DEFAULT_CHART_PALETTE);

  useEffect(() => {
    setHolidays(getHolidays());
    setPalette(getChartPalette());

    const handleStorage = () => {
      setHolidays(getHolidays());
      setPalette(getChartPalette());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const holidayDatesSet = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);
  const holidayMap = useMemo(() => new Map(holidays.map((h) => [h.date, h])), [holidays]);

  const nonWorkingDays = useMemo(() => {
    return customNonWorking ?? getNonWorkingDays();
  }, [customNonWorking]);

  const todayIso = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const data = useMemo(() => {
    const recordMap = new Map<number, DayRecord>();
    for (const r of records) {
      recordMap.set(parseInt(r.date.slice(8), 10), r);
    }
    const n = daysInMonth(year, month);
    // Day 1 rendered on the right (RTL) -> feed days descending.
    return Array.from({ length: n }, (_, i) => {
      const day = n - i;
      const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isPast = iso < todayIso;

      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const isNonWorking = nonWorkingDays.includes(dayOfWeek);
      const isHoliday = holidayDatesSet.has(iso);

      const r = recordMap.get(day);
      const actualHours = Math.round(((r?.totalHoursDecimal) ?? 0) * 10) / 10;
      const classification = r?.classification ?? "";

      const isVacation =
        classification === "Vacation" ||
        classification === "חופשה" ||
        classification === "חופש" ||
        classification === "חול המועד" ||
        (r?.vacationDays ?? 0) > 0;

      const isReserve =
        classification === "Reserve" ||
        classification === "ReserveDuty" ||
        classification === "מילואים" ||
        classification === "עבודה במילואים" ||
        (r?.reserveDays ?? 0) > 0;

      const isSick =
        classification === "Sick" ||
        classification === "מחלה" ||
        (r?.sickDays ?? 0) > 0;

      const isHolidayDay =
        isHoliday ||
        classification === "חג" ||
        classification === "ערב חג";

      // If actual hours were reported, show them.
      // Otherwise, if holiday, reserve, vacation, or sick, display as 12 hours!
      let hours = actualHours;
      let isFullDayAbsence = false;

      if (actualHours === 0) {
        if (isHolidayDay || isReserve || isVacation || isSick) {
          hours = 12;
          isFullDayAbsence = true;
        }
      }

      // Check if missing report (past workday, no holiday, no absence, no hours)
      const isMissing =
        isPast &&
        !isNonWorking &&
        !isHolidayDay &&
        !isVacation &&
        !isReserve &&
        !isSick &&
        actualHours === 0 &&
        (!classification || classification === "עבודה") &&
        !r?.vacationDays &&
        !r?.sickDays &&
        !r?.reserveDays;

      let catLabel = "";
      let color = palette.work;

      if (isMissing) {
        catLabel = " (⚠️ דיווח חסר)";
        color = palette.missing;
      } else if (isNonWorking) {
        catLabel = actualHours > 0 ? " (יום מנוחה · שעות בפועל)" : " (סופ\"ש)";
        color = actualHours > 0 ? "#475569" : palette.weekend;
      } else if (isHolidayDay) {
        const holName = holidayMap.get(iso)?.name || classification || "חג";
        catLabel = isFullDayAbsence ? ` (${holName} · 12 שעות)` : ` (${holName} · ${actualHours} שעות בפועל)`;
        color = palette.holiday;
      } else if (isVacation) {
        catLabel = isFullDayAbsence ? " (חופשה · 12 שעות)" : ` (חופשה · ${actualHours} שעות בפועל)`;
        color = palette.vacation;
      } else if (isReserve) {
        catLabel = isFullDayAbsence ? " (מילואים · 12 שעות)" : ` (מילואים · ${actualHours} שעות בפועל)`;
        color = palette.reserve;
      } else if (isSick) {
        catLabel = isFullDayAbsence ? " (מחלה · 12 שעות)" : ` (מחלה · ${actualHours} שעות בפועל)`;
        color = palette.sick;
      } else {
        catLabel = actualHours > 0 ? " (עבודה)" : "";
        color = palette.work;
      }

      return {
        day,
        hours,
        actualHours,
        isNonWorking,
        isMissing,
        catLabel,
        color,
        weekendColor: palette.weekend,
      };
    });
  }, [records, year, month, nonWorkingDays, todayIso, holidayDatesSet, holidayMap, palette]);

  return (
    <section className="h-full rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
      <h2 className="mb-4 text-sm font-bold text-slate-800">פעילות שעות יומית</h2>
      <div className="h-80" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              interval={0}
            />
            <YAxis
              domain={[0, 14]}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(37, 99, 235, 0.06)" }}
              formatter={(v: any, name: any, item: any) => [
                `${v} שעות${item?.payload?.catLabel || ""}`,
                'סה"כ',
              ]}
              labelFormatter={(d) => `יום ${d} בחודש`}
              contentStyle={{
                direction: "rtl",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="hours"
              radius={[4, 4, 0, 0]}
              maxBarSize={26}
              minPointSize={3}
              background={<CustomBarBackground />}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded" style={{ backgroundColor: palette.work }} />
          <span>עבודה</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded" style={{ backgroundColor: palette.vacation }} />
          <span>חופשה (12 ש')</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded" style={{ backgroundColor: palette.reserve }} />
          <span>מילואים (12 ש')</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded" style={{ backgroundColor: palette.sick }} />
          <span>מחלה (12 ש')</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded" style={{ backgroundColor: palette.holiday }} />
          <span>חג / ערב חג (12 ש')</span>
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-amber-700">
          <span className="h-3 w-3 rounded border" style={{ backgroundColor: palette.missing, borderColor: "#ca8a04" }} />
          <span>דיווח חסר ⚠️</span>
        </span>
      </div>
    </section>
  );
}