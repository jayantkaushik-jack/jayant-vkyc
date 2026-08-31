# Handoff 31 — Apply the design system to the remaining screens

**Status:** ready to scope with Code; not fully locked — several items below need Code to confirm a
real data source before building (see §3). Written by Jack + review pass, following the same
discipline as every prior handoff in this repo.

## 0. What this is, and what it is not

This is **not** new design work. `cf-design-system.css`, the reference screens, and the design
handoff (`Mule_Sentinel_UI_UX_Design_Handoff.md`) were already substantially delivered and ported
into the app in Round 30 — confirmed by diffing the reference bundle's `cf-design-system.css`
against `apps/agent/src/styles/cf-design-system.css` directly: same tokens, same `.btn`/`.field`/
`.shell`/`.chip`/`.card` component definitions, same colour system. The only real differences are:

1. Font/asset URL paths (`fonts/...` vs `/fonts/...`) — already correctly handled in-app for Vite's
   `public/` directory, no action needed.
2. Three global selectors (`body`, `a`, blanket `:focus-visible`) — Round 30 deliberately scoped
   these to `.auth`/`.shell` instead of leaving them global, documented inline
   (`AGENT-PORT-NOTE` comments) as a real bug avoided, not an oversight. Keep that decision — do not
   re-widen these to global on this round.
3. **One genuinely new addition in this reference bundle that Round 30 never had reason to port**:
   a `.trail-item` component (`.trail-item__q`, `__said`, `__bucket`) and a
   "PRODUCT / NARRATIVE SCREENS (P01–P10)" block (`.hero`, `.gauge`, `.tl` timeline) — neither
   exists in the app's current `cf-design-system.css` yet. Port these two additions in first,
   before building any screen below that uses them (Case Summary needs `.trail-item`
   specifically — see §2.9).

**What Round 30 actually built:** Login, OTP, Home (offline state only), plus the foundational
shell/fonts/tokens every later screen sits on. **What's still on the old Tailwind palette, not yet
touched:** everything below.

## 1. Scope for this round

Apply the ported design system's patterns (layout, component anatomy, states, interaction model —
per the design handoff's own §0 "pattern vs. content" rule) to these screens, using **our existing
data and content as the source of truth**, not the reference screens' example data. Do not invent
new metrics, dimensions, rule codes, or copy not already present in the current app — see §3 for
every place this round needs a real decision rather than a guess.

| # | Screen | Reference | Current component | Notes |
|---|---|---|---|---|
| 1 | Home, online state | `04-home-online.html/png` | `QueuePage.tsx` | Real data already exists — see §2.1 |
| 2 | Risk snapshot modal | `05-risk-snapshot.html/png` | `RiskSnapshotModal.tsx` | |
| 3 | Incoming call | `06-incoming-call.html/png` | (locate current component) | |
| 4 | Pre-call | `07-precall.html/png` | (locate current component) | |
| 5 | KYC steps | `08-kyc-steps.html/png` | `CallRoomPage.tsx` (step portion) | |
| 6 | Amber ready / listening / reviewing / suggestion / confirmed | `09`–`13-*.html/png` | `AmberPanel.tsx` | The core "answer machine" — see §2.2 |
| 7 | Resolution (verdict) | `14`, `14b`, `14c-*.html/png` | `ResolutionCard` (inside `AmberPanel.tsx` per earlier session notes) | |
| 8 | Case summary | `15`, `15b`, `15c-*.html/png` | `PostCallConfirmation.tsx` | Needs `.trail-item` ported first — see §0 item 3 |

Explicitly **not** in scope for this round: Profile, Analytics, Knowledge Center (no reference
screens exist for these), and anything on the Admin/Auditor/Partner/Customer apps — this reference
bundle only covers the Agent app's V-CIP flow.

## 2. Screen-by-screen notes

### 2.1 Home, online state (`QueuePage.tsx`)

Real data already exists and matches the reference's shape closely — this is mostly a restyle, not
a rebuild. Confirmed in the current code: `riskSnapshot.dimensions` already carries the I/D/T/P/C
five-dimension set with `level` per dimension (`DIMENSION_LABELS`, `DOT_COLOR` already defined),
`rulesFiredCount` already exists, band chips already exist (`BAND_WORD`, `BAND_CHIP_CLASS`). The
work here is swapping the current ad-hoc Tailwind classes for the design system's `.qtable`,
`.chip` (semantic ok/wa/da variants), `.dim-dot` (five dots in `I D T P C` order, hollow for `na` —
confirm the current `DOT_COLOR` map already has a distinct "no data" treatment, not just grey-filled;
if it doesn't, that's a real gap to fix, not just a restyle), `.src-tag` for rule provenance, and
the stat-tile funnel row.

**Real content gap:** the reference's stat strip shows "10,000 / 8,200 / 1,400 / 400" and "96% /
4%" — confirm with Jack whether the current app has an equivalent real (if illustrative) figure
already, or whether this strip should be adapted/dropped for screens where no such number exists
yet. Do not invent a number to fill the strip.

### 2.2 The Amber "answer machine" (`AmberPanel.tsx`) — the highest-value screen in this round

This is the screen most worth getting right, since it's the actual product moment (Mr. Holmes
suggesting a bucket, the agent confirming). The design handoff is explicit that this is **one fixed
container with four states** (ready → listening → thinking → suggested), not four different
layouts — confirmed this matches the current app's `flowState` model already in place
(`awaiting`/`transcript`/`processing`/`suggested`/`confirmed`, per earlier work in this repo). This
should be a restyle of the existing state machine into `.machine` and its state modifiers
(`--listening`, `--thinking`), not a rebuild of the state logic itself.

