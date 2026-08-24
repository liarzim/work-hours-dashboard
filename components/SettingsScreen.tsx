"use client";

import { useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { useSettings } from "@/lib/client";
import { HEBREW_MONTHS, HEBREW_DAYS } from "@/lib/types";
import { SaveIcon, ShieldIcon, UmbrellaIcon, FingerprintIcon, UploadIcon, ListIcon } from "./Icons";
import { createSupabaseClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";
import {
  getClassifications,
  saveClassifications,
  getOrderTypes,
  saveOrderTypes,
  getHolidays,
  saveHolidays,
  getHolidayNames,
  saveHolidayNames,
  getNonWorkingDays,
  saveNonWorkingDays,
  HolidaySetting
} from "@/lib/settingsStore";

export default function SettingsScreen() {
  const { data, isLoading } = useSettings();
  const { mutate } = useSWRConfig();

  const [quota, setQuota] = useState("21");
  const [years, setYears] = useState<Record<string, number[]>>({});
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [newYear, setNewYear] = useState("");
  const [newYearDays, setNewYearDays] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Weekly non-working days state
  const [nonWorkingDays, setNonWorkingDays] = useState<number[]>([]);

  // Standalone list and holiday states
  const [classifications, setClassificationsState] = useState<string[]>([]);
  const [orderTypes, setOrderTypesState] = useState<string[]>([]);
  const [holidays, setHolidaysState] = useState<HolidaySetting[]>([]);

  // State for adding new items
  const [newClassification, setNewClassification] = useState("");
  const [newOrderType, setNewOrderType] = useState("");
  
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayCategory, setNewHolidayCategory] = useState("חג");

  // Holiday Names List State
  const [holidayNames, setHolidayNamesState] = useState<string[]>([]);
  const [newHolidayNameVal, setNewHolidayNameVal] = useState("");

  // Holiday Year Pagination and Import State
  const [holidayYear, setHolidayYear] = useState(String(new Date().getFullYear()));
  const [holidayImportMessage, setHolidayImportMessage] = useState<string | null>(null);
  const [holidayImportError, setHolidayImportError] = useState<string | null>(null);

  // Active Tab for Dropdown settings options
  const [activeTab, setActiveTab] = useState<"classifications" | "orderTypes" | "holidayNames">("classifications");

  // Authentication & Passkey State
  const [userEmail, setUserEmail] = useState("");
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState<string | null>(null);
  const [passkeySupported, setPasskeySupported] = useState(false);

  // Import State
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setQuota(String(data.annualVacationQuota));
      setYears(data.years);
      if (!data.years[selectedYear]) {
        const ys = Object.keys(data.years).sort();
        if (ys.length) setSelectedYear(ys[ys.length - 1]);
      }
    }
  }, [data]);

  // Load lists from store on mount
  useEffect(() => {
    setClassificationsState(getClassifications());
    setOrderTypesState(getOrderTypes());
    setHolidaysState(getHolidays());
    setNonWorkingDays(getNonWorkingDays());
    const names = getHolidayNames();
    setHolidayNamesState(names);
    if (names.length) {
      setNewHolidayName(names[0]);
    }
  }, []);

  const toggleNonWorkingDay = (dayIdx: number) => {
    setNonWorkingDays((prev) => {
      const next = prev.includes(dayIdx)
        ? prev.filter((d) => d !== dayIdx)
        : [...prev, dayIdx];
      saveNonWorkingDays(next);
      return next;
    });
  };

  const recalculateYearGridFromNonWorkingDays = () => {
    const y = parseInt(selectedYear, 10);
    if (!y) return;
    const newMonths = Array.from({ length: 12 }, (_, m) => {
      const days = new Date(y, m + 1, 0).getDate();
      let count = 0;
      for (let d = 1; d <= days; d++) {
        const dayOfWeek = new Date(y, m, d).getDay();
        if (!nonWorkingDays.includes(dayOfWeek)) count++;
      }
      return count;
    });
    setYears((prev) => ({
      ...prev,
      [selectedYear]: newMonths,
    }));
  };

  // Fetch logged in user email and check biometric support
  useEffect(() => {
    const initAuth = async () => {
      const supabase = createSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ?? "");
      }

      if (window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setPasskeySupported(available);
      }
    };
    initAuth();
  }, []);

  const accrual = useMemo(() => {
    const q = parseFloat(quota);
    return Number.isFinite(q) ? (q / 12).toFixed(2) : "—";
  }, [quota]);

  const months = years[selectedYear] ?? Array(12).fill(0);

  function setMonthDays(i: number, v: string) {
    const n = parseFloat(v);
    setYears((prev) => ({
      ...prev,
      [selectedYear]: (prev[selectedYear] ?? Array(12).fill(0)).map((x, j) =>
        j === i ? (Number.isFinite(n) ? n : 0) : x
      ),
    }));
  }

  function addYear() {
    if (!/^\d{4}$/.test(newYear)) return;
    const def = parseFloat(newYearDays);
    setYears((prev) => ({
      ...prev,
      [newYear]: prev[newYear] ?? Array(12).fill(Number.isFinite(def) ? def : 0),
    }));
    setSelectedYear(newYear);
    setNewYear("");
    setNewYearDays("");
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const body = { annualVacationQuota: parseFloat(quota) || 0, years };
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "שגיאה בשמירה");
      await mutate("/api/settings");
      await mutate((key) => typeof key === "string" && key.startsWith("/api/reports"));
      setMessage("ההגדרות נשמרו בהצלחה");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "שגיאה בשמירת ההגדרות");
    } finally {
      setSaving(false);
    }
  }

  // Standalone updates handlers for holiday names
  const handleSaveHolidayNames = () => {
    saveHolidayNames(holidayNames);
    setMessage("רשימת שמות החגים נשמרה בהצלחה");
    setTimeout(() => setMessage(null), 3000);
  };

  const addHolidayName = () => {
    if (!newHolidayNameVal.trim()) return;
    if (holidayNames.includes(newHolidayNameVal.trim())) return;
    setHolidayNamesState((prev) => [...prev, newHolidayNameVal.trim()]);
    setNewHolidayNameVal("");
  };

  const removeHolidayName = (val: string) => {
    setHolidayNamesState((prev) => prev.filter((x) => x !== val));
  };

  // Standalone updates handlers
  const handleSaveClassifications = () => {
    saveClassifications(classifications);
    setMessage("רשימת הסיווגים נשמרה בהצלחה");
    setTimeout(() => setMessage(null), 3000);
  };

  const addClassification = () => {
    if (!newClassification.trim()) return;
    if (classifications.includes(newClassification.trim())) return;
    setClassificationsState((prev) => [...prev, newClassification.trim()]);
    setNewClassification("");
  };

  const removeClassification = (val: string) => {
    setClassificationsState((prev) => prev.filter((x) => x !== val));
  };

  const handleSaveOrderTypes = () => {
    saveOrderTypes(orderTypes);
    setMessage("רשימת סוגי הצו נשמרה בהצלחה");
    setTimeout(() => setMessage(null), 3000);
  };

  const addOrderType = () => {
    if (!newOrderType.trim()) return;
    if (orderTypes.includes(newOrderType.trim())) return;
    setOrderTypesState((prev) => [...prev, newOrderType.trim()]);
    setNewOrderType("");
  };

  const removeOrderType = (val: string) => {
    setOrderTypesState((prev) => prev.filter((x) => x !== val));
  };

  const handleSaveHolidays = () => {
    saveHolidays(holidays);
    setMessage("רשימת החגים נשמרה בהצלחה");
    setTimeout(() => setMessage(null), 3000);
  };

  const addHoliday = () => {
    if (!newHolidayDate || !newHolidayName.trim()) return;
    if (holidays.some((h) => h.date === newHolidayDate)) {
      alert("כבר קיים חג בתאריך זה");
      return;
    }
    const hYear = newHolidayDate.split("-")[0];
    setHolidaysState((prev) => [
      ...prev,
      {
        date: newHolidayDate,
        name: newHolidayName.trim(),
        category: newHolidayCategory,
      },
    ].sort((a, b) => a.date.localeCompare(b.date)));
    
    // Automatically switch to the year of the holiday added
    setHolidayYear(hYear);
    
    setNewHolidayDate("");
    setNewHolidayName("");
  };

  const removeHoliday = (date: string) => {
    setHolidaysState((prev) => prev.filter((x) => x.date !== date));
  };

  // Excel/CSV Holiday File Upload Handler
  const handleHolidayFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setHolidayImportMessage(null);
    setHolidayImportError(null);

    const isExcel = file.name.endsWith(".xls") || file.name.endsWith(".xlsx");
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const dataBytes = e.target?.result;
        let rows: any[] = [];

        if (isExcel) {
          const workbook = XLSX.read(dataBytes, { type: "array" });
          const firstSheet = workbook.SheetNames[0];
          rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { header: 1 });
        } else {
          const text = e.target?.result as string;
          rows = text.split("\n").map((line) => {
            return line.split(",").map((cell) => cell.replace(/^["']|["']$/g, "").trim());
          });
        }

        if (!rows.length) throw new Error("הקובץ ריק");

        const headers = rows[0].map((h: any) => String(h || "").trim());
        let dateIdx = headers.indexOf("תאריך");
        let nameIdx = headers.indexOf("שם החג");
        let catIdx = headers.indexOf("סיווג");

        if (dateIdx === -1) dateIdx = headers.indexOf("Date") !== -1 ? headers.indexOf("Date") : 0;
        if (nameIdx === -1) nameIdx = headers.indexOf("Holiday Name") !== -1 ? headers.indexOf("Holiday Name") : 1;
        if (catIdx === -1) catIdx = headers.indexOf("Category") !== -1 ? headers.indexOf("Category") : 2;

        const importedHolidays: HolidaySetting[] = [];
        let skippedRowsCount = 0;

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 2 || !row[dateIdx]) {
            skippedRowsCount++;
            continue;
          }

          let rawDate = String(row[dateIdx]).trim();
          let rawName = String(row[nameIdx] || "").trim();
          let rawCat = String(row[catIdx] || "חג").trim();

          if (!rawDate || !rawName) {
            skippedRowsCount++;
            continue;
          }

          let parsedDate = "";
          const ddmmyyyyMatch = /^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/.exec(rawDate);
          const yyyymmddMatch = /^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})$/.exec(rawDate);

          if (ddmmyyyyMatch) {
            parsedDate = `${ddmmyyyyMatch[3]}-${ddmmyyyyMatch[2].padStart(2, "0")}-${ddmmyyyyMatch[1].padStart(2, "0")}`;
          } else if (yyyymmddMatch) {
            parsedDate = `${yyyymmddMatch[1]}-${yyyymmddMatch[2].padStart(2, "0")}-${yyyymmddMatch[3].padStart(2, "0")}`;
          } else {
            const serial = parseFloat(rawDate);
            if (!isNaN(serial) && serial > 30000 && serial < 60000) {
              const d = new Date((serial - 25569) * 86400 * 1000);
              parsedDate = d.toISOString().split("T")[0];
            } else {
              try {
                const d = new Date(rawDate);
                if (!isNaN(d.getTime())) {
                  parsedDate = d.toISOString().split("T")[0];
                }
              } catch {}
            }
          }

          if (!parsedDate || !/^\d{4}-\d{2}-\d{2}$/.test(parsedDate)) {
            skippedRowsCount++;
            continue;
          }

          if (rawCat.includes("ערב")) rawCat = "ערב חג";
          else if (rawCat.includes("מועד") || rawCat.includes("חול")) rawCat = "חול המועד";
          else rawCat = "חג";

          importedHolidays.push({
            date: parsedDate,
            name: rawName,
            category: rawCat,
          });
        }

        if (!importedHolidays.length) {
          throw new Error("לא נמצאו רשומות חגים תקינות בקובץ");
        }

        setHolidaysState((prev) => {
          const merged = [...prev];
          let addedCount = 0;
          let updatedCount = 0;

          for (const newH of importedHolidays) {
            const existingIdx = merged.findIndex((h) => h.date === newH.date);
            if (existingIdx !== -1) {
              merged[existingIdx] = newH;
              updatedCount++;
            } else {
              merged.push(newH);
              addedCount++;
            }
          }

          merged.sort((a, b) => a.date.localeCompare(b.date));
          setHolidayImportMessage(
            `הייבוא הושלם! נוספו ${addedCount} חגים, עודכנו ${updatedCount} חגים.`
          );
          return merged;
        });

      } catch (err) {
        setHolidayImportError(err instanceof Error ? err.message : "שגיאה בניתוח קובץ החגים");
      }
    };

    reader.onerror = () => {
      setHolidayImportError("שגיאה בקריאת הקובץ מהמכשיר");
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file, "UTF-8");
    }
  };

  const holidayCsvTemplate = "תאריך,שם החג,סיווג\n" +
    "02/04/2026,ערב פסח,ערב חג\n" +
    "03/04/2026,פסח א',חג\n" +
    "09/04/2026,שביעי של פסח,חג\n" +
    "21/05/2026,ערב שבועות,ערב חג\n";
  const holidayCsvTemplateUrl = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(holidayCsvTemplate);

  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) => h.date.startsWith(holidayYear));
  }, [holidays, holidayYear]);

  // Register Device Passkey (Face ID / Fingerprint)
  async function registerPasskey() {
    if (!userEmail) return;
    setPasskeyLoading(true);
    setPasskeyMessage(null);
    try {
      const challenge = new Uint8Array([1, 2, 3, 4]);
      const userId = new Uint8Array([5, 6, 7, 8]);
      
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "24H Work Dashboard", id: window.location.hostname },
          user: {
            id: userId,
            name: userEmail,
            displayName: userEmail
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          timeout: 60000,
          authenticatorSelection: {
            userVerification: "required"
          }
        }
      });

      if (credential) {
        setPasskeyMessage("המפתח הביומטרי נרשם בהצלחה בדפדפן זה!");
      }
    } catch (e) {
      setPasskeyMessage(e instanceof Error ? e.message : "רישום המפתח נכשל");
    } finally {
      setPasskeyLoading(false);
    }
  }

  // Historic Data Importer
  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMessage(null);
    setImportError(null);

    const isExcel = file.name.endsWith(".xls") || file.name.endsWith(".xlsx");
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const dataBytes = e.target?.result;
        let rows: any[] = [];

        if (isExcel) {
          const workbook = XLSX.read(dataBytes, { type: "array" });
          const firstSheet = workbook.SheetNames[0];
          rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { header: 1 });
        } else {
          // Parse CSV
          const text = e.target?.result as string;
          rows = text.split("\n").map((line) => {
            return line.split(",").map((cell) => cell.replace(/^["']|["']$/g, "").trim());
          });
        }

        if (!rows.length) throw new Error("הקובץ ריק");

        // Validate and upload
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "ייבוא נכשל");

        setImportMessage(`הייבוא הושלם בהצלחה! נקלטו ${json.count} רשומות.`);
        await mutate((key) => typeof key === "string" && key.startsWith("/api/reports"));
      } catch (err) {
        setImportError(err instanceof Error ? err.message : "שגיאה בייבוא הנתונים");
      } finally {
        setImporting(false);
      }
    };

    reader.onerror = () => {
      setImportError("שגיאה בקריאת הקובץ מהמכשיר");
      setImporting(false);
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file, "UTF-8");
    }
  }

  // CSV template generation (\uFEFF adds BOM so Excel opens Hebrew correctly)
  const csvTemplate = "תאריך,כניסה,יציאה,סיווג,חופש,מחלה,מילואים,הערות\n" +
    "01/07/2026,07:30,16:30,עבודה,0,0,0,יום עבודה רגיל\n" +
    "02/07/2026,,,חופש,1,0,0,יום חופש שנתי\n" +
    "03/07/2026,,,מילואים,0,0,1,צו 8 פעילות מבצעית\n";
  const csvTemplateUrl = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csvTemplate);

  if (isLoading && !data) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />;
  }

  const inputCls =
    "ltr-field w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-brand-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-12">
      {/* Vacation settings */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <UmbrellaIcon className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-bold text-slate-800">הגדרות חופשה</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              מכסת חופשה שנתית (בימים)
            </label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              צבירה חודשית מחושבת
            </label>
            <div className="rounded-xl bg-brand-50 px-3 py-2.5 text-sm font-bold text-brand-700">
              {accrual} ימים/חודש
            </div>
          </div>
        </div>
      </section>

      {/* Weekly Non-Working Days Table Card */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <ShieldIcon className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-bold text-slate-800">ימי מנוחה שבועיים (ימים לא עובדים בשבוע)</h2>
          </div>
          <button
            type="button"
            onClick={recalculateYearGridFromNonWorkingDays}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 transition"
          >
            חישוב תקן שנתי לפי ימי מנוחה
          </button>
        </div>
        <p className="mb-4 text-xs text-slate-500">
          סימון הימים בשבוע שאינם ימי עבודה (למשל שישי ושבת). ימים אלו לא יחושבו בימי העבודה החודשיים ויוצגו כעמודה אפורה מלאה בגרף.
        </p>

        <div className="overflow-hidden rounded-xl border border-slate-100">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="bg-slate-50/80 text-xs font-semibold text-slate-500 border-b border-slate-100">
                <th className="px-4 py-2.5">יום בשבוע</th>
                <th className="px-4 py-2.5 text-center">סטטוס</th>
                <th className="px-4 py-2.5 text-center">יום לא עובד (מנוחה)</th>
              </tr>
            </thead>
            <tbody>
              {HEBREW_DAYS.map((dayName, dayIdx) => {
                const isNonWorking = nonWorkingDays.includes(dayIdx);
                return (
                  <tr key={dayName} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-medium text-slate-700">יום {dayName}</td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isNonWorking
                            ? "bg-slate-100 text-slate-600"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {isNonWorking ? "יום מנוחה" : "יום עבודה"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={isNonWorking}
                        onChange={() => toggleNonWorkingDay(dayIdx)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Annual standards matrix */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <ShieldIcon className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-bold text-slate-800">תקן ימי עבודה שנתי</h2>
          <div className="ms-auto flex items-center gap-2 text-sm">
            <span className="text-slate-500">בחר שנה:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus:border-brand-500"
            >
              {Object.keys(years).sort().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
              {!years[selectedYear] && <option value={selectedYear}>{selectedYear}</option>}
            </select>
          </div>
        </div>

        {/* Add year tool */}
        <div className="mb-6 rounded-2xl bg-slate-50/50 p-4 border border-slate-100">
          <p className="mb-3 text-[11px] font-bold text-slate-500">הוספת שנה חדשה למטריצה:</p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="שנה (למשל 2027)"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              className="ltr-field w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <input
              type="number"
              placeholder="ימי עבודה לחודש כברירת מחדל"
              value={newYearDays}
              onChange={(e) => setNewYearDays(e.target.value)}
              className="ltr-field w-56 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <button
              onClick={addYear}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 shadow-sm"
            >
              הוסף
            </button>
          </div>
        </div>

        {/* 3x4 months grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {HEBREW_MONTHS.map((name, i) => (
            <div key={name} className="rounded-2xl border border-slate-100 bg-slate-50/40 p-3">
              <label className="mb-1.5 block text-center text-[11px] font-medium text-slate-400">
                {name}
              </label>
              <input
                type="number"
                min={0}
                max={31}
                value={months[i] ?? ""}
                onChange={(e) => setMonthDays(i, e.target.value)}
                className={`${inputCls} text-center`}
              />
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            <SaveIcon />
            {saving ? "שומר..." : "שמור הגדרות"}
          </button>
          {message && <p className="text-xs text-slate-500">{message}</p>}
        </div>
      </section>

      {/* Holidays Table */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <UmbrellaIcon className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-bold text-slate-800">תאריכי חגים וסיווגם</h2>
          </div>

          {/* Year Navigator (Forward/Back) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHolidayYear(prev => String(parseInt(prev) - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 shadow-sm"
              title="שנה קודמת"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <span className="text-sm font-extrabold text-slate-800 w-12 text-center">{holidayYear}</span>
            <button
              onClick={() => setHolidayYear(prev => String(parseInt(prev) + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 shadow-sm"
              title="שנה הבאה"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Add holiday form */}
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-100">
          <div>
            <label className="mb-1 block text-xs text-slate-500">תאריך</label>
            <input
              type="date"
              value={newHolidayDate}
              onChange={(e) => setNewHolidayDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">שם החג</label>
            <select
              value={newHolidayName}
              onChange={(e) => setNewHolidayName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500"
            >
              {holidayNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">סיווג</label>
            <select
              value={newHolidayCategory}
              onChange={(e) => setNewHolidayCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="חג">חג</option>
              <option value="ערב חג">ערב חג</option>
              <option value="חול המועד">חול המועד</option>
            </select>
          </div>
          <button
            onClick={addHoliday}
            className="w-full rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 shadow-sm"
          >
            הוסף חג
          </button>
        </div>

        {/* Holidays list table */}
        <div className="overflow-hidden rounded-xl border border-slate-100 mb-4 max-h-60 overflow-y-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="bg-slate-50/80 text-xs font-semibold text-slate-500 border-b border-slate-100">
                <th className="px-4 py-2.5">תאריך</th>
                <th className="px-4 py-2.5">שם החג</th>
                <th className="px-4 py-2.5">סיווג</th>
                <th className="px-4 py-2.5 text-center">פעולה</th>
              </tr>
            </thead>
            <tbody>
              {filteredHolidays.map((h) => {
                const [y, m, d] = h.date.split("-");
                return (
                  <tr key={h.date} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-medium text-slate-700">{`${d}/${m}/${y}`}</td>
                    <td className="px-4 py-2 text-slate-650">{h.name}</td>
                    <td className="px-4 py-2">
                      <span className="inline-block rounded-full bg-purple-50 text-purple-700 px-2.5 py-0.5 text-xs font-semibold">
                        {h.category}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => removeHoliday(h.date)}
                        className="text-red-500 hover:text-red-700 text-xs font-semibold"
                      >
                        מחק
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!filteredHolidays.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-400">
                    אין חגים רשומים לשנת {holidayYear}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mt-2 pt-2 border-t border-slate-100">
          <button
            onClick={handleSaveHolidays}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <SaveIcon className="h-3.5 w-3.5" />
            שמור חגים
          </button>

          {/* Holiday Excel/CSV Importer */}
          <div className="flex items-center gap-3 bg-slate-50/60 p-2 rounded-xl border border-slate-150 text-xs">
            <span className="font-semibold text-slate-600">ייבוא חגים (Excel / CSV):</span>
            <a
              href={holidayCsvTemplateUrl}
              download="holidays_template.csv"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-medium transition"
              title="הורדת קובץ דוגמה"
            >
              תבנית CSV
            </a>
            <label className="rounded-lg bg-indigo-600 text-white px-3 py-1 hover:bg-indigo-700 font-semibold cursor-pointer transition">
              בחר קובץ
              <input
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleHolidayFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {holidayImportMessage && <p className="text-xs text-emerald-600 mt-2 font-medium">{holidayImportMessage}</p>}
        {holidayImportError && <p className="text-xs text-red-600 mt-2 font-medium">{holidayImportError}</p>}
      </section>

      {/* Dropdown Options Tables */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <ListIcon className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-bold text-slate-800">טבלאות ערכי רשימות נפתחות</h2>
          </div>

          {/* Premium Tab Selector */}
          <div className="flex bg-slate-100/80 p-1 rounded-xl gap-1 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab("classifications")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "classifications"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              סיווגי פעילות
            </button>
            <button
              onClick={() => setActiveTab("orderTypes")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "orderTypes"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              סוגי צו
            </button>
            <button
              onClick={() => setActiveTab("holidayNames")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "holidayNames"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              שמות החגים
            </button>
          </div>
        </div>

        {/* Tab Content Panel */}
        <div className="w-full max-w-lg mx-auto bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
          {activeTab === "classifications" && (
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-slate-600">עריכת סיווגי פעילות</h3>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newClassification}
                  onChange={(e) => setNewClassification(e.target.value)}
                  placeholder="סיווג פעילות חדש..."
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 shadow-sm"
                />
                <button
                  onClick={addClassification}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 shadow-sm"
                >
                  הוסף
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-150 max-h-60 overflow-y-auto bg-white shadow-inner">
                <table className="w-full text-sm text-right">
                  <tbody>
                    {classifications.map((c) => (
                      <tr key={c} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-semibold text-slate-700">{c}</td>
                        <td className="px-4 py-2.5 text-center" style={{ width: "80px" }}>
                          <button
                            onClick={() => removeClassification(c)}
                            className="text-red-500 hover:text-red-700 text-xs font-bold"
                          >
                            מחק
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <button
                onClick={handleSaveClassifications}
                className="flex items-center gap-2 w-full sm:w-auto justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-700 transition"
              >
                <SaveIcon className="h-4 w-4" />
                שמור סיווגים
              </button>
            </div>
          )}

          {activeTab === "orderTypes" && (
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-slate-600">עריכת סוגי צו מילואים</h3>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOrderType}
                  onChange={(e) => setNewOrderType(e.target.value)}
                  placeholder="סוג צו חדש..."
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 shadow-sm"
                />
                <button
                  onClick={addOrderType}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 shadow-sm"
                >
                  הוסף
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-150 max-h-60 overflow-y-auto bg-white shadow-inner">
                <table className="w-full text-sm text-right">
                  <tbody>
                    {orderTypes.map((ot) => (
                      <tr key={ot} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-semibold text-slate-700">{ot}</td>
                        <td className="px-4 py-2.5 text-center" style={{ width: "80px" }}>
                          <button
                            onClick={() => removeOrderType(ot)}
                            className="text-red-500 hover:text-red-700 text-xs font-bold"
                          >
                            מחק
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <button
                onClick={handleSaveOrderTypes}
                className="flex items-center gap-2 w-full sm:w-auto justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-700 transition"
              >
                <SaveIcon className="h-4 w-4" />
                שמור סוגי צו
              </button>
            </div>
          )}

          {activeTab === "holidayNames" && (
            <div className="space-y-4">
              <h3 className="text-xs font-extrabold text-slate-600">עריכת שמות חגים רשומים</h3>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newHolidayNameVal}
                  onChange={(e) => setNewHolidayNameVal(e.target.value)}
                  placeholder="שם חג חדש..."
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 shadow-sm"
                />
                <button
                  onClick={addHolidayName}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 shadow-sm"
                >
                  הוסף
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-150 max-h-60 overflow-y-auto bg-white shadow-inner">
                <table className="w-full text-sm text-right">
                  <tbody>
                    {holidayNames.map((n) => (
                      <tr key={n} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-semibold text-slate-700">{n}</td>
                        <td className="px-4 py-2.5 text-center" style={{ width: "80px" }}>
                          <button
                            onClick={() => removeHolidayName(n)}
                            className="text-red-500 hover:text-red-700 text-xs font-bold"
                          >
                            מחק
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <button
                onClick={handleSaveHolidayNames}
                className="flex items-center gap-2 w-full sm:w-auto justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-700 transition"
              >
                <SaveIcon className="h-4 w-4" />
                שמור שמות חגים
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Historic Data Importer */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <UploadIcon className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-bold text-slate-800">ייבוא היסטוריית דיווחים (Excel / CSV)</h2>
        </div>
        <p className="mb-4 text-xs text-slate-500 leading-relaxed">
          תוכל להעלות קובץ CSV כדי לייבא את כל דיווח השעות ההיסטורי שלך. המערכת מזהה אוטומטית הן את תבנית הייבוא הרגילה והן את הגיליון הישן בעל 31 העמודות.
        </p>
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-dashed border-slate-200">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-700">רוצה להשתמש בתבנית נקייה?</p>
              <p className="text-[11px] text-slate-400 mt-0.5">הורד את קובץ ה-CSV המובנה ומלא את השעות.</p>
            </div>
            <a
              href={csvTemplateUrl}
              download="attendance_template.csv"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-brand-600 hover:bg-slate-50 shadow-sm"
            >
              הורד תבנית CSV
            </a>
          </div>

          <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-8 text-center cursor-pointer transition hover:border-brand-400 hover:bg-slate-50">
            <UploadIcon className="h-8 w-8 text-slate-400 mb-2" />
            <span className="text-sm font-bold text-slate-700">בחר קובץ CSV או Excel להעלאה</span>
            <span className="text-xs text-slate-400 mt-1">תומך ב-CSV, XLS, XLSX (גרור לכאן או לחץ לדפדוף)</span>
            <input
              type="file"
              accept=".csv,.xls,.xlsx"
              disabled={importing}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {importing && (
            <p className="text-center text-xs font-semibold text-brand-600 animate-pulse">מייבא נתונים... נא לא לסגור את הדף</p>
          )}

          {importMessage && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 text-xs text-emerald-700 leading-normal">
              {importMessage}
            </div>
          )}

          {importError && (
            <div className="rounded-xl border border-red-100 bg-red-50/50 p-3.5 text-xs text-red-600">
              {importError}
            </div>
          )}
        </div>
      </section>

      {/* Biometric Credentials (Passkeys) */}
      {passkeySupported && (
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FingerprintIcon className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-bold text-slate-800">אבטחה ביומטרית (Passkeys)</h2>
          </div>
          <p className="mb-4 text-xs text-slate-500 leading-relaxed">
            הפוך את הכניסה לאפליקציה למהירה ומאובטחת יותר. רשום מפתח ביומטרי בדפדפן זה כדי להתחבר ישירות באמצעות Face ID, טביעת אצבע או מפתח נעילת מסך של המכשיר.
          </p>
          
          <div className="flex flex-col items-center">
            <button
              onClick={registerPasskey}
              disabled={passkeyLoading || !userEmail}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
            >
              <FingerprintIcon className="h-4 w-4" />
              {passkeyLoading ? "מבצע רישום..." : "רשום דפדפן זה לחיבור מהיר"}
            </button>
            {passkeyMessage && (
              <p className="text-xs text-slate-500 mt-3 text-center leading-normal">{passkeyMessage}</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}