import { NextRequest, NextResponse } from "next/server";
import { getMonthData, saveReport } from "@/lib/data";
import { CLASSIFICATIONS, ReportInput } from "@/lib/types";

/** Values that may legally be written to the classification column. */
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

/** GET /api/reports?year=2026&month=7 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = parseInt(searchParams.get("year") ?? "", 10) || now.getFullYear();
  const month = parseInt(searchParams.get("month") ?? "", 10) || now.getMonth() + 1;
  const force = searchParams.get("force") === "1";
  try {
    const data = await getMonthData(year, month, force);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה בקריאת הנתונים" },
      { status: 500 }
    );
  }
}

/** POST /api/reports — upsert a single day report (raw fields only). */
export async function POST(req: NextRequest) {
  let body: ReportInput;
  try {
    body = (await req.json()) as ReportInput;
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין" }, { status: 400 });
  }

  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json({ error: "תאריך חסר או לא תקין" }, { status: 400 });
  }
  const hhmm = /^([01]?\d|2[0-3]):[0-5]\d$/;
  if (body.entry && !hhmm.test(body.entry)) {
    return NextResponse.json({ error: "שעת כניסה לא תקינה (HH:mm)" }, { status: 400 });
  }
  if (body.exit && !hhmm.test(body.exit)) {
    return NextResponse.json({ error: "שעת יציאה לא תקינה (HH:mm)" }, { status: 400 });
  }
  if ((body.entry && !body.exit) || (!body.entry && body.exit)) {
    return NextResponse.json({ error: "יש למלא גם כניסה וגם יציאה" }, { status: 400 });
  }
  if (body.entry && body.exit && toMinutes(body.exit) <= toMinutes(body.entry)) {
    return NextResponse.json(
      { error: "שעת היציאה חייבת להיות אחרי שעת הכניסה" },
      { status: 400 }
    );
  }
  if (body.classification && !ALLOWED_CLASSIFICATIONS.has(body.classification)) {
    return NextResponse.json({ error: `סיווג לא מוכר: "${body.classification}"` }, { status: 400 });
  }
  if (
    !isValidAbsence(body.vacationDays) ||
    !isValidAbsence(body.sickDays) ||
    !isValidAbsence(body.reserveDays)
  ) {
    return NextResponse.json(
      { error: "ערך היעדרות חייב להיות בין 0 ל-1" },
      { status: 400 }
    );
  }
  if (typeof body.notes === "string" && body.notes.length > 500) {
    return NextResponse.json({ error: "הערה ארוכה מדי (עד 500 תווים)" }, { status: 400 });
  }
  if (typeof body.uniqueNotes === "string" && body.uniqueNotes.length > 500) {
    return NextResponse.json({ error: "הערה ייחודית ארוכה מדי (עד 500 תווים)" }, { status: 400 });
  }

  try {
    const record = await saveReport(body);
    return NextResponse.json({ record });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה בשמירת הדיווח" },
      { status: 500 }
    );
  }
}