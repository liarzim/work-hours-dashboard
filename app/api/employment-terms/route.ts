import { NextRequest, NextResponse } from "next/server";
import { getEmploymentTerms, saveEmploymentTerm, deleteEmploymentTerm } from "@/lib/data";
import { EmploymentTerm, EmploymentType } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_TYPES: EmploymentType[] = ["monthly_overtime", "global", "hourly", "custom"];

export async function GET() {
  try {
    const terms = await getEmploymentTerms();
    return NextResponse.json({ terms });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה באחזור תנאי העסקה" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      employmentType,
      startDate,
      endDate,
      jobScopePct,
      dailyStandardSunWed,
      dailyStandardThu,
      overtimeEligible,
      notes,
    } = body;

    // Validation
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return NextResponse.json({ error: "תאריך התחלה לא תקין" }, { status: 400 });
    }

    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json({ error: "תאריך סיום לא תקין" }, { status: 400 });
    }

    if (endDate && endDate < startDate) {
      return NextResponse.json({ error: "תאריך הסיום אינו יכול להיות לפני תאריך ההתחלה" }, { status: 400 });
    }

    if (!VALID_TYPES.includes(employmentType)) {
      return NextResponse.json({ error: "סוג העסקה אינו תקין" }, { status: 400 });
    }

    const parsedScope = Number(jobScopePct ?? 100);
    if (isNaN(parsedScope) || parsedScope <= 0 || parsedScope > 200) {
      return NextResponse.json({ error: "היקף משרה אינו תקין (1%-200%)" }, { status: 400 });
    }

    const parsedSunWed = Number(dailyStandardSunWed ?? 9.0);
    const parsedThu = Number(dailyStandardThu ?? 8.5);
    if (isNaN(parsedSunWed) || parsedSunWed < 0 || parsedSunWed > 24 || isNaN(parsedThu) || parsedThu < 0 || parsedThu > 24) {
      return NextResponse.json({ error: "שעות תקן יומיות אינן תקינות (0-24)" }, { status: 400 });
    }

    const termInput: EmploymentTerm = {
      id: id || undefined,
      name: String(name || "תנאי העסקה").trim().slice(0, 100),
      employmentType,
      startDate,
      endDate: endDate || null,
      jobScopePct: Math.round(parsedScope * 100) / 100,
      dailyStandardSunWed: Math.round(parsedSunWed * 100) / 100,
      dailyStandardThu: Math.round(parsedThu * 100) / 100,
      overtimeEligible: Boolean(overtimeEligible),
      notes: notes ? String(notes).slice(0, 500) : "",
    };

    const saved = await saveEmploymentTerm(termInput);
    return NextResponse.json({ ok: true, term: saved });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה בשמירת תנאי העסקה" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "מזהה תנאי העסקה חסר" }, { status: 400 });
    }

    await deleteEmploymentTerm(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה במחיקת תנאי העסקה" },
      { status: 500 }
    );
  }
}
