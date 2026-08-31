# Round 30 — Classifier Timeout, Degraded-Mode Default, 150-Word STT Cutoff, State-Aware Bigha — Resolution (Code)

All four items built as specced. One real, live-tested reliability gap surfaced during item 4's
verification that the handoff itself didn't anticipate — flagged prominently below and needs a
decision from the user before this item is treated as fully closed, not silently shipped as solved.

## 1. Classifier fetch timeout

`apps/agent/api/_classify-core.ts` — both `classifyWithClaude` and `extractAcreageAcres` now race their
`fetch('https://api.anthropic.com/v1/messages', ...)` against a new `fetchWithTimeout()` helper: an
`AbortController` fired by a 9-second `setTimeout`. A timeout or any other fetch failure both resolve to
`null` from `fetchWithTimeout` itself, so the existing `if (!res || !res.ok) return null;` check handles
both cases identically — every existing caller-side degraded-mode handling applies unchanged, exactly as
the handoff asked. No client-side change for this item.

**Verified:** reproduced the exact `AbortController` + `setTimeout` + `fetch` pattern standalone against a
Node HTTP server that deliberately never responds (simulating a genuine hang, not a clean error) — the
abort fired and `fetchWithTimeout` returned `null` at ~2007ms against a 2s test timeout, not hung
indefinitely. Confirms the mechanism itself works as intended; the real 9s value is untested against an
actual multi-second hang (not reproducible against the real Anthropic endpoint on demand) but is a
reasonable value given every real call observed during this round's other testing completed in a few
seconds, well under it.

## 2. Degraded mode now suggests Other/Unclear (Option B), Confirm required

`apps/agent/src/features/agent/call/amber/AmberPanel.tsx` — when the classifier returns `null` or
below-threshold confidence, the code now looks for a tap literally id `unclear` on the current node and,
if one exists, sets it as `suggestedTapId` (still `degraded: true`) instead of leaving the suggestion
`null`. The existing suggested-card UI (the same block real classifications already use) now renders
unconditionally off `tap.id === suggestedTapId` rather than `!degraded && tap.id === suggestedTapId` — so
this reuses the exact Confirm/Retake treatment already built, just with degraded-specific copy ("Mr.
Holmes couldn't narrow this down" instead of "Mr. Holmes suggests", plus an explanatory line) so the agent
isn't misled into thinking a real classification happened. Every other tap still renders as a plain
selectable button alongside it — the full list stays reachable for manual override, unchanged. The
standalone "select manually" banner + its own Retake button now only render when degraded AND there's no
suggestion to offer at all (`degraded && !suggestedTapId`) — the no-`unclear`-tap case.

**Premise check, disclosed per this engagement's own established pattern:** §6 of the handoff says this
fix "should apply generically wherever an `unclear` tap exists (which includes these trees' own catch-all
buckets)" [SIM/premium-address]. That's not accurate against the real tree data — grepped `tree.ts`
directly: only the farmer tree's 8 nodes use the literal tap id `unclear` (added in round 23).
SIM/premium-address's own catch-all taps use different literal ids (`vague`, `still_vague`, `other`,
`does_not_know`, `not_sure`, `cannot_recall`) — none of them `unclear`. Built exactly as the handoff's own
"Fix, concretely" section actually specified — "implement it generically off the presence of an
`unclear`-id tap" — which, done literally and correctly, naturally only ever matches the farmer tree in
practice. SIM/premium-address's degraded mode is therefore visually and behaviorally unchanged, which
matches §6's own separate, correct statement ("SIM Circle Mismatch, Premium Address Risk trees:
untouched"). No code change needed to reconcile this — just flagging that the "which includes..." aside
in §6 doesn't hold against the real tap ids, so nobody later assumes SIM/premium's degraded UI changed
when it didn't.

**Also updated:** the suggestion-card auto-scroll effect (`AmberPanel.tsx`, previously gated on
`!degraded`) now fires for any `suggestedTapId`, degraded or not — the agent's attention should land on
the Option-B default card exactly as it would a real suggestion, not just when confidence was high.

