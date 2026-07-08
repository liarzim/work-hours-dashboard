"use client";

import { useEffect, useRef, useState } from "react";
import { HEBREW_MONTHS } from "@/lib/types";
import { ChevronRight } from "./Icons";

const FIRST_YEAR = 2019;

interface Props {
  year: number;
  month: number; // 1-12
  onSelect: (year: number, month: number) => void;
}

/**
 * Drill-down month selector: click the label -> year grid -> month grid ->
 * selection applied. Chevron navigation in the header stays untouched.
 */
export default function MonthPicker({ year, month, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<"years" | "months">("years");
  const [pickedYear, setPickedYear] = useState(year);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = () => {
    setStage("years");
    setPickedYear(year);
    setOpen((v) => !v);
  };

  const years: number[] = [];
  for (let y = FIRST_YEAR; y <= new Date().getFullYear() + 1; y++) years.push(y);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="min-w-[90px] rounded-lg px-2 py-1 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        {HEBREW_MONTHS[month - 1]} {year}
      </button>

      {open && (
        <div className="absolute start-1/2 top-full z-40 mt-2 w-64 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl rtl:translate-x-1/2">
          {stage === "years" ? (
            <>
              <p className="mb-2 px-1 text-xs font-medium text-slate-400">בחר שנה</p>
              <div className="grid max-h-56 grid-cols-4 gap-1.5 overflow-y-auto">
                {years.map((y) => (
                  <button
                    key={y}
                    onClick={() => {
                      setPickedYear(y);
                      setStage("months");
                    }}
                    className={`rounded-lg py-2 text-sm font-medium transition ${
                      y === year
                        ? "bg-brand-600 text-white"
                        : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mb-2 flex items-center gap-1 px-1">
                <button
                  onClick={() => setStage("years")}
                  aria-label="חזרה לבחירת שנה"
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  {pickedYear}
                </button>
                <span className="text-xs text-slate-400">בחר חודש</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {HEBREW_MONTHS.map((name, i) => (
                  <button
                    key={name}
                    onClick={() => {
                      onSelect(pickedYear, i + 1);
                      setOpen(false);
                    }}
                    className={`rounded-lg py-2 text-sm font-medium transition ${
                      pickedYear === year && i + 1 === month
                        ? "bg-brand-600 text-white"
                        : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}