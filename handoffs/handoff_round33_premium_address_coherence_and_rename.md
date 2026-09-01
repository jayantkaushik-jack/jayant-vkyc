# Handoff 33 — Premium Address coherenceRisk fix + Meena naming collision

**Status:** locked, ready to build. Continues directly from Round 32 (the story-asset kickoff data
check). This is a fresh chat with no memory of Round 32's conversation — read this doc in full
before doing anything; context below is self-contained.

**Scope:** two small, well-specified data changes to `personas.ts`. Both are additive/corrective,
same discipline as every prior round in this repo (see `handoffs/` for the full history — this
repo has been through 30+ of these). **No code outside `personas.ts` should need to change for
either task.** No tree logic, resolver logic, or scoring math changes.

---

## 0. Context — why this handoff exists

This repo (`jayant-vkyc`) contains the agent-console prototype for Mule Sentinel, Cashfree's
onboarding-stage mule-detection product. Separately, a new "story" asset (not part of this
prototype's codebase — see Round 32's handoff, `handoffs/handoff_round32_story_asset_kickoff.md`,
for full context if you want it) is being planned to showcase the real rules/dimensions behind each
persona, including a "Coherence Risk" dimension — a cross-dimension check for whether an
applicant's declared story holds together (e.g. occupation vs. declared address affluence, income
vs. age/town, SIM circle vs. address).

Round 32 was a read/report-back round: it confirmed Suresh Yadav's (SIM tree) `coherenceRisk` was
`NOT_AVAILABLE` and fixed it (now `HIGH`, reflecting SIM-circle/address mismatch + SIM recency
together). It also read, but did not touch, the two Premium Address Risk personas — Lakshmi Bai and
Meena Devi (id: `meena`) — and flagged two things back for review:

1. Both personas' `coherenceRisk` is currently `NOT_AVAILABLE`, even though their existing
   `firedRules` and `paymentFraudBlacklists` signal already describe what is, in substance, a
   coherence story: *"Declared address inconsistent with declared income/occupation"* and
   *"Address affluence does not match applicant profile."* This is the same shape of signal that
   Round 22 found mis-homed for the Farmer personas and moved from `paymentFraudBlacklists` to
   `coherenceRisk` — see `handoffs/handoff_farmer_tree_round22_persona_coherence_rework.md` in this
   repo for that precedent, which this handoff mirrors.
2. There are two different personas, on two different trees, both displaying as **"Meena Devi"** —
   `meenadevi` (id) on the Farmer Income Mismatch tree, and `meena` (id) on the Premium Address Risk
   tree. Confirmed as a genuine naming collision, not a false alarm. This needs a rename before the
   story asset (which will show personas by name, grouped by tree) goes anywhere near a real
   audience.

Both fixes below are confirmed decisions, not open questions — go ahead and make them.

---

## 1. Task 1 — Move the coherence signal for Lakshmi and Meena from paymentFraudBlacklists to coherenceRisk

**Precedent to follow exactly:** Round 22's Farmer persona fix. There, the signal *"Declared income
significantly exceeds the pincode benchmark..."* was originally sitting in `paymentFraudBlacklists`
at MEDIUM/HIGH; Round 22 moved it to `coherenceRisk` at the same level, and dropped
`paymentFraudBlacklists` to `LOW` for those four personas, since the real signal isn't actually
about payment fraud or blacklist data — it's a coherence-of-story signal. Do the identical move
here.

### Lakshmi Bai — current vs. new

Current (as read in Round 32):
```ts
firedRules: [
  'Declared address inconsistent with declared income/occupation',
  'Address affluence does not match applicant profile',
],
riskSnapshot: {
  muleScore: 33,
  muleScoreBand: 'MEDIUM',
  dimensions: {
    identity: { level: 'LOW' },
    digitalPresence: { level: 'LOW' },
    telecom: { level: 'LOW' },
    paymentFraudBlacklists: { level: 'MEDIUM', primarySignal: 'Declared address inconsistent with declared income/occupation' },
    coherenceRisk: { level: 'NOT_AVAILABLE' },
  },
},
```

Change **only** the `dimensions` block (leave `muleScore`, `muleScoreBand`, `firedRules`,
`declaredAddress`, `declaredOccupation`, `hidden`, `onboardingChannel`, `bcSourcingCode`, and every
other field exactly as-is):

```ts
dimensions: {
  identity: { level: 'LOW' },
  digitalPresence: { level: 'LOW' },
  telecom: { level: 'LOW' },
  paymentFraudBlacklists: { level: 'LOW' },
  coherenceRisk: { level: 'MEDIUM', primarySignal: 'Declared address inconsistent with declared income/occupation' },
},
```

**Why MEDIUM, not HIGH, for Lakshmi:** her `muleScore` is 33 (MEDIUM band, and on the lower end of
it) — MEDIUM coherence is the level consistent with that overall score, mirroring how Round 22
calibrated the Farmer personas' coherence level to match their existing muleScore rather than
picking a level in isolation. If you have a principled reason to pick differently, flag it back
rather than silently deviating — but MEDIUM is the specified, intended value here.

### Meena Devi (id: `meena`, Premium Address tree) — current vs. new

