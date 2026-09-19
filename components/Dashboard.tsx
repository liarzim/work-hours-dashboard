"use client";

import { MonthData } from "@/lib/types";
import KpiCards from "./KpiCards";
import MonthlySummary from "./MonthlySummary";
import DailyChart from "./DailyChart";
import ReserveChart from "./ReserveChart";
import AlertToast from "./AlertToast";

/** yyyy-mm-dd -> dd/mm/yyyy for the info banner. */
function formatIso(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

interface Props {
  data?: MonthData;
  loading: boolean;
  year: number;
  month: number;
}

export default function Dashboard({ data, loading, year, month }: Props) {
  if (loading && !data) {
    return (
      <div className="grid animate-pulse gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-200/60" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-96 rounded-2xl bg-slate-200/60" />
          <div className="h-96 rounded-2xl bg-slate-200/60 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { summary, records } = data;

  return (
    <div className="space-y-4">
      {data.mode === "mock" ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
          <span>מצב הדגמה — הנתונים אינם נשמרים בענן. כדי לשמור, יש להגדיר פרויקט ב-Supabase ולחבר את משתני הסביבה.</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-2 text-xs text-emerald-700">
          <span>
            מחובר למסד הנתונים Supabase
            {data.info.totalRecords > 0 && (
              <span className="text-emerald-600/80">
                {" "}
                · נטענו {data.info.totalRecords.toLocaleString()} דיווחים בסך הכל
                {data.info.firstDate && data.info.lastDate && (
                  ` (${formatIso(data.info.firstDate)} — ${formatIso(data.info.lastDate)})`
                )}
              </span>
            )}
          </span>
          {summary.activeEmploymentTerm && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-normal">תנאי העסקה לחודש זה:</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100/90 px-2 py-0.5 font-medium text-emerald-800 border border-emerald-200">
                {summary.activeEmploymentTerm.name}
                <span className="text-emerald-600">({summary.activeEmploymentTerm.jobScopePct}%)</span>
              </span>
            </div>
          )}
        </div>
      )}

      <KpiCards summary={summary} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MonthlySummary summary={summary} />
        <div className="lg:col-span-2">
          <DailyChart records={records} year={year} month={month} />
        </div>
      </div>

      <ReserveChart />

      <AlertToast summary={summary} />
    </div>
  );
}