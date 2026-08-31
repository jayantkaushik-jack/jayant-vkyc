# Round 37 — Bug 1/2 reopened, Amber Resolution pill alignment — Resolution (Code)

All three items built. Item 2's actual fix went further than the handoff's own two-option guidance
once live testing surfaced a second, independent way to reproduce the same ghosting — reported below
rather than silently narrowed to only the originally-described case. No tree logic, classifier
behaviour, scoring, or verdict logic was touched.

## 1. Bug 1 — incoming-call card and legend row buried below a long queue

**Root cause, confirmed in code:** `QueuePage.tsx` rendered its own separate, non-fixed copy of
`IncomingCallCard` inline after `<TodaysQueue>`, specifically because `IncomingCallOverlay.tsx` (the
global, already-fixed-position version mounted in `AgentLayout`) bailed out on `/agent/queue` to avoid
a double-render. Separately, `.qtable-wrap` had `overflow: hidden` and no `max-height` at all, despite
its own `thead th` already being `position: sticky` — a sticky header with nothing bounding its
scroll ancestor has no effect. A long queue just grew the whole page instead of scrolling in place,
pushing the risk-dimension legend row (rendered immediately after the table) and, transitively, the
incoming-call card much further down, out of the viewport.

**Fix — both halves of the root cause addressed, not just one:**
- `apps/agent/src/styles/cf-design-system.css` — `.qtable-wrap` now has
  `max-height: clamp(240px, calc(100vh - 420px), 520px); overflow-y: auto;` (a `clamp()`, not a flat
  `vh` or a fixed pixel value, so it stays reasonable on both a short laptop window and a tall
  monitor). The sticky header now actually does something. This alone fixes the legend row: it's the
  table's immediate next sibling, so it's no longer pushed down by an unbounded table.
- `apps/agent/src/components/agent-status/IncomingCallOverlay.tsx` — removed the `onQueue` bailout.
  This overlay is now the single render path for the incoming-call card on every authenticated route,
  including the queue — guaranteeing the card is always visible via `position: fixed`, regardless of
  queue length or scroll position, exactly like every other screen already had it.
- `apps/agent/src/features/agent/QueuePage.tsx` — its own duplicate inline rendering deleted, along
  with the now-unused `acceptCall`/`clearCall`/`currentCustomer`/`incomingSince`/`handleAccept`
  and the `IncomingCallCard` import.

**Verified live:** went online, forced the queue into its scrolled state (`.qtable-wrap.scrollTop =
scrollHeight`), confirmed via `getBoundingClientRect` that the table genuinely scrolls internally
(`scrollHeight: 828` vs `clientHeight: 298` in the tested window) while the legend row directly below
it stayed on-screen throughout. Triggered an incoming call (Ramesh Yadav) and confirmed the card
appears floating over the queue immediately, with zero scrolling, matching every other screen's
existing behavior.

## 2. Bug 2 — actual root cause confirmed broader than either round's original diagnosis; fixed at the coordination level, not per-call-site

