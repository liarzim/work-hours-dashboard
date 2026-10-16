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

function parseCellDate(val: any): string {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "number" && val > 1000) {
    // Excel serial date (days since 1900-01-01, with leap year offset)
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  const s = String(val).trim();
  if (isValidIsoDate(s)) return s;
  const iso = ddmmyyyyToIso(s);
  if (iso) return iso;
  return "";
}

function sanitizeCsvField(val: string): string {
  let s = val.trim();
  if (/^[=+\-@\t\r]/.test(s)) {
    s = "'" + s;
  }
  return s;
}

const norm = (s: any) => String(s || "").trim().toLowerCase().replace(/["'_ \t\r\n]/g, "");

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

    // Fallback: CSV text splitting
    if (rawRows.length === 0) {
      const lines = rawBody.split(/\r?\n/);
      rawRows = lines.map((l) => parseCsvLine(l));
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
    let vacationIdx = -1;
    let sickIdx = -1;
    let reserveIdx = -1;
    let notesIdx = -1;
    let uniqueNotesIdx = -1;
    let orderTypeIdx = -1;

    firstRow.forEach((col, idx) => {
      const n = norm(col);
      if (n === "תאריך" || n === "date") dateIdx = idx;
      else if (n === "כניסה" || n === "entry" || n === "start") entryIdx = idx;
      else if (n === "יציאה" || n === "exit" || n === "end") exitIdx = idx;
      else if (n === "סיווג" || n === "classification" || n === "type") classIdx = idx;
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

    const parsedRows: any[] = [];
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
        vacationDays = vacationIdx !== -1 ? parseFloat(cols[vacationIdx]) || 0 : 0;
        sickDays = sickIdx !== -1 ? parseFloat(cols[sickIdx]) || 0 : 0;
        reserveDays = reserveIdx !== -1 ? parseFloat(cols[reserveIdx]) || 0 : 0;
        notesRaw = notesIdx !== -1 ? cols[notesIdx] : "";
        uniqueNotesRaw = uniqueNotesIdx !== -1 ? cols[uniqueNotesIdx] : "";
        orderTypeRaw = orderTypeIdx !== -1 ? cols[orderTypeIdx] : "";
      } else if (isLegacy) {
        // Legacy workbook: Col 0 = Date, Col 1 = Entry, Col 2 = Exit, Col 9 = Vacation, Col 10 = Reserve, Col 11 = Sick, Col 12 = Classification, Col 13 = Notes, Col 14 = Unique Notes, Col 15 = Order Type
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
        // Standard template: תאריך, כניסה, יציאה, סיווג, חופש, מחלה, מילואים, הערות, הערות ייחודיות
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

      // Ignore standard workday definition rows in legacy sheet
      if (String(classificationRaw).trim() === "הגדרת תקן") {
        continue;
      }

      // Parse date
      const date = parseCellDate(dateRaw);
      if (!date) {
        skippedCount++;
        continue;
      }

      const entryClean = parseCellTime(entryRaw);
      const exitClean = parseCellTime(exitRaw);
      const classificationClean = classificationRaw ? sanitizeCsvField(String(classificationRaw)) : "עבודה";
      const notesClean = notesRaw ? sanitizeCsvField(String(notesRaw).substring(0, 500)) : null;
      const uniqueNotesClean = uniqueNotesRaw ? sanitizeCsvField(String(uniqueNotesRaw).substring(0, 500)) : null;

      const isReserveImport =
        classificationClean === "מילואים" ||
        classificationClean === "עבודה במילואים" ||
        reserveDays > 0;

      const orderTypeClean = orderTypeRaw
        ? String(orderTypeRaw).trim()
        : isReserveImport
        ? /צו\s*8/.test(notesClean ?? "")
          ? "צו 8"
          : "מילואים רגילים"
        : null;

      parsedRows.push({
        user_id: userId,
        date,
        entry: entryClean || null,
        exit: exitClean || null,
        vacation_days: vacationDays,
        sick_days: sickDays,
        reserve_days: reserveDays,
        classification: classificationClean,
        notes: notesClean || null,
        unique_notes: uniqueNotesClean || null,
        order_type: orderTypeClean || null,
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
