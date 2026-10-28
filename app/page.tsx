"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useSWRConfig } from "swr";
import Header, { TabId } from "@/components/Header";
import Dashboard from "@/components/Dashboard";
import ReportsScreen from "@/components/ReportsScreen";
import SettingsScreen from "@/components/SettingsScreen";
import AdminScreen from "@/components/AdminScreen";
import GuideScreen from "@/components/GuideScreen";
import ReportModal from "@/components/ReportModal";
import BulkUpdateModal from "@/components/BulkUpdateModal";
import MissingReportsModal from "@/components/MissingReportsModal";
import { createSupabaseClient } from "@/lib/supabase/client";
import { monthKey, useMonthData } from "@/lib/client";
import { DayRecord, MonthData, ReportInput, MissingReportItem } from "@/lib/types";

export default function Home() {
  const now = useMemo(() => new Date(), []);
  const [tab, setTab] = useState<TabId>("board");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [editRecord, setEditRecord] = useState<DayRecord | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkDates, setBulkDates] = useState<string[]>([]);
  const [missingModalOpen, setMissingModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const supabase = createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email && user.email.toLowerCase() === "michael.liarzi@gmail.com") {
          setIsAdmin(true);
        }
      } catch (e) {
        console.error("Admin check failed", e);
      }
    };
    checkAdmin();
  }, []);

  const { data, isLoading, error } = useMonthData(year, month);
  const { mutate } = useSWRConfig();

  const shiftMonth = useCallback(
    (delta: number) => {
      let m = month + delta;
      let y = year;
      if (m < 1) { m = 12; y--; }
      if (m > 12) { m = 1; y++; }
      setMonth(m);
      setYear(y);
    },
    [month, year]
  );

  const [syncing, setSyncing] = useState(false);

  /** Force cache revalidation for the current views. */
  const refreshData = useCallback(async () => {
    setSyncing(true);
    try {
      await mutate(monthKey(year, month));
      await mutate("/api/settings");
      await mutate("/api/reserve");
      await mutate("/api/overtime");
      await mutate("/api/reports/missing");
    } finally {
      setSyncing(false);
    }
  }, [year, month, mutate]);

  const openNewReport = useCallback(() => {
    setEditRecord(null);
    setModalDate(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((rec: DayRecord) => {
    setEditRecord(rec);
    setModalDate(rec.date);
    setModalOpen(true);
  }, []);

  const openEditForDate = useCallback(
    (date: string, item?: MissingReportItem) => {
      const rec = data?.records.find((r) => r.date === date);
      if (rec) {
        setEditRecord(rec);
      } else if (item) {
        setEditRecord({
          date: item.date,
          dayOfWeek: item.dayName,
          dailyStandard: item.dailyStandard,
          entry: "",
          exit: "",
          totalHours: "0:00",
          totalHoursDecimal: 0,
          overtimeDecimal: 0,
          vacationDays: 0,
          sickDays: 0,
          reserveDays: 0,
          classification: item.classification || "עבודה",
          notes: item.notes || "",
          uniqueNotes: item.uniqueNotes || "",
        } as unknown as DayRecord);
      } else {
        setEditRecord(null);
      }
      setModalDate(date);
      setModalOpen(true);
    },
    [data]
  );

  const handleQuickSaveMissing = useCallback(
    async (updates: {
      date: string;
      entry?: string;
      exit?: string;
      classification: string;
      vacationDays?: number;
      sickDays?: number;
      reserveDays?: number;
    }) => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "שגיאה בשמירה");
      const [y, m] = updates.date.split("-").map(Number);
      await mutate(monthKey(y, m));
      await mutate("/api/reports/missing");
    },
    [mutate]
  );

  /** Optimistic save: patch the SWR cache instantly, then POST, then revalidate. */
  const saveReport = useCallback(
    async (input: ReportInput) => {
      const [y, m] = input.date.split("-").map(Number);
      const key = monthKey(y, m);

      await mutate(
        key,
        async (current: MonthData | undefined) => {
          const res = await fetch("/api/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error ?? "שגיאה בשמירה");
          if (!current) return current;
          return {
            ...current,
            records: current.records.map((r) =>
              r.date === input.date ? { ...r, ...json.record } : r
            ),
          };
        },
        {
          optimisticData: (current: MonthData | undefined) => {
            if (!current) return current as unknown as MonthData;
            const hasReserve = input.classification === "מילואים" || input.classification === "עבודה במילואים" || (input.reserveDays ?? 0) > 0;
            return {
              ...current,
              records: current.records.map((r) =>
                r.date === input.date
                  ? {
                      ...r,
                      entry: input.entry ?? "",
                      exit: input.exit ?? "",
                      classification: input.classification,
                      vacationDays: input.vacationDays ?? 0,
                      reserveDays: input.reserveDays ?? 0,
                      sickDays: input.sickDays ?? 0,
                      notes: input.notes ?? "",
                      uniqueNotes: input.uniqueNotes ?? "",
                      orderType: hasReserve ? (input.orderType || "מילואים רגילים") : "",
                    }
                  : r
              ),
            };
          },
          rollbackOnError: true,
          revalidate: true,
        }
      );
      await mutate("/api/reports/missing");
    },
    [mutate]
  );

  /** Optimistic batch save: patch the SWR cache, then POST, then revalidate. */
  const saveReportsBatch = useCallback(
    async (updates: Partial<ReportInput>, fieldsToUpdate: string[]) => {
      const firstDate = bulkDates[0];
      if (!firstDate) return;
      const [y, m] = firstDate.split("-").map(Number);
      const key = monthKey(y, m);

      await mutate(
        key,
        async (current: MonthData | undefined) => {
          const res = await fetch("/api/reports/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dates: bulkDates, updates, fieldsToUpdate }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error ?? "שגיאה בשמירה מרוכזת");
          if (!current) return current;

          const fieldsSet = new Set(fieldsToUpdate);
          return {
            ...current,
            records: current.records.map((r) => {
              if (bulkDates.includes(r.date)) {
                const updatedRecord = { ...r };
                if (fieldsSet.has("classification")) {
                  updatedRecord.classification = updates.classification ?? r.classification;
                  const isAbsence = updatedRecord.classification !== "עבודה" && updatedRecord.classification !== "עבודה במילואים";
                  if (isAbsence) {
                    updatedRecord.entry = "";
                    updatedRecord.exit = "";
                  }
                }
                if (fieldsSet.has("entry")) updatedRecord.entry = updates.entry ?? "";
                if (fieldsSet.has("exit")) updatedRecord.exit = updates.exit ?? "";
                if (fieldsSet.has("vacationDays")) updatedRecord.vacationDays = updates.vacationDays ?? 0;
                if (fieldsSet.has("sickDays")) updatedRecord.sickDays = updates.sickDays ?? 0;
                if (fieldsSet.has("reserveDays")) updatedRecord.reserveDays = updates.reserveDays ?? 0;
                if (fieldsSet.has("notes")) updatedRecord.notes = updates.notes ?? "";
                if (fieldsSet.has("uniqueNotes")) updatedRecord.uniqueNotes = updates.uniqueNotes ?? "";
                if (fieldsSet.has("orderType")) {
                  updatedRecord.orderType = updates.orderType ?? "";
                }

                // Recalculate hours and overtime
                if (fieldsSet.has("entry") || fieldsSet.has("exit") || fieldsSet.has("classification")) {
                  if (updatedRecord.entry && updatedRecord.exit) {
                    const toMin = (t: string) => {
                      const [h, min] = t.split(":").map(Number);
                      return h * 60 + min;
                    };
                    const diff = toMin(updatedRecord.exit) - toMin(updatedRecord.entry);
                    const hrs = diff > 0 ? diff / 60 : 0;
                    updatedRecord.totalHoursDecimal = Math.round(hrs * 10) / 10;
                    const hours = Math.floor(hrs);
                    const mins = Math.round((hrs - hours) * 60);
                    updatedRecord.totalHours = `${hours}:${String(mins).padStart(2, "0")}`;
                  } else {
                    updatedRecord.totalHoursDecimal = 0;
                    updatedRecord.totalHours = "0:00";
                  }
                  updatedRecord.overtimeDecimal = Math.max(0, updatedRecord.totalHoursDecimal - updatedRecord.dailyStandard);
                }
                return updatedRecord;
              }
              return r;
            }),
          };
        },
        {
          optimisticData: (current: MonthData | undefined) => {
            if (!current) return current as unknown as MonthData;
            const fieldsSet = new Set(fieldsToUpdate);
            return {
              ...current,
              records: current.records.map((r) => {
                if (bulkDates.includes(r.date)) {
                  const updatedRecord = { ...r };
                  if (fieldsSet.has("classification")) {
                    updatedRecord.classification = updates.classification ?? r.classification;
                    const isAbsence = updatedRecord.classification !== "עבודה" && updatedRecord.classification !== "עבודה במילואים";
                    if (isAbsence) {
                      updatedRecord.entry = "";
                      updatedRecord.exit = "";
                    }
                  }
                  if (fieldsSet.has("entry")) updatedRecord.entry = updates.entry ?? "";
                  if (fieldsSet.has("exit")) updatedRecord.exit = updates.exit ?? "";
                  if (fieldsSet.has("vacationDays")) updatedRecord.vacationDays = updates.vacationDays ?? 0;
                  if (fieldsSet.has("sickDays")) updatedRecord.sickDays = updates.sickDays ?? 0;
                  if (fieldsSet.has("reserveDays")) updatedRecord.reserveDays = updates.reserveDays ?? 0;
                  if (fieldsSet.has("notes")) updatedRecord.notes = updates.notes ?? "";
                  if (fieldsSet.has("uniqueNotes")) updatedRecord.uniqueNotes = updates.uniqueNotes ?? "";
                  if (fieldsSet.has("orderType")) {
                    updatedRecord.orderType = updates.orderType ?? "";
                  }

                  if (fieldsSet.has("entry") || fieldsSet.has("exit") || fieldsSet.has("classification")) {
                    if (updatedRecord.entry && updatedRecord.exit) {
                      const toMin = (t: string) => {
                        const [h, min] = t.split(":").map(Number);
                        return h * 60 + min;
                      };
                      const diff = toMin(updatedRecord.exit) - toMin(updatedRecord.entry);
                      const hrs = diff > 0 ? diff / 60 : 0;
                      updatedRecord.totalHoursDecimal = Math.round(hrs * 10) / 10;
                      const hours = Math.floor(hrs);
                      const mins = Math.round((hrs - hours) * 60);
                      updatedRecord.totalHours = `${hours}:${String(mins).padStart(2, "0")}`;
                    } else {
                      updatedRecord.totalHoursDecimal = 0;
                      updatedRecord.totalHours = "0:00";
                    }
                    updatedRecord.overtimeDecimal = Math.max(0, updatedRecord.totalHoursDecimal - updatedRecord.dailyStandard);
                  }
                  return updatedRecord;
                }
                return r;
              }),
            };
          },
          rollbackOnError: true,
          revalidate: true,
        }
      );
      await mutate("/api/reports/missing");
    },
    [bulkDates, mutate]
  );

  const openBulkUpdate = useCallback((dates: string[]) => {
    setBulkDates(dates);
    setBulkModalOpen(true);
  }, []);

  return (
    <div className="min-h-screen">
      <Header
        tab={tab}
        onTab={(newTab) => {
          setTab(newTab);
          if (newTab === "reports") {
            const now = new Date();
            setYear(now.getFullYear());
            setMonth(now.getMonth() + 1);
          }
        }}
        year={year}
        month={month}
        onPrevMonth={() => shiftMonth(-1)}
        onNextMonth={() => shiftMonth(1)}
        onNewReport={openNewReport}
        onSync={refreshData}
        syncing={syncing}
        isAdmin={isAdmin}
        onSelectMonth={(y, m) => {
          setYear(y);
          setMonth(m);
        }}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {String(error.message ?? error)}
          </div>
        )}

        {tab === "board" && (
          <Dashboard
            data={data}
            loading={isLoading}
            year={year}
            month={month}
            onOpenMissingModal={() => setMissingModalOpen(true)}
          />
        )}
        {tab === "reports" && (
          <ReportsScreen
            data={data}
            year={year}
            month={month}
            onYear={setYear}
            onMonth={setMonth}
            onEdit={openEdit}
            onBulkUpdate={openBulkUpdate}
          />
        )}
        {tab === "guide" && <GuideScreen />}
        {tab === "settings" && <SettingsScreen />}
        {tab === "admin" && isAdmin && <AdminScreen />}
      </main>

      {missingModalOpen && (
        <MissingReportsModal
          onClose={() => setMissingModalOpen(false)}
          onEditDate={openEditForDate}
          onBulkUpdate={(dates) => {
            setBulkDates(dates);
            setBulkModalOpen(true);
          }}
          onQuickSave={handleQuickSaveMissing}
        />
      )}

      {bulkModalOpen && (
        <BulkUpdateModal
          selectedDates={bulkDates}
          existingRecords={data?.records ?? []}
          onClose={() => setBulkModalOpen(false)}
          onSaveBatch={saveReportsBatch}
        />
      )}

      {modalOpen && (
        <ReportModal
          record={editRecord}
          defaultDate={
            modalDate ||
            `${year}-${String(month).padStart(2, "0")}-${String(
              Math.min(new Date().getDate(), 28)
            ).padStart(2, "0")}`
          }
          onClose={() => {
            setModalOpen(false);
            setModalDate(null);
          }}
          onSave={async (input) => {
            await saveReport(input);
            setModalOpen(false);
            setModalDate(null);
          }}
        />
      )}
    </div>
  );
}