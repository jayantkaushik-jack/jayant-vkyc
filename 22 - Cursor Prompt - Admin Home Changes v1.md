# Cursor Prompt — Admin Home: Change Request v1

> Targeted changes to the admin Home + Ops Assistant, plus retiring the Live Ops page. Minimal diffs; don't touch other admin sections or the agent app.

---

## 1. Equal heights — row 1
"Availability Summary" and "Customer Metrics" cards must render at the same height (stretch to the row: `items-stretch` on the row grid, `h-full flex flex-col` on both cards; inner content of the shorter card spaces with `justify-between`, no awkward gaps). Expanding a status row inside Availability may grow the row — that's fine; heights match in the collapsed/default state.

## 2. Agent→partner allocation: 90% dedicated, 10% shared
In the **data generator** (agents' `skills.partners`): ~90% of agents get exactly **one** partner; ~10% get 2–3 partners (deterministic with the seeded RNG). This flows through everywhere automatically — Availability expansion panels' partner tags, Allocation card badges ("Dedicated"/"Shared"), and Workforce skills. Verify Allocation footer counts now read ~dedicated-heavy (e.g., "12 dedicated · 1 shared").

## 3. Rename
"Today by Partner" card title → **"Call Breakdown"**. Keep the "today" sense in a subtitle: "Today's calls by partner".

## 4. Auditor review must be non-empty
The **In Auditor Review** column currently shows zeros. Extend the day's seeded data so a realistic share of today's agent-approved calls (~8–15 per partner, varying) sit in `in_auditor_review` state (approved by agent, no auditor decision yet). They must also reconcile: Dashboard's Auditor Summary "Pending" and the Quality section should reflect the same pending set.

## 5. Partner filter on Call Breakdown
Add a **dropdown with checkboxes** (multi-select + "All" master checkbox, chip showing "3 partners" when partial) to the Call Breakdown card header. Filters the table rows; Total row recomputes over the selection. Reusable component (`PartnerMultiSelect`) — place it in shared UI; future cards will use it.

## 6. Equal heights — row 2
"Hourly Call Volume" and "Customer Satisfaction" cards: same height (same technique as change 1; the chart flexes to fill, CSAT bars space evenly).

## 7. Allocation card = same data as Availability Summary
Both cards must be views over the **same selector output** (one `getAgentRoster()` in `adminSelectors` returning agents with status + partners + dedicated/shared): total agents equal in both; an agent's partner tags in the Availability expansion match his badges in Allocation; status counts implied by Allocation chips (if shown) match the table. Remove any duplicated per-card derivation.

## 8. Call Breakdown: wait time + drop rate columns, high-drop alert
Add two columns to the Call Breakdown table: **Avg Wait Time** (per partner, today, from `agentWaitSec`) and **Call Drop Rate** (per partner, today, from the routed/answered model). Drop-rate cell turns red above 5%. Seed the data so exactly **one partner (Niyo) runs hot (~8–9%)** today, and render a red alert line under the table: `⚠ High drop rate on Niyo (8.4%) — consider reallocating agents` — driven by the data (appears for any partner crossing the threshold, not hardcoded to Niyo). Total row shows fleet-wide values for both columns.

## 9. Move Live Ops KPI cards to Home, delete Live Ops page
- Move the 4 KPI cards from the top of Live Ops — **Total Calls Today (vs target), Avg Wait Time (vs SLA), Call Drop Rate (alert style >5%), Active Agents** — to the **top of Home**, above the Availability row, as a 4-across strip (with the per-section refresh button pattern)
- **Delete the Live Ops page entirely**: remove the route and the sidebar entry. Relocate its remaining unique content so nothing of value is lost: the **Hourly Call Volume** chart already exists on Home (keep the Home version with partner filters); move **Queue Depth per partner + imbalance signals + critical queue alert banner** into a compact collapsible card at the bottom of Home ("Queue Monitor", collapsed by default); drop the duplicated per-partner cards (their data now lives in Call Breakdown's new columns)
- Redirect `/live-ops` → `/` so stale links don't 404

## 10. Ops Assistant → full-height right drawer
Replace the bottom-right popup panel with a **right-aligned, full-page-height drawer** (~400px wide, slides in from the right edge; top-to-bottom: header, scrollable history filling available height, suggested chips, input pinned at the bottom). Launcher button stays where it is; opening the drawer overlays a subtle scrim on content (click-outside closes). Keep all behavior (intents, history persistence across pages, typing indicator).

## Home layout after this round (top to bottom)
1. KPI strip (4 cards, from Live Ops)
2. Availability Summary (⅔) · Customer Metrics (⅓) — equal heights
3. Call Breakdown table (full width, partner filter, wait/drop columns, alert line)
4. Hourly Call Volume (⅔) · Customer Satisfaction (⅓) — equal heights
5. Agent Allocation (collapsible)
6. Queue Monitor (collapsible, from Live Ops)

## Acceptance
1. Rows 2 and 4 each show equal-height cards at 1280px and 1600px widths
2. Availability and Allocation both consume `getAgentRoster()`; spot-check 3 agents — identical partner tags/badges in both cards; ~90/10 dedicated/shared split holds
3. "Call Breakdown": partner checkbox dropdown filters rows and Total; In Auditor Review non-zero and consistent with Auditor Summary pending; Avg Wait + Drop Rate columns present; exactly one partner shows red drop rate with the alert line beneath; KPI-strip drop rate = Call Breakdown Total drop rate
4. Live Ops gone from sidebar and routes; `/live-ops` redirects to `/`; Queue Monitor card holds the queue-depth content; nothing 404s
5. Assistant opens as a full-height right drawer on every admin page; input pinned bottom; history intact when navigating
6. `npm run build` clean for both apps; agent app untouched
