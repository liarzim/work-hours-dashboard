# MEGA PROMPT — 24H Work Dashboard

> Use this prompt to rebuild the application from scratch, port it to another stack, or brief any AI/developer on the complete requirements. It encodes every requirement plus every lesson learned from the real production data. Last synced with code: v1.7, 2026-07-06.

---

You are an expert full-stack developer. Build a production-ready, Hebrew RTL **Time Reporting & Attendance Dashboard** ("ניהול דיווח שעות — 24H WORK DASHBOARD") with bi-directional Google Sheets sync.

## Stack
Next.js 14 App Router · TypeScript strict · Tailwind CSS · SWR (optimistic updates + rollback) · Recharts · googleapis (Service Account JWT, scopes `spreadsheets` + `drive`). All Google access server-side only (`server-only` package). No client-side AI. Strict separation: pure UI components / SWR client hooks / API routes with full validation / data-access facade that switches between live Sheets and an in-memory mock.

## Screens

**A. לוח בקרה** — 4 KPI cards: שעות שדווחו `X מתוך יעד Y` · שעות שנותרו + `כ-Z ליום` · יתרת חופשה לניצול (red) + `נוצלו החודש` · מילואים/מחלה. Sidebar card סיכום סטטוס חודשי: יעד/דווח/יתרה rows + blue box תחזית המשך עבודה (`שעות/יום` + `נותרו N ימי עבודה פוטנציאליים`). Daily bar chart (days 1–31, day 1 on the RIGHT — feed data descending inside a `dir=ltr` container, gray background bars, brand-blue bars). Stacked reserve-duty chart per year: צו 8 (red `#dc2626`) vs regular (blue), click a year bar → drill to Jan–Dec months + back button. Status banner (mock=amber with connect button / live=green with record count, date range, sheet link). Dismissible bottom toast: `תזכורת: חסרות לך X שעות להשלמת התקן (Y שעות)`.

**B. Header** — title+logo, tabs (לוח בקרה/דיווחים/הגדרות תקן), month selector: label click → year grid (2019..next year) → month grid → apply; chevrons for month±1; sync button (spinning icon) that bypasses the server cache; "דיווח חדש" button.

