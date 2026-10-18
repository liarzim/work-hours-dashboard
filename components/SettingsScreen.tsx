"use client";

import { useEffect, useMemo, useState, useCallback, Fragment } from "react";
import { useSWRConfig } from "swr";
import { useSettings, useEmploymentTerms } from "@/lib/client";
import { HEBREW_MONTHS, HEBREW_DAYS, EmploymentTerm, EmploymentType } from "@/lib/types";
import { SaveIcon, ShieldIcon, UmbrellaIcon, FingerprintIcon, UploadIcon, ListIcon, BriefcaseIcon, PencilIcon, TrashIcon, PlusIcon, XIcon, RefreshIcon, CalendarIcon, DownloadIcon, DatabaseIcon, RotateCcwIcon } from "./Icons";
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
  HolidaySetting,
  syncHolidaysFromHebcal,
  getChartPalette,
  saveChartPalette,
  DEFAULT_CHART_PALETTE,
  ChartPalette,
} from "@/lib/settingsStore";

interface NasBackupItem {
  id: string;
  filename: string;
  backup_type: string;
  reports_count: number;
  profiles_count: number;
  standards_count: number;
  terms_count: number;
  file_size_kb: number;
  created_at: string;
}

interface UserBackupItem {
  id: string;
  filename: string;
  reports_count: number;
  standards_count: number;
  terms_count: number;
  backup_type: string;
  file_size_kb: number;
  created_at: string;
}

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

  // Hebcal Auto-Sync State
  const [syncingHebcal, setSyncingHebcal] = useState(false);
  const [hebcalMessage, setHebcalMessage] = useState<string | null>(null);
  const [hebcalError, setHebcalError] = useState<string | null>(null);

  // Chart Palette State
  const [chartPalette, setChartPalette] = useState<ChartPalette>(DEFAULT_CHART_PALETTE);
  const [paletteSavedMsg, setPaletteSavedMsg] = useState<string | null>(null);

  const handleColorChange = (key: keyof ChartPalette, value: string) => {
    const updated = { ...chartPalette, [key]: value };
    setChartPalette(updated);
    saveChartPalette(updated);
    setPaletteSavedMsg("צבעי הגרף נשמרו ועודכנו!");
    setTimeout(() => setPaletteSavedMsg(null), 3000);
  };

  const handleResetPalette = () => {
    setChartPalette(DEFAULT_CHART_PALETTE);
    saveChartPalette(DEFAULT_CHART_PALETTE);
    setPaletteSavedMsg("פלטת הצבעים שוחזרה לברירת המחדל!");
    setTimeout(() => setPaletteSavedMsg(null), 3000);
  };

  const handleSyncHebcal = async (allYears = false) => {
    setSyncingHebcal(true);
    setHebcalMessage(null);
    setHebcalError(null);
    try {
      if (allYears) {
        const currentY = new Date().getFullYear();
        const yearsToSync = [currentY - 2, currentY - 1, currentY, currentY + 1, currentY + 2];
        let totalCount = 0;
        let totalAdded = 0;
        let lastMerged: HolidaySetting[] = [];
        for (const y of yearsToSync) {
          const res = await syncHolidaysFromHebcal(y);
          totalCount += res.count;
          totalAdded += res.added;
          lastMerged = res.holidays;
        }
        setHolidaysState(lastMerged);
        setHebcalMessage(`סונכרנו בהצלחה ${totalCount} חגים ומועדים לשנים ${currentY - 2}–${currentY + 2} מ-Hebcal (נוספו ${totalAdded} חדשים)!`);
      } else {
        const y = parseInt(holidayYear, 10) || new Date().getFullYear();
        const res = await syncHolidaysFromHebcal(y);
        setHolidaysState(res.holidays);
        setHebcalMessage(`סונכרנו בהצלחה ${res.count} חגים לשנת ${y} מ-Hebcal (נוספו ${res.added} חדשים)!`);
      }
    } catch (err: any) {
      setHebcalError(err.message || "שגיאה בסנכרון מ-Hebcal");
    } finally {
      setSyncingHebcal(false);
    }
  };

  // Active Tab for Dropdown settings options
  const [activeTab, setActiveTab] = useState<"classifications" | "orderTypes" | "holidayNames">("classifications");

  // Authentication & Passkey State
  const [userEmail, setUserEmail] = useState("");
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState<string | null>(null);
  const [passkeySupported, setPasskeySupported] = useState(false);

  // Admin User Management State
  const [adminUsers, setAdminUsers] = useState<{ id: string; email: string | null; annual_vacation_quota: number; created_at: string; reports_count?: number | null; last_backup_at?: string | null; backups?: UserBackupItem[]; is_current_auth_user?: boolean }[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminDeleteLoading, setAdminDeleteLoading] = useState<string | null>(null);
  const [adminBackupLoading, setAdminBackupLoading] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [adminManualEmail, setAdminManualEmail] = useState("");
  const [expandedUserBackupsId, setExpandedUserBackupsId] = useState<string | null>(null);
  const [adminSectionTab, setAdminSectionTab] = useState<"users" | "systemBackups">("users");

  // Admin NAS System Backups State
  const [nasBackups, setNasBackups] = useState<NasBackupItem[]>([]);
  const [nasBackupsLoading, setNasBackupsLoading] = useState(false);
  const [nasBackupCreating, setNasBackupCreating] = useState(false);
  const [nasBackupRestoringId, setNasBackupRestoringId] = useState<string | null>(null);
  const [nasBackupMessage, setNasBackupMessage] = useState<string | null>(null);
  const [nasBackupError, setNasBackupError] = useState<string | null>(null);
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [retentionSaving, setRetentionSaving] = useState(false);
  const [retentionMessage, setRetentionMessage] = useState<string | null>(null);

  // Personal User Backups State (available for every user)
  const [userBackups, setUserBackups] = useState<UserBackupItem[]>([]);
  const [userBackupsLoading, setUserBackupsLoading] = useState(false);
  const [userBackupCreating, setUserBackupCreating] = useState(false);
  const [userBackupRestoringId, setUserBackupRestoringId] = useState<string | null>(null);
  const [userBackupMessage, setUserBackupMessage] = useState<string | null>(null);
  const [userBackupError, setUserBackupError] = useState<string | null>(null);

  // Import State
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Employment Terms State
  const { data: termsResponse, mutate: mutateTerms } = useEmploymentTerms();
  const termsList = termsResponse?.terms ?? [];
  const [termModalOpen, setTermModalOpen] = useState(false);
  const [editingTermId, setEditingTermId] = useState<string | undefined>(undefined);
  const [termName, setTermName] = useState("חודשי עם שעות נוספות");
  const [termType, setTermType] = useState<EmploymentType>("monthly_overtime");
  const [termStartDate, setTermStartDate] = useState("");
  const [termEndDate, setTermEndDate] = useState("");
  const [termJobScope, setTermJobScope] = useState("100");
  const [termSunWed, setTermSunWed] = useState("9.0");
  const [termThu, setTermThu] = useState("8.5");
  const [termOvertime, setTermOvertime] = useState(true);
  const [termHourlyRate, setTermHourlyRate] = useState<string>("");
  const [termNotes, setTermNotes] = useState("");
  const [termSaving, setTermSaving] = useState(false);
  const [termError, setTermError] = useState<string | null>(null);

  const applyPreset = (preset: "monthly" | "global" | "hourly" | "parent" | "half") => {
    if (preset === "monthly") {
      setTermName("חודשי עם שעות נוספות");
      setTermType("monthly_overtime");
      setTermJobScope("100");
      setTermSunWed("9.0");
      setTermThu("8.5");
      setTermOvertime(true);
      setTermHourlyRate("");
    } else if (preset === "global") {
      setTermName("שכר גלובלי (ללא שעות נוספות יומיות)");
      setTermType("global");
      setTermJobScope("100");
      setTermSunWed("9.0");
      setTermThu("8.5");
      setTermOvertime(false);
      setTermHourlyRate("");
    } else if (preset === "hourly") {
      setTermName("עובד שעתי (שכר לפי ביצוע בפועל)");
      setTermType("hourly");
      setTermJobScope("100");
      setTermSunWed("0");
      setTermThu("0");
      setTermOvertime(true);
      setTermHourlyRate("50");
    } else if (preset === "parent") {
      setTermName("משרת הורה / מקוצרת");
      setTermType("monthly_overtime");
      setTermJobScope("100");
      setTermSunWed("8.0");
      setTermThu("7.5");
      setTermOvertime(true);
      setTermHourlyRate("");
    } else if (preset === "half") {
      setTermName("חצי משרה (50%)");
      setTermType("monthly_overtime");
      setTermJobScope("50");
      setTermSunWed("4.5");
      setTermThu("4.25");
      setTermOvertime(true);
      setTermHourlyRate("");
    }
  };

  const openNewTermModal = () => {
    setEditingTermId(undefined);
    applyPreset("monthly");
    const today = new Date().toISOString().slice(0, 10);
    setTermStartDate(today);
    setTermEndDate("");
    setTermHourlyRate("");
    setTermNotes("");
    setTermError(null);
    setTermModalOpen(true);
  };

  const openEditTermModal = (term: EmploymentTerm) => {
    setEditingTermId(term.id);
    setTermName(term.name);
    setTermType(term.employmentType);
    setTermStartDate(term.startDate);
    setTermEndDate(term.endDate || "");
    setTermJobScope(String(term.jobScopePct));
    setTermSunWed(String(term.dailyStandardSunWed));
    setTermThu(String(term.dailyStandardThu));
    setTermOvertime(term.overtimeEligible);
    setTermHourlyRate(term.hourlyRate != null ? String(term.hourlyRate) : "");
    setTermNotes(term.notes || "");
    setTermError(null);
    setTermModalOpen(true);
  };

  const handleSaveTerm = async () => {
    if (!termStartDate) {
      setTermError("נא להזין תאריך תחילה לתקופת ההעסקה");
      return;
    }
    if (termEndDate && termEndDate < termStartDate) {
      setTermError("תאריך הסיום אינו יכול להיות לפני תאריך ההתחלה");
      return;
    }
    setTermSaving(true);
    setTermError(null);
    try {
      const res = await fetch("/api/employment-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTermId,
          name: termName,
          employmentType: termType,
          startDate: termStartDate,
          endDate: termEndDate || null,
          jobScopePct: parseFloat(termJobScope) || 100,
          dailyStandardSunWed: parseFloat(termSunWed) || 9.0,
          dailyStandardThu: parseFloat(termThu) || 8.5,
          overtimeEligible: termOvertime,
          hourlyRate: termHourlyRate.trim() ? parseFloat(termHourlyRate) : null,
          notes: termNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה בשמירת תנאי ההעסקה");
      await mutateTerms();
      await mutate((k) => typeof k === "string" && k.startsWith("/api/reports"));
      setTermModalOpen(false);
    } catch (e: any) {
      setTermError(e.message || "שגיאה בשמירה");
    } finally {
      setTermSaving(false);
    }
  };

  const handleDeleteTerm = async (id?: string) => {
    if (!id || id === "default") {
      alert("לא ניתן למחוק את תנאי ברירת המחדל הבסיסיים");
      return;
    }
    if (!confirm("האם אתה בטוח שברצונך למחוק תקופת העסקה זו?")) return;
    try {
      const res = await fetch(`/api/employment-terms?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה במחיקה");
      await mutateTerms();
      await mutate((k) => typeof k === "string" && k.startsWith("/api/reports"));
    } catch (e: any) {
      alert(e.message || "שגיאה במחיקת התקופה");
    }
  };

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
    setChartPalette(getChartPalette());
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

  // Admin: Fetch all users
  const fetchAdminUsers = useCallback(async () => {
    if (!userEmail || userEmail.toLowerCase() !== "michael.liarzi@gmail.com") return;
    setAdminLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch admin users", err);
    } finally {
      setAdminLoading(false);
    }
  }, [userEmail]);

  const fetchNasBackups = useCallback(async () => {
    if (!userEmail || userEmail.toLowerCase() !== "michael.liarzi@gmail.com") return;
    setNasBackupsLoading(true);
    setNasBackupError(null);
    try {
      const res = await fetch("/api/admin/backups");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בטעינת גיבויים מה-NAS");
      setNasBackups(data.backups || []);
      if (typeof data.retentionDays === "number") {
        setRetentionDays(data.retentionDays);
      }
    } catch (err: any) {
      setNasBackupError(err.message || "שגיאה בטעינת גיבויים");
    } finally {
      setNasBackupsLoading(false);
    }
  }, [userEmail]);

  const handleSaveRetentionDays = async () => {
    if (!retentionDays || retentionDays < 1 || retentionDays > 365) {
      alert("מספר הימים חייב להיות בין 1 ל-365");
      return;
    }
    setRetentionSaving(true);
    setRetentionMessage(null);
    try {
      const res = await fetch("/api/admin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_retention", retentionDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שמירת ימי הגיבוי נכשלה");
      setRetentionMessage(data.message || `נשמר: יישמרו ${retentionDays} ימי גיבוי אחרונים.`);
      await fetchNasBackups();
    } catch (err: any) {
      alert(err.message || "שגיאה בשמירת ימי הגיבוי");
    } finally {
      setRetentionSaving(false);
    }
  };

  // Personal User Backups
  const fetchUserBackups = useCallback(async () => {
    if (!userEmail) return;
    setUserBackupsLoading(true);
    setUserBackupError(null);
    try {
      const res = await fetch("/api/user/backups");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בטעינת הגיבויים האישיים");
      setUserBackups(data.backups || []);
    } catch (err: any) {
      setUserBackupError(err.message || "שגיאה בטעינת גיבויים אישיים");
    } finally {
      setUserBackupsLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (userEmail) {
      fetchUserBackups();
      if (userEmail.toLowerCase() === "michael.liarzi@gmail.com") {
        fetchAdminUsers();
        fetchNasBackups();
      }
    }
  }, [userEmail, fetchUserBackups, fetchAdminUsers, fetchNasBackups]);

  const handleCreateUserBackup = async () => {
    setUserBackupCreating(true);
    setUserBackupMessage(null);
    setUserBackupError(null);
    try {
      const res = await fetch("/api/user/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "יצירת הגיבוי האישי נכשלה");
      setUserBackupMessage(data.message || "הגיבוי האישי שלך נשמר בהצלחה ב-NAS!");
      await fetchUserBackups();
    } catch (err: any) {
      setUserBackupError(err.message || "שגיאה ביצירת גיבוי אישי ב-NAS");
    } finally {
      setUserBackupCreating(false);
    }
  };

  const handleRestoreUserBackup = async (backup: UserBackupItem) => {
    const dateFormatted = new Date(backup.created_at).toLocaleString("he-IL");
    const confirmed = window.confirm(
      ` שחזור נתונים אישי (נקודתי)\n\n` +
      `האם אתה בטוח שברצונך לשחזר את הנתונים האישיים שלך לנקודת הגיבוי:\n` +
      `• תאריך ושעה: ${dateFormatted}\n` +
      `• דיווחי שעות שישוחזרו: ${backup.reports_count.toLocaleString("he-IL")}\n` +
      `• תנאי העסקה ותקנים אישיים שישוחזרו\n\n` +
      ` השחזור הינו נקודתי ומשפיע אך ורק על הנתונים שלך (לא משפיע על אף משתמש אחר במערכת).\n` +
      ` המערכת תיצור אוטומטית גיבוי ביטחון אישי מקדים לפני ביצוע השחזור.`
    );
    if (!confirmed) return;

    setUserBackupRestoringId(backup.id);
    setUserBackupMessage(null);
    setUserBackupError(null);
    try {
      const res = await fetch("/api/user/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", backupId: backup.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שחזור הגיבוי האישי נכשל");
      setUserBackupMessage(
        `הנתונים האישיים שלך שוחזרו בהצלחה מ-${dateFormatted}! שוחזרו ${data.result?.details?.reports_restored?.toLocaleString("he-IL") || backup.reports_count} דיווחים.`
      );
      await fetchUserBackups();
      await mutate((k) => typeof k === "string" && (k.startsWith("/api/reports") || k.startsWith("/api/employment-terms") || k.startsWith("/api/settings")));
    } catch (err: any) {
      setUserBackupError(err.message || "שגיאה בשחזור הגיבוי האישי");
    } finally {
      setUserBackupRestoringId(null);
    }
  };

  const handleDownloadUserBackup = async (backup: UserBackupItem) => {
    try {
      const res = await fetch("/api/user/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "download", backupId: backup.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "הורדת הגיבוי נכשלה");
      if (data.sql) {
        const blob = new Blob([data.sql], { type: "application/sql;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename || `backup-user-${backup.id}.sql`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      alert(err.message || "שגיאה בהורדת קובץ הגיבוי");
    }
  };

  const handleAdminRestoreUserBackup = async (userId: string, backup: UserBackupItem) => {
    const dateFormatted = new Date(backup.created_at).toLocaleString("he-IL");
    const confirmed = window.confirm(
      ` שחזור נתוני משתמש מגיבוי\n\n` +
      `האם אתה בטוח שברצונך לשחזר את נתוני המשתמש לנקודת הגיבוי:\n` +
      `• תאריך ושעה: ${dateFormatted}\n` +
      `• דיווחי שעות: ${backup.reports_count.toLocaleString("he-IL")}\n` +
      `• קובץ: ${backup.filename}\n\n` +
      `שחזור זה ישחזר אך ורק את הדיווחים, התקנים וההסכמים של משתמש זה בלבד, ולא ישפיע על משתמשים אחרים.\n` +
      `המערכת תיצור אוטומטית גיבוי ביטחון מקדים לפני השחזור.`
    );
    if (!confirmed) return;

    setUserBackupRestoringId(backup.id);
    setAdminMessage(null);
    try {
      const res = await fetch("/api/user/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", backupId: backup.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שחזור הגיבוי נכשל");
      setAdminMessage(`שוחזרו בהצלחה ${data.result?.details?.reports_restored?.toLocaleString("he-IL") || backup.reports_count} דיווחים עבור המשתמש!`);
      await fetchAdminUsers();
      await mutate((k) => typeof k === "string" && (k.startsWith("/api/reports") || k.startsWith("/api/employment-terms") || k.startsWith("/api/settings")));
    } catch (err: any) {
      alert(err.message || "שגיאה בשחזור הגיבוי");
    } finally {
      setUserBackupRestoringId(null);
    }
  };

  // Admin NAS System Backups Actions
  const handleCreateNasBackup = async () => {
    setNasBackupCreating(true);
    setNasBackupMessage(null);
    setNasBackupError(null);
    try {
      const res = await fetch("/api/admin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "יצירת הגיבוי ב-NAS נכשלה");
      setNasBackupMessage(data.message || "גיבוי חדש נוצר ונשמר בהצלחה ב-NAS!");
      await fetchNasBackups();
    } catch (err: any) {
      setNasBackupError(err.message || "שגיאה ביצירת גיבוי ב-NAS");
    } finally {
      setNasBackupCreating(false);
    }
  };

  const handleRestoreNasBackup = async (backup: NasBackupItem) => {
    const dateFormatted = new Date(backup.created_at).toLocaleString("he-IL");
    const confirmed = window.confirm(
      ` שחזור מערכת מגיבוי ב-NAS\n\n` +
      `האם אתה בטוח שברצונך לשחזר את כל נתוני המערכת לנקודת הגיבוי:\n` +
      `• תאריך ושעה: ${dateFormatted}\n` +
      `• כמות דיווחי שעות: ${backup.reports_count.toLocaleString("he-IL")}\n` +
      `• קובץ: ${backup.filename}\n\n` +
      ` הערת בטיחות חשובה: המערכת תיצור אוטומטית גיבוי ביטחון מלא של המצב הנוכחי לפני ביצוע השחזור!`
    );
    if (!confirmed) return;

    setNasBackupRestoringId(backup.id);
    setNasBackupMessage(null);
    setNasBackupError(null);
    try {
      const res = await fetch("/api/admin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", backupId: backup.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שחזור הגיבוי ב-NAS נכשל");
      setNasBackupMessage(
        `המערכת שוחזרה בהצלחה לנקודת הגיבוי מ-${dateFormatted}! שוחזרו ${data.result?.details?.reports_restored?.toLocaleString("he-IL") || backup.reports_count} דיווחים.`
      );
      await fetchNasBackups();
      await mutate((k) => typeof k === "string" && (k.startsWith("/api/reports") || k.startsWith("/api/employment-terms") || k.startsWith("/api/settings")));
    } catch (err: any) {
      setNasBackupError(err.message || "שגיאה בשחזור הגיבוי");
    } finally {
      setNasBackupRestoringId(null);
    }
  };

  const handleDownloadNasBackup = async (backup: NasBackupItem) => {
    try {
      const res = await fetch("/api/admin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "download", backupId: backup.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "הורדת הגיבוי נכשלה");
      if (data.sql) {
        const blob = new Blob([data.sql], { type: "application/sql;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename || `backup-nas-${backup.id}.sql`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      alert(err.message || "שגיאה בהורדת קובץ הגיבוי");
    }
  };

  // Admin: Backup single user data and download SQL file
  const handleBackupUser = async (targetId: string, targetEmail?: string | null) => {
    const displayName = targetEmail || targetId;
    setAdminBackupLoading(targetId);
    setAdminMessage(null);
    try {
      const res = await fetch("/api/admin/backup-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetId, email: targetEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "יצירת הגיבוי נכשלה");
      }

      // Automatically trigger file download in browser
      if (data.sqlContent) {
        const blob = new Blob([data.sqlContent], { type: "application/sql;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename || `backup-user-${displayName}.sql`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setAdminMessage(
        `גיבוי הושלם בהצלחה עבור ${displayName}! נשמרו ${data.reportsCount?.toLocaleString("he-IL") || 0} דיווחים וקובץ הגיבוי ירד למחשב.`
      );
      await fetchAdminUsers();
    } catch (err: any) {
      alert(err.message || "שגיאה ביצירת גיבוי למשתמש");
    } finally {
      setAdminBackupLoading(null);
    }
  };

  // Admin: Delete user (with automatic 6-month pre-deletion backup)
  const handleDeleteUser = async (targetEmail: string, targetId?: string) => {
    if (!targetEmail && !targetId) return;
    const displayName = targetEmail || targetId;
    const confirmed = window.confirm(
      `שים לב!\nהאם אתה בטוח שברצונך למחוק את המשתמש ${displayName}?\n\nלפני המחיקה, המערכת תיצור אוטומטית גיבוי מלא של כל הדיווחים והנתונים שלו, והגיבוי יישמר במערכת למשך חצי שנה (6 חודשים).`
    );
    if (!confirmed) return;

    setAdminDeleteLoading(targetEmail || targetId || "manual");
    setAdminMessage(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetId ? undefined : targetEmail, userId: targetId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "מחיקת המשתמש נכשלה");
      }
      setAdminMessage(data.message || `המשתמש ${displayName} נמחק בהצלחה (נוצר גיבוי ל-6 חודשים)`);
      setAdminManualEmail("");
      await fetchAdminUsers();
    } catch (err: any) {
      alert(err.message || "שגיאה בעת מחיקת המשתמש");
    } finally {
      setAdminDeleteLoading(null);
    }
  };

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
        let rows: any[] = [];

        if (isExcel) {
          const dataBytes = e.target?.result;
          const workbook = XLSX.read(dataBytes, { type: "array", cellDates: false, raw: false, dateNF: "dd/mm/yyyy" });
          const firstSheet = workbook.SheetNames[0];
          rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { header: 1, raw: false, dateNF: "dd/mm/yyyy" });
        } else {
          // Parse CSV using XLSX to preserve quotes, commas, and explicit raw DD/MM/YYYY text
          const text = e.target?.result as string;
          const workbook = XLSX.read(text, { type: "string", raw: true });
          const firstSheet = workbook.SheetNames[0];
          rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { header: 1, raw: true });
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

        setImportMessage(`הייבוא הושלם בהצלחה! נקלטו ${json.count || json.imported} רשומות (כולל הערות ייחודיות).`);
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
  const csvTemplate = "תאריך,כניסה,יציאה,סיווג,חופש,מחלה,מילואים,הערות,הערות ייחודיות\n" +
    "01/07/2026,07:30,16:30,עבודה,0,0,0,יום עבודה רגיל,משרד ראשי\n" +
    "02/07/2026,,,חופש,1,0,0,יום חופש שנתי,חופשה משפחתית\n" +
    "03/07/2026,,,מילואים,0,0,1,צו 8 פעילות מבצעית,אימון גדודי\n";
  const csvTemplateUrl = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csvTemplate);

  if (isLoading && !data) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" />;
  }

  const inputCls =
    "ltr-field w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-brand-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-12">
      {/* Employment Terms & History Card */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <BriefcaseIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-800">תנאי העסקה והיסטוריית חוזים</h2>
              <p className="text-xs text-slate-500">
                הגדרת תקופות שונות (חודשי, גלובלי, שעתי, משרה חלקית). כל תקופה קובעת את התקן של חודשיה.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openNewTermModal}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            הוספת תקופת העסקה
          </button>
        </div>

        {/* Mobile Cards View for Employment Terms */}
        <div className="block md:hidden space-y-3">
          {termsList.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
              לא הוגדרו תקופות. המערכת משתמשת בתנאי ברירת מחדל (חודשי עם שעות נוספות).
            </div>
          ) : (
            termsList.map((t, idx) => {
              const typeLabel =
                t.employmentType === "global"
                  ? "גלובלי"
                  : t.employmentType === "hourly"
                  ? "שעתי"
                  : t.employmentType === "custom"
                  ? "מותאם אישית"
                  : "חודשי (עם נוספות)";
              const typeBadgeCls =
                t.employmentType === "global"
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : t.employmentType === "hourly"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-indigo-50 text-indigo-700 border-indigo-200";

              const formatDisplayDate = (d?: string | null) => {
                if (!d) return "ההווה";
                const [y, m, day] = d.split("-");
                return `${day}/${m}/${y}`;
              };

              return (
                <div key={t.id || idx} className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-sm space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{t.name}</div>
                      <span className={`inline-block mt-1 rounded border px-2 py-0.5 text-[10px] font-semibold ${typeBadgeCls}`}>
                        {typeLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditTermModal(t)}
                        title="עריכת תקופה"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600 transition"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      {termsList.length > 1 && t.id && t.id !== "default" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTerm(t.id)}
                          title="מחיקת תקופה"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[11px]">תוקף:</span>
                      <span className="font-medium text-slate-700">
                        {formatDisplayDate(t.startDate)} — {formatDisplayDate(t.endDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">היקף משרה:</span>
                      <span className="font-bold text-indigo-700">{t.jobScopePct}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">תקן יומי:</span>
                      <span className="font-medium text-slate-700">{t.dailyStandardSunWed}ש' (א'-ד') / {t.dailyStandardThu}ש' (ה')</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">שעות נוספות:</span>
                      <span className={t.overtimeEligible ? "text-emerald-600 font-bold" : "text-slate-400"}>
                        {t.overtimeEligible ? "זכאי" : "לא זכאי"}
                      </span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-slate-500 text-[11px] font-medium">ערך שעה:</span>
                      <span className="font-bold text-xs text-slate-800">
                        {t.hourlyRate ? (
                          <span className="text-emerald-700 font-bold">₪{t.hourlyRate.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/שעה</span></span>
                        ) : (
                          <span className="text-slate-300 font-normal">—</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* List / Table of Terms (Desktop & Tablet) */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[650px] text-sm text-right">
            <thead>
              <tr className="bg-slate-50/80 text-xs font-semibold text-slate-500 border-b border-slate-100">
                <th className="px-3 py-2.5">תקופה ותנאים</th>
                <th className="px-3 py-2.5">תוקף</th>
                <th className="px-3 py-2.5 text-center">היקף משרה</th>
                <th className="px-3 py-2.5 text-center">תקן יומי (א'-ד' / ה')</th>
                <th className="px-3 py-2.5 text-center">ש"נ</th>
                <th className="px-3 py-2.5 text-center">ערך שעה</th>
                <th className="px-3 py-2.5 text-center">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {termsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-xs text-slate-400">
                    לא הוגדרו תקופות. המערכת משתמשת בתנאי ברירת מחדל (חודשי עם שעות נוספות).
                  </td>
                </tr>
              ) : (
                termsList.map((t, idx) => {
                  const typeLabel =
                    t.employmentType === "global"
                      ? "גלובלי"
                      : t.employmentType === "hourly"
                      ? "שעתי"
                      : t.employmentType === "custom"
                      ? "מותאם אישית"
                      : "חודשי (עם נוספות)";
                  const typeBadgeCls =
                    t.employmentType === "global"
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : t.employmentType === "hourly"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-indigo-50 text-indigo-700 border-indigo-200";

                  const formatDisplayDate = (d?: string | null) => {
                    if (!d) return "ההווה";
                    const [y, m, day] = d.split("-");
                    return `${day}/${m}/${y}`;
                  };

                  return (
                    <tr key={t.id || idx} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-800">{t.name}</div>
                        <span className={`inline-block mt-0.5 rounded border px-1.5 py-0.2 text-[10px] font-medium ${typeBadgeCls}`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">
                        {formatDisplayDate(t.startDate)} — {formatDisplayDate(t.endDate)}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs font-semibold text-slate-700">
                        {t.jobScopePct}%
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs text-slate-700">
                        {t.dailyStandardSunWed}ש' / {t.dailyStandardThu}ש'
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs">
                        {t.overtimeEligible ? (
                          <span className="text-emerald-600 font-medium">כן</span>
                        ) : (
                          <span className="text-slate-400">לא</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs font-semibold">
                        {t.hourlyRate ? (
                          <span className="text-emerald-700 font-bold">₪{t.hourlyRate.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/שעה</span></span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditTermModal(t)}
                            title="עריכת תקופה"
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600 transition"
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </button>
                          {termsList.length > 1 && t.id && t.id !== "default" && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTerm(t.id)}
                              title="מחיקת תקופה"
                              className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

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

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full min-w-[320px] text-sm text-right">
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
        <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <UmbrellaIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-800">תאריכי חגים וסיווגם</h2>
              <p className="text-[11px] text-slate-400">סנכרון אוטומטי מ-Hebcal או ניהול ידני של ימי חג ומועדים</p>
            </div>
          </div>

          {/* Year Navigator & Hebcal Auto-Sync Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-0.5">
              <button
                onClick={() => setHolidayYear(prev => String(parseInt(prev) - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white text-slate-600 transition shadow-none"
                title="שנה קודמת"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <span className="text-xs font-extrabold text-slate-800 px-2 min-w-[3rem] text-center">{holidayYear}</span>
              <button
                onClick={() => setHolidayYear(prev => String(parseInt(prev) + 1))}
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white text-slate-600 transition shadow-none"
                title="שנה הבאה"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => handleSyncHebcal(false)}
              disabled={syncingHebcal}
              className="flex items-center gap-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1.5 text-xs font-bold transition disabled:opacity-60"
              title={`סנכרן חגים ומועדים לשנת ${holidayYear} מ-Hebcal`}
            >
              <RefreshIcon className={`h-3.5 w-3.5 ${syncingHebcal ? "animate-spin" : ""}`} />
              <span>{syncingHebcal ? "מסנכרן..." : `סנכרן מ-Hebcal (${holidayYear})`}</span>
            </button>

            <button
              onClick={() => handleSyncHebcal(true)}
              disabled={syncingHebcal}
              className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60"
              title="סנכרון רב-שנתי מלא מ-Hebcal (5 שנים)"
            >
              <CalendarIcon className="h-3.5 w-3.5 text-slate-500" />
              <span>סנכרון רב-שנתי (5 שנים)</span>
            </button>
          </div>
        </div>

        {/* Status messages for Hebcal */}
        {hebcalMessage && (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-medium">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{hebcalMessage}</span>
            </div>
            <button onClick={() => setHebcalMessage(null)} className="text-emerald-600 hover:text-emerald-800">
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {hebcalError && (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800 font-medium">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{hebcalError}</span>
            </div>
            <button onClick={() => setHebcalError(null)} className="text-red-600 hover:text-red-800">
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        
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
        <div className="overflow-x-auto rounded-xl border border-slate-100 mb-4 max-h-60 overflow-y-auto">
          <table className="w-full min-w-[380px] text-sm text-right">
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
          <div className="flex bg-slate-100/80 p-1 rounded-xl gap-1 self-start sm:self-auto overflow-x-auto max-w-full">
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

      {/* Chart Color Palette Customization */}
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
              <span className="text-base">🎨</span>
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-800">התאמת צבעי גרף שעות עבודה יומי</h2>
              <p className="text-xs text-slate-400">בחר את הצבע הרצוי לכל סוג דיווח בגרף העמודות</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetPalette}
            className="flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition shadow-sm"
          >
            <RefreshIcon className="h-3.5 w-3.5" />
            שחזר ברירת מחדל
          </button>
        </div>

        {paletteSavedMsg && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-semibold text-emerald-800 text-center">
            {paletteSavedMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[
            { key: "work", label: "יום עבודה רגיל", desc: "שעות שדווחו בפועל" },
            { key: "vacation", label: "חופשה (12 ש')", desc: "יום חופש מלא" },
            { key: "reserve", label: "מילואים (12 ש')", desc: "שירות מילואים פעיל" },
            { key: "sick", label: "מחלה (12 ש')", desc: "יום מחלה מלא" },
            { key: "holiday", label: "חג / ערב חג (12 ש')", desc: "חג או מועד רשמי" },
            { key: "missing", label: "דיווח חסר ⚠️", desc: "יום עבודה בעבר ללא שעות" },
            { key: "weekend", label: "סופ\"ש / יום מנוחה", desc: "שישי / שבת ללא שעות" },
          ].map((item) => {
            const colorVal = chartPalette[item.key as keyof ChartPalette] || "#2563eb";
            return (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <input
                      type="color"
                      value={colorVal}
                      onChange={(e) => handleColorChange(item.key as keyof ChartPalette, e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent p-0 shadow-sm"
                      title={`בחר צבע עבור ${item.label}`}
                    />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-800">{item.label}</span>
                    <span className="block text-[11px] text-slate-400">{item.desc}</span>
                  </div>
                </div>
                <span className="font-mono text-[11px] font-bold text-slate-500 uppercase bg-white px-2 py-0.5 rounded border border-slate-200">
                  {colorVal}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-[11px] text-slate-400 leading-normal border-t border-slate-100 pt-3">
          💡 <strong>לתשומת לבך:</strong> ימי חג, ערב חג, חופשה, מחלה ומילואים מוצגים בגרף בגובה של 12 שעות לצורך ויזואליות ברורה בלבד. שעות אלו <u>אינן</u> נספרות כשעות עבודה שבוצעו בפועל ו<u>אינן</u> מחושבות לצורך שעות נוספות.
        </p>
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
          תוכל להעלות קובץ CSV או Excel כדי לייבא את כל דיווח השעות ההיסטורי שלך. המערכת מזהה אוטומטית כותרות עמודות (תאריך, כניסה, יציאה, סיווג, חופש, מחלה, מילואים, הערות, הערות ייחודיות) וכן את הגיליון הישן.
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

      {/* Personal User Backups & Point-in-Time Restore on NAS */}
      <section className="rounded-2xl border border-blue-100 bg-white p-4 sm:p-5 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <DatabaseIcon className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-800">גיבוי ושחזור נתונים אישי (ב-NAS)</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                  🛡️ שחזור נקודתי אישי
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                גבה ושחזר את כל דיווחי השעות, התקנים וההסכמים האישיים שלך. השחזור נקודתי ומאובטח – משפיע אך ורק על הנתונים שלך בלבד
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={fetchUserBackups}
              disabled={userBackupsLoading}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition border border-slate-200 disabled:opacity-50"
            >
              <RefreshIcon className={`h-3.5 w-3.5 ${userBackupsLoading ? "animate-spin" : ""}`} />
              {userBackupsLoading ? "מרענן..." : "רענן רשימה"}
            </button>

            <button
              type="button"
              onClick={handleCreateUserBackup}
              disabled={userBackupCreating}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              <SaveIcon className="h-3.5 w-3.5" />
              {userBackupCreating ? "מגבה ב-NAS..." : "גבה את הנתונים שלי עכשיו 💾"}
            </button>
          </div>
        </div>

        {userBackupMessage && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <span>{userBackupMessage}</span>
            <button type="button" onClick={() => setUserBackupMessage(null)} className="text-emerald-600 hover:text-emerald-900 text-sm">✕</button>
          </div>
        )}

        {userBackupError && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-800 flex items-center justify-between">
            <span>{userBackupError}</span>
            <button type="button" onClick={() => setUserBackupError(null)} className="text-red-600 hover:text-red-900 text-sm">✕</button>
          </div>
        )}

        {/* Desktop & Tablet Table */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/80">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold text-slate-500">
                <th className="px-3.5 py-2.5">תאריך ושעה</th>
                <th className="px-3.5 py-2.5">סוג גיבוי</th>
                <th className="px-3.5 py-2.5">דיווחי שעות</th>
                <th className="px-3.5 py-2.5">תקנים ותנאים</th>
                <th className="px-3.5 py-2.5">גודל ב-NAS</th>
                <th className="px-3.5 py-2.5 text-center">פעולות ושחזור</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {userBackups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                    {userBackupsLoading ? "טוען גיבויים אישיים מה-NAS..." : "טרם בוצעו גיבויים אישיים. לחץ על 'גבה את הנתונים שלי עכשיו' כדי ליצור גיבוי אישי!"}
                  </td>
                </tr>
              ) : (
                userBackups.map((b) => {
                  const isRestoring = userBackupRestoringId === b.id;
                  const dateFormatted = new Date(b.created_at).toLocaleString("he-IL", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-3.5 py-2.5 font-medium text-slate-700 whitespace-nowrap">
                        {dateFormatted}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {b.backup_type === "manual_user" && (
                          <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">
                            👤 גיבוי אישי שלי
                          </span>
                        )}
                        {b.backup_type === "pre_restore_safety" && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                            🛡️ ביטחון מקדים
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                        {b.reports_count.toLocaleString("he-IL")} דיווחים
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                        {b.standards_count} תקנים • {b.terms_count || 0} תנאים
                      </td>
                      <td className="px-3.5 py-2.5 text-xs font-mono text-slate-600 whitespace-nowrap">
                        {b.file_size_kb ? `${b.file_size_kb} KB` : "-"}
                      </td>
                      <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRestoreUserBackup(b)}
                            disabled={isRestoring || userBackupRestoringId !== null}
                            title="שחזר נקודתית אך ורק את הנתונים שלך מגיבוי זה (נוצר גיבוי ביטחון מקדים אוטומטית)"
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 text-xs font-bold transition border border-blue-200 disabled:opacity-50"
                          >
                            <RotateCcwIcon className={`h-3.5 w-3.5 ${isRestoring ? "animate-spin" : ""}`} />
                            {isRestoring ? "משחזר..." : "שחזר נתונים אישיים"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadUserBackup(b)}
                            title="הורד קובץ SQL אישי למחשב"
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 px-2 py-1 text-xs font-medium transition border border-slate-200"
                          >
                            <DownloadIcon className="h-3.5 w-3.5" />
                            <span className="hidden lg:inline">הורד SQL</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden space-y-2.5">
          {userBackups.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
              {userBackupsLoading ? "טוען גיבויים אישיים..." : "טרם בוצעו גיבויים אישיים"}
            </div>
          ) : (
            userBackups.map((b) => {
              const isRestoring = userBackupRestoringId === b.id;
              const dateFormatted = new Date(b.created_at).toLocaleString("he-IL", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 text-xs">{dateFormatted}</span>
                    {b.backup_type === "manual_user" && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                        👤 גיבוי אישי שלי
                      </span>
                    )}
                    {b.backup_type === "pre_restore_safety" && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                        🛡️ ביטחון מקדים
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">דיווחי שעות:</span>
                      <span className="font-bold text-slate-800">{b.reports_count.toLocaleString("he-IL")}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">נפח ב-NAS:</span>
                      <span className="font-mono text-slate-700">{b.file_size_kb || 0} KB</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleRestoreUserBackup(b)}
                      disabled={isRestoring || userBackupRestoringId !== null}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 text-xs font-bold transition disabled:opacity-50"
                    >
                      <RotateCcwIcon className={`h-3.5 w-3.5 ${isRestoring ? "animate-spin" : ""}`} />
                      {isRestoring ? "משחזר..." : "שחזר גיבוי זה"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadUserBackup(b)}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 text-xs font-medium transition"
                    >
                      <DownloadIcon className="h-3.5 w-3.5" />
                      <span>SQL</span>
                    </button>
                  </div>
                </div>
              );
            })
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

      {/* ========================================================================= */}
      {/* ניהול מערכת (אדמין) - Unified Admin System Management Card */}
      {/* ========================================================================= */}
      {userEmail && userEmail.toLowerCase() === "michael.liarzi@gmail.com" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-card space-y-5">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shrink-0 shadow-sm">
                <ShieldIcon className="h-5 w-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-800">ניהול מערכת (אדמין)</h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">
                    הרשאות מנהל ראשי
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  ניהול עובדים, צפייה בגיבויים על בסיס משתמשים, שחזורים נקודתיים וגיבויי מערכת ב-NAS
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  fetchAdminUsers();
                  fetchNasBackups();
                }}
                disabled={adminLoading || nasBackupsLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition border border-slate-200 disabled:opacity-50"
              >
                <RefreshIcon className={`h-3.5 w-3.5 ${adminLoading || nasBackupsLoading ? "animate-spin" : ""}`} />
                <span>רענן נתונים ⟳</span>
              </button>
            </div>
          </div>

          {/* Sub-Navigation Tabs: Screenshot 3 (Users) is FIRST, Screenshot 2 (System) is SECOND */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <button
              type="button"
              onClick={() => setAdminSectionTab("users")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                adminSectionTab === "users"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
              }`}
            >
              <span>👥 ניהול משתמשים וגיבויים לפי עובד</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                adminSectionTab === "users" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {adminUsers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAdminSectionTab("systemBackups")}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                adminSectionTab === "systemBackups"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
              }`}
            >
              <span>🗄️ גיבויי מערכת ושמירה ב-NAS</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                adminSectionTab === "systemBackups" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {nasBackups.length}
              </span>
            </button>
          </div>

          {/* Feedback Messages */}
          {adminMessage && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 flex items-center justify-between">
              <span>{adminMessage}</span>
              <button type="button" onClick={() => setAdminMessage(null)} className="text-emerald-600 hover:text-emerald-900 text-sm">✕</button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1 (THE THIRD SCREENSHOT - FIRST!): ניהול משתמשים וגיבויים על בסיס עובדים */}
          {/* ========================================================================= */}
          {adminSectionTab === "users" && (
            <div className="space-y-4">
              {/* מחיקה לפי אימייל חופשי */}
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/80">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  מחיקת משתמש מהירה לפי כתובת אימייל:
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={adminManualEmail}
                    onChange={(e) => setAdminManualEmail(e.target.value)}
                    className="w-full flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-red-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(adminManualEmail.trim())}
                    disabled={!adminManualEmail.trim() || adminDeleteLoading !== null}
                    className="w-full sm:w-auto justify-center rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    {adminDeleteLoading === adminManualEmail.trim() ? "מוחק..." : "מחק משתמש ודאטה"}
                  </button>
                </div>
              </div>

              {/* Desktop & Tablet Table - ZERO HORIZONTAL SCROLL! */}
              <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full table-fixed text-xs text-right">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                      <th className="px-3 py-2.5 w-[28%]">אימייל משתמש</th>
                      <th className="px-3 py-2.5 w-[14%]">תאריך הצטרפות</th>
                      <th className="px-3 py-2.5 w-[14%]">דיווחי שעות</th>
                      <th className="px-3 py-2.5 w-[20%]">גיבוי אחרון ב-NAS</th>
                      <th className="px-3 py-2.5 w-[10%]">מכסת חופשה</th>
                      <th className="px-3 py-2.5 w-[14%] text-center">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          {adminLoading ? "טוען משתמשים..." : "לא נמצאו משתמשים נוספים"}
                        </td>
                      </tr>
                    ) : (
                      adminUsers.map((u) => {
                        const isSelf = u.email?.toLowerCase() === userEmail.toLowerCase();
                        const isExpanded = expandedUserBackupsId === u.id;
                        const uBackups = u.backups || [];

                        return (
                          <Fragment key={u.id}>
                            <tr className="hover:bg-slate-50/60 transition">
                              <td className="px-3 py-2.5 font-medium text-slate-800">
                                <div className="flex items-center gap-1.5 truncate" title={u.email || u.id}>
                                  <span className="truncate">{u.email || u.id}</span>
                                  {u.is_current_auth_user && (
                                    <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700 border border-emerald-200 shrink-0">
                                      מחובר
                                    </span>
                                  )}
                                  {!u.is_current_auth_user && isSelf && (
                                    <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 border border-amber-200 shrink-0">
                                      כפול
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                                {u.created_at ? new Date(u.created_at).toLocaleDateString("he-IL") : "-"}
                              </td>
                              <td className="px-3 py-2.5 whitespace-nowrap">
                                {typeof u.reports_count === "number" ? (
                                  <span className={u.reports_count > 0 ? "font-bold text-slate-800" : "text-slate-400 italic"}>
                                    {u.reports_count > 0 ? `${u.reports_count.toLocaleString("he-IL")} דיווחים` : "0 (ריק)"}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-1.5">
                                  {u.last_backup_at ? (
                                    <span className="font-semibold text-emerald-700 whitespace-nowrap">
                                      {new Date(u.last_backup_at).toLocaleDateString("he-IL")}{" "}
                                      <span className="text-[10px] text-slate-400">
                                        {new Date(u.last_backup_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic whitespace-nowrap">טרם בוצע</span>
                                  )}

                                  {uBackups.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedUserBackupsId(isExpanded ? null : u.id)}
                                      className="rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-1.5 py-0.5 text-[10px] font-bold transition border border-indigo-200 shrink-0"
                                    >
                                      {isExpanded ? "סגור ▲" : `${uBackups.length} גיבויים ▼`}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                                {u.annual_vacation_quota || 22} ימים
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleBackupUser(u.id, u.email)}
                                    disabled={adminBackupLoading === u.id}
                                    title="גבה את נתוני המשתמש (שעות, תקנים, תנאים) לקובץ SQL ב-NAS"
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 text-xs font-bold transition border border-emerald-200 disabled:opacity-50"
                                  >
                                    <DownloadIcon className="h-3 w-3" />
                                    <span>גבה</span>
                                  </button>

                                  {!u.is_current_auth_user && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(u.email || "", u.id)}
                                      disabled={adminDeleteLoading !== null}
                                      title="מחק משתמש זה (יבוצע גיבוי אוטומטי שיישמר לחצי שנה)"
                                      className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 text-xs font-bold transition border border-red-200 disabled:opacity-50"
                                    >
                                      <TrashIcon className="h-3 w-3" />
                                      <span>מחק</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Sub-Row: Expandable user backups list */}
                            {isExpanded && (
                              <tr className="bg-indigo-50/20">
                                <td colSpan={6} className="px-3 py-2.5">
                                  <div className="rounded-xl border border-indigo-100 bg-white p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-indigo-900">
                                        📁 היסטוריית גיבויים ב-NAS עבור {u.email || u.id} ({uBackups.length} גיבויים שמורים):
                                      </span>
                                      <span className="text-[11px] text-slate-400">
                                        שחזור נקודתי משחזר רק את דיווחי והגדרות משתמש זה
                                      </span>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                      {uBackups.map((ub) => (
                                        <div key={ub.id} className="flex items-center justify-between py-1.5 text-xs">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-800">
                                              {new Date(ub.created_at).toLocaleString("he-IL")}
                                            </span>
                                            <span className="text-slate-500">
                                              ({ub.reports_count.toLocaleString("he-IL")} דיווחים • {ub.standards_count} תקנים • {ub.file_size_kb || 0} KB)
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() => handleAdminRestoreUserBackup(u.id, ub)}
                                              disabled={userBackupRestoringId !== null}
                                              className="rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 text-[11px] font-bold transition border border-blue-200"
                                            >
                                              שחזר למשתמש
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDownloadUserBackup(ub)}
                                              className="rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 px-2 py-1 text-[11px] font-medium transition border border-slate-200"
                                            >
                                              הורד SQL
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards for Users (100% responsive, zero horizontal scroll!) */}
              <div className="block md:hidden space-y-3">
                {adminUsers.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                    {adminLoading ? "טוען משתמשים..." : "לא נמצאו משתמשים נוספים"}
                  </div>
                ) : (
                  adminUsers.map((u) => {
                    const isSelf = u.email?.toLowerCase() === userEmail.toLowerCase();
                    const isExpanded = expandedUserBackupsId === u.id;
                    const uBackups = u.backups || [];

                    return (
                      <div key={u.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 text-sm truncate" dir="ltr">
                              {u.email || u.id}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {u.is_current_auth_user && (
                                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                  החשבון המחובר
                                </span>
                              )}
                              {!u.is_current_auth_user && isSelf && (
                                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                                  חשבון כפול
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[11px]">תאריך הצטרפות:</span>
                            <span className="font-medium text-slate-700">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString("he-IL") : "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[11px]">דיווחי שעות:</span>
                            <span className={u.reports_count && u.reports_count > 0 ? "font-bold text-slate-800" : "text-slate-400 italic"}>
                              {typeof u.reports_count === "number"
                                ? u.reports_count > 0
                                  ? `${u.reports_count.toLocaleString("he-IL")} דיווחים`
                                  : "0 (ריק)"
                                : "-"}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-400 block text-[11px]">גיבוי אחרון ב-NAS:</span>
                            {u.last_backup_at ? (
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-emerald-700">
                                  {new Date(u.last_backup_at).toLocaleDateString("he-IL")}{" "}
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(u.last_backup_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </span>
                                {uBackups.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedUserBackupsId(isExpanded ? null : u.id)}
                                    className="text-xs font-bold text-indigo-700"
                                  >
                                    {isExpanded ? "סגור ▲" : `${uBackups.length} גיבויים ▼`}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">טרם בוצע</span>
                            )}
                          </div>
                        </div>

                        {/* Expandable sub-list on mobile */}
                        {isExpanded && uBackups.length > 0 && (
                          <div className="rounded-lg bg-indigo-50/40 p-2.5 space-y-2 border border-indigo-100">
                            <span className="text-xs font-bold text-indigo-900 block">
                              היסטוריית גיבויים ({uBackups.length}):
                            </span>
                            {uBackups.map((ub) => (
                              <div key={ub.id} className="rounded bg-white p-2 text-xs border border-slate-100 flex items-center justify-between gap-1">
                                <div>
                                  <div className="font-semibold text-slate-800">
                                    {new Date(ub.created_at).toLocaleString("he-IL")}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {ub.reports_count.toLocaleString("he-IL")} דיווחים
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAdminRestoreUserBackup(u.id, ub)}
                                  className="rounded bg-blue-50 text-blue-700 px-2 py-1 text-[11px] font-bold border border-blue-200"
                                >
                                  שחזר
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleBackupUser(u.id, u.email)}
                            disabled={adminBackupLoading === u.id}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200/60 disabled:opacity-50"
                          >
                            <DownloadIcon className="h-3.5 w-3.5" />
                            {adminBackupLoading === u.id ? "מגבה..." : "גבה נתונים"}
                          </button>

                          {!u.is_current_auth_user && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.email || "", u.id)}
                              disabled={adminDeleteLoading !== null}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-50 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition border border-red-200/60 disabled:opacity-50"
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                              {adminDeleteLoading === (u.email || u.id) ? "מוחק..." : "מחק"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2 (THE SECOND SCREENSHOT - SECOND!): גיבויי מערכת כלליים ושמירה ב-NAS */}
          {/* ========================================================================= */}
          {adminSectionTab === "systemBackups" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">גיבוי מערכת כולל:</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    לילי 03:00 פעיל ב-NAS
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCreateNasBackup}
                  disabled={nasBackupCreating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50 self-start sm:self-auto"
                >
                  <SaveIcon className="h-3.5 w-3.5" />
                  {nasBackupCreating ? "מגבה ב-NAS..." : "גבה עכשיו (ב-NAS)"}
                </button>
              </div>

              {/* Info banner */}
              <div className="rounded-xl bg-gradient-to-l from-indigo-50/50 via-slate-50 to-indigo-50/30 p-3 border border-indigo-100 text-xs text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldIcon className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>
                    <strong>מדיניות שמירה ושחזור בטוח:</strong> ה-NAS שומר היסטוריה של {retentionDays} ימי גיבוי אחרונים. לפני כל פעולת שחזור נוצר אוטומטית גיבוי ביטחון מקדים.
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-indigo-700 shrink-0" dir="ltr">
                  NAS: 10.0.0.16 (PostgreSQL)
                </div>
              </div>

              {/* Retention Days Configuration */}
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">
                      שמירת גיבוי יומי (מספר ימים לאחור לשמירה ב-NAS):
                    </span>
                    {retentionMessage && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {retentionMessage}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    קבע כמה ימי גיבוי אחרונים יישמרו על ה-NAS (הגיבויים הישנים מעבר למספר זה יימחקו אוטומטית)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(parseInt(e.target.value, 10) || 1)}
                    className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-800 outline-none focus:border-indigo-400 text-center"
                  />
                  <span className="text-xs text-slate-500 font-medium">ימים</span>
                  <button
                    type="button"
                    onClick={handleSaveRetentionDays}
                    disabled={retentionSaving}
                    className="rounded-xl bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-1.5 text-xs font-bold transition disabled:opacity-50"
                  >
                    {retentionSaving ? "שומר..." : "שמור מספר ימים"}
                  </button>
                </div>
              </div>

              {nasBackupMessage && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 flex items-center justify-between">
                  <span>{nasBackupMessage}</span>
                  <button type="button" onClick={() => setNasBackupMessage(null)} className="text-emerald-600 hover:text-emerald-900 text-sm">✕</button>
                </div>
              )}

              {nasBackupError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-800 flex items-center justify-between">
                  <span>{nasBackupError}</span>
                  <button type="button" onClick={() => setNasBackupError(null)} className="text-red-600 hover:text-red-900 text-sm">✕</button>
                </div>
              )}

              {/* Desktop & Tablet Table - ZERO HORIZONTAL SCROLL! */}
              <div className="hidden md:block rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full table-fixed text-xs text-right">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
                      <th className="px-3 py-2.5 w-[22%]">תאריך ושעה</th>
                      <th className="px-3 py-2.5 w-[18%]">סוג גיבוי</th>
                      <th className="px-3 py-2.5 w-[15%]">סה״כ דיווחים</th>
                      <th className="px-3 py-2.5 w-[18%]">פרופילים ותקנים</th>
                      <th className="px-3 py-2.5 w-[10%]">גודל ב-NAS</th>
                      <th className="px-3 py-2.5 w-[17%] text-center">פעולות ושחזור</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {nasBackups.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          {nasBackupsLoading ? "טוען גיבויים מה-NAS..." : "לא נמצאו גיבויים שמורים ב-NAS"}
                        </td>
                      </tr>
                    ) : (
                      nasBackups.map((b) => {
                        const isRestoring = nasBackupRestoringId === b.id;
                        const dateFormatted = new Date(b.created_at).toLocaleString("he-IL", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        });

                        return (
                          <tr key={b.id} className="hover:bg-slate-50/60 transition">
                            <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                              {dateFormatted}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              {b.backup_type === "auto_nas" && (
                                <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                                  🤖 אוטומטי לילי
                                </span>
                              )}
                              {b.backup_type === "manual_admin" && (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                                  👤 יזום ע״י מנהל
                                </span>
                              )}
                              {b.backup_type === "pre_restore_safety" && (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                                  🛡️ ביטחון מקדים
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                              {b.reports_count.toLocaleString("he-IL")} דיווחים
                            </td>
                            <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                              {b.profiles_count} פרופ׳ • {b.standards_count} תקנ׳
                            </td>
                            <td className="px-3 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                              {b.file_size_kb ? `${b.file_size_kb} KB` : "-"}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleRestoreNasBackup(b)}
                                  disabled={isRestoring || nasBackupRestoringId !== null}
                                  title="שחזר את כל נתוני המערכת מגיבוי זה (ייווצר גיבוי ביטחון אוטומטי מקדים)"
                                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 text-xs font-bold transition border border-indigo-200 disabled:opacity-50"
                                >
                                  <RotateCcwIcon className={`h-3.5 w-3.5 ${isRestoring ? "animate-spin" : ""}`} />
                                  <span>{isRestoring ? "משחזר..." : "שחזר"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDownloadNasBackup(b)}
                                  title="הורד קובץ SQL למחשב"
                                  className="inline-flex items-center gap-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 px-2 py-1 text-xs font-medium transition border border-slate-200"
                                >
                                  <DownloadIcon className="h-3.5 w-3.5" />
                                  <span>SQL</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards for System Backups (100% responsive, zero horizontal scroll!) */}
              <div className="block md:hidden space-y-2.5">
                {nasBackups.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                    {nasBackupsLoading ? "טוען גיבויים מה-NAS..." : "לא נמצאו גיבויים שמורים ב-NAS"}
                  </div>
                ) : (
                  nasBackups.map((b) => {
                    const isRestoring = nasBackupRestoringId === b.id;
                    const dateFormatted = new Date(b.created_at).toLocaleString("he-IL", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-800 text-xs">{dateFormatted}</span>
                          {b.backup_type === "auto_nas" && (
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                              🤖 אוטומטי לילי
                            </span>
                          )}
                          {b.backup_type === "manual_admin" && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                              👤 יזום
                            </span>
                          )}
                          {b.backup_type === "pre_restore_safety" && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                              🛡️ ביטחון מקדים
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[10px]">דיווחי שעות:</span>
                            <span className="font-bold text-slate-800">{b.reports_count.toLocaleString("he-IL")}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">נפח ב-NAS:</span>
                            <span className="font-mono text-slate-700">{b.file_size_kb} KB</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleRestoreNasBackup(b)}
                            disabled={isRestoring || nasBackupRestoringId !== null}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white py-2 text-xs font-bold transition disabled:opacity-50"
                          >
                            <RotateCcwIcon className={`h-3.5 w-3.5 ${isRestoring ? "animate-spin" : ""}`} />
                            {isRestoring ? "משחזר..." : "שחזר גיבוי זה"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadNasBackup(b)}
                            className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 text-xs font-medium transition"
                          >
                            <DownloadIcon className="h-3.5 w-3.5" />
                            <span>SQL</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Employment Term Add / Edit Modal */}
      {termModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-4 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-right max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
              <h3 className="text-base font-bold text-slate-800">
                {editingTermId ? "עריכת תקופת העסקה" : "הוספת תקופת העסקה חדשה"}
              </h3>
              <button
                type="button"
                onClick={() => setTermModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-0.5 pl-0.5 space-y-4">
              {termError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {termError}
                </div>
              )}

              {/* Presets buttons */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500">תבניות מוכנות מראש:</label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPreset("monthly")}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                  >
                    💼 חודשי (עם שעות נוספות)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("global")}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                  >
                    🌐 גלובלי
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("hourly")}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                  >
                    ⏱️ שעתי
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("parent")}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                  >
                    👶 משרת הורה (8 שעות)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset("half")}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                  >
                    ½ חצי משרה (50%)
                  </button>
                </div>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">שם התקופה / תיאור</label>
                  <input
                    type="text"
                    value={termName}
                    onChange={(e) => setTermName(e.target.value)}
                    placeholder="למשל: משרה מלאה, שכר גלובלי"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">מתאריך (תחילת תוקף)</label>
                    <input
                      type="date"
                      value={termStartDate}
                      onChange={(e) => setTermStartDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      עד תאריך <span className="text-slate-400 font-normal">(השאר ריק להווה)</span>
                    </label>
                    <input
                      type="date"
                      value={termEndDate}
                      onChange={(e) => setTermEndDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">סוג העסקה</label>
                    <select
                      value={termType}
                      onChange={(e) => setTermType(e.target.value as EmploymentType)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold outline-none focus:border-brand-500"
                    >
                      <option value="monthly_overtime">חודשי (עם נוספות)</option>
                      <option value="global">גלובלי</option>
                      <option value="hourly">שעתי</option>
                      <option value="custom">מותאם אישית</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">היקף משרה (%)</label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      step={1}
                      value={termJobScope}
                      onChange={(e) => setTermJobScope(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">שעות א'-ד'</label>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={termSunWed}
                      onChange={(e) => setTermSunWed(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">שעות יום ה'</label>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={termThu}
                      onChange={(e) => setTermThu(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2 sm:pt-4">
                    <input
                      type="checkbox"
                      id="termOvertimeEligible"
                      checked={termOvertime}
                      onChange={(e) => setTermOvertime(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                    <label htmlFor="termOvertimeEligible" className="text-xs font-medium text-slate-700 cursor-pointer">
                      זכאי לשעות נוספות יומיות
                    </label>
                  </div>
                </div>

                {/* Hourly Rate (ערך שעה) */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      💰 ערך שעה (₪)
                    </label>
                    <span className="text-[11px] font-semibold text-brand-600">
                      {termType === "hourly"
                        ? "שכר לשעת עבודה בפועל"
                        : termType === "monthly_overtime"
                        ? "בסיס שעות נוספות (125% / 150%)"
                        : "חישוב שכר/שעות"}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={termHourlyRate}
                      onChange={(e) => setTermHourlyRate(e.target.value)}
                      placeholder="למשל: 50.00"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 pl-8 font-semibold text-slate-800"
                    />
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₪</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {termType === "hourly"
                      ? "השכר השעתי שישמש לחישוב השכר החודשי בהתאם לשעות שדווחו בפועל."
                      : termType === "monthly_overtime"
                      ? "ערך שעה המשמש לחישוב תעריף שעות נוספות (125% עבור 2 השעות הראשונות, 150% מעבר לכך)."
                      : "ערך שעה בש\"ח (אופציונלי)."}
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">הערות</label>
                  <input
                    type="text"
                    value={termNotes}
                    onChange={(e) => setTermNotes(e.target.value)}
                    placeholder="הערות או פירוט לחוזה זה"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 shrink-0">
              <button
                type="button"
                onClick={() => setTermModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                ביטול
              </button>
              <button
                type="button"
                disabled={termSaving}
                onClick={handleSaveTerm}
                className="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-700 transition disabled:opacity-50"
              >
                {termSaving ? "שומר..." : "שמור תנאי העסקה"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}