import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ddmmyyyyToIso } from "@/lib/date";

export const dynamic = "force-dynamic";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function isValidIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function padTime(t: string): string {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(t.trim());
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : "";
}

function parseCellTime(val: any): string {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "number" && val >= 0 && val <= 1) {
    // Excel time fraction of day
    const totalMinutes = Math.round(val * 24 * 60);
    const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const m = String(totalMinutes % 60).padStart(2, "0");
    return `${h}:${m}`;
  }
  if (val instanceof Date) {
    const h = String(val.getHours()).padStart(2, "0");
    const m = String(val.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
  return padTime(String(val));
}

function cleanQuotes(val: any): string {
  if (val === null || val === undefined) return "";
  let s = String(val).trim();
  s = s.replace(/""/g, '"');
  s = s.replace(/^["']|["']$/g, "").trim();
  return s;
}

function parseCellDate(val: any): string {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "number" && val > 1000) {
    // Excel serial date (days since 1899-12-30) - compute using UTC day slots to prevent timezone slippage
    const utcDays = Math.floor(val - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  if (isValidIsoDate(s)) return s;
  const iso = ddmmyyyyToIso(s);
  if (iso) return iso;
  return "";
}

function sanitizeCsvField(val: string): string {
  let s = cleanQuotes(val);
  if (/^[=+\-@\t\r]/.test(s)) {
    s = "'" + s;
  }
  return s;
}

const norm = (s: any) => String(s || "").trim().toLowerCase().replace(/["'_ \t\r\n\ufeff]/g, "");

/**
 * POST /api/import — upload historic CSV or Excel data
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "משתמש לא מחובר" }, { status: 401 });
    }

    const userId = user.id;

    // Enforce 10MB maximum payload size
    const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024;
    const contentLength = Number(req.headers.get("content-length") || "0");
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: "גודל הקובץ חורג מהמגבלה המותרת (עד 10MB)" },
        { status: 413 }
      );
    }

    const rawBody = await req.text();
    if (!rawBody || rawBody.trim().length === 0) {
      return NextResponse.json({ error: "קובץ ריק או לא תקין" }, { status: 400 });
    }

    let rawRows: any[][] = [];

    // Check if JSON payload (from Excel sheet_to_json or frontend JSON upload)
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json") || rawBody.trim().startsWith("{")) {
      try {
        const json = JSON.parse(rawBody);
        if (Array.isArray(json.rows)) {
          rawRows = json.rows;
        }
      } catch (jsonErr) {
        console.warn("Could not parse as JSON, falling back to CSV line parser:", jsonErr);
      }
    }

    // Fallback: CSV text splitting with XLSX
    if (rawRows.length === 0) {
      try {
        const XLSX = require("xlsx");
        const workbook = XLSX.read(rawBody, { type: "string", raw: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
      } catch {
        const lines = rawBody.split(/\r?\n/);
        rawRows = lines.map((l) => parseCsvLine(l));
      }
    }

    // Filter out completely blank lines
    rawRows = rawRows.filter((r) => Array.isArray(r) && r.some((c) => c !== null && c !== undefined && String(c).trim() !== ""));

    if (rawRows.length < 2) {
      return NextResponse.json({ error: "קובץ ריק או חסר שורות נתונים" }, { status: 400 });
    }

    // 1. Detect dynamic column positions by analyzing header row
    const firstRow = rawRows[0];
    let dateIdx = -1;
    let entryIdx = -1;
    let exitIdx = -1;
    let classIdx = -1;
    let dayTypeIdx = -1;
    let hoursIdx = -1;
    let vacationIdx = -1;
    let sickIdx = -1;
    let reserveIdx = -1;
    let notesIdx = -1;
    let uniqueNotesIdx = -1;
    let orderTypeIdx = -1;

    firstRow.forEach((col, idx) => {
      const n = norm(col);
      if (n === "תאריך" || n === "date") dateIdx = idx;
      else if (
        n === "כניסה" ||
        n === "entry" ||
        n === "start" ||
        n.includes("שעתהתחלה") ||
        n.includes("התחלה") ||
        n.includes("שעתכניסה")
      ) entryIdx = idx;
      else if (
        n === "יציאה" ||
        n === "exit" ||
        n === "end" ||
        n.includes("שעתסיום") ||
        n.includes("סיום") ||
        n.includes("שעתיציאה")
      ) exitIdx = idx;
      else if (n.includes("סוגיום")) dayTypeIdx = idx;
      else if (
        n === "סיווג" ||
        n === "classification" ||
        n === "type" ||
        n.includes("תאורנוכחות") ||
        n.includes("תיאורנוכחות") ||
        n.includes("תאורהעדרות")
      ) classIdx = idx;
      else if (n.includes("סךשעות") || n.includes("סהכשעות") || n === "hours") hoursIdx = idx;
      else if (n.includes("חופש") || n.includes("חופשה") || n === "vacation" || n === "vacationdays") vacationIdx = idx;
      else if (n.includes("מחלה") || n === "sick" || n === "sickdays") sickIdx = idx;
      else if (n.includes("מילואים") || n === "reserve" || n === "reservedays") reserveIdx = idx;
      else if (n.includes("הערותייחודיות") || n.includes("הערהייחודית") || n.includes("הערותיחודיות") || n === "uniquenotes" || n === "uniquenote") uniqueNotesIdx = idx;
      else if (n.includes("הערות") || n.includes("הערה") || n === "notes" || n === "note") notesIdx = idx;
      else if (n.includes("סוגצו") || n === "צו" || n === "ordertype") orderTypeIdx = idx;
    });

    const hasHeaderMapping = dateIdx !== -1;
    const isLegacy = !hasHeaderMapping && firstRow.length >= 16;
    const startIndex = hasHeaderMapping ? 1 : (parseCellDate(firstRow[0]) ? 0 : 1);

    // Group rows by parsed date to handle multi-shift / split punch days
    const dateGroups = new Map<string, any[]>();
    let skippedCount = 0;

    for (let i = startIndex; i < rawRows.length; i++) {
      const cols = rawRows[i];
      if (!cols || cols.length < 2) {
        skippedCount++;
        continue;
      }

      let dateRaw: any = "";
      let entryRaw: any = "";
      let exitRaw: any = "";
      let classificationRaw: any = "";
      let dayTypeRaw: any = "";
      let totalHoursRaw: any = 0;
      let vacationDays = 0;
      let sickDays = 0;
      let reserveDays = 0;
      let notesRaw: any = "";
      let uniqueNotesRaw: any = "";
      let orderTypeRaw: any = "";

      if (hasHeaderMapping) {
        dateRaw = dateIdx !== -1 ? cols[dateIdx] : "";
        entryRaw = entryIdx !== -1 ? cols[entryIdx] : "";
        exitRaw = exitIdx !== -1 ? cols[exitIdx] : "";
        classificationRaw = classIdx !== -1 ? cols[classIdx] : "";
        dayTypeRaw = dayTypeIdx !== -1 ? cols[dayTypeIdx] : "";
        totalHoursRaw = hoursIdx !== -1 ? parseFloat(cols[hoursIdx]) || 0 : 0;
        vacationDays = vacationIdx !== -1 ? parseFloat(cols[vacationIdx]) || 0 : 0;
        sickDays = sickIdx !== -1 ? parseFloat(cols[sickIdx]) || 0 : 0;
        reserveDays = reserveIdx !== -1 ? parseFloat(cols[reserveIdx]) || 0 : 0;
        notesRaw = notesIdx !== -1 ? cols[notesIdx] : "";
        uniqueNotesRaw = uniqueNotesIdx !== -1 ? cols[uniqueNotesIdx] : "";
        orderTypeRaw = orderTypeIdx !== -1 ? cols[orderTypeIdx] : "";
      } else if (isLegacy) {
        dateRaw = cols[0];
        entryRaw = cols[1];
        exitRaw = cols[2];
        vacationDays = parseFloat(cols[9]) || 0;
        reserveDays = parseFloat(cols[10]) || 0;
        sickDays = parseFloat(cols[11]) || 0;
        classificationRaw = cols[12] || "";
        notesRaw = cols[13] || "";
        uniqueNotesRaw = cols[14] || "";
        orderTypeRaw = cols[15] || "";
      } else {
        dateRaw = cols[0];
        entryRaw = cols[1];
        exitRaw = cols[2];
        classificationRaw = cols[3] || "";
        vacationDays = parseFloat(cols[4]) || 0;
        sickDays = parseFloat(cols[5]) || 0;
        reserveDays = parseFloat(cols[6]) || 0;
        notesRaw = cols[7] || "";
        uniqueNotesRaw = cols[8] || "";
        orderTypeRaw = cols[9] || "";
      }

      if (String(classificationRaw).trim() === "הגדרת תקן") {
        continue;
      }

      const date = parseCellDate(dateRaw);
      if (!date) {
        skippedCount++;
        continue;
      }

      if (!dateGroups.has(date)) {
        dateGroups.set(date, []);
      }
      dateGroups.get(date)!.push({
        entryRaw,
        exitRaw,
        classificationRaw,
        dayTypeRaw,
        totalHoursRaw,
        vacationDays,
        sickDays,
        reserveDays,
        notesRaw,
        uniqueNotesRaw,
        orderTypeRaw,
      });
    }

    const parsedRows: any[] = [];

    for (const [date, items] of Array.from(dateGroups.entries())) {
      const dateObj = new Date(`${date}T00:00:00`);
      const dow = dateObj.getDay();

      // Check if completely empty placeholder row
      const hasAnyHours = items.some((it) => it.entryRaw || it.exitRaw || it.totalHoursRaw > 0);
      const hasAnyNotes = items.some((it) => it.notesRaw || it.uniqueNotesRaw);
      const hasAbsenceDays = items.some((it) => it.vacationDays > 0 || it.sickDays > 0 || it.reserveDays > 0);
      const hasSpecialDesc = items.some(
        (it) => it.dayTypeRaw || (it.classificationRaw && it.classificationRaw !== "עבודה")
      );

      if (!hasAnyHours && !hasAnyNotes && !hasAbsenceDays && !hasSpecialDesc) {
        // Skip empty future / placeholder lines
        continue;
      }

      // Extract valid shifts for this day
      const validShifts: Array<{ entry: string; exit: string; description?: string }> = [];
      for (const it of items) {
        const ent = parseCellTime(it.entryRaw);
        const ext = parseCellTime(it.exitRaw);
        if (ent || ext) {
          validShifts.push({
            entry: ent,
            exit: ext,
            description: cleanQuotes(it.classificationRaw || it.dayTypeRaw) || undefined,
          });
        }
      }

      // Classify the day
      const firstDesc = items.map((it) => cleanQuotes(it.classificationRaw)).find(Boolean) || "";
      const firstDayType = items.map((it) => cleanQuotes(it.dayTypeRaw)).find(Boolean) || "";
      let classificationClean = "עבודה";

      if (
        firstDayType.includes("חוה\"מ") ||
        firstDayType.includes("חוהמ") ||
        firstDayType.includes("חול המועד") ||
        firstDesc.includes("חול המועד")
      ) {
        classificationClean = "חול המועד";
      } else if (
        firstDayType.includes("ערב חג") ||
        firstDayType.includes("הושע\"ר") ||
        firstDayType.includes("הושער")
      ) {
        classificationClean = "ערב חג";
      } else if (
        firstDayType.includes("חג") ||
        firstDayType.includes("ש' תורה") ||
        firstDayType.includes("שמחת תורה") ||
        firstDayType.includes("סוכות") ||
        firstDayType.includes("פסח") ||
        firstDayType.includes("ראש השנה") ||
        firstDayType.includes("כיפור")
      ) {
        classificationClean = "חג";
      } else if (
        firstDesc.includes("עבודה במילואים") ||
        firstDayType.includes("עבודה במילואים")
      ) {
        classificationClean = "עבודה במילואים";
      } else if (
        firstDesc.includes("מילואים") ||
        firstDayType.includes("מילואים")
      ) {
        classificationClean = "מילואים";
      } else if (
        firstDesc.includes("מחלה") ||
        firstDayType.includes("מחלה")
      ) {
        classificationClean = "מחלה";
      } else if (
        firstDesc.includes("חופש") ||
        firstDesc.includes("חופשה") ||
        firstDesc.includes("היעדרות כללית")
      ) {
        classificationClean = "חופש";
      } else if (
        firstDesc.includes("נוכחות") ||
        firstDesc.includes("עבודה") ||
        firstDesc.includes("שעון")
      ) {
        classificationClean = "עבודה";
      } else if (firstDesc) {
        classificationClean = firstDesc;
      } else if (dow === 5 || dow === 6) {
        classificationClean = 'סופ"ש';
      }

      classificationClean = sanitizeCsvField(classificationClean);

      // Absence days computation
      let vacationDays = items.reduce((acc, it) => acc + (it.vacationDays || 0), 0);
      let sickDays = items.reduce((acc, it) => acc + (it.sickDays || 0), 0);
      let reserveDays = items.reduce((acc, it) => acc + (it.reserveDays || 0), 0);

      if (classificationClean === "חופש" && vacationDays === 0 && validShifts.length === 0) {
        vacationDays = 1;
      }
      if (classificationClean === "מחלה" && sickDays === 0) {
        sickDays = 1;
      }
      if (classificationClean === "מילואים" && reserveDays === 0) {
        reserveDays = 1;
      }

      const isAbsence =
        classificationClean !== "עבודה" && classificationClean !== "עבודה במילואים";

      let entryClean: string | null = null;
      let exitClean: string | null = null;
      let shiftsPayload: Array<{ entry: string; exit: string; description?: string }> = [];

      if (!isAbsence && validShifts.length > 0) {
        entryClean = validShifts[0].entry || null;
        exitClean = validShifts[validShifts.length - 1].exit || null;
        if (validShifts.length > 1) {
          shiftsPayload = validShifts;
        }
      }

      // Combine notes
      const notesClean = items
        .map((it) => it.notesRaw)
        .filter(Boolean)
        .map((n) => cleanQuotes(n))
        .join(" ; ");
      const uniqueNotesClean = items
        .map((it) => it.uniqueNotesRaw)
        .filter(Boolean)
        .map((n) => cleanQuotes(n))
        .join(" ; ");

      const isReserveImport =
        classificationClean === "מילואים" ||
        classificationClean === "עבודה במילואים" ||
        reserveDays > 0;

      const orderTypeClean =
        items.map((it) => cleanQuotes(it.orderTypeRaw)).find(Boolean) ||
        (isReserveImport
          ? /צו\s*8/.test(notesClean)
            ? "צו 8"
            : "מילואים רגילים"
          : null);

      parsedRows.push({
        user_id: userId,
        date,
        entry: entryClean,
        exit: exitClean,
        shifts: shiftsPayload,
        vacation_days: vacationDays,
        sick_days: sickDays,
        reserve_days: reserveDays,
        classification: classificationClean,
        notes: notesClean ? sanitizeCsvField(notesClean.substring(0, 500)) : null,
        unique_notes: uniqueNotesClean
          ? sanitizeCsvField(uniqueNotesClean.substring(0, 500))
          : null,
        order_type: orderTypeClean ? sanitizeCsvField(orderTypeClean) : null,
      });
    }

    if (parsedRows.length === 0) {
      return NextResponse.json({ error: "לא נמצאו שורות תקינות לייבוא" }, { status: 400 });
    }

    // Batch upsert to database (up to 1000 rows at once)
    const chunkSize = 1000;
    for (let i = 0; i < parsedRows.length; i += chunkSize) {
      const chunk = parsedRows.slice(i, i + chunkSize);
      const { error: upsertError } = await supabase
        .from("reports")
        .upsert(chunk, { onConflict: "user_id, date" });

      if (upsertError) {
        throw new Error(upsertError.message || "שגיאה בכתיבה למסד הנתונים");
      }
    }

    return NextResponse.json({
      success: true,
      count: parsedRows.length,
      imported: parsedRows.length,
      skipped: skippedCount,
      format: hasHeaderMapping ? "header-detected" : isLegacy ? "legacy" : "standard",
    });
  } catch (err: any) {
    console.error("[Import Route Error]", err);
    return NextResponse.json(
      { error: err.message || "שגיאה לא צפויה במהלך הייבוא" },
      { status: 500 }
    );
  }
}
