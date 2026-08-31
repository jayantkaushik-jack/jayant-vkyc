# Handoff: Farmer Income-Mismatch Tree — Round 12

**Purpose of this file:** a short covering note to hand to Code alongside the six source documents
below — not a restatement of their content, which is already complete and build-ready. This
confirms round 11's open items are resolved, flags two small consistency items from a cross-check,
and states scope clearly so Code doesn't build ahead of what's ready.

---

## Hand these six files to Code as the authoritative Path A spec

1. `Farmer_Tree_PathA_Code_Input.md` — the self-contained build spec: node structure, matching
   cues, classifier approach, resolution logic.
2. `Farmer_Tree_PathA_Final.md` (aka `Farmer_Tree_PathA_Final_Demo_Scripts.md`) — the worked-example
   layer: full bilingual scripts for all four locked personas, arithmetic walkthroughs, demo
   narration notes.
3. `Farmer_Tree_PathA_Crop_Value_Ranges.md` — sourced ₹/acre arithmetic, confidence levels per
   category.
4. `Farmer_Tree_Full_Diagram.txt` — the locked routing diagram, raw Mermaid source.
5. `PathBCD_StressTest_Notes.md` — Path B/C/D direction and findings (design-level only, not built
   — see Scope below).
6. `Shreyans_Call_Script.md` — the on-stage script for the live applicant voice.

These fully supersede round 11's draft and the earlier scattered documents (including the original
`Ramesh_Yadav_Demo_Script.md`, which is explicitly disclaimed in file 1 above). Round 11 does not
need to be handed to Code — treat it as superseded.

---

## Round 11's four open items — all resolved in this document set

1. **VAHAN timing.** Resolved: equipment ownership never resolves live. "Yes, owns" always routes
   to Amber (`equipment-verification-pending`); VAHAN runs post-call, upgrade happens outside VKYC
   scope entirely. (File 1, node `q5_equipment`; file 2's correction note.)
2. **Bad-year adjustment mechanism.** Resolved via the `year_clean_path` / `year_recheck` split —
   the softening logic now has an actual path to fire, without costing every clean case an extra
   tap. (File 1, tree structure + node definitions.)
3. **Live vs. hardcoded classification.** Resolved: live STT + keyword/phrase matching now, built
   as one swappable function so real LLM classification drops in later without a rewrite. (File 1,
   top section — "Classification mechanism.")
4. **Mr. Holmes caption wording.** Non-issue — round 10's `Mr. Holmes is reviewing the response…`
   stands; the alternate phrasing in file 6 was casual paraphrase, not a change request.

---

## Two small consistency items, worth fixing during build, not blocking

- **Outcome-string identifiers aren't fully consistent across documents.** The equipment-pending
  case appears as `step_up_equipment_pending` in some places and only described narratively in
  others; the Human Review variants (land_area "does not know," VAHAN no-match) never get a
  canonical string ID anywhere. Code should pick one identifier per outcome when building the
  actual enum/constants, rather than following three slightly different phrasings from three
  documents.
- **Meena Devi's horticulture large-holding threshold sits exactly at the boundary** (4 acres
  against a stated "3–4 acre" threshold). Resolves correctly as written, but worth Code confirming
  the boundary condition (`>=` vs `>`) explicitly so this doesn't become an off-by-one edge case
  later.

---

## Scope — what this build pass covers

**In scope:** Path A only — the four locked personas (Ramesh Yadav, Meena Devi, Bhagwan Singh,
Dilip Chaudhary), fully specified end to end in files 1 and 2.

**Explicitly out of scope for this pass:** Path B (seasonal/multi-crop), Path C (livestock/
poultry/fish/shrimp), and Path D (tenant/lessor/labourer) are all direction-locked per file 5, but
none have complete, build-ready question sequences and bilingual scripts the way Path A does. Don't
build these from the stress-test notes yet — they need the same worked-example treatment Path A
just went through before they're ready to hand off the same way.

---

## Carried forward, not part of this handoff

The Resolution Summary work (separate thread of work in this chat) needs two updates once it's
picked back up: the tractor-case worked example's reason text should change to the exact mechanism
confirmed here ("equipment ownership claimed, VAHAN verification pending"), and a new worked example
is needed for `step_up_bad_year_explained`, an outcome type that didn't exist when that work was
last touched. Not blocking this handoff — noting it so it isn't lost.

