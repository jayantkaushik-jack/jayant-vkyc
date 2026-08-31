# Handoff: Design Refresh — Round 15 (Reconciliation Appendix)

**Companion to `2026-08-26_design_refresh_handoff.md`** — that document is the primary spec for this
round and should go to Code as-is; it's precise enough (file paths, component names, exact Tailwind
classes) to build directly from. This appendix adds only what Code needs to reconcile it against
this thread's prior rounds: what's superseded, what stands unchanged, one mapping worth a sanity
check, and one bug this refresh doesn't actually fix despite touching the same component.

---

## Confirm before shipping

**§4's `Payment Behaviour → Coherence Risk` mapping.** Technically unambiguous — the doc gives exact
object-key renames (`paymentBehaviour→coherenceRisk`) and it's a straight 1:1 rename, not a merge,
so it's directly actionable as written. But semantically it's a bigger jump than the other three
renames (`Telecom Intelligence→Telecom` is an obvious shortening; this one changes what the
dimension sounds like it measures). Worth one quick confirmation this is the intended rename and not
a copy-paste slip in the mapping table, before Code renames keys across the scoring pipeline based
on it.

---

## Not actually fixed by this round, despite touching the same component

**Quick Flags' disappearing bug (round 9).** §6 redesigns Quick Flags from a card+grid to a
single-row pill toolbar — real estate and visual-identity fixes only. The underlying bug (the panel
vanishing intermittently, likely from a stale/independent visibility condition rather than reading
the single current-state value) was never root-caused and isn't mentioned here. New styling on an
unfixed bug just means it disappears more compactly — worth Code confirming this stays tracked as
its own item rather than being marked done because the visual redesign shipped.

---

## Superseded by this design refresh — prior rounds' specific choices, not their underlying intent

- **Progress rail layout (rounds 4–7).** Vertical right-hand rail → horizontal strip above the
  video/question row, single-word step labels. This is presentational only — the *state logic*
  those rounds established (all six prior stages pre-completed on load, Amber Resolution the sole
  active trailing item, single-active-stage invariant from round 5) is unchanged and still applies;
  it's just rendered horizontally now instead of vertically.
- **"Agent Script" eyebrow label (round 2, §7).** → `Q{n}` (e.g. "Q1") — shorter, same uppercase/
  muted eyebrow treatment. Text changes, visual role doesn't.
- **Quick Flags visual treatment (round 9/10 combined).** My spec called for a light-gray card with
  a `QUICK FLAGS` header and a 2×2 grid, specifically to stop it blending with the bucket options
  above. §6's single-row pill toolbar satisfies the same underlying intent (distinct identity, no
  blending) with a more compact execution — no conflict, just a better answer to the same problem.
- **Listen/Language/Simulate control row (round 9/10 combined).** My fix grouped Listen as a
  primary action beside a secondary cluster, separated by a gap. §6 goes further — full-width
  primary button *above* the dropdowns entirely, removing the side-by-side competition for space
  altogether. Cleaner resolution of the same shape-instability bug.

## Confirmed consistent — no changes needed

- **Mr. Holmes persona (round 10).** §6 keeps the named badge (`MrHolmesBadge`) and only upgrades
  the visual treatment (spinner + subtext instead of plain dots) — the naming and copy decisions
  from round 10 stand.
- **Resolution Summary / Case Summary (rounds 13–14).** §8 implements this directly from the round
  13/14 spec — Final Outcome badge, narrative paragraph, the pending-verification vs.
  explanation-logged field split, collapsible trail. Terminology matches exactly
  (`pending-verification`, `explanation-logged`), confirming the spec carried through precisely.
- **Scenario column (round 3).** §1's `min-width` fix for "Farmer Income Mismatch" clipping is a
  real bug fix on top of the round 3 spec, not a contradiction of it.

## Genuinely new, worth calling out with credit

**§8's `viewerRole`-gated trail default.** Not something this thread specified — collapsed by
default for the agent who just ran the call, but expanded by default for a second reviewer opening
the case later. This is a real improvement on the round 13/14 spec, which only said "collapsed by
default" without considering that a downstream reviewer (exactly the EDD-team audience this whole
Resolution Summary concept was built for) would want the full trail immediately rather than an extra
click. Worth preserving as specified — this is better than what was asked for.

---

