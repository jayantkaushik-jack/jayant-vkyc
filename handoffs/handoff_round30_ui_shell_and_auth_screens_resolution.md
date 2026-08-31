# Round 30 — UI Redesign Part 1: Design Tokens, App Shell, Auth Screens — Resolution (Code)

Built exactly as specced for all three in-scope screens (01 Login, 02 OTP, 03 Home offline), plus the
foundations (fonts, tokens, shell) every later round sits on. Three real, live-verified bugs were found
and fixed while working through the flow-integrity checklist — not just checked off, actually broke the
app until fixed. Full detail below, organized to match the handoff's own §12 write-back list.

## What was built, per screen

**Foundations (§5):** the 9 self-hosted fonts and 2 logo PNGs copied into `apps/agent/public/fonts/` and
`apps/agent/public/assets/`. The reference `cf-design-system.css` ported into
`apps/agent/src/styles/cf-design-system.css`, imported once in `main.tsx`. `tailwind.config.js` extended
additively (`brand`/`ok`/`wa`/`da`/`re` color keys reading the new CSS variables, `fontFamily.sans`
extended to include `"Noto Sans Devanagari"` in the fallback chain per §5.1's own explicit ask, new
`fontFamily.mono`) — none of the existing `primary`/`bg`/`surface`/`success`/`danger`/`warning`/`border`/
`accent`/`focus` keys were touched, so nothing not yet redesigned changes color.

