# Cursor Prompt — Admin: Rename "Workforce" → "Productivity" + Full Restructure

> Replaces the Workforce page with a Productivity page: sortable agent roster on hero metrics, a full agent-detail view with trends and break patterns, and an auditor-productivity section. Old Workforce content not listed below (utilization/occupancy KPIs, day×hour heatmap, staffing-trend bars, top/bottom rails) is removed. Reuse shared selectors; extend the generator only as specified. Agent app untouched.

---

## Canonical metric set (define once in a `PRODUCTIVITY_METRICS` config: id, label, format, direction good=high/low, tooltip)

Hero (main page): **Total Calls · Efficiency (0–100) · Accuracy · Call Drop Rate · CSAT**
Detail-only additions: **Avg Wait Time · Avg Call Time · Avg Review Time · Avg Break Time · Avg Hours Online · Occupancy**

- **Accuracy** ⓘ: `100% − overturn rate`, where overturn rate = (auditor rejections **+ recaptures**) ÷ the agent's audited approvals. Tooltip: "Share of audited approvals upheld by auditors — rejections and recaptures both count as overturns." Label the column "Accuracy"; sub-label "auditor-upheld decisions"
- **Occupancy** ⓘ: handling time (on-call + post-call review) ÷ online time; the remainder is idle waiting. Tooltip includes: "Sustained >90% indicates overload risk." Shown per agent in the detail view, but it's primarily an aggregate metric — see the Home page addition below
- **CSAT per agent**: aggregate the existing per-call `csatRating` by agent (1–5, one decimal)
- All other metrics use the existing selectors

## Page: `/productivity` (rename route + sidebar entry "Productivity"; redirect old path)

**1. Fleet summary strip** — the five hero metrics **plus fleet Occupancy** as aggregate cards (respecting global partner + date filters, per-section refresh pattern)

**Home page addition (small, same round):** add a **Fleet Occupancy** card to the admin Home KPI strip (making it 5 cards: Total Calls Today · Avg Wait Time · Call Drop Rate · Active Agents · Occupancy) — aggregate handling÷online for today, band-colored (75–90% green, >90% red "overload", <60% amber "under-utilized"), same ⓘ tooltip. Must equal the Productivity fleet strip's value for the same filters

**2. Agent roster table** (main content):
- Columns: Agent (avatar, name, employee ID) · Partner(s) · the five hero metrics
- **Sortable by every hero metric** (click header, asc/desc indicator; default: Total Calls desc). Sorting is real — recomputes over the filtered dataset
- Filters: partner, date range; search by name/ID
- Band coloring: Efficiency (≥85 green / 70–84 amber / <70 red), Accuracy (≥97 green / 94–97 amber / <94 red), Drop Rate (>5% red), CSAT (≥4.2 green / 3.5–4.1 amber / <3.5 red)
- Row click → agent detail page

**3. Agent detail** (`/productivity/:agentId`):
- **Profile panel** (left): avatar, name, employee ID, **Date of Joining** (add `dateOfJoining` to the agent generator — spread over the past 1–4 years — plus computed tenure "1 yr 8 mo"), manager, branch, contacts, languages, partner allocation (dedicated/shared badge), work plan (office + break timings), status
- **All 11 metrics** as cards (incl. Occupancy), each with value for the selected range + mini sparkline
- **Trend explorer**: one large line chart with a metric picker (all 11) + date-range presets (7D/30D/90D) — daily values from the seeded history
- **Break patterns** card:
  - *Intraday*: horizontal timeline (09:00–18:00) showing when breaks were taken for a selectable day (default today) — break blocks drawn on the bar (extend the attendance generator to store break intervals, e.g., a lunch window 13:00–13:40 ± variance and 1–2 short breaks, consistent with each day's `totalBreakMin`)
  - *By weekday*: bar chart of avg break minutes Mon–Sun over the range (visible variation; Fridays slightly higher, say)
- Back link to the roster preserving sort/filter state

**4. Auditor Productivity** (last section on the main page — reasonable-assumption design):
- KPI cards: `Audits Completed` (range) · `Avg Audit TAT` (agent approval → auditor decision) · `Pending Queue` (current In Review count — consistent with Call History) · `Overall Overturn Rate` (rejections+recaptures ÷ audited)
- Auditor table (19 rows, sortable): Auditor (avatar, name) · Audits Completed · Avg Audit TAT · Avg Decision Time (review session length, mock 2–6 min) · Decision Mix (compact stacked bar: Approved/Recapture/Rejected %) · Overturn Rate · Avg Hours Online
- Data: derive from existing auditor decisions; add mock audit-session timestamps to support TAT and decision-time (TAT minutes-to-hours, consistent with Partner Analytics TAT assumptions)
- No auditor detail page in this round — table only

## Acceptance

1. Sidebar shows "Productivity"; old Workforce-only content gone; old route redirects
2. Roster sorts correctly by all five hero metrics both directions; bands color correctly; search + filters compose
3. Agent detail: profile with DOJ + tenure; 10 metric cards with sparklines; trend explorer switches metrics; intraday break timeline matches that day's total break minutes; weekday break chart varies; back preserves state
4. Accuracy math: agent with 2 auditor rejections + 1 recapture out of 40 audited approvals shows 92.5%
5. Auditor section: KPIs + sortable table; Pending Queue equals Call History's In Review count; decision-mix bars sum to 100%
6. Home KPI strip shows the Occupancy card (5 cards total), band-colored, equal to the Productivity fleet value for today
7. `npm run build` clean for both apps
