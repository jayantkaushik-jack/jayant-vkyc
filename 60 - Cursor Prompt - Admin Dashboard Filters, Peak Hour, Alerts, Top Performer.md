# Cursor Prompt 60 — Admin Dashboard: global partner filter, queue filters, peak-hour, alerts, configurable top performer

SBM feedback round. Five changes on the **admin** app. Reuse existing patterns: `PartnerMultiSelect` (`packages/shared/components/ui/PartnerMultiSelect`), the `useSearchParams` partner-CSV pattern already used in `ProductivityPage`/`PartnerAnalyticsPage`, and the admin selectors in `packages/shared/src/data/adminSelectors.ts`.

---

## 1. Global partner filter on the main dashboard (cascades to all cards)

On `apps/admin/src/features/admin/pages/AdminDashboardPage.tsx`, add a single **partner selector** in the page header (right of the "Dashboard" title) — a single-select dropdown with an **"All partners"** default (reuse the partner list from `PARTNERS`). Persist the choice in a URL param (`?partner=`) like the other pages.

Thread the selected partner (`PartnerId | 'ALL'`) as a prop into every card that is **not already partner-wise**, and have each card pass it to its selector:

- `KpiStripCard`, `AvailabilitySummaryCard`, `CustomerMetricsCard`, `QueueMonitorCard`, `HourlyVolumeCard`, `CsatCard`, `AgentAllocationCard` → filter their underlying selectors by the partner (add an optional `partnerId?: PartnerId` arg to the selectors they call; when omitted or `'ALL'`, behave as today).
- **Do NOT** add the filter to `PartnerDayBreakdownCard` — it is already partner-wise. (State this rule in a comment so it isn't "fixed" later.)

When a specific partner is selected, every metric/graph/table on the page recomputes for that partner only. "All partners" restores the current aggregate behaviour.

---

## 2. Partner filter in the Waiting / Live / Scheduled queues

On the customers/queue surface (`QueueMonitorCard` on the dashboard and `apps/admin/src/features/admin/pages/CustomersPage.tsx` where the Waiting / Live / Scheduled tabs live), add a **partner filter** (reuse `PartnerMultiSelect`, or the single-select from change 1 for consistency) that filters the rows in all three queue tabs. Default "All partners". The counts on each tab update with the filter.

---

## 6. Peak-hour graph: add a date-range filter and total call volume

`apps/admin/src/features/admin/components/home/HourlyVolumeCard.tsx` currently has partner chips but no date control. Add:

- A **date-range preset** control (Today / 7 days / 30 days / custom) — reuse `getDateRangeFromPreset` and the custom-range pattern from `ProductivityPage`. Pass the range into `getHourlyVolumeByPartner({ range, partnerIds, averagePerDay })` (already supports `range`).
- A **total call volume** figure for the current selection, shown in the card header (e.g. "Total: 1,240 calls" for the selected partners + range). When the range spans multiple days, keep the existing per-day-average line behaviour and label the total as the true sum over the range.
- Respect the global partner filter from change 1 if one is passed in; the card's own chips refine within that.

---

## 9. Configurable alerts section on the dashboard

Add an **Alerts** card to `AdminDashboardPage` (below `KpiStripCard`) driven by admin-configured thresholds. Generate an alert row (severity chip + message + timestamp + affected partner/agent where relevant) for each of:

- **Long break** — an agent whose total break time in the day exceeds the configured threshold (minutes).
- **High waiting queue** — waiting count (overall or per partner) exceeds the configured threshold.
- **High auditor backlog** — pending audit cases exceed the configured threshold.
- **No calls received** — no connected calls in the last *N* minutes, evaluated **overall and per partner** (configurable interval).

Add a new selector `getDashboardAlerts(config)` in `adminSelectors.ts` that evaluates these against `calls`, `attendance`, and the pending-audit data and returns typed alert rows. Empty state: "No active alerts."

**Thresholds live in the admin config** (see `ConfigurePage.tsx` + `useAdminConfig`): add an **Alerts** section to Configure with editable fields — long-break minutes, waiting-queue count, auditor-backlog count, no-calls interval (minutes) with an overall value and an optional per-partner override. Persist via the existing admin-config store so the dashboard reads them live.

---

## 10. Configurable "Top Performer" section

Wherever the Top Performer(s) are surfaced (the productivity/workforce top-5 and any home highlight), add a **KPI selector** so the ranking can be switched between: **Accuracy, Efficiency, CSAT, AHT, Approval Rate**. Reuse the `productivityMetrics` module (`apps/admin/src/features/admin/productivityMetrics.ts`) — extend it if any of these metrics (AHT, Approval Rate) aren't already defined there. Default to Efficiency (current behaviour). Sorting direction must respect the metric (for AHT, lower is better). Optionally let the admin set the default KPI in Configure.

---

## Acceptance criteria
1. Selecting a partner in the dashboard header recomputes every card except the already-partner-wise `PartnerDayBreakdownCard`; "All partners" restores aggregates; choice survives refresh (URL param).
2. The Waiting/Live/Scheduled tabs filter by partner and their counts update.
3. The peak-hour card has a working date-range control and shows the correct total call volume for the current partner+range selection.
4. The Alerts card shows the four alert types, each firing only when its configured threshold is breached, with per-partner evaluation for waiting-queue and no-calls; thresholds are editable in Configure and take effect live.
5. Top Performer can be re-ranked by Accuracy / Efficiency / CSAT / AHT / Approval Rate, with correct sort direction per metric.
6. No regression to `PartnerDayBreakdownCard`, existing partner analytics, or the productivity date filters.
