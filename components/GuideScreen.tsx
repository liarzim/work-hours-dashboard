"use client";

import { useState } from "react";
import Image from "next/image";
import {
  GridIcon,
  ListIcon,
  ClockIcon,
  ShieldIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  SparklesIcon,
  CalendarIcon,
  UploadIcon,
  InfoIcon,
} from "./Icons";
import DashboardDemo from "./guide/DashboardDemo";
import ShiftsDemo from "./guide/ShiftsDemo";
import ReportsTableDemo from "./guide/ReportsTableDemo";
import MissingReportsDemo from "./guide/MissingReportsDemo";
import ImportDemo from "./guide/ImportDemo";
import SettingsDemo from "./guide/SettingsDemo";

interface GuideSection {
  id: string;
  title: string;
  badge?: string;
  icon: (props: { className?: string }) => JSX.Element;
  description: string;
}

const SECTIONS: GuideSection[] = [
  {
    id: "dashboard",
    title: "לוח הבקרה והמדדים החודשיים",
    badge: "מבט מהיר",
    icon: GridIcon,
    description: "סיכום שעות חודשי, יעד מול ביצוע, כרטיסי KPI ותחזית עבודה יומית",
  },
  {
    id: "shifts",
    title: "דיווח שעות ופיצול משמרות",
    badge: "יכולת חדשה",
    icon: ClockIcon,
    description: "דיווח רגיל מול פיצול למספר מקטעי עבודה ביום וחישוב שעות נטו מדויק",
  },
  {
    id: "reports",
    title: "מסך הדיווחים ועריכה מהירה",
    badge: "מעקב שוטף",
    icon: ListIcon,
    description: "טבלת החודש המלאה, סיווגי ימים, תגיות מקטעים ועריכה ישירה",
  },
  {
    id: "missing",
    title: "השלמת דיווחים חסרים ועדכון מרוכז",
    badge: "פעולות מהירות",
    icon: AlertTriangleIcon,
    description: "זיהוי ימי עבודה ללא דיווח, השלמה מהירה לשעות תקן ועדכון מרוכז של מספר ימים",
  },
  {
    id: "import",
    title: "ייבוא קובץ נוכחות (CSV / שעון)",
    badge: "אוטומציה",
    icon: UploadIcon,
    description: "טעינת פלט שעון נוכחות חודשי, מיפוי חכם של סוגי יום ומקטעים",
  },
  {
    id: "settings",
    title: "הגדרות, תנאי העסקה ושעות נוספות",
    badge: "חישובים ותקנים",
    icon: ShieldIcon,
    description: "הגדרת ערך שעה, סוג העסקה (גלובלי / שעתי), חישוב שעות נוספות ומכסת חופשה",
  },
  {
    id: "faq",
    title: "טיפים ושאלות נפוצות",
    badge: "מידע שימושי",
    icon: InfoIcon,
    description: "תשובות לשאלות נפוצות, קיצורי דרך ודגשים חשובים לעבודה שוטפת",
  },
];

