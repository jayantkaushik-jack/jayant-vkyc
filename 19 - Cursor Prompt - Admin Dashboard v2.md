# Cursor Prompt — Admin Dashboard v2 (supersedes "02 - Cursor Prompt - Admin Dashboard")

> Builds the Admin persona at `/admin/*` in the existing repo (`Agent_Admin_Dashboard_Implementation`). The agent app is mature and stable — **do not modify any agent feature, shared component behavior, or the data generator's existing semantics.** Extend only. Working protocol: read every file you touch first, reuse shared pieces, no restyling, full agent-flow regression check at the end.

---

## Ground rules — reuse what exists

- **Routing**: there is no role picker. Add `/admin/*` routes directly in `src/app/routes.tsx`; `/admin` works as a direct URL (keep whatever auth guard `/agent` uses)
- **Design system**: same Cashfree light theme, `Card / StatCard / StatusPill / Button / Modal / InfoTooltip / Toast` from `src/components/ui`. Real logo + favicon already in place. Charts: recharts, purple-family palette + one accent per partner
- **Shared components you MUST reuse (not fork):** `src/components/report/KycReport.tsx` (View Report modal), `src/lib/avatar.ts` + `public/avatars` (all people), `MapEmbed` (any map), the rejection-reason taxonomy (6 categories + sub-reasons) wherever reasons display
- **Data layer**: everything needed already exists — `PARTNERS` (Paisabazaar/Credilio/Niyo/ZET/GENERAL), 67 agents, 19 auditors, calls with routed/answered/`agentWaitSec`/`reviewTimeSec`/auditor decisions+remarks, webhook events per application, attendance, `EFFICIENCY_CONFIG` + `getEfficiencyScore`, `getCallDropRate`, `getAvgAgentWaitSec`, `getAvgReviewTimeSec`. Add **admin-scoped selectors** (fleet aggregates) in a new `src/data/adminSelectors.ts`; do not change existing selectors
- **Current data reality** (write copy/targets to match): avg call ~3 min; drop rate 4–8%; wait <120s; customers' language may be Hindi; location default SBM Lower Parel
- **Header**: same top bar pattern; left = logo + "Hi, <admin name>"; right = avatar. Admin sidebar mirrors `AgentSidebar` styling

## Shell

`AdminLayout` with collapsible left sidebar: `Dashboard, Live Ops, Customers, Partner Analytics, Quality & Compliance, Workforce, Users, Configure, Reports`. Sidebar footer: "System Status" mini-card (green pulse, "All queues operational. Niyo queue latency detected."). Hidden on <1024px via the existing desktop overlay.

## 1. Dashboard (`/admin`)

- **Agent Overview card**: Total Onboarded (67), Present (48 — `Online 39 | Offline 19 | Logged Out 09`), Online (39 — `Busy 04 | Idle 35`), Busy (04 — `Assigned 01 | On Call 02 | On Report 01`)
- **Auditor Overview card**: same pattern for 19 auditors
- **Agent Summary**: Daily/Weekly/Monthly toggle; donuts `Total Calls Initiated` and `Total Success Calls` with legend Success / Failed / Approved / Rejected / On Hold — numbers computed from the call data for the selected period (not hardcoded)
- **Auditor Summary**: donuts `Audits Assigned` / `Audits Completed`; legend Completed / Pending / Accepted / Declined / Recapture
- **Work Plan**: Agent/Auditor toggle, month picker, compact shift calendar from agents' work plans

## 2. Live Ops (`/admin/live-ops`)

- KPI cards: Total Calls Today (vs target 1,500), Avg Wait Time (vs SLA 60s), Call Drop Rate (alert style >5%, uses `getCallDropRate` fleet-wide), Active Agents ("N on break, M offline")
- Red banner when any partner queue depth >25
- **Hourly Call Volume**: stacked area by partner, 9:00–20:00
- **Queue Depth panel**: per-partner pending pill (red >20), progress bar, wait, completion%
- **Per-partner cards**: wait / completion / drop badge (`High Drop` >5% / `Stable`) / imbalance signal (`Under-utilized (Reallocate)` when depth <10)
- Subtle auto-jitter of numbers every 5s

## 3. Customers (`/admin/customers`)

**Customer Queue** tab — sub-tabs `Waiting (6) / Live (5) / Scheduled (3)`; columns Join Time, Customer Name (avatar), App ID, Partner Name, Customer Type, Assigned Agent, Agent Availability, Waiting Since (live tick). Language chip (Hindi/English) on rows.

**Call History** tab — sub-tabs `All / Direct (Live) / Assigned`; "Showing 1–25 of 64,738 Records" + pagination; search + filters (partner, call status, agent decision, auditor decision, date). Columns: Last Activity Timestamp, App ID, Customer Name, Call Status pill, Duration, Agent Name, Agent Status pill, Agent Decision Timestamp, Purge Status, Product Type, Auditor Name.

