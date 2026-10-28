import { NextRequest, NextResponse } from "next/server";
import { getOvertimeSummary } from "@/lib/data";

export const dynamic = "force-dynamic";

/** GET /api/overtime — overtime hours per year/month/days, split 125% vs 150%. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "1";
  try {
    const summary = await getOvertimeSummary(force);
    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה בקריאת נתוני שעות נוספות" },
      { status: 500 }
    );
  }
}
