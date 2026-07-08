import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/data";
import { StandardSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה בקריאת ההגדרות" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: StandardSettings;
  try {
    body = (await req.json()) as StandardSettings;
  } catch {
    return NextResponse.json({ error: "גוף בקשה לא תקין" }, { status: 400 });
  }
  if (
    typeof body.annualVacationQuota !== "number" ||
    !Number.isFinite(body.annualVacationQuota) ||
    body.annualVacationQuota < 0 ||
    body.annualVacationQuota > 366 ||
    typeof body.years !== "object" ||
    body.years === null
  ) {
    return NextResponse.json({ error: "הגדרות לא תקינות" }, { status: 400 });
  }
  for (const [year, months] of Object.entries(body.years)) {
    if (
      !/^\d{4}$/.test(year) ||
      !Array.isArray(months) ||
      months.length !== 12 ||
      months.some((m) => typeof m !== "number" || !Number.isFinite(m) || m < 0 || m > 31)
    ) {
      return NextResponse.json(
        { error: `נתוני תקן לא תקינים לשנת ${year}` },
        { status: 400 }
      );
    }
  }
  try {
    await saveSettings(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה בשמירת ההגדרות" },
      { status: 500 }
    );
  }
}