Specific things to carry over precisely, since they're load-bearing UX decisions documented in the
design handoff, not just visual taste:
- The suggestion is lifted **out of** the answer list into its own card (`.bucket` list stays
  stable; the suggested card sits above it) — never highlighted in-place within the list. The
  design handoff's own rationale (§8): highlighting in-place changes what the list means mid-flow.
- The catch-all/unclear bucket is visually `--catchall` (dashed border), always last in the list —
  this directly supports the Option-B fix from Handoff 30 (suggest Other/Unclear with a
  Confirm/Retake card, not auto-selected) — the dashed treatment is exactly the right visual
  language for "this is a fallback, not a category," worth carrying over deliberately.
- Bucket list header copy tracks state ("Pre-authored answers" → "Listening for one of these" →
  "Matching against these" → "Or choose a different answer" → "Answer recorded") — adapt the exact
  wording to whatever's already in the current app's copy, don't import the reference's literal
  strings if the app's existing copy differs and is preferred.
- Bilingual pairs (English/Hindi) stack vertically, never inline — this is already how the current
  farmer-tree taps render (`label`/`labelHi` fields confirmed in `tree.ts`), so this should already
  match; verify rather than assume.

### 2.3 Resolution / verdict card

Band-tinted card → verdict word → one-line meaning → reasons → trail → action bar with End
Session, per the design handoff's Template G. This maps directly onto the existing `ResolutionCard`
and its `amberFlavor` logic (pending-verification vs. explanation-logged) covered in earlier
sessions — the STEP_UP/HUMAN_REVIEW distinction and its copy fix (from the earlier "AMBER —
Escalated for Review" labelling issue) should be carried into this restyle, not reverted by
accident when the markup is replaced.

### 2.4 Case summary (`PostCallConfirmation.tsx`)

Needs `.trail-item` ported into `cf-design-system.css` first (see §0). Current component already
has the right data shape (`PathEntry[]`, `Verdict`) and the right information architecture
(question → applicant's transcript → confirmed bucket) — this is a genuine restyle target, swap the
hand-rolled trail markup for `.trail-item`/`.trail-item__q`/`.trail-item__said`/`.trail-item__bucket`.

### 2.5–2.8 Incoming call, pre-call, KYC steps, risk snapshot modal

Locate the current equivalent components before starting (some may not have a clearly named file
yet — worth a quick search pass rather than assuming). Apply `.callcard`/`.scrim`/`.modal` patterns
per the design handoff's Template D/E. No known content gaps identified for these four during this
review — flag any that turn up during implementation rather than guessing.

## 3. Content gaps — flagged explicitly, not resolved here

Per the design handoff's own §10 ("what the AI should NOT assume") and Jack's explicit instruction
this round: every place below has reference content with no confirmed real equivalent in the
current app. Do not invent values for these — ask Jack, or build the screen in a way that degrades
gracefully if the data isn't there yet (e.g., omit the stat strip rather than showing zeros).

- **Stat strip numbers** on Home (10,000 / 8,200 / 1,400 / 400 scored/green/red/amber) — is there a
  real (even if illustrative-labelled) equivalent number anywhere in the current app, or does this
  need Jack's input on what to show?
- **Rule codes** (`MS-101`, `MS-204`, `MS-205`) — the design handoff's own §10 explicitly says not
  to assume these codes or count. Confirm whether the current `riskSnapshot` data model has its own
  rule-code convention already (it may — `rulesFiredCount` exists, worth checking if fired-rule
  detail with codes exists alongside it) before either reusing the reference's codes or inventing
  new ones.
- **The five dimension names** (Identity / Digital presence / Telecom / Payment fraud & blacklists
  / Coherence risk) — confirmed these likely already exist as `DIMENSION_LABELS` in the current
  code (§2.1); use the app's real set, not the reference's, if they differ at all.
- **"Auto-decided 96% · routed to you 4%"** — same category as the stat strip; confirm real or
  drop.
- **Breathing widget / "between calls" panel** — present in the Home-online reference's right rail.
  Confirm whether this is meant to be a real feature this round or purely decorative from the
  reference; the design handoff's own §10 explicitly says not every shell page needs a right rail
  or this widget.

## 4. Explicit non-changes

- No change to any tree logic, classifier behaviour, scoring, or verdict logic — this round is
  visual/structural only, same discipline as every prior round in this repo.
- No change to the three locked product positions from the design handoff §1 (never say "EDD",
  auditability stays visible, the assistant only classifies) — these are content/copy rules that
  constrain this round's work, not things this round changes.
- Round 30's deliberate scoping decisions (global selectors kept narrow, sidebar width 240px, the
  three real bug fixes documented in its resolution doc) are not reopened by this round unless a
  specific new screen requires it.

## 5. Suggested order

1. Port the two missing `cf-design-system.css` additions (`.trail-item`, P01–P10 block) first —
   small, mechanical, unblocks Case Summary.
2. Resolve the content gaps in §3 with Jack before or alongside starting — several screens can't be
   finished without an answer there.
3. Amber answer machine (§2.2) first among the screens — highest product value, most load-bearing
   UX decisions to get right.
4. Resolution + Case summary next (they share the trail concept and sit right after the answer
   machine in the flow).
5. Home/online, risk snapshot, incoming call, pre-call, KYC steps — lower-risk restyles, can follow
   in any order.
