# Round 23 — Universal Unclear Bucket, Uncapped Retake, Case Summary Coverage — Resolution (Code)

Built as specced, with two places where the handoff's premise didn't quite fit the shared,
cross-tree reality of `AmberPanel.tsx` — both disclosed below rather than silently applied or
silently skipped.

## What changed

**`apps/agent/src/features/agent/call/amber/tree.ts`** — Farmer tree only, as scoped:
- Added `agentNote?: string` to the `Verdict` interface — the free-text note collected at the moment
  the new bucket terminates a case, kept as its own field rather than folded into `reasons` (per §4b).
- **Tap id chosen: `unclear`**, uniform across all 8 nodes (the open item in §7). Label everywhere:
  `"Other / Doesn't know / Unclear"`.
- `q1`'s `other` tap and `land_area`'s `does_not_know` tap **renamed in place** (same position, same
  `definition`/`sampleTranscript` where they had one) — id → `unclear`, label updated, `next` →
  `TERMINAL:human_review_unclear_bucket`.
- **Added** the same tap to `land_water`, `year_clean_path`, `year_recheck`, `q4_sales`,
  `q5_equipment`, and `q3_alt` (additive — `q3_alt`'s `farming_alone` → `red_farmer_cannot_reconcile`
  path is untouched, confirmed by grep after editing).
- Removed `human_review_farmer_other` and `human_review_no_acreage` from `farmerVerdicts` — grepped
  first to confirm nothing else referenced either id before deleting, per the handoff's own
  instruction. `human_review_unclear_bucket` is **not** a table entry (documented with a comment in
  its place): its `reasons`/`agentNote` vary per node/per call, so — same reasoning the handoff gives
  for `handleOtherSubmit` — it's constructed inline in `AmberPanel.tsx`.
- Confirmed (by reading `classify.ts` and `api/_classify-core.ts`) that neither file hardcodes farmer
  bucket ids — the Haiku prompt is built generically from `taps.map(t => t.id/definition)` — so the
  renamed/added taps flow into the classifier prompt automatically, exactly as §6 assumed. No
  classifier file touched.

**`apps/agent/src/features/agent/call/amber/AmberPanel.tsx`**:
- New state: `unclearPending: { question, path } | null`, `unclearNote: string`. Reset alongside the
  existing `[nodeId]`-keyed effect's other per-question state.
- `advance()` now intercepts `nextTarget === 'TERMINAL:human_review_unclear_bucket'` before the
  generic TERMINAL/DYNAMIC handling — it still appends the `PathEntry` for the current question first
  (closing the §1 trail gap), then stops short of resolving a verdict and stores `{ question, path }`
  instead of calling `onVerdict` immediately.
- New `submitUnclearNote()` — fires on the note box's "Route to separate review" button (present
  whether the note is empty or filled). Builds `human_review_unclear_bucket` with a dynamic,
  per-question `reasons[0]` and `agentNote: unclearNote` (raw, possibly empty string), then calls
  `onVerdict(v, null, unclearPending.path)` — `null` score, matching the existing convention for
  agent-initiated (not tree-native) HUMAN_REVIEW verdicts like `handleOtherSubmit`/`escalate()`.
- Note box renders directly under the taps list once `unclearPending` is set — same textarea/
  placeholder copy as today's floating "Other" panel. Confirm/Retake for the tap-selection step itself
  are completely untouched by this (the note only ever appears *after* a commit, via the existing
  700ms confirm-then-advance timing), so §3.2's "don't gate the existing CTAs" holds by construction,
  not by a special case.
- **Question counter bug caught and fixed during live testing, not in the original plan**: `advance()`
  appends the current question's `PathEntry` to `path` before checking whether the target is the
  unclear bucket. Since `questionCount` was `path.length + (node ? 1 : 0)`, once `unclearPending` sets
  in without changing `nodeId`, the header showed "Question 2" while Q1's note box was still open —
  overcounted by one for the whole time the note box is visible, not just a one-frame flash. Fixed by
  special-casing `questionCount` to `path.length` (not `+1`) while `unclearPending` is set. Verified
  live before and after the fix (screenshots below reference the corrected behavior).
- Retake (§5): removed the `{!retakeUsed && (...)}` gate at both call sites, and the `if (retakeUsed)
  return; setRetakeUsed(true);` guard inside `handleRetake()`. Grepped first to confirm nothing else
  read `retakeUsed` — kept the state variable (now write-only, via `const [, setRetakeUsed]`) and its
  `[nodeId]` reset, per the handoff's own fallback instruction, since deleting it entirely would also
  mean touching the shared reset effect for no functional gain.
- `nodeHasOwnOtherTap` now checks for `t.id === 'other' || t.id === 'unclear'` (was `'other'` only) —
  see the disclosed scope note below for why.

