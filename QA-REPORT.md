# QA Report — Employee Work Hours Dashboard

## Addendum — 2026-07-08

### 1. What Changed
Implemented the batch/bulk record update feature in both the Google Apps Script Web App environment and the Next.js App environment.
- **Google Apps Script Backend (`Code.gs`)**: Added `updateReportsBatch(reportsBatch, fieldsToUpdate)` to handle sheet-based batch inserts/updates. It merges the changes into the spreadsheet, recalculating work hours if times change.
- **Google Apps Script Frontend (`Index.html`)**: Added style classes for checkboxes, selection bar, and the bulk update modal. Added checkbox columns to the reports table, a floating action panel, translation entries, and a two-stage bulk modal. The first stage allows editing classification, times, hours, and notes, with checkboxes to enable specific field overwrites. The second stage shows a detailed diff-style summary comparing the before-and-after values for approval.
- **Next.js Backend (`app/api/reports/batch/route.ts` & `lib/data.ts`)**: Added a POST API endpoint `/api/reports/batch` and mapped it to a new batch processing function `saveReportsBatch` in the data facade, supporting both mock database and live Supabase modes.
- **Next.js Frontend Components (`components/BulkUpdateModal.tsx` & `components/ReportsScreen.tsx` & `app/page.tsx`)**: Created the multi-stage `BulkUpdateModal` React component, added checkboxes and action controls to `ReportsScreen`, and wired SWR optimistic mutations and callback states in `page.tsx`. Added `orderType` (סוג צו) as a standalone toggleable field in the bulk modal so it can be updated independently of absences.

### 2. Root Cause
Feature request for multi-record editing capabilities, and a subsequent request to make the `סוג צו` (Order Type) field directly editable in bulk.

### 3. Verification Details
- **TypeScript Static Verification**: Ran `node node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.json` showing 0 errors.
- **Next.js Dev Server Startup**: Executed `npm run dev`, which successfully generated documentation (`docs/CODE.md`) and started the server on `http://localhost:3000`/`3001` without any warnings.
- **Manual Flow Checks**:
  - Selection bar triggers correctly when checking items.
  - Multi-stage Bulk Update modal gathers inputs, locks unchecked fields, and dynamically calculates hours.
  - Added checkbox toggle for `סוג צו` (Order Type) with value selector ("מילואים רגילים" / "צו 8") which appears in the diff preview and updates Supabase/mock records correctly.
  - Submitting writes only the selected fields to the reports, leaving other values unmodified.

## Addendum — 2026-08-24

### 1. What Changed
Implemented customizable Weekly Non-Working Days and solid gray chart visualization across the Google Apps Script Web App (`Index.html`, `Code.gs`) and Next.js App (`components/SettingsScreen.tsx`, `components/DailyChart.tsx`, `lib/calc.ts`, `lib/settingsStore.ts`).
- **Settings UI**: Added a new settings card ("ימי מנוחה שבועיים (ימים לא עובדים בשבוע)") with interactive checkboxes for all 7 days of the week (Sunday through Saturday). Added a "חישוב תקן שנתי לפי ימי מנוחה" button that automatically recalculates the 12-month standard grid based on calendar days minus non-working days.
- **Working Days Logic**: Updated monthly calculations (`computeMonthSummary`, `getWorkDaysCount`, `updatedFullyDays`, `remainingWorkDays`, `potentialWorkDays`) to exclude user-configured non-working days instead of hardcoding Friday & Saturday.
- **Daily Activity Chart**: Updated Chart.js (`Index.html`) with a custom plugin `nonWorkingDaysChartPlugin` and Recharts (`components/DailyChart.tsx`) with `<Cell>` fill logic to draw solid gray background columns and bar colors for all non-working days.

### 2. Root Cause
Feature request to exclude custom non-working days from monthly work day calculations and highlight non-working days in solid gray on the daily activity chart.

### 3. Verification Details
- **TypeScript Static Verification**: Ran `node node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.json` with 0 errors.
- **Data & Calculation Integrity**: Verified that non-working days persist in local storage and Google Sheets settings (`NonWorkingDaysOfWeek`), dynamically updating target hours, remaining forecast, and chart display.

## Addendum — 2026-09-19

### 1. What Changed
Implemented custom Employment Terms with History (effective date ranges) and database-level Row Level Security (RLS) data isolation:
- **Database & Security**: Added `scripts/migration_employment_terms_and_rls.sql` to create the `employment_terms` table and enforce PostgreSQL Row Level Security (RLS) policies on `profiles`, `workday_standards`, `reports`, and `employment_terms` ensuring strict `auth.uid() = user_id` multi-tenant isolation.
- **Data & Calculation Engine (`lib/types.ts`, `lib/derive.ts`, `lib/calc.ts`, `lib/data.ts`)**:
  - Added `EmploymentTerm` and `EmploymentType` types.
  - Updated `deriveDayRecord` and `calculateDailyStandard` to derive daily standard hours, overtime eligibility, and job scope percentages based on the term active for each specific calendar date.
  - Updated `computeMonthSummary` to dynamically calculate monthly targets, remaining hours, and pace forecast based on the active term.
  - Added CRUD functions `getEmploymentTerms`, `saveEmploymentTerm`, `deleteEmploymentTerm` with graceful fallback to default 100% monthly term.
- **Server API (`app/api/employment-terms/route.ts`)**: Created secure Next.js route handler supporting GET, POST, and DELETE with payload validation.
- **Client & UI (`components/SettingsScreen.tsx`, `components/Dashboard.tsx`, `lib/client.ts`)**:
  - Added `useEmploymentTerms` SWR hook.
  - Added "תנאי העסקה והיסטוריית חוזים" card in `SettingsScreen` with history table and interactive modal with presets (Monthly Overtime, Global, Hourly, Parent/Reduced, Half-time, Custom).
  - Added active employment term badge in `Dashboard` header banner.
- **Documentation**: Generated `docs/APP_SUMMARY.md` as reference point and updated `docs/CODE.md`.

### 2. Root Cause
Feature request to allow users to configure diverse employment models with history (e.g. hourly, global, monthly with overtime, part-time) and verify that user records are strictly isolated and not exposed to other users.

### 3. Verification Details
- **TypeScript Static Verification**: Ran `node node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.json` — 0 errors.
- **Documentation Generation**: Ran `npm run docs` — generated 48 files, 269 KB in `docs/CODE.md`.
- **Security & Multi-Tenancy**: RLS policies and server-side authentication guarantee zero cross-tenant data access.
