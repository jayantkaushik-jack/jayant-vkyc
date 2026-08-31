# Cursor Prompt — Admin: Call History — Statuses, Columns, Working Filters

> Changes to the Call History table on the Customers page. Minimal diffs; agent app untouched.

---

## 1. Seed more decision variety

Today's (and recent days') call history must visibly include, alongside approvals: **Unable to Verify** cases (~5–8%) and **Rejected** cases (~4–6%), each carrying reasons from the shared rejection taxonomy. They must appear on the first page of results (recent timestamps), not buried.

## 2. "Failed" → "User Dropped"

- Rename the call status label `Failed` → **`User Dropped`** everywhere it renders (Call History status pill, any admin summary legends). (Context: "Failed" in the reference system means the call never reached a decision — customer dropped/never connected.) Data enum can stay `failed` internally; display label changes
- For User Dropped rows: **Duration = 0:00**, **Agent Decision column = blank (—)**, **Auditor column = blank**, no auditor decision ever attached, and their Activity Log truncates at the drop point
- User Dropped rows must not open View Report (no report exists) — disable that CTA with a tooltip "No report — call never completed"; View Details and Activity Log still work

## 3. Remove the **Purge Status** column

## 4. Add a **Partner** column (partner name chip; sourced from the customer record) — place it after App ID

## 5 & 6. Working filter bar

Add a filter bar above the table (collapsible into a "Filters" button with an active-count badge). All filters **must actually filter** — they compose with each other, with search, and with pagination (reset to page 1 on change):

- **Status**: `Success / User Dropped` (multi-select)
- **Agent**: searchable dropdown of the 67 agents
- **Auditor**: searchable dropdown of the 19 auditors
- **Partner**: reuse `PartnerMultiSelect`
- **Agent Decision**: `Approved / Rejected / Unable to Verify` (multi-select)
- **Auditor Decision**: `Accepted / Rejected / Recapture / Pending` (multi-select)
- **Product**: dropdown of product types present in data (e.g., CRL_SC_FD, ZET_SC_FD, SMT_CIP)
- **Date**: range picker (default: all)

Mechanics: single `filterCalls(criteria)` function over the dataset — every dropdown writes into one criteria object; the table renders only from the filtered result (no leftover unfiltered render paths — that was the earlier search bug). "Clear all" link resets everything. Record count caption reflects the filtered total ("Showing 1–25 of 312 Records" while filtered). Empty state when nothing matches.

## Acceptance

1. First page shows a mix: approved, rejected, unable-to-verify, and User Dropped rows
2. User Dropped: 0:00 duration, blank decision + auditor cells, View Report disabled with tooltip, truncated activity log
3. No Purge column; Partner column present with correct values
4. Every filter demonstrably works alone and in combination (e.g., Partner=Niyo + Status=User Dropped + Date=last 7 days → only matching rows, correct count caption); pagination resets on change; Clear all restores 64,738
5. Search still composes with filters
6. `npm run build` clean; nothing else touched
