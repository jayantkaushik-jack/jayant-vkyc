# Full System Audit — Amber Resolution Layer

**Source:** direct read of the current codebase in `vkyc-dashboard-git` (apps/agent). Originally produced 2026-08-27; refreshed 2026-08-30 to reflect rounds 22–29 (Farmer persona/dimension rework, the universal "Other / Doesn't know / Unclear" bucket, multi-provider speech-to-text, Farmer-tree Hindi translation, three real classifier reliability fixes, the acreage-midpoint arithmetic fix, and the End Session dialog removal) — §1b, §1d, §2, §3, §4, §5, §6, §7, and §8 revised; a new §9 covers the speech-to-text provider layer that didn't exist at the previous refresh. This is a read-only extraction — nothing here was built or changed to produce it. All file:line references are to files under `apps/agent/src/features/agent/call/amber/` unless noted otherwise. Every citation below was re-read against the live file, not carried over from the previous version of this doc.

---

## 1. Every decision tree, in full

Three rule trees exist, registered in `RULE_TREES` (`tree.ts:1067-1092`). There is no fourth — that registry is the complete list.

| Tree id | Label | Entry node | Rotated entry node (prior-attempt applicants) |
|---|---|---|---|
| `sim_circle_mismatch` | SIM circle does not match declared address | `q1` | `q1_reask` |
| `farmer_income_mismatch` | Declared income inconsistent with declared occupation (Farmer) | `q1` | `q1` (no rotation) |
| `premium_address_risk` | Declared address inconsistent with declared income/occupation | `q1_addr` | `q1_addr` (no rotation) |

Routing targets used throughout: a plain node id (advance to that node), `TERMINAL:x` (resolve straight to verdict `x`), `DYNAMIC:x` (call a resolver function that returns a `Verdict` directly), `ROUTE:x` (call a resolver that returns another routing target string, itself possibly a node id or another `TERMINAL:`).

### 1a. SIM Circle Mismatch (`simCircleNodes`, `tree.ts:136-266`)

**Untouched by rounds 22–29** — SIM Circle Mismatch has been out of scope for every round since round 21; every citation below is a line-number refresh only, the tree logic itself is identical to the previous audit.

| Node | Question | Taps → next |
|---|---|---|
| `q1` | "Have you ever lived or worked in another city?" | `yes_elsewhere`→`a2_city`, `no_always_here`→`b2`, `vague`→`q1_reask`, `no_comprehension`→`TERMINAL:no_comprehension`, `other`→`TERMINAL:other_at_q1` |
| `q1_reask` | "Just to check in a different way — has your work or family ever taken you to live somewhere other than here?" | `yes_elsewhere`→`a2_city`, `no_always_here`→`b2`, `still_vague`→`TERMINAL:human_review_still_vague`, `no_comprehension`→`TERMINAL:no_comprehension` |
| `a2_city` | "Which city, and roughly how long were you there?" | `matches_circle`→`a2_duration`, `other_indian_city`→`r1`, `outside_india`→`r1` |
| `a2_duration` | "Roughly how long were you there?" | `dur_under1`/`dur_1to3`/`dur_3to5`/`dur_over5`→`a3`, `dur_cannot_recall`→`a3` |
| `a3` | "When did you come back?" | `ret_within3mo`/`ret_3to12mo`/`ret_1to2y`/`ret_over2y`→`DYNAMIC:branchA`, `still_back_and_forth`→`TERMINAL:green_still_goes_back_and_forth`, `ret_cannot_recall`→`TERMINAL:human_review_vague_timeline` |
| `b2` | "Do you travel for work at all?" | `yes_regularly`/`yes_occasionally`→`b3`, `no_local`→`r1`, `other`→`TERMINAL:other_at_b2` |
| `b3` | "Which places do you travel to most?" | `includes_circle`→`TERMINAL:green_leaning_travels_for_work`, `excludes_circle`→`r1`, `other`→`TERMINAL:other_at_b3` |
| `r1` | "Did you visit a bank representative, or did someone else help you apply?" | `bank_or_bc`/`myself`/`family_friend`/`shop_cybercafe`→`r2`, `someone_approached`→`r1b`, `prefers_not`→`TERMINAL:human_review_declined_r_q1` |
| `r1b` | "Did that same person also arrange your mobile connection?" | `yes`→`TERMINAL:block_victim_flag`, `no`→`r2` |
| `r2` | "Which number should we use for alerts and statements?" | `this_number`/`no_preference`→`r3`, `different_number`→`TERMINAL:red_leaning_different_alert_number` |
| `r3` | "Has your family lived in another city?" | `yes_matches_circle`→`TERMINAL:green_leaning_family_migration`, `yes_other_city`/`no`→`TERMINAL:no_explanation_found`, `does_not_know`→`TERMINAL:human_review_family_unknown` |

`DYNAMIC:branchA` calls `resolveBranchA()` (`tree.ts:389-443`) — compares stated stay duration + time-since-return against the persona's hidden `simTenureMonths` (a tolerance window: `Math.abs(tenure - expectedTenure) <= max(4, stayMonths*0.3)`). If it overlaps: an age-plausibility check first (age ≤23 with a >5yr stay → `human_review_plausibility`), else `strong_green_branch_a` (PROCEED). If the SIM was clearly procured before the applicant could have left (`tenure < monthsSinceReturn - 3`) → `red_arithmetic_branch_a` (BLOCK). Otherwise → `human_review_arithmetic_vague`. A `dur_cannot_recall` short-circuits straight to `human_review_vague_duration` before any arithmetic runs.

**SIM terminal verdicts** (`simCircleVerdicts`, `tree.ts:268-362`):

| Verdict id | Band | Condition |
|---|---|---|
| `no_comprehension` | HUMAN_REVIEW | Applicant didn't understand the question |
| `other_at_q1` / `other_at_b2` / `other_at_b3` | HUMAN_REVIEW | Answer didn't fit any bucket at that node (agent's free-text note attached) |
| `human_review_still_vague` | HUMAN_REVIEW | Still vague after the re-ask |
| `human_review_vague_timeline` | HUMAN_REVIEW | Can't recall when they returned |
| `human_review_declined_r_q1` | HUMAN_REVIEW | Declined to say who helped apply |
| `human_review_family_unknown` | HUMAN_REVIEW | Doesn't know if family lived elsewhere |
| `human_review_vague_duration` | HUMAN_REVIEW | Can't recall how long they stayed (Branch A) |
| `human_review_plausibility` | HUMAN_REVIEW | Arithmetic overlaps but age band implausible for a >5yr stay |
| `human_review_arithmetic_vague` | HUMAN_REVIEW | Arithmetic neither clearly overlaps nor clearly contradicts |
| `red_leaning_different_alert_number` | STEP_UP | Alert number differs from the one actually in use |
| `block_victim_flag` | BLOCK | Third party arranged both SIM and application — victim-flagged, not fraud-flagged |
| `green_leaning_travels_for_work` | PROCEED | Travel pattern includes the SIM-circle state |
| `strong_green_branch_a` | PROCEED | Migration timeline overlaps SIM tenure, age-plausible |
| `green_leaning_family_migration` | PROCEED | Family history in the SIM-circle state |
| `green_still_goes_back_and_forth` | PROCEED | Still actively travels to that state |
| `no_explanation_found` | STEP_UP | Three ordinary openings offered, none explains the anomaly |
| `red_arithmetic_branch_a` | BLOCK | Returned long before the SIM was procured — timeline impossible |

### 1b. Farmer Income Mismatch — all four paths (`farmerNodes`, `tree.ts:734-856`)