Row expands an action bar — implement all:
- **View Details**: drawer with application data + **Application Timeline** — vertical webhook journey (`CREATE_USER → WEBLINK_GENERATED → CALL_SCHEDULED → CUSTOMER_ARRIVED → LOOKING_FOR_AGENT → CALL_INITIATED → CALL_COMPLETED → AUDITOR_DECISION → DMS_PUSH`) from the existing webhook-event data, each node expandable to its JSON payload; DMS node shows "Video + KYC Report pushed to bank DMS — DocumentIndex: NN, CIF: RXXXXXX"
- **Activity Log**: modal table (Timestamp, Name, Role, Action, Section, Call No.), paginated — include the agent's `Ask Question` events
- **View Report**: modal rendering the shared `KycReport` for that call + the Auditor Review block (decision pill, remarks) — same composition the agent Call Log uses
- **View Video**: fake player modal (poster = customer avatar, scrub bar, duration = call duration)
- **Send Weblink / Book a Slot / Report Issue**: confirmation toasts

## 4. Partner Analytics (`/admin/partners`)

Partner filter chips (All + each). Renders: conversion funnel (Queue Entry → Connected → Completed → Review Submitted → Approved, red −N% markers, strictly decreasing); hourly volume multi-line per partner; wait-time histogram (`0–30s / 31–60s / 1–2m / 2m+ — reflect the 120s reroute cap`); success metrics card (Avg WA Attempts, Scheduled vs Walk-in completion); TAT & drop-off table per partner (leads, initiated, completed, approved, avg TAT, drop-off %, sparkline).

## 5. Quality & Compliance (`/admin/quality`)

- KPI cards: Call Audit Score (target 95%), First-Time Approval, Compliance Flags (24h)
- Flag-breakdown donut: Face Mismatch / Geo-tag Issue / VPN Detected / Consent Missing
- Audit Checklist bars: Document Clarity, Liveness Check, Script Adherence, Consent Recording, Geo-tag Confirmation
- **Auditor decisions table**: App ID, Customer, Agent, Agent Decision, Auditor (avatar), Decision pill, Reason (from the shared taxonomy), Remarks, Timestamp; filters by decision + category. Must be the same records the agent's Call Log shows — one data source

## 6. Workforce (`/admin/workforce`)

- KPI cards: Agent Utilization (target 75–85%), Occupancy, Break Adherence
- **Agent Performance Matrix**: Agent (avatar chip), Skills (languages incl. Hindi, partners), Calls, Avg Duration (~3m), Avg Review Time, **Drop Rate %**, **Efficiency score `NN.N` with band color** (reuse `getEfficiencyScore`), Status dot; partner + band filters; click a row → agent detail side panel with the same breakdown popover the agent Analytics uses
- Top Performers / Focus Required rails (by efficiency score, not raw calls)
- Day×Hour heatmap (purple intensity)
- Week-of-month staffing bars with month-end spike highlighted + caption

## 7. Users (`/admin/users`)

Tabs `Agent / Auditor / Admin`; searchable card grid (avatar, name, employee ID). Agent profile page: identity panel (avatar, Priority Assistance toggle, contacts), accordions (Personal Info, Call Support, Branch, Work Plan, Skill Set — languages/product categories/partners, Leaves), right rail Daily Activity donut + Approved/Rejected/Failed. **Add Agent** 3-step wizard (profile/employee → call type, schedule, branch, timings, can-be-auditor → skills: language chips incl. Hindi, product category, branch, partner checkboxes, priority assistance). **Edit Agent** = same wizard prefilled.

## 8. Configure (`/admin/configure`)

Skill-based routing matrix: info note ("values must exactly match the Customer Onboarding API"), rows `Preferred Language / Product Category / Branch Location / Partner Name` × `Mandatory` + `Enabled` toggles; Partner Name ON expands the partner values list (edit/delete/add). Below: "Include Waiting Time in Agent Selection (ETA)" toggle + one-line explanation. Save → success toast. **Also surface (read-only) the `EFFICIENCY_CONFIG` weights** in a "Scoring" card so reviewers see the efficiency definition is configurable.

## 9. Reports (`/admin/reports`)

Report Type dropdown: `Standard MIS Report / Active Users Report / User Productivity Report`. User Productivity opens a modal: date range + column checklist (Date, Name, Username, User Type, Login At, Logout At, Total/Idle/Offline/Busy Duration, Total Breaks, Total/Success/Failed/Pending/Approved Calls — matching the attendance + call fields that actually exist). History table: Request ID, dates, Request Time, Type, Status, Download → **real CSV generated from the mock data**. "Showing 1–10 of 3,211 Records".

## Acceptance

1. `/admin` reachable directly; all 9 sections render with computed (not hardcoded) numbers; no lorem ipsum
2. Call History: timeline, activity log, KYC report (shared component + auditor block), and video modals work from any row
3. Cross-consistency: Dashboard overview counts sum correctly; funnel strictly decreases; Quality's auditor decisions = agent Call Log records; Workforce efficiency = agent Analytics score for the same agent/range
4. Durations everywhere reflect ~3-min calls; drop rates 4–8%; waits <120s
5. Reports download a valid CSV with the selected columns
6. Agent app untouched: full agent regression (login → call → approve → next call) passes; `npm run build` clean
