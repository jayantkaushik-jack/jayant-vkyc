# Cursor Prompt — Admin: R&F Page — Replace Reason Breakdown + Trend Cards

> Replaces the two weak cards on the Rejection & Failure Reasons page ("Reason Breakdown" and "Non-Approved Trend") with status-scoped reason charts and a legible volume chart. Everything else on the page (diagram, KPIs, table) stays. Reuse the shared taxonomy with its decision bindings.

---

## 1. "Failure Reasons by Status" card (replaces Reason Breakdown)

One card with a **status tab bar** — each tab labeled with its count for the current selection:
`User Dropped (36) · Unable to Verify (22) · Rejected (6) · Recapture (19) · Auditor Rejected (3)`

Per tab, a horizontal bar chart of **that status's own reasons** (top 8 by count, sub-reason level, sorted desc), each bar showing count + % of that status; bar color = the status's color (gray/amber/red/amber/deep-red). Reasons come strictly from the taxonomy's decision bindings — the Unable tab can only ever show unable-class reasons, Rejected/Auditor Rejected only rejected-class, Recapture the capture-quality subset.

**User Dropped tab is special** — drops have no selected reason, so show **Drop Stage** instead: bars for where in the journey the customer was lost (`Before connecting · Pre-call checks · Liveliness · Location · Face Capture · Aadhaar · PAN · Signature · Report`), derived from each dropped call's activity-log truncation point (extend the generator to record `dropStage` consistently with the truncated log). Sub-caption: "Stage at which the customer dropped".

Tab selection syncs with the flow-diagram node clicks and pre-filters the cases table (one shared "selected status" state across diagram → reason card → table).

## 2. "Failure Volume Over Time" card (replaces Non-Approved Trend)

- Rename + subtitle: "Failure Volume Over Time — non-approved cases in the selected period"
- **Stacked bar chart** (not lines): one bar per time bucket, stacked segments per status (same five colors + legend)
- **Bucket adapts to the range**: Today → hourly buckets (09:00–20:00); 2–31 days → daily; longer → weekly. Never a single-point chart
- Toggle: `Count` / `% of leads` (share of that bucket's leads that failed)
- Hovering a segment: tooltip "Unable to Verify — 4 cases (11% of this hour's leads)"

## 3. Seeding sanity

Today's data must populate every status tab meaningfully (each ≥3 cases) and give the hourly chart visible variation across the day (more failures at peak hours). Keep global consistency rules intact.

## Acceptance

1. Old two cards gone; new cards render side by side in the same slot
2. Each status tab shows only its own bound reasons; User Dropped shows drop stages that reconcile with its truncated activity logs (spot-check 3 cases)
3. Diagram node click, reason-card tab, and table filter stay in sync (one selection state)
4. Today: hourly stacked bars with variation; 7D: daily bars; % of leads toggle works; no single-point renders under any range
5. `npm run build` clean; diagram/KPIs/table untouched
