# Round 25 — Unclear Bucket LLM Fix + Confirm/Note UX — Resolution (Code)

Followed §1's instruction exactly: made the real, live Haiku call first, before touching any code.
It found a real bug — not the one the handoff guessed at, but exactly the category it authorized a
fix for ("a parsing edge case").

## §1 — the real bug, found and fixed

Called `classifyWithClaude()` directly (same function the app uses) with the actual live q1 tap list
from `tree.ts` and the user's own reported transcript ("पता नहीं क्या-क्या उगाते हैं लोग मैं तो
कुछ भी नहीं होगा यार आज तक"). Raw Anthropic response: the model answered exactly `"unclear"`.

**That's the bug.** Round 23 named the farmer tree's shared catch-all tap `id: 'unclear'` on all 8
nodes. Round 21's classifier prompt already used the literal word `"unclear"` as its own escape-hatch
sentinel — the signal for "nothing fits, not even the catch-all." After round 23, those are the same
string. `classifyWithClaude()`'s parsing (`/^unclear$/i.test(cleaned)` → return `null`) couldn't tell
"the model correctly selected the catch-all bucket, whose id happens to be `unclear`" apart from "the
model gave up entirely" — both produce the identical text, so every catch-all match was silently
treated as a total failure and forced into degraded mode ("Mr. Holmes couldn't narrow this down"),
exactly matching the user's screenshot.

Confirmed this wasn't a one-off: ran a second real call with a genuinely nonsensical transcript
(random Devanagari-adjacent noise) — same literal `"unclear"` response. The two cases are
indistinguishable by string alone; the bug was structural, not a wording fluke.

**Fix — `api/_classify-core.ts`, the parsing edge case the handoff authorized, not a prompt
restructure:** moved the escape-hatch sentinel off the word "unclear" entirely, to a new
`NO_MATCH_SENTINEL = 'NO_MATCH'` that can't collide with any real (lowercase, snake_case) tap id.
Updated the prompt's own instruction to ask for `"NO_MATCH"` instead of `"unclear"` when nothing fits,
and the parsing check to match that instead. Two lines of prompt text and one parsing condition —
nothing else in the prompt touched.

**Re-verified live after the fix**, same two transcripts:
- The user's reported transcript: `classifyWithClaude()` now returns
  `{"bucketId":"unclear","confidence":0.9}` — a real suggestion, not degraded mode. Bug fixed.
- The genuinely-nonsensical transcript: also now returns the `unclear` bucket rather than `null`.
  This is **not** a new problem — q1's catch-all definition ("no identifiable crop, no clear
  land-ownership relationship, or the applicant didn't understand the question") is broad enough to
  legitimately cover that case too, and round 20's own design principle (documented in round 21's
  resolution) is that a catch-all bucket should always be preferred over degrading whenever one
  exists — degrading is meant for nodes with no catch-all at all, not reserved as a second escape
  hatch on nodes that already have one. `NO_MATCH` still exists as a real, distinct signal — it's
  just rarely reachable on farmer nodes now that all 8 have a catch-all, which matches the intended
  design rather than fighting it.

## §2 — confirm/note UX, verified against round 23's actual code

- **Retake at the tap-selection step:** confirmed live — "Not what they said? Retake" renders
  identically for the `unclear` suggested tile as for any other bucket (it's unconditional in that
  render branch, not tap-specific). No change needed.
- **Button label:** was NOT already "Confirm and Route to Separate Review" — the note box's submit
  button (wired to `submitUnclearNote()`) read the generic "Route to separate review". Relabeled to
  the exact required text, this bucket only — the shared tap-selection-step `Confirm` button (used
  by every suggested tap, not just `unclear`) is untouched, per the handoff's explicit "every other
  bucket's Confirm button stays as-is."

## Testing

- Real, live Haiku calls (both before and after the fix, both transcripts) via a standalone `npx tsx`
  script calling `classifyWithClaude()` directly — same established pattern as rounds 18b/21/24.
  Script was a local scratch file, deleted after use.
- `npx tsc --noEmit -p tsconfig.json`: clean.
- Live in the browser (simulate path — selected the `unclear` tap manually, since this sandbox's mic
  is blocked so the real classifier path can't be exercised end-to-end through a spoken answer here):
  confirmed Retake present at the suggestion step, confirmed the note box now reads exactly "Confirm
  and Route to Separate Review", submitted, confirmed the case still terminates correctly to
  `SEPARATE REVIEW REQUIRED` with the same dynamic per-question reason text round 23 built. No
  console errors traceable to this round's changes (one unrelated Vite HMR WebSocket log in this
  sandboxed pane, and simulate mode never calls `/api/classify` at all, so it isn't from the
  classifier fix either).
