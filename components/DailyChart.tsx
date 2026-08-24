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

export default function DailyChart({ records, year, month, nonWorkingDays: customNonWorking }: Props) {
  const nonWorkingDays = useMemo(() => {
    return customNonWorking ?? getNonWorkingDays();
  }, [customNonWorking]);

  const data = useMemo(() => {
    const byDay = new Map<number, number>();
    for (const r of records) {
      byDay.set(parseInt(r.date.slice(8), 10), r.totalHoursDecimal || 0);
    }
    const n = daysInMonth(year, month);
    // Day 1 rendered on the right (RTL) -> feed days descending.
    return Array.from({ length: n }, (_, i) => {
      const day = n - i;
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay();
      const isNonWorking = nonWorkingDays.includes(dayOfWeek);
      const hours = Math.round((byDay.get(day) ?? 0) * 10) / 10;
      return { day, hours, isNonWorking };
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
                `${v} שעות${item?.payload?.isNonWorking ? " (יום מנוחה)" : ""}`,
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
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isNonWorking ? (entry.hours > 0 ? "#64748b" : "#cbd5e1") : "#2563eb"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}