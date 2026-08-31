# Handoff 30 — Classifier timeout, degraded-mode default, 150-word STT cutoff, state-aware bigha conversion

**Status:** locked, ready to build. Found via Jack's live testing (screen recording + screenshots,
2026-08-31) of the farmer tree — three separate real bugs/gaps, traced to specific code in
`_classify-core.ts`, `AmberPanel.tsx`, and `useMultiProviderSpeechRecognition.ts`. Grouped into one
handoff since they touch overlapping files, but each is independently buildable/testable — no
dependency between them.

## 1. Classifier fetch has no timeout — a stalled call hangs the UI forever

**What's broken:** `classifyWithClaude` and `extractAcreageAcres` in `apps/agent/api/_classify-core.ts`
call `fetch('https://api.anthropic.com/v1/messages', ...)` with no `AbortController` or any timeout.
On the client, `AmberPanel.tsx` does:

```ts
Promise.all([classifyAnswer(node.question, transcriptText, node.taps, tree.id), holmesMinHold]).then(...)
```

`holmesMinHold` is a fixed 1800ms floor (always resolves). If the Anthropic call *stalls* rather than
cleanly failing or erroring (slow network, half-open connection, provider hiccup), the promise never
settles, `Promise.all` never resolves, and `flowState` sits on `'processing'` indefinitely — the UI
never even reaches the degraded/"couldn't narrow down" state, because that state is gated behind this
same unresolved promise. This is distinct from a normal classification failure (bad response, no key,
HTTP error) — those already return `null` correctly via the existing `try/catch` and degrade
gracefully. Confirmed via Jack's screen recording: pre-17s interaction worked (STT quality aside),
post-17s interaction transcribed fine but the LLM step never fired at all — consistent with a hang,
not a clean failure.

**Fix:** add an `AbortController`-based timeout to both fetches in `_classify-core.ts` — 8–10 seconds
is reasonable for a Haiku call. On abort/timeout, return `null` exactly as the existing failure paths
already do, so the caller's existing degraded-mode handling applies unchanged. No client-side changes
needed beyond what's already there, since `classifyAnswer`/`extractAcreage` already treat any
rejected/failed promise as `null` today — this closes the one gap where the promise neither resolves
nor rejects, it just never returns.

## 2. Degraded mode ("couldn't narrow this down") pre-selects nothing — should suggest Other/Unclear, agent must confirm

**What's broken:** confirmed in `AmberPanel.tsx` — when `classifyAnswer` returns `null` or
low-confidence, the code does `setSuggestedTapId(null); setDegraded(true);`. The render for
`degraded === true` shows the "Mr. Holmes couldn't narrow this down — select manually" banner and the
full bucket list with **no bucket highlighted or pre-selected**, confirmed against Jack's screenshot
(Q1, applicant clearly said wheat + own land, degraded mode showed nothing selected, not even
Other/Unclear).

**Decided direction (Jack, this thread): Option B — suggest Other/Unclear as the default, same
Confirm/Retake treatment as a real Mr. Holmes suggestion, not an auto-commit.** Rationale (Jack's,
confirmed in this thread): auto-selecting Other/Unclear outright would silently swallow cases where
the agent could clearly see the classifier missed an obvious answer (as in the screenshot above,
where a human would immediately pick "Food grain + Own it"). Requiring a Confirm keeps a human in the
loop, consistent with the existing HUMAN_REVIEW design principle already stated in `AmberPanel.tsx`'s
own `ResolutionCard` copy: "that review must be at least as rigorous as the automated path here, or
'I don't understand' becomes the cheapest way through."