Current (as read in Round 32):
```ts
firedRules: [
  'Declared address inconsistent with declared income/occupation',
  'Address affluence does not match applicant profile',
],
riskSnapshot: {
  muleScore: 65,
  muleScoreBand: 'MEDIUM',
  dimensions: {
    identity: { level: 'LOW' },
    digitalPresence: { level: 'MEDIUM' },
    telecom: { level: 'LOW' },
    paymentFraudBlacklists: { level: 'HIGH', primarySignal: 'Address affluence does not match applicant profile' },
    coherenceRisk: { level: 'NOT_AVAILABLE' },
  },
},
```

Change **only** the `dimensions` block:

```ts
dimensions: {
  identity: { level: 'LOW' },
  digitalPresence: { level: 'MEDIUM' },
  telecom: { level: 'LOW' },
  paymentFraudBlacklists: { level: 'LOW' },
  coherenceRisk: { level: 'HIGH', primarySignal: 'Address affluence does not match applicant profile' },
},
```

**Why HIGH for this Meena:** her `muleScore` is 65 — near the top of the MEDIUM band, closer to
HIGH than Lakshmi's 33 — so HIGH coherence (vs. Lakshmi's MEDIUM) keeps the two Premium Address
personas differentiated in the same way the four Farmer personas are differentiated (MEDIUM vs.
HIGH) rather than making both identical. This mirrors Round 22's exact pattern: Ramesh Yadav/Bhagwan
Singh (lower income overshoot) got MEDIUM coherence, Meena Devi(farmer)/Dilip Chaudhary (more
extreme overshoot) got HIGH.

Key order in both: keep `identity → digitalPresence → telecom → paymentFraudBlacklists →
coherenceRisk`, matching the convention already used everywhere else in this file (per Round 22's
documented convention, reconfirmed in Round 32's Suresh edit).

**Do not change:** `muleScore`, `muleScoreBand`, `firedRules` text, `declaredAddress`,
`declaredOccupation`, `hidden`, `onboardingChannel`, `bcSourcingCode`, or anything about Ramesh
Kumar, Suresh Yadav, or any Farmer persona.

---

## 2. Task 2 — Rename the Premium Address `meena` persona to remove the naming collision

**Which one to rename:** the Premium Address persona (id `meena`), not the Farmer persona (id
`meenadevi`). Reasoning: `meenadevi` is the more established, more heavily-referenced persona across
this repo's handoff history (Round 22's entire coherence rework was built around the four Farmer
personas including her) — renaming her risks breaking references or continuity across many prior
handoffs. The Premium Address `meena` is comparatively less referenced elsewhere, so renaming her is
the lower-risk, lower-blast-radius fix.

**New name:** rename `meena`'s `name` field from `'Meena Devi'` to **`'Meera Iyer'`** — different
enough (different first name, different surname region/flavor — Iyer reads South Indian, distinct
from the North-Indian-coded Devi personas elsewhere in this tree set, which also adds a small bit of
useful persona diversity) that there's no risk of an audience confusing her with the Farmer Meena
Devi when both appear in the same story-asset screen.

**What to actually change:**
- The `name` field: `'Meena Devi'` → `'Meera Iyer'`.
- **Do not change the `id` field** (`meena` stays `meena`) — this avoids any risk of breaking
  references to this persona's id elsewhere in the codebase (queue rows, routing, etc.); only the
  display name changes.
- Do not change `declaredAddress`, `declaredOccupation`, `age`, or any other field.

If a search across the repo turns up the literal string `'Meena Devi'` used specifically in
connection with the `meena` id (e.g. in a comment, a queue mock, a demo script reference) rather
than the Farmer `meenadevi`, update that occurrence too so the rename is consistent — but do not
touch any occurrence that's actually about the Farmer persona.

---

## 3. Verification

- Re-read both edited personas' full literals after the change and confirm: Lakshmi's
  `paymentFraudBlacklists` is now LOW and `coherenceRisk` is MEDIUM with the moved signal text;
  Meena/Meera's `paymentFraudBlacklists` is now LOW and `coherenceRisk` is HIGH with the moved
  signal text; the `name` field for id `meena` now reads `'Meera Iyer'`.
- Confirm no other persona, tree, resolver, or scoring file was touched.
- This is a data-only change with no new visual surface — if the existing prototype has any screen
  that already displays these personas' dimension chips or names (e.g. queue view, risk snapshot
  modal), a quick visual check that Meera Iyer's new name renders correctly and that her
  coherenceRisk chip now shows instead of "N/A" would be a reasonable sanity check, but is not
  required to complete this handoff.

## 4. Explicit non-changes

- No change to any tree logic, classifier behaviour, scoring math, or verdict logic.
- No change to Ramesh Kumar, Suresh Yadav (already correctly updated in Round 32), or any Farmer
  persona.
- No change to `filler_farhan`, `sample_red`/`sample_green`, or any other filler/sample persona.
- No new folder, no new app scaffold — the separate story-asset build is still a future round (see
  Round 32's handoff §9), not started by this one.
- No renaming of the `meena` id itself, only its display `name` field.

## 5. What happens after this round

Report back the final diffs for both personas plus confirmation of the rename. This goes back for
review before the next round, which is expected to actually scaffold the new story-asset folder and
begin Layer 1's screen — don't start that early.
