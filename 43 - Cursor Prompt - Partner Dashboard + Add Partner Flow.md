# Cursor Prompt — Partner Dashboard (new app: `apps/partner`) + Admin "Add Partner User" Flow

> Two deliverables: (A) a partner-user management flow in the **admin** app, (B) a new **partner** app — a strictly scoped subset of the admin dashboard showing only that partner's business. New monorepo app consuming `@vkyc/shared`, same scaffold pattern (Tailwind preset, aliases, `vercel.json` SPA rewrite, logo/favicon).

---

## A. Admin app: Add Partner Users

- Users page gets a fourth tab: **Partner** — table: ID · Name · Email · Phone · Partner · Edit
- **Add Partner User** button → modal: Partner (dropdown of the 5) · Name · Email · Phone → Save → toast: **"Invitation email sent to <email>"** (no real email — toast only) → row appears
- Data: `PartnerUser { id, partnerId, name, email, phone }` in the shared package; **seed one per partner** (realistic, e.g., `ops@niyo.in`, `vkyc@credilio.com`…). Session-added users demo the flow; note in README that cross-app visibility of session-added users is out of scope (no backend) — the partner app authenticates against the **seeded** list

## B. Partner app (`apps/partner`)

### Login & identity
- Shared OTP login, but the email must match a seeded `PartnerUser`; on success the session is **locked to that user's partner** — every selector call in the app passes this fixed `partnerId`. Unknown email → inline error listing nothing (generic "No account found for this email"; put the seeded demo emails in the README, and show them in a small "Demo accounts" hint on the login page for convenience)
- Header: logo · "Hi, <user name>" · partner name chip · avatar. No partner switcher exists anywhere

### Agent masking (strict)
- Partners never see real agent/auditor names. Add a shared display utility `maskStaffName(id, role)` → deterministic `Agent A-14` / `Auditor R-3`. Apply in **every** render site in this app: call history rows, activity logs, KYC report (the report component gets a `maskStaff` prop that the partner app always sets), case tables, reports/CSV exports
- **No dedicated/shared visibility**: anywhere agent allocation appears, show only "Agents assigned: N" — no roster, no badges, no shared/dedicated split

### Sections (sidebar — exactly these five)

**1. Dashboard** — scoped subset of admin Home: KPI cards (Total Calls Today · Avg Wait Time · Call Drop Rate · **Agents Assigned: N** · CSAT) · Call/Customer Conversion cards · today's call summary row (approved/rejected/unable/dropped/in queue/ongoing/in review — their rows from Call Breakdown, no other partners) · hourly call volume (single line) · queue snapshot (their queue's depth/wait). No allocation card, no availability table, no Ops Assistant

**2. Customers** — Customer Queue (3 tabs) + Call History, pre-filtered to the partner: same columns/CTAs/modals as admin (View Details, Activity Log, View Video, View Report) with staff names masked; no Partner column/filter; search + remaining filters work

**3. Analytics** — the Partner Analytics page scoped to one partner: funnel with Calls/Unique toggle · wait + call time histograms · hourly volume · TAT card (their TAT, banded) · CSAT. No cross-partner comparisons anywhere

**4. Rejection & Failure Reasons** — the full R&F page (flow diagram with counts/percentages, status tabs with reason charts, drop stages, cases table) locked to the partner; no partner chips

**5. Reports** — the generate dropdown + filters modal pattern, offering only the partner-scoped types: **Standard MIS Report** (their sessions; masked staff columns) · **Day-wise Calls Report** · **V-KYC Partner Summary** · **Customer Issues Report**. No partner filter in the modal (implicit); history + scheduling per the existing patterns (schedules seeded with their user's email as recipient)

### Scoping guarantee
Route every data access through a `usePartnerScope()` context that injects the partnerId — **no component in this app may call an unscoped selector** (enforce by lint-grep in acceptance: no direct `PARTNERS` iteration, no `PartnerMultiSelect` import)

## Vercel
README: project `vkyc-partner-dashboard`, Root Directory `apps/partner`, defaults otherwise.

## Acceptance

1. Admin: Partner tab lists seeded users; Add flow works with the invitation toast
2. Partner app: login as `ops@niyo.in` → everything everywhere is Niyo-only (spot-check: dashboard numbers = admin's Niyo column in Call Breakdown; R&F diagram = admin's R&F filtered to Niyo)
3. Grep checks: no `PartnerMultiSelect` import, no real agent name renders (search a known agent name in the partner app's rendered routes), no dedicated/shared text anywhere
4. Reports: only the 4 scoped types; generated CSV contains only that partner's rows with masked staff
5. All four apps build clean; agent/admin/auditor behavior unchanged except the new admin Partner tab
