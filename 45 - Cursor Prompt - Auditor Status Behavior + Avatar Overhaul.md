# Cursor Prompt — Auditor: Online/Break/Offline Behavior + Professional Avatars (All Apps)

> Three changes: auditor session-status behavior mirroring the agent app, an avatar system overhaul across all four apps, and a table label fix. Reuse the agent app's status components by moving them to the shared package — don't reimplement.

---

## 1. Auditor: Go Online / Break / Offline behavior + metrics

Port the agent app's status system to the auditor app:

- **Extract to `@vkyc/shared`** (if not already): the status context pattern (online/on_break/offline with session accounting — loginAt, accumulated break, logged-in/break tickers), the header status cluster (Logged in · Break · status dropdown), and the status cards (Go Online hero, On-a-Break card with live timer + Resume, Offline session-summary card). Re-wire the agent app to the shared versions with zero behavior change
- **Auditor home/queue behavior**:
  - Offline (no session): **Go Online hero** ("Ready to review cases?"); the Pending Cases list is visible but rows are not openable until online (lock icon + tooltip "Go online to start reviewing")
  - Online: full functionality; header shows Logged-in time · Break time · status dropdown (same cluster as agent)
  - On Break: case review locked, On-a-Break card with live timer + Resume; break time accrues
  - Offline after a session: session-summary card (went online at, total active, total break, went offline at)
- **Metrics additions** (auditor Analytics): add **Avg Hours Online** and **Avg Break Time** KPI cards (from the auditor's attendance accounting — extend the generator with auditor attendance mirroring agent attendance); Avg Decision Time stays

## 2. Professional avatars across ALL dashboards

Replace the internet photo portraits (randomuser.me) with generated professional avatars:

- Use **DiceBear via the npm package** (`@dicebear/core` + `@dicebear/collection`) — generate SVG avatars **locally and deterministically** from each person's id (no network calls at runtime). Style: `notionists` (or `personas`) — clean, professional, illustration-style; consistent background palette drawn from the Cashfree theme (soft lavenders/purples)
- Update `getAvatarUrl`/avatar utility in `@vkyc/shared` to the generator; **respect gender** where styles support it, else neutral. Same person = same avatar in every app
- Apply everywhere avatar circles render: agents, auditors, admins, partner users, and **customers** in tables/queues/headers/rosters/incoming-call cards across agent, admin, auditor, partner apps
- Delete `public/avatars/*` photo files + the fetch script; `grep randomuser` returns nothing
- **Scope note (state in code comment)**: the in-call capture simulation assets (`demo/face-live.jpg`, Aadhaar/PAN photo crops, recording poster face) remain photographic — face-match scores against an illustrated avatar would break the VKYC realism. Only avatar *circles* change

## 3. Label fix

Auditor Analytics → Recent Decisions table: rename the "Decided At" column to **"Time"** (value/format unchanged).

## Acceptance

1. Auditor app: full status lifecycle works (hero → online → review cases → break locks review with timer → resume → offline shows session summary); header cluster ticks; Pending rows locked when not online
2. Agent app behaves identically to before the extraction (full regression of its status flows)
3. Auditor Analytics shows Avg Hours Online + Avg Break Time computed from auditor attendance
4. Every avatar circle in all four apps is a deterministic professional illustration (same person identical across apps); no randomuser assets or references remain; capture-simulation images unchanged
5. Recent Decisions column reads "Time"
6. All four apps build clean
