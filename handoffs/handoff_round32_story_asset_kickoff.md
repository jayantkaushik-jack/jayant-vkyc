# Handoff 32 — Kickoff: new "story" asset (Layer 1 + Layer 2), separate from the agent-console prototype

**Status:** first step only — a read/report-back task, not a build task yet. Do not write any new
code or persona data in this round. Read this whole doc before doing anything; it's long on purpose
because this is a fresh chat with no memory of the planning conversation that produced it.

---

## 0. Who's talking to you, and why this doc is unusually long

This project (Mule Sentinel, Cashfree Payments' onboarding-stage mule-detection product) is being
worked on in two places at once, on purpose:

1. **You (Claude Code, in this repo, on Jack's Mac)** — this is where all actual code changes to
   the prototype get made. This has been true for many rounds already (you'll see a `handoffs/`
   folder in this repo full of prior rounds — Round 22 through Round 30+ — all written the same
   way this one is).
2. **A separate Claude chat session ("Cowork")** — used for research, planning, reading the
   project's ~70 strategy/PRD/spec docs, and writing these handoff files. That chat does NOT touch
   code directly. It hands off to you instead, the same discipline as every prior round.

This particular handoff is unusual only in that it's the **first step of a brand-new, separate
asset** — not a change to the existing prototype. Jack asked for maximum context up front
specifically so you ask him fewer clarifying questions and can move with less back-and-forth. Read
carefully; most of what you'd normally ask is answered below.

---

## 1. What Mule Sentinel is (product context, so nothing below is confusing)

Mule Sentinel is Cashfree's product that helps banks catch "money mule" accounts **at onboarding**,
before an account is even opened — as opposed to RBI's MuleHunter.AI, which catches mules
post-facto, after money has already moved. The pitch: identity usually isn't the problem (most
mules pass KYC with completely real, verified documents) — intent is, and onboarding is the one
moment a bank can see it before the damage is done.

Two components:
- **v1 — the risk-scoring API.** Assesses an applicant at onboarding and returns a Mule Score
  (0–100) plus a per-dimension breakdown, computed from real rules against real vendor data
  (Truecaller, EPFO, PAN registries, DoT fraud databases, Cashfree's own payment graph, etc.).
- **v2 — the Amber Resolution Layer.** For applicants who land in the uncertain "amber" middle
  band, a pre-authored decision tree of ordinary-sounding questions is served inside the bank's
  existing video-KYC call. The bank's own agent asks and confirms; a classifier only sorts the
  spoken answer into a pre-set bucket — it never generates a question or a decision. This is what
  the existing prototype in this repo demonstrates.

## 2. The existing prototype in THIS repo — what it is, and what this new ask is NOT

This repo (`jayant-vkyc`) contains the **agent-console prototype**: a working web app simulating
what a bank's call-center agent sees during a live video-KYC call — incoming call, the "Mr.
Holmes"-assisted Q&A flow (the answer machine — `AmberPanel.tsx`), resolution/verdict, case summary.
It has real decision trees (`tree.ts`), real personas with hardcoded backend data (`personas.ts`),
a real (if currently unfunded) Claude Haiku classifier integration, and has been through ~30 rounds
of handoffs already. **Do not touch any of this prototype's code as part of this task.**

**This new ask is a separate, second asset.** Jack's own words for why: *"The current prototype
doesn't tell the story beautifully instead it's very agent journey heavy but less on the
presentation aspect."* The prototype is built to simulate doing the job (an agent's console); this
new asset is built to **explain and sell the idea** — a persisted, shareable web page that shows
*why* the product works, using real rules and real personas, but presented as a story/demo
experience rather than an operational tool. It should link out to the actual agent-console
prototype at the end, but is not part of its codebase or its build.

## 3. What this new asset actually is — two layers

**Layer 1 — a persona/dimension "story" screen.** Shows, per persona, the real rules/checks that
fired across five risk dimensions (Identity, Digital Presence, Telecom, Payment Fraud &
Blacklists, and **Coherence** — the cross-dimension "does this person's whole story add up"
dimension), across multiple persona types (Farmer, SIM Circle Mismatch, Premium Address Mismatch,
plus one or more standalone Coherence-focused personas), including some Red-only / v1-only personas
to show the base risk-scoring layer's effectiveness on its own, without needing the full v2
question-tree resolution. The point of Layer 1 is depth and credibility: "look how much real
reasoning is behind each flag," not a superficial score display.

**Layer 2 — an interactive farmer-only income-calculator walkthrough.** Using the Farmer persona
Dilip Chaudhary as the spine (sugarcane, already has a real declared income and fired rules in the
existing prototype data — see §5), this shows *live*, step by step, how the backend actually
calculates plausible income from declared inputs (crop × acreage × irrigation type, compared
against a sourced ₹/acre band) — with live commentary per answer, live color/band transitions as
the risk picture updates, and a running income calculation visible as the user picks each answer.
This is farmer-only for now — no other tree needs a Layer 2 walkthrough at this stage.

Both layers must link out to the real agent-console prototype (this repo) at the end, so the story
asset functions as a "here's the idea, here's the depth behind it, now go see it actually run" flow.

## 4. Where this new asset's code should live

**Inside this same repo (`jayant-vkyc`), in a new, separate top-level folder** — not mixed into the
existing `apps/agent/` prototype code. Something like `jayant-vkyc/story-asset/` (exact name your
call, but keep it clearly separate and clearly named so nobody confuses it with the prototype).
Reasoning: same git history and same repo makes it trivial to link out to the live prototype later,
but a fully separate folder/app means zero risk of touching prototype code or state by accident.

Do **not** start writing this new asset's code yet — see §7, this round is a data-check step only.

## 5. The data model you'll be working with — confirmed facts, from this repo's own code

The prototype's `personas.ts` already carries a 5-dimension risk model per persona:
`identity`, `digitalPresence`, `telecom`, `paymentFraudBlacklists`, `coherenceRisk` — each with a
`level` (LOW/MEDIUM/HIGH/NOT_AVAILABLE) and often a `primarySignal` text string. **This new asset
should use this same 5-dimension shape** (confirmed decision — not the separate PRD's "5 output
dimensions" language, which includes a "Payment Behaviour" dimension that needs live Cashfree
transaction history and is mostly N/A at onboarding; `coherenceRisk` is the dimension that's
actually live and relevant to an onboarding-stage story).

**Farmer personas** (`rameshyadav`, `meenadevi`, `bhagwansingh`, `dilipchaudhary`) already have
real, calibrated `coherenceRisk` values and `primarySignal` text, from a past round
(`Handoff_Round22_Farmer_Persona_Coherence_Rework.md` if you want to read it in this repo's
`handoffs/` folder). Example — Dilip Chaudhary, the confirmed Layer 2 spine:

```
declaredAnnualIncome: 1200000,
firedRules: [
  'No EPFO record found',
  'Declared income is in the extreme upper percentile bracket for Farmers occupation (Farmer, ₹12.0L)',
],
riskSnapshot: {
  muleScore: 62,
  muleScoreBand: 'MEDIUM',
  dimensions: {
    identity: { level: 'MEDIUM', primarySignal: 'No EPFO record found' },
    digitalPresence: { level: 'MEDIUM' },
    telecom: { level: 'LOW' },
    paymentFraudBlacklists: { level: 'LOW' },
    coherenceRisk: { level: 'HIGH', primarySignal: 'Declared income is in the extreme upper percentile bracket for Farmers occupation (Farmer, ₹12.0L)' },
  },
},
```

**SIM Circle Mismatch personas** (`ramesh`, `suresh`) exist and are click-tested (Ramesh Kumar =
genuine migrant, resolves GREEN/PROCEED; Suresh Yadav = mule, resolves RED + victim flag), but
**Suresh's `coherenceRisk` field is not yet populated** — this is one of the two things this round
needs to check/confirm (see §7).

**Premium Address Risk personas** (`lakshmi`, `meena`) — confirmed to exist in this repo (an earlier
open question about whether they'd survived the repo migration has been resolved: they're here) —
but their current `coherenceRisk`/dimension data has **not yet been reviewed** this round. This is
the other thing this round needs to check/report back (see §7).

Also relevant: filler/illustrative personas exist for showing v1 (score-only) effectiveness without
a tree — `filler_farhan` (HIGH, no tree) and `sample_red` (a pure v1 illustrative case) are the ones
already flagged as candidates for the "Red-only persona" slot in Layer 1.

## 6. The Coherence dimension — what it means, confirmed reasoning (so you don't have to guess)

Coherence is the cross-dimension "does this person's whole declared story add up" check — distinct
from the other four dimensions, which each check whether one credential is real (PAN active, EPFO
exists, SIM aged normally, no blacklist hit). A rented or recruited identity can pass every
single-attribute check, because the documents belong to a real, willing person — what it can't
survive is the combination not making sense together. Three canonical examples, already used in
Cashfree's own GFF pitch deck:

1. **The farmer in Nariman Point** — occupation farmer, address central Mumbai. Breaks on
   occupation vs. geography.
2. **The SIM from another state** — SIM issued in Bihar circle, every declared address in
   Maharashtra. This is the Suresh Yadav persona's real underlying facts (see §7 task 1).
3. **The tier-3 pharmacist** — 25yo, small-town pharmacist, declared income ₹50 lakh/month. Breaks
   on income vs. age/town. **Explicitly deprioritized for now** — Jack said this is low priority,
   only worth building if it would "come out beautifully"; do not build this persona this round.

A fourth, confirmed-wanted coherence story (not yet built as a persona anywhere in this repo): a
**30-year-old, Mumbai-based persona with essentially zero digital/social footprint** — the break
here is digital thinness alone (age + city + zero platforms + no WhatsApp-equivalent presence is
the whole story; no other contradicting fact like income or occupation is needed). This maps
directly to a real pattern from the product's own PRD (a composite signal: digital age under 1 year
AND zero social platforms AND no messaging-app presence, together). **This is a new persona to be
built — not this round; flagged here so you have the context when it comes up later.**

## 7. What to actually do THIS round — two things, report back, do not build yet

**Task 1 — Suresh Yadav (SIM tree): confirm current data, then add a coherenceRisk field.**

Read Suresh Yadav's current full persona literal in `personas.ts`. Report back (in your response,
not by editing files) exactly what's currently there — all fields, not just dimensions — so nothing
gets duplicated or contradicted.

