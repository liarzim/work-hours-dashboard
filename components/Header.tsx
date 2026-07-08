"use client";

import { useRouter } from "next/navigation";
import MonthPicker from "./MonthPicker";
import { createSupabaseClient } from "@/lib/supabase/client";
import {
  ClockIcon,
  PlusIcon,
  ChevronRight,
  ChevronLeft,
  GridIcon,
  ListIcon,
  RefreshIcon,
  ShieldIcon,
  LogOutIcon,
} from "./Icons";
export type TabId = "board" | "reports" | "settings";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "board", label: "לוח בקרה", icon: <GridIcon /> },
  { id: "reports", label: "דיווחים", icon: <ListIcon /> },
  { id: "settings", label: "הגדרות", icon: <ShieldIcon /> },
];

interface Props {
  tab: TabId;
  onTab: (t: TabId) => void;
  year: number;
  month: number; // 1-12
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onNewReport: () => void;
  onSync: () => void;
  syncing: boolean;
  onSelectMonth: (year: number, month: number) => void;
}

export default function Header({
  tab,
  onTab,
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onNewReport,
  onSync,
  syncing,
  onSelectMonth,
}: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        {/* Title (right side in RTL) */}
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
            <ClockIcon className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <h1 className="text-base font-bold text-slate-900">ניהול דיווח שעות</h1>
            <p className="text-[11px] font-medium tracking-wide text-slate-400">
              24H WORK DASHBOARD
            </p>
          </div>
        </div>

        {/* Tabs (center) */}
        <nav className="order-3 mx-auto flex w-full justify-center sm:order-none sm:w-auto">
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => onTab(t.id)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                  tab === t.id
                    ? "bg-white text-brand-700 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Month nav + action (left side in RTL) */}
        <div className="ms-auto flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white">
            <button
              onClick={onNextMonth}
              aria-label="חודש הבא"
              className="p-2 text-slate-500 hover:text-slate-800"
            >
              <ChevronRight />
            </button>
            <MonthPicker year={year} month={month} onSelect={onSelectMonth} />
            <button
              onClick={onPrevMonth}
              aria-label="חודש קודם"
              className="p-2 text-slate-500 hover:text-slate-800"
            >
              <ChevronLeft />
            </button>
          </div>
          <button
            onClick={onSync}
            disabled={syncing}
            title="רענן נתונים"
            aria-label="רענן נתונים"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:text-brand-600 disabled:opacity-60"
          >
            <RefreshIcon className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          </button>
          
          <button
            onClick={async () => {
              const supabase = createSupabaseClient();
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            title="התנתק"
            aria-label="התנתק"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:text-red-600"
          >
            <LogOutIcon className="h-4 w-4" />
          </button>

          <button
            onClick={onNewReport}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <PlusIcon className="h-4 w-4" />
            דיווח חדש
          </button>
        </div>
      </div>
    </header>
  );
}