**C. Report modal** — date (locked when editing) · classification dropdown (עבודה/חופש/מחלה/מילואים/חג/ערב חג/סופ"ש) · light-blue block "שעות עבודה (פורמט 24H)" with כניסה/יציאה time inputs (normalize sheet values like "7:05" to "07:05") · three absence inputs חופש/מחלה/מילואים (0–1 step 0.5) · שמירה (save icon) / ביטול. Optimistic SWR mutate with rollbackOnError, then revalidate. Escape/backdrop close, role=dialog.

**D. דיווחים** — filters (year, month, classification from data, free-text search) + table: date+day name, כניסה—יציאה (LTR), total decimal, colored classification chip, absences, notes, edit button → modal. Support batch updates: checkbox column, floating selection bar, and multi-stage Bulk Update modal. Field-level overwrite option (only checked fields are modified). Change diff summary comparison (before vs after) shown for approval before final submission.

**E. הגדרות תקן** — annual vacation quota + computed monthly accrual (quota/12) · year selector + add-year (default days for all 12 months) · 3-col grid of 12 month inputs · "שמור הגדרות תקן לגיליון".

**F. First-run wizard** — shown when unconfigured (skippable → mock mode; reopenable from banner). Step 1: upload Service Account JSON (parse client_email/private_key, validate live against Google, store in local `data/config.json` mode 600, NEVER return the key to the client). Step 2 choice: **new user** → create spreadsheet via Drive API (optional parent folder from pasted URL), seed header + a row per date of the current year + settings tab, share to user's email as writer; **existing user** → paste sheet URL/ID, validate A1 contains "תאריך", connect and load all history. Map permission errors to: `שתף את הגיליון עם <SA email>`.

**G. Packaging** — `start.bat`/`start.sh`: check Node → one-time npm install → one-time build → open browser → `next start`. Full demo (mock) mode with seeded data when unconfigured.

## Sheet schema (journal, columns A:AE)
תאריך (DD/MM/YYYY) · כניסה · יציאה · סה"כ שעות · תקן יומי · שעות נוספות · ש"נ 120% · ש"נ 150% · ש"נ 200% · ימי חופש · ימי מילואים · ימי מחלה · סיווג · הערות · הערות ייחודיות · סוג צו · חודש · שנה · שבוע · יום · תקן יומי עשרוני · תרגום שעות לעשרוני · שעות נוספות עשרוני · שעות · דקות · מכסת חופשה יומית · מכסת חופשה מצטברת · יתרת חופשה · חופשה בסוף החודש · שעות חודשיות מקסימליות · תקן שעות חודשי.

## Formulas
- Monthly target = standard work days × 9 (July: 22×9=198.0).
- Reported = Σ total decimal hours; Remaining = max(target−reported, 0).
- Potential workdays = days where: date ≥ today AND daily standard > 0 AND no hours reported AND no absence logged. Forecast = remaining ÷ potential days.
- Vacation balance = last non-zero balance cell in month; fallback (formula-less sheets) = annual quota − YTD vacation used. Monthly accrual = quota/12.
- Overtime split (app-created sheets): OT = total − standard; first 2h → 120%, remainder → 150%.
- Reserve chart: day is "צו 8" when סוג צו matches `/צו\s*8/`, else regular.

## Hard-won real-data lessons (MUST implement)
1. **Copied sheets lose formulas** — `#REF!`/`#VALUE!`/`#N/A` render as text. Treat any `#`-prefixed cell as empty; derive total from exit−entry when calculated columns are 0 but raw times exist; derive daily standard from calendar (Sun–Wed 9h, Thu 8.5h, Fri/Sat 0) unless classification is non-working; derive day name from the date; accept `H:mm:ss` and `d.m.yyyy`/`d/m/yy`/`d-m-yyyy` formats.
2. **The journal's bottom section contains "הגדרת תקן" rows** — date = 1st of month, col E = standard days, col AE = monthly hours. They REUSE real dates (e.g. 01/07/2026 appears twice!). Exclude them from day records or day 1 breaks; harvest them as the source of monthly standards.
3. **Legacy workbooks have native settings tabs**: `WorkdayStandards` (Year|Jan..Dec matrix) and `Settings` (key/value with `AnnualVacationAllowance`). Read/write these when present; the app's own `הגדרות תקן` tab only otherwise. Priority: WorkdayStandards → app tab → הגדרת תקן rows.
4. **Journal tab detection needs TWO headers**: A1 contains "תאריך" AND B1 contains "כניסה" (tabs like "חוב שעות" and pivot copies share A1). Scan ALL matching tabs and merge by date; a row with reported content beats an empty duplicate. Remember each record's tab for writebacks.
5. **Sheets API rejects empty inner arrays** in values.update payloads — use `["",""]` spacers, never `[]`.
6. **Writes**: legacy sheets → raw cells only (B:C entry/exit, J:N absences/classification/notes), formulas do the rest; app-created sheets (flag `computeDerived`) → server also writes D:I and V:Y, and auto-appends a new year's rows on first report of that year.
7. Cache the journal server-side ~15s; invalidate on write; support `?force=1` for the sync button.
8. Time inputs: compare times numerically (minutes), never as strings ("9:00" vs "16:00" breaks lexical comparison).

## Server validation
Date `yyyy-mm-dd`; HH:mm regex; entry+exit both-or-neither; exit > entry (minutes); classification allowlist (+סופשבוע, חול המועד); absences 0–1; notes ≤ 500 chars; settings: 4-digit years, 12 months, 0–31 days, quota 0–366. Hebrew error messages. Never leak stack traces or the private key.

## API surface
`GET /api/reports?year&month[&force=1]` → { records, summary, mode, info{tabs,totalRecords,firstDate,lastDate} } · `POST /api/reports` (upsert one day) · `POST /api/reports/batch` (batch updates with fieldsToUpdate list) · `GET|POST /api/settings` · `GET /api/setup` (status, no secrets) / `POST /api/setup` (wizard) · `GET /api/reserve` → { years:[{key,tzav8,regular}], months:{year:[...]} }.

## Design language
Background `slate-50`, white cards `rounded-2xl` subtle shadow, brand blue `#2563eb`, red vacation KPI, indigo/emerald/amber icon chips, Hebrew tooltips (`direction:rtl`), skeleton loaders, empty states, `dir="rtl"` on `<html>` with `dir="ltr"` chart islands and LTR-centered time/date fields.

## Verification
Unit-test the pure logic (date parsing, row parsing incl. broken-formula rows and הגדרת תקן rows, KPI math, overtime split, reserve aggregation) — reference values: July 2026 target 198.0 / reported 37.2 with day 1 = 9h (07:30–16:30); reserve totals 2023:61, 2024:243, 2025:30, 2026:60 (all צו 8). Keep `tsc --noEmit` clean.