Then, **do** make one small, well-specified addition: add a `coherenceRisk` field to Suresh's
`riskSnapshot.dimensions` (it's currently missing — confirmed, not a guess) with this logic, exactly
as specified — Jack's own words, verbatim reasoning to preserve: *"coherence risk here is SIM
address is not mapping to current address and at the same time SIM is new which is also an issue,
hence the overall risk is higher."* So: the coherenceRisk level should be **HIGH** (both facts
co-occurring — address mismatch AND SIM recency — not either alone; this matches the product's own
fairness rule that a geography/circle signal must never fire alone), and the `primarySignal` text
should name both facts together, e.g. something like *"SIM registered in a different circle from
declared address, and the SIM itself is recently activated"* — write this in your own words if you
have a cleaner phrasing, but keep both facts explicit, since either fact alone would be a weaker,
less accurate story. Match the key-order convention already used elsewhere in this file
(`identity → digitalPresence → telecom → paymentFraudBlacklists → coherenceRisk`, per Round 22's
documented convention). Do not touch Suresh's other fields, and do not touch Ramesh Kumar's data at
all.

**Task 2 — Lakshmi and Meena (Premium Address tree): report back only, do not edit.**

Read both personas' current full literals in `personas.ts` (all fields, including `riskSnapshot`
and `dimensions` if populated). Report back exactly what's there. Do not add, remove, or guess at
any coherenceRisk value for these two — that decision needs Jack's review of the actual current
data first, in a separate follow-up round.

**Nothing else this round.** Do not create the new `story-asset/` folder yet, do not scaffold any
new app, do not touch the tier-3-pharmacist or Mumbai-digital-thinness personas (not built, not this
round), and do not touch any prototype code outside the two Suresh/Lakshmi/Meena reads and the one
Suresh addition above.

## 8. Explicit non-changes (same discipline as every prior round in this repo)

- No change to any tree logic, classifier behaviour, scoring math, or verdict logic.
- No change to Ramesh Kumar, or to any Farmer persona (all four already correct, per §5).
- No change to `filler_farhan`, `sample_red`, or any other filler/sample persona.
- No new folder, no new app scaffold, no new persona literal beyond the one small Suresh addition.
- No renaming, no refactor of `personas.ts`'s structure — additive only.

## 9. What happens after this round

Once you report back Suresh's confirmed-updated data and Lakshmi/Meena's current data, that goes
back to Jack for review (in the separate planning chat, not here) — likely followed by a second,
separate handoff that actually scaffolds the new `story-asset/` folder and starts building Layer 1's
screen. Don't anticipate that work or start it early; wait for the next handoff.
