# Handoff: Amber Resolution Layer — Round 5 (Critical Bug)

**Context:** grounded in 3 fresh screenshots (21 Aug 2026, ~7:45 PM) of the live call screen on the
newly-added `Resolve Signal` stage (round 4). Both bugs below trace to the same root cause — flagged
as one fix, not two, so Code doesn't patch the symptoms separately and leave the underlying issue to
resurface at the next stage boundary (e.g. `Report`).

**Priority: this blocks the demo flow and should be fixed before anything else in the queue.**

---

## Root cause (likely)

`Capture Sign`'s "active" condition was probably never re-scoped when `Resolve Signal` was inserted
ahead of it in round 4. If the check is something like `stage >= currentStage` (a range/threshold
comparison) rather than `stage === currentStage` (exact equality), inserting a new stage before
`Capture Sign` would cause `Capture Sign` to light up alongside whatever the real current stage is —
which is exactly the symptom in Bug 1. Bug 2 is a second, related symptom of the same category: some
part of the video feed is reading its own state independently instead of deferring to the single
current-stage value, so Capture Sign's overlay renders even though Capture Sign isn't actually active.

**Fix at the source:** there must be exactly one current-stage value for the whole call screen, and
every dependent element — Progress panel highlighting, video feed overlay, any other stage-gated UI —
reads from that single value via exact equality, never a range check and never its own local flag.

---

## Bug 1 — Progress panel shows two stages active at once

**Confirmed:** `Resolve Signal` and `Capture Sign` both render with the blue row-highlight and the
outlined (unchecked) circle simultaneously, as if both are current.

**Fix — enforce a strict single-active-stage invariant** across the three states every Progress row
can be in:
- `not_started`: gray outlined circle, muted gray text, **no row highlight**
- `active`: blue outlined circle, **row highlight** — exactly one row in this state at any time
- `complete`: green check, no highlight

While `Resolve Signal` is active, `Capture Sign` renders as `not_started` — plain gray, no
highlight — identical to how `Report` already renders correctly below it in the same screenshot.
`Capture Sign` only becomes `active` once `Resolve Signal` becomes `complete` (i.e. once "Continue to
compliance steps" is reached, per round 4's spec).

---

## Bug 2 — Video feed shows Capture Sign's overlay during Resolve Signal

**Confirmed:** the dashed signature guide-box and the "Ask the customer to show the signed paper"
caption — both belonging to the Capture Sign step — are visible while the AMBER CASE resolution
screen is on screen.

**Fix — gate the video feed overlay on the same current-stage value as the Progress panel, not
tracked independently:**
- While `Resolve Signal` is active: plain, unmodified video feed. No guide box, no caption — same
  plain view the feed had back at `Check PAN`.
- The guide box and caption only appear once `Capture Sign` is the active stage.

---

## What Code should check before patching

1. Is `Capture Sign`'s active-check a range/threshold comparison against stage order, rather than
   exact equality against a single current-stage variable? If so, that's the fix for Bug 1.
2. Does the video feed overlay read the same current-stage variable as the Progress panel, or does
   it have its own separate flag/condition for "show signature guide box"? If it's separate, that's
   the fix for Bug 2 — and it should be consolidated to read the same source of truth, not patched
   with a second independent condition.

If both bugs resolve from the same single-source-of-truth fix, that's the confirmation the root
cause diagnosis was right.

---

## Open items

None — this is a bug fix against already-decided behavior (round 4, `Resolve Signal` stage spec),
not new scope.

---

## Resolution (Code)

Root cause wasn't quite a range/threshold check, but the same category of bug: `CallFlowContext`'s
`activeStep` is pre-set to `sign` (index 5) by round 1's architecture the moment the workflow starts —
*before* the amber gate resolves — and `stepStatuses[sign]` is pre-marked `'active'` at that same
moment. Two consumers read those raw values directly instead of deferring to whether the amber gate
was still open:

- `ProgressRail`'s per-row `isActive` check (`i === activeStep`) — always true for `sign` once
  started, regardless of `amberResolved`.
- `CallFlowContext.getCaptureMode()` (drives the video feed overlay) — derived from
  `CALL_STEPS[activeStep].id`, same problem, independently of the Progress panel.

**Fix:** added one derived value, `currentStage: StepId | 'resolve_signal' | 'pre'`, computed once in
`CallFlowContext` (`'resolve_signal'` while `isAmberCase && !amberResolved`, else the real step id).
Every stage-gated consumer now reads this single value via exact equality instead of combining
`activeStep`/`stepStatuses` itself:

- `ProgressRail` takes `currentStage` as its only stage-related prop (replacing the `isAmberCase` +
  `amberResolved` pair it had before). A row's displayed status is `stepStatuses[i]`, downgraded from
  `'active'` to `'pending'` whenever `step.id !== currentStage` — so the pre-marked `sign` row shows
  `not_started` for as long as `resolve_signal` is current, and flips to `active` the instant
  `currentStage` becomes `'sign'`.
- `getCaptureMode()` now checks `currentStage` instead of re-deriving the step id itself, so the
  video feed overlay (`CaptureGuideOverlay`, gated purely on the `captureMode` prop — confirmed no
  independent state of its own) went blank during Resolve Signal for free, with no separate patch.

Confirms the handoff's diagnosis: both bugs cleared from the one fix. Verified in-browser — Resolve
Signal shows as the sole active row with a clean video feed throughout a full resolution, and Capture
Sign correctly lights up (with its guide box and caption) only after "Continue to compliance steps."

Files touched: `apps/agent/src/features/agent/call/CallFlowContext.tsx`,
`apps/agent/src/features/agent/call/ProgressRail.tsx`,
`apps/agent/src/features/agent/CallRoomPage.tsx`.
