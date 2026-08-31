# Handoff 22 — Farmer persona rule wording, Coherence Risk dimension, and queue/callout display changes

**Status:** locked, ready to build. Continues the numbering from round 21 (the Claude Haiku
classifier integration) — this thread picks up in a fresh chat after that one got bloated; nothing
below contradicts or reopens round 21.

**Scope:** strictly the 4 Farmer Income Mismatch personas (`rameshyadav`, `meenadevi`,
`bhagwansingh`, `dilipchaudhary`) in `personas.ts`, plus 3 display-layer changes that ripple out
from that data change. SIM Circle Mismatch and Premium Address Risk personas are **explicitly
untouched** this round — same scoping discipline as round 21's Farmer-only Haiku rollout. Do not
extend the new rule wording or Coherence Risk pattern to those trees without a separate ask.

**Demo-script / tree-logic impact — none, except one bucket-preserving income change.** The
question sequences, taps, resolvers, and terminal verdicts in `tree.ts` (§1b of the audit) are
**not** touched by this handoff. Only Ramesh Yadav's `declaredAnnualIncome` changes (₹1,60,000 →
₹2,30,000), and it stays inside the same acreage/irrigation band (4 acres wheat irrigated →
₹1,00,000–2,40,000), so his live-call bucket path, taps, and GREEN outcome are unchanged. The
locked mapping this handoff must still hold after the change:

| Persona | Range check | What happens live | Outcome |
|---|---|---|---|
| Ramesh Yadav | 4 acres wheat, irrigated → ₹1,00,000–2,40,000. Declared ₹2,30,000 | Inside range, clean | GREEN |
| Meena Devi | 4 acres grapes, irrigated → ₹3,20,000–18,00,000. Declared ₹6,00,000 | Inside range — equipment+sales flags still apply | AMBER (two flags) |
| Bhagwan Singh | 3 acres cotton, rain-fed → ₹36,000–1,05,000. Declared ₹3,50,000 | Too high, "Normal" (no-op) → q3_alt → remittance named | AMBER (explained) |
| Dilip Chaudhary | 2 acres sugarcane, irrigated → ₹1,60,000–3,20,000. Declared ₹12,00,000 | Too high, worse than Bhagwan → q3_alt → nothing named | RED (BLOCK) |

Everything below is pre-call display data (`personas.ts` static literals) and how it's shown —
none of it is read by the live tree/resolver logic, confirmed against `tree.ts:563-634`.

---

## 1. Why — the story behind this change

The pre-call flagging story for all four Farmer personas moves from a generic "declared income
inconsistent with declared occupation" framing to a **pincode-benchmark** framing: these
personas' pincodes usually carry small landholdings and a correspondingly low baseline farmer
income, so a declared income that's high relative to *that specific pincode's* farmer baseline is
what actually trips the flag — not occupation-vs-income in the abstract. This is now expressed as
a new **Coherence Risk** dimension flag (previously `NOT_AVAILABLE` for all four Farmer personas),
using one of two severity-keyed phrasings:

- **MEDIUM** tier — "Declared income significantly exceeds the pincode benchmark for this
  occupation (Farmer, ₹X.XL)" — used when income is elevated but not extreme (Ramesh, Bhagwan).
- **HIGH** tier — "Declared income is in the extreme upper percentile bracket for Farmers
  occupation (Farmer, ₹X.XL)" — used when income is far outside the norm (Meena, Dilip).

Alongside this, `paymentFraudBlacklists` — which previously carried the "declared income
inconsistent..." flag at MEDIUM/HIGH — drops back to **LOW** for all four, since that signal has
moved to Coherence Risk. `identity`'s rule wording also shortens across all four, from "No EPFO
record despite declared employment" to **"No EPFO record found"**. `digitalPresence` and
`telecom` are unchanged (LOW for all four, as today).

## 2. Exact new persona literals — `personas.ts`

Replace each of the four `PERSONAS` entries below in full (only the fields shown change; `id`,
`name`, `age`, `primaryTreeId`, `onboardingChannel`, `bcSourcingCode` are unchanged from current
code and shown here only for anchoring — do not touch `hidden: {}`, which stays empty for all
four exactly as today).

### `rameshyadav`

```
declaredAnnualIncome: 230000,   // was 160000
firedRules: [
  'No EPFO record found',
  'Declared income significantly exceeds the pincode benchmark for this occupation (Farmer, ₹2.3L)',
],
riskSnapshot: {
  muleScore: 38,               // unchanged
  muleScoreBand: 'MEDIUM',     // unchanged
  dimensions: {
    identity: { level: 'MEDIUM', primarySignal: 'No EPFO record found' },
    digitalPresence: { level: 'LOW' },
    telecom: { level: 'LOW' },
    paymentFraudBlacklists: { level: 'LOW' },   // was MEDIUM
    coherenceRisk: { level: 'MEDIUM', primarySignal: 'Declared income significantly exceeds the pincode benchmark for this occupation (Farmer, ₹2.3L)' }, // was NOT_AVAILABLE
  },
},
```

