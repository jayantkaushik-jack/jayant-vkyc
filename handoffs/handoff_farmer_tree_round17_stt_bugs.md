# Handoff: Farmer Tree Live STT — Round 17 (Two Bugs)

**Context:** grounded in 3 screenshots (27 Aug 2026, ~10 AM) of Q1's live-listening flow on the
Farmer tree. Confirms the "Q1" eyebrow rename and the compact inline Listen-button layout (round 16)
are both correctly implemented — noted for the record only, not an issue.

---

## 1. Keyword match failure on a crop-only utterance — needs investigation before a fix, not a prescribed change

**Confirmed from the screenshots:** the final captured transcript was "मैं गेहूं खाता हूं" ("I eat
wheat") — "गेहूं" (wheat) is present as a clean, properly-spaced word, but the classifier returned
no match, falling through to "Mr. Holmes couldn't narrow this down — select manually."

**Two possible explanations, needs Code to check which is actually happening before this is treated
as a bug:**

- **Working as designed:** "Food grain + Own it" is a compound bucket (crop type *and* land
  ownership merged into one Q1 answer, per the locked design). This utterance never mentions
  ownership at all — if the matcher correctly requires both a crop cue and an ownership cue before
  committing to a compound bucket, it fell through correctly, and this is a test-utterance gap, not
  a code bug. **Retest with the full scripted line** ("मैं गेहूं उगाता हूं। यह मेरी अपनी ज़मीन है,
  लगभग चार एकड़।") before concluding anything needs fixing.
- **Actual gap:** if the matcher is meant to partial-match on a strong single-crop cue even without
  an explicit ownership phrase, that's not currently happening. This would be a real design decision
  (default toward "Own it," or ask a quick ownership follow-up) — not something to silently patch in
  without deciding it deliberately.

**Action:** Code checks the actual bucket-matching logic against a full scripted-line test before
either closing this as "working as intended" or building a fix for a decision that hasn't been made
yet.

---

## 2. Live transcript disappears mid-listen, only reappears on Stop — confirmed bug, clear fix direction

**Confirmed:** while actively listening, the interim transcript text appears, then disappears, then
only reappears once "Stop listening" is pressed and the final result lands. Expected behavior: the
transcript should persist and grow continuously through the whole listening session, never blank
out.

**Root cause, high confidence:** classic interim-vs-final result handling issue with the Web Speech
API's continuous recognition mode. The API fires interim results as speech is recognized, then a
final result after a detected pause. If the display logic replaces the shown text on each event
rather than accumulating it, a short mid-sentence pause can clear the interim buffer and blank the
display until the next segment's interim result arrives (or, in this case, until the final result
lands).

**Fix:** the transcript display should accumulate, not replace — finalized segments get appended
permanently; only the current in-progress interim segment gets updated as it's refined. Text should
only ever grow during an active listening session, never clear, so the agent can read everything
said in real time.

---

## Open items

Item 1 needs a retest with the full scripted line before Code decides whether this is a bug or a
design decision still to be made. Item 2 is ready to fix as specified.

---

## Resolution (Code)

### Item 2 — fixed

Root cause was slightly different from "interim/final handling" in the abstract — the state
management in `useSpeechRecognition.ts` was already correct (`transcript` accumulates finalized
segments permanently; `interimTranscript` correctly reflects only the in-progress segment). The bug
was in what `AmberPanel.tsx` chose to *display* during active listening: the "Applicant said" quote
box only renders once `flowState` leaves `'awaiting'`, which doesn't happen until listening actually
stops — so the *only* live feedback during listening was `interimTranscript` shown alone. That
value legitimately empties every time a phrase finalizes (a result leaves the browser's "interim"
set the instant `isFinal` flips), so the display blanked between phrases even though nothing was
actually lost — it was sitting in `transcript`, just not shown yet. Fixed by rendering
`transcript + interimTranscript` together during listening, so the visible text only ever grows.

Caveat on verification: the sandboxed browser this session runs in blocks microphone access
entirely ("Microphone access denied" on every attempt), and the Simulate path bypasses
`interimTranscript` altogether (it sets the final transcript directly after a fixed delay, never
populating the interim state). Neither available testing path can actually exercise a live,
multi-phrase Web Speech API session. Verified by code inspection only — the fix is a straightforward
recombination of two already-correct pieces of state, not new logic — but this has not been watched
running against real speech.

### Item 1 — investigated, not closed, no fix built

Couldn't run the retest this asks for: no `ANTHROPIC_API_KEY` exists anywhere in this
environment (not in `apps/agent/.env`, not in the shell) — checked both. `classifyAnswer` fails
closed to `null` under those conditions, indistinguishable in the UI from a real low-confidence
classification (both land on "Mr. Holmes couldn't narrow this down"), so I can't tell from here
whether the screenshots reflect the live Claude Haiku classifier or a deployment-config gap. If the
screenshots came from a deployment where the key *is* set, this finding doesn't apply — but that's
not something I can check from this machine.

Two findings worth having before anyone decides how to close this:

1. **There is no keyword matcher anywhere in this codebase to check.** Grepped the whole `amber/`
   tree — the entire classification mechanism is one generic LLM prompt (`_classify-core.ts`):
   question + transcript + the bucket id/label list, asking for a bucket + confidence, with **zero
   explicit guidance** on how to score a partial match against a compound bucket. So the two
   explanations this handoff poses aren't really "working as designed" vs. "a gap" — there's no
   design either way baked into the code. Whatever happened is Claude Haiku's own emergent judgment
   call on an unscored edge case, not a deliberate rule this app enforces.
2. **The transcript itself may not say what it looks like it says.** "मैं गेहूं खाता हूं" uses
   खाता (root खाना, "to eat") — not उगाता (root उगाना, "to grow"), which is what the scripted line
   and every other Q1 bucket's matching cues use. This isn't just "crop mentioned, ownership
   omitted" — as transcribed, it asserts eating wheat, not growing it, which arguably wouldn't
   support *any* Q1 farming bucket on its own merits, compound or not. Worth confirming with whoever
   ran the demo whether "खाता" is really what was said, versus a Web Speech API mishearing of
   "उगाता" — that changes the diagnosis entirely, and I have no way to check which from here.

Not fixing anything here, per this file's own instruction not to build a fix for a decision that
hasn't been made yet — and this can't even be closed as "working as intended" on the evidence
available from this machine. Needs either a live retest against a deployment with a working key, or
an explicit decision on how compound buckets should score partial evidence, before this moves.
