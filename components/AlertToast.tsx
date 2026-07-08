"use client";

import { useEffect, useState } from "react";
import { MonthSummary } from "@/lib/types";
import { InfoIcon, XIcon } from "./Icons";

/** Bottom-right (RTL: bottom-left visually mirrored) deficit reminder toast. */
export default function AlertToast({ summary }: { summary: MonthSummary }) {
  const [dismissed, setDismissed] = useState(false);

  // Re-show when the month (and therefore the deficit context) changes.
  useEffect(() => {
    setDismissed(false);
  }, [summary.year, summary.month]);

  if (dismissed || summary.remainingHours <= 0) return null;

  return (
    <div className="fixed bottom-5 left-5 z-40 w-80 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <InfoIcon className="h-5 w-5" />
        </span>
        <div className="text-sm leading-snug">
          <p className="font-bold text-slate-800">תזכורת: יתרת שעות לדיווח</p>
          <p className="mt-0.5 text-slate-500">
            חסרות לך {summary.remainingHours.toFixed(1)} שעות להשלמת התקן (
            {summary.targetHours.toFixed(0)} שעות).
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="סגירה"
          className="ms-auto text-slate-400 hover:text-slate-600"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}