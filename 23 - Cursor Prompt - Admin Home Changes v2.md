# Cursor Prompt — Admin Home: Change Request v2

> Seven changes to the admin Home. Minimal diffs; reuse existing shared components (`PartnerMultiSelect`, roster selector); agent app untouched.

---

## 1 & 2. Agent Allocation → grouped table with collapsible partner groups

Rebuild the Allocation card as a **table**:

- Columns: **Agent** (avatar + name, left) | **Partner(s)** | **Allocation** (`Dedicated` / `Shared` badge; Shared rows list the other partners in a tooltip)
- Rows **grouped by partner**, each group having its own header row: partner name + count ("Niyo — 14 agents") + per-group expand/collapse chevron. Every group independently collapsible; default: all collapsed. Card-level "Expand all / Collapse all" link in the header
- Shared agents appear under **each** partner they serve (their badge shows `Shared`); the group count reflects agents serving that partner
- Data still comes from `getAgentRoster()` — no new derivation

## 3. Hourly Call Volume: "All" line by default, partners opt-in

- Add an **"All"** series (fleet-wide total per hour), rendered by default as the only line (primary purple, slightly thicker)
- All partner-specific lines are **hidden by default**; each appears only when the user explicitly selects that partner in the filter control; deselecting hides it. "All" can be toggled off once at least one partner is selected (never show an empty chart — keep "All" on if nothing else is selected)
- Legend reflects only visible lines

## 4. Call Breakdown: date filter

- Add a **date filter** next to the partner filter: preset "Today" (default) + custom range picker (past dates up to today)
- For any selected range **before today**, the live-state columns — **In Queue, Ongoing, In Auditor Review — show 0** (they're point-in-time states, not historical); when the range includes today, they show current live values only
- Historical values aggregate from the seeded 90-day call history; Total row recomputes over range × partner selection

## 5. Call Breakdown: replace wait/drop columns with percentage columns

- **Remove** the Avg Wait Time and Call Drop Rate columns
- **Add**: `% Approved`, `% Rejected`, `% Dropped`, `% Unable to Verify` — each computed per partner over the selected range: count ÷ Total Calls for that row, one decimal
- `% Dropped` cell turns red above 5%; the data-driven high-drop alert line under the table stays, now keyed off `% Dropped` (Niyo still seeded hot for today)
- Column order: Total Calls · Approved · Rejected · Unable to Verify · Call Dropped · In Queue · Ongoing · In Auditor Review · % Approved · % Rejected · % Dropped · % Unable to Verify. If that's too wide, fold the four raw-count decision columns and the four % columns into a single set of columns showing `count (xx.x%)` — pick whichever keeps the table readable without horizontal scroll at 1440px

## 6. Queue Monitor: move + data consistency

- Move the Queue Monitor card to sit **directly below the Call Breakdown card** (above Hourly Volume row)
- **Consistency rule**: any queue flagged `Under-utilized (Reallocate)` must show a **drop rate under 1%** in its queue stats and in Call Breakdown's `% Dropped` for that partner (idle agents = calls get answered) — adjust the seeded data so imbalance signals and drop rates never contradict each other. Conversely the high-drop partner (Niyo) must not be flagged under-utilized
- **Remove the Completion % stat from the Queue Monitor** — it's effectively the complement of drop rate, which Call Breakdown already shows. Queue Monitor keeps: queue depth, wait, imbalance signal

## Acceptance

1. Allocation: grouped table renders with per-partner collapse, expand-all works, shared agents listed under every partner they serve with correct badges
2. Hourly chart: initial render = single "All" line; selecting partners adds their lines; never an empty chart; legend matches visible lines
3. Call Breakdown: Today default; a past custom range zeroes In Queue/Ongoing/In Auditor Review and aggregates the rest correctly; % columns sum sensibly (approved+rejected+unable+dropped ≈ 100% of resolved calls); red % Dropped + alert line only for the hot partner
4. Queue Monitor sits below Call Breakdown showing depth/wait/imbalance only (no Completion %); no under-utilized queue shows ≥1% drop anywhere on the page
5. `npm run build` clean; no other sections touched
