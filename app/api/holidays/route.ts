import { NextRequest, NextResponse } from "next/server";
import { HolidaySetting } from "@/lib/settingsStore";

export const dynamic = "force-dynamic";

// In-memory cache for fetched years to prevent redundant external calls
const holidayCache = new Map<string, HolidaySetting[]>();

function cleanHolidayName(rawName: string): string {
  let name = rawName.trim();
  // Remove Hebrew year number e.g. " 5787" or " 5786"
  name = name.replace(/\s+5\d{3}$/, "");
  // Replace special Unicode Hebrew marks with standard quotes
  name = name.replace(/״/g, '"').replace(/׳/g, "'");
  return name;
}

function determineCategory(name: string, titleOrig: string, yomtov: boolean, subcat?: string): string {
  if (name.startsWith("ערב ") || titleOrig.toLowerCase().startsWith("erev ")) {
    return "ערב חג";
  }
  if (name.includes("חוה\"מ") || name.includes("חול המועד")) {
    return "חול המועד";
  }
  if (yomtov || name.includes("יום העצמאות") || name.includes("פורים") || name.includes("שמחת תורה")) {
    return "חג";
  }
  // Default to חג for other holidays (e.g. minor holidays / fasts)
  return "חג";
}

/**
 * Fetch holidays from Hebcal for a given Gregorian year (in Israel schedule)
 */
async function fetchHebcalYear(year: number, mode: "all" | "work" = "work"): Promise<HolidaySetting[]> {
  const cacheKey = `${year}_${mode}`;
  if (holidayCache.has(cacheKey)) {
    return holidayCache.get(cacheKey)!;
  }

  // Hebcal API with Israel schedule (i=on) and Hebrew titles (lg=he)
  const url = `https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&min=on&mod=on&nx=on&year=${year}&i=on&lg=he`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) {
    throw new Error(`שגיאה בפנייה ל-Hebcal: ${res.statusText}`);
  }

  const data = await res.json();
  const items: any[] = data.items || [];
  const results: HolidaySetting[] = [];
  const seenDates = new Set<string>();

  for (const item of items) {
    // We only care about holiday events (skip rosh chodesh, candle lighting, etc.)
    if (item.category !== "holiday") continue;

    const rawHebrew = item.hebrew || item.title || "";
    const name = cleanHolidayName(rawHebrew);
    const titleOrig = item.title_orig || item.title || "";
    const isYomtov = Boolean(item.yomtov);
    const category = determineCategory(name, titleOrig, isYomtov, item.subcat);

    // If mode is 'work', filter out daily candle counts like "חנוכה: ב' נרות"
    if (mode === "work") {
      if (name.includes("נרות") || name.includes("נר") || name.includes("חג הבנות")) {
        continue;
      }
      // Skip fast days that aren't national holidays if work mode
      if (item.subcat === "fast" && !name.includes("כיפור")) {
        continue;
      }
    }

    // In Hebcal, some multi-day events or items share dates. Keep the most significant one per date.
    const dateKey = `${item.date}_${category}`;
    if (!seenDates.has(dateKey)) {
      seenDates.add(dateKey);
      results.push({
        date: item.date,
        name,
        category,
      });
    }
  }

  // Sort chronologically
  results.sort((a, b) => a.date.localeCompare(b.date));

  holidayCache.set(cacheKey, results);
  return results;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get("year");
    const startYearParam = searchParams.get("startYear");
    const endYearParam = searchParams.get("endYear");
    const mode = (searchParams.get("mode") === "all" ? "all" : "work") as "all" | "work";

    if (startYearParam && endYearParam) {
      const start = parseInt(startYearParam, 10);
      const end = parseInt(endYearParam, 10);
      if (isNaN(start) || isNaN(end) || start < 2000 || end > 2100 || start > end) {
        return NextResponse.json({ error: "טווח שנים לא תקין" }, { status: 400 });
      }

      let combined: HolidaySetting[] = [];
      for (let y = start; y <= end; y++) {
        const list = await fetchHebcalYear(y, mode);
        combined = combined.concat(list);
      }

      return NextResponse.json({
        ok: true,
        count: combined.length,
        holidays: combined,
      });
    }

    const currentYear = new Date().getFullYear();
    const year = yearParam ? parseInt(yearParam, 10) : currentYear;

    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "שנה לא תקינה" }, { status: 400 });
    }

    const holidays = await fetchHebcalYear(year, mode);

    return NextResponse.json({
      ok: true,
      year,
      count: holidays.length,
      holidays,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה באחזור חגים מ-Hebcal" },
      { status: 500 }
    );
  }
}
