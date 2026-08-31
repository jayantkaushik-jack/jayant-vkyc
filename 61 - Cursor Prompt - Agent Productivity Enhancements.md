# Cursor Prompt 61 — Agent Productivity: AHT, live status, agent-level reasons

Three changes on the admin **Productivity** surface (`apps/admin/src/features/admin/pages/ProductivityPage.tsx`, `ProductivityAgentDetailPage.tsx`, the `productivityMetrics` module, and selectors in `packages/shared/src/data/adminSelectors.ts`).

---

## 3. Show AHT (Call Time + Review Time) as a separate metric

Add **AHT = Average Call Time + Average Review Time** as its own column/metric on the agent productivity table (and in `productivityMetrics.ts` so it participates in sorting and the Top-Performer selector from Prompt 60).

- Define it precisely: per agent, `AHT = avgCallTimeSec + avgReviewTimeSec`, displayed as mm:ss (or minutes). Call time and review time already exist in the productivity selectors — add the summed metric rather than replacing them; keep the individual columns too.
- Lower AHT is better — set tone/sort direction accordingly.
- Add a one-line definition tooltip: "AHT = average call handling time + average review time per verification."

---

## 4. Current agent status against every agent + a refresh button

In the productivity table, add a **Status** column showing each agent's current live state: **Available, On Call, Break, Offline** (map from the agent availability/presence data used by `AvailabilitySummaryCard` / `getAgentRoster` / `buildAvailability`). Use a coloured status pill (Available = green, On Call = blue, Break = amber, Offline = grey).

Add a **Refresh** button above the table (top-right of the productivity table header) that re-pulls the live status (and the rest of the table) on demand, with a subtle "updated HH:MM:SS" timestamp next to it. This is a manual real-time refresh — no auto-polling required for the demo, but structure it so a future interval could call the same refresh handler.

---

## 5. Rejection & Unable-to-Verify reasons at the agent level (coaching)

On the **agent detail** view (`ProductivityAgentDetailPage.tsx`), add a **"Reasons breakdown"** section for that agent showing the distribution of their **Rejected** and **Unable to Verify** reasons over the selected date range — so a manager can spot coaching opportunities (e.g., one agent over-using "Poor internet" or "Capture quality unacceptable").

- Two small breakdowns (or one grouped bar/list), one per decision class, using the reason taxonomy in `packages/shared/src/lib/rejectionReasons.ts` (`getReasonMeta`, category grouping). Show count and % of that agent's non-approved calls per reason, sorted descending, with the reason's category.
- Add a selector `getAgentReasonBreakdown(agentId, range, partnerId?)` in `adminSelectors.ts`.
- Respect the page's existing date-range and partner filters.
- Keep it compact; this is a diagnostic panel, not a full analytics page.

---

## Acceptance criteria
1. AHT (call + review) shows as its own metric on the productivity table, formatted as time, sortable, lower-is-better, and available as a Top-Performer KPI.
2. Every agent row shows a live status pill (Available / On Call / Break / Offline); the Refresh button re-pulls the data and updates the "updated at" timestamp.
3. The agent detail page shows that agent's Rejected and Unable-to-Verify reason distribution (count + %), respecting date/partner filters.
4. No regression to existing productivity metrics, sorting, or the auditor productivity table.
