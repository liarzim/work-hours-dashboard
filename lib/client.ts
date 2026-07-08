"use client";

import useSWR from "swr";
import type { MonthData, ReserveSummary, StandardSettings } from "./types";

/** Client-side data hooks (SWR). Talks only to our own API routes. */

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? "שגיאת שרת");
  return json as T;
}

export function monthKey(year: number, month: number): string {
  return `/api/reports?year=${year}&month=${month}`;
}

export function useMonthData(year: number, month: number) {
  return useSWR<MonthData>(monthKey(year, month), fetcher<MonthData>, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });
}



export function useReserveSummary() {
  return useSWR<ReserveSummary>("/api/reserve", fetcher<ReserveSummary>, {
    revalidateOnFocus: false,
  });
}

export function useSettings() {
  return useSWR<StandardSettings>("/api/settings", fetcher<StandardSettings>, {
    revalidateOnFocus: false,
  });
}