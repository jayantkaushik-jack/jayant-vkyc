# Handoff 36 — ResolutionCard restyle, Amber Resolution pill bug, Bug 3 (dropdown overflow) re-fix

**Status:** locked, ready to build. This is a fresh chat with no memory of prior rounds — read this
doc in full before doing anything. Context below is self-contained; this repo (`jayant-vkyc`) has
35+ prior handoffs in `handoffs/` if deeper history is ever needed — in particular
`handoffs/full_system_audit.md` (Round 35) is the current ground-truth reference for the whole
prototype's state, and this round's three items were all confirmed directly against current code
from that audit plus a live screenshot review with Jack. Nothing here requires reading the older
numbered handoffs.

**Scope:** three items, all visual/UI — no tree logic, classifier behaviour, scoring, or verdict
logic should be touched by any of them.

---

## 0. Context — where these came from

Round 35 produced a full audit of the prototype (`handoffs/full_system_audit.md`). Jack then
reviewed live screenshots of the running app against that audit in a separate planning chat. Two of
this round's three items were already flagged in the Round 35 audit and are being handed off now
for an actual fix; the third (the Amber Resolution progress-pill bug) is new — found during that
screenshot review, not previously documented anywhere.

---

## 1. Item 1 — `ResolutionCard` is still on old Tailwind styling, not the design system

**What's wrong:** the verdict/outcome card shown at the end of an Amber case (the one reading
"RESOLVED / STEP-UP / Composite score: 0.20" with the Reasons list and End Session button) is the
one piece of the Amber Q&A machine that never got restyled in Round 30/31, despite the Round 31
handoff's own scope table listing it as done. Confirmed directly in code this round: it still uses
`bg-success-subtle`, `bg-danger-subtle`, `bg-warning-subtle`, `border-warning-border`, etc. (the
pre-Round-30 Tailwind palette) and the old `Card`/`Button` primitives from `src/components/ui/`,
not any `cf-design-system.css` class. It happens to not look glaringly broken in a screenshot — the
old warning/amber hues are close enough to the new palette that it reads as "fine" at a glance — but
it is not actually on the same tokens/components as the rest of the now-restyled flow, and this is
the exact screen a demo lands on right after the Q&A resolves.

**Locate the current component:** `ResolutionCard`, a function component inside
`apps/agent/src/features/agent/call/amber/AmberPanel.tsx` (currently ~line 1238 — confirm the
current line number, the file is large and may have shifted). It's invoked from two call sites
further up the same file (~lines 687 and 692) whenever a case resolves.

**Fix:** restyle `ResolutionCard` onto `cf-design-system.css`'s tokens/components, matching how the
rest of the Amber Q&A machine (main Q&A card, `AbortAccordion`, `SpeechCapture`) was already done in
Round 30/31. Specifically:
- Replace the old `Card`/`Button` primitives with the design-system equivalents already used
  elsewhere in this same file.
- Replace the `bandColor` logic's old Tailwind classes (`bg-success-subtle`, `bg-danger-subtle`,
  `bg-warning-subtle`, `bg-bg`/`border-border`/`text-text-muted` for the HUMAN_REVIEW case) with the
  equivalent `cf-design-system.css` tokens/classes — check whether `.chip--ok/wa/da` or similar
  already-established chip/card color patterns from the queue table or Risk Snapshot modal are the
  right ones to reuse here, rather than inventing new classes.
- Keep all existing copy, verdict/band logic, `victimFlag`, `hiddenReveal`, and the `isReview`
  HUMAN_REVIEW branch exactly as-is — this is a pure restyle, not a copy or logic change.

**Verification:** trigger a resolution for at least one case in each band (PROCEED, STEP_UP, BLOCK,
HUMAN_REVIEW) and confirm the card renders with `cf-design-system.css` styling consistent with the
rest of the Amber flow, with no visual seam between the Q&A screen and this final card. Screenshot
each band's resulting card.

---

## 2. Item 2 — "Amber Resolution" pill in the progress rail never turns green, even after the case resolves

**What's wrong:** the horizontal progress rail at the top of the call-room screen (Liveliness →
Location → Face → Aadhaar → PAN → Sign → Amber Resolution) correctly shows green checkmarks for all
six pre-completed KYC steps, but the trailing "Amber Resolution" pill stays in its non-final state
(grey/blue circle icon) even once the case has actually resolved to a verdict (`ResolutionCard` is
showing on screen). It should flip to the same green checkmark treatment as the other six steps once
resolution is complete — right now it doesn't, which reads as if the case is still open when it
isn't.

