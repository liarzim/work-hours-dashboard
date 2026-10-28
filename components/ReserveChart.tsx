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
  fullLabel?: string;
  tzav8: number;
  regular: number;
  total: number;
}

function CustomTooltip({
  active,
  payload,
  label,
  currentYear,
}: {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  currentYear: number | null;
}) {
  if (!active || !payload || !payload.length) return null;

  const dataRow = payload[0]?.payload as ChartRow | undefined;
  if (!dataRow) return null;

  const regular = dataRow.regular ?? 0;
  const tzav8 = dataRow.tzav8 ?? 0;
  const total = dataRow.total ?? Math.round((regular + tzav8) * 100) / 100;
  const title = currentYear === null ? `שנת ${label}` : `${dataRow.fullLabel || label} ${currentYear}`;

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
              style={{ backgroundColor: COLOR_REGULAR }}
            />
            <span>מילואים רגילים:</span>
          </span>
          <span className="font-bold text-slate-800">{regular} ימים</span>
        </div>

        <div className="flex items-center justify-between gap-4 text-slate-600">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: COLOR_TZAV8 }}
            />
            <span>צו 8:</span>
          </span>
          <span className="font-bold text-slate-800">{tzav8} ימים</span>
        </div>
      </div>

      <div className="-mx-3 -mb-3 mt-2.5 flex items-center justify-between rounded-b-xl border-t border-slate-100 bg-slate-50/90 px-3 py-2 font-bold text-slate-900">
        <span className="text-slate-700">סה״כ ימי מילואים:</span>
        <span className="text-[13px] font-extrabold text-brand-700">{total} ימים</span>
      </div>
    </div>
  );
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
        .map((b) => ({
          ...b,
          label: String(b.key),
          fullLabel: `שנת ${b.key}`,
          total: Math.round((b.tzav8 + b.regular) * 100) / 100,
        }));
    }
    const months = data.months[String(year)] ?? [];
    const byMonth = new Map(months.map((m) => [m.key, m]));
    // Full Jan..Dec grid, month 1 on the right.
    return Array.from({ length: 12 }, (_, i) => {
      const m = 12 - i;
      const b = byMonth.get(m);
      const tzav8 = b?.tzav8 ?? 0;
      const regular = b?.regular ?? 0;
      return {
        key: m,
        label: HEBREW_MONTHS[m - 1].slice(0, 3),
        fullLabel: HEBREW_MONTHS[m - 1],
        tzav8,
        regular,
        total: Math.round((tzav8 + regular) * 100) / 100,
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
            className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200 cursor-pointer"
          >
            <ChevronRight className="h-3.5 w-3.5" />
            חזרה לשנים
          </button>
        )}
        <span className="ms-auto text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
          {year === null
            ? `סה"כ כל השנים: ${Math.round(total * 100) / 100} ימים`
            : `סה"כ שנת ${year}: ${Math.round(total * 100) / 100} ימים`}
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
                content={(props: any) => <CustomTooltip {...props} currentYear={year} />}
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
