"use client";

import { FormEvent, useEffect, useState, useMemo } from "react";
import { DayRecord, ReportInput } from "@/lib/types";
import { SaveIcon, XIcon } from "./Icons";
import { getClassifications, getOrderTypes } from "@/lib/settingsStore";

interface Props {
  selectedDates: string[];
  existingRecords: DayRecord[];
  onClose: () => void;
  onSaveBatch: (updates: Partial<ReportInput>, fieldsToUpdate: string[]) => Promise<void>;
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

export default function BulkUpdateModal({
  selectedDates,
  existingRecords,
  onClose,
  onSaveBatch,
}: Props) {
  const classificationsList = useMemo(() => getClassifications(), []);
  const orderTypesList = useMemo(() => getOrderTypes(), []);

  // Field Enablers (which ones to overwrite)
  const [enableClassification, setEnableClassification] = useState(false);
  const [enableTimes, setEnableTimes] = useState(false);
  const [enableAbsences, setEnableAbsences] = useState(false);
  const [enableOrderType, setEnableOrderType] = useState(false);
  const [enableNotes, setEnableNotes] = useState(false);

  // Field Values
  const [classification, setClassification] = useState("עבודה");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [vacation, setVacation] = useState("");
  const [sick, setSick] = useState("");
  const [reserve, setReserve] = useState("");
  const [notes, setNotes] = useState("");
  const [uniqueNotes, setUniqueNotes] = useState("");
  const [orderType, setOrderType] = useState("מילואים רגילים");

  // Multi-stage modal state
  const [stage, setStage] = useState<"edit" | "confirm">("edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Auto-set hours/absences when category changes
  const handleClassificationChange = (val: string) => {
    setClassification(val);
    if (val !== "עבודה" && val !== "עבודה במילואים") {
      setEnableAbsences(true);
      if (val === "חופש") {
        setVacation("1");
        setSick("");
        setReserve("");
      } else if (val === "מחלה") {
        setVacation("");
        setSick("1");
        setReserve("");
      } else if (val === "מילואים") {
        setVacation("");
        setSick("");
        setReserve("1");
        setEnableOrderType(true);
      }
      // Disable times if it's a full-day absence
      setEnableTimes(false);
      setEntry("");
      setExit("");
    }
  };

  const fieldsToUpdate: string[] = [];
  if (enableClassification) fieldsToUpdate.push("classification");
  if (enableTimes) {
    fieldsToUpdate.push("entry");
    fieldsToUpdate.push("exit");
  }
  if (enableAbsences) {
    fieldsToUpdate.push("vacationDays");
    fieldsToUpdate.push("sickDays");
    fieldsToUpdate.push("reserveDays");
  }
  if (enableOrderType) {
    fieldsToUpdate.push("orderType");
  }
  if (enableNotes) {
    fieldsToUpdate.push("notes");
    fieldsToUpdate.push("uniqueNotes");
  }

  const updatesPayload: Partial<ReportInput> = {
    classification: enableClassification ? classification : undefined,
    entry: enableTimes ? (entry || undefined) : undefined,
    exit: enableTimes ? (exit || undefined) : undefined,
    vacationDays: enableAbsences ? (vacation ? parseFloat(vacation) : 0) : undefined,
    sickDays: enableAbsences ? (sick ? parseFloat(sick) : 0) : undefined,
    reserveDays: enableAbsences ? (reserve ? parseFloat(reserve) : 0) : undefined,
    notes: enableNotes ? (notes || undefined) : undefined,
    uniqueNotes: enableNotes ? (uniqueNotes || undefined) : undefined,
    orderType: enableOrderType ? orderType : undefined,
  };

  const handleNextStage = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fieldsToUpdate.length === 0) {
      setError("יש לבחור לפחות שדה אחד לעדכון מרוכז");
      return;
    }

    if (enableTimes && ((entry && !exit) || (!entry && exit))) {
      setError("בעדכון שעות יש להזין גם כניסה וגם יציאה");
      return;
    }

    setStage("confirm");
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSaveBatch(updatesPayload, fieldsToUpdate);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בשמירה מרוכזת");
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="עדכון רשומות מרוכז"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-6 py-4 flex-shrink-0">
          <h2 className="text-base font-bold text-slate-900">
            {stage === "edit" ? "עדכון מרוכז של רשומות" : "אישור עדכון מרוכז"}
          </h2>
          <button onClick={onClose} aria-label="סגירה" className="text-slate-400 hover:text-slate-600">
            <XIcon />
          </button>
        </div>

        {stage === "edit" ? (
          <form onSubmit={handleNextStage} className="flex-1 overflow-y-auto space-y-5 px-6 py-5">
            <p className="text-xs text-slate-500 bg-blue-50 text-blue-700 p-3 rounded-xl">
              בחר את השדות שברצונך לעדכן. רק שדות מסומנים יידרסו ברשומות הנבחרות, שאר המידע יישמר כפי שהוא.
            </p>

            {/* Classification field */}
            <div className="border border-slate-100 rounded-xl p-4 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={enableClassification}
                  onChange={(e) => setEnableClassification(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                עדכן סיווג פעילות
              </label>
              {enableClassification && (
                <select
                  value={classification}
                  onChange={(e) => handleClassificationChange(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
                >
                  {classificationsList.map((c) => (
                    <option key={c} value={c}>
                      {c === 'סופ"ש' ? "סופשבוע" : c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Times field */}
            <div className="border border-slate-100 rounded-xl p-4 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={enableTimes}
                  onChange={(e) => setEnableTimes(e.target.checked)}
                  disabled={classification !== "עבודה" && classification !== "עבודה במילואים" && enableClassification}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
                />
                עדכן שעות כניסה/יציאה
              </label>
              {enableTimes && (
                <div className="grid grid-cols-2 gap-4 bg-brand-50/60 p-3 rounded-xl">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 font-semibold">כניסה</label>
                    <input
                      type="text"
                      value={entry}
                      placeholder="08:00"
                      maxLength={5}
                      onChange={(e) => setEntry(formatTimeInput(e.target.value, entry))}
                      className="ltr-field w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm font-bold text-brand-700 shadow-sm outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 font-semibold">יציאה</label>
                    <input
                      type="text"
                      value={exit}
                      placeholder="17:00"
                      maxLength={5}
                      onChange={(e) => setExit(formatTimeInput(e.target.value, exit))}
                      className="ltr-field w-full rounded-xl border border-transparent bg-white px-3 py-2 text-sm font-bold text-brand-700 shadow-sm outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Absences field */}
            <div className="border border-slate-100 rounded-xl p-4 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={enableAbsences}
                  onChange={(e) => setEnableAbsences(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                עדכן היעדרויות / מילואים
              </label>
              {enableAbsences && (
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-slate-500">חופש</label>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.5}
                        value={vacation}
                        onChange={(e) => setVacation(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-100"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-slate-500">מחלה</label>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.5}
                        value={sick}
                        onChange={(e) => setSick(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-100"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-slate-500">מילואים</label>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.5}
                        value={reserve}
                        onChange={(e) => setReserve(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-100"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Order Type field */}
            <div className="border border-slate-100 rounded-xl p-4 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={enableOrderType}
                  onChange={(e) => setEnableOrderType(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                עדכן סוג צו מילואים (צו 8 / רגיל)
              </label>
              {enableOrderType && (
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
                >
                  {orderTypesList.map((ot) => (
                    <option key={ot} value={ot}>{ot}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Notes field */}
            <div className="border border-slate-100 rounded-xl p-4 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={enableNotes}
                  onChange={(e) => setEnableNotes(e.target.checked)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                עדכן הערות / פירוט משימות
              </label>
              {enableNotes && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">הערות</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="רישום הערות נוספות..."
                      rows={3}
                      maxLength={500}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">הערות ייחודיות</label>
                    <textarea
                      value={uniqueNotes}
                      onChange={(e) => setUniqueNotes(e.target.value)}
                      placeholder="רישום הערות ייחודיות..."
                      rows={3}
                      maxLength={500}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100/70 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 border-t border-slate-100 pt-4 flex-shrink-0">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                המשך לתצוגה מקדימה
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
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col px-6 py-5">
            <p className="text-sm font-medium text-slate-800 mb-3 text-right">
              האם אתה בטוח שברצונך לעדכן את {selectedDates.length} הרשומות הבאות?
            </p>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50/50 p-4 max-h-[350px] space-y-3">
              {selectedDates.sort().map((dateStr) => {
                const existing = existingRecords.find((r) => r.date === dateStr);
                const [y, m, d] = dateStr.split("-");
                const formattedDate = `${d}/${m}/${y}`;

                return (
                  <div key={dateStr} className="border-b border-slate-100 pb-2 last:border-b-0 last:pb-0 text-right">
                    <div className="font-bold text-xs text-brand-700">{formattedDate}</div>
                    <div className="space-y-1 mt-1 text-xs text-slate-600">
                      {enableClassification && existing?.classification !== classification && (
                        <div>
                          סיווג:{" "}
                          <span className="line-through text-red-500">{existing?.classification || "ריק"}</span>{" "}
                          &larr; <span className="text-emerald-600 font-semibold">{classification}</span>
                        </div>
                      )}
                      {enableTimes && (existing?.entry !== entry || existing?.exit !== exit) && (
                        <div>
                          שעות:{" "}
                          <span className="line-through text-red-500">
                            {existing?.entry && existing?.exit ? `${existing.entry}-${existing.exit}` : "ריק"}
                          </span>{" "}
                          &larr;{" "}
                          <span className="text-emerald-600 font-semibold">
                            {entry && exit ? `${entry}-${exit}` : "ריק"}
                          </span>
                        </div>
                      )}
                      {enableAbsences && (
                        <>
                          {existing?.vacationDays !== (vacation ? parseFloat(vacation) : 0) && (
                            <div>
                              חופש:{" "}
                              <span className="line-through text-red-500">{existing?.vacationDays ?? 0}</span>{" "}
                              &larr;{" "}
                              <span className="text-emerald-600 font-semibold">{vacation || 0}</span>
                            </div>
                          )}
                          {existing?.sickDays !== (sick ? parseFloat(sick) : 0) && (
                            <div>
                              מחלה:{" "}
                              <span className="line-through text-red-500">{existing?.sickDays ?? 0}</span>{" "}
                              &larr;{" "}
                              <span className="text-emerald-600 font-semibold">{sick || 0}</span>
                            </div>
                          )}
                          {existing?.reserveDays !== (reserve ? parseFloat(reserve) : 0) && (
                            <div>
                              מילואים:{" "}
                              <span className="line-through text-red-500">{existing?.reserveDays ?? 0}</span>{" "}
                              &larr;{" "}
                              <span className="text-emerald-600 font-semibold">{reserve || 0}</span>
                            </div>
                          )}
                        </>
                      )}
                      {enableOrderType && existing?.orderType !== orderType && (
                        <div>
                          סוג צו:{" "}
                          <span className="line-through text-red-500">{existing?.orderType || "—"}</span>{" "}
                          &larr;{" "}
                          <span className="text-emerald-600 font-semibold">{orderType}</span>
                        </div>
                      )}
                      {enableNotes && existing?.notes !== notes && (
                        <div className="truncate">
                          הערות:{" "}
                          <span className="line-through text-red-500">{existing?.notes || "—"}</span>{" "}
                          &larr;{" "}
                          <span className="text-emerald-600 font-semibold">{notes || "—"}</span>
                        </div>
                      )}
                      {enableNotes && existing?.uniqueNotes !== uniqueNotes && (
                        <div className="truncate">
                          הערות ייחודיות:{" "}
                          <span className="line-through text-red-500">{existing?.uniqueNotes || "—"}</span>{" "}
                          &larr;{" "}
                          <span className="text-emerald-600 font-semibold">{uniqueNotes || "—"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 mt-3">{error}</p>
            )}

            <div className="flex items-center gap-3 border-t border-slate-100 pt-4 mt-4 flex-shrink-0">
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
              >
                <SaveIcon />
                {saving ? "שומר שינויים..." : "אשר ובצע עדכון"}
              </button>
              <button
                type="button"
                onClick={() => setStage("edit")}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
              >
                חזור לעריכה
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
