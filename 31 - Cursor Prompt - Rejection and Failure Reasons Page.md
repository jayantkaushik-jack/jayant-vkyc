# Cursor Prompt — Admin: Replace "Quality & Compliance" with "Rejection & Failure Reasons"

> Repurposes the Quality & Compliance page into a focused failure-analysis page. The old content (audit score KPIs, compliance-flag donut, audit checklist bars) is removed. Reuse the shared filter bar, `PartnerMultiSelect`, rejection taxonomy, and Call History row actions. Agent app untouched.

---

## Rename & route

Sidebar entry and page title: **"Rejection & Failure Reasons"**. Route can stay (`/quality`) with the sidebar label changed, or move to `/rejections` with a redirect — either, consistently.

## Scope of the page

Every **non-approved** case in the selected range. Approved cases never appear here. The population, by status:

- **Rejected** (agent decision)
- **Unable to Verify** (agent decision)
- **User Dropped** (call never reached a decision)
- **Auditor Rejected / Recapture** (agent approved, auditor overturned — these are failures of the process too; shown as their own statuses)

## Layout

**1. KPI row** (respects global partner + date filters, same pattern as other pages):
`Total Non-Approved` · `Rejected` · `Unable to Verify` · `User Dropped` · `Auditor Overturned` — each with count + % of all calls in range

**2. Breakdown graphs** (side by side):
- **Status breakdown** donut: the five statuses above, color-coded (rejected red, unable amber, dropped gray, auditor-overturn deep red)
- **Reason breakdown** horizontal bar chart: counts by **reason category** (the 6-category taxonomy: Agent Induced, Technical, Photo Related, Customer Related, Document Related, Suspicious Customer) for the reasoned statuses; clicking a category bar expands **sub-reason** bars beneath it (e.g., Technical → Poor internet connection, Audio not clear…). User Dropped cases appear under a synthetic "Connection/Drop" category
- **Trend line**: non-approved cases per day over the range, one line per status (toggleable in legend)

**3. Cases table** — all non-approved cases, newest first:
Columns: Timestamp · App ID · Customer · Partner · Agent · **Status** (pill: Rejected / Unable to Verify / User Dropped / Auditor Rejected / Recapture) · **Reason Category** · **Reason** (sub-reason; tooltip shows remarks verbatim) · Auditor (blank where n/a)
- Filter bar (reuse the Call History pattern): Status, Reason Category, Partner, Agent, Product, Date — all composing, count caption, clear-all, pagination
- Row actions: View Details · Activity Log · View Report (disabled for User Dropped with the existing tooltip) — reuse the exact Call History components
- **No approved case can ever appear** — assert in the selector, not the UI (`getNonApprovedCases()` in adminSelectors filters at the data level)

## Consistency

- Counts must reconcile with Call Breakdown on Home (`Rejected`, `% Dropped`, etc. for the same day/partner) and with agent-side Call Log records
- Reason values render verbatim from the shared taxonomy — no free-text labels invented for the charts

## Acceptance

1. Sidebar shows "Rejection & Failure Reasons"; old audit-score/checklist/flag content gone
2. KPI row + three graphs + table all respect partner/date filters and agree with each other (donut total = table total = KPI Total Non-Approved)
3. Category bars expand to sub-reasons; every reason string comes from the taxonomy; remarks visible via tooltip
4. Table contains zero approved cases under any filter combination; User Dropped rows behave per the Call History rules
5. Spot-check reconciliation: Rejected count for Niyo today equals Call Breakdown's Niyo Rejected column
6. `npm run build` clean; other pages untouched
