# Round 22 — Farmer Persona Coherence Rework — Resolution (Code)

Built exactly as specced. No premise mismatch found against the current codebase — `personas.ts`,
`CustomerDetailsStep.tsx`, and `QueuePage.tsx` matched the handoff's stated current-state description
in every case checked before editing.

## What changed

**`apps/agent/src/features/agent/call/amber/personas.ts`** — all four Farmer personas
(`rameshyadav`, `meenadevi`, `bhagwansingh`, `dilipchaudhary`) updated in full per §2 of the handoff:
- `identity`'s wording shortened to `'No EPFO record found'` for all four.
- `paymentFraudBlacklists` dropped to `LOW` for all four (was MEDIUM/MEDIUM/HIGH/HIGH).
- New `coherenceRisk` flag added (was `NOT_AVAILABLE` for all four): MEDIUM for Ramesh/Bhagwan
  ("...significantly exceeds the pincode benchmark..."), HIGH for Meena/Dilip ("...extreme upper
  percentile bracket..."), each with the persona's own ₹-figure primary signal.
- Ramesh Yadav's `declaredAnnualIncome` changed 160000 → 230000; `firedRules` updated to match the
  two new strings. `digitalPresence`/`telecom` left untouched (LOW for all four, as before).
- Dimension key order kept as `identity → digitalPresence → telecom → paymentFraudBlacklists →
  coherenceRisk` in every literal, per the handoff's explicit note that `RiskSnapshotModal.tsx`'s row
  order is `Object.entries()` order, not an explicit sort.
- Confirmed the tree-logic mapping table in the handoff's own header still holds after the income
  change: Ramesh's 4-acre wheat/irrigated band is ₹1,00,000–2,40,000, and ₹2,30,000 stays inside it —
  same GREEN live-call outcome, same taps, same resolvers. Not re-verified end-to-end live (see
  Testing below), but the arithmetic itself wasn't touched by this round and nothing here changes it.
- `hidden: {}` and `age`/`declaredAddress`/`onboardingChannel`/`bcSourcingCode` left untouched for all
  four, per the handoff's explicit "don't touch these" note.

**`apps/agent/src/components/risk/RiskSnapshotModal.tsx`** — extracted the always-show-all-5-rows
dimension list (solid `DimensionChip` per row, `primarySignal` subtitle when present) into a new
exported `DimensionList({ dimensions })` component. `RiskSnapshotView` now calls it instead of
inlining the same markup — same rendered output, no behavior change there.

**`apps/agent/src/features/agent/call/steps/CustomerDetailsStep.tsx`** — per §3, replaced the
`getFiredSignalParts()`-driven single-dimension callout (reason text + dimension/level/"+N more"
chips) with `<DimensionList dimensions={persona.riskSnapshot.dimensions} />`, reusing the component
extracted above rather than duplicating its markup — the handoff's stated preference. `cn` import
still used elsewhere in the file (device-check button styling); `getFiredSignalParts` itself was
**not** touched in `personas.ts` — it's still exported and still used by the Accept/Reject card's
`getRiskSummaryLines` call site, untouched and out of scope here, exactly as the handoff says.

**`apps/agent/src/features/agent/QueuePage.tsx`** — per §4:
- Removed the `row.scenario` line from the row rendering; the `Rule Fired` column now shows only the
  "`N` rule(s) fired" / "No rules fired" line.
- Header/row `Rule Fired` column narrowed `w-40` → `w-24` (fits "2 rules fired" without wrapping).
  Header text changed to `Rules` — left to Code's judgment per the handoff's own §5 note; happy to
  revert to "Rule Fired" if preferred.
- `Risk Profile` column widened `w-16` → `w-28`; dots widened `w-2.5 h-2.5 gap-0.5` → `w-3.5 h-3.5
  gap-1.5`; header sub-strip initials widened to match (`w-2.5` → `w-3.5`, `gap-0.5` → `gap-1.5`) so
  the I/D/T/P/C initials stay aligned over their dots. Exact class values were left to Code's
  judgment per the handoff's §5 note — chosen to read cleanly at the existing row height, not treated
  as a locked spec.
- Confirmed `row.scenario`/`SCENARIO_LABELS`/`RULE_TREES[...].ruleLabel` aren't rendered anywhere else
  in the app (grepped `src/`) before removing the display line — per the handoff's own explicit ask
  to double-check this, nothing else regresses from dropping it here.

## Open items from the handoff's §5 — not decided, not guessed

- **Ramesh Yadav's `declaredAddress`** — left as `'Meerut, Uttar Pradesh'`, unchanged. The
  "Village near Meerut" wording from Jack's working notes was **not** applied, per the handoff's
  explicit instruction. Needs your confirmation of the exact string before Code touches it.
- **Queue column header wording** — went with `Rules` (was `Rule Fired`) since "Rule Fired" read
  oddly with no `N rule(s) fired` sub-label under it any more. Say the word if you'd rather keep
  "Rule Fired" or use something else.
- **Exact Tailwind width/gap values** for the widened Risk Profile dots — used `w-28`/`w-3.5`/`gap-1.5`
  (see above); a suggested direction, not gospel, per the handoff.

## Testing

- `npx tsc --noEmit -p tsconfig.json` clean across all four touched files.
- **Live UI verification** (this session's browser pane, against the dev server already running in
  your own terminal on :4000 — didn't touch or restart it): logged in via the mock email/OTP flow,
  went online, expanded Today's Queue.
  - Confirmed all four Farmer rows' dot tooltips read exactly `Identity: MEDIUM`, `Digital Presence:
    LOW/MEDIUM`, `Telecom: LOW`, `Payment Fraud & Blacklists: LOW`, `Coherence Risk: MEDIUM/HIGH` per
    persona, matching §2's literals exactly (pulled via `title` attributes, not eyeballed off dot
    color, to avoid a false-positive read).
  - Confirmed the `Rules` column shows only the rule count line, no scenario/tree-label text, on
    every row.
  - Accepted Ramesh Yadav's call through to the Customer Details step and confirmed the callout now
    renders all 5 dimension rows (Identity/Digital Presence/Telecom/Payment Fraud &
    Blacklists/Coherence Risk), with the Coherence Risk row showing the exact new pincode-benchmark
    string and ₹2.3L figure, and Payment Fraud & Blacklists showing Low with no subtitle — matches §3
    and §2's `rameshyadav` literal exactly. Screenshot taken, no console errors.
  - Did not separately re-open `RiskSnapshotModal` (the non-selectable-row click target) in this pass
    — its dimension-list rendering is the same `DimensionList` component verified live above, called
    from the same unchanged `RiskSnapshotView` call site, so this is a mechanical-extraction-only
    gap, not an unverified behavior change.
  - Did not re-verify the farmer tree's live arithmetic end-to-end (Ramesh's Q&A flow through to
    GREEN) — this round didn't touch `tree.ts` or the resolvers, and the acreage-band math itself is
    unchanged; only the pre-call display data moved.