### `meenadevi`

```
declaredAnnualIncome: 600000,   // unchanged
firedRules: [
  'No EPFO record found',
  'Declared income is in the extreme upper percentile bracket for Farmers occupation (Farmer, ₹6.0L)',
],
riskSnapshot: {
  muleScore: 44,                // unchanged
  muleScoreBand: 'MEDIUM',      // unchanged
  dimensions: {
    identity: { level: 'MEDIUM', primarySignal: 'No EPFO record found' },
    digitalPresence: { level: 'LOW' },
    telecom: { level: 'LOW' },
    paymentFraudBlacklists: { level: 'LOW' },   // was MEDIUM
    coherenceRisk: { level: 'HIGH', primarySignal: 'Declared income is in the extreme upper percentile bracket for Farmers occupation (Farmer, ₹6.0L)' }, // was NOT_AVAILABLE; note ₹6.0L not ₹12.0L — confirmed fix of a copy-paste artifact, Meena's own income is ₹6L
  },
},
```

### `bhagwansingh`

```
declaredAnnualIncome: 350000,   // unchanged
firedRules: [
  'No EPFO record found',
  'Declared income significantly exceeds the pincode benchmark for this occupation (Farmer, ₹3.5L)',
],
riskSnapshot: {
  muleScore: 55,                // unchanged
  muleScoreBand: 'MEDIUM',      // unchanged
  dimensions: {
    identity: { level: 'MEDIUM', primarySignal: 'No EPFO record found' },
    digitalPresence: { level: 'LOW' },
    telecom: { level: 'LOW' },
    paymentFraudBlacklists: { level: 'LOW' },   // was HIGH
    coherenceRisk: { level: 'MEDIUM', primarySignal: 'Declared income significantly exceeds the pincode benchmark for this occupation (Farmer, ₹3.5L)' }, // was NOT_AVAILABLE
  },
},
```

### `dilipchaudhary`

```
declaredAnnualIncome: 1200000,  // unchanged
firedRules: [
  'No EPFO record found',
  'Declared income is in the extreme upper percentile bracket for Farmers occupation (Farmer, ₹12.0L)',
],
riskSnapshot: {
  muleScore: 62,                // unchanged
  muleScoreBand: 'MEDIUM',      // unchanged
  dimensions: {
    identity: { level: 'MEDIUM', primarySignal: 'No EPFO record found' },
    digitalPresence: { level: 'MEDIUM' },   // unchanged — this stays as the one persona with a non-LOW digitalPresence
    telecom: { level: 'LOW' },
    paymentFraudBlacklists: { level: 'LOW' },   // was HIGH
    coherenceRisk: { level: 'HIGH', primarySignal: 'Declared income is in the extreme upper percentile bracket for Farmers occupation (Farmer, ₹12.0L)' }, // was NOT_AVAILABLE
  },
},
```

**Note on `dimensions` key order:** author each literal's keys in `DIMENSION_ORDER` order
(identity → digitalPresence → telecom → paymentFraudBlacklists → coherenceRisk), matching every
other existing persona/case/filler literal today — `RiskSnapshotModal.tsx`'s row order is
`Object.entries(dimensions)` (object-key order), not an explicit sort, so getting this order right
in the literal is what keeps that modal's row order correct (per audit §5's caution that nothing
enforces this — the convention is what's held it together so far).

**No other persona fields change.** `age`, `declaredAddress`, `declaredOccupation`,
`onboardingChannel`, `bcSourcingCode` stay exactly as current code has them for all four — nothing
in this handoff touches address or occupation text despite Jack's working notes mentioning
"Village near Meerut" for Ramesh; that was exploratory phrasing, not a locked change, and is
intentionally **not** included below. (Flag this back if a declaredAddress wording change was
actually intended — see open question in §5.)

## 3. Display change — Customer Details callout shows all 5 dimensions, not just the top one

**File:** `CustomerDetailsStep.tsx`, current callout built from `getFiredSignalParts()`
(`personas.ts:122-134`), which by design (round 15) surfaces only the single top-ranked non-LOW
dimension plus a `+N more` count. Confirmed in code — not a bug, a deliberate real-estate
trade-off from round 15 that this handoff now reverses for the Farmer flow's callout specifically.