**Fix, concretely:** when `flowState` enters `degraded`, instead of leaving `suggestedTapId` as
`null`, set it to that node's `unclear` tap id (every farmer-tree node's catch-all bucket already uses
the literal id `unclear` — confirmed in `tree.ts`), but render it through the **same suggested-card UI
block** already used for real suggestions (`Mr. Holmes suggests` card with Confirm/Retake) — not the
plain degraded list. Needs a small UI distinction so the agent can tell "the model suggested this
bucket with real confidence" apart from "the model couldn't decide, this is the fallback default" —
e.g. relabel the card copy specifically for this case ("Mr. Holmes couldn't narrow this down — confirm
Other/Unclear, or pick manually") rather than reusing the exact "Mr. Holmes suggests" wording, so the
agent isn't misled into thinking a real classification happened. The full plain bucket list should
still be reachable/visible below or alongside it for manual override, exactly as today's degraded
view already provides.

**Scope check:** this applies to every node with an `unclear`/catch-all bucket, not just Q1 — same
pattern already exists at `land_area`, `land_water`, `year_clean_path`, `year_recheck`, etc. (all
confirmed to have their own `unclear` tap in `tree.ts`). Implement it generically off the presence of
an `unclear`-id tap in `node.taps`, not hardcoded to Q1.

## 3. New: cap STT input at ~150 words, and show a clear "too long" message

**Context (Jack, this thread):** no cap currently exists on how long an applicant's spoken answer can
run before it's sent to the classifier — confirmed, `useMultiProviderSpeechRecognition.ts` only stops
listening when the agent manually calls `stop()`. Separately, `_classify-core.ts`'s Haiku calls do cap
the *model's reply* at `max_tokens: 60` (raised from 20 in round 27 specifically because Haiku
sometimes explains itself instead of answering bare) — but that's an output cap, unrelated to input
length. A long, rambling applicant answer (as in Jack's bug #2 case, which included an unrelated tangent
about potato prices) plausibly makes classification *harder*, not literally impossible — this cutoff
is a new deliberate product decision, not a fix for a specific observed input-length failure.

**Decided (Jack, this thread):**
- Auto-stop STT once the transcript reaches **~150 words**, same as if the agent had manually pressed
  stop.
- When that cutoff fires, show a clear UI message: **"Answer was too long to process"**.

