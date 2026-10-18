"use client";

import { useState, useEffect } from "react";
import {
  ClockIcon,
  PlusIcon,
  ChevronRight,
  ChevronLeft,
  GridIcon,
  ListIcon,
  ShieldIcon,
  BookOpenIcon,
  RefreshIcon,
  LogOutIcon,
  TrendIcon,
  UmbrellaIcon,
  BriefcaseIcon,
  AlertTriangleIcon,
} from "../Icons";

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
      {/* Simulation Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-3 text-slate-300 gap-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
          <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
          <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
          <span className="mr-2 text-xs font-bold text-white flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            הדמיה מונפשת (1:1 למסך האמיתי) • לוח בקרה
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

      {/* Screen Container (Exact replica of real application layout) */}
      <div className="relative bg-[#f8fafc] p-3 sm:p-5 select-none overflow-hidden min-h-[520px]">
        {/* 1. REAL HEADER REPLICA */}
        <header className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Title (Right in RTL) */}
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-xs">
                <ClockIcon className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <div className="text-sm font-bold text-slate-900">ניהול דיווח שעות</div>
                <div className="text-[10px] font-medium tracking-wide text-slate-400">
                  24H WORK DASHBOARD
                </div>
              </div>
            </div>

            {/* Navigation Tabs (Center) */}
            <nav className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs">
              <span className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-bold text-brand-700 shadow-xs border border-slate-200/80">
                <GridIcon className="h-3.5 w-3.5" />
                <span>לוח בקרה</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 font-medium text-slate-600">
                <ListIcon className="h-3.5 w-3.5" />
                <span>דיווחים</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 font-medium text-slate-600">
                <BookOpenIcon className="h-3.5 w-3.5" />
                <span>הדרכה</span>
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 font-medium text-slate-600">
                <ShieldIcon className="h-3.5 w-3.5" />
                <span>הגדרות</span>
              </span>
            </nav>

            {/* Controls (Left in RTL) */}
            <div className="flex items-center gap-2">
              <div
                className={`relative flex items-center rounded-xl border bg-slate-50 px-2.5 py-1 text-xs font-bold gap-1.5 transition-all duration-300 ${
                  step === 3
                    ? "border-brand-500 ring-2 ring-brand-300 text-brand-700 bg-brand-50/70 shadow-sm scale-105"
                    : "border-slate-200 text-slate-700"
                }`}
              >
                {step === 3 && (
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none drop-shadow-xl animate-pulse">
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
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <span>אוקטובר 2026</span>
                <ChevronLeft className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <span className="rounded-xl border border-slate-200 bg-slate-50 p-1.5 text-slate-500">
                <RefreshIcon className="h-3.5 w-3.5" />
              </span>
              <span className="rounded-xl border border-slate-200 bg-slate-50 p-1.5 text-slate-500">
                <LogOutIcon className="h-3.5 w-3.5" />
              </span>
              <span className="flex items-center gap-1 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs">
                <PlusIcon className="h-3.5 w-3.5" />
                <span>דיווח חדש</span>
              </span>
            </div>
          </div>
        </header>

        {/* 2. REAL STATUS BANNER REPLICA */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200/90 bg-emerald-50/70 px-4 py-2 text-xs text-emerald-900 shadow-2xs mb-4">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-emerald-950">מחובר למסד הנתונים Supabase</span>
            <span className="text-emerald-800 text-[11px]">
              · נטענו 3,013 דיווחים בסך הכל (01/10/2019 — 30/12/2027)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-normal">תנאי העסקה לחודש זה:</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100/90 px-2 py-0.5 font-bold text-emerald-800 border border-emerald-200 text-[11px]">
              חודשי עם שעות נוספות (ברירת מחדל)
              <span className="text-emerald-700">(100%)</span>
            </span>
          </div>
        </div>

        {/* 3. REAL 5 KPI CARDS REPLICA */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 mb-4">
          {/* Card 1: שעות שדווחו */}
          <div
            className={`relative rounded-2xl bg-white p-4 shadow-card transition-all duration-300 ${
              step === 0
                ? "border-2 border-brand-500 ring-2 ring-brand-100 shadow-md scale-[1.02]"
                : "border border-slate-100"
            }`}
          >
            {step === 0 && (
              <div className="absolute -top-3 -right-3 z-30 pointer-events-none drop-shadow-xl animate-pulse">
                <div className="relative">
                  <svg
                    className="w-6 h-6 text-slate-950 fill-slate-950 drop-shadow-md"
                    viewBox="0 0 24 24"
                  >
                    <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.43z" />
                  </svg>
                  <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-brand-500/50 animate-ping pointer-events-none" />
                </div>
              </div>
            )}
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <p className="text-xs text-slate-500 font-medium">שעות שדווחו</p>
                <p className="text-xl font-black text-slate-900">84.8 <span className="text-sm font-normal text-slate-500">שעות</span></p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <ClockIcon className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-2.5 text-[11px] text-slate-400">
              <div>מתוך יעד של 189.0</div>
              <div className="font-bold text-indigo-600 mt-0.5 flex items-center gap-1">
                <span>⏱️ 7.2 שעות נוספות</span>
                <span className="text-emerald-600 font-semibold">(תוספת 202.5 ₪)</span>
              </div>
            </div>
          </div>

          {/* Card 2: שעות שנותרו */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <p className="text-xs text-slate-500 font-medium">שעות שנותרו</p>
                <p className="text-xl font-black text-slate-900">104.2 <span className="text-sm font-normal text-slate-500">שעות</span></p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <TrendIcon className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-2.5 text-[11px] text-slate-400">
              <div>כ- 11.6 ליום</div>
            </div>
          </div>

          {/* Card 3: יתרת חופשה לניצול */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <p className="text-xs text-slate-500 font-medium">יתרת חופשה לניצול</p>
                <p className="text-xl font-black text-rose-600">45.3 <span className="text-sm font-normal text-rose-500">ימים</span></p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <UmbrellaIcon className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-2.5 text-[11px] text-slate-400">
              <div>1 נוצלו החודש</div>
              <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                הערכה לסוף השנה (כולל עתידיים): 49.0 ימים
              </div>
            </div>
          </div>

          {/* Card 4: מילואים / מחלה */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <p className="text-xs text-slate-500 font-medium">מילואים / מחלה</p>
                <p className="text-xl font-black text-slate-900">0 / 3</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <BriefcaseIcon className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-2.5 text-[11px] text-slate-400">
              <div>ימי היעדרות החודש</div>
            </div>
          </div>

          {/* Card 5: דיווחים חסרים */}
          <div className={`rounded-2xl bg-white p-4 shadow-card transition-all duration-300 ${
            step === 0
              ? "border-2 border-amber-300 ring-2 ring-amber-100"
              : "border border-slate-100"
          }`}>
            <div className="flex items-start justify-between">
              <div className="space-y-0.5">
                <p className="text-xs text-slate-500 font-medium">דיווחים חסרים</p>
                <p className="text-xl font-black text-emerald-600">0 ימים</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <AlertTriangleIcon className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-2.5 text-[11px] font-bold text-emerald-700">
              מעולה! אין דיווחים חסרים
            </div>
          </div>
        </div>

        {/* 4. REAL DAILY CHART & MONTHLY SUMMARY ROW */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Monthly Summary */}
          <div
            className={`relative rounded-2xl bg-white p-4 shadow-card space-y-2.5 text-xs transition-all duration-300 ${
              step === 2
                ? "border-2 border-brand-500 ring-2 ring-brand-100 shadow-md scale-[1.01]"
                : "border border-slate-100"
            }`}
          >
            {step === 2 && (
              <div className="absolute -top-3 -right-3 z-30 pointer-events-none drop-shadow-xl animate-pulse">
                <div className="relative">
                  <svg
                    className="w-6 h-6 text-slate-950 fill-slate-950 drop-shadow-md"
                    viewBox="0 0 24 24"
                  >
                    <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.43z" />
                  </svg>
                  <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-brand-500/50 animate-ping pointer-events-none" />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800">סיכום סטטוס חודשי</h3>
              <span className="text-[11px] font-semibold text-indigo-600">פירוט ש"נ ⏱️</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
              <span className="text-slate-600">יעד חודשי:</span>
              <span className="font-bold text-brand-700">189.0 שעות</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
              <span className="text-slate-600">דווח עד כה:</span>
              <span className="font-bold text-brand-700">84.8 שעות</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
              <span className="text-slate-600">נותרו להשלמה:</span>
              <span className="font-bold text-brand-700">104.2 שעות</span>
            </div>
          </div>

          {/* Daily Bar Chart */}
          <div
            className={`lg:col-span-2 rounded-2xl bg-white p-4 shadow-card transition-all duration-300 ${
              step === 1 ? "border-2 border-brand-500 ring-2 ring-brand-100" : "border border-slate-100"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-800">פעילות שעות יומית</h3>
              {step === 1 && (
                <span className="rounded-full bg-brand-600 text-white text-[10px] font-bold px-2 py-0.5 animate-pulse">
                  ריחוף: יום 14/10 נבחר
                </span>
              )}
            </div>
            <div className="relative flex items-end justify-between gap-1 h-36 pt-10 px-2 border-b border-slate-100">
              {[
                { d: 1, h: 9 }, { d: 2, h: 9 }, { d: 3, h: 0 }, { d: 4, h: 11.75 }, { d: 5, h: 9 },
                { d: 6, h: 9 }, { d: 7, h: 9 }, { d: 8, h: 9 }, { d: 9, h: 0 }, { d: 10, h: 0 },
                { d: 11, h: 9 }, { d: 12, h: 9 }, { d: 13, h: 9 }, { d: 14, h: 10.6 }, { d: 15, h: 8.5 },
                { d: 16, h: 9 }, { d: 17, h: 0 }, { d: 18, h: 0 }, { d: 19, h: 9 }, { d: 20, h: 9 },
              ].map((bar, i) => {
                const isTarget = bar.d === 14;
                const heightPct = bar.h === 0 ? "4%" : `${(bar.h / 12) * 100}%`;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center h-full justify-end relative">
                    {/* Tooltip & Cursor directly on Day 14 bar */}
                    {isTarget && step === 1 && (
                      <>
                        {/* Hover Tooltip Popup */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-40 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white shadow-xl flex items-center gap-1.5 border border-slate-700 pointer-events-none animate-bounce">
                          <span>14/10:</span>
                          <span className="text-amber-400 font-black">10.6 ש'</span>
                          <span className="text-[10px] text-emerald-400 font-semibold">(+1.6 ש"נ)</span>
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-r border-b border-slate-700" />
                        </div>

                        {/* Virtual Cursor directly on the bar */}
                        <div className="absolute -top-5 -right-2 z-50 pointer-events-none drop-shadow-xl animate-pulse">
                          <div className="relative">
                            <svg
                              className="w-6 h-6 text-slate-950 fill-slate-950 drop-shadow-md"
                              viewBox="0 0 24 24"
                            >
                              <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.43z" />
                            </svg>
                            <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-500/50 animate-ping pointer-events-none" />
                          </div>
                        </div>
                      </>
                    )}
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
            </div>
          </div>
        </div>
      </div>

      {/* Progress Timeline Tabs */}
      <div className="border-t border-slate-800 bg-slate-950 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-center text-xs">
          {[
            { num: 1, label: "5 כרטיסי KPI ומדדים" },
            { num: 2, label: "גרף שעות וריחוף יומי" },
            { num: 3, label: "סיכום סטטוס ותחזית" },
            { num: 4, label: "תפריט וסרגל ניווט" },
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
