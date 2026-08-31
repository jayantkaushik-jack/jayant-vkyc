# Cashfree Video KYC Demo

Monorepo with five independently deployable Vite apps sharing `@vkyc/shared`.

## Run locally

```bash
npm install
npm run dev:agent     # Agent dashboard    — http://localhost:4000
npm run dev:admin     # Admin dashboard    — http://localhost:4001
npm run dev:auditor   # Auditor dashboard  — http://localhost:4002
npm run dev:partner   # Partner dashboard  — http://localhost:4003
npm run dev:customer  # Customer journey    — http://localhost:4004
```

After login (staff apps):

- **Agent app**: `/agent` (home, queue, call room, performance, knowledge)
- **Admin app**: `/` (dashboard, customers, partners, rejection & failure reasons, productivity, users, configuration, reports)
- **Auditor app**: `/cases` (pending cases queue → case review → analytics)
- **Partner app**: `/dashboard` (dashboard, customers, analytics, rejection & failure reasons, reports — all scoped to the logged-in partner)

**Customer app** (no login): `/journey/:token` — mobile-first Video KYC journey; `/` redirects to a demo token. Add `?demo=1` or triple-tap the logo for the demo control panel.

Build / preview:

```bash
npm run build:agent   && npm run preview:agent
npm run build:admin   && npm run preview:admin
npm run build:auditor && npm run preview:auditor
npm run build:partner && npm run preview:partner
npm run build:customer && npm run preview:customer
```

## Structure

```
apps/agent/          Agent-only UI, routes, AgentContext
apps/admin/          Admin-only UI, routes (no /admin URL prefix)
apps/auditor/        Auditor-only UI — case review queue + analytics (no partner segregation)
apps/partner/        Partner-facing UI — every view scoped to one partner, staff identities masked
apps/customer/       Customer-facing Video KYC journey — mobile-first, self-contained demo (simulated agent)
packages/shared/     Shared components, data, auth, lib, assets
```

Imports from shared code use the `@vkyc/shared/...` alias (configured in each app's Vite + TypeScript config).

## Auditor app (`apps/auditor`)

A fleet-wide audit workspace with **no partner-level segregation** — the auditor sees every partner's cases.

- **Login**: shared OTP login; any email signs in as the seeded auditor identity (the first auditor on the roster).
- **Pending Cases** (`/cases`): fleet-wide queue of agent-approved cases awaiting audit (`auditorDecision === 'In Review'`), sorted oldest-first, with a live-ticking **Waiting** SLA column. The queue count equals the admin app's *In Review* count at seed time (same filter: agent-approved + auditor In Review).
- **Case Review** (`/cases/:id`): split layout — call recording player + case facts on the left, the full shared `KycReport` on the right, and a sticky decision bar. **Approve / Recapture / Reject** each open a modal; submitting records the decision (in-memory, session-scoped) and auto-advances to the next pending case.
- **Analytics** (`/analytics`): KPI cards (Cases Reviewed, Approved, Recapture, Rejected, Avg Decision Time, Pending Queue), decisions-over-time (stacked bar), approval-rate trend (line), and a recent-decisions table. Decisions made this session appear live (tagged `NEW`) alongside the seeded history.

## Partner app (`apps/partner`)

A partner-facing dashboard where **every data access is scoped to a single partner** and **all staff identities are masked**.

- **Login & identity**: shared OTP login; the email must match a seeded `PartnerUser`. The session is locked to that user's partner via `usePartnerScope()`, which injects a fixed `partnerId` into every selector call. Unknown emails get an inline error; the login page lists demo accounts.
- **Agent masking (strict)**: `maskStaffName(id, role)` (in `@vkyc/shared/lib/maskStaff`) maps each staff id to a deterministic pseudonym like `Agent A-14` / `Auditor R-3`. It is applied at every render site (tables, drawers, generated report rows). There is **no** agent-allocation (dedicated/shared) visibility in this app.
- **Sections** (sidebar): Dashboard, Customers, Analytics, Rejection & Failure Reasons, Reports — each a partner-scoped subset of the admin dashboard, pre-filtered to the partner.
- **Reports**: partner-relevant reports only (Standard MIS, Partner Day-wise, Customer Issues), hard-scoped to `partnerId`, with staff columns masked before preview/CSV export.

### Partner demo accounts

Any OTP works. Sign in with one of the seeded partner emails (each locks the session to that partner):

| Email | Partner |
|-------|---------|
| `ops@paisabazaar.com` | Paisabazaar |
| `vkyc@credilio.com` | Credilio |
| `ops@niyo.in` | Niyo |
| `vkyc@zet.app` | ZET |
| `desk@sbm-direct.in` | GENERAL |

> **Add Partner User flow (admin app):** the admin *Users → Partner* tab can add partner users, which shows an "Invitation email sent" toast and adds the row for the session. This is a **demo-only** flow — no email is sent and, because there is no backend, session-added users are **not** visible across apps. The partner app authenticates against the seeded partner-user directory above.

## Vercel deployment

Create **five Vercel projects** from the same Git repository:

| Project | Root Directory | Example URL |
|---------|----------------|-------------|
| `vkyc-agent` | `apps/agent` | e.g. agent.yourdomain.com |
| `vkyc-admin` | `apps/admin` | e.g. admin.yourdomain.com |
| `vkyc-auditor-dashboard` | `apps/auditor` | e.g. auditor.yourdomain.com |
| `vkyc-partner-dashboard` | `apps/partner` | e.g. partner.yourdomain.com |
| `vkyc-customer-journey` | `apps/customer` | e.g. vkyc.yourdomain.com |

### Project settings (each app)

| Setting | Value |
|---------|-------|
| Framework Preset | **Vite** (auto-detected) |
| Root Directory | `apps/agent`, `apps/admin`, `apps/auditor`, `apps/partner`, or `apps/customer` |
| Install Command | `cd ../.. && npm install` (workspaces resolve from the repo root) |
| Build Command | `npm run build` (default; runs in the app directory) |
| Output Directory | `dist` |

Each app ships a `vercel.json` with SPA rewrites so deep links (`/login`, `/customers`, `/productivity/:id`, etc.) serve `index.html` instead of 404ing:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Ignored Build Step (optional)

To skip rebuilding an app when neither it nor `packages/shared` changed, set **Project Settings → Git → Ignored Build Step** to:

```bash
npm run vercel-ignore
```

That script exits `0` (skip) when the diff is empty for `packages/shared` + the app folder, or `1` (build) when something relevant changed.

### HTTPS / camera

Vercel serves HTTPS by default, so camera features (device check, live call video, captures) work on the deployed agent URL the same way they do on localhost. Camera still requires the user to grant permission; denied/unavailable falls back to demo assets.

## Camera

Live webcam capture is supported when the browser grants camera permission. Camera access requires **localhost** or **HTTPS**.

- **Device Check**: requests the camera when the modal opens; shows a live preview when permitted.
- **Call room**: streams live video when active; face / PAN / signature captures use real frames cropped to the guide bounds.
- **Fallback**: if permission is denied or no camera is available, the demo uses simulated video and demo assets. A **Simulated** chip appears on the video panel.

Avatar circles across all dashboards use deterministic DiceBear illustrations (no network calls). In-call capture simulation assets remain photographic for face-match realism.

Test: This is a comment by Suhrud.