**The handoff's own diagnosis was correct as far as it went** (two independent `position: fixed`
layers stacking — `IncomingCallOverlay`'s wrapper still showing the card underneath, and
`RiskSnapshotModal`'s own `.scrim` on top, whose 42%-opacity translucent backdrop doesn't fully
obscure another bright fixed box behind it). **But Bug 1's own fix reopened it in a second, wider
form**, found while verifying Bug 1 rather than assumed: once the incoming-call card floats globally
on every route (including the queue), the exact same ghosting reproduces from a **second, independent
trigger** — clicking a Queue table row to open *that* row's own `RiskSnapshotModal` instance while an
unrelated call happens to be incoming. That modal has nothing to do with the floating card, but the
card is still sitting behind its scrim regardless. Fixing only "this card's own Risk Snapshot button"
(the handoff's originally-scoped fix, tried first) would have left this second trigger open — flagging
this rather than shipping a narrower fix that Item 1's own change would have silently undermined.

**Fix — a small shared flag, not a per-call-site patch:**
- `apps/agent/src/features/agent/AgentContext.tsx` — new `isRiskSnapshotOpen` boolean +
  `setRiskSnapshotOpen` setter, true while *any* `RiskSnapshotModal` instance is open anywhere.
- `apps/agent/src/components/risk/RiskSnapshotModal.tsx` — a `useEffect` reports its own `open` prop
  up to that shared flag (and clears it on unmount) — the only change to this file; **its own layout
  CSS (`.modal`, `.modal__body`) is untouched**, exactly as the handoff required.
- `apps/agent/src/components/agent-status/IncomingCallOverlay.tsx` — its wrapper now sets
  `visibility: isRiskSnapshotOpen ? 'hidden' : 'visible'` inline, instead of returning `null`.
  `visibility: hidden` (not `display: none`) keeps the subtree mounted, which matters specifically
  when *this card's own* nested `RiskSnapshotModal` is the one that set the flag — unmounting would
  tear down the very modal the state change was reporting.
- `apps/agent/src/styles/cf-design-system.css` — `.scrim` gained one line, `visibility: visible;`.
  `visibility` inherits by default, so without an explicit override, a scrim mounted *inside* the now
  sometimes-hidden overlay wrapper (the card's own Risk Snapshot button) would incorrectly disappear
  along with it. This override is additive — nothing about `.modal`/`.modal__body`'s existing
  sizing/scroll behavior changed.
- `apps/agent/src/components/agent-status/IncomingCallCard.tsx` — no change beyond a comment pointing
  at where the real fix lives; an earlier attempt at fixing this locally (making the card
  early-return just its own modal) was tried and reverted once the second trigger above showed the
  fix had to live one level up, coordinating across all three call sites, not just this one.

**Verified live, all three `RiskSnapshotModal` entry points, with an incoming call floating throughout:**
- **The originally-reported case** (the card's own "Risk snapshot" button): single clean modal, no
  ghosting.
- **The newly-found case** (a Queue table row, e.g. Farhan Sheikh, clicked while Ramesh Yadav's call
  is incoming): single clean modal, no ghosting — this is the exact interaction that reproduced the
  bug again after Bug 1's fix, confirmed fixed after the shared-flag change.
- **The pre-call dossier's "Full risk snapshot" link** (`CustomerDetailsStep.tsx`): unaffected, still
  renders correctly — confirmed live, not assumed, per the handoff's own instruction.
- Closing each modal correctly brings the floating card back in every case.

## 3. "Amber Resolution" pill alignment

**Read as the handoff intended:** the pill shape itself (a rounded, tinted chip while active) is a
deliberate distinction worth keeping — this is the live/current stage, not a pre-completed KYC check
— so it wasn't flattened to look byte-for-byte identical to the other six. What changed is the
*internal* layout: `apps/agent/src/features/agent/call/ProgressRail.tsx`'s Amber Resolution element
is now `flex flex-col items-center gap-1` (icon stacked above label) instead of `flex items-center`
(icon beside label) — matching the six real steps' own shape exactly. The top icon reuses
`StepStatusIcon`'s own sizing/coloring convention (`Check`/`Circle`, 14px, `bg-surface rounded-full`
z-index treatment) for complete/pending, and the existing active-state `Circle` fill for active. The
rounded-pill tint is kept, but now scoped to just the label chip underneath the icon (`Search` +
"Amber Resolution", `text-[11px]` matching the six steps' own label size) rather than wrapping the
whole icon+label combo.

**Verified live** in all three states — pending (before "Start KYC steps"), active (mid-question), and
complete (after a resolved verdict) — and measured via `getBoundingClientRect()` across all seven
items: the six real steps' icons sit at `top: 87px`, Amber Resolution's at `top: 85px` in the tested
window — a 2px difference from the label chip's own small padding, not the dramatic
stacked-vs-side-by-side misalignment the handoff described. Reads as a consistent seventh item in the
row at a normal window width.

## Verification summary

- `npx tsc --noEmit -p tsconfig.json`: clean, after every change including the AgentContext addition.
- Dev server (port 4001) HMR reloaded cleanly after every file edited this round, confirmed via
  `/tmp/jayant-vkyc-agent-dev.log` — the `useAgent must be used within AgentProvider` console messages
  seen during testing are confirmed stale (timestamped well before this round's edits), not a live
  regression, per this engagement's established pattern for this environment.
- Regression-walked login → online → incoming call → all three `RiskSnapshotModal` entry points →
  accept → pre-call checks → Amber Q1 → a fast HUMAN_REVIEW resolution, with no console errors from
  this round's own edits.

## Explicit non-changes, confirmed

No change to any tree logic, classifier behaviour, scoring math, or verdict logic. No change to
persona data (`personas.ts`). `RiskSnapshotModal`'s own `.modal`/`.modal__body` sizing/scroll CSS is
untouched — the one change to that file is a side-effect `useEffect` for the shared open-flag, not a
layout change. The two already-correct `RiskSnapshotModal` call sites (Queue row, pre-call dossier)
were verified live, not assumed, to still work correctly. No other screen touched.
