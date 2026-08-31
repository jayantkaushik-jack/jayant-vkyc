# Cursor Prompt 2 of 2 — Cashfree VKYC Demo: Admin Dashboard

> Run this in the same repo after Prompt 1 (Foundation + Agent Dashboard) is complete. Reuse the design system, layout primitives, and mock data layer already built — do not restyle or fork them.

---

## Context

Add the **Admin Dashboard** persona to the Cashfree VKYC demo at `/admin/*`. The admin console is what a bank's product, operations, and quality teams use to run the VKYC operation. It must match the Cashfree light purple theme everywhere (including all analytics screens — no dark theme), and be dense with realistic seeded data.

Selecting "Admin" in the post-login role picker lands on `/admin`.

## Shell

Left sidebar (collapsible, icons + labels), Cashfree logo | "Video KYC" header with admin name/avatar top-right:

1. `Dashboard`
2. `Live Ops`
3. `Customers`
4. `Partner Analytics`
5. `Quality & Compliance`
6. `Workforce`
7. `Users`
8. `Configure`
9. `Reports`

Active item: purple fill. Sidebar footer: "System Status" mini-card — green pulse dot, "All queues operational. Niyo queue latency detected."

## 1. Dashboard (`/admin`)

Top: data-view selector ("Unique customer level" dropdown) — cosmetic.

- **Agent Overview card**: Total Onboarded Agents (67), Present Agents (48) with sub-line `Online 39 | Offline 19 | Logged Out 09`; Online Agents (39) sub-line `Busy 04 | Idle 35`; Busy Agents (04) sub-line `Assigned Call 01 | On Call 02 | On Report 01`
- **Auditor Overview card**: same pattern for 19 auditors (Present, Online, Busy 07)
- **Agent Summary**: Daily/Weekly/Monthly toggle + month label; two donuts — `Total Calls Initiated: 8,027` and `Total Success Calls: 7,250`; legend: Success 7,250 · Failed 777 · Approved 5,932 · Rejected 8 · On Hold 1,310
- **Auditor Summary**: donuts `Total Audits Assigned: 5,332`, `Total Audits Completed: 5,282`; legend: Completed · Pending 50 · Accepted 5,232 · Declined 50 · Recapture
- **Work Plan**: Agent/Auditor tab toggle, month picker, compact calendar grid of shifts (mock)

## 2. Live Ops (`/admin/live-ops`) — real-time ops wall (light theme)

- KPI cards: `Total Calls Today: 1,248` (Target 1,500, +12%), `Avg Wait Time: 58s` (SLA 60s), `Call Drop Rate: 4.2%` (red alert style when >4%), `Active Agents: 38` ("4 on break, 8 offline")
- Alert banner when any queue depth >25: red "Critical Queue Alert — Niyo"
- **Hourly Call Volume**: stacked area chart 9:00–20:00 by partner (Paisabazaar, Credilio, Niyo, ZET)
- **Queue Depth panel**: per-partner rows — pending count pill (red >20), progress bar, `Wait: 185s`, `Completion: 76%`
- **Per-partner queue cards**: Wait Time, Completion, drop-rate badge (`High Drop` red / `Stable` green), "Queue Imbalance Signal" — `Under-utilized (Reallocate)` amber or `Optimal Load`
- Auto-refresh feel: numbers jitter slightly every 5s

## 3. Customers (`/admin/customers`)

Two tabs, mirroring an ops queue console:

**Customer Queue** — sub-tabs `Waiting (6)` / `Live (5)` / `Scheduled (3)`. Columns: Join Time, Customer Name, App ID, Partner Name, Customer Type, Assigned Agent, Agent Availability, Waiting Since (live). Search icon right.

**Call History** — sub-tabs `All` / `Direct (Live)` / `Assigned`; header states "Showing 1–25 of 64,738 Records" with pagination; search + filter + export icons. Columns: Last Activity Timestamp, App ID, Customer Name, Call Status (`Success` green / `Failed` red pill), Duration, Agent Name, Agent Status (`Approved`/`Rejected` pill), Agent Decision Timestamp, Purge Status, Product Type, Auditor Name.

