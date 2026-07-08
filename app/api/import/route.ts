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
    } else if (char === ',' && !inQuotes) {
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

/**
 * POST /api/import — upload historic CSV data
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "משתמש לא מחובר" }, { status: 401 });
    }
    
    const userId = user.id;

    // Read body text (CSV payload)
    const csvContent = await req.text();
    if (!csvContent || csvContent.trim().length === 0) {
      return NextResponse.json({ error: "קובץ ריק או לא תקין" }, { status: 400 });
    }

    const lines = csvContent.split(/\r?\n/);
    if (lines.length < 2) {
      return NextResponse.json({ error: "קובץ ריק או חסר שורות נתונים" }, { status: 400 });
    }

    // Auto-detect format by scanning header columns
    const headerCols = parseCsvLine(lines[0]);
    const isLegacy = headerCols.length >= 16;

    const parsedRows: any[] = [];
    let skippedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = parseCsvLine(line);
      if (cols.length < 3) {
        skippedCount++;
        continue;
      }

      let dateRaw = "";
      let entry = "";
      let exit = "";
      let classification = "";
      let vacationDays = 0;
      let sickDays = 0;
      let reserveDays = 0;
      let notes = "";
      let uniqueNotes = "";
      let orderType = "";

      if (isLegacy) {
        // Legacy workbook: Col 0 = Date, Col 1 = Entry, Col 2 = Exit, Col 9 = Vacation, Col 10 = Reserve, Col 11 = Sick, Col 12 = Classification, Col 13 = Notes, Col 14 = Unique Notes, Col 15 = Order Type
        dateRaw = cols[0];
        entry = cols[1];
        exit = cols[2];
        vacationDays = parseFloat(cols[9]) || 0;
        reserveDays = parseFloat(cols[10]) || 0;
        sickDays = parseFloat(cols[11]) || 0;
        classification = cols[12] || "";
        notes = cols[13] || "";
        uniqueNotes = cols[14] || "";
        orderType = cols[15] || "";
      } else {
        // Standard template: תאריך, כניסה, יציאה, סיווג, חופש, מחלה, מילואים, הערות
        dateRaw = cols[0];
        entry = cols[1];
        exit = cols[2];
        classification = cols[3] || "";
        vacationDays = parseFloat(cols[4]) || 0;
        sickDays = parseFloat(cols[5]) || 0;
        reserveDays = parseFloat(cols[6]) || 0;
        notes = cols[7] || "";
      }

      // Ignore standard workday definition rows in legacy sheet
      if (classification === "הגדרת תקן") {
        continue;
      }

      // Parse date
      let date = ddmmyyyyToIso(dateRaw);
      if (!date && isValidIsoDate(dateRaw)) {
        date = dateRaw;
      }

      if (!date) {
        skippedCount++;
        continue;
      }

      const entryClean = entry ? padTime(entry) : null;
      const exitClean = exit ? padTime(exit) : null;
      const classificationClean = classification ? classification.trim() : "עבודה";
      const notesClean = notes ? notes.trim().substring(0, 500) : null;
      const uniqueNotesClean = uniqueNotes ? uniqueNotes.trim().substring(0, 500) : null;
      
      const isReserveImport = classificationClean === "מילואים" || classificationClean === "עבודה במילואים" || reserveDays > 0;
      const orderTypeClean = orderType ? orderType.trim() : (isReserveImport 
        ? (/צו\s*8/.test(notesClean ?? "") ? "צו 8" : "מילואים רגילים") 
        : null);

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
      imported: parsedRows.length,
      skipped: skippedCount,
      format: isLegacy ? "legacy" : "standard",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "שגיאה לא צפויה במהלך הייבוא" },
      { status: 500 }
    );
  }
}
