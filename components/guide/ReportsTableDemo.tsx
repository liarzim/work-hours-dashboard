"use client";

import { useState, useEffect } from "react";
import { PencilIcon, ListIcon } from "../Icons";

export default function ReportsTableDemo() {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(timer);
  }, [isPlaying]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-700/30 bg-slate-950 shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-3 text-slate-300 gap-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
          <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
          <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
          <span className="mr-2 text-xs font-bold text-white flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            הדמיה מונפשת בלולאה (Option C) • טבלת הדיווחים ועריכה מהירה
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
          >
            <span>{isPlaying ? "⏸️ השהה" : "▶️ נגן"}</span>
          </button>
          <button
            type="button"
            onClick={() => setStep(0)}
            className="rounded-lg bg-slate-800 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
            title="הפעל מחדש"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Screen Area */}
      <div className="relative bg-slate-100 p-4 sm:p-6 select-none overflow-hidden min-h-[380px]">
        {/* Animated Virtual Cursor */}
        <div
          className={`absolute z-30 transition-all duration-700 pointer-events-none drop-shadow-xl ${
            step === 0
              ? "right-16 top-28"
              : step === 1
              ? "right-12 top-48 scale-90"
              : step === 2
              ? "right-1/2 top-40 scale-90"
              : "right-1/3 top-64 scale-90"
          }`}
        >
          <div className="relative">
            <svg
              className="w-7 h-7 text-slate-950 fill-slate-950 drop-shadow-md"
              viewBox="0 0 24 24"
            >
              <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.43z" />
            </svg>
            {(step === 1 || step === 3) && (
              <span className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-brand-500/50 animate-ping pointer-events-none" />
            )}
          </div>
        </div>

        {/* Table Mockup */}
        <div className="rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-800">דיווחים חודשיים • אוקטובר 2026</span>
            <span className="text-slate-500 font-medium">31 ימים</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {/* Row 1: Regular day */}
            <div className="flex items-center justify-between p-3 hover:bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 p-1">✏️</span>
                <span className="font-bold text-slate-800">01/10/2026 • חמישי</span>
                <span className="rounded-full bg-emerald-50 text-emerald-800 px-2 py-0.5 font-bold">עבודה</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-700">08:00 — 16:30</span>
                <span className="font-black text-brand-700">8.5 שעות</span>
              </div>
            </div>

            {/* Row 2: Multi shift day (Target of click in step 1) */}
            <div
              className={`flex items-center justify-between p-3 transition-all duration-300 ${
                step === 1
                  ? "bg-brand-50/90 ring-2 ring-brand-300"
                  : step >= 2
                  ? "bg-emerald-50/60"
                  : "bg-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`p-1 rounded-lg transition ${
                    step === 1 ? "bg-brand-600 text-white shadow-xs scale-125" : "text-brand-600 hover:bg-brand-50"
                  }`}
                >
                  <PencilIcon className="w-3.5 h-3.5" />
                </span>
                <span className="font-bold text-slate-800">04/10/2026 • ראשון</span>
                <span className="rounded-full bg-blue-50 text-blue-800 px-2 py-0.5 font-bold border border-blue-200">
                  2 מקטעים
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-700">07:45 — 20:00</span>
                <span className="font-black text-brand-700">11.75 שעות (+2.75 ש"נ)</span>
              </div>
            </div>

            {/* Row 3: Holiday */}
            <div className="flex items-center justify-between p-3 bg-purple-50/40">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 p-1">✏️</span>
                <span className="font-bold text-slate-800">05/10/2026 • שני</span>
                <span className="rounded-full bg-purple-100 text-purple-800 px-2 py-0.5 font-bold">חג סוכות</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400">—</span>
                <span className="font-bold text-purple-700">שעות תקן משולמות</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Overlay in Step 2 */}
        {step === 2 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <h5 className="text-xs font-black text-slate-900">עריכת דיווח: 04/10/2026</h5>
                <span className="text-xs text-slate-400">✕</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="rounded-lg bg-brand-50 p-2 text-brand-800 font-bold">
                  מקטע 1: 07:45 - 12:00 (4.25 שעות)
                </div>
                <div className="rounded-lg bg-brand-50 p-2 text-brand-800 font-bold">
                  מקטע 2: 12:30 - 20:00 (7.5 שעות)
                </div>
                <div className="rounded-lg bg-emerald-500 text-white font-bold p-2 text-center shadow-xs">
                  ✓ נתוני היום מעודכנים במלואם!
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast in Step 3 */}
        {step === 3 && (
          <div className="mt-3 rounded-xl bg-slate-900 text-white p-2.5 text-center text-xs font-extrabold shadow-lg animate-pulse">
            ✨ כל לחיצה על כפתור העיפרון פותחת עריכה מיידית מעל המסך ללא איבוד הקשר!
          </div>
        )}
      </div>

      {/* Progress Timeline Tabs */}
      <div className="border-t border-slate-800 bg-slate-950 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-center text-xs">
          {[
            { num: 1, label: "תצוגת הטבלה והסיווגים" },
            { num: 2, label: "לחיצה על העיפרון" },
            { num: 3, label: "עריכה ישירה בחלון" },
            { num: 4, label: "שמירה ועדכון שורה" },
          ].map((st, i) => (
            <button
              key={st.num}
              type="button"
              onClick={() => setStep(i)}
              className={`rounded-xl p-2.5 transition text-center min-h-[58px] flex flex-col justify-center ${
                step === i
                  ? "bg-brand-600 text-white font-black shadow-md ring-2 ring-brand-400/50"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <div className="text-[10px] opacity-75 font-semibold">שלב {st.num}</div>
              <div className="text-xs font-bold mt-0.5 leading-snug break-words">{st.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
