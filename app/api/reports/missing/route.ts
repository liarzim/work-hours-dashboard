import { NextRequest, NextResponse } from "next/server";
import { getMissingReportsList } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const holidaysParam = searchParams.get("holidays");
    const customHolidayDates = holidaysParam ? holidaysParam.split(",").filter(Boolean) : undefined;

    const data = await getMissingReportsList({ from, to, customHolidayDates });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה בטעינת דיווחים חסרים" },
      { status: 500 }
    );
  }
}
