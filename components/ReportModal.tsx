"use client";

import { FormEvent, useEffect, useState, useMemo } from "react";
import { DayRecord, ReportInput } from "@/lib/types";
import { SaveIcon, XIcon } from "./Icons";
import { getClassifications, getOrderTypes, getHolidays, getHolidayForDate, HolidaySetting } from "@/lib/settingsStore";
import { isoToDdmmyyyy } from "@/lib/date";

interface Props {
  /** Existing record when editing, null for a fresh report. */
  record: DayRecord | null;
  defaultDate: string; // ISO
  onClose: () => void;
  onSave: (input: ReportInput) => Promise<void>;
}

/** Sheet stores "7:05"; <input type="time"> requires "07:05". */
function padTime(t: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec((t ?? "").trim());
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : "";
}

function formatTimeInput(value: string, prevValue: string): string {
  if (value.length < prevValue.length) {
    return value; // allow backspace
  }
  const clean = value.replace(/[^\d:]/g, "");
  if (clean.includes(":")) {
    const parts = clean.split(":");
    let hh = parts[0].slice(0, 2);
    let mm = parts[1].slice(0, 2);
    const hhInt = parseInt(hh, 10);
    if (!isNaN(hhInt) && hhInt > 23) hh = "23";
    const mmInt = parseInt(mm, 10);
    if (!isNaN(mmInt) && mmInt > 59) mm = "59";
    return parts[1] !== "" ? `${hh}:${mm}` : `${hh}:`;
  }
  const digits = clean.replace(/\D/g, "");
  if (digits.length > 2) {
    let hh = digits.slice(0, 2);
    let mm = digits.slice(2, 4);
    const hhInt = parseInt(hh, 10);
    if (hhInt > 23) hh = "23";
    const mmInt = parseInt(mm, 10);
    if (mmInt > 59) mm = "59";
    return `${hh}:${mm}`;
  } else if (digits.length === 2) {
    const hhInt = parseInt(digits, 10);
    if (hhInt > 23) return "23";
    return digits + ":";
  } else {
    const hhInt = parseInt(digits, 10);
    if (hhInt > 23) return "23";
    return digits;
  }
}


function AbsenceInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex-1">
      <label className="mb-1.5 block text-xs font-medium text-slate-500">{label}</label>
      <input
        type="number"
        min={0}
        max={1}
        step={0.5}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="ltr-field w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
      />
    </div>
  );
}

export default function ReportModal({ record, defaultDate, onClose, onSave }: Props) {
  const [date, setDate] = useState(record?.date ?? defaultDate);
  const [classification, setClassification] = useState(record?.classification || "עבודה");
  const [entry, setEntry] = useState(padTime(record?.entry ?? ""));
  const [exit, setExit] = useState(padTime(record?.exit ?? ""));
  const [vacation, setVacation] = useState(record?.vacationDays ? String(record.vacationDays) : "");
  const [sick, setSick] = useState(record?.sickDays ? String(record.sickDays) : "");
  const [reserve, setReserve] = useState(record?.reserveDays ? String(record.reserveDays) : "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [uniqueNotes, setUniqueNotes] = useState(record?.uniqueNotes ?? "");
  const [orderType, setOrderType] = useState(record?.orderType || "מילואים רגילים");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classificationsList = useMemo(() => getClassifications(), []);
  const orderTypesList = useMemo(() => getOrderTypes(), []);

  // Auto-detect holiday for current date
  const holidayInfo = useMemo(() => (date ? getHolidayForDate(date) : undefined), [date]);

  // Auto-detect holiday dates when date changes (for new reports only)
  useEffect(() => {
    if (!record && holidayInfo) {
      setClassification(holidayInfo.category);
      setNotes((prev) => (prev ? prev : holidayInfo.name));
    }
  }, [date, record, holidayInfo]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!date) {
      setError("יש לבחור תאריך");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        date,
        entry: entry || undefined,
        exit: exit || undefined,
        classification,
        vacationDays: vacation ? parseFloat(vacation) : 0,
        sickDays: sick ? parseFloat(sick) : 0,
        reserveDays: reserve ? parseFloat(reserve) : 0,
        notes: notes || undefined,
        uniqueNotes: uniqueNotes || undefined,
        orderType: (classification === "מילואים" || (reserve && parseFloat(reserve) > 0)) ? orderType : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירת הדיווח");
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={record ? "עריכת דיווח" : "דיווח חדש"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">
            {record ? "עריכת דיווח" : "דיווח חדש"}
          </h2>
          <button onClick={onClose} aria-label="סגירה" className="text-slate-400 hover:text-slate-600">
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {holidayInfo && (
            <div className="flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-200 px-3.5 py-2.5 text-xs text-purple-900">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-200/70 text-[11px]">
                🗓️
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold">מועד מוגדר:</span>
                <span className="font-semibold text-purple-800">{holidayInfo.name}</span>
                <span className="rounded-md bg-purple-200/60 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                  {holidayInfo.category}
                </span>
              </div>
            </div>
          )}

          {/* Date + classification */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">תאריך</label>
              <input
                type={record ? "text" : "date"}
                value={record ? isoToDdmmyyyy(date) : date}
                onChange={(e) => {
                  if (!record) setDate(e.target.value);
                }}
                disabled={Boolean(record)}
                className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">סיווג</label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
              >
                {classificationsList.map((c) => (
                  <option key={c} value={c}>
                    {c === 'סופ"ש' ? "סופשבוע" : c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(classification === "מילואים" || (reserve && parseFloat(reserve) > 0)) && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">סוג צו מילואים</label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
              >
                {orderTypesList.map((ot) => (
                  <option key={ot} value={ot}>{ot}</option>
                ))}
              </select>
            </div>
          )}

          {/* Working hours block */}
          <div className="rounded-2xl bg-brand-50/60 p-4">
            <p className="mb-3 text-xs font-bold text-brand-700">שעות עבודה (פורמט 24H)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">כניסה</label>
                <input
                  type="text"
                  value={entry}
                  placeholder="08:00"
                  maxLength={5}
                  inputMode="numeric"
                  onChange={(e) => setEntry(formatTimeInput(e.target.value, entry))}
                  className="ltr-field w-full rounded-xl border border-transparent bg-white px-3 py-2.5 text-sm font-bold text-brand-700 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">יציאה</label>
                <input
                  type="text"
                  value={exit}
                  placeholder="17:00"
                  maxLength={5}
                  inputMode="numeric"
                  onChange={(e) => setExit(formatTimeInput(e.target.value, exit))}
                  className="ltr-field w-full rounded-xl border border-transparent bg-white px-3 py-2.5 text-sm font-bold text-brand-700 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>
          </div>

          {/* Full-day absences */}
          <div className="flex gap-4">
            <AbsenceInput label="חופש" value={vacation} onChange={setVacation} />
            <AbsenceInput label="מחלה" value={sick} onChange={setSick} />
            <AbsenceInput label="מילואים" value={reserve} onChange={setReserve} />
          </div>

          {/* Notes area */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">הערות</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="רישום הערות נוספות..."
                rows={3}
                maxLength={500}
                className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">הערות ייחודיות</label>
              <textarea
                value={uniqueNotes}
                onChange={(e) => setUniqueNotes(e.target.value)}
                placeholder="רישום הערות ייחודיות..."
                rows={3}
                maxLength={500}
                className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
            >
              <SaveIcon />
              {saving ? "שומר..." : "שמירה"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}