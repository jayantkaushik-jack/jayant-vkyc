# Cursor Prompt — Auditor Dashboard: Change Request v1

> Three changes to the auditor app. Minimal diffs; other apps untouched.

---

## 1. Pending cases gated by status (replace the visible-but-locked behavior)

The Pending Cases list must render **only when the auditor is Online**. The list area shows exactly one of:

- **Offline, no session yet** → the Go Online hero ("Ready to review cases?"); no case rows at all
- **Online** → the pending cases table, fully functional
- **On Break** → the On-a-Break card with the live break timer + `Resume — Go Online`; no case rows
- **Offline after a session** → the session-summary card (went online at · total active · total break · went offline at) + Go Online button; no case rows

Remove the lock-icon/tooltip row treatment from the previous round — cases are simply not shown off-line. Deep-linking to `/cases/:id` while not online redirects to the queue (which shows the appropriate status card).

## 2. Recent Decisions: search + filters

Add to the Recent Decisions table (Analytics page), reusing the shared filter-bar patterns:

- **Search**: case-insensitive across Customer Name · App ID · Agent · Reason text; live, composes with filters, clearable
- **Filters** (collapsible bar with active-count badge + Clear all):
  - Decision: `Approved / Recapture / Rejected` (multi-select)
  - Reason Category: taxonomy categories (multi-select); Reason: sub-reason multi-select narrowed by category
  - Date: range picker (defaults to the page's date preset; local override chip)
- Single `filterDecisions(criteria)` path; count caption; pagination reset on change; empty state
- Session-made decisions appear in results immediately

## 3. Remove the Approval Rate trend chart

Delete the approval-rate line chart from Analytics. Rationale (leave as a code comment): redundant with the stacked decisions-over-time chart, and a headline approval-rate target creates the wrong incentive for an audit role. The decisions-over-time stacked chart and KPI cards remain; reflow the layout so there's no gap.

## Acceptance

1. Status lifecycle on the queue page: hero → online (table) → break (timer card, no rows) → resume → offline (summary card, no rows); deep-link redirect works
2. Recent Decisions: search + all filters compose correctly; a decision made this session is findable via search immediately
3. Approval-rate chart gone; Analytics layout clean; decisions-over-time + KPIs intact
4. Auditor app builds clean; no other app touched
