# Amber Resolution — Round 19 (Retake Button) + Round 20 (Unclear-as-Suggestion + Scroll) — Resolution (Code)

Covers both handoffs together since they touch the same component (`AmberPanel.tsx`) and landed in
the same pass. Round 19 had no open items. Round 20 had one — answered below in §3.

---

## Round 19 — Retake button

Built exactly as specced: `retakeUsed` state (`AmberPanel.tsx`), reset alongside `retryCount` /
`abortOpen` / `escalationPending` in the existing `[nodeId]` reset effect (so it's per-question, not
per-case), and `handleRetake()` which discards the in-flight attempt via the same
`reAskCurrentQuestion()` path the "ask to repeat" abort reason already uses — immediate, no
confirmation dialog, and it deliberately does not touch `retryCount` (the SIM tree's separate
rambles/unclear two-strikes counter) since these are two different mechanisms that happen to share
the same underlying principle, not one shared counter.

Two placements, both gated on `!retakeUsed`:
- Degraded (no-match) state: an equal-weight outlined pill directly after the caption, before the
  bucket list.
- Suggested state: a quiet secondary text link ("Not what they said? Retake") next to Confirm.

**Verified live in the browser**, SIM tree, Ramesh Kumar persona, Q1 ("Have you ever lived or
worked in another city?"):
1. Simulated a suggestion via the "Manually choose bucket" control → suggested-state card rendered
   with `Confirm` + the quiet `Not what they said? Retake` link, exactly as specced.
2. Tapped Retake → immediate discard, back to the awaiting-answer state, same question, no dialog.
3. Simulated a second answer on the same question → suggested card rendered with **only** `Confirm`
   — the Retake link correctly did not reappear after the one-per-question cap was spent.
4. Confirmed that answer → advanced to Q2. Simulated a suggestion there → the Retake link **did**
   reappear, confirming the counter resets per question, not per case.

No interaction with "Manually choose bucket" was observed to consume or reset the retake count
either way, matching the spec.

One honest caveat on the verification method: the Browser pane's mic is sandboxed (`Microphone
access denied`), and the "Manually choose bucket" control resolves straight to `suggested` with the
picked tap pre-selected (`AmberPanel.tsx`'s `simulatedTapId` branch bypasses `classifyAnswer`
entirely — see round 18b's resolution doc for why). That means this pass could exercise both
Retake placements and the cap/reset behavior, but could not reach the genuine no-match *degraded*
state live (that only happens when `classifyAnswer` itself returns `null`/low-confidence, which
requires a real transcript). The degraded-state Retake placement was verified by direct code
review of the render branch instead — same component, same gating logic (`!retakeUsed`), same
button, just the other JSX branch — not a separate implementation, so this is a lower-risk gap than
if the two placements were independently coded.

---

## Round 20, §1 — "unclear" as a suggestion, not a dead end

**One correction before the resolution: the handoff's stated dependency doesn't match the current
codebase.** It references "the classification prompt (per the Claude Haiku draft from this
thread)" instructing the model to return `unclear`. That's describing the LLM-based classifier from
before round 18 — `classifyAnswer()` was fully rewritten in round 18 to keyword/phrase matching (no
LLM, no API key, see `handoff_farmer_tree_round18b_classifier_test_suite.md`), and it does not
produce a distinct `unclear` tag at all. It returns either a matched bucket id or `null` — there's
no third state to special-case.

That said, the **desired outcome** this item asks for doesn't actually need one. `AmberPanel.tsx`'s
existing suggested/degraded split already does exactly the right thing the moment a catch-all
bucket becomes matchable: a match (any match, including a catch-all like "Not sure / vague") goes
to the styled `suggested` state with `Confirm`; only a genuine non-match goes to `degraded`. So the
real gap wasn't UI branching — it was that catch-all buckets across the SIM and premium-address
trees had **zero cues** in `classify.ts` (round 18 scoped `BUCKET_RULES` to the farmer tree only),
meaning any "I don't know" answer at those nodes could only ever land in degraded mode, regardless
of intent.

**What was actually built:** purely additive cue-table entries in `classify.ts` — no new
control-flow logic in `AmberPanel.tsx`. Added cues for: SIM's `vague`, `still_vague`,
`dur_cannot_recall`, `ret_cannot_recall`, `prefers_not`, `does_not_know`; premium-address's
`not_sure`, `cannot_recall`; and farmer q1's `other` (this last one also closes §2 below). Full
list and which node each belongs to is in the audit document (§2), not repeated here.

---

## Round 20, §2 — q1's cue coverage + the open item, answered

**The open item — "what currently happens if a Path B/C/D option is selected at q1" — direct
answer, from reading `tree.ts`, not an assumption:** each of the three non-Path-A q1 buckets routes
immediately to its own honest `HUMAN_REVIEW` terminal, with a specific reason string, not a stub and
not a silent placeholder:

- `seasonal` (Path B) → *"Multi-season, different-crop-per-season farming — direction for this path
  is locked but the question sequence and arithmetic are not yet built. Routed to separate review."*
- `livestock_or_aquaculture` (Path C) → *"Livestock, poultry, fish or shrimp income needs its own
  per-animal/per-bird/per-pond arithmetic, structurally different from the land-acreage calc this
  tree runs — not yet built. Routed to separate review."*
- `tenancy_or_labour` (Path D) → *"Agricultural labourer, tenant, or non-cultivating landowner — none
  of these relationships produce an arithmetic-verifiable income the way owner-cultivation does.
  Routed to separate review, no arithmetic attempted, per locked decision."*

This is confirmed intentional in the file's own header comment, not something Code inferred: Paths
B/C/D are "direction-locked but not built as real question sequences yet," and Path D specifically
"routes to human review even once its question sequences are ready, per its own locked decision."
So: **not blocking** — nothing needs to change here, this was already the correct, complete, honest
behavior before this round touched anything. (Full q1 bucket table is in the audit document, §1b.)

**Cue coverage:** contrary to the handoff's premise that round 18 only covered Path A, `tree.ts`
shows Path B/C/D's buckets (`seasonal`, `livestock_or_aquaculture`, `tenancy_or_labour`) already had
cues in `classify.ts` since round 18 — the only genuinely missing cue at q1 was the catch-all
`other` bucket, which is what §1's cue-table addition closes.

---

## Round 20, §3 — auto-scroll on suggestion

Added a `useEffect` keyed on `[flowState, degraded, suggestedTapId]` that calls
`suggestedCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })` the instant the
panel enters the suggested (non-degraded) state — fires for a genuine match, a catch-all-as-suggestion
match (per §1), or a simulated suggestion alike, since all three land in the same `suggested` state.
The degraded, no-single-card branch is correctly excluded (nothing for it to scroll to).

**Verified:** the ref is attached to the suggested card, the effect fires with no console errors on
every simulated suggestion during round 19's live pass, and typechecks clean. Not independently
reproduced with a below-the-fold scenario in the sandbox's 720px-tall viewport — the panel's content
never grew tall enough to actually require scrolling during this pass. Given the logic is a direct,
narrowly-scoped `scrollIntoView()` call gated on state that was otherwise exercised live, this is a
low-risk gap, but flagging it rather than claiming a full visual confirmation that didn't happen.

---

## Test suite

Added 9 new rows to the standalone classifier test script (round 20's newly-cued catch-all buckets:
farmer q1's `other`, SIM's `vague`/`still_vague`/`dur_cannot_recall`/`ret_cannot_recall`/
`prefers_not`/`does_not_know`, premium-address's `not_sure`/`cannot_recall`), each built directly
from that node's own `taps` list in `tree.ts` so there's no risk of testing against a bucket list
the real UI doesn't actually pass in. Full suite: **36/36 passing** (27 pre-existing + 9 new), no
regressions.

`npx tsc --noEmit` clean on both `classify.ts` and `AmberPanel.tsx`.
