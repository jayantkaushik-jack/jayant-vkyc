# Cursor Prompt — Auditor Dashboard (new app: `apps/auditor`)

> New monorepo app consuming `@vkyc/shared` — same pattern as agent/admin (Vite + TS + Tailwind preset, shared auth, components, data). No partner-level segregation anywhere in this app. Read the shared package's exports before starting; extend, don't fork.

---

## Scaffold

- `apps/auditor`: identical setup to the other apps (Tailwind preset, aliases, `vercel.json` with the SPA rewrite, favicon + logo)
- **Login**: shared OTP login; any email logs in as a seeded auditor identity (use the first auditor from the roster; show her name/avatar in the header — "Hi, <name>")
- Shell: slim sidebar — **Pending Cases** · **Analytics**; same top bar pattern (logo, greeting, avatar)

## 1. Pending Cases (`/cases`)

Queue of all `In Review` cases (agent-approved, awaiting audit), fleet-wide:

- Header: "Pending Cases (N)" + date received filter; sorted **oldest first** (FIFO)
- Columns: Received At · App ID · Customer (avatar + name) · Agent · Call Duration · **Waiting** (live-ticking since agent approval; amber >4h, red >8h — SLA aging)
- No partner column, no partner filter (per requirements)
- Row click → Case Review

## 2. Case Review (`/cases/:id`)

Split layout, the auditor's core workspace:

- **Left (~45%)**: the call **video player** — reuse `RecordingPoster` composition (customer image + agent PIP + play overlay), scrub bar, duration; below it: case facts card (App ID, customer, agent, call time, duration, attempt number + previous-attempt context if any)
- **Right (~55%)**: the full shared **`KycReport`** rendered for the case (scrollable)
- **Sticky decision bar** (bottom): three buttons — green **Approve** · amber **Recapture** · red **Reject**
  - Approve → confirm modal (optional remarks)
  - Recapture → modal with **capture-quality reasons** (from the taxonomy's unable/capture-quality subset: low light, poor camera, capture quality unacceptable, signature unclear…) + remarks
  - Reject → modal with **rejected-class reasons** (the taxonomy's rejected list, category accordions) + remarks
- On submit: toast, case leaves the pending queue (session state), decision + reason + remarks recorded, and the view **auto-advances to the next pending case** ("Next case loaded" — keeps the review flow moving); "Back to queue" link always available
- Decisions persist for the session and feed Analytics immediately

## 3. Analytics (`/analytics`)

For the logged-in auditor, with date presets (Today / 7D / 30D / 90D):

- KPI cards: **Cases Reviewed** · **Approved** · **Recapture** · **Rejected** · **Avg Decision Time** (mock 2–6 min + session-measured for live decisions) · **Pending Queue** (current N, fleet)
- **Decisions over time**: stacked bar (per day; hourly for Today) by decision
- **Approval rate trend**: line vs a 90% guide
- Recent decisions table: Decided At · App ID · Customer · Decision pill · Reason · Remarks
- Data: seeded history for this auditor + session decisions appended live

## Consistency & Vercel

- The pending queue must equal the admin app's In Review count at seed time (same selector); session decisions are app-local (no backend — note this in the README)
- Deploy notes in README: Vercel project `vkyc-auditor-dashboard`, Root Directory `apps/auditor`, defaults otherwise

## Acceptance

1. Login → pending queue (oldest first, aging chips) → open case → video + full report render → submit each of the three decisions on different cases → queue count drops, analytics KPIs and charts update live, auto-advance works
2. Recapture modal offers only capture-quality reasons; Reject only rejected-class reasons
3. No partner name, column, or filter anywhere in the app
4. `npm run build` passes for all apps; agent/admin untouched
