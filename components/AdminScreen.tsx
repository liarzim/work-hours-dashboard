"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import {
  ShieldIcon,
  RefreshIcon,
  TrashIcon,
  DownloadIcon,
  SaveIcon,
  RotateCcwIcon,
  DatabaseIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
} from "./Icons";

interface UserBackupItem {
  id: string;
  user_id: string;
  filename: string;
  reports_count: number;
  standards_count: number;
  terms_count: number;
  backup_type: string;
  file_size_kb: number;
  created_at: string;
}

interface AdminUserItem {
  id: string;
  email: string | null;
  annual_vacation_quota: number;
  created_at: string;
  reports_count?: number | null;
  last_backup_at?: string | null;
  backups?: UserBackupItem[];
  is_current_auth_user?: boolean;
}

interface NasBackupItem {
  id: string;
  filename: string;
  backup_type: "auto_nas" | "manual_admin" | "pre_restore_safety";
  reports_count: number;
  profiles_count: number;
  standards_count: number;
  file_size_kb: number;
  created_at: string;
}

export default function AdminScreen() {
  const [userEmail, setUserEmail] = useState("");
  const [adminUsers, setAdminUsers] = useState<AdminUserItem[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminDeleteLoading, setAdminDeleteLoading] = useState<string | null>(null);
  const [adminBackupLoading, setAdminBackupLoading] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [adminManualEmail, setAdminManualEmail] = useState("");
  const [expandedUserBackupsId, setExpandedUserBackupsId] = useState<string | null>(null);

  // NAS System Backups state
  const [nasBackups, setNasBackups] = useState<NasBackupItem[]>([]);
  const [nasBackupsLoading, setNasBackupsLoading] = useState(false);
  const [nasBackupCreating, setNasBackupCreating] = useState(false);
  const [nasBackupRestoringId, setNasBackupRestoringId] = useState<string | null>(null);
  const [nasBackupMessage, setNasBackupMessage] = useState<string | null>(null);
  const [nasBackupError, setNasBackupError] = useState<string | null>(null);
  const [userBackupRestoringId, setUserBackupRestoringId] = useState<string | null>(null);
  const [isSystemBackupsOpen, setIsSystemBackupsOpen] = useState(true);

  // Retention Days State
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [retentionSaving, setRetentionSaving] = useState(false);
  const [retentionMessage, setRetentionMessage] = useState<string | null>(null);

  // Fetch logged in user email
  useEffect(() => {
    const initAuth = async () => {
      const supabase = createSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    initAuth();
  }, []);

  const fetchAdminUsers = useCallback(async () => {
    if (!userEmail || userEmail.toLowerCase() !== "michael.liarzi@gmail.com") return;
    setAdminLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (res.ok && json.users) {
        setAdminUsers(json.users);
      }
    } catch (e) {
      console.error("Failed to fetch admin users", e);
    } finally {
      setAdminLoading(false);
    }
  }, [userEmail]);

  const fetchNasBackups = useCallback(async () => {
    if (!userEmail || userEmail.toLowerCase() !== "michael.liarzi@gmail.com") return;
    setNasBackupsLoading(true);
    try {
      const res = await fetch("/api/admin/backups");
      const json = await res.json();
      if (res.ok && json.backups) {
        setNasBackups(json.backups);
      }
      if (typeof json?.retentionDays === "number") {
        setRetentionDays(json.retentionDays);
      }
    } catch (e) {
      console.error("Failed to fetch NAS backups", e);
    } finally {
      setNasBackupsLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (userEmail && userEmail.toLowerCase() === "michael.liarzi@gmail.com") {
      fetchAdminUsers();
      fetchNasBackups();
    }
  }, [userEmail, fetchAdminUsers, fetchNasBackups]);

  const handleDeleteUser = async (emailToDelete: string, userId?: string) => {
    if (!emailToDelete && !userId) return;
    const confirmText = prompt(
      `אזהרה: פעולה זו תמחק לחלוטין את המשתמש ${emailToDelete || userId} וכל דיווחי השעות וההגדרות שלו.\nלפני המחיקה, המערכת תיצור גיבוי אוטומטי שיישמר ב-NAS.\n\nהקלד 'DELETE' לאישור סופי:`
    );
    if (confirmText !== "DELETE") return;

    setAdminDeleteLoading(emailToDelete || userId || "loading");
    setAdminMessage(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToDelete, userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה במחיקת המשתמש");

      setAdminMessage(`משתמש ${emailToDelete || userId} נמחק בהצלחה (נוצר גיבוי אוטומטי).`);
      setAdminManualEmail("");
      await fetchAdminUsers();
      await fetchNasBackups();
    } catch (e: any) {
      alert(e.message || "שגיאה במחיקה");
    } finally {
      setAdminDeleteLoading(null);
    }
  };

  const handleBackupUser = async (targetUserId: string, targetEmail?: string | null) => {
    setAdminBackupLoading(targetUserId);
    setAdminMessage(null);
    try {
      const res = await fetch("/api/admin/backup-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUserId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה בביצוע הגיבוי");

      const blob = new Blob([json.sql], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = json.filename || `backup_user_${targetUserId}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setAdminMessage(`גיבוי עבור ${targetEmail || targetUserId} הורד ונשמר בהצלחה ב-NAS!`);
      await fetchAdminUsers();
    } catch (e: any) {
      alert(e.message || "שגיאה בגיבוי המשתמש");
    } finally {
      setAdminBackupLoading(null);
    }
  };

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
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה ביצירת הגיבוי ב-NAS");

      setNasBackupMessage(json.message || "גיבוי מערכת מלא נוצר ונשמר בהצלחה ב-NAS!");
      await fetchNasBackups();
      setTimeout(() => setNasBackupMessage(null), 5000);
    } catch (e: any) {
      setNasBackupError(e.message || "שגיאה ביצירת הגיבוי ב-NAS");
    } finally {
      setNasBackupCreating(false);
    }
  };

  const handleRestoreNasBackup = async (b: NasBackupItem) => {
    const dateStr = new Date(b.created_at).toLocaleString("he-IL");
    const confirmed = confirm(
      `שחזור מערכת מגיבוי מתאריך: ${dateStr}\n\n` +
      `הגיבוי מכיל: ${b.reports_count} דיווחים, ${b.profiles_count} פרופילים, ${b.standards_count} תקנים.\n\n` +
      `שים לב: המערכת תיצור אוטומטית גיבוי ביטחון של הנתונים הנוכחיים לפני השחזור.\nהאם ברצונך להמשיך?`
    );
    if (!confirmed) return;

    setNasBackupRestoringId(b.id);
    setNasBackupMessage(null);
    setNasBackupError(null);
    try {
      const res = await fetch("/api/admin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", backupId: b.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה בשחזור הנתונים ב-NAS");

      setNasBackupMessage(json.message || "שחזור הנתונים מה-NAS הושלם בהצלחה!");
      await fetchNasBackups();
      await fetchAdminUsers();
      setTimeout(() => setNasBackupMessage(null), 7000);
    } catch (e: any) {
      setNasBackupError(e.message || "שגיאה בשחזור הנתונים ב-NAS");
    } finally {
      setNasBackupRestoringId(null);
    }
  };

  const handleDownloadNasBackup = async (b: NasBackupItem) => {
    try {
      const res = await fetch(`/api/admin/backups?id=${b.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה בהורדת הגיבוי");

      const blob = new Blob([json.sql_dump || ""], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = b.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || "שגיאה בהורדת הגיבוי");
    }
  };

  const handleAdminRestoreUserBackup = async (userId: string, ub: UserBackupItem) => {
    const dateFormatted = new Date(ub.created_at).toLocaleString("he-IL");
    const ok = confirm(
      `שחזור נתוני משתמש נקודתי:\n` +
      `תאריך גיבוי: ${dateFormatted}\n` +
      `דיווחים: ${ub.reports_count}, תקנים: ${ub.standards_count}\n\n` +
      `האם לשחזר נתונים אלו כעת עבור משתמש זה?`
    );
    if (!ok) return;

    setUserBackupRestoringId(ub.id);
    try {
      const res = await fetch("/api/user/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", backupId: ub.id, targetUserId: userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה בשחזור הגיבוי");

      setAdminMessage(`שחזור גיבוי עבור המשתמש בוצע בהצלחה (${json.restoredReports || ub.reports_count} דיווחים).`);
      await fetchAdminUsers();
      setTimeout(() => setAdminMessage(null), 5000);
    } catch (e: any) {
      alert(e.message || "שגיאה בשחזור הגיבוי");
    } finally {
      setUserBackupRestoringId(null);
    }
  };

  const handleDownloadUserBackup = async (ub: UserBackupItem) => {
    try {
      const res = await fetch(`/api/user/backups?id=${ub.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה בהורדת הגיבוי");

      const blob = new Blob([json.sql_dump || ""], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ub.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || "שגיאה בהורדת הגיבוי");
    }
  };

  const [backupDeletingId, setBackupDeletingId] = useState<string | null>(null);

  const handleDeleteUserBackup = async (ub: UserBackupItem, userEmailOrId?: string) => {
    const dateFormatted = new Date(ub.created_at).toLocaleString("he-IL");
    const ok = confirm(
      `מחיקת גיבוי משתמש לצמיתות:\n` +
      `תאריך גיבוי: ${dateFormatted}\n` +
      `משתמש: ${userEmailOrId || ub.user_id}\n` +
      `דיווחים: ${ub.reports_count}, תקנים: ${ub.standards_count}\n\n` +
      `האם אתה בטוח שברצונך למחוק לצמיתות גיבוי זה מה-NAS? פעולה זו אינה ניתנת לביטול.`
    );
    if (!ok) return;

    setBackupDeletingId(ub.id);
    try {
      const res = await fetch(`/api/user/backups?id=${ub.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה במחיקת הגיבוי");

      setAdminMessage(`גיבוי המשתמש מ-${dateFormatted} נמחק בהצלחה מה-NAS.`);
      await fetchAdminUsers();
      setTimeout(() => setAdminMessage(null), 4000);
    } catch (e: any) {
      alert(e.message || "שגיאה במחיקת הגיבוי");
    } finally {
      setBackupDeletingId(null);
    }
  };

  const handleDeleteSystemBackup = async (b: NasBackupItem) => {
    const dateFormatted = new Date(b.created_at).toLocaleString("he-IL");
    const ok = confirm(
      `מחיקת גיבוי מערכת כולל לצמיתות:\n` +
      `תאריך גיבוי: ${dateFormatted}\n` +
      `דיווחים: ${b.reports_count}, פרופילים: ${b.profiles_count}\n\n` +
      `האם אתה בטוח שברצונך למחוק לצמיתות גיבוי מערכת זה מה-NAS? פעולה זו אינה ניתנת לביטול.`
    );
    if (!ok) return;

    setBackupDeletingId(b.id);
    try {
      const res = await fetch(`/api/admin/backups?id=${b.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה במחיקת גיבוי המערכת");

      setNasBackupMessage(`גיבוי המערכת מ-${dateFormatted} נמחק בהצלחה מה-NAS.`);
      await fetchNasBackups();
      setTimeout(() => setNasBackupMessage(null), 4000);
    } catch (e: any) {
      alert(e.message || "שגיאה במחיקת גיבוי המערכת");
    } finally {
      setBackupDeletingId(null);
    }
  };

  const handleSaveRetentionDays = async () => {
    setRetentionSaving(true);
    setRetentionMessage(null);
    try {
      const res = await fetch("/api/admin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_retention", retentionDays }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה בעדכון ימי שמירה");

      setRetentionMessage(`מדיניות שמירה עודכנה ל-${retentionDays} ימים.`);
      await fetchNasBackups();
      setTimeout(() => setRetentionMessage(null), 4000);
    } catch (e: any) {
      alert(e.message || "שגיאה בשמירה");
    } finally {
      setRetentionSaving(false);
    }
  };

  const renderBackupBadge = (type?: string) => {
    if (type === "auto_nas" || type === "auto" || type === "auto_user") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200 whitespace-nowrap">
          🤖 אוטומטי לילי
        </span>
      );
    }
    if (type === "pre_restore_safety") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200 whitespace-nowrap">
          🛡️ ביטחון מקדים
        </span>
      );
    }
    if (type === "pre_delete") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200 whitespace-nowrap">
          ⚠️ לפני מחיקה
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 whitespace-nowrap">
        👤 יזום
      </span>
    );
  };

  const getDaysSinceLastBackup = (lastBackupAt?: string | null) => {
    if (!lastBackupAt) {
      return {
        text: "טרם בוצע",
        badgeClass: "bg-slate-100 text-slate-500 border-slate-200",
      };
    }
    const now = new Date();
    const backupDate = new Date(lastBackupAt);
    const diffMs = now.getTime() - backupDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return {
        text: "היום (0 ימים)",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }
    if (diffDays === 1) {
      return {
        text: "יום 1",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }
    if (diffDays <= 7) {
      return {
        text: `${diffDays} ימים`,
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      };
    }
    return {
      text: `${diffDays} ימים`,
      badgeClass: "bg-rose-50 text-rose-700 border-rose-200 font-bold",
    };
  };

  // Restrict access
  if (userEmail && userEmail.toLowerCase() !== "michael.liarzi@gmail.com") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
        <ShieldIcon className="mx-auto h-12 w-12 text-red-600 mb-2" />
        <h2 className="text-lg font-bold">אין גישה למסך זה</h2>
        <p className="text-xs text-red-600 mt-1">
          מסך זה מיועד למנהל המערכת הראשי בלבד.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-card space-y-5">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shrink-0 shadow-sm">
              <ShieldIcon className="h-6 w-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-slate-800">ניהול מערכת וגיבויים (אדמין)</h1>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">
                  הרשאות מנהל ראשי
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  NAS: 10.0.0.16
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                מסך אחוד: ניהול משתמשים, צפייה בגיבויים מפורטים לפי עובד, שחזורים נקודתיים, גיבוי מערכת ו-Retention
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

        {/* Feedback Messages */}
        {adminMessage && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <span>{adminMessage}</span>
            <button type="button" onClick={() => setAdminMessage(null)} className="text-emerald-600 hover:text-emerald-900 text-sm">
              ✕
            </button>
          </div>
        )}

        {nasBackupMessage && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <span>{nasBackupMessage}</span>
            <button type="button" onClick={() => setNasBackupMessage(null)} className="text-emerald-600 hover:text-emerald-900 text-sm">
              ✕
            </button>
          </div>
        )}

        {nasBackupError && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-800 flex items-center justify-between">
            <span>{nasBackupError}</span>
            <button type="button" onClick={() => setNasBackupError(null)} className="text-red-600 hover:text-red-900 text-sm">
              ✕
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* UNIFIED TOP CONTROL BAR: Retention, Automation Status & Backup Now        */}
        {/* ========================================================================= */}
        <div className="rounded-xl bg-gradient-to-l from-indigo-50/40 via-slate-50 to-indigo-50/20 p-4 border border-indigo-100/80 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Left: Retention Days Form */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-800">
                שמירת גיבוי יומי (מספר ימים לאחור לשמירה ב-NAS):
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(parseInt(e.target.value, 10) || 1)}
                  className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-400 text-center shadow-sm"
                />
                <span className="text-xs text-slate-500 font-medium">ימים</span>
                <button
                  type="button"
                  onClick={handleSaveRetentionDays}
                  disabled={retentionSaving}
                  className="rounded-xl bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 shadow-sm"
                >
                  {retentionSaving ? "שומר..." : "שמור מספר ימים"}
                </button>
              </div>
              {retentionMessage && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {retentionMessage}
                </span>
              )}
            </div>

            {/* Right: Auto Status & Backup Now Button */}
            <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                🤖 לילי 03:00 פעיל ב-NAS
              </span>

              <button
                type="button"
                onClick={handleCreateNasBackup}
                disabled={nasBackupCreating}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50"
              >
                <SaveIcon className="h-3.5 w-3.5" />
                {nasBackupCreating ? "מגבה ב-NAS..." : "גבה עכשיו (ב-NAS)"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
            <ShieldIcon className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span>
              <strong>מדיניות שמירה ושחזור בטוח:</strong> ה-NAS שומר היסטוריה של {retentionDays} ימי גיבוי אחרונים. לפני כל שחזור (מערכתי או נקודתי של עובד) נוצר אוטומטית גיבוי ביטחון מקדים.
            </span>
          </div>
        </div>

        {/* Quick Delete user by email */}
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

        {/* ========================================================================= */}
        {/* MAIN SECTION: ניהול משתמשים וגיבויים לפי עובד                              */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800">
                👥 ניהול משתמשים וגיבויים לפי עובד
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                {adminUsers.length} משתמשים
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              לחיצה על כפתור הגיבויים פותחת פירוט מלא עם כל נתוני הגיבוי
            </span>
          </div>

          {/* Desktop & Tablet Table */}
          <div className="hidden md:block rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs text-right divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-bold">
                <tr>
                  <th className="px-4 py-3">אימייל משתמש</th>
                  <th className="px-3 py-3 text-center whitespace-nowrap">תאריך הצטרפות</th>
                  <th className="px-3 py-3 text-center whitespace-nowrap">דיווחי שעות</th>
                  <th className="px-4 py-3 text-start whitespace-nowrap">גיבוי אחרון ב-NAS</th>
                  <th className="px-3 py-3 text-center whitespace-nowrap">ימים ללא גיבוי</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {adminUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
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
                          <td className="px-4 py-3 font-medium text-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900" dir="ltr">{u.email || u.id}</span>
                              {u.is_current_auth_user && (
                                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 shrink-0">
                                  מחובר
                                </span>
                              )}
                              {!u.is_current_auth_user && isSelf && (
                                <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 shrink-0">
                                  כפול
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center text-slate-500 whitespace-nowrap">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString("he-IL") : "-"}
                          </td>
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            {typeof u.reports_count === "number" ? (
                              <span className={u.reports_count > 0 ? "font-bold text-slate-800" : "text-slate-400 italic"}>
                                {u.reports_count > 0 ? `${u.reports_count.toLocaleString("he-IL")} דיווחים` : "0 (ריק)"}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {u.last_backup_at ? (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="font-semibold text-emerald-700 whitespace-nowrap">
                                  {new Date(u.last_backup_at).toLocaleDateString("he-IL")}{" "}
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(u.last_backup_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </span>
                                {uBackups.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedUserBackupsId(isExpanded ? null : u.id)}
                                    className="rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[10px] font-bold transition border border-indigo-200 whitespace-nowrap"
                                  >
                                    {isExpanded ? "סגור ▲" : `📁 ${uBackups.length} גיבויים ▼`}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic whitespace-nowrap">טרם בוצע</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center whitespace-nowrap font-medium">
                            {(() => {
                              const info = getDaysSinceLastBackup(u.last_backup_at);
                              return (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${info.badgeClass}`}>
                                  {info.text}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleBackupUser(u.id, u.email)}
                                disabled={adminBackupLoading === u.id}
                                title="גבה את נתוני המשתמש (שעות, תקנים, תנאים) לקובץ SQL ב-NAS"
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 text-xs font-bold transition border border-emerald-200 disabled:opacity-50"
                              >
                                <DownloadIcon className="h-3 w-3" />
                                <span>גבה</span>
                              </button>

                              {!u.is_current_auth_user && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.email || "", u.id)}
                                  disabled={adminDeleteLoading !== null}
                                  title="מחק משתמש זה (יבוצע גיבוי אוטומטי שיישמר ב-NAS)"
                                  className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1 text-xs font-bold transition border border-red-200 disabled:opacity-50"
                                >
                                  <TrashIcon className="h-3 w-3" />
                                  <span>מחק</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* ================================================================= */}
                        {/* UNIFIED DRAWER: Full Rich Table from Screenshot 3 for this user  */}
                        {/* ================================================================= */}
                        {isExpanded && (
                          <tr className="bg-indigo-50/20">
                            <td colSpan={6} className="px-3 sm:px-4 py-3">
                              <div className="rounded-xl border border-indigo-200 bg-white p-3.5 shadow-sm space-y-3">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-indigo-50 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-indigo-900">
                                      📁 גיבויים שמורים ב-NAS עבור {u.email || u.id} ({uBackups.length} נקודות שחזור):
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-slate-400">
                                    שחזור נקודתי משחזר רק את דיווחי והגדרות משתמש זה (ויוצר גיבוי ביטחון מקדים)
                                  </span>
                                </div>

                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                  <table className="w-full text-xs text-right divide-y divide-slate-200">
                                    <thead className="bg-slate-50 text-slate-600 font-bold">
                                      <tr>
                                        <th className="px-3 py-2.5 whitespace-nowrap">תאריך ושעה</th>
                                        <th className="px-3 py-2.5 whitespace-nowrap">סוג גיבוי</th>
                                        <th className="px-3 py-2.5 text-center whitespace-nowrap">סה״כ דיווחים</th>
                                        <th className="px-3 py-2.5 text-center whitespace-nowrap">תקנים והסכמים</th>
                                        <th className="px-3 py-2.5 text-center whitespace-nowrap">גודל ב-NAS</th>
                                        <th className="px-3 py-2.5 text-center whitespace-nowrap">פעולות ושחזור</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                      {uBackups.map((ub) => {
                                        const isRestoring = userBackupRestoringId === ub.id;
                                        const dateFormatted = new Date(ub.created_at).toLocaleString("he-IL", {
                                          day: "2-digit",
                                          month: "2-digit",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          second: "2-digit",
                                        });

                                        return (
                                          <tr key={ub.id} className="hover:bg-slate-50/70 transition">
                                            <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">
                                              {dateFormatted}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                              {renderBackupBadge(ub.backup_type)}
                                            </td>
                                            <td className="px-3 py-2 text-center font-bold text-slate-800 whitespace-nowrap">
                                              {ub.reports_count.toLocaleString("he-IL")} דיווחים
                                            </td>
                                            <td className="px-3 py-2 text-center text-slate-500 whitespace-nowrap">
                                              {ub.standards_count} תקנים • {ub.terms_count || 1} תנאים
                                            </td>
                                            <td className="px-3 py-2 text-center font-mono text-slate-600 whitespace-nowrap">
                                              {ub.file_size_kb ? `${ub.file_size_kb} KB` : "-"}
                                            </td>
                                            <td className="px-3 py-2 text-center whitespace-nowrap">
                                              <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                  type="button"
                                                  onClick={() => handleAdminRestoreUserBackup(u.id, ub)}
                                                  disabled={isRestoring || userBackupRestoringId !== null || backupDeletingId !== null}
                                                  title="שחזר דיווחים ותקנים לעובד זה"
                                                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 text-xs font-bold transition border border-indigo-200 disabled:opacity-50"
                                                >
                                                  <RotateCcwIcon className={`h-3 w-3 ${isRestoring ? "animate-spin" : ""}`} />
                                                  <span>{isRestoring ? "משחזר..." : "שחזר למשתמש"}</span>
                                                </button>

                                                <button
                                                  type="button"
                                                  onClick={() => handleDownloadUserBackup(ub)}
                                                  title="הורד קובץ SQL למחשב"
                                                  className="inline-flex items-center gap-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 px-2 py-1 text-xs font-medium transition border border-slate-200"
                                                >
                                                  <DownloadIcon className="h-3 w-3" />
                                                  <span>הורד SQL</span>
                                                </button>

                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteUserBackup(ub, u.email || u.id)}
                                                  disabled={backupDeletingId !== null}
                                                  title="מחק גיבוי זה לצמיתות מה-NAS"
                                                  className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 text-xs font-bold transition border border-red-200 disabled:opacity-50"
                                                >
                                                  <TrashIcon className="h-3 w-3" />
                                                  <span>{backupDeletingId === ub.id ? "מוחק..." : "מחק"}</span>
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
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

          {/* Mobile Cards for Users */}
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
                      <div>
                        <span className="text-slate-400 block text-[11px]">ימים ללא גיבוי:</span>
                        {(() => {
                          const info = getDaysSinceLastBackup(u.last_backup_at);
                          return (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border mt-0.5 ${info.badgeClass}`}>
                              {info.text}
                            </span>
                          );
                        })()}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">גיבוי אחרון ב-NAS:</span>
                        {u.last_backup_at ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-semibold text-emerald-700 text-[11px]">
                              {new Date(u.last_backup_at).toLocaleDateString("he-IL")}
                            </span>
                            {uBackups.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpandedUserBackupsId(isExpanded ? null : u.id)}
                                className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200"
                              >
                                {isExpanded ? "סגור ▲" : `${uBackups.length} גיבויים ▼`}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">טרם בוצע</span>
                        )}
                      </div>
                    </div>

                    {/* Expandable sub-cards on mobile */}
                    {isExpanded && uBackups.length > 0 && (
                      <div className="rounded-lg bg-indigo-50/40 p-2.5 space-y-2 border border-indigo-100">
                        <span className="text-xs font-bold text-indigo-900 block">
                          היסטוריית גיבויים ({uBackups.length}):
                        </span>
                        {uBackups.map((ub) => (
                          <div key={ub.id} className="rounded-lg bg-white p-2.5 text-xs border border-slate-100 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-800">
                                {new Date(ub.created_at).toLocaleString("he-IL")}
                              </span>
                              {renderBackupBadge(ub.backup_type)}
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-[11px] bg-slate-50 p-1.5 rounded text-center">
                              <div>
                                <span className="text-slate-400 block text-[10px]">דיווחים</span>
                                <span className="font-bold text-slate-800">{ub.reports_count}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">תקנים</span>
                                <span className="text-slate-700">{ub.standards_count}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">גודל</span>
                                <span className="font-mono text-slate-600">{ub.file_size_kb || 0} KB</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleAdminRestoreUserBackup(u.id, ub)}
                                disabled={userBackupRestoringId !== null || backupDeletingId !== null}
                                className="flex-1 rounded-lg bg-indigo-50 py-1.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 transition border border-indigo-200"
                              >
                                שחזר למשתמש
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadUserBackup(ub)}
                                className="rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition border border-slate-200"
                              >
                                הורד SQL
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUserBackup(ub, u.email || u.id)}
                                disabled={backupDeletingId !== null}
                                className="rounded-lg bg-red-50 px-2 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-100 transition border border-red-200"
                              >
                                {backupDeletingId === ub.id ? "מוחק..." : "מחק"}
                              </button>
                            </div>
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
                        <span>גבה</span>
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

        {/* ========================================================================= */}
        {/* COLLAPSIBLE SECTION: גיבויי מערכת כוללים של כלל בסיס הנתונים ב-NAS        */}
        {/* ========================================================================= */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsSystemBackupsOpen(!isSystemBackupsOpen)}
              className="flex items-center gap-2 text-left"
            >
              <span className="text-xs font-bold text-slate-800">
                🗄️ גיבויי מערכת כוללים ב-NAS ({nasBackups.length} Snapshots של כלל בסיס הנתונים)
              </span>
              <span className="text-xs text-indigo-600 font-bold">
                {isSystemBackupsOpen ? "הסתר ▲" : "הצג טבלה ▼"}
              </span>
            </button>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              כולל את כל המשתמשים, דיווחים והגדרות יחד
            </span>
          </div>

          {isSystemBackupsOpen && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              {/* Desktop & Tablet Table */}
              <div className="hidden md:block rounded-xl border border-slate-200 bg-white overflow-x-auto">
                <table className="w-full text-xs text-right divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-600 font-bold">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">תאריך ושעה</th>
                      <th className="px-3 py-3 whitespace-nowrap">סוג גיבוי</th>
                      <th className="px-3 py-3 text-center whitespace-nowrap">סה״כ דיווחים</th>
                      <th className="px-3 py-3 text-center whitespace-nowrap">פרופילים ותקנים</th>
                      <th className="px-3 py-3 text-center whitespace-nowrap">גודל ב-NAS</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">פעולות ושחזור</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
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
                            <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                              {dateFormatted}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              {renderBackupBadge(b.backup_type)}
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-slate-800 whitespace-nowrap">
                              {b.reports_count.toLocaleString("he-IL")} דיווחים
                            </td>
                            <td className="px-3 py-3 text-center text-slate-500 whitespace-nowrap">
                              {b.profiles_count} פרופ׳ • {b.standards_count} תקנ׳
                            </td>
                            <td className="px-3 py-3 text-center font-mono text-slate-600 whitespace-nowrap">
                              {b.file_size_kb ? `${b.file_size_kb} KB` : "-"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => handleRestoreNasBackup(b)}
                                  disabled={isRestoring || nasBackupRestoringId !== null || backupDeletingId !== null}
                                  title="שחזר את כל נתוני המערכת מגיבוי זה (ייווצר גיבוי ביטחון אוטומטי מקדים)"
                                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1 text-xs font-bold transition border border-indigo-200 disabled:opacity-50"
                                >
                                  <RotateCcwIcon className={`h-3.5 w-3.5 ${isRestoring ? "animate-spin" : ""}`} />
                                  <span>{isRestoring ? "משחזר..." : "שחזר מערכת"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDownloadNasBackup(b)}
                                  title="הורד קובץ SQL למחשב"
                                  className="inline-flex items-center gap-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 px-2.5 py-1 text-xs font-medium transition border border-slate-200"
                                >
                                  <DownloadIcon className="h-3.5 w-3.5" />
                                  <span>SQL</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteSystemBackup(b)}
                                  disabled={backupDeletingId !== null}
                                  title="מחק גיבוי מערכת זה לצמיתות מה-NAS"
                                  className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1 text-xs font-bold transition border border-red-200 disabled:opacity-50"
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                  <span>{backupDeletingId === b.id ? "מוחק..." : "מחק"}</span>
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

              {/* Mobile Cards for System Backups */}
              <div className="block md:hidden space-y-2">
                {nasBackups.map((b) => {
                  const isRestoring = nasBackupRestoringId === b.id;
                  const dateFormatted = new Date(b.created_at).toLocaleString("he-IL", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div key={b.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{dateFormatted}</span>
                        {renderBackupBadge(b.backup_type)}
                      </div>
                      <div className="grid grid-cols-3 gap-1 bg-slate-50 p-2 rounded text-center text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px]">דיווחים</span>
                          <span className="font-bold text-slate-800">{b.reports_count}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">פרופילים</span>
                          <span className="text-slate-700">{b.profiles_count}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">גודל</span>
                          <span className="font-mono text-slate-600">{b.file_size_kb || 0} KB</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleRestoreNasBackup(b)}
                          disabled={isRestoring || nasBackupRestoringId !== null || backupDeletingId !== null}
                          className="flex-1 rounded-lg bg-indigo-50 py-1.5 font-bold text-indigo-700 hover:bg-indigo-100 transition border border-indigo-200"
                        >
                          שחזר מערכת
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadNasBackup(b)}
                          className="rounded-lg bg-slate-50 px-2.5 py-1.5 font-medium text-slate-600 hover:bg-slate-100 transition border border-slate-200"
                        >
                          הורד SQL
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSystemBackup(b)}
                          disabled={backupDeletingId !== null}
                          className="rounded-lg bg-red-50 px-2.5 py-1.5 font-bold text-red-600 hover:bg-red-100 transition border border-red-200"
                        >
                          {backupDeletingId === b.id ? "מוחק..." : "מחק"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Adminer Direct Connection Protocol Card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <DatabaseIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">גישה ישירה למסד הנתונים (Adminer ב-NAS)</h3>
              <p className="text-[11px] text-slate-400">ניהול ישיר של טבלאות PostgreSQL ב-NAS דרך ממשק Web</p>
            </div>
          </div>
          <a
            href="http://10.0.0.16:8088"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition border border-indigo-200"
          >
            <span>🔗 פתח Adminer (8088)</span>
          </a>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs text-right divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-600 font-bold">
              <tr>
                <th className="px-3 py-2 w-1/3">שדה במסך הכניסה</th>
                <th className="px-3 py-2 w-2/3">מה לבחור / להקליד</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              <tr>
                <td className="px-3 py-2 font-bold text-slate-700">קישור ישיר</td>
                <td className="px-3 py-2">
                  <a
                    href="http://10.0.0.16:8088"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-indigo-600 hover:underline"
                  >
                    http://10.0.0.16:8088
                  </a>
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-bold text-slate-700">System (מערכת)</td>
                <td className="px-3 py-2 font-mono text-slate-800">PostgreSQL</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-bold text-slate-700">Server (שרת)</td>
                <td className="px-3 py-2 font-mono text-slate-800">10.0.0.16:54320</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-bold text-slate-700">Username (משתמש)</td>
                <td className="px-3 py-2 font-mono text-slate-800">postgres.your-tenant-id</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-bold text-slate-700">Password (סיסמה)</td>
                <td className="px-3 py-2 font-mono text-slate-800">a6UAzV7BJSdNjPiLUFZ3NfDoS5kj12</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-bold text-slate-700">Database (מסד נתונים)</td>
                <td className="px-3 py-2 font-mono text-slate-800">postgres</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