---

## Resolution (Code)

Built against the 21:44 batch of the six source files (there were two batches in Downloads with
genuinely different content, not just re-downloads — confirmed with you which to use before
starting). `tree.ts`'s farmer section is rebuilt end-to-end: `q1` (merged crop + ownership),
`land_area`, `land_water`, a real sourced ₹/acre band comparison (replacing the old
midpoint-times-0.5 threshold), the `year_clean_path`/`year_recheck` split exactly as specified,
`q4_sales`, `q5_equipment`, `q3_alt`. VAHAN's live-resolution path (`DYNAMIC:farmerVahan`,
`resolveFarmerVahan`) is deleted entirely, per the fix — "Yes, owns" now always lands on at least
`step_up_equipment_pending`. The four locked personas (`rameshyadav`, `meenadevi`, `bhagwansingh`,
`dilipchaudhary`) replace the old `vijay`/`ramchandra` placeholders in `personas.ts`.

Verified live in-browser, not just by reading the diff: Ramesh Yadav's full 6-tap script resolves
PROCEED with the exact reason text; Meena Devi's script resolves STEP_UP with both flags listed as
separate reasons (not merged into one), which specifically exercises the horticulture large-holding
threshold and the combined-flags branch of `resolveFarmerEquipment`.

### Judgment calls made — none of these are in the source docs, flagging each explicitly

1. **Sugarcane detection.** The routing mechanism only has access to which *bucket* was tapped, not
   the raw transcript, so "was sugarcane specifically named" (needed to pick the sugarcane-specific
   ₹/acre band) can't be read back at `land_water`/`resolveFarmerCalc` time the way the arithmetic
   doc assumes. Fixed by splitting q1's "Cash crop" bucket into two — general cash crop, and cash
   crop (sugarcane) specifically — a 4th bucket instead of the doc's stated 3. This is the only way
   to make "use the sugarcane row when sugarcane is named" actually work without threading raw
   transcript text through several downstream nodes.
2. **Bad-year softening magnitude.** The docs specify the *direction* (shifts the low end of the
   band down, never raises it) but never a percentage anywhere. Used 30%, not a sourced figure —
   flagged in the code comment. None of the four locked personas exercise this path, so it's
   untested against a real script.
3. **Large-holding threshold boundary.** Per your own flag in this file — used the *low* end of
   each sourced range ("3-4 acres" → 3, "10-12 acres" → 10) with an inclusive `>=`, specifically
   because Meena Devi's declared 4 acres has to trigger the flag as scripted. Verified live.
4. **No keyword-matching classifier built.** The doc assumes "no LLM key available yet, build
   keyword matching now, swap to a real LLM call later." That assumption is already stale — this
   codebase has a real, generic LLM classifier already wired end-to-end (`/api/classify`, Claude
   Haiku 4.5, keyed via `ANTHROPIC_API_KEY`), shared by every tree, not farmer-specific. It just has
   no key configured on this dev machine (`apps/agent/.env` doesn't exist locally), so it runs in
   degraded/simulate mode here. Nothing needed building — if the venue's deployment has the key set,
   live classification already works against these new Hindi bucket labels with no further code
   changes.
5. **Path B/C/D routing.** Rather than half-building any of the three non-Path-A branches, `q1`
   routes each straight to its own HUMAN_REVIEW verdict with a reason describing why (not built yet
   / structurally different arithmetic / locked to human-review by design for Path D). Matches
   "don't build these yet."
6. **Persona name collisions.** Two collisions existed against already-locked personas: "Ramesh
   Yadav" is one letter off the existing SIM-tree persona "Ramesh Kumar," and "Meena Devi" is the
   exact name of an existing, unrelated premium-address-tree persona. Kept both names exactly as
   specified — they're clearly intentional, used throughout all six source docs — but gave them
   distinct internal ids so nothing collides in code. Flagging because two personas both named
   "Meena Devi" doing different things now sit in the same queue, which is a real live-demo
   mix-up risk worth being aware of, not something to silently fix by renaming either one.

`vijay`/`ramchandra` were removed rather than kept alongside the four new personas — `vijay`'s
declared income (₹12L) exactly matches Dilip Chaudhary's, which reads as intentional continuity
across rounds (the same case, corrected and renamed) rather than coincidence.
