"use client";

import { useState, useEffect } from "react";
import { PencilIcon, CheckCircleIcon } from "../Icons";

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
      {/* Simulation Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-3 text-slate-300 gap-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
          <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
          <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
          <span className="mr-2 text-xs font-bold text-white flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            הדמיה מונפשת (1:1 למסך האמיתי) • טבלת דיווחים חודשית
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
        {/* Table Mockup (1:1 with real ReportsScreen table) */}
        <div className="rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-800">דיווחים חודשיים • אוקטובר 2026</span>
            <span className="text-slate-500 font-medium">31 ימים ברישום</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-slate-500">
                  <th className="px-3 py-2.5 font-medium">תאריך</th>
                  <th className="px-3 py-2.5 text-center font-medium">כניסה - יציאה</th>
                  <th className="px-3 py-2.5 text-center font-medium">סה״כ</th>
                  <th className="px-3 py-2.5 text-center font-medium">סיווג</th>
                  <th className="px-3 py-2.5 text-center font-medium">פעולה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Row 1: Regular day */}
                <tr className="hover:bg-slate-50/80 transition">
                  <td className="px-3 py-2.5 font-bold text-slate-800">
                    <div>01/10/2026</div>
                    <div className="text-[10px] text-slate-400 font-normal">חמישי</div>
                  </td>
                  <td className="px-3 py-2.5 text-center font-medium text-slate-700" dir="ltr">
                    08:00 — 16:30
                  </td>
                  <td className="px-3 py-2.5 text-center font-bold text-slate-800">
                    8.5
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-block rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 font-medium text-[11px] border border-emerald-100">
                      עבודה
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="p-1 text-slate-400">
                      <PencilIcon className="w-3.5 h-3.5 inline-block" />
                    </span>
                  </td>
                </tr>

                {/* Row 2: Target row for edit (04/10/2026 with 2 segments) */}
                <tr
                  className={`transition-all duration-300 ${
                    step === 1
                      ? "bg-brand-50/90 ring-2 ring-brand-300"
                      : step >= 2
                      ? "bg-emerald-50/70"
                      : "hover:bg-slate-50/80"
                  }`}
                >
                  <td className="px-3 py-2.5 font-bold text-slate-800">
                    <div>04/10/2026</div>
                    <div className="text-[10px] text-slate-400 font-normal">ראשון</div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="font-bold text-brand-900" dir="ltr">07:45 — 20:00</div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.2 text-[10px] font-bold text-brand-700 border border-brand-200 mt-0.5">
                      2 מקטעים
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center relative">
                    <div className="font-extrabold text-slate-900">11.75</div>
                    <div className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 py-0.2 mt-0.5 inline-block">
                      +2.75 ש"נ
                    </div>
                    {/* Step 3 Cursor on updated hours */}
                    {step === 3 && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-40 pointer-events-none drop-shadow-xl animate-pulse">
                        <div className="relative">
                          <svg className="w-6 h-6 text-slate-950 fill-slate-950 drop-shadow-md" viewBox="0 0 24 24">
                            <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.43z" />
                          </svg>
                          <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-emerald-500/50 animate-ping pointer-events-none" />
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-block rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 font-medium text-[11px] border border-emerald-100">
                      עבודה
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="relative inline-flex">
                      <button
                        type="button"
                        className={`rounded-lg p-1.5 transition ${
                          step === 1
                            ? "bg-brand-600 text-white shadow-xs ring-2 ring-brand-300 scale-125"
                            : "text-brand-600 hover:bg-brand-50"
                        }`}
                        title="עריכת דיווח"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>

                      {/* Step 1 Virtual Cursor sitting DIRECTLY on the pencil button */}
                      {step === 1 && (
                        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 z-40 pointer-events-none drop-shadow-xl animate-pulse">
                          <div className="relative">
                            <svg className="w-6 h-6 text-slate-950 fill-slate-950 drop-shadow-md -rotate-45" viewBox="0 0 24 24">
                              <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.43z" />
                            </svg>
                            <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-brand-500/50 animate-ping pointer-events-none" />
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Row 3: Holiday */}
                <tr className="bg-purple-50/40">
                  <td className="px-3 py-2.5 font-bold text-slate-800">
                    <div>05/10/2026</div>
                    <div className="text-[10px] text-slate-400 font-normal">שני</div>
                  </td>
                  <td className="px-3 py-2.5 text-center text-slate-400">—</td>
                  <td className="px-3 py-2.5 text-center font-bold text-purple-700">0.0</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-block rounded-full bg-purple-100 text-purple-800 px-2.5 py-0.5 font-bold text-[11px] border border-purple-200">
                      חג סוכות
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="p-1 text-slate-400">
                      <PencilIcon className="w-3.5 h-3.5 inline-block" />
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Overlay in Step 2 */}
        {step === 2 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn">
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
                <div className="relative inline-block w-full">
                  <div className="rounded-lg bg-emerald-600 text-white font-bold p-2 text-center shadow-xs flex items-center justify-center gap-1">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-200" />
                    <span>שמור שינויים ביום זה</span>
                  </div>
                  {/* Step 2 Cursor on save button in modal */}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none drop-shadow-xl animate-pulse">
                    <div className="relative">
                      <svg className="w-6 h-6 text-slate-950 fill-slate-950 drop-shadow-md -rotate-45" viewBox="0 0 24 24">
                        <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.43z" />
                      </svg>
                      <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-emerald-400/60 animate-ping pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toast in Step 3 */}
        {step === 3 && (
          <div className="mt-3 rounded-xl bg-emerald-600 text-white p-2.5 text-center text-xs font-bold shadow-lg animate-fadeIn flex items-center justify-center gap-1.5">
            <span>🎉</span>
            <span>השורה עודכנה בהצלחה: סה״כ 11.75 שעות נרשמו בדיוק של 100%!</span>
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
