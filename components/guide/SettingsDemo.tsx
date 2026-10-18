"use client";

import { useState, useEffect } from "react";
import { ShieldIcon, ClockIcon } from "../Icons";

export default function SettingsDemo() {
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
            הדמיה מונפשת (1:1 למסך האמיתי) • הגדרות ותנאי העסקה
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
      <div className="relative bg-slate-100 p-4 sm:p-6 select-none overflow-hidden min-h-[400px]">
        {/* Settings Simulator Mockup (1:1 with real SettingsScreen) */}
        <div className="max-w-lg mx-auto bg-white rounded-2xl p-5 shadow-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700 font-bold text-xs">
                💼
              </span>
              <div>
                <h5 className="text-xs font-black text-slate-900">הגדרות תנאי העסקה ושכר</h5>
                <p className="text-[10px] text-slate-500">חישוב אוטומטי של שעות נוספות וערך כספי</p>
              </div>
            </div>
            <span className="rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold px-2 py-0.5 border border-brand-200">
              פעיל
            </span>
          </div>

          {/* Form fields */}
          <div className="space-y-3 text-xs">
            {/* Field 1: Employment Type */}
            <div className={`p-2.5 rounded-xl border transition-all duration-300 ${
              step === 0 ? "bg-brand-50/80 border-brand-300 ring-2 ring-brand-200 shadow-xs" : "bg-slate-50 border-slate-200"
            }`}>
              <span className="block font-bold text-slate-700 mb-1">סוג העסקה:</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="block rounded-lg bg-brand-600 text-white font-extrabold text-center py-1.5 shadow-2xs">
                    עובד גלובלי
                  </span>
                  {/* Step 0 Virtual Cursor on global worker option */}
                  {step === 0 && (
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none drop-shadow-xl animate-pulse">
                      <div className="relative">
                        <svg className="w-6 h-6 text-slate-950 fill-slate-950 drop-shadow-md -rotate-45" viewBox="0 0 24 24">
                          <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.43z" />
                        </svg>
                        <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-brand-500/50 animate-ping pointer-events-none" />
                      </div>
                    </div>
                  )}
                </div>
                <span className="rounded-lg bg-white border border-slate-200 text-slate-600 text-center py-1.5">
                  עובד שעתי
                </span>
              </div>
            </div>

            {/* Field 2: Hourly Rate */}
            <div className={`p-2.5 rounded-xl border transition-all duration-300 ${
              step === 1 ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-200 shadow-xs" : "bg-slate-50 border-slate-200"
            }`}>
              <span className="block font-bold text-slate-700 mb-1">ערך שעה (לצורך חישוב שעות נוספות):</span>
              <div className="relative">
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-bold">
                  <span className="text-brand-700 text-sm">100.00 ₪</span>
                  <span className="text-[10px] text-slate-400">לפי בסיס שכר</span>
                </div>
                {/* Step 1 Virtual Cursor on rate input */}
                {step === 1 && (
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none drop-shadow-xl animate-pulse">
                    <div className="relative">
                      <svg className="w-6 h-6 text-slate-950 fill-slate-950 drop-shadow-md -rotate-45" viewBox="0 0 24 24">
                        <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.43z" />
                      </svg>
                      <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-blue-500/50 animate-ping pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Field 3: Overtime Breakdown preview */}
            <div className={`p-3 rounded-xl border transition-all duration-300 ${
              step >= 2 ? "bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-200 shadow-xs" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-extrabold text-indigo-900">מדרגות שעות נוספות לפי חוק</span>
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                  אוטומטי
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] relative">
                <div className="bg-white p-2 rounded-lg border border-indigo-100">
                  <div className="text-slate-500">שעתיים ראשונות:</div>
                  <div className="font-black text-indigo-700">125% (125 ₪/שעה)</div>
                </div>
                <div className="bg-white p-2 rounded-lg border border-indigo-100">
                  <div className="text-slate-500">החל מהשעה ה-3:</div>
                  <div className="font-black text-indigo-700">150% (150 ₪/שעה)</div>
                </div>
                {/* Step 2 Virtual Cursor on overtime breakdown */}
                {step === 2 && (
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none drop-shadow-xl animate-pulse">
                    <div className="relative">
                      <svg className="w-6 h-6 text-slate-950 fill-slate-950 drop-shadow-md -rotate-45" viewBox="0 0 24 24">
                        <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.43z" />
                      </svg>
                      <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-indigo-500/50 animate-ping pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Value Badge on Step 3 */}
          {step === 3 && (
            <div className="relative">
              <div className="rounded-xl bg-gradient-to-r from-indigo-700 to-brand-700 p-2.5 text-center text-white text-xs font-black shadow-lg animate-fadeIn">
                💰 אומדן תוספת שעות נוספות לחודש הנוכחי: 1,625 ₪!
              </div>
              {/* Step 3 Virtual Cursor on total value */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none drop-shadow-xl animate-pulse">
                <div className="relative">
                  <svg className="w-6 h-6 text-slate-950 fill-slate-950 drop-shadow-md -rotate-45" viewBox="0 0 24 24">
                    <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.43z" />
                  </svg>
                  <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-400/60 animate-ping pointer-events-none" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Timeline Tabs */}
      <div className="border-t border-slate-800 bg-slate-950 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-center text-xs">
          {[
            { num: 1, label: "סוג העסקה" },
            { num: 2, label: "הגדרת ערך שעה" },
            { num: 3, label: "מדרגות 125% ו-150%" },
            { num: 4, label: "הערכת שווי כספי" },
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
