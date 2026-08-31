# Cursor Prompt — Admin: Reports Page Expansion (Full Report Catalog + Email Scheduling)

> Expands Reports from 3 types to a catalog of 7, adds in-app preview + CSV download for each, and an email-schedule simulation — modeled on the reference system's MIS excel and the emailed "VKYC Dashboards" digest. All report data computes from the shared data layer (no static fixtures). Read the existing Reports implementation first; keep the request-history pattern.

---

## Page structure

- **Report catalog**: card grid, one card per report type (icon, name, one-line description, `Generate` + `Schedule` buttons)
- **Generate** → modal: date range + (where marked) partner selector + column picker → creates a history entry → **Preview** opens an in-app HTML table view (styled, scrollable) with a **Download CSV** button
- **History table** (existing pattern): Request ID, params, requested at, status, actions (Preview / Download)
- **Schedules section** (new, bottom): list of configured schedules — report type, cadence, recipients, last sent, toggle — plus "Send now" which simulates dispatch (toast: "VKYC Daily Dashboard sent to 4 recipients") and stamps last-sent

## Report catalog (7)

**1. Standard MIS Report** (exists — expand columns to the reference billing file):
Customer Onboarding Type · Transaction ID · Session ID · Session Number · Latest Session (Y/N) · Call Status · Call Type · Session Start/End Time · Agent ID/Name · Agent Status · Agent Remarks · Agent Verification Date · Agent Rejection Reason · Verification Failure Reason · Auditor Status · Customer Blocked · PAN DOB Match Status · Aadhaar Name Match Score · Aadhaar Address Match Score (Current) · Aadhaar Address Match Score (Permanent) · Aadhaar DOB Match Status · Customer Email/Aadhaar (masked)/PAN in Application Form · Live↔Current Distance (km) · Live↔Permanent Distance (km) · Annual Income · Occupation · Customer Device Country · State · Pincode · City · CKYC Status (values like "To be downloaded from CKYC after Confirm Match", "Awaiting images"). Multi-session customers appear once per session with incrementing Session Number, only the last flagged Latest Session=YES

**2. Active Users Report** (exists — keep)

**3. User Productivity Report** (exists — keep; ensure columns match current attendance/metric fields)

**4. VKYC Daily Dashboard** (NEW — replica of the emailed digest):
- **Agent Allocation** table: Approved Headcount · Headcount with Shrinkage · Partner Name · Actual Present (1st Shift / 2nd Shift / 3rd Shift / Total), one row per partner + Total row (derive shift presence from work plans; shrinkage ≈ 80% of approved)
- **Wait time summary of the calls**: one table for Overall FTD + one per partner. Rows: Connected · Unique Abandoned · Calls connected in 0–1 min / 1–3 / 3–5 / 5–7 / 7–10 / >10 min · Max Wait Time · Avg Wait Time · AHT · Approval %. Columns: Total + hourly buckets 08:00–09:00 … 20:00–21:00. (Wait buckets must be consistent with the 2-min reroute model — nearly everything lands in 0–1 and 1–3.)

**5. Partner Day-wise Calls Report** (NEW — "«Partner» day wise calls"): partner selector; one row per day in range: Leads · Connected · User Dropped · Agent Approved / Unable / Rejected · Auditor Approved / Recapture / Rejected / In Review · Approval % · Avg Wait · AHT · CSAT

**6. V-KYC Partner Summary** (NEW — "V-KYC Summary – ZET"): partner selector; single-period rollup: funnel stage counts + % of leads (the 3-level model), top 5 failure reasons with counts, TAT avg, agents allocated (dedicated/shared), CSAT

**7. Customer Issues Report** (NEW — "Customer related issues"): all issue-modal submissions + failure cases in range: Timestamp · App ID · Customer · Partner · Agent · Issue Category · Sub-reason · Remarks · Final Outcome. Filterable by category

## Email scheduling (simulation)

- `Schedule` on any card → modal: cadence (Daily at HH:MM / Weekly on day) · recipients (chip input, seeded with realistic ops names/emails) · partner scope where applicable → saves to the Schedules section
- Seed two existing schedules: "VKYC Daily Dashboard — daily 18:00 — 4 recipients", "Standard MIS Report — daily 09:00 — 2 recipients"
- Purely in-session simulation; "Send now" just toasts + stamps

## Acceptance

1. Seven catalog cards; each generates, previews as a styled HTML table, and downloads a valid CSV whose numbers reconcile with the dashboards (spot: Daily Dashboard's Connected total = Home's Total Calls for the same day; day-wise report's approvals = Call Breakdown)
2. Standard MIS preview shows the full reference column set with coherent per-session rows
3. Daily Dashboard preview renders Agent Allocation + Overall FTD + per-partner wait tables with hourly buckets
4. Schedules render, toggle, and "Send now" simulates; two seeded schedules present
5. `npm run build` clean; nothing else touched
