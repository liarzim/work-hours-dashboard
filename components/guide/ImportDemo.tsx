"use client";

import { useState, useEffect } from "react";
import { UploadIcon, CheckCircleIcon, SparklesIcon } from "../Icons";

export default function ImportDemo() {
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
            הדמיה מונפשת
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
        {/* Dropzone & Preview Mockup */}
        <div className="max-w-lg mx-auto space-y-3">
          {step === 0 ? (
            /* Step 0: Empty Dropzone */
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center shadow-xs transition hover:border-brand-400">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 mb-3">
                <UploadIcon className="w-6 h-6" />
              </div>
              <div className="text-sm font-black text-slate-800">בחר קובץ CSV או Excel להעלאה</div>
              <p className="text-xs text-slate-500 mt-1">תומך בפלט שעון נוכחות: חילן, מלם, הר-גל או קובץ מקומי</p>
              <div className="mt-4 relative inline-block">
                <div className="rounded-xl bg-brand-50 border border-brand-200 px-4 py-2 text-xs font-bold text-brand-700 shadow-2xs">
                  📄 גרור קובץ לכאן
                </div>
                {/* Step 0 Virtual Cursor sitting on the dropzone */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none drop-shadow-xl animate-pulse">
                  <div className="relative">
                    <svg className="w-6 h-6 text-slate-950 fill-slate-950 drop-shadow-md -rotate-45" viewBox="0 0 24 24">
                      <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.43z" />
                    </svg>
                    <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-brand-500/50 animate-ping pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          ) : step === 1 ? (
            /* Step 1: File Dropped & Parsing */
            <div className="rounded-2xl border-2 border-brand-500 bg-brand-50/50 p-6 text-center shadow-md animate-fadeIn">
              <span className="inline-block p-3 rounded-full bg-brand-600 text-white mb-2 shadow-xs">
                📄
              </span>
              <div className="text-sm font-black text-brand-900">אוקטובר 2026.csv נטען בהצלחה!</div>
              <p className="text-xs text-brand-700 mt-1">סורק נתונים, מזהה כותרות ומאחד מקטעי עבודה...</p>
              <div className="mt-3 h-2 w-48 mx-auto rounded-full bg-brand-200 overflow-hidden">
                <div className="h-full bg-brand-600 rounded-full animate-pulse w-3/4" />
              </div>
            </div>
          ) : (
            /* Step 2 & 3: Preview Table & Success */
            <div className="rounded-2xl bg-white p-4 shadow-xl border border-slate-200 animate-fadeIn space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h5 className="text-xs font-black text-slate-900">סיכום נתוני הקובץ שזוהו</h5>
                  <p className="text-[11px] text-slate-500">22 ימי עבודה • 195.5 שעות עבודה</p>
                </div>
                <span className="rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] px-2.5 py-0.5 border border-emerald-200">
                  זיהוי תקין 100%
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                  <span className="text-slate-600 font-bold">איחוד מקטעים מרובים:</span>
                  <span className="font-extrabold text-blue-700">04/10 (2 מקטעים), 14/10 (2 מקטעים)</span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg">
                  <span className="text-slate-600 font-bold">סיווגי חגים אוטומטיים:</span>
                  <span className="font-extrabold text-purple-700">חוה"מ, הושע"ר, שמחת תורה</span>
                </div>
              </div>

              {step === 2 ? (
                <div className="relative">
                  <button
                    type="button"
                    className="w-full rounded-xl bg-brand-600 py-2.5 text-center text-xs font-black text-white shadow-md ring-2 ring-brand-300 scale-102 transition"
                  >
                    ✓ אשר ושמור 22 דיווחים במערכת
                  </button>
                  {/* Step 2 Cursor sitting directly on the confirm button */}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none drop-shadow-xl animate-pulse">
                    <div className="relative">
                      <svg className="w-6 h-6 text-slate-950 fill-slate-950 drop-shadow-md -rotate-45" viewBox="0 0 24 24">
                        <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.43z" />
                      </svg>
                      <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-brand-500/50 animate-ping pointer-events-none" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-600 py-2.5 text-center text-xs font-black text-white shadow-lg animate-bounce flex items-center justify-center gap-1.5">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-200" />
                  <span>כל הדיווחים נשמרו בהצלחה במסד הנתונים!</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress Timeline Tabs */}
      <div className="border-t border-slate-800 bg-slate-950 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-center text-xs">
          {[
            { num: 1, label: "בחירת קובץ CSV" },
            { num: 2, label: "זיהוי ואיחוד מקטעים" },
            { num: 3, label: "תצוגה מקדימה" },
            { num: 4, label: "שמירה אוטומטית!" },
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