Row click expands an **action bar**: `View Details · Activity Log · Send Weblink · Book a Slot · View Video · View Report · Report Issue`. Implement:

- **View Details**: drawer with full application data + **Application Timeline** — vertical event stepper of the webhook journey `CREATE_USER → WEBLINK_GENERATED → CALL_SCHEDULED → CUSTOMER_ARRIVED → LOOKING_FOR_AGENT → CALL_INITIATED → CALL_COMPLETED → AUDITOR_DECISION → DMS_PUSH`, each with timestamp and expandable JSON payload chip (transactionId, requestId, sessionId, agentUserName…). DMS_PUSH node shows "Video + KYC Report pushed to bank DMS — DocumentIndex: 78, CIF: R001717"
- **Activity Log**: modal table — Timestamp, Name, Role (Agent/Customer/System), Action ("Customer accepted Terms and Conditions", "Agent asked first question", "Location captured with domain…"), Section, Call No.; paginated
- **View Report**: the **KYC Report modal** — downloadable-looking document: Customer Details match table (User Detail | Application Form Data | Aadhaar Data (XXXX XXXX 2242) | PAN Details | Match % per row, green highlights); Face Match with Aadhaar (score 93.53% — Yes) and with PAN (60.62% — amber) with photo thumbnails; Captured Signature image; Location Check block (lat/long, address, "SAFE IP — VPN and Proxy Not Detected | Inside India"); Liveness Check Q&A with Correct ticks; Verifying Agent's Status — Approved + remarks; Browser & IP Details (IP country, browser, version, OS); Additional Details (Customer Status ETB, Product Type, Branch)
- **View Video**: modal with fake player ("Video Recording (1/2)", scrub bar)
- **Send Weblink / Book a Slot / Report Issue**: toast confirmations ("Weblink sent via SMS & WhatsApp")

## 4. Partner Analytics (`/admin/partners`)

Partner filter (All / each). Per selection:
- **Conversion funnel**: Queue Entry 1,200 → Call Connected 1,050 → Call Completed 920 → Review Submitted 915 → VKYC Approved 840, horizontal bars with red "−N% drop" markers between stages
- **Volume trend per partner**: multi-line hourly chart
- **Wait Time Distribution**: histogram buckets `0–30s / 31–60s / 1–2m / 2–5m / 5m+`
- **Success metrics card**: Avg Attempts (WA) 1.4, Scheduled Completion 94%, Walk-in Completion 78%
- **TAT & drop-off table** by partner: leads received, VKYC initiated, completed, approved, avg TAT (lead→approved), drop-off %, trend sparkline

## 5. Quality & Compliance (`/admin/quality`)

- KPI cards: `Call Audit Score 92.4%` (target 95), `First-Time Approval 88.1%` ("11.9% re-review"), `Compliance Flags 14` (last 24h)
- **Compliance Flag Breakdown** donut: Face Mismatch 4, Geo-tag Issue 5, VPN Detected 2, Consent Missing 3
- **Audit Checklist Performance** bars: Document Clarity 98, Liveness Check 95, Script Adherence 89, Consent Recording 100, Geo-tag Confirmation 92 (amber <90)
- **Auditor decisions table**: App ID, Customer, Agent, Agent Decision, Auditor, Auditor Decision pill (accepted/rejected/recapture), Reason, Remarks, Timestamp — filter by decision + reason; this powers agent "accuracy" stories

## 6. Workforce (`/admin/workforce`)

