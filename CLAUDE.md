# Project Routine — 24H Work Dashboard

Instructions for any AI assistant (or developer) working on this project. **Follow this routine after EVERY code change — it is not optional.**

## Documentation routine (mandatory)

1. **docs/CODE.md** — auto-generated. Never edit by hand. It regenerates on every `npm run dev` / `npm run build`; after changes made outside a build, run `npm run docs`.
2. **docs/APP-SPEC.md** — update the relevant section (features / formulas / sheet mapping / UI-UX / architecture) and bump the version + date in the header whenever behavior, formulas, screens, or APIs change.
3. **docs/MEGA-PROMPT.md** — update whenever a requirement, formula, or data-format lesson changes, so the prompt can always rebuild the current app faithfully. Bump its version line.
4. **QA-REPORT.md** — append an addendum describing what changed, the root cause (for fixes), and what was verified.
5. **docs/USER-GUIDE.md** — update whenever a user-facing flow changes (screens, buttons, setup, troubleshooting).

## Verification routine (mandatory)

- Keep `tsc --noEmit` clean (`node node_modules/typescript/lib/tsc.js --noEmit -p tsconfig.json`).
- Pure logic (lib/date.ts, lib/parse.ts, lib/calc.ts, lib/seed.ts) must stay testable without Next.js — test via `node --experimental-strip-types` (use `import type` for type-only imports).
- Reference values for regression checks (from the real spreadsheet): July 2026 → target 198.0, day 1 = 9h (07:30–16:30); reserve days 2023:61, 2024:243, 2025:30, 2026:60 (all צו 8).

## Project invariants (do not break)

- All Google Sheets/Drive access stays server-side (`server-only`); the private key must never reach the client or appear in `GET /api/setup`.
- Writes to legacy (user-owned) sheets touch ONLY raw cells B:C and J:N; calculated columns belong to the sheet's formulas. App-created sheets (`computeDerived: true`) also get D:I, V:Y.
- "הגדרת תקן" journal rows are settings storage, not day records — they reuse first-of-month dates.
- Settings priority: `WorkdayStandards` tab → app tab `הגדרות תקן` → "הגדרת תקן" journal rows; quota: `Settings!AnnualVacationAllowance` → app tab.
- Journal tab detection requires BOTH A1~"תאריך" and B1~"כניסה".
- `#...!` formula-error cells parse as empty; totals/standards/day-names fall back to derivation from raw times and the calendar.
- Sheets API payloads must not contain empty inner arrays (`[]`).
- UI is Hebrew RTL; charts render in `dir=ltr` islands with day 1 / newest year on the right.