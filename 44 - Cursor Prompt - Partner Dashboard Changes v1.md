# Cursor Prompt — Partner Dashboard: Change Request v1

> Nine changes to the partner app (plus one shared-data seeding fix). Minimal diffs; other apps untouched except where the seeding change naturally flows through.

---

## 1–4. Call volume graph fixes

1. **Seeding**: call volume must stay realistic until 20:00 — no cliff after 18:00. Distribute the day's calls across 08:00–20:00 with a natural shape (morning ramp, midday peak, mild evening taper — the 19:00–20:00 bucket still carries meaningful volume). This is a shared-generator change; verify admin charts also look right after it
2. **X-axis**: buckets and labels run **08:00 → 20:00** (display as `8am … 8pm` or `08:00 … 20:00` — match the app's existing time format)
3. **Y-values**: for a single-day view, each point = the **raw number of calls received in that hour** (no averaging, no "(avg/day)" caption). Only when a multi-day range is applied, average per hour across days and caption it plainly: "Avg calls per hour across N days"
4. **Remove the partner series label/legend** ("Paisabazaar") — the whole app is one partner's view; a legend naming it is noise. Single unlabeled line (or a neutral "Calls" series name in the tooltip)

## 5. Customers tab — mirror the admin design

Replicate the admin Customers page structure exactly: two top-level tabs — **Customer Queue** and **Call History**; Customer Queue contains the **Waiting / Live / Scheduled** sub-tabs with the same columns and virtual-clock behavior as admin. Differences (only these): no Partner column anywhere; agent/auditor names masked (`Agent A-14` / `Auditor R-3`); same pagination/search/filters otherwise.

## 6. Call History row click → two-tab drawer

Clicking a call opens a drawer/modal with exactly **two tabs**: **View Details** (the customer-details layout from admin: personal details, As-per-Aadhaar, accordions) and **Activity Log** (scrollable, ascending, masked staff names). Remove the other CTAs for partners — no View Video, no View Report, no action bar (recordings and full KYC reports stay internal to the bank).

## 7. Remove the Analytics page; fold distinct pieces into Dashboard

- Delete the Analytics route + sidebar entry
- Move to the **Dashboard**: the **Avg Wait Time distribution** and **Call Duration distribution** histograms (side by side, below the hourly volume chart)
- Do **not** move: the daily volume trend (dropped entirely), the funnel (redundant with the R&F flow diagram), or any KPI already on the Dashboard
- Move any **distinct** top-line metrics from Analytics that the Dashboard lacks (e.g., **Avg TAT**, banded) into the Dashboard KPI row — audit for duplicates first; each metric appears exactly once on the page

## 8. Rejection & Failure Reasons

Remove the **"Failure Volume Over Time"** chart from the partner app's R&F page (diagram, status/reason tabs, and cases table remain).

## 9. Reports — mirror the admin structure

Rebuild the partner Reports page to the admin pattern exactly: report-type **dropdown** (rich options) → **Generate** opens the **filters modal** (date, statuses where applicable, live row count, columns) → history table with params + Preview/Download → Schedules section. Keep the report types currently offered in the partner app; no partner filter anywhere (implicit scope); staff columns masked in previews/CSVs.

## Acceptance

1. Hourly chart: 08:00–20:00 labels, healthy volume through 8pm, raw counts for Today, no partner legend; admin hourly charts still coherent after the reseed
2. Customers: two tabs + three queue sub-tabs matching admin behavior; no Partner column; masked names throughout (grep a real agent name in rendered output — zero hits)
3. Call History row click → drawer with exactly Details + Activity Log tabs; no video/report access anywhere in the partner app
4. Analytics gone from sidebar/routes; Dashboard shows the two histograms + any distinct KPIs exactly once; daily trend absent
5. R&F has no volume-over-time chart; everything else intact
6. Reports flow is structurally identical to admin (dropdown → modal → history → schedules) with implicit partner scope
7. All apps build clean
