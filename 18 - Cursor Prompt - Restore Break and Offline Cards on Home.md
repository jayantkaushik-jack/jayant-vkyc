# Cursor Prompt — Home: Restore Full "On a Break" and "Offline" Cards

> Replaces the slim status strips (from the previous change) with the full-size status cards we had earlier, in the hero-card slot on `AgentHomePage.tsx`. Reuse the existing components from the queue page if they exist (`OnBreakCard` / session-summary card) — extract to shared components rather than duplicating. Minimal diffs elsewhere.

---

## Home hero slot — status-dependent card

The slot where the Go Online hero renders shows exactly one of three full-height cards:

**1. Status `offline`, no session today yet → Go Online hero** (unchanged): dashed circle, "GO ONLINE", "Ready to take VKYC calls?"

**2. Status `on_break` → On a Break card** (restore the earlier design):
- Coffee-cup icon in a soft amber circle
- Heading "On a break" + live timer below it (mm:ss, ticking)
- Sub-line: "Calls are paused while you're on break"
- Purple `Resume — Go Online` button (sets status online and routes to `/agent/queue`)

**3. Status `offline` after a session today → Session Summary card** (restore the earlier design):
- Heading "You're offline" with a gray status dot
- 2×2 stat grid: `Went online at` (hh:mm), `Total active time`, `Total break time`, `Went offline at` (hh:mm) — values from today's real session accounting in `AgentContext`
- Purple `Go Online` button below (opens the device-check modal, same flow as the hero)

**Status `online`** keeps the slim strip from the previous change (green dot, "You're online — waiting for calls", `Go to queue →`) — the full cards apply only to break/offline.

## Incoming calls: guaranteed within 10 seconds while Online

Whenever the agent is Online and not already in a call, an incoming call must arrive within **10 seconds** — no dead waiting states anywhere:

- Centralize the simulated-call scheduling (e.g., in `AgentContext` or a `useCallScheduler` hook): while `status === 'online'` and no active/incoming call, start a timer with a random 4–10s delay → fire the incoming call
- This must hold on **every** online surface: the queue/waiting page, and also if the agent navigates to Home/Analytics/Knowledge while online (the incoming-call card/prompt should appear there too, or auto-route to the queue when the call fires)
- Going On Break or Offline cancels the pending timer; Resume/Go Online restarts it; accepting a call clears it; after a call completes (Next Call → queue), the cycle restarts automatically
- Remove any older one-shot call triggers so scheduling has a single source (`grep` for the old 4–6s trigger in the queue page and replace with the central scheduler)

## Notes
- The queue page's break/offline states stay as they are; extract shared card components (`src/components/agent-status/`) so Home and Queue render the same cards without duplication
- Session accounting fields already exist (`loginAt`, accumulated break, logout time) — no data changes
- Remove the slim break/offline strips added in the previous change

## Acceptance
1. Fresh login (offline, no session) → hero. Go online → Home shows the online strip. Take a break → Home shows the full On a Break card with live timer; Resume works
2. Go offline after some activity → session summary card with correct times (matches header counters); Go Online button relaunches device check
3. Queue page states unchanged; no duplicated card code (`git grep "On a break"` hits the shared component only); `npm run build` clean
4. Online on the queue page: a call arrives within 10s, every time — including after completing a call and after Resume from break. Online but sitting on Home/Analytics: the incoming call still reaches the agent within 10s. On Break/Offline: no calls ever arrive
