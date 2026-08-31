# Handoff 23 — Universal "Other / Doesn't know / Unclear" bucket, uncapped Retake, Case Summary coverage

**Status:** locked, ready to build. Continues from round 22 (Farmer persona rule wording /
Coherence Risk). **Scope: Farmer Income Mismatch tree only** (`farmerNodes`,
`farmerVerdicts` in `tree.ts`), per explicit instruction — SIM Circle Mismatch and
Premium Address Risk are untouched this round.

This is the "New universal bucket design" item the bridging doc flagged as "Jack's idea, not yet
spec'd," with one open question: "is the free-text note required or optional." **Answered: optional.**
Also folds in the round-19 Retake cap removal and a Case Summary coverage fix. All three are one
coherent change, not three separate ones — the trail/summary work exists specifically to make the
new bucket's exits legible to a reviewer.

---

## 1. What exists today — confirmed in code, for context

- **`AmberPanel.tsx`'s `handleOtherSubmit()`** (lines 379-388): the current "Other / does not fit
  any bucket" flow. Builds one inline `human_review_other` verdict with the agent's free-text note
  folded into `reasons[0]` as a sentence, and calls `onVerdict(v, null, path)` — **`path` is passed
  through unchanged**. The question the applicant was actually being asked when Other was tapped
  never gets a `PathEntry` appended. Today's trail (`QuestionTrail` in `PostCallConfirmation.tsx`)
  therefore silently stops one question short whenever a case terminates via Other — this is the
  gap §4 below closes.
- **`land_area`** already has a `does_not_know` tap → `TERMINAL:human_review_no_acreage`.
- **`q1`** already has an `other` tap → `TERMINAL:human_review_farmer_other`.
- Every other Farmer node (`land_water`, `year_clean_path`, `year_recheck`, `q4_sales`,
  `q5_equipment`, `q3_alt`) has **no catch-all bucket at all** today — a genuinely unclear answer
  at any of these currently has nowhere honest to go except a manual pick of the nearest-sounding
  real bucket, or the separate free-floating "Other" panel.
- **Retake** (`handleRetake`, lines 407-416; `retakeUsed` state, line 176): capped at one use per
  question — the "Not what they said? Retake" link/button disappears from the UI after first use
  on that question (`{!retakeUsed && (...)}` at lines 608 and 636-639). Resets to `false` on node
  change (a useEffect keyed on `[nodeId]`, confirmed in the audit).
- **Case Summary** (`PostCallConfirmation.tsx`, single implementation, matches
  `Farmer_Tree_Case_Summary_Spec_and_Examples.md` closely — there is only one version, not
  multiple): `CaseSummary` renders the Final Outcome badge, a one-paragraph narrative
  (`verdict.reasons.join(' ')`), `CaseSummaryFields` (structured fields, shape keyed off
  `verdict.band`/`verdict.amberFlavor`), and `QuestionTrail` (collapsed for `viewerRole: 'agent'`,
  expanded for `'reviewer'` — though no reviewer route exists yet in this build). `QuestionTrail`
  **already renders `entry.transcript`** ("Applicant said: ...") per question when present — the
  transcript is not missing from the summary today; what's missing is the terminating question's
  entry itself (see above).
- **Terminating CTAs, Farmer-tree-relevant, confirmed exhaustively:** "Other" submit (today);
  2nd unclear-retry auto-escalation (`retryCount >= 2`, unrelated to the new Retake button — this
  is the abort-accordion's separate "Applicant rambles / unclear" reason, untouched by this
  handoff); the 4 abort-accordion escalation reasons (distressed/hostile, language barrier,
  connection unrecoverable, STT failing). **Quick Flags (Coached, Data error) and "Why asking?"
  script do NOT terminate** — confirmed in code, they're inline toggles/log entries only.
  **Handover does NOT terminate either** — confirmed (`handleHandoverSubmit`, line 468: comment
  states "Deliberately no state reset: path, verdict and flags all survive the handover"), the
  call continues under a different agent. So the only Farmer-tree CTA this handoff's Case Summary
  work needs to cover, beyond normal bucket confirmation, is the new Other/Unclear bucket itself.

## 2. The new universal bucket — one tap per node, added inline

**Decision: inline as a real tap tile in every node's `taps` array** (selectable by Mr. Holmes's
classifier or by manual agent pick, same as any other bucket) — not a separate always-present
control replacing the bucket list.

**Decision: where a node already has a catch-all-shaped bucket, that bucket becomes the universal
one** (renamed, same tap id, same position) rather than adding a duplicate. Where no catch-all
exists today, add a new tap.