- KPI cards: Agent Utilization 82% (target 75–85%), Occupancy 89%, Break Adherence 94%
- **Agent Performance Matrix**: table of agents — Agent (avatar chip), Partner skills, Calls, Avg Duration, Review Time, Adherence % pill, Status dot (Active/Break/Unavailable); partner filter; "View all 67" footer
- Side rails: **Top Performers** (top 5 by calls) and **Focus Required** (bottom 5, with WA attempts)
- **Heatmap**: call volume by Day × Hour (Mon–Sun × 9:00–20:00), purple intensity scale, hover tooltip
- **Week-of-Month Staffing Trend** bars: W1 8,500 → W4 14,800 with the month-end spike highlighted red + caption "*Month-end spike requires ~20% additional staffing*"

## 7. Users (`/admin/users`)

Tabs: `Agent` / `Auditor` / `Admin`. "Total Agents: 67", searchable card grid (name + employee ID).

- **Agent profile page**: left identity panel (avatar, name, Priority Assistance toggle, phone, email, "Active since", last updated); accordions — Personal Information (Employee ID, Agent Manager ID/Name/Email), Call Support, Branch Information, Work Plan (working days, office timings 09:00–18:00, break 13:00–14:00), Agent Skill Set (languages, product categories, partners), Leaves; right: Daily Activity donut (Total Calls) + Approved/Rejected/Failed counts, month selector
- **Add Agent**: 3-step wizard modal — (1) Employee ID, photo, manager ID/name/email, mobile, email, Agent VCIP Trained Y/N, training completion date, username; (2) Agent Call Type, Schedule Type, Branch ID, Location, Region, Work Plan, Office/Break timings, "Agent can be Auditor" Y/N; (3) skill selection — language chips (English, Hindi, Marathi…), product category, branch, **partner checkboxes (Paisabazaar / Credilio / Niyo / ZET / GENERAL)**, Priority Assistance Y/N → Done adds card
- **Edit Agent**: same wizard prefilled

## 8. Configure (`/admin/configure`)

**Skill-based routing matrix** — the differentiated ops feature:
- Yellow info note: "Ensure that skill values entered in the admin dashboard exactly match the values passed in the Customer Onboarding API."
- Table: S.No | Skill Set (`Preferred Language`, `Product Category`, `Branch Location`, `Partner Name`) | Mandatory (No/Yes toggle) | Enabled (No/Yes toggle). Partner Name row toggled ON (green) expands **partner values list**: Paisabazaar / Credilio / Niyo / ZET / GENERAL with edit/delete icons + "Add value"
- Below: "Include Waiting Time in Agent Selection (ETA)" toggle + explanation line
- Save button with success toast

## 9. Reports (`/admin/reports`)

- **Usage Report** generator: Report Type dropdown — `Standard MIS Report`, `Active Users Report`, `User Productivity Report`
- Picking **User Productivity Report** opens modal: date-range picker + data-column checklist (S.No, Date, Name, Username, User Type, Login At, Logout At, Total Duration, Idle Duration, Offline Duration, Busy Duration, Total Breaks, Total Calls, Success Calls, Failed Calls, Pending Calls, Approved Calls) + Submit
- **History table**: Request ID (uuid), Start Date, End Date, Request Time, Report Type, Status (`Completed` green), Action (Download icon → downloads a small real CSV generated from mock data). "Showing 1–10 of 3,211 Records"

## Acceptance criteria

1. All 9 sections reachable and fully rendered with seeded data; no empty screens, no lorem ipsum
2. Call History → View Details timeline, Activity Log, KYC Report, and video modals all work from any row
3. The webhook timeline and DMS push node tell the integration story end-to-end (lead → weblink → call → audit → DMS)
4. Everything is light Cashfree theme — consistent with the agent app; charts use purple-family palette + partner accent colors; desktop-optimized with the same <1024px overlay
5. Numbers are internally consistent (e.g., agent overview counts sum correctly; funnel stages strictly decrease; auditor decisions in Quality match the ones shown in agent Performance)
6. Reports actually download a CSV assembled from the mock data layer

Keep the code in `src/features/admin/*`, reusing `src/components` and `src/data` from the agent build.
