"use client";

import { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, SparklesIcon, ClockIcon } from "../Icons";

export default function ShiftsDemo() {
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
            הדמיה מונפשת בלולאה (Option C) • דיווח שעות ופיצול משמרות
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
              ? "right-24 top-20"
              : step === 1
              ? "right-1/3 top-36 scale-90"
              : step === 2
              ? "right-1/2 top-52 scale-90"
              : "right-16 top-64 scale-90"
          }`}
        >
          <div className="relative">
            <svg
              className="w-7 h-7 text-slate-950 fill-slate-950 drop-shadow-md"
              viewBox="0 0 24 24"
            >
              <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.43z" />
            </svg>
            {(step === 0 || step === 1) && (
              <span className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-brand-500/50 animate-ping pointer-events-none" />
            )}
          </div>
        </div>

        {/* Modal Simulator */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xl border border-slate-200 max-w-lg mx-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h4 className="text-sm font-black text-slate-900">דיווח נוכחות יומי</h4>
              <p className="text-[11px] text-slate-500">יום רביעי, 14/10/2026 • יום עבודה</p>
            </div>
            <span className="rounded-md bg-brand-50 border border-brand-200 px-2.5 py-0.5 text-xs font-bold text-brand-700">
              {step === 0 ? "משמרת יחידה" : "פיצול ל-2 מקטעים"}
            </span>
          </div>

          {/* Working Hours Container */}
          <div className="rounded-2xl bg-brand-50/60 p-4 border border-brand-100/90 transition-all duration-500">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-brand-800">שעות עבודה (24H)</span>
                {step >= 1 ? (
                  <span className="rounded-md bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
                    סה״כ נטו: 8.5 שעות (8:30)
                  </span>
                ) : (
                  <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                    סה״כ: 9.0 שעות
                  </span>
                )}
              </div>
              <button
                type="button"
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  step === 0
                    ? "bg-brand-600 text-white shadow-xs ring-2 ring-brand-300 scale-105"
                    : "bg-white text-brand-700 border border-brand-200"
                }`}
              >
                {step === 0 ? "+ פיצול למקטעים" : "חזרה למשמרת רציפה"}
              </button>
            </div>

            {/* Content according to step */}
            {step === 0 ? (
              /* Single Shift */
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white p-2.5 border border-slate-200">
                  <span className="block text-[11px] text-slate-400 mb-1">כניסה</span>
                  <div className="text-sm font-bold text-brand-700">08:00</div>
                </div>
                <div className="rounded-xl bg-white p-2.5 border border-slate-200">
                  <span className="block text-[11px] text-slate-400 mb-1">יציאה</span>
                  <div className="text-sm font-bold text-brand-700">17:00</div>
                </div>
              </div>
            ) : (
              /* Multi Shift Segments */
              <div className="space-y-2.5 animate-fadeIn">
                {/* Segment 1 */}
                <div className="rounded-xl bg-white p-2.5 border border-brand-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span className="h-4 w-4 rounded-full bg-brand-100 text-brand-800 text-[10px] flex items-center justify-center font-bold">1</span>
                      מקטע בוקר
                    </span>
                    <span className="text-[11px] font-bold text-brand-600">4.0 שעות</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 rounded-lg p-1.5 text-center font-bold text-slate-800 border border-slate-200">
                      כניסה: 08:00
                    </div>
                    <div className="bg-slate-50 rounded-lg p-1.5 text-center font-bold text-slate-800 border border-slate-200">
                      יציאה: 12:00
                    </div>
                  </div>
                </div>

                {/* Break indicator */}
                <div className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 py-1 text-[11px] font-bold text-amber-900">
                  <span>⏸️ הפסקה / יציאה לסידורים (12:00 עד 14:00) • לא נספרת בשעות!</span>
                </div>

                {/* Segment 2 */}
                <div className="rounded-xl bg-white p-2.5 border border-brand-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span className="h-4 w-4 rounded-full bg-brand-100 text-brand-800 text-[10px] flex items-center justify-center font-bold">2</span>
                      מקטע המשך (ערב)
                    </span>
                    <span className="text-[11px] font-bold text-brand-600">4.5 שעות</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 rounded-lg p-1.5 text-center font-bold text-slate-800 border border-slate-200">
                      כניסה: 14:00
                    </div>
                    <div className="bg-slate-50 rounded-lg p-1.5 text-center font-bold text-slate-800 border border-slate-200">
                      יציאה: 18:30
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary Toast on Step 3 */}
          {step === 3 && (
            <div className="mt-3 rounded-xl bg-emerald-600 p-2.5 text-center text-xs font-black text-white shadow-lg animate-pulse">
              🎉 חישוב נטו מושלם: 8.5 שעות נזקפו בדיוק ללא שעות סרק!
            </div>
          )}
        </div>
      </div>

      {/* Progress Timeline Tabs */}
      <div className="border-t border-slate-800 bg-slate-950 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-center text-xs">
          {[
            { num: 1, label: "משמרת רגילה" },
            { num: 2, label: "לחיצה על 'פיצול למקטעים'" },
            { num: 3, label: "הזנת שעות נפרדות" },
            { num: 4, label: "חישוב שעות נטו מדויק" },
          ].map((st, i) => (
            <button
              key={st.num}
              type="button"
              onClick={() => setStep(i)}
              className={`rounded-xl p-2.5 transition text-right sm:text-center ${
                step === i
                  ? "bg-brand-600 text-white font-black shadow-md ring-2 ring-brand-400/50"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <div className="text-[10px] opacity-75 font-semibold">שלב {st.num}</div>
              <div className="truncate text-xs font-bold mt-0.5">{st.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