**Decision: one shared terminal verdict reused by every node**, not one per node — call it
`human_review_unclear_bucket`. Its `reasons` text is built dynamically at commit time from (a)
which question was being asked, and (b) the agent's optional free-text note, rather than being a
static string baked into the verdict table. (This mirrors today's `handleOtherSubmit` pattern —
constructing the verdict inline in `AmberPanel.tsx` rather than a static `tree.ts` table entry —
since the text must vary per node/per call.)

### Per-node tap change (Farmer tree only)

| Node | Today | Change |
|---|---|---|
| `q1` | `other` → `TERMINAL:human_review_farmer_other` | **Rename** tap: id stays `other` (or rename to `unclear` — Code's call, just be consistent everywhere), label → `Other / Doesn't know / Unclear`. Route changes from `TERMINAL:human_review_farmer_other` to the new shared `TERMINAL:human_review_unclear_bucket`. `human_review_farmer_other` verdict becomes dead/removable once nothing routes to it — confirm nothing else references it before deleting. |
| `land_area` | `does_not_know` → `TERMINAL:human_review_no_acreage` | **Rename** tap: label → `Other / Doesn't know / Unclear`. Route changes to `TERMINAL:human_review_unclear_bucket`. `human_review_no_acreage` verdict becomes dead/removable — confirm nothing else references it. |
| `land_water` | no catch-all | **Add** new tap: `Other / Doesn't know / Unclear` → `TERMINAL:human_review_unclear_bucket`. |
| `year_clean_path` | no catch-all | **Add** new tap → `TERMINAL:human_review_unclear_bucket`. |
| `year_recheck` | no catch-all | **Add** new tap → `TERMINAL:human_review_unclear_bucket`. |
| `q4_sales` | no catch-all | **Add** new tap → `TERMINAL:human_review_unclear_bucket`. |
| `q5_equipment` | no catch-all | **Add** new tap → `TERMINAL:human_review_unclear_bucket`. |
| `q3_alt` | no catch-all (has `farming_alone` → `TERMINAL:red_farmer_cannot_reconcile`, a real, distinct, meaningful answer — untouched) | **Add** new tap → `TERMINAL:human_review_unclear_bucket`, purely additive alongside the existing 7 buckets. No special-casing versus other nodes — confirmed explicitly: "farming income alone" stays its own distinct BLOCK path. |

For nodes gaining a brand-new tap, give it a `definition` field consistent with the pattern every
other tap already uses (used by the round-21 Haiku classifier prompt) — something like "the
answer doesn't clearly fit any of the other buckets here, or the applicant doesn't know / can't
say" — and no `sampleTranscript` is required (simulate-mode can fall back to the existing English
placeholder pattern the audit noted for taps without one).

**Removed entirely:** the free-floating "Other / does not fit any bucket" panel/button and its
free-text box + "Route to separate review" button currently rendered outside the normal bucket
list (`AmberPanel.tsx` ~lines 660-679, the `otherNote`/`handleOtherSubmit` UI). This whole
secondary UI surface goes away — its job is now done by tapping the new inline bucket tile.

## 3. What happens when the new bucket is tapped

Confirming this tap (same commit path as any other bucket — `handleConfirm`/`handleCorrect` →
`commitTap`) should, on arrival at the terminal:

1. **Open the optional free-text note** — same low-friction single box as today's, same
   placeholder copy ("Free-text note (low friction — this must never be harder than picking a
   near-miss bucket)"), but **non-mandatory**. The agent can submit with or without writing
   anything.
2. **Not gate the existing CTAs on the note.** Per instruction: "this shouldn't impact any CTA of
   the option which is 'Confirm' or 'Not what they said? Retake'" — i.e. reaching the note box
   doesn't remove or disable Confirm/Retake for the *current* tap-selection step; the note is an
   additional, optional step attached to the terminal action itself, not a blocker inserted before
   the agent can confirm their bucket choice.
3. **On submit (note present or empty), always terminate to `human_review_unclear_bucket`** — no
   path forward from this bucket, ever, on any node. This matches "whenever this is chosen, you
   will always be moving towards termination of the questions."
4. **Append a real `PathEntry` for this question before terminating** — closing the gap in §1.
   `tapLabel: 'Other / Doesn't know / Unclear'`, `transcript` populated the same way any other tap
   populates it (live STT transcript or simulate-mode sample), `corrected` per the normal rule. The
   agent's free-text note (if any) is **not** part of this `PathEntry` — see §4 for exactly where
   it surfaces instead.

## 4. Case Summary changes

### 4a. The terminating question gets a normal trail row (not a distinct visual treatment)

Per decision: the question where the case terminated via the new bucket renders in
`QuestionTrail` exactly like any other row — question text, `Applicant said: "..."`, and a
`tapLabel` chip reading `Other / Doesn't know / Unclear` (using the same chip styling other
buckets get, no special color/highlight). This is what §3.4 above wires up. No "this is where it
stopped" banner or distinct row style — a reviewer sees it's the last row in the list and that's
sufficient signal, per the recommended and chosen option.

