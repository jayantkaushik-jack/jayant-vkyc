# Cursor Prompt — Admin Dashboard: Home Page Redesign + Operations Assistant

> Rebuilds the admin Home (`/` of the admin app / `Dashboard` section) and adds the Operations Assistant chat across all admin pages. Read files before editing; reuse existing components and selectors; do not touch the agent app. Data additions go in the shared data layer (`adminSelectors` + generator extensions) — extend, don't change existing semantics.

---

## A. Remove

Remove the **Work Plan** section from the Home page entirely (component can stay if Users/profile pages use it; just unmount from Home).

## B. Availability summary — clean status table (replaces Agent/Auditor Overview cards)

One card, two tabs (`Agents` / `Auditors`), containing a clean 4-row table:

| Status | Count | % of present |
|---|---|---|
| Available | 35 | … |
| In a call | 4 | … |
| On a break | 6 | … |
| Offline | 22 | … |

- Header row above the table: `Total onboarded: 67 · Present today: 45`
- Status dot colors: Available green, In a call purple, On a break amber, Offline gray
- **Expandable rows (item 3)**: clicking a row expands an inline panel listing every agent in that status — avatar, name, employee ID, partner tags, and a context column (In a call → current call duration + customer App ID; On a break → break elapsed; Available → idle since; Offline → last seen). Searchable when the list exceeds 10. Only one row expanded at a time
- Data: add `getAgentsByStatus()` / `getAuditorsByStatus()` to `adminSelectors` — derive a deterministic "current status" per agent from the seeded data (don't hardcode counts; the table must sum to present/onboarded correctly)

## C. Today's partner-wise breakdown table (item 4)

Card "Today by Partner": rows = Paisabazaar, Credilio, Niyo, ZET, GENERAL (+ a bold Total row); columns:

`Total Calls · Approved · Rejected · Unable to Verify · Call Dropped · In Queue · Ongoing · In Auditor Review`

- All values from a new `getPartnerDayBreakdown()` selector over today's seeded calls + live queue state; consistency rule: `Approved + Rejected + Unable + Dropped + InQueue + Ongoing + InAuditorReview ≤ Total Calls` per row, Total row sums columns
- Number cells right-aligned, zebra rows, sticky first column; clicking a partner row's Total navigates to Partner Analytics filtered to that partner

## D. Agent allocation by partner (item 5, collapsible)

Collapsible card "Agent Allocation" (collapsed by default):

- One section per partner: partner name + allocated count, then agent chips (avatar + name)
- Each chip carries a badge: **`Dedicated`** (agent's skill set lists only this partner) or **`Shared`** (multiple partners — tooltip lists the other partners)
- Footer line per partner: "12 dedicated · 8 shared"; unallocated agents (if any) in an "Unassigned" section
- Data: derive from each agent's `skills.partners` — no new fields needed

## E. Per-section refresh (item 6)

Every Home section card gets a refresh icon-button in its header (↻). Clicking it refreshes **only that section**: brief 400ms skeleton/spinner on the card, then re-computed values with a small deterministic jitter (re-roll the live parts: queue counts, ongoing calls, statuses) and a "Updated just now" caption that ages ("Updated 2m ago"). Implement as a `useSectionRefresh` hook (per-section nonce state) — no full-page reload, other cards untouched.

## F. Hourly call volume trend (item 7)

Card with a line/area chart of today's call volume by hour (9:00–20:00): partner **filter chips** (All + each partner, multi-select) — chart re-renders to show selected partners as separate colored lines with legend. Reuse the existing hourly volume data/selector from Live Ops, parameterized by partner set.

## G. Customer metrics (item 8) — with partner filters

Two prominent stat cards sharing one partner filter row (All + each):

- **Call Conversion Rate** = agent-approved calls ÷ answered calls, today. Tooltip: "Of calls answered by agents, % approved"
- **Customer Conversion Rate** = unique customers approved ÷ unique customers who entered the journey today (including those who dropped in queue or never connected). Tooltip: "Of customers who started VKYC today, % whose KYC was approved"
- Show each as % with a small trend-vs-yesterday delta; both recompute on partner filter change. New selectors in `adminSelectors`; customer conversion needs journey entries — extend the generator so each day has customers who entered but never reached a call (queue drops), so the two rates meaningfully differ (call conv ~85–92%, customer conv ~70–80%)

## H. Customer satisfaction (item 9)

Card "Customer Satisfaction (post-call survey)":

- Aggregate: average rating as `4.3 / 5` with star visual + response count ("1,032 responses today")
- Per-partner: compact horizontal bars (partner name, avg score, colored by band: ≥4.2 green, 3.5–4.1 amber, <3.5 red)
- Data: add a mocked `csatRating: 1–5` (weighted toward 4–5, partner-level variation so bars differ) to completed calls in the generator + `getCsatByPartner()` selector

## I. Operations Assistant chat (item 10 — port from the old sbm-management-dashboard)

Floating chat, available on **every admin page**:

- **Launcher**: fixed bottom-right circular button (purple, `MessageSquare` icon, hover label "Ops Assistant"); toggles to ✕ when open
- **Panel**: slide-up card bottom-right (~380×560): header "Operations Assistant" with green online dot; greeting message ("Hello! I'm your Operations Assistant. I can help you with real-time stats and agent performance. What would you like to know?"); scrollable message history (user right/purple, assistant left/gray); typing indicator (~1s) before each answer
- **Suggested questions** (indexed, shown as tappable chips above the input, persist after use):
  1. "What is the productivity of [top agent] today?"
  2. "What is the average wait time today for customers?"
  3. "How many agents are currently available?"
  4. "Which partner has the highest call volume today?"
  5. "What are the common rejection reasons today?"
  6. "What is today's customer conversion rate?"
  7. "Which partner has the lowest CSAT?"
- **Answer engine** (`src/.../opsAssistant.ts`): keyword-matched intents that answer **live from the data-layer selectors** (not canned strings) — e.g., availability answers from `getAgentsByStatus`, volume from `getPartnerDayBreakdown`, rejections aggregated from actual reason data, agent productivity from `getEfficiencyScore`/`getAgentStats`. Include agent-name matching ("productivity of Aadesh") → per-agent answer. Fallback: "I don't have that data yet — try one of the suggested questions." Free-text input + Enter/send button
- Panel state (open/closed, history) persists across page navigation within the session (context at AdminLayout level)

## Layout order (Home, top to bottom)

1. Availability summary (B) — left ⅔ · Customer metrics (G) — right ⅓
2. Today by Partner table (C) — full width
3. Hourly volume chart (F) — left ⅔ · CSAT card (H) — right ⅓
4. Agent Allocation (D) — full width, collapsed
Every card: header + refresh button (E). Assistant launcher floats over everything (I).

## Acceptance

1. Work Plan gone from Home; availability table sums correctly and every status row expands to a correct, searchable agent list with context per status
2. Partner breakdown table internally consistent (row math + Total row); row click deep-links to filtered Partner Analytics
3. Allocation card: every dedicated/shared badge matches the agent's skills; counts per partner correct
4. Each section refreshes independently with skeleton + "Updated…" caption; no full-page reload
5. Hourly chart and both conversion cards respond to partner filters; call conv > customer conv consistently; tooltips carry the exact definitions above
6. CSAT: aggregate + per-partner bars with band colors
7. Assistant works on all admin pages: all 7 indexed questions return correct live-data answers (cross-check availability answer against the table, volume answer against the breakdown table); free text matches intents; graceful fallback; history survives navigation
8. Agent app untouched; `npm run build` clean for both apps
