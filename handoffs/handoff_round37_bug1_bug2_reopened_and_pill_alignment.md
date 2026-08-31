# Handoff 37 — Bug 1 and Bug 2 reopened (Round 35's audit was wrong on Bug 2), Amber Resolution pill alignment

**Status:** locked, ready to build. This is a fresh chat with no memory of prior rounds — read this
doc in full before doing anything. Context below is self-contained; this repo (`jayant-vkyc`) has
36+ prior handoffs in `handoffs/` if deeper history is ever needed. Round 36
(`handoffs/handoff_round36_resolution_card_restyle_and_progress_rail_bug_resolution.md`) is the most
recent completed round and is confirmed fully built — none of its three items need re-touching here.

**Scope:** three items, all visual/UI. No tree logic, classifier behaviour, scoring, or verdict
logic should be touched by any of them.

---

## 0. Context — why this round exists, and a correction to the Round 35 audit

Jack reviewed a fresh batch of live screenshots against `handoffs/full_system_audit.md` (Round 35)
and `handoffs/handoff_round34_ui_layout_overflow_fixes.md` (Round 34) in a separate planning chat.
Two things came out of that review:

1. **Bug 1** (incoming-call card buried below a long queue, `handoff_round34...` §1) is still open,
   exactly as Round 35's audit already said — reconfirmed here, not new information, but included so
   this round's three items ship together.
2. **Bug 2** (Risk Snapshot modal overflow/ghosting, `handoff_round34...` §2) — **Round 35's audit
   incorrectly marked this fixed.** That audit checked `RiskSnapshotModal`'s own CSS (`.modal` has
   `max-height: 88vh`, `.modal__body` has `overflow: auto` — both genuinely present and correct) and
   concluded the bug was resolved. But the audit verified this from the **Queue page's row-click**
   entry point, not from the **incoming-call card's "Risk snapshot" button** — and the actual bug
   only reproduces from that second entry point. The root cause (found this round, in code, not
   guessed — see §2 below) is a **double fixed-position-layer stacking issue**, not a missing
   `max-height`. The modal's own CSS was never the problem.

A third item — the "Amber Resolution" pill's copy/icon alignment — is new, found in the same
screenshot review, and is a small follow-up to Round 36's fix (Round 36 made the pill correctly turn
green; it did not address whether its layout matches the other six steps').

---

## 1. Item 1 — Bug 1 reconfirmed: incoming-call card (and the risk-dimension legend below it) still buried below a long queue

**What's wrong:** unchanged from `handoff_round34_ui_layout_overflow_fixes.md` §1 — full detail,
root-cause hypothesis, and fix guidance already written there; read that section in full before
starting. **Not repeated here.** Reconfirmed live this round: with the "400 total" queue loaded, the
incoming-call card and the risk-dimension legend row beneath the table (`I / D / T / P / C` —
Identity / Digital Presence / Telecom / Payment Fraud & Blacklists / Coherence Risk) are both pushed
below the fold; a user has to scroll the entire page down past all visible rows to reach either.

**Locate the current component:** `QueuePage.tsx` (`apps/agent/src/features/agent/QueuePage.tsx`,
~lines 350-378 per Round 35's audit — confirm current line numbers). The incoming-call card is a
plain sibling `<div>` rendered after `<TodaysQueue>` in normal document flow, with
`justifyContent: 'center'` centering but no sticky/fixed positioning, and the queue table itself has
no bounded-height internal scroll container.

**Fix:** same guidance as Round 34 §1 — in order of preference: (1) make the incoming-call card
sticky/fixed within its own layout container so it stays visible regardless of queue scroll position,
or (2) give the queue table its own internal `overflow-y: auto` scroll region with a bounded height,
so a long queue scrolls within its own box instead of pushing the card and legend down the page.
Whichever approach is chosen, confirm the legend row (rendered as part of `TodaysQueue`, directly
below the table) is also not pushed out of view by the same layout issue — it's a second, related
symptom of the same root cause, not a separate bug to fix independently.

**Verification:** load the queue with enough rows to exceed one viewport height, trigger an incoming
call, and confirm both the incoming-call card and the risk-dimension legend are visible without
scrolling the page, at any scroll position within the queue.

---

## 2. Item 2 — Bug 2, actual root cause found: two independent full-viewport `fixed` layers stack when Risk Snapshot opens from the incoming-call card

**What's wrong:** opening the Risk Snapshot modal via the **incoming-call card's "Risk snapshot"
button** renders a ghosted/duplicate-looking frame — pale rounded-rectangle edges bleeding through
above and below the modal's real content, matching the visual symptom Round 34 §2 originally
described. **This is not the same modal instance opened from the Queue page (row click) or the
pre-call dossier (`CustomerDetailsStep.tsx`) — those two entry points do not reproduce this.** Only
the incoming-call card's entry point does.

**Root cause — confirmed in code, not a guess:**
- `IncomingCallOverlay.tsx` (`apps/agent/src/components/agent-status/IncomingCallOverlay.tsx`) wraps
  `IncomingCallCard` in its own full-viewport positioning layer:
  `fixed inset-y-0 right-0 left-sidebar z-50` — this is what places and centers the incoming-call
  card whenever it's not suppressed (it self-suppresses on `/agent/queue` and `/agent/call/*` routes
  only).
- `IncomingCallCard.tsx` renders a `RiskSnapshotModal` internally, opened via local `snapshotOpen`
  state on the "Risk snapshot" button.
