# Cursor Prompt 1 of 2 — Cashfree VKYC Demo: Foundation + Agent Dashboard

> Paste this entire prompt into Cursor. Prompt 2 (Admin Dashboard) builds on the same repo, so complete this one first.

---

## Context

You are building a high-fidelity demo of Cashfree Payments' Video KYC (VKYC) platform for a bank evaluation. The demo has two personas — **Agent** and **Admin** — in a single React app. This prompt covers the project foundation, the shared design system, the mock data layer, and the complete **Agent Dashboard**. The Admin Dashboard comes in a follow-up prompt and must reuse everything built here.

This is a demo with mock data only — no real backend, no real APIs. But it must *feel* like a production banking product: polished, dense with realistic data, and fully clickable.

## Tech stack

- Vite + React 18+ + TypeScript
- Tailwind CSS
- React Router (routes: `/login`, `/agent/*`, `/admin/*` — admin added later)
- Recharts for charts, lucide-react for icons
- No state library needed; React context + hooks are fine
- All mock data generated with a **seeded** RNG (same data every load — important for demos)

## Design system (Cashfree theme — apply strictly)

Light theme throughout. Define these as Tailwind theme tokens:

- `brand-950: #24004B` — deep purple, used for hero/login left panel and dark video surfaces
- `primary: #6434D6` (hover `#5527C0`) — buttons, active states, links, focus rings
- `primary-soft: #F3EFFB` — selected/active backgrounds, highlights
- `bg: #F8F7FC` — app background; agent workspace uses a subtle grid-paper pattern (faint 24px grid lines, like graph paper) on this background
- `surface: #FFFFFF` — cards, always `rounded-xl`, border `#EBE8F2`, very soft shadow
- `text: #1A1523`, `text-muted: #6F6A7D`
- `success: #22A06B`, `danger: #E5484D`, `warning: #F5A623`
- Font: Inter (Google Fonts), 14px base; headings semibold, generous whitespace
- Header on every screen: **Cashfree Payments logo (green leaf mark + wordmark) | "Video KYC"** on white, thin bottom border. Cashfree branding only — no bank co-branding.
- Buttons: primary = filled purple, pill-ish `rounded-lg`; secondary = white with border; destructive = filled red. Green filled button only for "Accept Call".
- Status pills: rounded-full, soft background + strong text color (e.g., `Passed` green, `Failed` red, `Pending` gray, `Weak/Average/Strong` network badge in red/amber/green)

## Mock data layer (`src/data/`)

Build once, share across agent and admin:

- **Partners**: `Paisabazaar`, `Credilio`, `Niyo`, `ZET`, `GENERAL` (direct channel)
- **Customers/applications**: generator producing Indian names, app IDs in format `SBM_<PARTNERCODE>_<10 digits>` (e.g., `SBM_CRL_5517874243`), product types like `CRL_SC_FD`, `ZET_KC_RS`, `SMT_CIP`, customer status `New/ETB`, phone, email, DOB, gender, father's name, current + permanent address (realistic Indian addresses), Aadhaar data (masked, last 4 digits), PAN number
- **Agents**: 67 agents with names, employee IDs (`AS002001`), manager, branch, skills (languages, partners, product categories), work plan (Mon–Sun, office 09:00–18:00, break 13:00–14:00)
- **Auditors**: 19 auditors
- **Calls**: ~400 historical call records per agent spread over 90 days: partner, duration (5–12 min), customer wait time (10–300s), review time (30–180s), agent decision (`approved/rejected/failed`), auditor decision (`accepted/rejected/recapture` + reason + remarks), timestamps
- **Webhook events** per application, in order: `CREATE_USER → WEBLINK_GENERATED → CALL_SCHEDULED → CUSTOMER_ARRIVED → LOOKING_FOR_AGENT → CALL_INITIATED → CALL_COMPLETED → AUDITOR_DECISION → DMS_PUSH` with realistic payload objects (transactionId, requestId, agentId, agentUserName, sessionId, timeStamp — matching a real VKYC webhook contract)
- **Auditor rejection reasons** (use these exact strings): `Face Match Failed`, `PAN OCR or Verification Failed`, `Poor Internet Connection`, `Low or Dim Lighting`, `Poor Camera Quality`, `Liveness Check Failed`, `Signature Mismatch`, `Location Outside India`
- Helper selectors: `getAgentStats(agentId, range)` computing calls taken/approved/rejected, approval rate, avg call time, avg wait, avg review time, **efficiency** and **accuracy**