**New behavior:** stop calling `getFiredSignalParts` in `CustomerDetailsStep.tsx`. Instead render
the **same full-5-dimension list already used by `RiskSnapshotView`** in
`components/risk/RiskSnapshotModal.tsx:60-104` — same solid-chip-per-row pattern
(`DimensionChip`/`LEVEL_SOLID`), same `primarySignal` subtitle under the dimension label when one
exists, same always-show-all-5 loop over `Object.entries(dimensions)`, LOW dimensions included with
no subtitle line. Prefer literally reusing `RiskSnapshotView` (or extracting its dimension-list
block into a small shared component) over duplicating the markup — it already renders exactly
what's wanted here.

`getFiredSignalLine`/`getFiredSignalParts`/`getRiskSummaryLines` themselves are **not deleted** —
they're still used elsewhere (e.g. the Accept/Reject card's compact one-line summary per audit
§5's `getRiskSummaryLines` citation) and that usage is out of scope here. Only
`CustomerDetailsStep.tsx`'s own call site changes.

## 4. Display change — Queue table: drop tree-label text, widen Risk Profile dots

**File:** `QueuePage.tsx`, the `Rule Fired` column (`w-40`, lines ~118-166) currently renders two
lines: `row.scenario` (the tree label, e.g. "Farmer Income Mismatch" / "SIM Circle Mismatch") on
top, and `${N} rule(s) fired` below it. The header row (`w-40` at line ~118) reads "Rule Fired".

**New behavior:**
- Remove the `row.scenario` line entirely from the row rendering (the `<span className="block truncate text-text font-medium">{row.scenario ?? '—'}</span>` block) — keep only the
  `{row.rulesFiredCount > 0 ? ... : 'No rules fired'}` line.
- Narrow this column's fixed width from `w-40` down to whatever the single remaining line actually
  needs (a `w-24`–`w-28` range should comfortably fit "2 rules fired"; pick the smallest width that
  doesn't wrap).
- Give the freed width to the `Risk Profile` column (currently `w-16`, both header at line ~110-116
  and row cell at line ~145-152): widen the dot row with more per-dot width/gap (increase from
  `w-2.5 h-2.5` dots with `gap-0.5` to something like `w-3.5 h-3.5` with `gap-1.5`–`gap-2`, adjusting
  the column's outer width, e.g. `w-16` → `w-28`+, to match). This is a size/spacing change only —
  keep the dot-only visual style (no added text/initials inline in the row; the existing
  `DIMENSION_INITIALS` header sub-row above the dots, and the `title` tooltip per dot, are enough
  and stay as-is).
- The column header text itself ("Rule Fired") can stay, or become just "Rules" if "Rule Fired"
  reads oddly with no label under it — cosmetic, Code's call.
- This changes the **queue list only**. The `RiskSnapshotModal` (opened by clicking a
  non-selectable row) is unaffected — it already shows the full tree-label-free dimension list per
  §3 above's reuse target, and was never showing `row.scenario` in the first place.

## 5. Open questions / things NOT decided here — don't guess, ask back

- **Ramesh Yadav's `declaredAddress`:** Jack's working notes said "Village near Meerut, Uttar
  Pradesh" instead of the current "Meerut, Uttar Pradesh." This handoff deliberately does **not**
  change `declaredAddress` for any of the four personas — only income, firedRules text, and
  dimension levels. If an address-text change was actually wanted, that needs its own explicit
  confirmation (exact string) before Code touches it.
- **Queue column header wording** ("Rule Fired" vs. "Rules" vs. dropping the header text) — left to
  Code's judgment per §4, not a locked string.
- **Exact new Tailwind width/gap values** for the widened Risk Profile dots (§4) — a target
  direction is given, not exact pixel/class values; Code should pick something that reads cleanly
  at the existing row height rather than treating the suggested classes as gospel.

## 6. Explicit non-changes — confirm nothing here regresses

- `tree.ts` question nodes, resolvers (`resolveFarmerCalc`, `resolveFarmerCalcSoftened`,
  `resolveFarmerEquipment`, `resolveFarmerIncomeExplained`), and terminal verdicts: untouched.
- The `RULE_TREES.farmer_income_mismatch.ruleLabel` string ("Declared income inconsistent with
  declared occupation (Farmer)", `tree.ts:965`) — this is the tree-level label, distinct from each
  persona's own `firedRules` strings; **not** changed by this handoff (it's also the very
  `row.scenario` text being removed from the queue display per §4, so its only remaining use is
  wherever else `RULE_TREES[...].ruleLabel` is read — worth Code double-checking nothing else
  displays it before assuming it's now fully cosmetic-only).
- SIM Circle Mismatch and Premium Address Risk personas' `firedRules`, `riskSnapshot`, and
  dimension data — untouched, per the explicit scope note at the top.
- Live classifier logic (Haiku prompt, keyword `BUCKET_RULES`) from round 21 — untouched.
- Sample cases (`sample_green`, `sample_red`) and filler queue rows — untouched.
