"use client";

import { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, ClockIcon } from "../Icons";

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
      {/* Simulation Header */}
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
      <div className="relative bg-slate-100 p-4 sm:p-6 select-none overflow-hidden min-h-[420px]">
        {/* Modal Simulator Replica */}
        <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-xl border border-slate-200 max-w-lg mx-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h4 className="text-sm font-black text-slate-900">דיווח נוכחות יומי</h4>
              <p className="text-[11px] text-slate-500">יום רביעי, 14/10/2026 • יום עבודה</p>
            </div>
            <span className="rounded-md bg-brand-50 border border-brand-200 px-2.5 py-0.5 text-xs font-bold text-brand-700">
              {step <= 1 ? "משמרת רגילה" : "פיצול ל-2 מקטעים"}
            </span>
          </div>

          {/* Working Hours Container (Exact replica of real ReportModal) */}
          <div className="rounded-2xl bg-brand-50/60 p-4 border border-brand-100/90 transition-all duration-500">
            {/* Top Bar of Working Hours Block */}
            <div className="mb-3 flex items-center justify-between gap-2">
              {/* Right in RTL: Title & Hours Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-brand-700">שעות עבודה (פורמט 24H)</span>
                {step >= 2 && (
                  <div className="relative inline-flex">
                    <span
                      className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs transition-all duration-300 ${
                        step === 3
                          ? "bg-brand-600 ring-2 ring-brand-300 scale-105"
                          : "bg-brand-600"
                      }`}
                    >
                      סה״כ: 8:30 (8.5 שע׳)
                    </span>
                    {/* Step 3 Cursor on the total badge */}
                    {step === 3 && (
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none drop-shadow-xl animate-pulse">
                        <div className="relative">
                          <svg
                            className="w-6 h-6 text-slate-950 fill-slate-950 drop-shadow-md -rotate-45"
                            viewBox="0 0 24 24"
                          >
                            <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.43z" />
                          </svg>
                          <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-brand-500/50 animate-ping pointer-events-none" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Left in RTL: Action Button / Link */}
              {step <= 1 ? (
                /* Single shift view: Button "פיצול למקטעים" */
                <div className="relative inline-flex">
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1.5 rounded-xl border bg-white px-3 py-1.5 text-xs font-semibold text-brand-600 shadow-2xs transition-all duration-300 ${
                      step === 1
                        ? "border-brand-500 ring-2 ring-brand-300 bg-brand-50/80 scale-105"
                        : "border-brand-200 hover:bg-brand-50"
                    }`}
                  >
                    <span>פיצול למקטעים</span>
                    <PlusIcon className="w-3.5 h-3.5" />
                  </button>

                  {/* Step 1 Virtual Cursor sitting DIRECTLY on the button! */}
                  {step === 1 && (
                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 z-40 pointer-events-none drop-shadow-xl animate-pulse">
                      <div className="relative">
                        <svg
                          className="w-6 h-6 text-slate-950 fill-slate-950 drop-shadow-md -rotate-45"
                          viewBox="0 0 24 24"
                        >
                          <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.43z" />
                        </svg>
                        <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-brand-500/50 animate-ping pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Multi shift view: Link "חזרה למשמרת רציפה" */
                <span className="text-xs font-semibold text-brand-600 underline cursor-pointer hover:text-brand-800 transition">
                  חזרה למשמרת רציפה
                </span>
              )}
            </div>

            {/* Content according to step */}
            {step <= 1 ? (
              /* Single Shift (1:1 with Screenshot 2) */
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">כניסה</label>
                  <div className="rounded-xl border border-transparent bg-white px-3 py-2.5 text-center text-sm font-bold text-brand-700 shadow-xs">
                    08:00
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">יציאה</label>
                  <div className="rounded-xl border border-transparent bg-white px-3 py-2.5 text-center text-sm font-bold text-brand-700 shadow-xs">
                    17:00
                  </div>
                </div>
              </div>
            ) : (
              /* Multi Shift Segments (1:1 with Screenshot 3) */
              <div className="space-y-3 animate-fadeIn">
                {/* Segment 1 */}
                <div className="relative rounded-xl border border-brand-200/90 bg-white p-3 shadow-xs">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-[11px] font-extrabold text-brand-700">
                        1
                      </span>
                      <span className="text-xs font-bold text-slate-800">מקטע 1</span>
                    </div>
                    <span className="rounded-lg p-1 text-slate-400 hover:text-rose-500 cursor-pointer">
                      <TrashIcon className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-500">כניסה</label>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-center text-xs font-bold text-brand-700">
                        08:00
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-500">יציאה</label>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-center text-xs font-bold text-brand-700">
                        12:00
                      </div>
                    </div>
                  </div>
                </div>

                {/* Segment 2 */}
                <div
                  className={`relative rounded-xl border bg-white p-3 shadow-xs transition-all duration-300 ${
                    step === 2
                      ? "border-brand-500 ring-2 ring-brand-200"
                      : "border-brand-200/90"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-[11px] font-extrabold text-brand-700">
                        2
                      </span>
                      <span className="text-xs font-bold text-slate-800">מקטע 2</span>
                    </div>
                    <span className="rounded-lg p-1 text-slate-400 hover:text-rose-500 cursor-pointer">
                      <TrashIcon className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <label className="mb-1 block text-[11px] font-medium text-slate-500">כניסה</label>
                      <div className="rounded-lg border border-brand-300 bg-brand-50/40 px-2.5 py-1.5 text-center text-xs font-bold text-brand-700">
                        12:30
                      </div>
                      {/* Step 2 Cursor pointing to the entry of segment 2 */}
                      {step === 2 && (
                        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 z-40 pointer-events-none drop-shadow-xl animate-pulse">
                          <div className="relative">
                            <svg
                              className="w-6 h-6 text-slate-950 fill-slate-950 drop-shadow-md -rotate-45"
                              viewBox="0 0 24 24"
                            >
                              <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.43z" />
                            </svg>
                            <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-brand-500/50 animate-ping pointer-events-none" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-500">יציאה</label>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-center text-xs font-bold text-brand-700">
                        17:00
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add Additional Segment Button */}
                <div className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-300 bg-white/70 py-2 text-xs font-bold text-brand-600 hover:bg-brand-50/50 transition shadow-2xs">
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>הוסף מקטע עבודה נוסף</span>
                </div>
              </div>
            )}
          </div>

          {/* Summary Toast on Step 3 */}
          {step === 3 && (
            <div className="mt-3 rounded-xl bg-emerald-600 p-2.5 text-center text-xs font-bold text-white shadow-lg animate-fadeIn flex items-center justify-center gap-1.5">
              <span>🎉</span>
              <span>חישוב נטו מושלם: 8.5 שעות נטו (חצי שעה הפסקה בין 12:00 ל-12:30 קוזזה אוטומטית)</span>
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
            { num: 3, label: "פיצול ל-2 מקטעים" },
            { num: 4, label: "חישוב שעות נטו מדויק" },
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
