"use client";

import { FormEvent, useEffect, useState, useMemo } from "react";
import { DayRecord, ReportInput, ReportShift } from "@/lib/types";
import { SaveIcon, XIcon, PlusIcon, TrashIcon } from "./Icons";
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
  const initialShifts = useMemo(() => {
    if (record?.shifts && record.shifts.length > 0) {
      return record.shifts.map((s) => ({
        entry: padTime(s.entry),
        exit: padTime(s.exit),
        description: s.description || "",
      }));
    }
    return [];
  }, [record]);

  const [shifts, setShifts] = useState<ReportShift[]>(initialShifts);

  const addShift = () => {
    setShifts((prev) => [
      ...prev,
      { entry: "08:00", exit: "12:00", description: `מקטע ${prev.length + 1}` },
    ]);
  };

  const removeShift = (idx: number) => {
    setShifts((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateShift = (idx: number, field: keyof ReportShift, val: string) => {
    setShifts((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  // Convert HH:mm to minutes
  const toMin = (t: string) => {
    if (!t || !t.includes(":")) return 0;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  // Live total hours calculation
  const computedTotalHours = useMemo(() => {
    if (shifts.length > 0) {
      let totalMins = 0;
      for (const s of shifts) {
        if (s.entry && s.exit) {
          const diff = toMin(s.exit) - toMin(s.entry);
          if (diff > 0) totalMins += diff;
        }
      }
      const hrs = totalMins / 60;
      const h = Math.floor(hrs);
      const m = Math.round((hrs - h) * 60);
      return { decimal: Math.round(hrs * 100) / 100, text: `${h}:${String(m).padStart(2, "0")}` };
    }
    if (entry && exit) {
      const diff = toMin(exit) - toMin(entry);
      if (diff > 0) {
        const hrs = diff / 60;
        const h = Math.floor(hrs);
        const m = Math.round((hrs - h) * 60);
        return { decimal: Math.round(hrs * 100) / 100, text: `${h}:${String(m).padStart(2, "0")}` };
      }
    }
    return { decimal: 0, text: "0:00" };
  }, [shifts, entry, exit]);

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
      const effectiveEntry = shifts.length > 0 ? (shifts[0]?.entry || entry || undefined) : (entry || undefined);
      const effectiveExit = shifts.length > 0 ? (shifts[shifts.length - 1]?.exit || exit || undefined) : (exit || undefined);
      const validShifts = shifts.filter((s) => s.entry && s.exit);

      await onSave({
        date,
        entry: effectiveEntry,
        exit: effectiveExit,
        shifts: validShifts.length > 0 ? validShifts : undefined,
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 sm:px-6 py-4 shrink-0">
          <h2 className="text-base font-bold text-slate-900">
            {record ? "עריכת דיווח" : "דיווח חדש"}
          </h2>
          <button onClick={onClose} aria-label="סגירה" className="text-slate-400 hover:text-slate-600">
            <XIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-4 sm:px-6 py-5 overflow-y-auto flex-1">
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
          <div className="rounded-2xl bg-brand-50/60 p-4 border border-brand-100/80">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-brand-700">שעות עבודה (פורמט 24H)</p>
                {computedTotalHours.decimal > 0 && (
                  <span className="rounded-md bg-brand-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
                    סה״כ: {computedTotalHours.text} ({computedTotalHours.decimal} שע׳)
                  </span>
                )}
              </div>
              {shifts.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    const firstEntry = shifts[0]?.entry || entry;
                    const lastExit = shifts[shifts.length - 1]?.exit || exit;
                    setEntry(firstEntry);
                    setExit(lastExit);
                    setShifts([]);
                  }}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-800 underline transition"
                >
                  חזרה למשמרת רציפה
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShifts([
                      { entry: entry || "08:00", exit: exit ? (toMin(exit) > toMin(entry || "08:00") + 240 ? "12:00" : exit) : "12:00", description: "מקטע 1" },
                      { entry: "12:30", exit: exit || "17:00", description: "מקטע 2" },
                    ]);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800 transition bg-white/80 border border-brand-200 rounded-lg px-2 py-1 shadow-xs"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>פיצול למקטעים</span>
                </button>
              )}
            </div>

            {shifts.length > 0 ? (
              <div className="space-y-3">
                {shifts.map((s, idx) => (
                  <div key={idx} className="relative rounded-xl border border-brand-200/90 bg-white p-3 shadow-xs transition hover:border-brand-300">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-100 text-[11px] font-extrabold text-brand-700">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={s.description || `מקטע ${idx + 1}`}
                          placeholder={`מקטע ${idx + 1}`}
                          onChange={(e) => updateShift(idx, "description", e.target.value)}
                          className="text-xs font-bold text-slate-700 bg-transparent border-none outline-none focus:text-brand-700"
                        />
                      </div>
                      {shifts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeShift(idx)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="מחיקת מקטע"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-500">כניסה</label>
                        <input
                          type="text"
                          value={s.entry}
                          placeholder="08:00"
                          maxLength={5}
                          inputMode="numeric"
                          onChange={(e) => updateShift(idx, "entry", formatTimeInput(e.target.value, s.entry))}
                          className="ltr-field w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-brand-700 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-200"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-slate-500">יציאה</label>
                        <input
                          type="text"
                          value={s.exit}
                          placeholder="12:00"
                          maxLength={5}
                          inputMode="numeric"
                          onChange={(e) => updateShift(idx, "exit", formatTimeInput(e.target.value, s.exit))}
                          className="ltr-field w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-brand-700 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-200"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addShift}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-300 bg-white/70 py-2 text-xs font-bold text-brand-600 hover:bg-brand-50/50 hover:border-brand-400 transition"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>הוסף מקטע עבודה נוסף</span>
                </button>
              </div>
            ) : (
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
            )}
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