**Metric definitions (show as ⓘ tooltips wherever displayed):**
- Efficiency = calls handled ÷ productive hours (login − break − idle), vs target of 6 calls/hr
- Accuracy = % of agent decisions upheld by auditor (1 − overturn rate)

## Agent Dashboard — screens & flows

### 1. Login (`/login`)
Split screen. Left 40%: deep purple `brand-950` panel with large Cashfree logo and subtle circular pattern. Right: white, centered card — "Login", "Registered Work Email Address" input, then OTP step ("Enter OTP sent to your email", 6-digit, "Didn't Receive OTP? Resend in 00:30" countdown, purple Login button, Back link). Any email/OTP works. After login show a small role picker (Agent / Admin) — demo convenience.

### 2. Agent Home (`/agent`) — stats + go online
Two-column layout:
- **Left (main)**: greeting ("Good morning, Sumit") + today's headline stats as 5 stat cards: `Calls Taken`, `Approved`, `Rejected`, `Avg Call Time`, `My Accuracy` (with ⓘ tooltip). Below: **"Go Online" hero card** — large circle with "HOVER TO GO ONLINE" interaction (hover reveals green button, click opens device check)
- **Right rail**: `Knowledge Centre` card with "Agent Reference Docs" row (chevron, opens nothing real); status chip (Offline/Online/On Break); link card "View My Performance →" to `/agent/performance`
- **Device check modal** (before going online): webcam preview placeholder (dark purple frame with "Strong" network badge), Microphone/Speaker/Camera dropdowns, Cancel + purple "Go Online"

### 3. Waiting state (`/agent/queue`)
Centered breathing circle animation ("breathe in" pulsing ring) with "Waiting for next customer…", Online toggle top-right, Knowledge Centre rail persists. After 4–6 seconds, auto-trigger an incoming call.

### 4. Incoming call
Card replaces the circle: avatar initials, customer name, "Waiting since 02:00" (live counting), green **Accept Call**, red-outline **Reject**. Below: "Next Up…" strip — "1 customers waiting in the queue". Accepting navigates to the call room.

### 5. Call room (`/agent/call/:id`) — the core screen
Layout: **left ~40% video panel, right ~60% step workspace.**

**Video panel** (dark surface, rounded): simulated customer video — use a looping muted placeholder video or animated gradient with avatar; small agent PIP bottom-right; top-left network badge cycling `Weak/Average/Strong`; top-right call timer counting up; occasional banner "«Customer» is on mute"; footer controls: `Reconnect`, kebab menu, mic, camera, red `End Call`. Left edge: tiny icon rail (person, location pin, alert) hinting at quick panels.

**Step workspace**: horizontal stepper across the top with 7 steps, each an icon + label, states pending (gray) / active (purple ring) / passed (green check) / failed (red):

`Check Liveliness → Check Location → Capture Face → Check Aadhaar → Check PAN → Capture Sign → Report`

