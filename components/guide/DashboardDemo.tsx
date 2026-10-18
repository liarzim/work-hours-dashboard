"use client";

import { useState, useEffect } from "react";
import { ClockIcon, CalendarIcon, GridIcon } from "../Icons";

export default function DashboardDemo() {
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
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-3 text-slate-300 gap-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
          <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
          <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
          <span className="mr-2 text-xs font-bold text-white flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            הדמיה מונפשת בלולאה (Option C) • לוח הבקרה והמדדים החודשיים
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
              ? "right-20 top-20"
              : step === 1
              ? "right-1/2 top-48 scale-90"
              : step === 2
              ? "right-28 top-32 scale-90"
              : "right-16 top-16 scale-90"
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

        {/* Dashboard Simulation */}
        <div className="space-y-4">
          {/* Month Bar */}
          <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-xs border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700 font-bold text-xs">
                📅
              </span>
              <div>
                <span className="text-xs font-extrabold text-slate-800">
                  {step === 3 ? "נובמבר 2026 (תחזית)" : "אוקטובר 2026"}
                </span>
                <span className="block text-[10px] text-slate-400">תקן חודשי: 182 שעות • 21 ימי עבודה</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="rounded-lg bg-slate-100 px-2 py-1 font-bold text-slate-600">◀ חודש קודם</span>
              <span className={`rounded-lg px-2.5 py-1 font-bold transition ${step === 3 ? "bg-brand-600 text-white shadow-xs" : "bg-brand-50 text-brand-700"}`}>
                חודש הבא ▶
              </span>
            </div>
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* KPI 1 */}
            <div className={`rounded-xl border p-3 transition duration-500 ${step === 0 ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200" : "bg-white border-slate-200"}`}>
              <span className="text-[10px] font-bold text-slate-500 block">שעות שדווחו</span>
              <div className="text-lg font-black text-brand-700">152.0 <span className="text-xs font-medium text-slate-400">/ 182</span></div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-brand-600 rounded-full transition-all duration-700" style={{ width: step === 3 ? "15%" : "83%" }} />
              </div>
            </div>

            {/* KPI 2 */}
            <div className={`rounded-xl border p-3 transition duration-500 ${step === 2 ? "bg-amber-50 border-amber-300 ring-2 ring-amber-200" : "bg-white border-slate-200"}`}>
              <span className="text-[10px] font-bold text-slate-500 block">שעות שנותרו</span>
              <div className="text-lg font-black text-amber-700">30.0 <span className="text-xs font-semibold text-slate-500">שעות</span></div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded">
                כ-7.5 שע׳ ליום
              </span>
            </div>

            {/* KPI 3 */}
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <span className="text-[10px] font-bold text-slate-500 block">יתרת חופשה</span>
              <div className="text-lg font-black text-purple-700">14.5 <span className="text-xs font-normal text-slate-400">ימים</span></div>
              <span className="text-[10px] text-purple-600 font-medium">נוצלו החודש: 1.0</span>
            </div>

            {/* KPI 4 */}
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <span className="text-[10px] font-bold text-slate-500 block">שעות נוספות</span>
              <div className="text-lg font-black text-indigo-700">+12.5 <span className="text-xs font-normal text-slate-400">ש"נ</span></div>
              <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5">
                שווי: 1,625 ₪
              </span>
            </div>
          </div>

          {/* Daily Bar Chart Simulation */}
          <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
                <ClockIcon className="w-4 h-4 text-brand-600" />
                <span>פעילות שעות יומית לאורך החודש</span>
              </div>
              {step === 1 && (
                <span className="rounded-full bg-brand-600 text-white text-[10px] font-bold px-2 py-0.5 animate-pulse">
                  ריחוף: יום 14/10 נבחר
                </span>
              )}
            </div>

            {/* Simulated bars */}
            <div className="relative flex items-end justify-between gap-1 h-24 pt-4 px-2 border-b border-slate-100">
              {[
                { d: 1, h: 9 }, { d: 2, h: 9 }, { d: 3, h: 0 }, { d: 4, h: 11.75 }, { d: 5, h: 9 },
                { d: 6, h: 9 }, { d: 7, h: 9 }, { d: 8, h: 9 }, { d: 9, h: 0 }, { d: 10, h: 0 },
                { d: 11, h: 9 }, { d: 12, h: 9 }, { d: 13, h: 9 }, { d: 14, h: 10.6 }, { d: 15, h: 8.5 },
                { d: 16, h: 9 }, { d: 17, h: 0 }, { d: 18, h: 0 }, { d: 19, h: 9 }, { d: 20, h: 9 },
              ].map((bar, i) => {
                const isTarget = bar.d === 14;
                const heightPct = bar.h === 0 ? "4%" : `${(bar.h / 12) * 100}%`;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div
                      style={{ height: heightPct }}
                      className={`w-full max-w-[14px] rounded-t-sm transition-all duration-300 ${
                        bar.h === 0
                          ? "bg-slate-200"
                          : isTarget && step === 1
                          ? "bg-amber-500 ring-2 ring-amber-300 shadow-md scale-110"
                          : bar.h > 9
                          ? "bg-indigo-600"
                          : "bg-brand-600"
                      }`}
                    />
                  </div>
                );
              })}

              {/* Hover Tooltip on Step 1 */}
              {step === 1 && (
                <div className="absolute top-1 left-1/3 z-20 rounded-xl bg-slate-900 text-white p-2 text-center text-xs shadow-xl animate-fade-in pointer-events-none">
                  <div className="font-bold text-amber-300">יום 14/10/2026 (רביעי)</div>
                  <div className="text-[11px] text-slate-200 font-semibold">10.6 שעות עבודה • 2 מקטעים</div>
                  <div className="text-[10px] text-indigo-300 font-extrabold">+1.6 שעות נוספות (125%)</div>
                </div>
              )}
            </div>

            {/* Forecast Banner on Step 2 */}
            {step === 2 && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900 animate-fadeIn">
                <span className="font-bold">🎯 תחזית מומלצת: נותרו 4 ימי עבודה פוטנציאליים</span>
                <span className="font-extrabold bg-amber-200/80 px-2 py-0.5 rounded-lg">7.5 שעות בממוצע ליום</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Timeline Tabs */}
      <div className="border-t border-slate-800 bg-slate-950 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-center text-xs">
          {[
            { num: 1, label: "מדדי KPI ויעד חודשי" },
            { num: 2, label: "גרף שעות ופירוט יומי" },
            { num: 3, label: "תחזית עבודה להשלמה" },
            { num: 4, label: "דפדוף בין חודשים" },
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
