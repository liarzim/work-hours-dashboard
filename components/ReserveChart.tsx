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
import { useReserveSummary } from "@/lib/client";
import { HEBREW_MONTHS } from "@/lib/types";
import { ChevronRight } from "./Icons";

const COLOR_TZAV8 = "#dc2626"; // צו 8 — emergency call-up
const COLOR_REGULAR = "#2563eb"; // regular reserve duty

interface ChartRow {
  key: number;
  label: string;
  tzav8: number;
  regular: number;
}

/**
 * Stacked bar chart of reserve-duty days per year (צו 8 vs regular).
 * Clicking a year drills down to its monthly breakdown.
 */
export default function ReserveChart() {
  const { data, isLoading } = useReserveSummary();
  const [year, setYear] = useState<number | null>(null); // null = years view

  const rows: ChartRow[] = useMemo(() => {
    if (!data) return [];
    if (year === null) {
      // Newest year leftmost -> oldest on the right (natural RTL reading).
      return [...data.years]
        .sort((a, b) => b.key - a.key)
        .map((b) => ({ ...b, label: String(b.key) }));
    }
    const months = data.months[String(year)] ?? [];
    const byMonth = new Map(months.map((m) => [m.key, m]));
    // Full Jan..Dec grid, month 1 on the right.
    return Array.from({ length: 12 }, (_, i) => {
      const m = 12 - i;
      const b = byMonth.get(m);
      return {
        key: m,
        label: HEBREW_MONTHS[m - 1].slice(0, 3),
        tzav8: b?.tzav8 ?? 0,
        regular: b?.regular ?? 0,
      };
    });
  }, [data, year]);

  const total = rows.reduce((s, r) => s + r.tzav8 + r.regular, 0);

  const drill = (payload: unknown) => {
    if (year !== null) return;
    const p = payload as { payload?: ChartRow } | undefined;
    const k = p?.payload?.key;
    if (typeof k === "number") setYear(k);
  };

  if (isLoading && !data) {
    return <div className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />;
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-bold text-slate-800">
          {year === null ? "ימי מילואים לפי שנה" : `ימי מילואים ${year} — פירוט חודשי`}
        </h2>
        {year === null ? (
          <span className="text-xs text-slate-400">לחיצה על שנה מציגה פירוט חודשי</span>
        ) : (
          <button
            onClick={() => setYear(null)}
            className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
          >
            <ChevronRight className="h-3.5 w-3.5" />
            חזרה לשנים
          </button>
        )}
        <span className="ms-auto text-xs text-slate-400">
          סה"כ {Math.round(total * 100) / 100} ימים
        </span>
      </div>

      {!rows.length || total === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">
          {year === null ? "אין דיווחי מילואים בגיליון" : "אין דיווחי מילואים בשנה זו"}
        </p>
      ) : (
        <div className="h-72" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
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
                cursor={{ fill: "rgba(37, 99, 235, 0.06)" }}
                formatter={(v, name) => [
                  `${v} ימים`,
                  name === "tzav8" ? "צו 8" : "מילואים רגילים",
                ]}
                labelFormatter={(l) => (year === null ? `שנת ${l}` : String(l))}
                contentStyle={{
                  direction: "rtl",
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Legend
                formatter={(v) => (
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    {v === "tzav8" ? "צו 8" : "מילואים רגילים"}
                  </span>
                )}
              />
              <Bar
                dataKey="regular"
                stackId="reserve"
                fill={COLOR_REGULAR}
                onClick={drill}
                cursor={year === null ? "pointer" : "default"}
                maxBarSize={48}
              />
              <Bar
                dataKey="tzav8"
                stackId="reserve"
                fill={COLOR_TZAV8}
                radius={[4, 4, 0, 0]}
                onClick={drill}
                cursor={year === null ? "pointer" : "default"}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}