**Changed across rounds 23, 26, and 28** — the tap/verdict *routing* structure changed in round 23 (universal catch-all), the *content* changed in round 26 (bilingual Hindi + q3_alt's English reworded), and the *classification semantics* of three q1 buckets plus `seasonal` changed in round 28 (ownership-assumption + seasonal-rotation tightening). Every node now also carries a `questionHi` field and every tap a `labelHi` field (round 26) — omitted from the tables below for readability; see §7 for the bilingual mechanism itself.

**q1** ("What do you grow, and is this land your own?", `tree.ts:736-749`) — the `other` bucket from the pre-round-23 audit is gone; every farmer node now shares one universal catch-all tap, id `unclear`:

| Tap id | Label | Path | Routes to |
|---|---|---|---|
| `food_grain_own` | Food grain (wheat, rice, pulses) + Own it | A | `land_area` |
| `cash_crop_own` | Cash crop (cotton, sugarcane, spices) + Own it | A | `land_area` |
| `horticulture_own` | Horticulture (grapes, pomegranate, mango, vegetables) + Own it | A | `land_area` |
| `seasonal` | Different crops in different seasons | B | `TERMINAL:human_review_farmer_seasonal` |
| `livestock_or_aquaculture` | Livestock/dairy, poultry, fish or shrimp farming | C | `TERMINAL:human_review_farmer_livestock` |
| `tenancy_or_labour` | Works as farm labour, or leases land in/out | D | `TERMINAL:human_review_farmer_tenancy` |
| `unclear` | Other / Doesn't know / Unclear | catch-all | `TERMINAL:human_review_unclear_bucket` |

**Round 28's ownership-assumption change to the three "_own" bucket definitions (`tree.ts:741-743`), confirmed with the user before building:** these buckets no longer require the applicant to explicitly state land ownership — a real crop in the matching category is now sufficient on its own, with ownership *assumed by default*. Only an explicit signal of non-ownership (leasing, working someone else's land) routes to `tenancy_or_labour` instead. This was a deliberate loosening, not a bug fix — the stricter pre-round-28 reading (crop AND an explicit ownership statement) had been degrading or catch-all-routing plainly-ownership-implied answers like "we grow rice and lentils and millets," confirmed via 30 real live Haiku calls before and after the change.

**Round 28's `seasonal` definition tightening (`tree.ts:744`):** now requires actual rotation/timing language (season, kharif, rabi, summer/winter, or an explicit "in X we grow Y, in Z we grow W" pattern) — previously, naming two or more crops in the same breath with *no* seasonal language at all was misrouting here 100% of the time in real testing (a genuine misclassification against this bucket's own stated intent, not a strictness judgment call like the ownership change above).

**Path B/C/D routing — confirmed still intentional, unchanged since the previous audit:** each of the three non-Path-A q1 buckets still routes directly to its own honest `HUMAN_REVIEW` verdict — `human_review_farmer_seasonal`, `human_review_farmer_livestock`, `human_review_farmer_tenancy` (`farmerVerdicts`, `tree.ts:871-885`), each with the same specific, accurate reason strings as before. Nothing in rounds 22–29 touched this.

**Path A's remaining nodes** (only reachable from the three Path-A q1 buckets; `tree.ts:750-855`):

| Node | Question | Taps → next |
|---|---|---|
| `land_area` | "How much land do you farm, roughly?" | `land_under2`/`land_2to5`/`land_5to10`/`land_10to20`/`land_over20`→`land_water`, `unclear`→`TERMINAL:human_review_unclear_bucket` |
| `land_water` | "Is your land irrigated, or does it depend on rainfall?" | `irrigated`/`partly_irrigated`/`rainfed`→`ROUTE:farmerCalc`, `unclear`→`TERMINAL:human_review_unclear_bucket` |
| `year_clean_path` | "Would you say last year was normal for your farming, or better or worse than usual?" | 4 taps→`q4_sales`, `unclear`→`TERMINAL:human_review_unclear_bucket` |
| `year_recheck` | "Was last year normal for your farming, or was it better or worse than usual — drought, flood, pest?" | `normal`/`better`/`varies`→`q3_alt`, `worse`→`ROUTE:farmerCalcSoftened`, `unclear`→`TERMINAL:human_review_unclear_bucket` |
| `q4_sales` | "Where do you usually sell what you grow?" | 7 taps→`q5_equipment`, `unclear`→`TERMINAL:human_review_unclear_bucket` |
| `q5_equipment` | "Do you own a tractor or any other farm equipment?" | 5 taps→`ROUTE:farmerEquipment`, `unclear`→`TERMINAL:human_review_unclear_bucket` |
| `q3_alt` | *(reworded round 26 — see below)* | 6 named-category taps→`DYNAMIC:farmerIncomeExplained`, `farming_alone`→`TERMINAL:red_farmer_cannot_reconcile`, `unclear`→`TERMINAL:human_review_unclear_bucket` |

Every node above gained the `unclear` tap in round 23 (previously only `q1` and `land_area` had any catch-all at all, via now-retired `other`/`does_not_know` ids) — see §3 for the shared verdict this routes to and §1d for round 25's classifier-collision bug this introduced and fixed.

**q3_alt's question was reworded in round 26** (`tree.ts:832-843`), an explicit English-string change, not just a translation addition. Was: *"That figure looks higher than we would expect for this land. Just to understand the full picture — does anyone in your household have another job, a pension, remittance from family working elsewhere, any government scheme payment, or rental income?"* Now: *"You'd mentioned your yearly income earlier — that seems a bit more than we'd expect for this land. Is there anything else coming in — another job, pension, remittance, government scheme, or rental?"* — the original opened with "That figure looks..." which only makes sense if the applicant can see a number in front of them; the new version anchors to "you'd mentioned earlier" instead. The 8 taps/buckets underneath this node are unchanged.

Resolvers (`tree.ts:661-732`):
- **`resolveFarmerCalc`** (`ROUTE:farmerCalc`, `tree.ts:661-668`): acreage × sourced ₹/acre band for the crop+irrigation combo, compared against the persona's declared income. In-band → `year_clean_path`; out-of-band → `year_recheck`. **Round 28: the acreage figure is no longer always the bucket midpoint** — see the acreage-extraction addendum below.
- **`resolveFarmerCalcSoftened`** (`ROUTE:farmerCalcSoftened`, `tree.ts:678-685`): only fires from `year_recheck`'s "Worse" tap — re-runs the same comparison with the band's low end shifted down 30% (`FARMER_BAD_YEAR_LOW_END_SOFTENING`, `tree.ts:577`, still flagged in-code as "a Code judgment call, not a sourced figure," unchanged). Now in-band → `TERMINAL:step_up_bad_year_explained`; still out → `q3_alt`.
- **`resolveFarmerEquipment`** (`ROUTE:farmerEquipment`, `tree.ts:699-710`): combines equipment-ownership claim with a "large holding + informal-only sales channel" flag. Four terminal outcomes: both flags → `step_up_both_flags`; owns only → `step_up_equipment_pending`; sales-scale only → `step_up_sales_scale`; neither → `green_farmer_reconciled`. Equipment ownership can **never** resolve live-Green — unchanged, VAHAN is still a backend-only lookup.
- **`resolveFarmerIncomeExplained`** (`DYNAMIC:farmerIncomeExplained`, `tree.ts:722-732`): unchanged — always returns `step_up_income_explained` (STEP_UP, `amberFlavor: 'explanation-logged'`), personalized reason string.