### 4b. The agent's free-text note surfaces in the summary — but only when this bucket fired

Add the free-text note as its own labeled field in `CaseSummaryFields` when
`verdict.id === 'human_review_unclear_bucket'`, e.g. a fourth pending-verification-shaped block:

```
Agent note (at point of termination)
"<the note, or 'No note provided' if empty>"
```

This is **only rendered for this specific verdict** — confirmed explicit instruction: "If agent
chooses any other bucket, this free text written shouldn't be part of the summary." (There is no
other bucket today that collects free text, so this is naturally already true for every other
verdict — stated here so Code doesn't accidentally wire the note field to render generically off
some shared state variable that could leak into other verdicts' summaries.)

### 4c. Confirm the trail's transcript coverage holds beyond just this one bucket

Instruction: "if transcript is not part of the summary, it should also be part of it" — checked:
`QuestionTrail` already renders `entry.transcript` for every existing `PathEntry` when one exists
(`PostCallConfirmation.tsx` line ~124). This was **not** actually missing for normal
bucket-confirmed questions — the only real gap was the terminating question never getting a
`PathEntry` at all (§1, §3.4 close this). No separate transcript-coverage fix needed beyond that.

### 4d. Other terminating CTAs, confirmed in scope

Per instruction to "include that also" for other CTAs that terminate the call: confirmed in §1
that within the Farmer tree, Quick Flags and Handover do **not** terminate, so nothing changes for
them here. The 2nd-unclear auto-escalation and the 4 abort-accordion reasons already produce a
`HUMAN_REVIEW` verdict via `escalate()` today, and their trail/summary behavior is **out of scope
for this handoff** — flag separately if those should also get the same free-text-note-in-summary
treatment; they use a different mechanism (`ABORT_REASONS`' `detail` field, not `otherNote`) and
weren't named in this round's instruction.

## 5. Retake — uncapped, per-question reset kept as (now inert) plumbing

- Remove the `retakeUsed` cap/hide-after-first-use behavior: delete the `{!retakeUsed && (...)}`
  conditionals at both call sites (`AmberPanel.tsx` ~line 608 and ~line 636-639) so the
  "Retake — listen again" / "Not what they said? Retake" control is **always visible and
  clickable** on the current question, any number of times.
- Delete the `if (retakeUsed) return;` guard at the top of `handleRetake()` (line 411) and the
  `setRetakeUsed(true)` call inside it (line 412) — Retake becomes a stateless action, no per-tap
  spend-tracking.
- **Keep the existing `[nodeId]`-keyed reset effect** that currently resets `retakeUsed` to
  `false` on node change — per the decision, this is now a no-op (nothing reads `retakeUsed`
  meaningfully once the cap is gone) but leaving the reset wiring in place avoids touching
  anything else that effect resets alongside it (`abortOpen`, `escalationPending`, per the audit's
  citation of that same effect).
- Confirm no other code path reads `retakeUsed` to gate something else (e.g. analytics/logging) —
  a quick grep before deleting the state entirely is worth it; if something else depends on it,
  keep the state variable but stop using it to hide the button.

## 6. Explicit non-changes

- SIM Circle Mismatch, Premium Address Risk trees: untouched, per explicit scope instruction.
- `q3_alt`'s `farming_alone` → `red_farmer_cannot_reconcile` (BLOCK) path: untouched, stays its own
  distinct, meaningful answer, not folded into the new unclear bucket.
- `retryCount`/2nd-unclear auto-escalation logic, and all 4 abort-accordion escalation reasons:
  untouched — different mechanism, not addressed by this handoff (see §4d).
- Quick Flags (Coached, Data error), "Why asking?" script, Handover: confirmed non-terminating,
  untouched.
- `getFiredSignalLine`/`getFiredSignalParts`/`getRiskSummaryLines` (round 22's Customer Details
  callout work): untouched, unrelated layer.
- Round 21's Haiku classifier / keyword `BUCKET_RULES`: untouched — though note the classifier
  prompt for `q1` and `land_area` will need its bucket-definition list updated to reflect the
  renamed tap (label change from "Does not know"/"Other / unclear" to "Other / Doesn't know /
  Unclear") since round 21's prompt is built from each tap's `definition` field, not hardcoded —
  confirm this flows through automatically once the tap literals change, no separate classifier
  edit should be needed.

## 7. Open items — don't guess, confirm before/while building

- Exact new tap `id` for the two renamed taps (`q1`'s `other`, `land_area`'s `does_not_know`) —
  keep as-is or rename to something like `unclear` for consistency with the 6 brand-new taps.
  Either is fine; just be consistent across all 8 nodes so the shared verdict's construction logic
  doesn't need per-node special-casing to find "the unclear tap."
  Cosmetic, Code's call.
