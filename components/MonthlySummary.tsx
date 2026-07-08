"use client";

import { MonthSummary } from "@/lib/types";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-bold text-brand-700">{value}</span>
    </div>
  );
}

export default function MonthlySummary({ summary }: { summary: MonthSummary }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
      <h2 className="mb-4 text-sm font-bold text-slate-800">סיכום סטטוס חודשי</h2>
      <div className="space-y-3">
        <Row label="יעד שעות" value={summary.targetHours.toFixed(1)} />
        <Row label="דווח בפועל" value={summary.reportedHours.toFixed(1)} />
        <Row label="יתרה להשלמה" value={summary.remainingHours.toFixed(1)} />

        <div className="rounded-xl bg-brand-600 px-4 py-4 text-white">
          <p className="text-xs font-medium text-brand-100">תחזית המשך עבודה:</p>
          <p className="mt-1 text-2xl font-bold">
            {summary.forecastHoursPerDay.toFixed(1)}{" "}
            <span className="text-base font-semibold">שעות/יום</span>
          </p>
          <p className="mt-1 text-xs text-brand-100">
            נותרו {summary.remainingWorkdays} ימי עבודה פוטנציאליים
          </p>
        </div>
      </div>
    </section>
  );
}