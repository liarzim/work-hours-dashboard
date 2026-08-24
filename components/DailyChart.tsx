"use client";

import { useMemo } from "react";
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
import { getNonWorkingDays } from "@/lib/settingsStore";

interface Props {
  records: DayRecord[];
  year: number;
  month: number;
  nonWorkingDays?: number[];
}

const CustomBarBackground = (props: any) => {
  const { x, y, width, height, payload } = props;
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
  const nonWorkingDays = useMemo(() => {
    return customNonWorking ?? getNonWorkingDays();
  }, [customNonWorking]);

  const data = useMemo(() => {
    const recordMap = new Map<number, DayRecord>();
    for (const r of records) {
      recordMap.set(parseInt(r.date.slice(8), 10), r);
    }
    const n = daysInMonth(year, month);
    // Day 1 rendered on the right (RTL) -> feed days descending.
    return Array.from({ length: n }, (_, i) => {
      const day = n - i;
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const isNonWorking = nonWorkingDays.includes(dayOfWeek);
      const r = recordMap.get(day);
      const hours = Math.round(((r?.totalHoursDecimal) ?? 0) * 10) / 10;
      const classification = r?.classification ?? "";
      const isVacation = classification === "Vacation" || classification === "חופשה" || (r?.vacationDays ?? 0) > 0;
      const isReserve = classification === "Reserve" || classification === "ReserveDuty" || classification === "מילואים" || classification === "עבודה במילואים" || (r?.reserveDays ?? 0) > 0;
      const isSick = classification === "Sick" || classification === "מחלה" || (r?.sickDays ?? 0) > 0;

      let catLabel = "";
      if (isNonWorking) catLabel = " (יום מנוחה)";
      else if (isVacation) catLabel = " (חופשה)";
      else if (isReserve) catLabel = " (מילואים)";
      else if (isSick) catLabel = " (מחלה)";

      let color = "#2563eb";
      if (isNonWorking) {
        color = hours > 0 ? "#475569" : "#cbd5e1";
      } else if (isVacation) {
        color = "#a855f7"; // Purple
      } else if (isReserve) {
        color = "#10b981"; // Green
      } else if (isSick) {
        color = "#f59e0b"; // Amber/Orange
      }

      return { day, hours, isNonWorking, catLabel, color };
    });
  }, [records, year, month, nonWorkingDays]);

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
    </section>
  );
}