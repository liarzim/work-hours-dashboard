"use client";

import { useState, useEffect } from "react";

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
      {/* Mockup Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-3 text-slate-300 gap-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
          <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
          <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
          <span className="mr-2 text-xs font-bold text-white flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            הדמיה מונפשת בלולאה (Option C) • השלמת דיווחים חסרים
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
          >
            <span>{isPlaying ? "⏸️ השהה לולאה" : "▶️ הפעל לולאה"}</span>
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

      {/* Simulated Interactive Screen */}
      <div className="relative bg-slate-100 p-4 sm:p-6 select-none overflow-hidden min-h-[340px]">
        {/* Animated Virtual Cursor */}
        <div
          className={`absolute z-30 transition-all duration-700 pointer-events-none drop-shadow-xl ${
            step === 0
              ? "right-16 top-24"
              : step === 1
              ? "right-44 top-36 scale-90"
              : step === 2
              ? "right-64 top-56 scale-90"
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

        {/* Modal Window Mockup */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xl border border-slate-200">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 text-sm font-bold shadow-xs">
                ⚠️
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">דיווחים חסרים במערכת</h4>
                <p className="text-[11px] font-medium text-slate-500">
                  {step === 0
                    ? "נמצאו 7 ימי עבודה בעבר ללא דיווח (סריקה אוטומטית)"
                    : step === 1
                    ? "נמצאו 6 ימי עבודה בעבר ללא דיווח (הושלם יום 12/10)"
                    : "נמצאו 5 ימי עבודה בעבר ללא דיווח (הושלמו 2 ימים בזה אחר זה!)"}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-black text-amber-900 shadow-xs">
              {step === 0 ? "7 ימים חסרים" : step === 1 ? "6 ימים חסרים" : "5 ימים חסרים"}
            </span>
          </div>

          {/* List of rows */}
          <div className="space-y-2.5">
            {/* Row 1: Work Hours */}
            <div
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 border transition-all duration-500 ${
                step >= 1
                  ? "bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-200 shadow-xs"
                  : "bg-slate-50/80 border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-black text-slate-800">12/10/2026 • יום שני</div>
                  <div className="text-[10px] text-slate-400">תקן יומי: 9.0 שעות</div>
                </div>
                {step >= 1 ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                    ✅ 9.0 שעות (08:00 - 17:00)
                  </span>
                ) : (
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                    לא מולא
                  </span>
                )}
              </div>

              {step >= 1 ? (
                <span className="text-[11px] font-extrabold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-xs">
                  הושלם לשעות תקן ✓
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-extrabold transition shadow-xs ${
                      step === 0
                        ? "bg-brand-600 text-white ring-2 ring-brand-300 scale-105"
                        : "bg-brand-50 text-brand-700 border border-brand-200"
                    }`}
                  >
                    ⏱️ שעות תקן
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                    חופש
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                    מחלה
                  </span>
                </div>
              )}
            </div>

            {/* Row 2: Vacation */}
            <div
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 border transition-all duration-500 ${
                step >= 2
                  ? "bg-purple-50/90 border-purple-300 ring-2 ring-purple-200 shadow-xs"
                  : "bg-slate-50/80 border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-black text-slate-800">11/10/2026 • יום ראשון</div>
                  <div className="text-[10px] text-slate-400">תקן יומי: 9.0 שעות</div>
                </div>
                {step >= 2 ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-800 border border-purple-200">
                    🏖️ חופש 1 (עודכנה יתרה)
                  </span>
                ) : (
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                    לא מולא
                  </span>
                )}
              </div>

              {step >= 2 ? (
                <span className="text-[11px] font-extrabold text-purple-700 bg-white px-2.5 py-1 rounded-lg border border-purple-300 shadow-xs">
                  עודכן כיום חופש ✓
                </span>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                    שעות תקן
                  </span>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-extrabold transition shadow-xs ${
                      step === 1
                        ? "bg-purple-600 text-white ring-2 ring-purple-300 scale-105"
                        : "bg-purple-50 text-purple-700 border border-purple-200"
                    }`}
                  >
                    🏖️ חופש
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                    מחלה
                  </span>
                </div>
              )}
            </div>

            {/* Row 3 */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50/50 p-3 border border-slate-200 opacity-60">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-black text-slate-800">14/09/2026 • יום שני</div>
                  <div className="text-[10px] text-slate-400">תקן יומי: 9.0 שעות</div>
                </div>
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  לא מולא
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>⏱️ תקן</span>
                <span>🏖️ חופש</span>
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {step === 3 && (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 p-2.5 text-white text-xs font-black shadow-lg animate-bounce">
              <span>✨ 2 דיווחים הושלמו בהצלחה תוך 2 שניות ללא הקלדה ידנית!</span>
            </div>
          )}
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
