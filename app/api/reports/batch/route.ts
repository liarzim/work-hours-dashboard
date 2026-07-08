import { NextRequest, NextResponse } from "next/server";
import { saveReportsBatch } from "@/lib/data";
import { ReportInput } from "@/lib/types";

const ALLOWED_CLASSIFICATIONS = new Set<string>([
  "עבודה",
  "חופש",
  "מחלה",
  "מילואים",
  "חג",
  "ערב חג",
  "סופ\"ש",
  "סופש",
  "סופשבוע",
  "שבת",
  "חול המועד",
  "עבודה במילואים",
]);

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function isValidAbsence(v: unknown): boolean {
  return (
    v === undefined ||
    (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1)
  );
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: {
    dates: string[];
    updates: Partial<ReportInput>;
    fieldsToUpdate: string[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין" }, { status: 400 });
  }

  const { dates, updates, fieldsToUpdate } = body;

  if (!dates || !Array.isArray(dates) || dates.length === 0) {
    return NextResponse.json({ error: "רשימת תאריכים חסרה או לא תקינה" }, { status: 400 });
  }

  if (!fieldsToUpdate || !Array.isArray(fieldsToUpdate) || fieldsToUpdate.length === 0) {
    return NextResponse.json({ error: "לא נבחרו שדות לעדכון" }, { status: 400 });
  }

  const fieldsSet = new Set(fieldsToUpdate);

  // Validate updates
  if (fieldsSet.has("entry") && updates.entry) {
    const hhmm = /^([01]?\d|2[0-3]):[0-5]\d$/;
    if (!hhmm.test(updates.entry)) {
      return NextResponse.json({ error: "שעת כניסה לא תקינה (HH:mm)" }, { status: 400 });
    }
  }

  if (fieldsSet.has("exit") && updates.exit) {
    const hhmm = /^([01]?\d|2[0-3]):[0-5]\d$/;
    if (!hhmm.test(updates.exit)) {
      return NextResponse.json({ error: "שעת יציאה לא תקינה (HH:mm)" }, { status: 400 });
    }
  }

  if (fieldsSet.has("entry") || fieldsSet.has("exit")) {
    const entryVal = updates.entry;
    const exitVal = updates.exit;
    if (entryVal && exitVal && toMinutes(exitVal) <= toMinutes(entryVal)) {
      return NextResponse.json(
        { error: "שעת היציאה חייבת להיות אחרי שעת הכניסה" },
        { status: 400 }
      );
    }
  }

  if (fieldsSet.has("classification") && updates.classification) {
    if (!ALLOWED_CLASSIFICATIONS.has(updates.classification)) {
      return NextResponse.json({ error: `סיווג לא מוכר: "${updates.classification}"` }, { status: 400 });
    }
  }

  if (
    (fieldsSet.has("vacationDays") && !isValidAbsence(updates.vacationDays)) ||
    (fieldsSet.has("sickDays") && !isValidAbsence(updates.sickDays)) ||
    (fieldsSet.has("reserveDays") && !isValidAbsence(updates.reserveDays))
  ) {
    return NextResponse.json(
      { error: "ערך היעדרות חייב להיות בין 0 ל-1" },
      { status: 400 }
    );
  }

  if (fieldsSet.has("notes") && typeof updates.notes === "string" && updates.notes.length > 500) {
    return NextResponse.json({ error: "הערה ארוכה מדי (עד 500 תווים)" }, { status: 400 });
  }

  if (fieldsSet.has("uniqueNotes") && typeof updates.uniqueNotes === "string" && updates.uniqueNotes.length > 500) {
    return NextResponse.json({ error: "הערה ייחודית ארוכה מדי (עד 500 תווים)" }, { status: 400 });
  }

  try {
    await saveReportsBatch(dates, updates, fieldsToUpdate);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה בשמירת הדיווחים" },
      { status: 500 }
    );
  }
}