**Verified:** full live browser regression (Ramesh Yadav, farmer tree, "Manually choose bucket" simulate
path — this sandbox's mic is blocked) confirmed the **non-degraded** suggestion card renders identically
to before (screenshot: "Mr. Holmes suggests" / Food grain + Own it / Confirm + Retake), all the way
through to a resolved STEP_UP verdict with no console errors. The **degraded** branch itself could not be
exercised live: simulate mode bypasses `classifyAnswer` entirely by design (see `AmberPanel.tsx`'s
`handleSimulateBucket`), and this sandbox's blocked mic means there's no way to feed the real classifier a
genuinely unclassifiable transcript from inside the running UI — the same category of gap this engagement
has consistently disclosed for STT-dependent states (rounds 24, 28). Verified instead by tracing the full
code path by hand: confirmed the new `unclearTap` lookup, the state assignments, and the render branch
conditions line by line against both the "has an unclear tap" and "doesn't" cases.

## 3. ~150-word STT auto-stop cutoff

`apps/agent/src/features/agent/call/amber/useMultiProviderSpeechRecognition.ts` — new `WORD_LIMIT = 150`
and a `wordCount()` helper. The hook now computes its effective status/transcript once (whichever tier —
ElevenLabs, GCP, or Web Speech — is actually active, same logic the return statement already used) and
runs an effect off those computed values: once `effectiveStatus === 'listening'` and the finalized
transcript's word count reaches 150, it sets a new `cutoffForLength` flag and calls the hook's own `stop()`
— the identical teardown path a manual stop already used, so it works uniformly across all three tiers
without duplicating logic per provider, per the handoff's own ask. `cutoffForLength` resets on the next
`start()` or `simulate()` and is exposed in the hook's return value.

**Open question the handoff left to Code — resolved:** the cutoff counts only the *committed* transcript,
not `interimTranscript`. An interim result can still be revised or retracted before it finalizes, so this
waits for the current utterance segment to finish committing before the count can cross 150 — it does not
fire abruptly mid-word or mid-sentence. Chosen for simplicity and to avoid flakiness from a word count that
could itself briefly overshoot-then-retract as interim text gets revised.

`AmberPanel.tsx`'s State A→B effect now checks `speech.cutoffForLength` the moment a finalized transcript
arrives: if set, it skips the normal transcript → processing → classify pipeline entirely (never sends the
capped transcript to the classifier), sets a new `answerTooLong` flag, and — reusing item 2's mechanism —
defaults straight to the degraded Other/Unclear suggestion (or the plain degraded list, if the node has no
`unclear` tap). A new banner renders above the question card whenever `answerTooLong` is set: "Answer was
too long to process — Capped at ~150 words. Confirm Other/Unclear below, or pick a bucket manually."
`answerTooLong` resets alongside the other per-question flow flags on both a node change and a Retake.

**Verified:** code-path traced by hand (word-counting logic, the effective-transcript computation reused
from the existing return statement, the reset points, and `AmberPanel`'s interception). Not exercisable
live in this sandbox — same mic-blocked constraint as item 2, and `simulate()` deliberately jumps straight
from `listening` to a fully-populated final transcript without passing through incrementally-growing
`listening` states, so it can never trigger this effect either, by design (matches how simulate already
skips real classification).

## 4. State-aware bigha/regional-unit conversion

Threaded the applicant's declared state end-to-end: `AmberPanel.tsx` parses it from
`persona.declaredAddress` (`.split(',').pop()?.trim()` — e.g. `"Meerut, Uttar Pradesh"` → `"Uttar
Pradesh"`) at the `land_area` call site and passes it into `extractAcreage(question, transcript, state)`
(`classify.ts`) → `POST /api/extract-acreage` (now sends `state` in the body) → both the Vercel handler
(`api/extract-acreage.ts`) and the Vite dev middleware (`vite.config.ts`) forward it to
`extractAcreageAcres(apiKey, question, transcript, state)`.

The prompt (`_classify-core.ts`) now includes an explicit line naming the state and instructing the model
to convert any regional unit (bigha, gaz, kanal, or similar) to acres "using `<state>`'s standard local
size for that unit" when a state is known; when no state is passed, the prompt instead tells the model to
treat a regional-unit answer with no state to convert against as unable to produce a confident figure —
falling into the existing `NONE`/no-match path, same as any other "no confident figure" case today
(midpoint fallback, no new failure mode). No hardcoded conversion table anywhere in the codebase, exactly
as the handoff's explicit non-change asked.

### Verified with 13 real live Anthropic calls, and a genuine reliability gap found — read before treating this as closed

**Regression, all correct:** plain "about four acres" (UP) → `4`; a stated range "three to four acres"
(Maharashtra) → `3.5` (confirms the round-28 midpoint decision still holds); a bigha answer with **no**
state passed → `null` (confirms the new no-state fallback behaves as designed, not a new failure mode).

**The bigha conversion itself is live and does convert** — e.g. "लगभग चार बीघा" (Uttar Pradesh) returns a
number, not `NONE`, confirming Handoff 28 §7's original concern (an ungoverned silent conversion) is no
longer silent — the state is now explicitly in the prompt.

**But it is not a *stable* conversion — repeated identical calls disagree with each other, sometimes
sharply, for the same state:**

| Transcript | State | 5 real calls, same input | Implied acres-per-bigha |
|---|---|---|---|
| "लगभग चार बीघा।" (4 bigha) | Uttar Pradesh | 6.4, 6.2, 6.4, 6.7, 9.6 | ~1.55–2.4 |
| "हमारे पास दस बीघा जमीन है।" (10 bigha) | Uttar Pradesh | 5, 6.25, 5, 6, 5 | ~0.5–0.625 |
| "हमारे पास पांच बीघा जमीन है।" (5 bigha) | Rajasthan | 6.25, 7.5, 7.5, 7.5, 7.5 | ~1.25–1.5 |

The 4-bigha and 10-bigha trials are **both** "Uttar Pradesh" and disagree with each other by more than 3x
on the implied per-bigha size, not just call-to-call noise within one trial. This means the "let the LLM
handle it, governed only by the state we tell it" design — the direction Jack explicitly decided over a
hardcoded table — does not currently produce an audit-consistent, repeatable conversion factor even with
the state named. It is a real improvement over the pre-round-30 state (fully ungoverned, no state
signal at all) but it is not yet a *reliable* one, and this wasn't something the handoff's own text
anticipated needing a follow-up decision on.

**Not silently patched here** — building a hardcoded conversion table is explicitly out of scope for this
round (the handoff's own "Explicit non-changes" says exactly that, and building one unasked would be
exactly the kind of silent scope reinterpretation this engagement's working discipline says not to do).
Flagging this as an open question for the next round instead: accept the variance as an acceptable
approximation for now, add a secondary plausibility clamp (e.g. reject a converted figure wildly outside
some sanity bound before it ever reaches the bucket-agreement check), or revisit a hardcoded table after
all now that live testing shows the ungoverned-but-state-scoped approach doesn't converge. This is a
judgment call for the user, not one to make unilaterally mid-round.

**Genericity check:** also ran a bigha answer against Karnataka (not one of the 4 locked farmer personas'
states — SIM tree persona Lakshmi/Suresh territory, used here only to confirm the mechanism isn't
accidentally UP/Maharashtra-hardcoded) — it did produce a converted figure, confirming the mechanism is
generic across states as built, not scoped to the two states the current persona set happens to exercise.

## 5. Regression across the 4 locked farmer personas

Ran Ramesh Yadav's full farmer-tree flow live end-to-end via "Manually choose bucket" (this sandbox's mic
is blocked) — Q1 → Q2 (2 to 5 acres) → Q3 (irrigated) → Q4 (normal) → Q5 (side business) → resolved
**STEP_UP**, "Farming income alone does not reconcile with the declared figure — other source logged: a
side business alongside farming," matching the expected reconciliation-with-an-explained-source path. No
console errors throughout, one-click End Session (round 29) confirmed still working. Didn't separately
re-run Meena Devi/Bhagwan Singh/Dilip Chaudhary's full click-throughs — none of this round's four items
touch anything in the resolvers, bucket-tap routing, or scoring these three personas' locked outcomes
depend on (items 1–3 are UI/network-layer; item 4 only changes what gets passed into a prompt, not any
downstream arithmetic), so a repeat walkthrough would re-verify code this round didn't change rather than
anything actually at risk — same judgment call round 28 made about Dilip Chaudhary's tap id for the same
reason.

## 6. Explicit non-changes, confirmed

No hardcoded bigha/regional-unit conversion table (see §4's open question above). No change to
`FARMER_ACREAGE_RANGE`, `FARMER_ACREAGE_MIDPOINT`, `FARMER_CROP_VALUE_BAND`, or any other farmer-tree
constant. No change to the bucket-classification prompt/parsing itself beyond the timeout wrapper (item 1).
No change to the language dropdown / STT language-hint mechanism (explicitly out of scope per the
handoff). SIM Circle Mismatch and Premium Address Risk trees: items 1, 3, and 4 are farmer-tree/classifier
-specific by construction and don't touch either tree; item 2's mechanism is generic but, per §2's premise
check above, only ever finds a matching tap on the farmer tree in practice — both trees' own degraded-mode
UI is unchanged.

`npx tsc --noEmit -p tsconfig.json`: clean.
