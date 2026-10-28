"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useReserveSummary, useOvertimeSummary } from "@/lib/client";
import ReserveChart from "./ReserveChart";
import OvertimeChart from "./OvertimeChart";

export default function BottomChartsCarousel() {
  const { data: reserveData, isLoading: reserveLoading } = useReserveSummary();
  const { data: overtimeData, isLoading: overtimeLoading } = useOvertimeSummary();

  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(10);
  const userInteractedRef = useRef<boolean>(false);

  // Pause when user drills down or explores data
  const handleInteraction = useCallback(() => {
    userInteractedRef.current = true;
    setIsPaused(true);
  }, []);

  const hasReserve = useMemo(() => {
    if (!reserveData?.years?.length) return false;
    const total = reserveData.years.reduce((s, y) => s + (y.tzav8 || 0) + (y.regular || 0), 0);
    return total > 0;
  }, [reserveData]);

  const hasOvertime = useMemo(() => {
    if (!overtimeData?.years?.length) return false;
    const total = overtimeData.years.reduce((s, y) => s + (y.total || 0), 0);
    return total > 0;
  }, [overtimeData]);

  // Construct dynamic list of slides that actually have data
  const slides = useMemo(() => {
    const list: {
      id: string;
      label: string;
      render: () => React.ReactNode;
    }[] = [];

    if (hasReserve) {
      list.push({
        id: "reserve",
        label: "🛡️ ימי מילואים",
        render: () => <ReserveChart />,
      });
    }

    if (hasOvertime) {
      list.push({
        id: "overtime",
        label: '⏱️ שעות נוספות (ש"נ)',
        render: () => <OvertimeChart onInteraction={handleInteraction} />,
      });
    }

    // Future analytics can easily be added here:
    // if (hasVacationAnalytics) list.push(...);

    return list;
  }, [hasReserve, hasOvertime, handleInteraction]);

  // Keep currentSlide within valid bounds if slides change
  useEffect(() => {
    if (slides.length > 0 && currentSlide >= slides.length) {
      setCurrentSlide(0);
    }
  }, [slides.length, currentSlide]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    setCountdown(10);
  }, []);

  const nextSlide = useCallback(() => {
    if (slides.length <= 1) return;
    goToSlide((currentSlide + 1) % slides.length);
  }, [slides.length, currentSlide, goToSlide]);

  const prevSlide = useCallback(() => {
    if (slides.length <= 1) return;
    goToSlide((currentSlide - 1 + slides.length) % slides.length);
  }, [slides.length, currentSlide, goToSlide]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  // Timer loop: advance slide every 10 seconds if more than 1 slide and not paused
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          goToSlide((currentSlide + 1) % slides.length);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, slides.length, currentSlide, goToSlide]);

  // Loading state
  if ((reserveLoading && !reserveData) || (overtimeLoading && !overtimeData)) {
    return <div className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />;
  }

  // If neither has data, don't display the carousel at all
  if (slides.length === 0) {
    return null;
  }

  // If only 1 chart has data, show it directly without carousel controls
  if (slides.length === 1) {
    return (
      <div className="rounded-3xl bg-slate-50/70 p-1.5 border border-slate-200/80 shadow-xs">
        {slides[0].render()}
      </div>
    );
  }

  // 2 or more slides: Full sliding carousel
  const trackWidth = `${slides.length * 100}%`;
  const slideWidth = `${100 / slides.length}%`;
  const rtlOffset = `${currentSlide * (100 / slides.length)}%`;

  return (
    <div className="relative rounded-3xl bg-slate-50/70 p-1.5 border border-slate-200/80 shadow-xs">
      {/* Top Carousel Bar: Navigation Tabs + Timer Controls */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 px-2 pt-1.5 pb-2">
        {/* Slide Selection Tabs */}
        <div className="flex items-center rounded-xl bg-slate-200/70 p-1">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goToSlide(idx)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                currentSlide === idx
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Carousel Timer & Playback Controls */}
        <div className="flex items-center gap-2">
          {/* Active slide indicator dots */}
          <div className="hidden sm:flex items-center gap-1.5 px-1">
            {slides.map((s, idx) => (
              <span
                key={s.id}
                onClick={() => goToSlide(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  currentSlide === idx
                    ? "w-5 bg-slate-800"
                    : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
                title={s.label}
              />
            ))}
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
          className="flex transition-transform duration-700 ease-in-out will-change-transform"
          style={{
            width: trackWidth,
            transform: `translateX(${rtlOffset})`,
          }}
        >
          {slides.map((s) => (
            <div
              key={s.id}
              className="shrink-0 px-0.5"
              style={{ width: slideWidth }}
            >
              {s.render()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