**Screen 01 — Login** (`apps/agent/src/features/auth/LoginPage.tsx`, `AuthBrandPanel.tsx` new): full
rewrite. Brand panel (atmos blobs, blueprint layer, the shield SVG hero, logo, eyebrow/name/tagline)
extracted into `AuthBrandPanel.tsx`, shared byte-for-byte with screen 02 per §7. Email field: disabled
Continue until plausible, blur-after-touch validation, format check then a **separate** `@cashfree.com`
domain check on submit (both ported verbatim from the reference's inline script), inline `role="alert"`
error box, `aria-invalid`.

**Screen 02 — OTP** (same file, `OtpForm`): six discrete `maxLength={1}` inputs (not the old app's single
wide field) with auto-advance on entry, backspace-across-empty-steps-back, **added** Left/Right arrow-key
navigation (see Premise mismatches below — the reference's own script doesn't implement this despite its
prose spec requiring it), paste-distributes-across-all-six, auto-verify the instant the sixth digit
lands, a masked-email header (`s•••t@cashfree.com`, computed dynamically — see below), and a live
resend countdown that becomes a real button at zero and restarts on use.

**Screen 03 — Home, offline** (`AgentHomePage.tsx` rewritten, `AgentSidebar.tsx`/`Header.tsx`/
`SessionStatusHeaderCluster.tsx`/`AgentLayout.tsx` rebuilt): the persistent `.shell` (sidebar + topbar)
now wraps every authenticated route, replacing the sidebar-missing/black-on-call-room inconsistency the
handoff called out as the single biggest reason the prototype read as unrelated pages. Status control
rebuilt as a real `role="menu"`/`role="menuitemradio"` widget with `aria-haspopup`/`aria-expanded` and
Escape-to-close (previously just a plain button + conditional div, no ARIA, no Escape). The offline empty
state matches the reference: icon, "You're offline", body copy, a reason-to-act card, primary Go online,
break-timer footnote — wired to the **real** `useAgent()`/`useSessionStatus()` state and the **real**
`DeviceCheckModal`, no presence/timer logic reimplemented.

## Every item in §9's flow-integrity checklist

1. **`[hidden]` global reset.** Grepped the whole app for the literal HTML `hidden` attribute (not
   `aria-hidden`, not Tailwind's `.hidden` utility class — different selectors, no interaction) —
   zero matches anywhere in `apps/agent/src`. Inert against the existing app; safe.
2. **`.shell { height:100vh; overflow:hidden }` scroll behavior.** **Found and fixed a real bug**, not
   just verified. `<main>` needed `overflow-y: auto` for every existing page (Queue, Profile, Analytics,
   Knowledge Center, Performance) to keep scrolling — first tried it as the `overflow-y-auto` Tailwind
   utility class, and it silently lost: `.workspace`'s own `overflow: hidden` and the utility are
   equal-specificity class selectors, and `.workspace` compiles later in the final bundle (this file
   imports after `index.css`, where `@tailwind utilities` lives), so on a tie its `overflow-y: hidden` —
   from the shorthand — won. Confirmed live via `getComputedStyle`: `overflow-y` read back as `hidden`,
   and the Queue page's incoming-call card's Accept/Reject buttons were genuinely clipped and
   unreachable below the fold. Fixed with an inline style on `<main>` (`style={{ overflowY: 'auto' }}`),
   which has no such cascade ambiguity — reverified the same computed-style check afterward (`auto`) and
   confirmed the Accept/Reject buttons scroll into view.
3. **No duplicate layout wrapper.** `AgentLayout.tsx` is the only shell; nothing nests a second
   sidebar/topbar inside it. Verified visually across all six existing routes plus the call room.
4. **Status changes still drive real state.** Cycled all three states live: Offline → Online (via the
   real `DeviceCheckModal` → camera-start flow, unchanged) landed on the Queue page with "Logged in"
   ticking; Online → On break rendered the real `OnBreakCard` with its own break timer ticking from
   `00:01`. Neither the presence logic nor the timers were touched, per the handoff's own instruction —
   only `SessionStatusHeaderCluster.tsx`'s markup/ARIA changed.
5. **Avatar/language randomization bug.** Confirmed still present (out of scope, not touched) and **not
   worsened** — the new `.avatar avatar--sm` span renders `getInitials(agent.name)` freshly on every
   render, nothing cached.
6. **Token layer doesn't restyle 04-17 by accident.** This is where the second real bug surfaced.
   Wrapping the whole ported file in `@layer base` (to keep Tailwind's utility classes winning over
   the reference's bare `body`/`a`/`:focus-visible` selectors) doesn't build at all — Tailwind's PostCSS
   plugin requires `@tailwind base;` in the *same file* as any `@layer base {}` block, which correctly
   only exists in `index.css`. Confirmed via the actual dev-server error before fixing it (500 on every
   request, `` `@layer base` is used but no matching `@tailwind base` directive is present ``). Fixed by
   **not** porting those three rules as bare selectors at all: `body`'s background/color/font/line-height
   is now scoped to `.auth, .shell` (this round's two screen roots — the real global `<body>` background/
   text/font stays owned by `index.css`'s existing `html body { @apply bg-bg text-text font-sans
   antialiased }`, which every untouched screen still reads); the bare `a { color }` rule is dropped
   (the one real anchor in this round's markup, "Contact IT support", is colored directly at its call
   site); the blanket `:focus-visible` rule is dropped and replaced with the same three declarations
   added individually to `.link-btn`, `.nav-item`, `.status-btn`, and `.menu__item` — the four component
   classes that didn't already have their own scoped focus treatment (`.btn`, `.field__input`, `.otp
   input` all did already). Every `AGENT-PORT-NOTE` comment in `cf-design-system.css` marks exactly where
   the ported text diverges from the reference and why. Everything else — `.btn`, `.field`, `.shell`,
   `.card`, etc. — is verbatim; grepped for literal (non-Tailwind-utility) usage of every one of those
   class names across the app before porting and found none, so there was no collision risk there to
   begin with.
7. **Fonts reflow.** Real, expected, and verified — DM Sans now actually loads (it was declared in
   `tailwind.config.js`'s `fontFamily.sans` before this round but never backed by an `@font-face`, so it
   was silently falling back to `system-ui`). Checked the Queue table and the AmberPanel question card
   specifically, per the handoff's own callout: no clipping in either at 1440×900.
8. **Auth route contract.** `01 → 02 → 03` uses the app's real `useAuth()`/React Router flow throughout —
   `login(email)` / `verifyOtp()` / `navigate()`, not the reference's `window.location.href` static-preview
   affordance. `ProtectedRoute` and the existing redirect-to-`from` behavior are untouched.
9. **`prefers-reduced-motion`.** The reference's own blanket kill-switch (`*, *::before, *::after {
   animation-duration:.01ms!important; ... }`) was left genuinely global — unlike the three rules in
   item 6, this one is unambiguously safe to apply everywhere (it only ever *reduces* existing motion, it
   never adds new styling, so there's no restyle-by-accident risk). Confirmed the rule compiled intact
   post-edit; not verified against the live OS-level setting (no emulation control available in this
   sandbox for that specific media feature — see Open items).
10. **Contrast.** Checked visually against both the atmosphere's lightest and darkest points across all
    three screens at 1440×900 — text stayed legible throughout. Not measured with a contrast-ratio tool.

**A third bug, not in the checklist's own list, found while fixing item 3:** `.shell`'s
`grid-template-columns` is a fixed two-track definition (`240px | minmax(0,1fr)`) that assumes the
sidebar is always present — true in the static reference, false in the real app, since `AgentSidebar`
returns `null` on call-room routes to go full-bleed. With only one real grid item left, CSS Grid
auto-placement drops it into the *first* (240px) track instead of the second. Fixed with an explicit
`gridColumn: 2` on the content column, verified live on the call room: full-width video + KYC panel, no
sidebar, correct — confirmed this would have visibly broken every call before verifying it directly.

## Amber count (§8.3)

Bound to real data, not left hardcoded, per the handoff's own preferred outcome. Moved `FUNNEL_TODAY`
(previously local to `QueuePage.tsx`) into a new shared `apps/agent/src/features/agent/queueStats.ts`,
imported by both `QueuePage.tsx` and `AgentHomePage.tsx`'s new offline card, so there's exactly one
`amber: 400` in the codebase instead of two. It's still the same static, deliberately-illustrative
aggregate documented in that file's own comment (nothing in this codebase computes a real live queue
count) — "real data" here means "the one existing amber-count concept," not a newly-computed value.

## Premise mismatches, disclosed

- **§7's Left/Right arrow-key navigation is listed as required ("all of this is required") but the
  reference `02-otp.html`'s own `<script>` doesn't implement it** — only backspace-across-empty is coded.
  Built it anyway, since the written requirement is unambiguous and the reference is explicitly "a static
  reference, not code to paste in" — treated the prose spec as authoritative over an incomplete reference
  implementation on this one point, per this engagement's standing practice of implementing the real
  intent rather than a stale/incomplete artifact.
- **§7's wrong-code recovery UI (shake/clear/refocus/error message) has no real trigger.**
  `verifyOtp()` (`packages/shared/src/features/auth/AuthContext.tsx`) takes no arguments and always
  succeeds — there is no failure signal to hook the recovery path to, and the handoff explicitly forbids
  shipping the reference's own demo failure code (`111111`) as a stand-in. Built the success path fully;
  the invalid-code branch is real, correctly-wired code (CSS shake class, clear-and-refocus, distinct
  status message) gated behind a `success` value hardcoded to `true` with an inline comment explaining
  why — not dead code from a bug, just currently unreachable until `verifyOtp()` can report failure.
- **§2's "sumit@gmail.com" → "s••••t@cashfree.com" masking example uses a fixed 4 dots.** Built a real
  function instead (`maskEmail`) that masks the actual hidden character count for whatever email was
  entered — the reference's fixed-4-dots was specific to its one hardcoded example, not a rule; a
  same-length or shorter local part than "sumit" would look wrong under a literal fixed-count copy.
- **Dropped `LoginPage`'s old `validateEmail`/`demoAccounts` props.** Neither was ever passed by the only
  call site (`routes.tsx`: `<LoginPage defaultRedirect="/agent" />`) and the reference design has no slot
  for a demo-accounts list. This screen's own concrete format+domain validation replaces the generic hook
  outright rather than layering on top of it.
- **Cashmere's `LeftNavbar`/`Logo` (via the local stub — `@cashfree-intl/cashmere` has no real registry
  credentials on this machine, per `vite.config.ts`'s own comment) is no longer used for the sidebar.**
  The new shell's exact grid/scroll structure doesn't map cleanly onto that API, and since it was already
  a placeholder stub rather than the real design-system package, nothing real is being dropped — just
  this app's own stand-in for one. The stub's `Button`/`Tag`/`Modal`/`Icon`/etc. are untouched and still
  used elsewhere.
- **Deleted `GoOnlineCard.tsx`.** Its only remaining consumer (`AgentHomePage.tsx`'s old offline branch)
  is fully replaced by the new empty-state markup; grepped for other importers before deleting — none.
- **Sidebar width token changed 256px → 240px** (`tailwind.config.js`'s `spacing.sidebar`) to match
  `.shell`'s real column width — the only other consumer is the fixed incoming-call overlay's
  `left-sidebar` offset, which needs to match the sidebar's actual width or the card drifts past it.

## Open items, and why

- **The "already been online today" and On-break Home states are unmodified** — the reference only
  designs the fresh-offline case (screen 03's own title is specifically "Home, agent offline"); the other
  two hero-slot branches (`OnBreakCard`, `SessionSummaryCard`) still render exactly as before, just
  without the now-dropped stat-card row above them. Not covered by this round, per the user's own
  confirmed decision to drop that row generally rather than re-add it selectively.
- **Performance stat-card row removal is Home-wide, not offline-state-specific** — confirmed with the
  user directly before building (see conversation) rather than assumed from the reference PNG alone.
- **A pre-existing, unrelated-to-this-round height mismatch in `CallRoomPage.tsx`:** its root hardcodes
  `h-[calc(100vh-3.5rem)]` (assumes a 56px header), but the real header has been 64px since before this
  round (`h-16`) — an 8px gap that used to bleed into ordinary page scroll and is now, under the stricter
  shell, a ~56px internal scroll inside `<main>` (the `.workspace` padding this round adds accounts for
  most of the difference). Verified live: nothing is invisibly clipped — the Video Visible/Audible
  buttons and everything below them remain fully reachable via the same `overflow-y:auto` fix from
  checklist item 2 — but it's not the polished "nothing scrolls" call-room design the CSS's own §15
  comment describes for a future round. Left as-is: fixing `CallRoomPage.tsx`'s own layout math is
  call-room work, explicitly out of scope for a round scoped to screens 01–03.
- **`prefers-reduced-motion` and contrast (checklist items 9–10) were verified by reading the compiled
  CSS and by eye, not by emulating the OS setting or measuring contrast ratios** — no emulation control
  for that specific media feature was available in this sandbox, and no contrast-ratio tool was run.
  Both are low-risk (the reduced-motion rule is copied verbatim and only ever *removes* motion; the
  reference's own token values were presumably already checked for contrast by its authors) but neither
  claim above should be read as machine-verified.
- **The real mic → OTP-paste-from-a-real-clipboard path** wasn't exercised with a genuine OS-level paste
  event (tested via the automation layer's synthetic paste dispatch instead) — same category of sandbox
  gap this engagement has consistently disclosed for anything needing real browser I/O.

## Verification

- `npx tsc --noEmit -p tsconfig.json`: clean, both after the initial implementation and again after the
  three fixes above.
- Dev server run as a background process (`nohup npm run dev:agent`, port 4000 was occupied by the old
  `vkyc-dashboard-git` checkout's own server still running from earlier in this engagement, so this one
  auto-selected 4001 — `strictPort: false`) so it's reachable outside this session's own sandboxed preview
  too.
- Live-rendered all three screens and compared against the reference PNGs at 1440×900 — close visual
  match throughout (brand panel gradients/shield, card layout, OTP segment sizing, shell proportions).
- Walked 01 → 02 → 03 end to end for real: disabled Continue, the format error, the domain error
  (`sumit@gmail.com` → "Use your @cashfree.com work email to sign in."), OTP auto-advance and auto-verify
  (typed one keystroke at a time — a single rapid multi-character paste-like burst from the browser
  automation layer dropped characters, confirmed as an automation-tool artifact, not an app bug, since
  slower per-character input and real paste both work correctly), the "Verified. Opening your queue…"
  transition, and all three status changes with their timers.
- Regression-checked every other existing route under the new shell (Queue — including expanding the
  table and reaching the incoming-call card, Profile, Analytics, Knowledge Center, Call Room including
  the video/KYC-details panels and the Video Visible/Audible toggles) — zero console errors across the
  entire session, in every screenshot and after every interaction.
- Keyboard pass on the login screen: autofocus + visible focus ring on the email field confirmed;
  Escape-closes-the-status-menu confirmed separately on the Home screen.
