# Handoff 28 — Acreage bucket midpoint can produce a false income-mismatch (Ramesh Yadav case)

**Status:** locked, ready to build. Found via a live screen-recorded walkthrough (Jack's screenshot
review, 2026-08-30) of Ramesh Yadav's call, which unexpectedly resolved to RED/BLOCK instead of his
documented GREEN — traced to a real arithmetic bug, not a data-entry mistake or a bad recording.

## 1. What's actually broken

`resolveFarmerCalc()` (and its sibling `resolveFarmerCalcSoftened()`) never sees the applicant's
literal spoken acreage. It only sees which of 5 fixed buckets the classifier routed their answer
into (`land_under2` / `land_2to5` / `land_5to10` / `land_10to20` / `land_over20`), then substitutes
a **fixed representative midpoint** for whichever bucket matched:

```
land_under2:  1
land_2to5:    3.5
land_5to10:   7.5
land_10to20:  15
land_over20:  25
```

For a bucket spanning a 3x range like "2 to 5 acres," using a single midpoint is a coarse
approximation — and it's wide enough to flip a genuinely plausible declared income into a false
mismatch when the true acreage sits near the bucket's edge, exactly as it did here.

## 2. The specific case that surfaced this

Ramesh Yadav's persona record (`personas.ts`): `declaredAnnualIncome: 230000`, occupation Farmer.
On the actual recorded call he answered Q1/land_area with **"about four acres"** (literally
spoken, visible in the transcript and confirmed by Jack's screenshots), correctly bucketed as
`land_2to5`. `resolveFarmerCalc` then used the bucket's midpoint, **3.5 acres**, not the spoken 4:

- Crop/irrigation band (food grain, irrigated): ₹25,000–₹60,000/acre/year
- **Using bucket midpoint (3.5 ac):** plausible range = ₹87,500–₹2,10,000. Declared ₹2,30,000 is
  *above* this → fails → routes to `year_recheck` → (his "Normal" answer doesn't soften a too-high
  read) → `q3_alt` → "no other income" → **`TERMINAL:red_farmer_cannot_reconcile` → RED/BLOCK**
- **Using literal spoken acreage (4 ac):** plausible range = ₹1,00,000–₹2,40,000. Declared
  ₹2,30,000 falls *inside* this → passes → routes to `year_clean_path` → **GREEN**, exactly as
  documented.

This is not a demo fluke or a one-off bad take — it's a reproducible arithmetic gap between what
the applicant actually said and what the resolver used, and it happened to land close enough to a
band edge to change the verdict.

## 3. This directly contradicts an existing locked handoff — flagging the inconsistency

Round 22 (`Handoff_Round22_Farmer_Persona_Coherence_Rework.md`) explicitly documents Ramesh Yadav's
`declaredAnnualIncome` change to ₹2,30,000 and states, in its own locked table: **"4 acres wheat,
irrigated → ₹1,00,000–2,40,000. Declared ₹2,30,000 → Inside range, clean → GREEN"** — i.e. round
22's own math already assumed 4 acres, not the bucket's 3.5 midpoint, and asserted his outcome
would stay GREEN. Whatever changed `FARMER_ACREAGE_MIDPOINT` (or whenever it was written) doesn't
match what round 22 assumed and locked. This handoff is, in effect, restoring what round 22 already
committed to — not proposing new behavior.

## 4. Proposed fix

**Important: this is additive on top of the existing classifier, not a replacement for it.** The
`land_area` bucket (`land_under2` / `land_2to5` / etc.) keeps being decided exactly as it is today —
by the existing bucket-classifier call in `_classify-core.ts`, completely unchanged. The new piece
is a **second, separate, equally narrow LLM call** that extracts a literal acreage number from the
same transcript, and that number gets used instead of the bucket's fixed midpoint *only when it
agrees with the bucket the first call already chose*.

**Why a second call, not one call doing both — this is a deliberate choice, not an oversight.**
`_classify-core.ts`'s own comments document round 27 in detail: Haiku was asked to "respond with
ONLY the bucket id," and even with that single, narrow instruction it sometimes added an unrequested
explanatory preamble that then got truncated by `max_tokens`, degrading a real answer to a false
non-match. The round 27 fix tightened the prompt further and made parsing more defensive — the
whole direction of that fix was narrowing the contract to one bare token, not widening it. Asking
the same call to also reliably return a second field (a number) would loosen exactly the contract
round 27 just spent real effort hardening, at the same P0 layer. Two separate narrow-contract calls
(bucket: unchanged; number: new, equally constrained to "just the number, or NONE") are safer than
one call carrying two responsibilities — each stays as simple to get reliably right as the existing
one already is.

**What actually causes bucket vs. number disagreement — clarifying, since this isn't the classifier
being careless.** Both calls read the same transcript, so if that transcript is clean, both readings
should normally agree — this isn't a case of the LLM contradicting itself for no reason. The
realistic cause is an upstream STT/transcript issue: the applicant says "chaar" (four) but STT mis-
transcribes something closer to "chaalis" (forty) due to noise or accent, or the applicant self-
corrects mid-answer ("meri zameen... arey, chaalis nahi, chaar acre hai" — "not forty, four"). In
either case the bucket-classifier may still reasonably land on the right bucket from the sentence's
overall context, while the number-extraction call latches onto the wrong mention — both calls can be
individually "correct" given what's actually in the transcript, and still disagree with each other.
The agreement check exists to catch exactly this kind of transcript-level artifact, not to catch the
classifier being wrong.

**Three cases, precisely:**

1. **The bucket-classifier can't confidently place the answer in any bucket at all.** This is
   already handled today — it routes to `unclear`, upstream of any of this. No new fallback logic
   is needed here; this case never reaches `resolveFarmerCalc` as a numeric bucket in the first
   place, and the number-extraction call doesn't need to run at all for it.
2. **The bucket-classifier picks a real bucket (not `unclear`), but the number-extraction call
   returns NONE (no confident single number)** — e.g. the applicant said "somewhere between four
   and five, not much more," enough for the bucket call to correctly land on `land_2to5`, but not a
   single clean figure. Use the bucket's existing midpoint (3.5), exactly as today. This is not a
   failure case, just the normal case whenever the applicant doesn't state one clean figure.
3. **Both calls return a real answer, but the extracted number falls outside the chosen bucket's own
   stated range** — e.g. bucket call says `land_under2`, number call says 40. **Fall back to the
   bucket's midpoint, do not trust the outlier number**, and log/flag this specific disagreement for
   review — it's a signal that the underlying transcript may have an STT or self-correction issue on
   this call, independent of the acreage-arithmetic question itself.

Only when the bucket and the extracted number **agree** (the number falls within that bucket's own
stated range) does the literal number get used in place of the midpoint — this was Ramesh Yadav's
actual case: bucket call correctly said `land_2to5`, number call correctly returns 4, 4 is inside
2–5, so 4 should be used instead of 3.5.

**One more edge case Code should decide explicitly, and can bake directly into the new prompt rather
than post-processing it:** what happens when the applicant states a range themselves ("three to four
acres")? Options include the extraction prompt returning the higher bound, the lower bound, the
midpoint of the stated range, or NONE (case 2 above, fall back to bucket midpoint). Pick one
deliberately and say so explicitly in the extraction prompt's own instructions, mirroring how
precisely `_classify-core.ts`'s existing prompt already spells out its own edge cases.

Where this lives: the new number-extraction call belongs alongside `classifyWithClaude` in
`apps/agent/api/_classify-core.ts` (same file, same model, same narrow-contract style — round 27's
own defensive parsing pattern, searching the full response for a valid token rather than requiring
an exact match, should carry over to this new call too). The consuming logic — using its result in
place of `FARMER_ACREAGE_MIDPOINT[acreageTapId]` when case 3's agreement check passes — lives in
`apps/agent/src/features/agent/call/amber/tree.ts`, in and around `deriveFarmerFacts()` (~line 560)
and the two resolver functions (~line 590-612).

## 5. Regression risk — checked against all 4 locked personas before writing this

Re-ran the plausibility math by hand for all 4 locked Path-A personas, literal spoken acreage vs.
bucket midpoint, to confirm this fix doesn't silently flip anyone else's locked verdict:

| Persona | Spoken acreage | Bucket midpoint | Band (₹/acre) | Declared | Verdict at literal | Verdict at midpoint | Changes? |
|---|---|---|---|---|---|---|---|
| Ramesh Yadav | 4 | 3.5 | 25,000–60,000 (food grain, irrigated) | 2,30,000 | Inside (₹1.00L–2.40L) → GREEN | Outside (₹0.875L–2.10L) → mismatch → RED | **Yes — this is the bug** |
| Meena Devi | 4 | 3.5 | 80,000–450,000 (horticulture, irrigated) | 6,00,000 | Inside (₹3.20L–18.00L) | Inside (₹2.80L–15.75L) | No — clean either way |
| Bhagwan Singh | 3 | 3.5 | 12,000–35,000 (cash crop, rain-fed) | 3,50,000 | Outside (₹0.36L–1.05L) | Outside (₹0.42L–1.225L) | No — mismatched either way, same downstream path |
| Dilip Chaudhary | 2 | 3.5* | 80,000–160,000 (sugarcane, irrigated) | 12,00,000 | Outside (₹1.60L–3.20L) | Outside (₹2.80L–5.60L)* | No — mismatched either way by a wide margin |

*Dilip's exact bucket wasn't independently re-verified against the live tap id in this pass (either
`land_under2` or `land_2to5` both leave him far outside the band at ₹12L declared) — worth Code
double-checking his actual tap id when implementing, but the margin is wide enough that it doesn't
affect the conclusion.

**Only Ramesh Yadav's verdict changes.** The other three locked personas sit far enough from their
band edges that the literal-vs-midpoint difference never matters for them — please still run the
actual regression suite (round 27 mentions one exists) against all 4 after implementing, rather
than relying solely on this hand-check.

## 6. Does this change the demo script? — No, for 3 of 4; Ramesh's script itself doesn't change, but expected outcome needs restating

- **Meena Devi, Bhagwan Singh, Dilip Chaudhary**: no change to their scripts or expected outcomes.
  Nothing to update in `Farmer_Tree_PathA_Final_Demo_Scripts.md` or the Shreyans call script for
  these three.
- **Ramesh Yadav**: his locked script text itself is unchanged — he still says "about four acres" at
  both Q1 and land_area, exactly as already written. What changes is that **this bug fix is what
  makes his script actually resolve to the documented GREEN outcome live** — right now, with the
  bug present, running his exact locked script produces RED instead, which is what Jack's recording
  demonstrated. Once this fix lands, no script edit is needed — the existing script will simply
  start producing the correct, already-documented result.

**For the product demo video specifically**: this explains why the recent Ramesh Yadav walkthrough
came out RED instead of the expected GREEN, and confirms that recording is not usable as the
"clean Green" persona take. Once this fix ships, a fresh take of the exact same locked Ramesh script
should produce the intended GREEN/PROCEED outcome — no script rewrite needed, just a re-record after
the fix lands (or confirm the fix first with a quick non-recorded test call before re-shooting).

## 7. Explicit non-changes

- No change to any bucket ids, tap routing, or the bucket ranges themselves (`land_under2` through
  `land_over20` keep meaning what they mean for display and classification).
- No change to the crop/irrigation ₹/acre bands in `FARMER_CROP_VALUE_BAND`.
- No change to `FARMER_LARGE_HOLDING_THRESHOLD`, `FARMER_BAD_YEAR_LOW_END_SOFTENING`, or any other
  farmer-tree constant.
- SIM Circle Mismatch, Premium Address Risk: untouched, same scope discipline as rounds 22/23/25/26.
- Round 25/26/27's own fixes: unrelated, unaffected layers — should build/verify independently.
- **Non-acre land units (sq km, hectare, and especially regional units like bigha/gaz/kanal): out
  of scope for this round, on hold at Jack's explicit instruction.** Parked here only as a note for
  future reference, not something Code should build now: regional units are a real landmine, since
  a "gaz"/"bigha" isn't a single fixed size — it varies by state/region — so a naive fixed conversion
  factor could produce a confidently-wrong number that's harder to catch than today's bug (this bug
  at least is loud; a bad silent unit conversion could be quietly wrong more often). If revisited
  later, treat plain SI conversions (sq km, hectare) as straightforward, and treat regional units as
  their own separately-scoped follow-up needing explicit sign-off on which convention to use.
