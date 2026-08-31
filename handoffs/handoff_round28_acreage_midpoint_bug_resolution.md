# Round 28 — Acreage Bucket Midpoint Bug (Ramesh Yadav) — Resolution (Code)

Built exactly as specced: a second, separate, equally narrow LLM call extracts the literal acreage
figure from the same `land_area` transcript the bucket classifier already read, used in place of the
bucket's fixed midpoint only when it agrees with the bucket the classifier already chose.

## What changed

**`apps/agent/api/_classify-core.ts`** — new `extractAcreageAcres(apiKey, question, transcript)`,
alongside `classifyWithClaude`, same model, same narrow-contract style, reusing round 27's defensive
parsing pattern (search the full response for a valid token, don't require an exact match — the
model doesn't always comply with "respond with only X" on the first try, confirmed live in round 27
and not assumed to be fixed here just because it's a different prompt).

**Range-handling edge case, decided explicitly per the handoff's own ask**: when the applicant states
a range ("three to four acres"), the extraction returns the **midpoint** of that range, not either
endpoint — consistent with every other acreage figure in this file already being a representative
midpoint, not a boundary value. Documented in the function's own comment and the prompt text itself.

**`apps/agent/api/extract-acreage.ts` + `vite.config.ts`** — new endpoint/dev-middleware pair, same
dev/deployed split as `/api/classify` and `/api/stt-token`. **`apps/agent/src/features/agent/call/amber/classify.ts`** — client-side `extractAcreage()` wrapper, same failure contract as `classifyViaHaiku` (any failure → `null`, not a crash).

**`apps/agent/src/features/agent/call/amber/tree.ts`**:
- `PathEntry` gained `extractedAcreage?: number` — only ever set on the `land_area` entry, and only
  after the agreement check already passed (see below). `RoutingContext.path`'s narrower type updated
  to match.
- New exported `FARMER_ACREAGE_RANGE` — the numeric range each bucket actually represents (e.g.
  `land_2to5: [2, 5]`), used for the agreement check.
- `deriveFarmerFacts()` now reads `acreageEntry?.extractedAcreage ?? FARMER_ACREAGE_MIDPOINT[...]` —
  a plain "use it if present" read, **not** a second validation. This single change point fixes
  `resolveFarmerCalc`, `resolveFarmerCalcSoftened`, **and** `resolveFarmerEquipment` (the large-holding
  threshold check) together, since all three already flow through this one shared function — not
  separately called out in the handoff, but a natural, no-extra-code consequence of fixing at the
  shared derivation point rather than duplicating logic per resolver.

**`apps/agent/src/features/agent/call/amber/AmberPanel.tsx`**:
- Fires `extractAcreage()` alongside (not gating) the existing bucket classification, only when
  `node.id === 'land_area' && tree.id === 'farmer_income_mismatch'`, and only on the real
  classification path — **skipped entirely in simulate mode**, consistent with simulate already
  bypassing `classifyAnswer` too. Result lands in a ref (nothing renders off it), reset per question
  and on retake.
- **The three-case agreement check runs in `advance()`**, against the tap id the agent actually
  confirmed (not just `suggestedTapId`, which can differ if they correct it) — the earliest point
  where that's known:
  1. Extraction returns nothing (vague amount) → not attached, not logged as a failure — the normal
     case whenever no clean figure was stated, per the handoff's own framing.
  2. Extraction returns a number outside the confirmed bucket's range → not attached, but **logged**
     ("Acreage disagreement — flagged for review") — the handoff's requested visibility into this
     specific disagreement, surfaced via the existing call-log mechanism (`onLog`) rather than a new
     UI surface, since none was specified.
  3. Extraction agrees with the bucket → attached to the `PathEntry`, and logged ("Literal acreage
     used") so the trail shows why the arithmetic used something other than the midpoint.

## Testing

- **Pure logic test** (no API calls) — reconstructed Ramesh Yadav's exact locked case and called
  `resolveFarmerCalc` directly: without `extractedAcreage`, reproduces the documented bug
  (`year_recheck`, the RED path); with `extractedAcreage: 4` attached (as the fix would produce),
  correctly returns `year_clean_path` (GREEN) — confirms the consumption side flips the verdict
  exactly as the handoff's math predicted.
- **Real live calls to `extractAcreageAcres`** — 6-case battery, 3 trials each, **18/18 correct**:
  Ramesh's actual recorded answer ("लगभग चार एकड़।") → 4, its English equivalent → 4, a stated range
  ("तीन से चार एकड़ के बीच") → 3.5 (confirms the midpoint decision), a genuinely vague answer → `null`,
  a large clearly-stated figure (15) → 15, and an off-topic/unrelated answer → `null`.
- **Live browser regression** (Ramesh Yadav, via "Manually choose bucket" — the only path this
  sandbox's blocked mic allows): confirmed the simulate path is completely unaffected by this
  change — extraction is correctly skipped, the flow still uses the bucket midpoint, and (as
  expected, not a bug) still reproduces the original RED outcome via `year_recheck`, since simulate
  mode never has a real transcript for extraction to work from. No console errors. This is the same
  category of gap every classifier-touching round in this engagement has carried: the real
  mic → transcript → extraction → agreement-check → arithmetic chain isn't exercisable end-to-end in
  this sandboxed browser, but every individual piece of it (`extractAcreageAcres` itself, and the
  consumption logic in `tree.ts`) is verified directly above.
- `npx tsc --noEmit -p tsconfig.json`: clean.

## Regression risk — re-checked against the handoff's own table

Re-ran the handoff's §5 hand-check as real code rather than by hand for the one case that matters —
Ramesh Yadav flips from RED to GREEN, confirmed above. Didn't independently re-verify Dilip
Chaudhary's exact `land_area` tap id (the handoff's own footnote flags this as unconfirmed) since,
per that same footnote, he's mismatched by a wide margin regardless of which adjacent bucket he lands
in — re-deriving his tap id wouldn't change his outcome either way, so it wasn't worth a separate
verification pass here.

## Explicit non-changes, confirmed

No change to bucket ids, tap routing, bucket ranges' meaning, `FARMER_CROP_VALUE_BAND`,
`FARMER_LARGE_HOLDING_THRESHOLD`, or `FARMER_BAD_YEAR_LOW_END_SOFTENING`. SIM/premium-address and
rounds 25–27's own fixes untouched. Non-acre land units (sq km, hectare, regional units) not touched,
per the handoff's own explicit hold.