**Step 0 — Customer Details (pre-check, before stepper begins):** "Language selected by customer: English"; three confirmation checks with icon buttons — `Clear View`, `Audible`, `Video Visibility`; customer details card (Name, Gender, DOB, Father's Name, Mobile, Email, Current Address, Permanent Address, Product Type, Customer Status, App ID, Partner). Purple `Proceed` button starts the stepper.

**Step 1 — Check Liveliness:** scripted Q&A list: "What is your occupation?" (answer chip), "What is your annual income?", "Read the 6-digit text seen on your screen" (show large code e.g. `8 4 2 2` overlaid on the video panel too). Each question row has ✓ Correct / ✗ Wrong buttons + "Ask again" + optional remark input. All three correct → step passes.

**Step 2 — Check Location:** static map snippet (use a map-looking SVG/image, pin at coords), Location Details grid: Lat/Long, City, State, Pincode, District, Country; IP details: IP address, "SAFE IP Address — VPN and Proxy Not Detected | Inside India" green banner; distance chips: "Live ↔ Current addr: 4.1 km", "Live ↔ Permanent addr: 812 km".

**Step 3 — Capture Face:** oval face-guide overlay on the video; `Capture` button freezes a frame into a "Captured face" card on the right with Retake; auto "Face captured successfully" toast.

**Step 4 — Check Aadhaar (eKYC compare):** two-column field-by-field comparison — Application Form Data vs Aadhaar Data — rows: Name, DOB, Gender, Father's Name, Current Address, Permanent Address, Mobile, Email, Masked Aadhaar (`XXXX XXXX 2242`), Generation Date. Matching rows highlighted soft green with match % (e.g., `100%`, address `93.2%`); plus a face-match card: captured face vs Aadhaar photo, "Match Score: 93.53%", "Does the face match with the Aadhaar Photo?" ✓/✗.

**Step 5 — Check PAN:** instruction card "Ask the customer to keep their PAN card on a table…"; `Flip Camera` + `Capture PAN Card` buttons; captured card image → OCR-filled form (PAN No, Name, Father's Name, DOB) with `Confirm`; verification table: User Detail | Application Form Data | PAN Data | Match (green ticks / %); face-match with PAN photo card ("Match Score: 60.62%" amber if <75).

**Step 6 — Capture Sign:** "Ask the customer to sign on a blank paper and show it"; capture → signature image card, Recapture / Looks Good.

**Step 7 — Report (decision):** summary of all sections with Passed/Failed pills; agent remarks textarea; buttons: red `Reject`, gray `Unable to Verify`, green `Approve`. Reject/Unable open a **"What happened?"** modal: Select Reason dropdown (use the auditor rejection reasons list) + Remarks + confirm. Approve shows success state → "Report & video pushed to bank DMS ✓" line item → auto-return to Waiting state after 3s.

**Always available during call:** "Facing an issue during the call?" modal (triggered from kebab menu): radio list — `Technical Issue`, `Phone Related Issue`, `Customer Related Issue`, `Document Related Issue`, `Suspicious Customer`, `Agent Induced Rejection` — with note field, `Notify & End Call`.

**Webhook toasts (demo storytelling):** small bottom-left toasts firing at the right moments: `event: CUSTOMER_ARRIVED`, `event: CALL_INITIATED`, `event: CALL_COMPLETED — agentStatus: approved`, `event: DMS_PUSH — DocumentIndex: 78`. Style them like tiny JSON chips.

### 6. My Performance (`/agent/performance`)
Filters row: date range presets (Today / 7D / 30D / 90D / custom), partner multi-select.
- **KPI cards**: Calls Taken, Approved, Rejected, Approval Rate, Efficiency (vs 6/hr target), Accuracy, Avg Call Time, Avg Customer Wait, Avg Review Time — each with ⓘ tooltip
- **Attendance table** (by day): Login At, Logout At, Total Online, Total Break, Idle Time, Adherence % (color-coded)
- **Auditor Outcomes table**: my calls that auditors reviewed — App ID, Customer, My Decision, Auditor Decision (accepted/rejected/recapture pill), **Reason**, Auditor Remarks, Date. Filterable to "Overturned only" — this is the accuracy drill-down
- **Trend charts**: calls/day stacked by decision (bar), accuracy % over time (line vs 95% target), avg call time over time (line)

### 7. Status management
Global header (agent screens): status dropdown `Online / On Break / Offline`. Going on break starts a visible break timer chip; data layer logs it into today's attendance.

## Acceptance criteria

1. `npm run dev` works; `/login → /agent` flow is fully clickable end-to-end: login → go online → device check → waiting → incoming call → accept → all 7 steps → approve → back to waiting
2. Every step renders realistic pre-filled data from the mock layer — no lorem ipsum anywhere
3. Stepper state machine enforced: can't jump ahead; passed steps show green; report reflects actual pass/fail choices made
4. My Performance numbers derive from the seeded call history (recompute on filter change), not hardcoded
5. Cashfree theme applied consistently; no dark-mode remnants; desktop-optimized (≥1280px), with a "best viewed on desktop" overlay under 1024px
6. Timers, breathing animation, webhook toasts, and network-badge cycling all animate smoothly

Structure code as `src/{app,components,features/{auth,agent},data,lib}` with small composable components — the admin build (next prompt) will reuse the design system, layout primitives, and data layer.