**Fix, concretely:**
- In `useMultiProviderSpeechRecognition.ts`: track a running word count on `transcript` (simple
  whitespace split is fine, doesn't need to be exact) and auto-invoke the same `stop()` path once it
  crosses ~150, for whichever tier is currently active (ElevenLabs / GCP / Web Speech — the cutoff
  should live in the shared orchestrating hook, not duplicated per-provider).
- In `AmberPanel.tsx`: a new flag (e.g. `cutoffForLength`) set when this auto-stop fires, distinct
  from a normal manual stop. When set, skip the normal `processing → classify` path and show
  "Answer was too long to process" directly, then fall into the same Option-B degraded/Other-Unclear
  suggested flow from item 2 above (confirm or pick manually) — don't silently send a possibly
  truncated/confused transcript to the classifier at all in this case.
- Open detail for Code to decide during implementation: whether the cutoff fires mid-sentence
  (abrupt) or waits for the current utterance segment to finish committing first — either is
  reasonable, note whichever is chosen in the resolution doc.

## 4. Bug 3 resolution: state-aware bigha/regional-unit conversion, using the persona's declared address

**Context — this directly reopens Handoff 28 §7's explicit hold:** Handoff 28 parked regional-unit
conversion (bigha, gaz, kanal) specifically because a naive fixed conversion factor is unsafe — those
units vary by state, and a confidently-wrong silent conversion is worse than today's no-conversion
behavior. Testing this round confirmed that gap is now live and unmanaged: `extractAcreageAcres`'s
prompt in `_classify-core.ts` already asks for "a literal land-area figure, in acres," with no
mention of regional units or a conversion table at all — and Haiku is already silently converting
regional units on its own judgment (confirmed: a transcript containing only "bigha" resolved to a
confident acres figure, landing in the "2 to 5 acres" bucket, with zero governance over which
conversion factor was used).

**Decided (Jack, this thread): let the LLM handle the conversion, using the persona's own declared
state — don't build a hardcoded conversion table.**

**Confirmed available today:** every persona in `personas.ts` carries `declaredAddress: string`, and
every one of the 8 current personas ends with a real state name (spot-checked all 8: Karnataka, Delhi,
Uttar Pradesh ×3, Maharashtra ×4). For the farmer tree specifically (the only tree that calls
`extractAcreageAcres`), the 4 relevant personas are:

| Persona | declaredAddress | State |
|---|---|---|
| rameshyadav | Meerut, Uttar Pradesh | Uttar Pradesh |
| meenadevi | Nashik, Maharashtra | Maharashtra |
| bhagwansingh | Yavatmal, Maharashtra | Maharashtra |
| dilipchaudhary | Muzaffarnagar, Uttar Pradesh | Uttar Pradesh |

So today's locked persona set only ever exercises this against Uttar Pradesh and Maharashtra — worth
knowing for testing scope, though the mechanism itself should be built generically (works for any
state) rather than hardcoded to just these two.

**Fix, concretely:**
- Thread the applicant's state through to `extractAcreageAcres`. Simplest approach: parse it from
  `persona.declaredAddress` (last comma-separated segment) at the call site in `classify.ts`/
  `AmberPanel.tsx`, pass it as a new parameter into `extractAcreage()` → `/api/extract-acreage` →
  `extractAcreageAcres(apiKey, question, transcript, state)`.
- Update the prompt in `extractAcreageAcres` to explicitly instruct: if the applicant states a
  regional unit (bigha, gaz, kanal, or similar) rather than acres, convert it to acres using the
  standard local conversion for the given state, and state the assumption isn't left implicit — the
  prompt should name the mechanism (e.g. "the applicant is in <state>; if they use a regional land
  unit, convert using that state's standard local size for that unit") rather than leaving Haiku to
  infer which state's convention applies from nothing.
- Keep the existing `NONE`/no-match fallback behavior for any case where the model still can't
  produce a confident figure (e.g. state genuinely unclear, or a unit with no reasonably standard
  state convention) — this should fail exactly like today's existing "no confident figure" path,
  falling back to the bucket's fixed midpoint (`FARMER_ACREAGE_MIDPOINT`), not silently guessing
  further.
- Same defensive-parsing pattern as the existing calls in this file (search the full response, don't
  require an exact match) — no reason to diverge from that established pattern here.

**Explicit non-changes for this item:** no hardcoded bigha-size table anywhere in the codebase — the
conversion logic itself lives entirely in the LLM's own knowledge, governed only by the state we pass
it. If a future round wants a hardcoded table instead (e.g. for auditability/determinism), that's a
different design and should be its own separately-scoped decision, not assumed here.

## 5. Regression / testing notes

- Item 1 (timeout): test by simulating a slow/hung response if feasible (or just verify the timeout
  value is reasonable against normal latency), confirm degraded mode is reached instead of an infinite
  spinner.
- Item 2 (degraded → suggest Other/Unclear): re-test against the exact Q1 case from Jack's screenshot
  (wheat + own land + a rambling tangent) — note this may now resolve correctly on the classifier side
  once item 1's timeout rules out a hang as the cause; if it still degrades even without a hang, item
  2's new default should show the confirm-required Other/Unclear suggestion instead of nothing.
- Item 3 (150-word cutoff): test with a long rambling answer past ~150 words, confirm STT auto-stops
  and the "Answer was too long to process" message shows before falling to manual/degraded selection.
- Item 4 (state-aware bigha): re-run the acreage-extraction test that surfaced this bug (a bigha-only
  answer from a UP or Maharashtra persona) and confirm the converted acres figure is now reasoned
  against the correct state rather than an ungoverned guess. Also worth testing a persona/state pair
  not yet exercised, if convenient, to confirm the mechanism isn't accidentally UP/Maharashtra-specific.
- All 4 items: run against all 4 locked farmer personas (Ramesh Yadav, Meena Devi, Bhagwan Singh, Dilip
  Chaudhary) to confirm none of their locked demo-script outcomes change unexpectedly as a side effect
  — same discipline as Handoff 28 §5's regression table.

## 6. Explicit non-changes

- No change to `FARMER_ACREAGE_RANGE`, `FARMER_ACREAGE_MIDPOINT`, `FARMER_CROP_VALUE_BAND`, or any
  other farmer-tree constant.
- No change to the bucket-classification call (`classifyWithClaude`) itself beyond adding the timeout
  in item 1 — its prompt, bucket-definition text, and parsing logic are untouched.
- No change to the language dropdown / STT language-hint mechanism — separately discussed this thread,
  no action item resulted (keep as-is, possibly revisit labeling only, not in scope here).
- SIM Circle Mismatch, Premium Address Risk trees: untouched — item 2's degraded-suggestion fix should
  apply generically wherever an `unclear` tap exists (which includes these trees' own catch-all
  buckets), but items 1, 3, and 4 are farmer-tree/classifier-specific and shouldn't need any change to
  the other two trees' own (keyword-based) classification path.