**This is a real logic gap, not a guess — but the exact root cause hasn't been traced yet.** What's
confirmed in code:
- `ProgressRail.tsx` (`apps/agent/src/features/agent/call/ProgressRail.tsx`) already has the correct
  intended behavior built: it computes `amberStatus` from a `currentStage` prop, and renders a green
  `<Check>` for the pill only when `amberStatus === 'complete'`, which only happens when
  `currentStage === 'done'`.
- `CallFlowContext.tsx` (`apps/agent/src/features/agent/call/CallFlowContext.tsx`, ~line 625)
  computes `currentStage` as `'done'` once `amberResolved` is true (falls back to `'resolve_signal'`
  while the amber case is open, `'pre'` before it starts).
- So the design intent is already correctly wired end-to-end in principle — something about when/how
  `amberResolved` gets set (or how/when `ProgressRail` re-renders off it) isn't happening in sync
  with the verdict actually resolving and `ResolutionCard` rendering.

**What to do:** trace where `amberResolved` is set to `true` (search `CallFlowContext.tsx` and
wherever `onVerdict`/the resolution callback is called from `AmberPanel.tsx`) and confirm exactly
why the rail's pill isn't reflecting it — e.g. `amberResolved` isn't actually being set at the same
moment `ResolutionCard` starts rendering, or it's set on a different context/state instance than
what `ProgressRail` is reading, or a stale prop/memo isn't recomputing. Fix whatever the actual gap
turns out to be so the pill reliably flips to green in the same moment the resolution card appears.

**Verification:** resolve a case in any band and confirm the "Amber Resolution" pill shows a green
checkmark matching the other six steps' styling, at the same time `ResolutionCard` appears — not on
a delay, not requiring a re-render/navigation to pick up.

---

## 3. Item 3 — Bug 3 re-confirmed live: "Manually choose bucket ▾" dropdown still overflows its card

**What's wrong:** this is the same bug already described in `handoffs/handoff_round34_ui_layout_overflow_fixes.md`
§3 and reconfirmed as still open in the Round 35 audit (`handoffs/full_system_audit.md`, Part A3) —
Jack re-confirmed it live again this round against a fresh screenshot of Question 1's "Manually
choose bucket" dropdown, cut off at the card's right edge. **This item is not new; it's included here
only so this round's three items ship together as one handoff.** Full detail, root-cause hypothesis,
and fix guidance is already written in `handoff_round34_ui_layout_overflow_fixes.md` §3 — read that
section in full before starting on this item; it is not repeated here.

**One-line recap of the known cause (see Round 34 doc for full detail):** `.select` in
`cf-design-system.css` (around line 1217-1221 as of the Round 35 audit — confirm current line
number) sets no `width`/`max-width`, so the native `<select>` sizes itself to its longest bilingual
`<option>` label (English + Hindi combined, ~80 characters on farmer-tree questions) instead of
respecting its container.

**Verification:** same as Round 34 §3 — view a range of question/bucket-label lengths at a couple of
different window widths and confirm the dropdown never exceeds its card's right edge at any width.

---

## 4. General approach for all three items

- Take a screenshot of each fixed screen/state and visually compare before/after, per this
  engagement's established practice, rather than assuming a change worked without confirming it
  rendered correctly.
- These are visual/UI bugs only. If fixing Item 2 (the progress-rail pill) seems to require touching
  verdict logic, scoring, or anything beyond `currentStage`/`amberResolved` state plumbing, stop and
  flag that back rather than proceeding — that would mean the bug is deeper than currently
  understood.
- If Item 1's restyle reveals that some other already-"restyled" screen was actually reusing
  `ResolutionCard`'s old classes/components in a way that would break if changed, flag that rather
  than silently working around it.

## 5. Explicit non-changes

- No change to any tree logic, classifier behaviour, scoring math, or verdict logic.
- No change to persona data (`personas.ts`).
- No change to `ResolutionCard`'s copy, verdict-band logic, or the `isReview`/`victimFlag`/
  `hiddenReveal` branches — restyle only.
- No change to any screen not named in this handoff.
- No new features — this is a bug-fix/restyle round only.

## 6. What happens after this round

Report back, for each of the three items: what was actually found/changed (for Item 2 in
particular, what the real root cause turned out to be), and a screenshot confirming the fix. This
goes back to Jack for review in the planning chat.
