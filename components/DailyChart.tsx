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
import { getNonWorkingDays, getHolidays, HolidaySetting } from "@/lib/settingsStore";

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
      fill="#cbd5e1"
      rx={4}
      ry={4}
    />
  );
};

export default function DailyChart({ records, year, month, nonWorkingDays: customNonWorking }: Props) {
  const [holidays, setHolidays] = useState<HolidaySetting[]>([]);

  useEffect(() => {
    setHolidays(getHolidays());
    const handleStorage = () => setHolidays(getHolidays());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const holidayDatesSet = useMemo(() => new Set(holidays.map((h) => h.date)), [holidays]);

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
      const hours = Math.round(((r?.totalHoursDecimal) ?? 0) * 10) / 10;
      const classification = r?.classification ?? "";
      const isVacation = classification === "Vacation" || classification === "חופשה" || classification === "חופש" || (r?.vacationDays ?? 0) > 0;
      const isReserve = classification === "Reserve" || classification === "ReserveDuty" || classification === "מילואים" || classification === "עבודה במילואים" || (r?.reserveDays ?? 0) > 0;
      const isSick = classification === "Sick" || classification === "מחלה" || (r?.sickDays ?? 0) > 0;

      // Check if missing report (past workday, no holiday, no absence, no hours)
      const isMissing = isPast && !isNonWorking && !isHoliday && !isVacation && !isReserve && !isSick && hours === 0 && (!classification || classification === "עבודה") && (!r?.vacationDays) && (!r?.sickDays) && (!r?.reserveDays);

      let catLabel = "";
      if (isMissing) catLabel = " (⚠️ דיווח חסר)";
      else if (isNonWorking) catLabel = " (יום מנוחה)";
      else if (isVacation) catLabel = " (חופשה)";
      else if (isReserve) catLabel = " (מילואים)";
      else if (isSick) catLabel = " (מחלה)";

      let color = "#2563eb";
      if (isMissing) {
        color = "#eab308"; // Amber / Yellow
      } else if (isNonWorking) {
        color = hours > 0 ? "#475569" : "#cbd5e1";
      } else if (isVacation) {
        color = "#a855f7"; // Purple
      } else if (isReserve) {
        color = "#10b981"; // Green
      } else if (isSick) {
        color = "#f59e0b"; // Amber/Orange
      }

      return { day, hours, isNonWorking, isMissing, catLabel, color };
    });
  }, [records, year, month, nonWorkingDays, todayIso, holidayDatesSet]);

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
          <span className="h-3 w-3 rounded bg-blue-600" />
          <span>עבודה</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-purple-500" />
          <span>חופשה</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-500" />
          <span>מילואים</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-amber-500" />
          <span>מחלה</span>
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-amber-700">
          <span className="h-3 w-3 rounded bg-yellow-400 border border-amber-400" />
          <span>דיווח חסר ⚠️</span>
        </span>
      </div>
    </section>
  );
}