Sugarcane detection is still transcript-based, not a separate q1 bucket — unchanged mechanism (`FARMER_SUGARCANE_CUES`, `tree.ts:517-518`; consumed inside `deriveFarmerFacts`, `tree.ts:615-660`).

**Round 28 — the acreage-extraction addendum (`FARMER_ACREAGE_RANGE`, `tree.ts:497-545`; `PathEntry.extractedAcreage`, `tree.ts:95-118`).** `deriveFarmerFacts()` (`tree.ts:615-660`) used to always substitute a fixed representative midpoint (`FARMER_ACREAGE_MIDPOINT`, `tree.ts:499-505`: `land_under2`→1, `land_2to5`→3.5, `land_5to10`→7.5, `land_10to20`→15, `land_over20`→25) for whatever `land_area` bucket the classifier chose — coarse enough on a 3x-wide bucket like "2 to 5 acres" to flip a genuinely plausible declared income into a false mismatch, confirmed as a real bug on the locked Ramesh Yadav persona (3.5-acre midpoint falsely mismatches his declared ₹2.3L; his actual spoken 4 acres correctly reconciles). Fixed with a second, separate, equally narrow Haiku call (`extractAcreageAcres`, §2 below) that pulls the literal acreage figure from the same `land_area` transcript; used in place of the midpoint **only** when it agrees with the bucket the classifier already chose (checked in `AmberPanel.tsx`'s `advance()`, `AmberPanel.tsx:399-427`, against the tap id the agent actually confirmed):
- Bucket call can't confidently place the answer at all → already routes to `unclear` upstream; the extraction call never runs.
- Bucket matches, extraction returns no confident single figure (a genuinely vague amount) → not a failure, the normal case whenever no clean figure was stated — falls back to the midpoint exactly as before.
- Both return an answer, but the extracted number falls outside the confirmed bucket's own range (`FARMER_ACREAGE_RANGE`) → not trusted; falls back to the midpoint and logs the disagreement for review (`onLog('Acreage disagreement — flagged for review', ...)`, `AmberPanel.tsx:418-422`) — likely an STT or self-correction artifact on that specific answer.
- Both agree → the literal number is attached to the `land_area` `PathEntry` and used instead of the midpoint (`onLog('Literal acreage used', ...)`, `AmberPanel.tsx:416`).

Since `resolveFarmerEquipment`'s large-holding threshold check also reads `facts.acreage` from the same `deriveFarmerFacts()`, this fix improves that check's accuracy too, as a side effect of fixing at the one shared derivation point rather than duplicating logic per resolver — not something rounds 22–29's own handoffs asked for separately.

**Farmer terminal verdicts** (`farmerVerdicts`, `tree.ts:870-941`):

| Verdict id | Band | Condition |
|---|---|---|
| `human_review_farmer_seasonal` | HUMAN_REVIEW | q1 Path B |
| `human_review_farmer_livestock` | HUMAN_REVIEW | q1 Path C |
| `human_review_farmer_tenancy` | HUMAN_REVIEW | q1 Path D |
| `green_farmer_reconciled` | PROCEED | Income reconciles, no equipment claim, no sales-scale flag |
| `step_up_equipment_pending` | STEP_UP | Reconciles, but equipment ownership claimed (VAHAN pending) |
| `step_up_sales_scale` | STEP_UP | Reconciles, but large holding + informal-only sales channel |
| `step_up_both_flags` | STEP_UP | Both of the above at once |
| `step_up_bad_year_explained` | STEP_UP | Only reconciles after the bad-year softening |
| `red_farmer_cannot_reconcile` | BLOCK | Doesn't reconcile even softened, and no other income source offered |
| `step_up_income_explained` | STEP_UP | An alternate income source was named at q3_alt |

`human_review_farmer_other` and `human_review_no_acreage` — present in the previous audit — **no longer exist** as table entries (round 23): both `q1`'s old `other` tap and `land_area`'s old `does_not_know` tap were renamed to the shared `unclear` id and now route to the dynamically-constructed `human_review_unclear_bucket` instead (see §3). Confirmed via grep that nothing else in the codebase still references either removed id before they were deleted.

### 1c. Premium Address Risk (`premiumAddressNodes`, `tree.ts:950-1018`)

**Untouched by rounds 22–29** — same scoping discipline every round since 21 has held to. Line numbers refreshed only.

| Node | Question | Taps → next |
|---|---|---|
| `q1_addr` | "Is this address where you currently live, or an address for correspondence?" | `i_live_there`/`both_move_between`→`addr_tenure`, `correspondence_only`→`addr_whose`, `not_sure`→`TERMINAL:human_review_addr_unclear` |
| `addr_tenure` | "How long have you been living there?" | 4 duration taps→`addr_work`, `cannot_recall`→`TERMINAL:human_review_addr_unclear` |
| `addr_work` | "What do you do for work here?" | all 4 taps→`addr_living` |
| `addr_living` | "Do you stay alone, or with family or others?" | `alone`→`addr_landmark`, `with_family`→`TERMINAL:green_addr_family`, `shared`/`employer_provided`→`TERMINAL:strong_green_addr_shared_or_employer` |
| `addr_landmark` | "Which station or landmark is nearest to you?" | `answers_readily`→`TERMINAL:green_leaning_addr_landmark`, `hesitates`/`does_not_know`→`TERMINAL:red_leaning_addr_landmark` |
| `addr_whose` | "Whose address is this one, then?" | `family_member`/`employer`→`TERMINAL:green_addr_family`, `friend`/`not_sure`→`TERMINAL:human_review_addr_unclear`, `someone_who_helped`→`TERMINAL:block_addr_victim_flag` |

No resolver functions in this tree — every path is a static `TERMINAL:` target, no arithmetic.

**Premium-address terminal verdicts** (`premiumAddressVerdicts`, `tree.ts:1020-1065`):

| Verdict id | Band | Condition |
|---|---|---|
| `human_review_addr_unclear` | HUMAN_REVIEW | Unclear address relationship (3 different entry taps land here) |
| `green_addr_family` | PROCEED | Family/employer address for correspondence, or living with family |
| `strong_green_addr_shared_or_employer` | PROCEED | Shared accommodation or employer-provided housing |
| `green_leaning_addr_landmark` | PROCEED | Knows the local landmark readily |
| `red_leaning_addr_landmark` | STEP_UP | Claims to live alone, hesitates on/doesn't know a routine landmark |
| `block_addr_victim_flag` | BLOCK | Address belongs to whoever arranged the application — victim-flagged |

### 1d. Stubs / TODOs / partial builds — flagged explicitly

- **Farmer Paths B, C, D**: still direction-locked, not built as question sequences (see §1b above). Unchanged since the previous audit.
- **`resolveFarmerCalcSoftened`'s 30% softening magnitude** (`tree.ts:568-577`): unchanged, still flagged as "a Code judgment call, not a sourced figure."
- **Equipment ownership (`step_up_equipment_pending`)**: unchanged — always pending by design, VAHAN cannot complete live.
- **GCP as a speech-to-text tier** (round 24, §9 below): interface slot only — `connectGcp()` always resolves `null`. Blocked on Cashfree IT's SSL-inspecting proxy; nothing to test against until a key exists.
- **Round 25's classifier-collision bug, now fixed, worth recording as a cautionary precedent:** round 23 gave the farmer tree's shared catch-all bucket the tap id `unclear` — the same literal word round 21's classifier prompt already used as its own "give up entirely" escape hatch. A model correctly picking the catch-all bucket and a model genuinely giving up produced the identical string, so every catch-all match was silently treated as a total failure. Fixed by moving the escape hatch to a collision-proof sentinel (`NO_MATCH`, see §2) — a real example of two independently-correct rounds' changes interacting badly, only found via a live call, not a code read.
- **Round 27's classifier-reliability bug, now fixed:** independent of the round 25 issue above — Haiku doesn't always comply with "respond with only the bucket id," sometimes opening with an explanatory preamble that a too-tight `max_tokens` then truncated before the model ever stated its actual answer. Sampled at roughly a 75% failure rate on one real reported case before the fix. See §2.

---

## 2. Classification logic

**As of round 28, this remains a hybrid: the farmer tree classifies via two separate real Claude Haiku API calls; SIM and premium-address still classify via keyword/phrase matching.** The bucket-classification call is unchanged in kind since round 21 (though its prompt and parsing were hardened twice more, rounds 25 and 27); round 28 added a second, independent call scoped to the `land_area` node only.

**Signature** (`classify.ts:145-164`): `classifyAnswer(question: string, transcript: string, taps: ClassifyTap[], treeId?: string): Promise<ClassifyResult | null>`. Unchanged dispatch — `treeId === 'farmer_income_mismatch'` routes to Haiku; anything else uses the keyword path.

### 2a. Farmer tree bucket classification — Claude Haiku (`classifyViaHaiku`, `classify.ts:97-111` → `/api/classify` → `api/_classify-core.ts:72-153`, `classifyWithClaude`)

- **Model:** `claude-haiku-4-5-20251001`, unchanged.
- **Call path:** unchanged since round 21 — client → `fetch('/api/classify')` → Vite dev middleware or Vercel function → `_classify-core.ts` → the real Anthropic Messages API. Key stays server-side (`ANTHROPIC_API_KEY`) in all cases.
- **Prompt** (`_classify-core.ts:79-91`): rubric-style, built from real per-bucket `definition` fields, unchanged in structure. **Round 27 strengthened the closing instruction** to more forcefully forbid preamble: *"Respond with ONLY the bucket id, or ONLY \"NO_MATCH\" — a single token, nothing else. Do not explain your reasoning, do not restate or translate the applicant's answer, do not add any preamble or punctuation."*
- **The escape-hatch sentinel is now `NO_MATCH`, not `"unclear"`** (`NO_MATCH_SENTINEL`, `_classify-core.ts:53`) — changed in round 25 after a real live call proved the literal word `"unclear"` collided with round 23's identically-named catch-all bucket id (see §1d). `NO_MATCH` cannot collide with any real (lowercase, snake_case) tap id.
- **`max_tokens` raised 20 → 60** (`_classify-core.ts:105`) — round 27's fix for a different, more serious reliability bug: the model doesn't always comply with "respond with only X," and 20 tokens was cutting off a real answer mid-explanation before it was ever stated. Confirmed via 8 real calls on one transcript: only ~2 came back clean pre-fix, the rest truncated into garbage.
- **Response parsing is now two-tiered** (`_classify-core.ts:113-134`): first checks for an exact match on the trimmed response (the common, well-behaved case, unchanged cost/precision); if that fails, falls back to searching the *entire* raw response for the sentinel or any bucket id as a whole-word match — round 27's defense against a non-compliant answer that still states the real id somewhere inside an unrequested preamble.
- **land_area is included in this scope** — unchanged since round 21, classifies via the same Haiku call as every other farmer-tree node.
- **Failure handling:** unchanged — any failure returns `null`, same degraded/manual-selection UX.

### 2b. Farmer `land_area` acreage extraction — a second, separate Claude Haiku call (round 28) (`extractAcreageAcres`, `api/_classify-core.ts:156-193` → `/api/extract-acreage` → client wrapper `extractAcreage`, `classify.ts:123-136`)

**Deliberately a second call, not a widened contract on the existing one** — round 27 had just spent real effort narrowing `classifyWithClaude`'s contract to one bare token after finding Haiku doesn't reliably comply with "respond with only X"; asking that same call to also carry a second field (a number) would have loosened exactly what that fix hardened. Two single-token-contract calls are each as easy to get right as the existing one already is.

- Same model, same `max_tokens: 60`, same defense-in-depth parsing pattern (exact match first, then a full-response regex search) as `classifyWithClaude` — reused specifically because round 27 proved this model doesn't always answer bare on the first try, and there was no reason to assume a different prompt would be exempt from that.
- **Escape-hatch sentinel:** `NONE` (`ACREAGE_NO_MATCH_SENTINEL`, `_classify-core.ts:154`), distinct from the bucket classifier's `NO_MATCH` — no collision risk between the two calls since they're never compared against each other's taps.
- **Range-handling edge case, decided explicitly rather than left ambiguous:** when the applicant states a range ("three to four acres"), the extraction returns the **midpoint** of that range, not either endpoint — documented in both the function's own comment and the prompt text itself, consistent with every other acreage figure in this codebase already being a representative midpoint.
- Only ever called for the `land_area` node, and only on the real classification path — skipped entirely in "Manually choose bucket" simulate mode, same as `classifyAnswer` (`AmberPanel.tsx:333`).
- Verified with 18 real live calls across 6 scenarios (a clear single number, its English equivalent, a stated range, a genuinely vague answer, a large number, an off-topic answer) — all correct.

### 2c. SIM + premium-address — keyword/phrase matching (unchanged mechanism, unchanged table)

Fully unchanged since the previous audit — `BUCKET_RULES` (`classify.ts:53-68`), `MATCH_CONFIDENCE = 0.95` (`classify.ts:40`), `CONFIDENCE_THRESHOLD = 0.6` (`AmberPanel.tsx:29`), `normalizeHindi()` nuqta-stripping. No round since 21 has touched this table or these two trees' classification path.

**Fallback / "couldn't classify" handling:** unchanged at the `AmberPanel.tsx` level — a `null` result or confidence below 0.6 sets `degraded = true`, the agent sees the unstyled full bucket list with a "couldn't narrow this down" caption.

**Which questions have a genuine catch-all bucket — updated for round 23's universal rollout on the farmer tree:**

| Tree | Node | Catch-all tap id | Status |
|---|---|---|---|
| SIM | `q1` | `vague` | ✅ keyword cue (round 20), unchanged |
| SIM | `q1_reask` | `still_vague` | ✅ keyword cue (round 20), unchanged |
| SIM | `a2_duration` | `dur_cannot_recall` | ✅ keyword cue (round 20), unchanged |
| SIM | `a3` | `ret_cannot_recall` | ✅ keyword cue (round 20), unchanged |
| SIM | `r1` | `prefers_not` | ✅ keyword cue (round 20), unchanged |
| SIM | `r3` | `does_not_know` | ✅ keyword cue (round 20), unchanged |
| SIM | `b2`, `b3` | `other` | ✅ keyword cue (round 20), unchanged |
| SIM | `a2_city` | — | ❌ no catch-all option exists at all, unchanged |
| Farmer | **every node** (`q1` through `q3_alt`, 8 nodes total) | `unclear` | ✅ round 23 — was `q1`/`land_area` only pre-round-23 (as `other`/`does_not_know`); now universal across the whole tree, one shared id |
| Premium | `q1_addr` | `not_sure` | ✅ keyword cue (round 20), unchanged |
| Premium | `addr_tenure` | `cannot_recall` | ✅ keyword cue (round 20), unchanged |
| Premium | `addr_whose` | `not_sure` (same id, shares the `BUCKET_RULES` entry) | ✅ keyword cue (round 20), unchanged |
| Premium | `addr_landmark` | `does_not_know` (same id, shares the SIM `r3` entry) | ✅ keyword cue (round 20), unchanged |
| Premium | `addr_work`, `addr_living` | — | ❌ no catch-all option exists at either node, unchanged |

### 2d. A risk worth restating here: `land_area` drives live arithmetic — now via two calls, not one

Since round 21, `land_area`'s bucket choice comes from Haiku, not a deterministic parser; since round 28, the *acreage figure itself* can also come from Haiku (the extraction call in §2b) rather than always being the bucket's fixed midpoint. Both are now real, tested LLM-dependent inputs to `resolveFarmerCalc`/`resolveFarmerCalcSoftened`/`resolveFarmerEquipment`'s arithmetic. Round 28's own regression check (§1b) confirmed the acreage-extraction fix flips only the one persona (Ramesh Yadav) whose case actually sat near a bucket-midpoint edge; the other three locked Farmer personas are unaffected either way, verified by hand-checking the arithmetic, not assumed.

---

## 3. Human Review triggers — every coded path

**Tree-native HUMAN_REVIEW verdicts** (terminal, reached by normal question routing — see the tables in §1 for the exact triggering tap at each):

- SIM: `no_comprehension`, `other_at_q1`, `other_at_b2`, `other_at_b3`, `human_review_still_vague`, `human_review_vague_timeline`, `human_review_declined_r_q1`, `human_review_family_unknown`, `human_review_vague_duration`, `human_review_plausibility`, `human_review_arithmetic_vague` (11 total, unchanged)
- Farmer: `human_review_farmer_seasonal`, `human_review_farmer_livestock`, `human_review_farmer_tenancy` (3 total — `human_review_farmer_other` and `human_review_no_acreage` are gone, see §1b)
- Premium address: `human_review_addr_unclear` (1, reached from 3 different taps across 2 nodes, unchanged)

**New since round 23 — `human_review_unclear_bucket`, the universal catch-all's terminal, farmer-tree only.** Unlike every verdict above, this one is **not** a static `farmerVerdicts` table entry — its `reasons` and `agentNote` genuinely vary per node and per call (which question terminated, what the agent typed), so it's constructed dynamically at commit time, mirroring the older `handleOtherSubmit` pattern (below) for the same reason:

- Confirming the `unclear` tap on any farmer node pauses at the terminal (`AmberPanel.tsx:373-380`, the `advance()` interception) rather than resolving immediately — the agent gets an optional free-text note box first, same low-friction copy as the older "Other" panel, but non-mandatory and **not** gating the tap-selection Confirm/Retake CTAs.
- On submit (note present or empty), `submitUnclearNote()` (`AmberPanel.tsx:527-546`) builds the verdict: `reasons: ["Applicant's answer to \"${question}\" did not clearly fit any bucket — routed to separate review."]`, plus a separate `agentNote` field (empty string if left blank) — kept distinct from `reasons` specifically so the Case Summary can render it as its own labeled block only for this verdict (`PostCallConfirmation.tsx:104-110`, `verdict.id === 'human_review_unclear_bucket'` gate).
- Score passed as `null` to `onVerdict`, matching the convention every other agent-initiated (not tree-native) HUMAN_REVIEW verdict already uses.

**Agent-initiated, not tree-native, unchanged since the previous audit** (`AmberPanel.tsx`):
- **`handleOtherSubmit`** — the free-floating "Other" panel, now **SIM/premium-address only** (every farmer node has its own inline `unclear` tap as of round 23, so `nodeHasOwnOtherTap` — `AmberPanel.tsx:259` — suppresses this panel there automatically; it was deliberately *not* deleted outright since SIM's `a2_city` and premium's `addr_work`/`addr_living` still have no catch-all tap of their own and depend on it).
- **`escalate()`** — the abort/escalation flow (see §4). Unchanged.

**What data/context gets attached to a Human Review case:** unchanged — every `Verdict` carries `reasons: string[]`, and `onVerdict(verdict, score, path)` always passes the full `PathEntry[]` trail. `PathEntry` itself gained one new optional field in round 28, `extractedAcreage?: number` (`tree.ts:106-114`), only ever set on a `land_area` entry and only after the agreement check already validated it — display-only for the trail, consumed by `deriveFarmerFacts()` for arithmetic (§1b).

---

## 4. Abort / escalation flow

Defined entirely in `AmberPanel.tsx:44-89` (line numbers refreshed; content unchanged), sourced from "the Amber Resolution Layer doc's Section 11 corner-case table," general across all three trees.

**Six abort reasons, three kinds, unchanged** (`ABORT_REASONS`, `AmberPanel.tsx:60-89`):

| Reason id | Label | Kind | Behavior |
|---|---|---|---|
| `ask_repeat` | Applicant asks to repeat | `retry_ask_repeat` | Always retry-safe, unlimited |
| `rambles_unclear` | Applicant rambles / unclear | `retry_unclear` | Retry-safe up to once; a second unclear tap auto-escalates |
| `distressed_hostile` | Applicant distressed or hostile | `escalation` | One-line routing confirmation, then ends the tree |
| `language_barrier` | Language the agent can't handle | `escalation` | Same |
| `connection_unrecoverable` | Connection unrecoverable | `escalation` | Same |
| `stt_model_failing` | Speech-to-text / model repeatedly failing | `escalation` | Same |

Retry-safe vs. escalation split, `retryCount`/`abortOpen`/`escalationPending` state, and `escalate()` itself: all unchanged since the previous audit.

**Retake — uncapped since round 23, a cross-tree change, not farmer-scoped.** Previously one retake per question (round 19); round 23 removed the cap entirely — "Not what they said? Retake" and "Retake — listen again" are now always visible and clickable, any number of times, for every tree. The `retakeUsed` state itself is kept as inert write-only plumbing (`const [, setRetakeUsed] = useState(false)`, `AmberPanel.tsx:207`) purely so the existing `[nodeId]`-keyed reset effect (`AmberPanel.tsx:280`) didn't need restructuring — nothing reads it to gate the button any more.

**Corner-case handling reachable from the UI:** unchanged — connection drops, low/failing STT, and applicant distress/hostility are all still explicit abort reasons; low classifier confidence is still handled separately by the degraded-suggestion branch (§2), not the abort accordion.

---

## 5. Risk dimensions

**Names, keys, and where defined — unchanged structurally.** `RiskDimensions` (`personas.ts:20-26`), `DIMENSION_LABELS` (`personas.ts:28-34`), `DIMENSION_ORDER` (`personas.ts:37-43`) — same five keys, same canonical order, same load-bearing tie-break note. `Dimension { level; primarySignal? }` (`personas.ts:1-7`).

**How a dimension's tier is assigned — unchanged mechanism, changed values for the four Farmer personas (round 22).** Still hand-authored literals, no formula. Round 22 reframed the Farmer personas' pre-call flagging story from a generic "declared income inconsistent with declared occupation" to a **pincode-benchmark** framing:

- `coherenceRisk` (previously `NOT_AVAILABLE` for all four Farmer personas) now carries the actual flag: MEDIUM for Ramesh Yadav/Bhagwan Singh ("Declared income significantly exceeds the pincode benchmark for this occupation..."), HIGH for Meena Devi/Dilip Chaudhary ("Declared income is in the extreme upper percentile bracket for Farmers occupation...") — see `personas.ts:309,336,362,389`.
- `paymentFraudBlacklists` dropped to LOW for all four (was MEDIUM/MEDIUM/HIGH/HIGH) — that signal moved to `coherenceRisk` above.
- `identity`'s wording shortened from "No EPFO record despite declared employment" to "No EPFO record found," all four.
- `digitalPresence`/`telecom` unchanged (LOW for all four except Dilip Chaudhary's `digitalPresence`, still MEDIUM as before).
- Ramesh Yadav's `declaredAnnualIncome` changed 160000 → 230000 (see §6 for the downstream arithmetic implication, closed in round 28).

SIM and premium-address personas' dimension data: untouched.

`computeScore()` (`scoring.ts:28-38`) — the tree's own live "Composite score" — remains unrelated to the five `RiskDimensions`, unchanged.

**Dimension-specific display logic — two real changes since the previous audit, both round 22:**
- **`CustomerDetailsStep.tsx`'s pre-call callout now shows all 5 dimensions, not just the top-ranked one.** Previously built from `getFiredSignalParts()` (a single-dimension-plus-"+N more" summary); now renders the same always-show-all-5 `DimensionList` component (`CustomerDetailsStep.tsx:11,62`) that `RiskSnapshotModal.tsx` already used — the dimension-list block itself was extracted into a shared, exported `DimensionList({ dimensions })` (`RiskSnapshotModal.tsx:48-67`) so both call sites render identically rather than duplicating markup. `getFiredSignalLine`/`getFiredSignalParts`/`getRiskSummaryLines` themselves were **not** deleted — still used by the Accept/Reject card's compact summary, just no longer by this one call site.
- **`QueuePage.tsx`'s queue table**: the `Rule Fired` column no longer shows the tree-label/scenario line (`row.scenario ?? '—'`) — only the "N rule(s) fired" line remains, column narrowed `w-40` → `w-24`, header text changed to "Rules". The freed width went to the `Risk Profile` column (`w-16` → `w-28`), whose dots widened (`w-2.5 h-2.5 gap-0.5` → `w-3.5 h-3.5 gap-1.5`) to match (`QueuePage.tsx:108-119,144-160`). `row.scenario`/`SCENARIO_LABELS`/`RULE_TREES[...].ruleLabel` were confirmed (by grep, before removing the display line) not rendered anywhere else in the app.
- No icon set exists per dimension or per level anywhere — still colored chips/dots and text only, unchanged.

## 6. Personas and test data

**Every persona/test-data record that exists — unchanged in count and identity, changed in the four Farmer personas' field values (round 22).**

| Group | ids | Defined at | primaryTreeId |
|---|---|---|---|
| SIM circle mismatch | `ramesh`, `suresh` | `personas.ts:232-258, :259-287` | `sim_circle_mismatch` |
| Farmer income mismatch | `rameshyadav`, `meenadevi`, `bhagwansingh`, `dilipchaudhary` | `personas.ts:288-314, :315-340, :341-367, :368-394` | `farmer_income_mismatch` |
| Premium Address Risk | `lakshmi`, `meena` | `personas.ts:395-420, :421-445` | `premium_address_risk` |
| Sample cases | `sample_green`, `sample_red` | `personas.ts:196-211, :212-228` | none, view-only |
| Queue filler rows | `filler_priya`, `filler_arjun`, `filler_sunita`, `filler_farhan` | `personas.ts:483-552` | none, synthetic |

Still 8 interactive Amber personas + 2 sample cases + 4 filler rows = 14 records total.

**Ramesh Yadav's persona, round 22 → round 28's arithmetic close-out:** `declaredAnnualIncome` changed 160000 → 230000 (`personas.ts:294`) as part of round 22's pincode-benchmark reframing (§5). This is the same persona round 28's acreage-midpoint fix was built for — the previous audit's §1b/§2c already flagged `land_area`'s LLM classification as a live-arithmetic risk; round 28 confirmed that risk had actually materialized (a false RED on this exact persona) and fixed it. Round 22's own locked table asserting "4 acres → ₹1.00L–2.40L, declared ₹2.30L → GREEN" is now what the live app actually produces, confirmed via 18 real extraction calls plus a pure-logic reproduction of the bug and its fix.

**What's hardcoded vs. generated per persona — unchanged mechanism.** `AgentContext.tsx:110-116` still calls `buildIncomingCustomer(sessionRng, ...)`, a random draw from the 500-customer pool; `applyPersonaToCustomer` still only overlays `name`/`currentAddress`/`incomeEmployment`.

**Does avatar/language regenerate randomly per click? — Still confirmed yes, still not fixed.** No round since the previous audit touched `AgentContext.tsx`, `IncomingCallCard.tsx`, or `CustomerDetailsStep.tsx`'s language line. This remains the one open, previously-flagged bug this document knows of that hasn't been addressed — re-confirmed by grep that `sessionRng`, `buildIncomingCustomer`, and the `customer.language` read sites are byte-for-byte unchanged since the previous audit.

Sample cases and filler rows: unchanged, no `Customer`/avatar wiring.

## 7. Language / localization handling

**Two real, separate additions since the previous audit — round 24 (STT provider language codes) and round 26 (Farmer-tree bilingual UI copy) — on top of everything that was already there.**

**Every place the UI branches on language:**

1. `AmberPanel.tsx:39-42` — `SPEECH_LANGUAGES` (English → `en-IN`, Hindi → `hi-IN` via `languageToTag`), unchanged mechanism: sets which language the active speech-to-text provider listens in. **What changed underneath it (round 24):** this BCP-47 tag now feeds either the Web Speech API directly (unchanged path) or, first, ElevenLabs Scribe v2 Realtime, which does **not** accept BCP-47 — see §9's language-code mapping.
2. `useSpeechRecognition.ts` — `languageToTag()` unchanged, still maps 4 bank-declared language strings to BCP-47, still only 2 surfaced as selectable options.
3. `IncomingCallCard.tsx` and `CustomerDetailsStep.tsx` — still render `customer.language` as a static read-only label, unchanged.

**Round 26 — the Farmer tree is now genuinely bilingual, question text and every tap label, not just `sampleTranscript`.** This is a real change to what the previous audit's §7 stated ("No UI copy is ever swapped based on language... tree.ts question fields: confirmed English-only"). As of round 26:

- `QuestionNode` gained `questionHi?: string` (`tree.ts:49-50`), `Tap` gained `labelHi?: string` (`tree.ts:24-32`) — both optional, additive, display-only. Only Farmer-tree nodes/taps populate them; SIM and premium-address have neither field, so their rendering is byte-for-byte unchanged.
- **Display mechanism, confirmed with the user before building: bilingual, always both visible** — not a dropdown-driven toggle. English and Hindi render together on every question and every tap regardless of the `SPEECH_LANGUAGES` dropdown's setting.
- Rendered via two new small components in `AmberPanel.tsx`: `QuestionText` (`AmberPanel.tsx:111-121`) and `TapLabel` (`AmberPanel.tsx:123-132`), both falling back to English-only rendering when the Hindi field is absent (i.e. for SIM/premium-address). The one exception is the "Manually choose bucket" simulate `<option>` dropdown, which can't hold rich JSX — its options render as a single concatenated string (`"English — हिन्दी"`).
- **Explicitly confirmed not fed to the classifier:** `api/_classify-core.ts`'s bucket-list construction still reads only `definition ?? label` (both English) — `labelHi` was verified to leave that prompt-building code completely untouched before this was shipped.
- **Three typos in the originally-supplied Hindi text were caught and corrected** during this round (via Unicode-level inspection, not eyeballing) before being committed to `tree.ts`: an obscure Devanagari letter in "borewell" (`land_water`'s `irrigated` tap), a dropped letter in "would say" (`year_clean_path`'s question), and a non-word where "yearly" belonged (`q3_alt`'s reworded question). A fourth (a missing vowel sign in "asset," `q3_alt`'s `sold_asset` tap) was caught during transcription itself.

**Round 24 — ElevenLabs' language codes are ISO 639-1, not BCP-47, with no Hinglish-equivalent for STT input.** `toElevenLabsLanguageCode()` (`elevenLabsLanguage.ts`) does a plain "drop the BCP-47 region suffix" mapping (`hi-IN`→`hi`, `en-IN`→`en`) — verified against ElevenLabs' real API reference, not assumed. There is **no** combined code for Hindi-English code-switching on the STT input side (unlike Reverie's `hi_en` pattern, which an earlier planning document had speculated might carry over) — Scribe v2 handles code-switching natively within whichever single code is set. A `hinglish_mode` flag does exist in ElevenLabs' product, but it's an Agents/TTS *response-generation* setting, unrelated to transcribing what the applicant said, and not used here.

**Where bilingual content is stored, and the lookup pattern — for `sampleTranscript` specifically, unchanged.** Still only in the farmer tree, still a plain string field, still English-placeholder-on-fallback for the 6 brand-new round-23 taps that have no `sampleTranscript` of their own. This is a separate mechanism from round 26's `questionHi`/`labelHi` — `sampleTranscript` feeds the "Manually choose bucket" simulate playback, `questionHi`/`labelHi` feed the always-visible bilingual UI.

**`tree.ts` `question` fields: no longer English-only, for one tree.** The previous audit's regex-scan claim ("zero matches for `question:` + Devanagari") is now **false for the Farmer tree specifically**, by design — every Farmer `question`/`questionHi` pair and every Farmer tap's `label`/`labelHi` pair now carries real Hindi. SIM and premium-address remain exactly as before: English-only, confirmed still true by the same kind of direct scan.

---

## 8. UI copy inventory

Every citation below was re-read against the live file; entries removed by rounds 22–29 are called out explicitly rather than silently dropped, per this document's own established practice.

### AmberPanel.tsx — persistent header / progress bar

| Text | Location |
|---|---|
| "All KYC steps completed. Resolving {N} flagged signal(s)." | `AmberPanel.tsx:642` |
| "AMBER CASE" (Tag) | `AmberPanel.tsx:646` |
| "Question {questionCount} of 3–5" | `AmberPanel.tsx:647` |
| "Fired rules:" | `AmberPanel.tsx:649` |
| "Handed over {N} time(s) — {detail}" | `AmberPanel.tsx:657` |

### AmberPanel.tsx — question card

| Text | Location |
|---|---|
| "Q{questionCount}" eyebrow | `AmberPanel.tsx:664` |
| `node.question` **+ `node.questionHi` when present** (round 26, via `QuestionText`) | `AmberPanel.tsx:665, 111-121` |
| "Applicant said:" | `AmberPanel.tsx:681` |
| "Mr. Holmes is reviewing the response…" | `AmberPanel.tsx:694` |
| "Matching the applicant's answer to a response bucket" | `AmberPanel.tsx:695` |
| "Listening for one of these responses" | `AmberPanel.tsx:708` |
| "Mr. Holmes couldn't narrow this down — select manually" | `AmberPanel.tsx:749` |
| "Retake — listen again" (button, **uncapped since round 23**) | `AmberPanel.tsx:763` |
| "Mr. Holmes suggests" | `AmberPanel.tsx:772` |
| "Confirm" (button) | `AmberPanel.tsx:776` |
| "Not what they said? Retake" (button, **uncapped since round 23**) | `AmberPanel.tsx:786` |
| "Routing to separate review. Optionally add a note for the reviewer before submitting." (round 23, `unclear`-bucket note box) | `AmberPanel.tsx:817` |
| "Free-text note (low friction...)" (placeholder, **shared by both the `unclear`-bucket note box and the SIM/premium-only "Other" panel**) | `AmberPanel.tsx:822, 844` |
| **"Confirm and Route to Separate Review" (button, the `unclear`-bucket note box — relabeled round 25 from a generic "Route to separate review")** | `AmberPanel.tsx:825` |
| "Other / does not fit any bucket" (button, **SIM/premium-address only as of round 23**) | `AmberPanel.tsx:837` |
| "Route to separate review" (button, **the older SIM/premium-only "Other" panel — distinct from the relabeled button above**) | `AmberPanel.tsx:847` |
| "Transcript so far" eyebrow | `AmberPanel.tsx:869` |
| "(corrected)" suffix | `AmberPanel.tsx:876` |

### AmberPanel.tsx — Abort/escalation accordion (unchanged content, line numbers refreshed)

| Text | Location |
|---|---|
| "Unable to resolve / Abort call" (toggle) | `AmberPanel.tsx:1043` |
| "Retry-safe — stays on this question" | `AmberPanel.tsx:1059` |
| "Escalation — routes to Review" | `AmberPanel.tsx:1074` |
| "Applicant asks to repeat" | `AmberPanel.tsx:61` |
| "Applicant rambles / unclear" | `AmberPanel.tsx:62` |
| "Applicant distressed or hostile" | `AmberPanel.tsx:65` |
| "Language the agent can't handle" | `AmberPanel.tsx:71` |
| "Connection unrecoverable" | `AmberPanel.tsx:77` |
| "Speech-to-text / model repeatedly failing" | `AmberPanel.tsx:83` |
| "Routing to Review — no penalty to applicant" | `AmberPanel.tsx:67` |
| "Routing to a language-matched agent or Review" | `AmberPanel.tsx:73` |
| "Routing to Review with partial evidence attached" | `AmberPanel.tsx:79` |
| "Cancel" / "Confirm" (buttons, escalation) | `AmberPanel.tsx:1052-1053` |

### AmberPanel.tsx — persistent controls (quick flags / handover, unchanged content)

| Text | Location |
|---|---|
| "Quick flags" | `AmberPanel.tsx:945` |
| "Coached" (button) | `AmberPanel.tsx:954` |
| "Data error" (button) | `AmberPanel.tsx:964` |
| "\"Why asking?\" script" (button) | `AmberPanel.tsx:971` |
| "Handover" (button) | `AmberPanel.tsx:978` |
| "These are standard verification questions..." | `AmberPanel.tsx:983` |
| "If pressed on how we know something..." | `AmberPanel.tsx:984` |
| "Language mismatch or shift change..." | `AmberPanel.tsx:989` |
| "Receiving agent's name" (placeholder) | `AmberPanel.tsx:993` |
| "Reason (optional)" (placeholder) | `AmberPanel.tsx:999` |
| "Cancel" / "Confirm handover" (buttons) | `AmberPanel.tsx:1003-1004` |

### AmberPanel.tsx — SpeechCapture (unchanged content, line numbers refreshed)

| Text | Location |
|---|---|
| "Speech-to-text needs Chrome — not supported in this browser..." | `AmberPanel.tsx:1118` |
| "Listen for applicant answer" / "Stop listening" | `AmberPanel.tsx:1144` |
| "Language the mic will listen in..." (tooltip) | `AmberPanel.tsx:1151` |
| "Stage-reliability fallback..." (tooltip) | `AmberPanel.tsx:1164` |
| "Manually choose bucket ▾" | `AmberPanel.tsx:1176` |
| "Listening…" | `AmberPanel.tsx:1182` |
| "Microphone access denied" | `AmberPanel.tsx:1184` |
| "Speech recognition error — try again" | `AmberPanel.tsx:1185` |

### AmberPanel.tsx — ResolutionCard

**Round 29 — the "Customer still connected" confirmation dialog is gone entirely.** Clicking "End Session" (`AmberPanel.tsx:1274-1276`) now calls `onContinue` directly — one click straight to the Case Summary, for every verdict band (BLOCK/STEP_UP/HUMAN_REVIEW/PROCEED alike, since the removed dialog had no band-conditional logic to begin with). The `showEndConfirm` state, the `<Modal>` block, its title ("Customer still connected"), its body text, and its "Back"/"End Session" footer buttons are all deleted — along with the now-unused `PhoneOff` icon and `Modal` component imports.

| Text | Location |
|---|---|
| "Resolved" eyebrow | `AmberPanel.tsx:1235` |
| Band text: "SEPARATE REVIEW REQUIRED" / `BAND_LABEL[band]` | `AmberPanel.tsx:1221-1222` |
| "Composite score: {score}" | `AmberPanel.tsx:1237` |
| "Reasons" eyebrow | `AmberPanel.tsx:1240` |
| "This case exits the call unresolved..." | `AmberPanel.tsx:1255` |
| "Hidden signal (revealed now)" | `AmberPanel.tsx:1265` |
| "End Session" (button — **now the only click needed**) | `AmberPanel.tsx:1274-1276` |

Note: `verdict.pendingVerification.{documentsRequired, expertiseRequired}` and the `amberFlavor`-driven Case Summary copy remain not rendered anywhere in `AmberPanel.tsx` — still consumed only by `PostCallConfirmation.tsx`, unchanged.

**`PostCallConfirmation.tsx`'s `CaseSummaryFields` gained one new block (round 23):** "Agent note (at point of termination)" (`PostCallConfirmation.tsx:106`), rendered only when `verdict.id === 'human_review_unclear_bucket'` (`PostCallConfirmation.tsx:104`) — falls back to `"No note provided"` when the agent submitted with the note box empty.

### QueuePage.tsx

**Round 22 changed the `Rule Fired` / `Risk Profile` columns** — see §5 for the full detail. Everything else in this table is unchanged since the previous audit:

| Text | Location |
|---|---|
| "Today's Queue:" | `QueuePage.tsx:83` (unchanged) |
| Table headers: "Customer", "Band", "Score", "Risk Profile", **"Rules"** (was "Rule Fired") | `QueuePage.tsx:108-119` |
| Band chip word: "Green"/"Amber"/"Red" | unchanged |
| "{N} rule(s) fired" / "No rules fired" (**the scenario/tree-label line above it is gone**) | `QueuePage.tsx:162` |
| "You're offline" / "Waiting for next customer…" / "breathe in"/"breathe out" | unchanged |

Note: `RiskSnapshotModal` (opened by clicking a non-selectable queue row) is unaffected by round 22's queue-table change — it already showed the full 5-dimension list before this round, and never showed `row.scenario`.

---

## 9. Speech-to-text provider architecture (round 24 — did not exist at the previous audit)

**Not a swap of Web Speech API — a genuine three-tier fallback, shared infrastructure beneath all three trees, not scoped to Farmer.** Tried in this order, automatically and silently (no visible error state, no manual agent action) on every "Listen for applicant answer":

1. **ElevenLabs Scribe v2 Realtime** (WebSocket) — tried first, always.
2. **Google Cloud Speech-to-Text** — tried second, but only once a GCP key exists. Currently dead code (§1d) — blocked on Cashfree IT's SSL-inspecting proxy.
3. **Web Speech API** (`useSpeechRecognition.ts`) — the original, pre-round-24 mechanism, completely unchanged in its own implementation, now the final fallback rather than the primary path.

**Interface preservation, the design goal that let this land with zero changes to the consuming components.** The new orchestrating hook, `useMultiProviderSpeechRecognition` (`useMultiProviderSpeechRecognition.ts:29`), returns the exact same shape `useSpeechRecognition` always did (`status`, `transcript`, `interimTranscript`, `start`, `stop`, `reset`, `simulate`, `supported`) — so `AmberPanel.tsx` and `SpeechCapture` needed only a 2-line change (the import and the hook call itself; `SpeechCapture`'s prop type updated to match). Neither component is aware of which provider is actually running underneath.

**Tier-walking logic** (`attemptFromTier`, `useMultiProviderSpeechRecognition.ts:62-121`): on `start()`, tries ElevenLabs; if that fails to reach a live session, tries GCP (always fails today, see §1d); if that fails, falls back to Web Speech, which always succeeds or reports its own `unsupported`/`denied`/`error` status exactly as before round 24. A **mid-call** ElevenLabs failure (a drop after a session was already live) re-enters the same tier-walk from GCP without resetting the transcript already captured (`onMidCallFailure` → `attemptFromTier('gcp', ...)`).

**`simulate()` stays fully provider-independent** (`useMultiProviderSpeechRecognition.ts`, the `simulate` callback) — a verbatim copy of the original hook's 900ms listening→idle timing, with no dependency on any of the three real providers; confirmed live that it still works identically after the rewrite.

**Backend token endpoint** (`api/_stt-token-core.ts`, `issueSttToken` → `api/stt-token.ts` + `vite.config.ts`'s `sttTokenDevMiddleware`): mirrors `api/classify.ts`'s exact dev/deployed split. Calls ElevenLabs' `POST /v1/single-use-token/realtime_scribe` server-side using `ELEVENLABS_API_KEY` (added to `.env.example` alongside `ANTHROPIC_API_KEY`), returns a short-lived, single-use token to the client — the raw key never reaches the browser bundle, same guarantee as the Anthropic key.

**ElevenLabs realtime protocol — two real bugs found via live calls, not docs, both fixed in `elevenLabsSpeechProvider.ts`:** every message (client **and** server) uses `message_type` as its discriminator key, not `type`; the client's audio field is `audio_base_64`, not `audio_chunk`. Both were wrong in the first implementation (based on a secondary summary of the protocol, not the live wire format) and would have silently broken every real connection — caught only because round 24 insisted on a real human-voice test against the actual live endpoint (a standalone script, not a mock) rather than treating a code review as sufficient. The file's own header comment documents both fixes explicitly as a cautionary note for future protocol work in this codebase.

**Language-code mapping:** see §7 — ISO 639-1 via `toElevenLabsLanguageCode()`, no combined Hinglish code exists for STT input.

**Audio capture mechanics** (`connectElevenLabs`, `elevenLabsSpeechProvider.ts:76-237`): 16kHz mono PCM16 via `ScriptProcessorNode` (deprecated but simpler than an AudioWorklet for this scope), routed through a zero-gain node so the applicant's own mic audio is never echoed back to them. On `stop()`, `closeAll()` sends one trailing silent chunk with `commit: true` before actually closing the socket — confirmed live that this is necessary for the server to flush its final segment; a plain close without it drops whatever hadn't already committed.

**Disclosed gaps, not independently verified:**
- **Mid-call ElevenLabs failure → automatic fallback**: the client-side logic is straightforward to reason about but wasn't exercised live — deliberately killing an already-live connection mid-stream isn't practical to simulate cleanly in this environment. The *initial*-connect fallback (no key, connection refused) **was** verified live in-browser.
- **Multi-segment commit behavior**: the one real test recording never had a pause long enough to trigger more than one VAD auto-commit, so `committed_transcript` messages were only ever observed once per connection. The hook assumes each one is a new, non-overlapping segment to append (the standard design for every other streaming ASR API) — an inference from single-segment behavior, not confirmed against a real multi-segment call.
- **The actual in-browser mic → WebSocket path**: this sandbox's Browser pane has microphone access blocked (the same limitation every live-speech-dependent round in this engagement has carried) — the standalone verification script validates the identical production code path via a direct Node WebSocket connection instead of a real `getUserMedia()` capture.
- **GCP tier**: interface slot only, per §1d — `connectGcp()` always resolves `null`.
