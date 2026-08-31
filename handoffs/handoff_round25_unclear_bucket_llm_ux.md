# Handoff 25 — Make the "Other / Doesn't know / Unclear" bucket LLM-suggestible, fix its confirm/note UX

**Status:** locked, ready to build. Continues from round 23 (which added the bucket, confirmed built
and resolved) and round 24 (STT, unrelated layer, also confirmed built and resolved). **Scope: Farmer
Income Mismatch tree only**, same as round 23.

**Read round 23's resolution doc
(`handoffs/handoff_farmer_tree_round23_universal_unclear_bucket_resolution.md`) before starting** —
it changes what this round actually needs to do, detailed in §2 below. Don't re-derive the current
implementation from a fresh code read; the resolution doc already documents it precisely.

## 1. What's actually wrong — confirm with a real call, not another code read

Round 23 added the `unclear` tap correctly to all 8 Farmer nodes (`tree.ts`), each with a real
`definition` field. The classifier prompt-construction code (`api/_classify-core.ts`) is already
fully generic over whatever taps it's given — it builds its bucket list from
`taps.map((t) => \`- ${t.id}: ${t.definition ?? t.label}\`)`, and its own existing instruction already
tells the model: "check whether one of the buckets above is itself a general catch-all for vague,
unclear, or unidentifiable answers... If one exists, respond with THAT bucket's id rather than
'unclear'." Round 23's resolution doc confirms (by reading `classify.ts`/`_classify-core.ts`) that
neither file hardcodes farmer bucket ids, so the renamed/added taps should flow into the classifier
prompt automatically.

**But round 23's own resolution doc flags this exact gap as still open, in its own words:**
"classifier correctness needs a real, billed call to actually confirm (not just a code read) — worth
a quick real-call check next round." Nobody has yet made one real Haiku call against the live
`unclear` tap and confirmed the model actually returns `unclear` (or a better-fitting bucket) instead
of falling back to the degraded "Mr. Holmes couldn't narrow this down" state. The user's own
screenshot showed exactly that degraded state on a genuinely unclear q1 transcript ("पता नहीं
क्या-क्या उगाते हैं लोग मैं तो कुछ भी नहीं होगा यार आज तक").

**This round's first, non-skippable step: make one real, live Haiku call** (same
`npx tsx`-standalone-script pattern used for round 18b/21/24's verification work — hitting the real
`/api/classify` endpoint or `classifyWithClaude` directly, not a mock) using the actual q1 tap list
from `tree.ts` and a transcript like the user's screenshot example. If it correctly returns
`unclear`, the bug is elsewhere (stale build the user was looking at, a UI-side issue in how the
suggestion is displayed once returned — check that next). If it does NOT return `unclear`, capture
the raw Haiku response and figure out why before changing anything — a parsing edge case, a prompt
wording issue, or something else. Don't guess a fix without seeing a real failing response first.

## 2. Confirm/note UX — mostly already correct per round 23's resolution, verify the remainder

Round 23's resolution doc states the note box "renders directly under the taps list once
`unclearPending` is set... appears *after* a commit, via the existing 700ms confirm-then-advance
timing" — i.e. it is **already visible immediately, not gated behind a toggle or extra reveal step**,
which was this round's main planned ask. Two things remain to verify/build against that baseline
rather than from scratch:

- **Button label:** confirm whether the button the user commits the note with already reads
  something like "Route to separate review" (round 23's resolution mentions `submitUnclearNote()`
  firing on a "Route to separate review" button) or still says a generic "Confirm". If it's not
  already exactly **"Confirm and Route to Separate Review"**, relabel it — this bucket only, every
  other bucket's Confirm button stays as-is.
- **Retake availability at the tap-selection step itself** (before the note box appears, i.e. while
  `unclear` is still just the suggested/highlighted tap, not yet committed): confirm "Not what they
  said? Retake" is available there identically to any other suggested bucket. Round 23's resolution
  says Retake is uncapped everywhere already (a cross-tree change, not farmer-only) — this round adds
  no new requirement here, just confirm it holds for this specific tap too.

**No other UX change needed this round** if the above two points check out — round 23 already built
the substance of what this handoff originally set out to request.

## 3. Where this lives in code

`AmberPanel.tsx` — the `unclearPending`/`unclearNote` state and `submitUnclearNote()` function round
23 added, per its resolution doc. Read that function and its rendering before touching anything; this
is a small verification-and-possibly-relabel task, not new state machine work.

## 4. Explicit non-changes

- The bucket's existence, its routing to `TERMINAL:human_review_unclear_bucket`, the Case Summary
  `Agent note (at point of termination)` field, and Retake's uncapped behavior: all already built and
  live-tested per round 23's resolution, untouched by this round.
- SIM Circle Mismatch, Premium Address Risk: untouched, same scope discipline as rounds 22/23.
- The classifier prompt itself (`_classify-core.ts`): not being rewritten pre-emptively — §1's real
  call may reveal a small fix is needed (e.g. a parsing edge case), but don't restructure the prompt
  without first seeing evidence it's actually broken.
- Round 24's STT work: unrelated layer, confirmed already built/resolved, not touched here.
