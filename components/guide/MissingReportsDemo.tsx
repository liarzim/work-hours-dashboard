"use client";

import { useState, useEffect } from "react";
import { AlertTriangleIcon, PencilIcon, XIcon } from "../Icons";

export default function MissingReportsDemo() {
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
            הדמיה מונפשת (1:1 למסך האמיתי) • חלון דיווחים חסרים
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

      {/* Screen Backdrop */}
      <div className="relative bg-slate-900/50 p-3 sm:p-6 select-none overflow-hidden min-h-[520px] flex items-center justify-center backdrop-blur-xs">
        {/* Animated Virtual Cursor */}
        <div
          className={`absolute z-40 transition-all duration-700 pointer-events-none drop-shadow-xl ${
            step === 0
              ? "right-1/4 top-40"
              : step === 1
              ? "right-[34%] top-[230px] scale-90"
              : step === 2
              ? "right-[26%] top-[305px] scale-90"
              : "right-1/2 top-1/2 opacity-0"
          }`}
        >
          <div className="relative">
            <svg
              className="w-7 h-7 text-slate-950 fill-slate-950 drop-shadow-md"
              viewBox="0 0 24 24"
            >
              <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.43z" />
            </svg>
            {(step === 1 || step === 2) && (
              <span className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-brand-500/50 animate-ping pointer-events-none" />
            )}
          </div>
        </div>

        {/* Real MissingReportsModal Replica */}
        <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:px-6">
            <span className="p-1 text-slate-400">
              <XIcon className="h-5 w-5" />
            </span>
            <div className="flex items-center gap-3 text-right">
              <div>
                <h3 className="text-base font-black text-slate-900">דיווחים חסרים במערכת</h3>
                <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 mt-0.5">
                  {step === 0 ? "נמצאו 7 ימי עבודה בעבר ללא דיווח (כולל חודשים קודמים)" : step === 1 ? "נמצאו 6 ימי עבודה בעבר ללא דיווח" : "נמצאו 5 ימי עבודה בעבר ללא דיווח"}
                </span>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <AlertTriangleIcon className="h-5 w-5" />
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="border-b border-slate-100 bg-slate-50/50 p-4 sm:px-6">
            <div className="flex gap-3">
              <div className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-400">
                חיפוש לפי תאריך / יום...
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>כל החודשים ({step === 0 ? "7" : step === 1 ? "6" : "5"})</span>
                <span>▼</span>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="p-4 sm:px-6 space-y-2.5 max-h-[320px] overflow-hidden">
            {/* Header row */}
            <div className="flex items-center justify-between px-2 text-xs text-slate-400 pb-1 border-b border-slate-100">
              <span>פעולות מהירות לעדכון</span>
              <div className="flex items-center gap-2">
                <span>בחר הכל ({step === 0 ? "7" : step === 1 ? "6" : "5"})</span>
                <input type="checkbox" readOnly className="rounded border-slate-300" />
              </div>
            </div>

            {/* Row 1: 12/10/2026 */}
            <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 transition duration-300 ${
              step >= 1 ? "border-emerald-300 bg-emerald-50/90 shadow-2xs" : "border-slate-100 bg-white"
            }`}>
              {/* Quick actions (Left in RTL) */}
              {step >= 1 ? (
                <span className="text-xs font-bold text-emerald-800 bg-white/90 border border-emerald-200 rounded-xl px-3 py-1 shadow-2xs">
                  ✅ 9.0 שעות הוזנו בהצלחה!
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className={`rounded-xl border px-2.5 py-1 text-xs font-bold transition shadow-xs ${
                    step === 0
                      ? "border-blue-500 bg-blue-600 text-white ring-2 ring-blue-200 scale-105"
                      : "border-blue-200 bg-blue-50/80 text-blue-700"
                  }`}>
                    ⏱️ שעות תקן
                  </span>
                  <span className="rounded-xl border border-purple-200 bg-purple-50/80 px-2.5 py-1 text-xs font-semibold text-purple-700">
                    🏖️ חופש
                  </span>
                  <span className="rounded-xl border border-amber-200 bg-amber-50/80 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    🩹 מחלה
                  </span>
                  <span className="rounded-xl border border-slate-200 bg-white p-1 text-slate-400">
                    <PencilIcon className="h-3.5 w-3.5" />
                  </span>
                </div>
              )}

              {/* Day info (Right in RTL) */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                      ⚠️ לא מולא
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      שני
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      12/10/2026
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    תקן יומי: 9 שעות
                  </div>
                </div>
                <input type="checkbox" readOnly className="rounded border-slate-300" />
              </div>
            </div>

            {/* Row 2: 11/10/2026 */}
            <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 transition duration-300 ${
              step >= 2 ? "border-purple-300 bg-purple-50/90 shadow-2xs" : "border-slate-100 bg-white"
            }`}>
              {/* Quick actions (Left in RTL) */}
              {step >= 2 ? (
                <span className="text-xs font-bold text-purple-800 bg-white/90 border border-purple-200 rounded-xl px-3 py-1 shadow-2xs">
                  🏖️ עודכן כיום חופש מלא!
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="rounded-xl border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    ⏱️ שעות תקן
                  </span>
                  <span className={`rounded-xl border px-2.5 py-1 text-xs font-bold transition shadow-xs ${
                    step === 1
                      ? "border-purple-500 bg-purple-600 text-white ring-2 ring-purple-200 scale-105"
                      : "border-purple-200 bg-purple-50/80 text-purple-700"
                  }`}>
                    🏖️ חופש
                  </span>
                  <span className="rounded-xl border border-amber-200 bg-amber-50/80 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    🩹 מחלה
                  </span>
                  <span className="rounded-xl border border-slate-200 bg-white p-1 text-slate-400">
                    <PencilIcon className="h-3.5 w-3.5" />
                  </span>
                </div>
              )}

              {/* Day info (Right in RTL) */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                      ⚠️ לא מולא
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      ראשון
                    </span>
                    <span className="font-bold text-slate-900 text-sm">
                      11/10/2026
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    תקן יומי: 9 שעות
                  </div>
                </div>
                <input type="checkbox" readOnly className="rounded border-slate-300" />
              </div>
            </div>

            {/* Row 3: 14/09/2026 */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3 opacity-60">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>⏱️ תקן</span>
                <span>🏖️ חופש</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="font-bold text-slate-900 text-sm">14/09/2026 • שני</span>
                  <div className="text-[11px] text-slate-400">תקן יומי: 9 שעות</div>
                </div>
                <input type="checkbox" readOnly className="rounded border-slate-300" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50 p-4 sm:px-6 flex items-center justify-between text-xs">
            <span className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 shadow-2xs">
              סגירה
            </span>
            <span className="font-bold text-slate-500">
              {step === 3 ? "🎉 עודכנו 2 ימים תוך שניות!" : `סה"כ ${step === 0 ? "7" : step === 1 ? "6" : "5"} דיווחים חסרים`}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Timeline Tabs */}
      <div className="border-t border-slate-800 bg-slate-950 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-center text-xs">
          {[
            { num: 1, label: "איתור ימי עבודה חסרים" },
            { num: 2, label: "קליק על 'שעות תקן'" },
            { num: 3, label: "קליק על 'חופש'" },
            { num: 4, label: "סיום עדכון מהיר!" },
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
