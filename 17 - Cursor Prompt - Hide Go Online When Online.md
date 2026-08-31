# Cursor Prompt — Home: Hide "Go Online" Card When Already Online

> One-line-scale change. Minimal diff, nothing else.

In `AgentHomePage.tsx`, render the `GoOnlineCard` **only when the agent's status is `offline`** (`useAgent().status`). When status is `online` or `on_break`, hide it entirely and show instead a slim inline strip in its place:

- **Online**: green dot + "You're online — waiting for calls" + a small `Go to queue →` link to `/agent/queue`
- **On Break**: amber dot + "On a break — <live mm:ss>" + `Resume` link to `/agent/queue`

No layout jump: the strip is a single-row card (`py-3`), not the full-height hero.

## Acceptance
1. Offline → hero card visible; go online → return to Home → hero gone, online strip visible with working queue link
2. On break → strip shows live break timer
3. `npm run build` clean