- `RiskSnapshotModal` (`apps/agent/src/components/risk/RiskSnapshotModal.tsx`) renders its own
  **separate** full-viewport `.scrim` (`position: fixed; inset: 0; z-index: 60`, defined in
  `cf-design-system.css` ~line 863) with `.modal` centered inside it.
- Result: when Risk Snapshot opens from this entry point, there are **two independent fixed
  full-screen layers stacked** — the outer `IncomingCallOverlay` wrapper (still holding the rendered
  `IncomingCallCard` underneath, non-scrollable, bottom-aligned) at `z-50`, and the Risk Snapshot's
  own scrim+modal at `z-60` on top of it. The outer layer doesn't disappear or dim uniformly with the
  inner one — it's a second, independently-positioned translucent/backdrop-blurred layer, which is
  what produces the "ghosted second frame" look. **The modal's own internal CSS
  (`max-height: 88vh`, `.modal__body { overflow: auto }`) is correct and not the cause** — this was
  what Round 35's audit checked and is why it wrongly called the bug fixed.

**Fix:** this needs a decision on approach, not a guessed CSS patch — pick whichever fits the
existing structure with least disruption:
1. **Preferred:** when `RiskSnapshotModal` opens from within `IncomingCallCard`, suppress or
   visually neutralize the outer `IncomingCallOverlay` wrapper for as long as the inner modal is
   open (e.g. the overlay's own backdrop/dim treatment takes over, and the card underneath doesn't
   render its own separate translucent chrome at the same time) — so there's only ever one
   backdrop-blurred layer on screen at once.
2. **Acceptable fallback:** have `IncomingCallCard` pass its `snapshotOpen` state up (or read a
   shared state) so `IncomingCallOverlay` itself can lower its own z-index or opacity while the
   nested modal is open, rather than the two layers being fully independent of each other as they
   are now.
3. Confirm whichever fix is chosen does **not** affect the other two `RiskSnapshotModal` call sites
   (Queue page row click, `CustomerDetailsStep.tsx` pre-call dossier) — neither of those sits inside
   another fixed-position overlay, so they should be unaffected already, but verify live rather than
   assuming.

**Verification:** open Risk Snapshot specifically via the incoming-call card's button (not the queue
row, not the pre-call dossier) and confirm a single, cleanly-bounded modal renders with no second
frame visible behind or around it — screenshot before/after. Then re-verify the other two entry
points still render correctly (they were never broken, but confirm the fix didn't introduce a
regression there).

---

## 3. Item 3 — "Amber Resolution" pill: now correctly turns green (Round 36), but its layout doesn't match the other six steps

**What's wrong:** Round 36 fixed the pill's logic so it correctly shows a green checkmark once a
verdict is reached (confirmed working, not disputed). This item is purely about its **visual
alignment** relative to the six real KYC steps (Liveliness, Location, Face, Aadhaar, PAN, Sign) in
the same progress rail — the pill's icon/label layout currently reads as visually distinct from
those six (different spacing/alignment pattern), rather than looking like a consistent seventh step
in the same row.

**Locate the current component:** `ProgressRail.tsx`
(`apps/agent/src/features/agent/call/ProgressRail.tsx`) — the six real steps are rendered via
`PROGRESS_STEPS.map(...)` with a `flex flex-col items-center gap-1` icon-over-label pattern; the
"Amber Resolution" pill is a separate, differently-structured trailing element (`flex items-center
gap-1.5 px-3 py-1.5 rounded-full` — icon and label side-by-side in a pill, not stacked).

**Fix:** align the "Amber Resolution" step's visual treatment with the other six — same
icon-above-label stacked layout, same spacing/sizing, so it reads as a consistent seventh item in
the rail rather than a different-shaped element tacked on the end. Check whether the current
pill-shaped treatment was a deliberate design choice (it does carry the `Search` icon and its own
distinct copy, "Amber Resolution," which the six single-word KYC labels don't need) before assuming
it should become byte-for-byte identical — if a pill shape was intentional to distinguish "this is
the live/active stage, not a pre-completed KYC check," preserve that distinction but bring its
internal alignment (icon position, label baseline, vertical centering) in line with the others rather
than changing its fundamental shape. If genuinely unsure which reading is correct, flag it back
rather than guessing.

**Verification:** view the progress rail in all three states (pending, active, and complete/green)
and confirm the "Amber Resolution" step's icon and label are vertically/horizontally consistent with
the six steps beside it, at a normal window width. Screenshot before/after.

---

## 4. General approach for all three items

- Take a screenshot of each fixed screen/state and visually compare before/after, per this
  engagement's established practice.
- These are visual/UI bugs only. If Item 2's fix seems to require touching call-acceptance logic,
  routing, or anything beyond the overlay/modal stacking and z-index/visibility handling, stop and
  flag that back rather than proceeding.
- Item 1 and Item 2 look similar (both involve the incoming-call card) but are **independent root
  causes** — fixing one should not be assumed to fix the other. Verify each separately.

## 5. Explicit non-changes

- No change to any tree logic, classifier behaviour, scoring math, or verdict logic.
- No change to persona data (`personas.ts`).
- No change to `RiskSnapshotModal`'s own internal CSS (`.modal`, `.modal__body`) — that part is
  already correct; don't "fix" something that isn't broken.
- No change to the two already-correct `RiskSnapshotModal` call sites (Queue row, pre-call dossier)
  beyond confirming they still work.
- No change to any screen not named in this handoff.
- No new features — this is a bug-fix/polish round only.

## 6. What happens after this round

Report back, for each of the three items: what was actually found/changed, and a screenshot
confirming the fix. This goes back to Jack for review in the planning chat.