export default function GuideScreen() {
  const [activeSection, setActiveSection] = useState<string>("dashboard");
  const [viewModes, setViewModes] = useState<Record<string, "animation" | "static">>({
    dashboard: "animation",
    shifts: "animation",
    reports: "animation",
    missing: "animation",
    import: "animation",
    settings: "animation",
  });
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string; caption?: string } | null>(null);

  const getMode = (secId: string) => viewModes[secId] || "animation";
  const toggleMode = (secId: string, mode: "animation" | "static") => {
    setViewModes((prev) => ({ ...prev, [secId]: mode }));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Top Banner / Hero */}
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-l from-brand-700 via-brand-600 to-indigo-800 p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
            <SparklesIcon className="h-4 w-4 text-amber-300" />
            <span>מרכז הדרכה אינטראקטיבי • סרטוני הדמיה בלולאה (Option C)</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
            היכרות מקיפה עם כל יכולות המערכת
          </h1>
          <p className="mt-2.5 text-sm text-brand-100 sm:text-base leading-relaxed">
            צפה בהדמיות חיות שרצות בלולאה ללא צורך בקליקים, קרא הסברים ברורים שלב-אחר-שלב,
            והכר את כל התכונות המתקדמות של ניהול שעות, פיצול משמרות, דיווחים חסרים וייבוא נתונים.
          </p>
        </div>

        {/* Decorative blur balls */}
        <div className="absolute -left-12 -top-12 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -right-8 h-48 w-48 rounded-full bg-indigo-500/20 blur-2xl pointer-events-none" />
      </div>

      {/* Main Grid: Sidebar Menu + Active Section Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-4">
          <div className="sticky top-20 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
            <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              נושאי ההדרכה
            </div>
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`group flex w-full items-start gap-3 rounded-xl p-3 text-right transition ${
                    isActive
                      ? "bg-brand-50/90 text-brand-800 shadow-xs border border-brand-200"
                      : "text-slate-700 hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                      isActive
                        ? "bg-brand-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-bold">{sec.title}</span>
                      {sec.badge && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isActive
                              ? "bg-brand-200/80 text-brand-900"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {sec.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                      {sec.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content Area */}
        <main className="lg:col-span-8 space-y-6">
          {/* SECTION 1: DASHBOARD */}
          {activeSection === "dashboard" && (
            <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-600">
                  <GridIcon className="h-4 w-4" />
                  <span>פרק 1</span>
                </div>
                <h2 className="mt-1 text-2xl font-black text-slate-900">לוח הבקרה והמדדים החודשיים</h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  לוח הבקרה (Dashboard) מציג תמונת מצב מקיפה בזמן אמת על החודש הנבחר. הוא מרכז את שעות העבודה שביצעת, 
                  את יתרת השעות הדרושות עד סוף החודש, ואת תחזית שעות העבודה היומיות המומלצות.
                </p>
              </div>

              {/* Display Mode Toggle */}
              <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleMode("dashboard", "animation")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      getMode("dashboard") === "animation"
                        ? "bg-white text-brand-700 shadow-xs border border-brand-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>🎬 הדמיה מונפשת בלולאה (Option C)</span>
                    <span className="rounded-full bg-brand-100 text-brand-800 px-1.5 py-0.2 text-[10px]">
                      מומלץ
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMode("dashboard", "static")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      getMode("dashboard") === "static"
                        ? "bg-white text-brand-700 shadow-xs border border-brand-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>📸 צילום מסך מקורי</span>
                  </button>
                </div>
                <span className="text-[11px] font-medium text-slate-500 hidden sm:inline px-2">
                  {getMode("dashboard") === "animation" ? "סרטון הדמיה אוטומטי ללא קליקים" : "תמונה סטטית עם זום"}
                </span>
              </div>

              {/* View Content */}
              {getMode("dashboard") === "animation" ? (
                <DashboardDemo />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-inner">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => setLightboxImage({
                      src: "/guide/dashboard_chart.png",
                      alt: "גרף פעילות שעות יומית",
                      caption: "גרף שעות יומי – מעקב אחר שעות שבוצעו בכל יום בחודש (מימין לשמאל)"
                    })}
                  >
                    <Image
                      src="/guide/dashboard_chart.png"
                      alt="גרף שעות יומי"
                      width={800}
                      height={400}
                      className="w-full rounded-xl object-contain bg-white transition group-hover:scale-[1.01]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 group-hover:bg-slate-900/30 group-hover:opacity-100 transition rounded-xl">
                      <span className="rounded-xl bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-md">
                        🔍 לחץ להגדלת צילום המסך
                      </span>
                    </div>
                  </div>
                  <p className="p-2 text-center text-xs font-medium text-slate-500">
                    צילום מסך: גרף פעילות שעות יומית לאורך ימי החודש עם חיווי ויזואלי של עמידה ביעד
                  </p>
                </div>
              )}

              {/* Core Features Breakdown */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <ClockIcon className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-bold text-slate-800">4 כרטיסי מדד (KPI) מובילים</h3>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-600 pr-2">
                    <li>• <strong>שעות שדווחו:</strong> סך שעות העבודה בפועל מתוך יעד התקן החודשי.</li>
                    <li>• <strong>שעות שנותרו:</strong> כמה שעות נותר להשלים החודש + ממוצע שעות ליום.</li>
                    <li>• <strong>יתרת חופשה:</strong> יתרת ימי החופשה הכוללת שלך ופירוט ימים שנוצלו החודש.</li>
                    <li>• <strong>שעות נוספות / מילואים / מחלה:</strong> סיכום ימי היעדרות וסטטוס זכאות.</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                      <CalendarIcon className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-bold text-slate-800">בורר חודשים וסנכרון מיידי</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    בחלק העליון של המערכת תוכל לדפדף בקלות בין חודשים באמצעות החצים או ללחוץ על שם החודש כדי לקפוץ ישירות לכל שנה וחודש.
                    כפתור הרענון (סנכרון) מרענן את כל הנתונים מול מסד הנתונים בענן.
                  </p>
                </div>
              </div>

              {/* Practical Tip */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900">
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                  <span>תחזית המשך עבודה (Forecast)</span>
                </div>
                <p className="text-xs leading-relaxed text-emerald-800">
                  המערכת סופרת אוטומטית את <strong>ימי העבודה הפוטנציאליים שנותרו</strong> עד סוף החודש (ללא סופי שבוע וחגים) ומחשבת כמה שעות בממוצע עליך לעבוד בכל יום שנותר כדי להגיע ל-100% מתקן החודש!
                </p>
              </div>
            </div>
          )}

          {/* SECTION 2: SHIFTS & MULTI-SEGMENTS */}
          {activeSection === "shifts" && (
            <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-600">
                  <ClockIcon className="h-4 w-4" />
                  <span>פרק 2 • יכולת בלעדית</span>
                </div>
                <h2 className="mt-1 text-2xl font-black text-slate-900">דיווח שעות ופיצול משמרות ביום</h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  המערכת מאפשרת לדווח שעות עבודה רגילות, ובנוסף תומכת ב<strong>פיצול משמרות למספר מקטעים ביום</strong>.
                  מתאים במיוחד לימים שבהם יצאת לבדיקה, סידורים או לימודים וחזרת להמשך עבודה מאוחר יותר.
                </p>
              </div>

              {/* Display Mode Toggle */}
              <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleMode("shifts", "animation")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      getMode("shifts") === "animation"
                        ? "bg-white text-brand-700 shadow-xs border border-brand-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>🎬 הדמיה מונפשת בלולאה (Option C)</span>
                    <span className="rounded-full bg-brand-100 text-brand-800 px-1.5 py-0.2 text-[10px]">
                      מומלץ
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMode("shifts", "static")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      getMode("shifts") === "static"
                        ? "bg-white text-brand-700 shadow-xs border border-brand-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>📊 השוואה תרשימית</span>
                  </button>
                </div>
                <span className="text-[11px] font-medium text-slate-500 hidden sm:inline px-2">
                  {getMode("shifts") === "animation" ? "סרטון הדמיה אוטומטי ללא קליקים" : "השוואה בין מצבים"}
                </span>
              </div>

              {/* View Content */}
              {getMode("shifts") === "animation" ? (
                <ShiftsDemo />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Single Shift Mockup */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">מצב 1: משמרת רציפה אחת</span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        ברירת מחדל
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="block text-[11px] text-slate-500 mb-1">כניסה</span>
                          <div className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-center font-bold text-brand-700 text-sm">
                            08:00
                          </div>
                        </div>
                        <div>
                          <span className="block text-[11px] text-slate-500 mb-1">יציאה</span>
                          <div className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-center font-bold text-brand-700 text-sm">
                            17:00
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-center text-xs font-bold text-slate-700">
                      סה״כ שעות: <span className="text-brand-600 font-extrabold">9.0 שעות (9:00)</span>
                    </div>
                  </div>

                  {/* Multi-shift Mockup */}
                  <div className="rounded-2xl border-2 border-brand-500 bg-brand-50/30 p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-brand-900 flex items-center gap-1">
                        <SparklesIcon className="w-3.5 h-3.5 text-brand-600" />
                        מצב 2: פיצול למקטעים (חדש!)
                      </span>
                      <span className="rounded-md bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        חישוב נטו
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="rounded-xl bg-white p-2.5 border border-brand-200">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-slate-700">מקטע 1 (בוקר)</span>
                          <span className="text-[10px] font-semibold text-brand-700">4.0 שעות</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <span className="bg-slate-50 rounded px-2 py-1 text-center font-bold">08:00</span>
                          <span className="bg-slate-50 rounded px-2 py-1 text-center font-bold">12:00</span>
                        </div>
                      </div>

                      <div className="text-center text-[11px] font-bold text-slate-400">
                        ⏳ הפסקה / יציאה מהעבודה (לא נחשבת כשעות עבודה!)
                      </div>

                      <div className="rounded-xl bg-white p-2.5 border border-brand-200">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-slate-700">מקטע 2 (ערב)</span>
                          <span className="text-[10px] font-semibold text-brand-700">4.5 שעות</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <span className="bg-slate-50 rounded px-2 py-1 text-center font-bold">14:00</span>
                          <span className="bg-slate-50 rounded px-2 py-1 text-center font-bold">18:30</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg bg-brand-600 py-1.5 text-center text-xs font-bold text-white">
                      סה״כ שעות עבודה נטו: 8.5 שעות
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-3">איך לפצל משמרת בחלון הדיווח?</h3>
                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-700 pr-1 leading-relaxed">
                  <li>לחץ על כפתור <strong>"פיצול למקטעים"</strong> בחלון הדיווח (לצד כותרת שעות העבודה).</li>
                  <li>יוצגו בפניך שני מקטעים. תוכל להזין כניסה ויציאה נפרדות עבור כל מקטע.</li>
                  <li>צריך מקטע שלישי או רביעי? לחץ על כפתור <strong>"+ הוסף מקטע עבודה נוסף"</strong>.</li>
                  <li>שעות העבודה מחושבות בזמן אמת בדיוק מוחלט (סכום נטו של שעות העבודה בפועל).</li>
                  <li>אם תרצה לחזור למצב רגיל, פשוט לחץ על <strong>"חזרה למשמרת רציפה"</strong>.</li>
                </ol>
              </div>
            </div>
          )}

          {/* SECTION 3: MONTHLY REPORTS TABLE */}
          {activeSection === "reports" && (
            <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-600">
                  <ListIcon className="h-4 w-4" />
                  <span>פרק 3</span>
                </div>
                <h2 className="mt-1 text-2xl font-black text-slate-900">מסך הדיווחים ועריכה מהירה</h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  מסך הדיווחים מרכז את כל ימי החודש בטבלה נוחה לקריאה. כאן ניתן לצפות בסיווגי הימים, 
                  לערוך כל יום ישירות בלחיצה על סמל העיפרון, ולראות הערות מיוחדות ושעות נוספות.
                </p>
              </div>

              {/* Display Mode Toggle */}
              <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleMode("reports", "animation")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      getMode("reports") === "animation"
                        ? "bg-white text-brand-700 shadow-xs border border-brand-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>🎬 הדמיה מונפשת בלולאה (Option C)</span>
                    <span className="rounded-full bg-brand-100 text-brand-800 px-1.5 py-0.2 text-[10px]">
                      מומלץ
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMode("reports", "static")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      getMode("reports") === "static"
                        ? "bg-white text-brand-700 shadow-xs border border-brand-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>📸 צילום מסך מקורי</span>
                  </button>
                </div>
                <span className="text-[11px] font-medium text-slate-500 hidden sm:inline px-2">
                  {getMode("reports") === "animation" ? "סרטון הדמיה אוטומטי ללא קליקים" : "תמונה סטטית עם זום"}
                </span>
              </div>

              {/* View Content */}
              {getMode("reports") === "animation" ? (
                <ReportsTableDemo />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-inner">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => setLightboxImage({
                      src: "/guide/reports_table.png",
                      alt: "טבלת דיווחים חודשית",
                      caption: "טבלת דיווחים – סיווגי ימים, שעות עבודה, מקטעים והיעדרויות"
                    })}
                  >
                    <Image
                      src="/guide/reports_table.png"
                      alt="טבלת דיווחים חודשית"
                      width={800}
                      height={380}
                      className="w-full rounded-xl object-contain bg-white transition group-hover:scale-[1.01]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 group-hover:bg-slate-900/30 group-hover:opacity-100 transition rounded-xl">
                      <span className="rounded-xl bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-md">
                        🔍 לחץ להגדלת צילום המסך
                      </span>
                    </div>
                  </div>
                  <p className="p-2 text-center text-xs font-medium text-slate-500">
                    צילום מסך: תצוגת טבלת דיווחים חודשית עם סיווגים בצבעים מובחנים
                  </p>
                </div>
              )}

              {/* Legend & Badges Guide */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <h3 className="text-sm font-bold text-slate-800 mb-3">מקרא צבעים וסיווגי ימים בטבלה</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-xs">
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 font-bold text-emerald-800">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    <span>עבודה (רגילה)</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-purple-50 border border-purple-200 p-2.5 font-bold text-purple-800">
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                    <span>חופש (ניצול חופשה)</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 p-2.5 font-bold text-amber-800">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span>מחלה</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 p-2.5 font-bold text-blue-800">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    <span>מילואים (צו רגיל / 8)</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-fuchsia-50 border border-fuchsia-200 p-2.5 font-bold text-fuchsia-800">
                    <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-500" />
                    <span>חג / ערב חג</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-200 p-2.5 font-bold text-indigo-800">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                    <span>+ שעות נוספות (ש"נ)</span>
                  </div>
                </div>
              </div>

              {/* Table Action Guide */}
              <div className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-4 text-brand-900 text-xs leading-relaxed">
                <PencilIcon className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-sm mb-1">עריכה קלה ומהירה:</strong>
                  לחיצה על סמל ה<strong>עיפרון</strong> (בצד הימני של כל שורה) פותחת את חלון העדכון של אותו יום ישירות מעל המסך.
                  תוכל לעדכן שעות, סיווג, סיבת היעדרות, או להוסיף הערות שנשמרות אוטומטית.
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: MISSING REPORTS & BULK UPDATE */}
          {activeSection === "missing" && (
            <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600">
                  <AlertTriangleIcon className="h-4 w-4" />
                  <span>פרק 4 • מניעת חוסרים</span>
                </div>
                <h2 className="mt-1 text-2xl font-black text-slate-900">איתור דיווחים חסרים ועדכון מרוכז</h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  שכחת לדווח יום עבודה? המערכת סורקת באופן אוטומטי ימי עבודה בעבר שלא הוזנו עבורם שעות או היעדרות,
                  ומאפשרת להשלים אותם בלחיצת כפתור אחת.
                </p>
              </div>

              {/* Display Mode Toggle */}
              <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleMode("missing", "animation")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      getMode("missing") === "animation"
                        ? "bg-white text-brand-700 shadow-xs border border-brand-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>🎬 הדמיה מונפשת בלולאה (Option C)</span>
                    <span className="rounded-full bg-brand-100 text-brand-800 px-1.5 py-0.2 text-[10px]">
                      מומלץ
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMode("missing", "static")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      getMode("missing") === "static"
                        ? "bg-white text-brand-700 shadow-xs border border-brand-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>📸 צילום מסך מקורי</span>
                  </button>
                </div>
                <span className="text-[11px] font-medium text-slate-500 hidden sm:inline px-2">
                  {getMode("missing") === "animation" ? "סרטון הדמיה אוטומטי ללא קליקים" : "תמונה סטטית עם זום"}
                </span>
              </div>

              {/* View Content */}
              {getMode("missing") === "animation" ? (
                <MissingReportsDemo />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-inner">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => setLightboxImage({
                      src: "/guide/missing_reports_modal.png",
                      alt: "מסך דיווחים חסרים ופעולות מהירות",
                      caption: "מסך דיווחים חסרים – לחצני השלמה מהירה לשעות תקן (9 / 8.5 שעות) או היעדרות"
                    })}
                  >
                    <Image
                      src="/guide/missing_reports_modal.png"
                      alt="דיווחים חסרים במערכת"
                      width={800}
                      height={420}
                      className="w-full rounded-xl object-contain bg-white transition group-hover:scale-[1.01]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 group-hover:bg-slate-900/30 group-hover:opacity-100 transition rounded-xl">
                      <span className="rounded-xl bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-md">
                        🔍 לחץ להגדלת צילום המסך
                      </span>
                    </div>
                  </div>
                  <p className="p-2 text-center text-xs font-medium text-slate-500">
                    צילום מסך: חלון הדיווחים החסרים עם לחצני פעולה מהירה עבור כל יום
                  </p>
                </div>
              )}

              {/* Quick Actions Feature Breakdown */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 mb-2 font-bold text-sm text-slate-800">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-700 text-xs">
                      ⚡
                    </span>
                    <span>לחצני פעולה מהירה (בלחיצה אחת!)</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-center gap-1.5">
                      <span className="rounded-md bg-blue-100 px-2 py-0.5 font-bold text-blue-700">⏱️ שעות תקן</span>
                      <span>ממלא אוטומטית שעות תקן (למשל 08:00 - 17:00).</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="rounded-md bg-purple-100 px-2 py-0.5 font-bold text-purple-700">🏖️ חופש</span>
                      <span>מסמן יום חופש מלא ומעדכן את ניצול החופשה.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 font-bold text-amber-700">💊 מחלה</span>
                      <span>מסמן יום מחלה מלא.</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 mb-2 font-bold text-sm text-slate-800">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-100 text-brand-700 text-xs">
                      📋
                    </span>
                    <span>עדכון מרוכז לקבוצת ימים (Bulk)</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-2">
                    ניתן לסמן תיבות בחירה (Checkboxes) ליד מספר ימים, או ללחוץ על <strong>"בחר הכל"</strong>, 
                    ולבצע עדכון אחיד לכולם בפעם אחת (למשל תקופת מילואים, חופשה מרוכזת או שעות עבודה זהות).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: CSV IMPORT */}
          {activeSection === "import" && (
            <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-600">
                  <UploadIcon className="h-4 w-4" />
                  <span>פרק 5</span>
                </div>
                <h2 className="mt-1 text-2xl font-black text-slate-900">ייבוא קובץ נוכחות (CSV / Excel)</h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  במקום להקליד יום אחר יום, באפשרותך לייצא את דו"ח הנוכחות החודשי ממערכת השעון שלך (כגון חילן, מלם, הר-גל או קובץ פנימי)
                  ולטעון אותו ישירות למערכת.
                </p>
              </div>

              {/* Display Mode Toggle */}
              <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleMode("import", "animation")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      getMode("import") === "animation"
                        ? "bg-white text-brand-700 shadow-xs border border-brand-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>🎬 הדמיה מונפשת בלולאה (Option C)</span>
                    <span className="rounded-full bg-brand-100 text-brand-800 px-1.5 py-0.2 text-[10px]">
                      מומלץ
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMode("import", "static")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      getMode("import") === "static"
                        ? "bg-white text-brand-700 shadow-xs border border-brand-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>📋 מדריך שלבים כתוב</span>
                  </button>
                </div>
                <span className="text-[11px] font-medium text-slate-500 hidden sm:inline px-2">
                  {getMode("import") === "animation" ? "סרטון הדמיה אוטומטי ללא קליקים" : "שלבים כתובים"}
                </span>
              </div>

              {/* View Content */}
              {getMode("import") === "animation" ? (
                <ImportDemo />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      1
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">היכנס למסך הגדרות &gt; ייבוא היסטוריית דיווחים</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        בתחתית מסך ההגדרות תמצא את אזור ייבוא הקבצים. לחץ על אזור ההעלאה ובחר את קובץ ה-CSV או ה-Excel של החודש הרצוי.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      2
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">זיהוי ומיפוי אוטומטי חכם</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        המערכת מזהה אוטומטית את עמודות הקובץ (שעת התחלה, שעת סיום, תיאור נוכחות/היעדרות, סוג יום וסך שעות).
                        בנוסף, ימים עם מספר מקטעים (כניסות ויציאות מרובות) מאוגדים אוטומטית למקטעי עבודה מדויקים!
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      3
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">תצוגה מקדימה ואישור שמירה</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        לפני ביצוע השמירה, יוצג בפניך סיכום של הנתונים שנקלטו: מספר הימים, סך השעות שחושבו, ופירוט מלא.
                        לאחר בדיקה קצרה, לוחצים על "שמור דיווחים" והנתונים מוזנים למערכת.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pro Tip */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-blue-900 text-xs leading-relaxed">
                <strong>💡 טיפ לאבטחת נתונים:</strong>
                הייבוא מבצע עדכון חכם (Upsert) – דיווחים קיימים של אותו יום יתעדכנו על פי הקובץ, ושאר החודשים נשמרים ללא שינוי.
              </div>
            </div>
          )}

          {/* SECTION 6: SETTINGS & PAYROLL */}
          {activeSection === "settings" && (
            <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-600">
                  <ShieldIcon className="h-4 w-4" />
                  <span>פרק 6</span>
                </div>
                <h2 className="mt-1 text-2xl font-black text-slate-900">הגדרות, תנאי העסקה ושעות נוספות</h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  התאמת המערכת לחוזה העבודה האישי שלך: סוג ההעסקה, ערך שעת עבודה, מנגנון חישוב שעות נוספות לפי החוק,
                  וקביעת מכסת החופשה השנתית.
                </p>
              </div>

              {/* Display Mode Toggle */}
              <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleMode("settings", "animation")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      getMode("settings") === "animation"
                        ? "bg-white text-brand-700 shadow-xs border border-brand-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>🎬 הדמיה מונפשת בלולאה (Option C)</span>
                    <span className="rounded-full bg-brand-100 text-brand-800 px-1.5 py-0.2 text-[10px]">
                      מומלץ
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMode("settings", "static")}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      getMode("settings") === "static"
                        ? "bg-white text-brand-700 shadow-xs border border-brand-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>📸 צילום מסך מקורי</span>
                  </button>
                </div>
                <span className="text-[11px] font-medium text-slate-500 hidden sm:inline px-2">
                  {getMode("settings") === "animation" ? "סרטון הדמיה אוטומטי ללא קליקים" : "תמונה סטטית עם זום"}
                </span>
              </div>

              {/* View Content */}
              {getMode("settings") === "animation" ? (
                <SettingsDemo />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-inner">
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => setLightboxImage({
                      src: "/guide/settings_overview.png",
                      alt: "מסך הגדרות מערכת ותקנים",
                      caption: "מסך הגדרות – חופשה, תקן ימי עבודה שנתי, לוח חגים וסיווגים"
                    })}
                  >
                    <Image
                      src="/guide/settings_overview.png"
                      alt="הגדרות מערכת"
                      width={800}
                      height={400}
                      className="w-full rounded-xl object-contain bg-white transition group-hover:scale-[1.01]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 opacity-0 group-hover:bg-slate-900/30 group-hover:opacity-100 transition rounded-xl">
                      <span className="rounded-xl bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-md">
                        🔍 לחץ להגדלת צילום המסך
                      </span>
                    </div>
                  </div>
                  <p className="p-2 text-center text-xs font-medium text-slate-500">
                    צילום מסך: מסך ההגדרות לניהול חופשות, תקנים שנתיים ולוח חגים
                  </p>
                </div>
              )}

              {/* Overtime & Employment breakdown */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-bold text-slate-800 mb-2">חישוב שעות נוספות לפי חוק</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    כאשר יום העבודה עובר את התקן היומי (9 שעות בימים א'-ד', 8.5 שעות ביום ה'):
                  </p>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-700 pr-3">
                    <li>• <strong>שעתיים ראשונות מעבר לתקן:</strong> מחושבות בתעריף של <strong>125%</strong>.</li>
                    <li>• <strong>החל מהשעה השלישית ומעלה:</strong> מחושבות בתעריף של <strong>150%</strong>.</li>
                    <li>• <strong>הערכת שווי כספי:</strong> המערכת מכפילה את השעות בערך השעה שלך ומציגה את סך התוספת הכספית הצפויה לחודש!</li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-sm font-bold text-slate-800 mb-2">סוג העסקה: גלובלי מול שעתי</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    במסך ההגדרות ניתן להגדיר האם סוג ההעסקה הינו גלובלי (שבו השכר קבוע ויש מעקב אחר עמידה בתקן החודשי הכולל)
                    או עובד שעתי (שבו כל שעת עבודה ושעה נוספת מחושבות ישירות לתשלום).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: FAQ & TIPS */}
          {activeSection === "faq" && (
            <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
              <div className="border-b border-slate-100 pb-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-600">
                  <InfoIcon className="h-4 w-4" />
                  <span>פרק 7</span>
                </div>
                <h2 className="mt-1 text-2xl font-black text-slate-900">טיפים ושאלות נפוצות (FAQ)</h2>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  תשובות מרוכזות לשאלות נפוצות שיעזרו לך להפיק את המרב מהמערכת.
                </p>
              </div>

              <div className="space-y-3">
                <details className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-4 open:bg-white open:shadow-xs transition">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-slate-800">
                    <span>איך מחושב חג או ערב חג שלא עבדתי בו?</span>
                    <span className="text-brand-600 transition group-open:rotate-180">▼</span>
                  </summary>
                  <p className="mt-3 text-xs text-slate-600 leading-relaxed pr-2">
                    ימי חג אינם גורעים משעות העבודה שלך – הם נספרים כחלק מתקן החודש המשולם ומופחתים מימי העבודה שנותר לעבוד בהם.
                    בגרף הפעילות הם מוצגים בצורה ברורה כדי שתוכל לראות בדיוק את מבנה החודש.
                  </p>
                </details>

                <details className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-4 open:bg-white open:shadow-xs transition">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-slate-800">
                    <span>יצאתי באמצע יום העבודה וחזרתי. כיצד לדווח?</span>
                    <span className="text-brand-600 transition group-open:rotate-180">▼</span>
                  </summary>
                  <p className="mt-3 text-xs text-slate-600 leading-relaxed pr-2">
                    פשוט לחץ על כפתור העיפרון באותו יום, לחץ על <strong>"פיצול למקטעים"</strong>, והזן את שעות החלק הראשון ואת שעות החלק השני.
                    המערכת תחשב רק את השעות שבהן עבדת בפועל, ולא תחשיב את שעות ההפסקה ביניהן!
                  </p>
                </details>

                <details className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-4 open:bg-white open:shadow-xs transition">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-slate-800">
                    <span>האם ניתן להשתמש באפליקציה גם בנייד?</span>
                    <span className="text-brand-600 transition group-open:rotate-180">▼</span>
                  </summary>
                  <p className="mt-3 text-xs text-slate-600 leading-relaxed pr-2">
                    כן, המערכת מותאמת באופן מלא לניידים וטאבלטים (רספונסיבית), ותומכת ב-PWA כך שניתן להתקין אותה כאפליקציה במסך הבית של הטלפון.
                  </p>
                </details>

                <details className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-4 open:bg-white open:shadow-xs transition">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-slate-800">
                    <span>כיצד לדווח חצי יום חופש או חצי יום מחלה?</span>
                    <span className="text-brand-600 transition group-open:rotate-180">▼</span>
                  </summary>
                  <p className="mt-3 text-xs text-slate-600 leading-relaxed pr-2">
                    במסך הדיווח ישנם שדות חופש ומחלה. במקום 1, ניתן להזין <strong>0.5</strong>. בנוסף, אם עבדת חצי יום, 
                    תוכל להזין את שעות העבודה שביצעת במקביל לדיווח החצי יום חופש.
                  </p>
                </details>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Lightbox Modal for Full Screenshot Viewing */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl overflow-hidden rounded-3xl bg-white p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <span className="text-sm font-bold text-slate-800">{lightboxImage.alt}</span>
              <button
                onClick={() => setLightboxImage(null)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 transition"
              >
                ✕
              </button>
            </div>
            <div className="p-2">
              <Image
                src={lightboxImage.src}
                alt={lightboxImage.alt}
                width={1200}
                height={700}
                className="rounded-xl object-contain max-h-[75vh] w-auto mx-auto"
              />
              {lightboxImage.caption && (
                <p className="mt-2.5 text-center text-xs font-semibold text-slate-600">
                  {lightboxImage.caption}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