**`apps/agent/src/components/call/PostCallConfirmation.tsx`** — `CaseSummaryFields` gained a fourth
block, `Agent note (at point of termination)`, rendered only when `verdict.id ===
'human_review_unclear_bucket'`; falls back to `"No note provided"` when `agentNote` is empty/unset.
`QuestionTrail` needed no changes — it already renders `entry.transcript` for every `PathEntry`
(confirmed per §4c), and the terminating question now gets a real entry via `advance()`'s change
above, rendered with the same plain row styling as any other — no banner, no highlight, per §4a.

## Two premise mismatches — disclosed, not silently applied or silently skipped

Both come from the same root cause: §2's "Removed entirely" instruction for the free-floating "Other"
panel, and §5's Retake-uncapping, are both written in `AmberPanel.tsx` — a component **shared by all
three trees** — while the handoff's own top-of-doc scope line restricts the round to "Farmer Income
Mismatch tree only... SIM Circle Mismatch and Premium Address Risk are untouched this round."

1. **The free-floating "Other" panel was *not* deleted.** Reading it literally would remove it for
   every tree, but SIM's `a2_city` and premium-address's `addr_work`/`addr_living` nodes have **no
   catch-all tap of their own** (confirmed in the audit) — they depend entirely on this exact panel
   for a stuck case to have anywhere honest to go. Deleting it would regress two trees the handoff
   explicitly puts out of scope. Instead: `nodeHasOwnOtherTap` now also matches the new `unclear` tap
   id, which every farmer node carries after this round — so the panel already never renders for the
   farmer tree (its job is fully done by the inline tile, exactly as intended), while staying live and
   unchanged for SIM/premium-address. Net effect matches the handoff's actual goal without the
   regression its literal instruction would have caused.
2. **Retake's uncapping was applied to all three trees, not farmer-only.** Retake has no tree-specific
   branching anywhere in the code — it's a stateless UI affordance on the current question, identical
   regardless of which tree is active. §5 itself carries no "farmer only" qualifier (unlike §2/§3,
   which explicitly restate the scope), and the handoff's own intro frames all three changes —
   including Retake — as "one coherent change." Scoping it to farmer alone would need inventing new
   tree-awareness this component doesn't have, for a behavior with no reason to differ by tree.
   Flagging this since it's a real, cross-tree-visible change: SIM and premium-address cases can now
   also Retake more than once per question.

## Testing

- `npx tsc --noEmit -p tsconfig.json`: clean across all four touched files.
- **Live UI, this session's browser** against the dev server already running in your terminal on
  :4000 (not restarted): logged in, went online, ran three full farmer-tree calls (Dilip Chaudhary
  twice, Meena Devi once) via "Manually choose bucket" (simulate mode — bypasses `classifyAnswer`,
  exercises the full commit → advance → terminate state machine identically to a real classified
  answer):
  - **q1's renamed tap**: dropdown shows `Other / Doesn't know / Unclear` in place of the old
    `Other / unclear`, confirmed via `read_page`.
  - **land_area's renamed tap**: same, in place of `Does not know`.
  - **Retake uncapped**: tapped it once (discarded, back to awaiting), re-suggested the same bucket,
    and the "Not what they said? Retake" link **reappeared** — confirmed via `find` before tapping
    Confirm a second time. Would have been absent under the old one-per-question cap.
  - **Note box + submit-with-note**: typed a note, submitted, landed on `SEPARATE REVIEW REQUIRED`
    with `reasons` reading `Applicant's answer to "How much land do you farm, roughly?" did not
    clearly fit any bucket — routed to separate review.` — the dynamic per-question text working as
    specced. Case Summary confirmed: `Agent note (at point of termination)` field present with the
    exact typed text; `Question-by-question trail` showed both Q1 and the terminating Q2 as normal
    rows (Q2's transcript `"मुझे ठीक-ठीक पता नहीं है।"` and tap chip `Other / Doesn't know /
    Unclear`), no special styling — matches §4a/§4c exactly.
  - **Note box + submit-with-no-note**: same flow at q1, left the textarea empty, submitted — Case
    Summary's Agent note field read exactly `"No note provided"`.
  - No console errors across any of the three runs (`read_console_messages`, `onlyErrors: true`).
- **Not independently live-tested**: the four remaining new-tap nodes (`land_water`, `year_clean_path`,
  `year_recheck`, `q4_sales`, `q5_equipment`) — same tap shape, same shared verdict target, same
  commit path already exercised twice live; a code-level, not a behavioral, gap.
- **Not re-verified**: a real Haiku API call against the renamed/new tap definitions. Confirmed by
  reading `_classify-core.ts` that the prompt is built generically from whatever `taps` it's given
  (no hardcoded bucket ids), so this should flow through unchanged — but per the standing workflow
  note that classifier correctness needs a real, billed call to actually confirm (not just a code
  read), this is flagged as unverified rather than assumed clean. Worth a quick real-call check next
  round if you want it closed out.
