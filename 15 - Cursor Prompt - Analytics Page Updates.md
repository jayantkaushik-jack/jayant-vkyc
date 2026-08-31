# Cursor Prompt — Analytics Page: Call Time, Attendance Filters, Call Log

> Three changes on the agent Analytics page (`PerformancePage.tsx`) + data layer. Minimal diffs; keep everything else intact.

---

## 1. Reduce average call time to ~3 minutes

In the call generator (`src/data/generate.ts`), change call durations so the mean lands around **180s** (generate ~120–260s, normal-ish spread; a few outliers up to 400s are fine). 

**Required side-effect:** the composite-efficiency call-time band still assumes 5–8 min and would unfairly tank every agent's score. Update `EFFICIENCY_CONFIG` to match the new reality: `callTimeBandSec: { min: 150, max: 270 }` (2.5–4.5 min), `callTimeZeroSec: { below: 60, above: 600 }`. Verify the Efficiency hero score returns to a sensible range (mostly 75–95) after the change.

## 2. Attendance section filters

Give the Attendance table its own local filter row (independent of the page-level date presets):

- **Date range**: `From` / `To` date inputs + quick chips (`7D`, `14D`, `30D`, `This month`), default 14D
- **Adherence**: dropdown `All / Below 90% / 90%+` (quick way to spot problem days)
- Filters combine; table recomputes from attendance data; row count caption ("Showing N days")

## 3. "Auditor Outcomes" → "Call Log" with video + report links and filters

- Rename the section heading to **"Call Log"**
- **Row link**: add a `View` action per row (icon + label) opening a modal with two tabs:
  - **Recording**: fake video player (reuse the admin-style player: poster frame with the customer avatar, play bar, duration = that call's duration; no real playback needed)
  - **Call Report**: the shared `KycReport` component rendered for that call, followed by an **Auditor Review** block — auditor name + avatar, decision pill (`accepted` green / `rejected` red / `recapture` amber), decision timestamp, **auditor remarks/comments** verbatim
- **Filters row** above the table:
  - Status: chips `All / Accepted / Auditor Rejected / Recapture`
  - Date: `From` / `To` inputs (defaults to the page-level range)
  - Keep the existing "Overturned only" toggle, it composes with the status filter
- Table columns stay as they are; ensure every row's call record carries the fields the modal needs (auditor remarks already exist in the data layer — wire them through)

## Acceptance

1. Detailed Metrics "Avg Call Time" reads ~3m; Efficiency hero stays in a sensible band (spot-check breakdown popover — call-time component no longer floors at 0)
2. Attendance filters work independently of page filters; adherence filter isolates <90% days
3. "Call Log" renders with working View modal (both tabs, auditor comments visible); status + date filters and the overturned toggle combine correctly
4. `npm run build` clean; no regressions elsewhere on the page
