"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ReserveChart from "./ReserveChart";
import OvertimeChart from "./OvertimeChart";

export default function BottomChartsCarousel() {
  const [currentSlide, setCurrentSlide] = useState<number>(0); // 0 = Reserve, 1 = Overtime
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(10);
  const userInteractedRef = useRef<boolean>(false);

  // Switch to specific slide
  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    setCountdown(10);
  }, []);

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % 2);
  }, [currentSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % 2);
  }, [currentSlide, goToSlide]);

  // Pause when user drills down or explores data
  const handleInteraction = useCallback(() => {
    userInteractedRef.current = true;
    setIsPaused(true);
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  // Timer loop: advance slide every 10 seconds unless paused
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          goToSlide((currentSlide + 1) % 2);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, currentSlide, goToSlide]);

  return (
    <div
      className="relative rounded-3xl bg-slate-50/70 p-1.5 border border-slate-200/80 shadow-xs"
      onMouseEnter={() => {
        // Subtle hover pause without changing explicit user state
      }}
    >
      {/* Top Carousel Bar: Navigation Tabs + Timer Controls */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 px-2 pt-1.5 pb-2">
        {/* Slide Selection Tabs */}
        <div className="flex items-center rounded-xl bg-slate-200/70 p-1">
          <button
            type="button"
            onClick={() => goToSlide(0)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              currentSlide === 0
                ? "bg-white text-brand-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🛡️ ימי מילואים
          </button>
          <button
            type="button"
            onClick={() => goToSlide(1)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
              currentSlide === 1
                ? "bg-white text-amber-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ⏱️ שעות נוספות (ש"נ)
          </button>
        </div>

        {/* Carousel Timer & Playback Controls */}
        <div className="flex items-center gap-2">
          {/* Active slide indicator dots */}
          <div className="hidden sm:flex items-center gap-1.5 px-1">
            <span
              onClick={() => goToSlide(0)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                currentSlide === 0 ? "w-5 bg-brand-600" : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
              title="גרף ימי מילואים"
            />
            <span
              onClick={() => goToSlide(1)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                currentSlide === 1 ? "w-5 bg-amber-600" : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
              title="גרף שעות נוספות"
            />
          </div>

          {/* Countdown & Pause status badge */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1 text-xs shadow-xs">
            <span
              className={`h-2 w-2 rounded-full ${
                isPaused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
              }`}
            />
            <span className="text-slate-600 font-medium">
              {isPaused ? (
                <span className="text-amber-800 font-bold">מעבר מושהה</span>
              ) : (
                <>
                  מתחלף בעוד: <strong className="text-slate-900 font-extrabold">{countdown}</strong>ש׳
                </>
              )}
            </span>
          </div>

          {/* Pause / Resume Button */}
          <button
            type="button"
            onClick={togglePause}
            className="flex items-center gap-1 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-100 cursor-pointer"
            title={isPaused ? "המשך מעבר אוטומטי" : "השהה מעבר אוטומטי"}
          >
            <span>{isPaused ? "▶️ המשך" : "⏸️ השהה"}</span>
          </button>

          {/* Navigation Arrows (Prev / Next) */}
          <div className="flex items-center gap-1 border-r border-slate-200 pr-1.5">
            <button
              type="button"
              onClick={prevSlide}
              className="rounded-lg bg-white p-1 text-slate-600 shadow-xs transition hover:bg-slate-100 cursor-pointer"
              title="לגרף הקודם"
            >
              ➡️
            </button>
            <button
              type="button"
              onClick={nextSlide}
              className="rounded-lg bg-white p-1 text-slate-600 shadow-xs transition hover:bg-slate-100 cursor-pointer"
              title="לגרף הבא"
            >
              ⬅️
            </button>
          </div>
        </div>
      </div>

      {/* Overflow-hidden Carousel Viewport */}
      <div className="w-full overflow-hidden rounded-2xl">
        {/* Right-to-Left Sliding Track */}
        <div
          className="flex w-[200%] transition-transform duration-700 ease-in-out will-change-transform"
          style={{
            transform: currentSlide === 0 ? "translateX(0%)" : "translateX(50%)",
          }}
        >
          {/* Slide 0: Reserve duty chart */}
          <div className="w-1/2 shrink-0 px-0.5">
            <ReserveChart />
          </div>

          {/* Slide 1: Overtime chart with 3-level drill down */}
          <div className="w-1/2 shrink-0 px-0.5">
            <OvertimeChart onInteraction={handleInteraction} />
          </div>
        </div>
      </div>
    </div>
  );
}
