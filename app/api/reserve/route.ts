import { NextRequest, NextResponse } from "next/server";
import { getReserveSummary } from "@/lib/data";

export const dynamic = "force-dynamic";

/** GET /api/reserve — reserve-duty days per year/month, split צו 8 vs regular. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "1";
  try {
    const summary = await getReserveSummary(force);
    return NextResponse.json(summary);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה בקריאת נתוני מילואים" },
      { status: 500 }
    );
  }
}