## Open items — already correctly flagged in the design doc itself, restated for visibility

1. Login/OTP screens don't exist in the repo yet — confirm ownership before building (§2).
2. Full-repo grep for the five old dimension label strings in `tree.ts` scoring/verdict copy before
   shipping the rename (§4, open items).

---

## Resolution (Code)

Confirmed the `paymentBehaviour→coherenceRisk` rename with the user before touching the scoring
pipeline, per this file's own ask — proceeded exactly as specified. Ran the full-repo grep §4 asked
for: zero hits for any of the five old dimension strings outside `personas.ts`/`QueuePage.tsx`, so
the rename was purely mechanical (interface keys, `DIMENSION_LABELS`, `DIMENSION_ORDER`, every
persona's `riskSnapshot.dimensions`, `QueuePage.tsx`'s `DIMENSION_INITIALS`) — nothing in `tree.ts`
needed touching. Positional order (and therefore the severity tie-break in
`rankedNonLowDimensions`) was left unchanged — the doc's own "T/D/I/P/C" initials suggestion reads
as illustrative, not a mandate to reorder, and reordering wasn't asked for anywhere else.

§1, §5, §6, §7 built and verified live in-browser end to end: queue table (solid card, avatar
initials, pill chips, 10px dots, legend row, widened Scenario column), Customer Details (fired-signal
chips, accent language pill, sectioned Identity/Contact & Address/Account with header, Proceed
button styled primary while still functionally disabled), Amber panel (horizontal progress rail —
confirmed the state logic from rounds 6-8 carried through unchanged, `Q{n}` label, full-width Listen
button above the selects, accent-tinted processing panel with the spinning ring, single-row Quick
Flags pill toolbar), and the "Customer still connected" modal's icon badge. §2 and §3 correctly left
untouched, per scope. Round 9's Quick Flags bug stays open and untouched, as flagged — only the
visual redesign shipped.

§8's Case Summary is built and verified live, including a HUMAN_REVIEW-band case (not one of the
spec's four farmer examples) to exercise the added fifth badge variant. Two things worth flagging:

1. **The trail's transcript was never actually captured.** Both this file and the primary doc
   describe `PathEntry` as already having "question / tapLabel / corrected-flag per step" — true, but
   neither mentions a transcript field, and the Case Summary spec's zone 5 explicitly needs
   `Applicant said: "…"` per row. Added `transcript` to `PathEntry` and populated it from the live
   `speech.transcript` at the point each tap commits — a real gap, not an oversight to route around.
2. **Amber flavor needed a first-class field, not a derived one.** `Verdict.band` alone can't tell
   `pending-verification` apart from `explanation-logged` — Meena Devi's own worked example is
   STEP_UP band but "Routed to Human Review" flavor. Added `amberFlavor` + `pendingVerification` to
   the `Verdict` interface and hand-tagged all 8 STEP_UP verdicts across the three trees (not just the
   four farmer ones the spec worked through) — the sim_circle and premium_address STEP_UP cases get a
   reasonable generic Documents/Expertise text since the spec never covered them. A true HUMAN_REVIEW
   band (the call escalates with no verdict, not one of the four spec'd outcomes) gets a fifth badge,
   "AMBER — Escalated for Review", reusing the existing ResolutionCard's own "exits the call
   unresolved" framing rather than leaving that case with no Case Summary treatment at all.

The narrative (zone 3) is `verdict.reasons.join(' ')` — no separate prose was authored per outcome.
`reasons` was already written as narrative sentences, not a rule-ID dump, so reusing it directly is
what the spec's own "generated from the same structured data, not written independently" requirement
actually asks for, and it structurally guarantees zones 3 and 5 can never disagree.

`viewerRole` is wired through as specified (default `'agent'`, collapsed; `'reviewer'` expands by
default) but nothing in this build currently opens the confirmation screen as `'reviewer'` — there's
no second-reviewer route yet. The gate is correctly in place for when that view exists.

One small deviation: §7's icon badge is described as being "for consistency with the other modals
(Device Check, Risk Snapshot) which all lead with an icon" — checked both, neither actually has one.
Built the badge anyway since it's a reasonable ask on its own merits, just not an existing pattern
it's matching. It sits in the modal body rather than beside the title text, since `Modal`'s `title`
prop is a plain string with no room for a badge.
