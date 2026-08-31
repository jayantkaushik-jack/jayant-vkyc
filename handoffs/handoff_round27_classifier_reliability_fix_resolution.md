# Round 27 — Classifier Reliability Fix (Live-Reported, No Handoff Doc) — Resolution (Code)

Reported directly in chat (a screenshot showing "हम दाल उगाते हैं।" degrading to "Mr. Holmes
couldn't narrow this down" at q1), not from a written handoff — following the same
verify-with-a-real-call-first discipline as round 25 anyway, since that's what actually found the
bug.

## What was actually wrong — a different, more serious bug than round 25's

Ran the exact reported transcript through `classifyWithClaude()` directly (real API, real q1 taps).
First call returned a clean `food_grain_own`. Second call, same transcript, same prompt: the model
opened with an unrequested explanation — `"The applicant said \"हम दाल उगाते हैं\" which transl"` —
truncated mid-word by `max_tokens: 20`, never reaching an actual bucket id. Ran it 6 more times: only
1 came back clean; the other 5 all rambled and got cut off before stating an id.

**This is not round 25's bug reappearing.** Round 25 was deterministic — the same input always
produced the identical ambiguous string. This is Haiku inconsistently ignoring the prompt's own
"respond with only the bucket id" instruction, sometimes explaining itself first — and because
`max_tokens` was capped at 20 (enough for a bare id, not for a sentence), that explanation gets
severed before the model ever reaches the actual answer. The old parsing correctly recognized the
truncated ramble as unparseable and returned `null` — not a parsing bug this time, a prompt-compliance
one, sampled at roughly a 75% failure rate on this exact case (6 of 8 real calls across this
investigation).

## Fix — defense in depth, not a bet on prompt compliance alone

`api/_classify-core.ts`, three changes together:
1. **Prompt strengthened** — explicit "do not explain, do not restate the applicant's answer, do not
   add preamble; your entire response must be exactly one bucket id or exactly NO_MATCH."
2. **`max_tokens` raised 20 → 60** — so a ramble that still happens (prompts are not guarantees) has
   room to actually finish and state the id, instead of being cut off first.
3. **Parsing made robust to partial compliance** — still checks for the clean exact-match case first
   (unchanged, cheapest, most precise), but now falls back to searching the *entire* raw response for
   the sentinel or any bucket id as a whole-word match, rather than requiring the whole trimmed string
   to equal it. A compliant answer parses exactly as before; a non-compliant one that still manages to
   state the id somewhere now parses correctly too, instead of failing outright.

## Testing — real live calls only, no mocks

- **10 repeated real calls** on the exact reported transcript, post-fix: **0/10 degraded**. All 10
  resolved to `unclear` — not `food_grain_own` as the very first pre-fix call happened to return, but
  correct per this system's own existing design: `unclear`'s definition explicitly covers "no clear
  land-ownership relationship," which is exactly this case (a crop named, ownership never stated) —
  the same category round 21's own resolution doc already discusses and intentionally routes to the
  catch-all rather than a specific bucket. Not a new behavior this round introduced; the fix just now
  reliably *reaches* that already-correct answer instead of randomly failing to reach any answer.
- **Full regression battery, 3 real calls each, 15/15 passing, zero degrades across any of them:**
  - Clear food-grain + ownership (the node's own `sampleTranscript`) → `food_grain_own`, all 3.
  - Clear cash-crop + ownership (own `sampleTranscript`) → `cash_crop_own`, all 3.
  - Clear livestock (own `sampleTranscript`) → `livestock_or_aquaculture`, all 3.
  - Round 25's original reported transcript → `unclear`, all 3 (confirms round 25's fix still holds
    after this round's further changes to the same file).
  - This round's reported transcript → `unclear`, all 3.
- Across this investigation: **25 total real Anthropic API calls, zero returned `null`/degraded**
  post-fix (versus ~75% degrading pre-fix on the specific reported case).
