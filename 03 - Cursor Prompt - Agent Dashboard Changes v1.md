# Cursor Prompt — Agent Dashboard: Change Request v1

> Apply to the existing repo (`Agent_Admin_Dashboard_Implementation`). These are 6 targeted changes to the agent app only. Do not touch the call-flow steps, data generators, or theme tokens except where stated. Keep the Cashfree light theme and existing component conventions (`Card`, `StatCard`, `StatusPill`, `Button`, `cn`).

---

## Change 1 — Add an agent sidebar

Create `src/components/layout/AgentSidebar.tsx` and mount it in `AgentLayout.tsx` (fixed left, ~232px, white surface, right border; content area gets `pl-[232px]`). Nav items top-to-bottom, each icon + label, active = purple fill like the admin sidebar pattern:

1. **Home** → `/agent` (lucide `House`)
2. **Profile** → `/agent/profile` (lucide `UserRound`) — new route + page: identity card (avatar initials, name, employee ID, email, phone), and read-only accordions reusing mock agent data: Personal Information (manager name/ID/email), Branch Information, Work Plan (working days, office timings, break timings), Skill Set (languages, product categories — **do not list partner names here**), Leaves
3. **Analytics** → `/agent/performance` (lucide `ChartLine`) — rename all visible "My Performance" labels to "Analytics" (page heading + any links); route path can stay `/agent/performance`
4. **Knowledge Center** → `/agent/knowledge` (lucide `BookOpen`) — new page: grid of document cards (Agent Reference Docs, VKYC Script, Rejection Reason Guide, Compliance Do's & Don'ts), each with icon + title + fake "Updated N days ago"; clicking shows a toast "Opening document…"

Register the new routes in `src/app/routes.tsx` under the protected `/agent` layout. Sidebar hides on `/agent/call/:id` (call room stays full-width).

## Change 2 — Top bar: logged-in time, break time, status

In `src/components/layout/Header.tsx`, add a center-right cluster (before the status control):

- `Logged in: 4h 12m` — today's cumulative online time, ticking every second while status ≠ offline
- `Break: 32m` — today's cumulative break time, ticking while on break (replaces the current one-off `Break 00:12` pill; carry accumulated break time forward when returning online instead of resetting)
- Current status pill + dropdown (Online / On Break / Offline) — keep existing behavior

Implementation: extend `AgentContext` with session accounting — `loginAt` (set on login), `accumulatedBreakSec`, `breakStartedAt` — and expose `getLoggedInSec()` / `getBreakSec()` helpers. Seed `loginAt` to ~9:00 AM today so the demo shows a realistic value immediately. Separate the three items with thin vertical dividers; label text in `text-text-muted`, values semibold.

## Change 3 — Fix: "Go Online" button not clickable

In `src/features/agent/components/DeviceCheckModal.tsx` (`GoOnlineCard`): remove the hover-gated reveal — it currently renders the button only while `hovered` is true, which makes it flaky/unclickable. Replace with an always-visible, always-clickable control:

- The entire circle is one `<button>` — pulsing ring animation, "GO ONLINE" text inside, hover just scales it slightly (`hover:scale-105`) and fills soft green
- Click → opens the existing `DeviceCheckModal`; modal's "Go Online" confirm already sets status online and navigates to `/agent/queue` → incoming call → call room. Verify this full path works end-to-end and nothing intercepts pointer events (check for overlay/`pointer-events` issues on the decorative rings — decorative layers must have `pointer-events-none`)

## Change 4 — Remove Knowledge Centre from Home's right rail

In `src/features/agent/AgentHomePage.tsx`: delete the `<KnowledgeCentre />` right rail (it now lives in the sidebar as its own section). Home becomes single-column (`max-w-[1100px]`): greeting → today's stat cards → Go Online card. Keep `src/components/layout/KnowledgeCentre.tsx` only if the Queue page still uses it; otherwise delete the component.

## Change 5 — Analytics: efficiency + accuracy as topline, everything else in a subsection

Restructure `src/features/agent/PerformancePage.tsx`:

- **Topline row** (directly under the filters): two large hero cards side by side — **Efficiency** and **Accuracy**. Each: big value (e.g., `5.4 calls/hr`, `96.2%`), target line ("Target: 6/hr", "Target: 95%"), delta vs target (green/red arrow), existing ⓘ tooltip, and a small inline sparkline (reuse `getAccuracyTrend`; add a matching efficiency trend selector in `src/data/selectors.ts` if not present)
- **Subsection below**, titled "Detailed Metrics" (collapsible, default open): the remaining KPI cards as smaller `StatCard`s — Calls Taken, Approved, Rejected, Approval Rate, Avg Call Time, Avg Customer Wait, Avg Review Time
- Order after that stays: Attendance table → Auditor Outcomes → Trend charts

## Change 6 — Remove partner visibility from agent Analytics

Agents must not see partner names anywhere in Analytics:

- In `PerformancePage.tsx`: remove the partner filter chips row, the `selectedPartners` state, `togglePartner`, and stop passing `partnerFilter` into `getAgentStats` / `getDailyCallTrend` / `getAccuracyTrend` / `getCallTimeTrend` (date-range presets remain — filters row keeps only Today/7D/30D/90D)
- Remove partner-related imports (`PARTNERS`, `PartnerId`) from the page
- Audit any chart legends/series in this page grouped by partner and regroup by decision or total only
- Leave the **data layer untouched** (admin still needs partner dimensions), and leave the Partner row in the call room's Customer Details step as-is — this change is scoped to Analytics only
- App IDs (e.g., `SBM_CRL_5517874243`) may remain visible in the Auditor Outcomes table — they're codes, not partner names

## Acceptance checklist

1. Sidebar shows Home / Profile / Analytics / Knowledge Center on all agent pages except the call room; active state follows the route
2. Top bar shows live Logged-in time, cumulative Break time, and status on every agent screen; break time accumulates across multiple breaks
3. From Home: click Go Online circle → device check → Go Online → queue → incoming call → accept → call room, with zero dead clicks
4. Home has no right rail; Knowledge Center content is reachable from the sidebar
5. Analytics leads with exactly two hero metrics (Efficiency, Accuracy); all other KPIs live under "Detailed Metrics"
6. No partner name appears anywhere under `/agent/performance` or `/agent/profile`; `npm run build` passes with no unused-import warnings
