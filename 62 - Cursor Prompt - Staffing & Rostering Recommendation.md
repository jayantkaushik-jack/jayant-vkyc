# Cursor Prompt 62 — Admin Workforce: staffing & rostering recommendation

Build a **staffing recommendation view** on the admin app that uses historical time-based call volume to suggest how many **agents and auditors** are needed per **shift**, plus the **daily rostering %**. Put it on the existing `apps/admin/src/features/admin/pages/WorkforcePage.tsx` as a new "Staffing Recommendation" section (it already has the heatmap and `getStaffingByWeek`/`getAgentRoster`/`getHeatmapData` selectors to build on). Keep it a **transparent, configurable heuristic** — this is a planning aid, not a workforce-management engine.

## Shifts (the current SBM shifts — update the app to these)
- **Shift A: 08:00–17:00**
- **Shift B: 12:00–21:00**
- **Shift C: 14:00–23:00**

Replace the old shift labels in `packages/shared/src/data/reportGenerators.ts` (`SHIFT_LABELS = ['1st Shift (08:00–16:00)', …]`) with these three, and reuse the same definitions in the staffing model so the Agent Allocation report and the recommendation agree.

## Constraints (given by SBM)
- **No agent works more than 6 consecutive days.**
- **6 leaves per month per agent, including Saturdays and Sundays** (i.e. weekly-off is drawn from this allowance).

## The model (state these as configurable assumptions in the UI)
Base everything on the **average connected-call volume per hour-of-day** over a selected window (reuse `getHeatmapData` / `getHourlyVolumeByPartner` aggregated to hour-of-day). Expose these inputs as editable fields (defaults in brackets):

- **Agent handling time** — avg call time [use the live figure from the productivity selectors]
- **Auditor review time** — avg review time [live figure]
- **Target occupancy** [80%]
- **Shrinkage** [30%] — covers the 6 monthly leaves (~20%) plus breaks/training/absence
- **Concurrent calls per agent** [1]

Compute:

1. **Per hour**, required agents on floor `= ceil( (callsPerHour × handlingTimeHours) / (targetOccupancy × concurrentPerAgent) )`. (Simple workload/occupancy method — no need for full Erlang C, but note in a comment that Erlang C could refine it.)
2. **Per shift**, `requiredOnFloor = max(hourly requirement across the hours that shift covers)`. Where shifts overlap (12:00–17:00 covered by A+B; 14:00–21:00 by B+C), split the hour's requirement across the covering shifts so peaks aren't double-counted — document the split rule you use (e.g. assign each hour's requirement to the shift(s) live in that hour, dividing evenly, then take each shift's max).
3. **Roster (gross-up for shrinkage)**: `agentsToRoster(shift) = ceil( requiredOnFloor(shift) / (1 − shrinkage) )`.
4. **Auditors**: same method using **approved-call volume per hour × review time** (auditors only review agent-approved cases).

## What to display
- A **Staffing Recommendation** table: one row per shift (A/B/C) × columns **Required on floor** and **Agents to roster** and **Auditors to roster**, plus a Total row. Above it, the editable assumption inputs (occupancy, shrinkage, handling/review time, concurrency) that recompute the table live. A date-range control selects the historical window the volumes are drawn from.
- A short caption stating the method and that figures are planning estimates.

## Rostering % per day
Add a **Daily Rostering** view: for each day of the week, show the **% of total agents who must be present** that day.

- Derive total headcount needed to sustain the daily roster given the **6-day rule** and **6 monthly leaves**: `totalHeadcount = ceil( dailyRosterHeadcount × 7 / 6 )` grossed for monthly leaves, so that on any given day the mandatory weekly-offs/leaves still leave enough agents to cover `dailyRosterHeadcount`.
- **Rostering %(day) = agentsRequiredPresent(day) / totalHeadcount × 100**. Weekends can carry a lower required-present figure if historical weekend volume is lower — derive it from the same volume data rather than hard-coding, and show the % per day (Mon–Sun) as a small bar or labelled row.
- Show `totalHeadcount` and the implied number of agents on leave/off each day.

Add selectors in `adminSelectors.ts`: `getStaffingRecommendation({ range, assumptions })` and `getDailyRosteringPct({ range, assumptions })`. Keep all assumptions in one typed object so the UI inputs drive both.

## Acceptance criteria
1. The app's three shifts are updated everywhere to 08:00–17:00, 12:00–21:00, 14:00–23:00 (staffing view + Agent Allocation report agree).
2. The staffing table suggests agents-to-roster and auditors-to-roster per shift from historical hourly volume, and recomputes when the assumption inputs (occupancy, shrinkage, handling/review time, concurrency) or the date range change.
3. The daily rostering view shows a per-day % of total agents required present, derived from volume, honouring the 6-consecutive-day and 6-leaves-per-month constraints in the total-headcount calc.
4. The method and assumptions are visible and editable in the UI (no hidden magic numbers).
