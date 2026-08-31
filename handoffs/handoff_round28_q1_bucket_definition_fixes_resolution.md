# Round 28 — q1 Bucket Definition Fixes (Live-Reported, No Handoff Doc) — Resolution (Code)

Reported directly in chat: "We grow rice and lentils and millets." at q1 landing on "Other / Doesn't
know / Unclear" instead of a specific crop bucket, with a claim that "this wasn't happening before."
Investigated with real live calls rather than assuming the claim or assuming round 27's fix was at
fault — found two genuinely separate issues, one requiring a product decision from the user, one a
straightforward misclassification fix.

## Investigation — checking "this wasn't happening before" against reality, not assumption

Ran the exact reported transcript against every prior version of the classifier prompt, live:

- **Current (round 27) prompt:** consistently `unclear`, 8/8 real calls.
- **Round 27's predecessor (round 25's prompt, still `max_tokens: 20`):** inconsistent — 3/5 rambled
  and got truncated (would have degraded, matching the original reported bug), 2/5 cleanly said
  `unclear`. Never `food_grain_own`.
- **The very original prompt (pre-round-25):** consistently `"seasonal"` — 5/5 — an outright
  misclassification, not a result the user would have wanted either.

**Conclusion: "this wasn't happening before" didn't hold up.** No prior version of this prompt
reliably produced `food_grain_own` for this transcript. Round 27's fix didn't regress anything here —
it just made the classifier consistently *reach* an answer instead of randomly failing to reach one,
and the answer it reached (`unclear`) was correct per the bucket definitions as they existed at the
time.

## Issue 1 — ownership strictness (a product decision, asked and confirmed)

`food_grain_own`'s definition required BOTH a food-grain crop AND an explicit ownership statement.
"We grow rice and lentils and millets" (and round 27's "हम दाल उगाते हैं") name real food-grain crops
but never mention land ownership — so per the literal definition, `unclear` was the technically
correct answer, not a bug.

**Asked the user directly rather than guessing:** should naming a real crop be enough by default
(assume ownership unless the applicant's own words say otherwise), or should the system keep
requiring an explicit ownership statement (protects against silently misrouting an actual tenant
farmer into the owner-farmer arithmetic path)? **User chose: assume ownership by default.**

**Fix — `tree.ts`, q1's three "_own" tap definitions plus `unclear`'s own definition:**
`food_grain_own`/`cash_crop_own`/`horticulture_own` now state ownership is assumed the moment a real
crop in that category is named, routing elsewhere (`tenancy_or_labour`) only if the applicant's own
words actually indicate non-ownership (leasing, working someone else's land). `unclear`'s definition
no longer lists "no clear land-ownership relationship" as a trigger on its own.

## Issue 2 — a genuine misclassification, found while re-testing, unrelated to the ownership question

Even after fixing the ownership rule, the exact reported transcript still didn't resolve correctly —
it now consistently returned `"seasonal"` instead. Isolated this with a quick series of real calls:

- "We grow rice." (one crop) → `food_grain_own`, 3/3.
- "We grow rice and lentils." (two crops, no season language) → `seasonal`, 3/3.
- "We grow rice and lentils and millets." (three crops, no season language) → `seasonal`, 3/3.
- "In summer we grow rice, in winter we grow wheat." (genuine rotation) → `seasonal`, 3/3.

**The model was treating "two or more crops named" as sufficient to mean "seasonal rotation,"**
regardless of whether any actual seasonal/temporal language was present — a real misread of
`seasonal`'s own definition ("different crops in different **seasons**"), not a new issue introduced
by the ownership fix, and not a product-preference question — this one is a plain bug against the
bucket's already-existing intent.

**Fix — `tree.ts`, `seasonal`'s definition:** now explicitly requires actual rotation/timing language
(season, kharif, rabi, summer/winter, an explicit "in X we grow Y, in Z we grow W" pattern) and states
plainly that naming multiple crops of the same category with no such language is NOT this bucket —
it should match that category's own bucket instead.

## Testing — 10-case real-call battery, 3 trials each, 30 total live Anthropic calls, all correct

| Case | Expected | Result |
|---|---|---|
| rice/lentils/millets, no season language (the reported case) | `food_grain_own` | 3/3 |
| two crops, no season language | `food_grain_own` | 3/3 |
| genuine seasonal rotation ("in summer... in winter...") | `seasonal` | 3/3 |
| genuine seasonal (the node's own `sampleTranscript`) | `seasonal` | 3/3 |
| round 27's reported case (दाल, no ownership) | `food_grain_own` | 3/3 |
| clear ownership stated (regression, `sampleTranscript`) | `food_grain_own` | 3/3 |
| cash crop, multiple named, no season language | `cash_crop_own` | 3/3 |
| explicit non-ownership (works someone else's land) | `tenancy_or_labour` | 3/3 |
| round 25's reported case (genuinely nonsensical) | `unclear` | 3/3 |
| livestock (regression, `sampleTranscript`) | `livestock_or_aquaculture` | 3/3 |

Every case passed on all 3 trials — no flakiness observed on this battery, and no regression to any
of the three prior rounds' fixes (25, 27) or to genuinely-distinct buckets (seasonal, tenancy_or_labour,
livestock) that this round didn't intend to change.
