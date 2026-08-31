# Cursor Prompt — Admin: 3-Level Status Model, Call History Restructure, and NEW "Rejection & Failure Reasons" Page

> STANDALONE prompt (supersedes the unimplemented Prompt 31 — do not look for an existing R&F page). Three parts: (A) make the status model canonical in the shared data layer, (B) restructure Call History to it, (C) replace the "Quality & Compliance" page with a new "Rejection & Failure Reasons" page built around a flow diagram. Read touched files fully first; reuse shared components (filter bar, `PartnerMultiSelect`, rejection taxonomy, Call History row actions/modals). Agent app behavior unchanged.

---

## A. Canonical status model (shared data layer)

Three levels, strictly conditional:

1. **Call Status**: `Connected` | `User Dropped`
2. **Agent Status** (exists only when Call Status = Connected): `Approved` | `Unable to Verify` | `Rejected`
3. **Auditor Decision** (exists only when Agent Status = Approved): `Approved` | `Recapture` | `Rejected` | `In Review` (pending)

Enforce in types (`callStatus`, `agentStatus?`, `auditorDecision?`) and in the generator: no auditor decision on non-approved calls, no agent status on dropped calls — add a dev-time assertion in the data layer that throws on violation. Rename legacy labels (auditor `accepted` → display `Approved`; call `failed` → `User Dropped`). Target distribution of leads ≈ **Dropped 10% / Connected 90%; Agent Approved 80% / Unable 8% / Rejected 2%; Auditor Approved 72% / Recapture 7% / Rejected 1%** (recent cases additionally `In Review`). Rejected/Unable/Recapture cases carry reasons from the shared 6-category taxonomy; User Dropped carries a synthetic "Connection/Drop" category.

## B. Call History restructure

- Columns show the three levels explicitly: **Call Status** (Connected green / User Dropped gray) · **Agent Status** (Approved / Unable to Verify / Rejected; `—` when dropped) · **Auditor Decision** (Approved / Recapture / Rejected / In Review; `—` when not agent-approved)
- Filters use these three levels with exactly these value sets (replacing any earlier status/decision filters); impossible combinations auto-disable (e.g., Call Status = User Dropped grays out the other two)
- User Dropped rows: duration 0:00, no report (View Report disabled + tooltip), truncated activity log — as already implemented
- Everything else (CTAs, pagination, search, other filters) unchanged

## C. NEW page: "Rejection & Failure Reasons" (replaces Quality & Compliance)

- Sidebar entry and title: **"Rejection & Failure Reasons"** (route `/quality` renamed or redirected consistently). Delete the old content: audit-score KPIs, compliance-flag donut, audit checklist bars
- **Population**: every lead EXCEPT (a) the fully-approved path (Connected → Agent Approved → Auditor Approved) and (b) `In Review` cases (pending audits are not failures; they stay visible in Call History only). In scope — the "28%": `User Dropped` · `Agent Unable to Verify` · `Agent Rejected` · `Auditor Recapture` · `Auditor Rejected`. Enforce at the selector level (`getNonApprovedCases()` in adminSelectors) so no UI state can leak approved/in-review rows

### C1. Flow diagram (top of page)

One large Whimsical-style left-to-right node tree + **partner selector chips** (All default + each partner) + **date-range filter** (Today default, 7D/30D/custom):

- `Leads (n)` circle → level 1: `Call Connected (90%)` / `Call Dropped (10%)` → from Connected: `Agent Approved (80%)` / `Agent Unable to Verify (8%)` / `Agent Rejected (2%)` → from Agent Approved: `Auditor Approved (72%)` / `Auditor Recapture (7%)` / `Auditor Rejected (1%)`
- All percentages relative to **total leads**; each node also shows the absolute count for the current selection
- Node colors: green tints for pass-through nodes (Connected, Agent Approved, Auditor Approved); amber for remediable (Unable to Verify, Recapture); red for terminal (Dropped, both Rejected)
- **Auditor Approved renders de-emphasized** (muted/outlined, ~60% opacity, caption "not included below") — shown for funnel completeness only; the five failure nodes are **clickable and filter the cases table** below to that status
- Rounded nodes, curved SVG connectors; numbers recompute per selection; note under the diagram: "Excludes N cases currently in auditor review" (correct live N)
- Build as a reusable `StatusFlowDiagram` component (data in, layout out — no hardcoded numbers)

### C2. KPI row

`Total Non-Approved` · `User Dropped` · `Unable to Verify` · `Agent Rejected` · `Auditor Recapture` · `Auditor Rejected` — count + % of leads for the selection, respecting the partner/date filters.

### C3. Reason breakdown + trend

- Horizontal bar chart by **reason category** (6-category taxonomy + Connection/Drop); clicking a category expands **sub-reason** bars beneath it; remarks visible via tooltip on table rows
- Trend line: non-approved cases per day over the range, one toggleable line per status

### C4. Cases table

All in-scope cases, newest first. Columns: Timestamp · App ID · Customer · Partner · Agent · the three status levels (as in Call History) · Reason Category · Reason (sub-reason) · Auditor (`—` where n/a). Reuse the Call History filter bar (Status levels, Reason Category, Partner, Agent, Product, Date), pagination, count caption, clear-all, and row actions (View Details · Activity Log · View Report — disabled for User Dropped). Diagram node clicks pre-apply the matching filter chip.

## Consistency

- Home's Call Breakdown, Partner Analytics funnel, Call History, and this page all derive from the same canonical fields — no page keeps a private status mapping
- Diagram percentages × leads must equal table counts for every selection (assert in dev)

## Acceptance

1. Data layer: conditional model enforced; assertion never fires; distribution ≈ 90/10, 80/8/2, 72/7/1 with In Review on recent days
2. Call History: three status columns with `—` where a level doesn't apply; three-level filters work; impossible combos disabled
3. Sidebar shows "Rejection & Failure Reasons"; old Quality & Compliance content gone
4. Diagram matches the reference layout, recomputes per partner/date, Auditor Approved de-emphasized, failure-node clicks filter the table, in-review note shows correct N
5. No fully-approved or In-Review case appears in R&F KPIs/graphs/table under any filter combination
6. Cross-page reconciliation (spot-check Niyo today across Home, Partner Analytics, Call History, R&F)
7. `npm run build` clean; agent app untouched
