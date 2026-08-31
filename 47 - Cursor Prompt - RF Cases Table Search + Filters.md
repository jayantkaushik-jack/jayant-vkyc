# Cursor Prompt — R&F Page: Search + Filters on the Non-Approved Cases Table

> One change, applied to the "Non-approved cases" table on the Rejection & Failure Reasons page in **both the admin and partner apps** (shared component — implement once). Reuse the Call History filter-bar components and the single-`filterCases(criteria)` pattern; don't build a parallel filtering path.

---

## Search

Search input above the table (left-aligned, with icon): case-insensitive substring match across **Customer Name · App ID · Agent** (masked ID in the partner app — search matches what's displayed) **· Reason text**. Live as-you-type, composes with all filters, clears with ✕.

## Filter bar

Same collapsible "Filters" pattern as Call History (active-count badge, Clear all):

- **Status**: the five negative statuses (`User Dropped / Unable to Verify / Agent Rejected / Auditor Recapture / Auditor Rejected`, multi-select) — stays in sync with the flow-diagram node selection and status tabs (one shared selection state; changing any updates the others)
- **Reason Category**: the taxonomy categories + Connection/Drop (multi-select)
- **Reason**: searchable multi-select of sub-reasons, narrowed by the chosen categories
- **Agent**: searchable dropdown (masked IDs in partner app)
- **Partner**: `PartnerMultiSelect` — **admin app only** (partner app: omitted, implicit scope)
- **Date**: range picker (defaults to the page-level date selection; changing it here overrides for the table only, with a small "custom range" chip)

## Mechanics

- All criteria flow into one `filterCases(criteria)` over `getNonApprovedCases()` — table renders only from its output; count caption ("Showing 1–25 of 87 cases") and pagination (reset to page 1 on any change) reflect the filtered set
- Empty state: "No cases match your filters" + Clear all link
- Approved/In-Review cases remain impossible to surface (selector-level guarantee untouched)

## Acceptance

1. Search matches name/App ID/agent/reason live and composes with every filter
2. Status filter ↔ diagram node ↔ status tab stay in sync in both directions
3. Combo test (admin): Status=Auditor Rejected + Category=Suspicious Customer + last 7 days → correct rows + count; same test in partner app without the partner filter
4. Pagination resets on change; Clear all restores the full population; empty state renders
5. Both apps build clean; no second filtering code path (`filterCases` is the only route to rows)
