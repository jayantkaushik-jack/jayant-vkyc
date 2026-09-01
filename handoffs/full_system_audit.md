# Full System Audit — Amber Resolution Layer / Mule Sentinel Agent Console

**Source:** direct read of the current codebase in `jayant-vkyc` (`apps/agent/`), plus live verification
against the running dev server (`localhost:4001`). Originally produced 2026-08-27; refreshed 2026-08-30
to reflect rounds 22–29 (Part B below); **this refresh (2026-09-01, Round 35) supersedes that version** —
it is not a rewrite of Part B (that content was re-verified as still accurate and is carried forward with
targeted updates only) but it adds everything Round 35 asked for and the previous version never covered:
a full screen/component inventory, design-system restyle coverage, a reconciled open/fixed bug list, a
full API/integration status check, and a closing severity-flagged issue list. Round 35's own scope
explicitly excludes code changes — this document is a read-only extraction; nothing was built, fixed, or
changed to produce it, even where an obvious bug was found along the way.

**What changed in the codebase between the two refreshes (rounds 30–34), in one paragraph:** Round 30
shipped two independent things — a classifier/STT reliability pass (fetch timeout, degraded-mode default
suggestion, a 150-word STT cutoff, state-aware bigha conversion) and a full UI redesign of Login/OTP/Home
(offline) plus the app shell and design tokens (`cf-design-system.css`). Round 31 extended that restyle to
4 of its 8 targeted screens (Queue, Risk Snapshot, Incoming Call, Pre-call) — verified live this session —
but its other 4 targeted items (KYC steps, the Amber verdict card, Case Summary) were **not** actually
completed despite the round-31 handoff's own table implying otherwise (see Part A2). Rounds 32–33 made two
small, confirmed-landed `personas.ts` data edits (a missing `coherenceRisk` value for Suresh Yadav, a
coherence-signal move + display-name rename for two Premium Address personas). Round 34 reported four
layout bugs against the round 30/31 restyle; two are fixed, two are still open (Part A3). **`tree.ts`'s
actual rule/node/verdict logic has not changed since Round 28** — confirmed independently via file
mtimes, in-file round-tag comments, and every round-30-through-34 handoff's own explicit "no tree logic
changes" scope statement.

**A structural fact worth surfacing before anything else:** `git log` on this repo shows only 4 commits.
The two commits with "Round 30 resolution" messages contain **only the resolution markdown files**,
confirmed via `git show --stat` — not one line of the actual Round 30/31 application code was ever
committed. `git status` right now shows the entire design-system restyle (fonts, `cf-design-system.css`,
shell, auth screens, Queue/Amber/Risk-snapshot restyle) and the Round 32/33 persona edits as uncommitted
working-tree changes, alongside the Round 32–35 handoff docs themselves (untracked). This is consistent
with this engagement's own standing practice of only ever committing handoff docs, never app code — not
an accident — but it means **all of this exists in exactly one place**: this checkout, on this machine.
A fresh clone or a different machine would only show the Round 1–29 baseline. See Part C for this as a
flagged item.

---

# Part A — Screens, design-system coverage, bugs, and integrations (new in this refresh)

## A1. Screen / component inventory

Every route in `apps/agent/src/app/routes.tsx`, traced down to every component it renders.

### Auth
| Screen | Files | Description | Status |
|---|---|---|---|
| Login (email step) | `src/features/auth/LoginPage.tsx` (`EmailForm`) | First screen; email entry gates the OTP step | Fully restyled |
| OTP step | `LoginPage.tsx` (`OtpForm`) | 6-digit code entry; format/OTP validation was deliberately loosened for testing (Round 30 addendum) — `verifyOtp()` never actually checks the code | Fully restyled |
| Auth brand panel | `src/features/auth/AuthBrandPanel.tsx` | Shared left-side hero/branding for both above | Fully restyled |

### Shell (wraps every authenticated route)
| Screen | Files | Description | Status |
|---|---|---|---|
| App shell | `src/components/layout/AgentLayout.tsx` | Top-level sidebar+topbar grid | Fully restyled |
| Sidebar | `src/components/layout/AgentSidebar.tsx` | Home/Profile/Analytics/Knowledge Center nav; hidden on call-room routes | Fully restyled |
| Header | `src/components/layout/Header.tsx` | Greeting + status cluster | Fully restyled |
| Status cluster | `src/components/session-status/SessionStatusHeaderCluster.tsx` | Logged-in/break timers, online/break/offline menu | Fully restyled — real `role="menu"` semantics, Escape-to-close |

### Home (`/agent`, `AgentHomePage.tsx`) — one file, four states, only one restyled
| State | Status | Evidence |
|---|---|---|
| Offline, fresh (never online today) | **Fully restyled** | `.empty`, `.card`, `.chip`, `.metric` |
| Online | **Not restyled** | Delegates to `OnlineStatusStrip.tsx` — 100% old Tailwind (`bg-surface`, `text-primary`, etc.) |
| On break | **Not restyled** | Delegates to `OnBreakCard.tsx` — old `Card`/`Button` primitives |
| Already been online today | **Not restyled** | Delegates to `SessionSummaryCard.tsx` — same old primitives |

Confirms Round 30's own resolution doc: only the fresh-offline hero state was ever redone. `DeviceCheckModal` (opened from here to go online) is also not restyled.

### Queue (`/agent/queue`, `QueuePage.tsx`)
| Sub-view | Status | Evidence |
|---|---|---|
| Online — `TodaysQueue` (the actual queue screen) | **Fully restyled** | `.stat-strip`, `.qtable`, `.chip--ok/wa/da`, `.dim-dot`, right-rail `.card--pad glass`, `.breathe` widget |
| On-break / offline branches on this same page | **Not restyled** | Fall back to the same old `OnBreakCard`/`SessionSummaryCard` as Home |
| Incoming-call card rendered inline here | **Fully restyled content**, but see Bug 1 (Part A3) for its placement | — |

### Call room shell — none of it restyled
| Screen | Files | Status |
|---|---|---|
| Call room shell | `src/features/agent/CallRoomPage.tsx` | Not restyled — `p-4 h-[calc(100vh-3.5rem)]`, old `bg-surface`/`shadow-card` |
| Video panel | `src/features/agent/call/VideoPanel.tsx` | Not restyled — old `Button`/`Modal`/`MapEmbed` primitives, 5 separate `<Modal>` instances |
| Progress rail | `src/features/agent/call/ProgressRail.tsx` | Not restyled |
| Step workspace shell | `src/features/agent/call/StepWorkspace.tsx` | Not restyled (routing shell only) |

### Pre-call
| Screen | Files | Status |
|---|---|---|
| Pre-call dossier | `src/features/agent/call/steps/CustomerDetailsStep.tsx` | **Fully restyled** — `.check-row`/`.seg`, `.group`/`.kv`, `.disclosure`, `.actionbar` |

### KYC steps — all 7 files confirmed dead code, none restyled
`AadhaarStep.tsx`, `CaptureFaceStep.tsx`, `CaptureSignStep.tsx`, `LivelinessStep.tsx`, `LocationStep.tsx`,
`PanStep.tsx`, `ReportStep.tsx`, plus `ThresholdChip.tsx` (all in `src/features/agent/call/steps/`) — **not
imported anywhere except by each other.** `StepWorkspace.tsx` (the actual routing shell) only ever renders
`CustomerDetailsStep` or `AmberPanel` — matching its own in-file comment that the applicant completes the
full VKYC sequence before an agent ever joins, so there are no compliance steps for the agent to walk
through. All 8 files are still on the old Tailwind styling, but restyling them would be wasted effort
while they're unreachable — this is a "candidate for deletion" finding, not a "candidate for restyle" one
(see Part C).

### Amber "answer machine" (`AmberPanel.tsx`, 1307 lines) — 3 of 4 pieces restyled
| Piece | Status |
|---|---|
| Main Q&A machine (question card, bucket list, transcript header) | **Fully restyled** |
| `AbortAccordion` (unable-to-resolve / escalation) | **Fully restyled** |
| `SpeechCapture` (mic/listen UI, manual-bucket fallback) | **Fully restyled** — but see Bug 3, Part A3 |
| **`ResolutionCard`** (the verdict/outcome card) | **Not restyled** — still old `Card`/`Button`, `bg-success-subtle`/`bg-danger-subtle`/`bg-warning-subtle`. **This contradicts the Round 31 handoff's own table**, which listed "Resolution (verdict)" as an in-scope, completed item — it was never actually done. |

Also notable: `.trail-item` and the P01–P10 narrative-screen CSS block (`.hero`, `.gauge`, `.tl`) were both
ported into `cf-design-system.css` per Round 31 §0's instruction, but **neither has a single real usage
anywhere in the `.tsx` codebase** — both are currently dead CSS, reserved for Case Summary and a narrative
screen that were never built against them.

### Risk snapshot
| Screen | Files | Status |
|---|---|---|
| Risk Snapshot modal | `src/components/risk/RiskSnapshotModal.tsx` (`DimensionList`, `RiskSnapshotView`, `RiskSnapshotModal`) | **Fully restyled** — `.scrim`/`.modal`, `.score-block`/`.scale`, `.sig`. Deliberately bypasses the shared `Modal.tsx` to avoid rippling into other modals. `DimensionList` is shared verbatim with the pre-call dossier. |

### Incoming call
| Screen | Files | Status |
|---|---|---|
| Incoming call card (content) | `src/components/agent-status/IncomingCallCard.tsx` | **Fully restyled** |
| Incoming call overlay (global positioning wrapper, a *different* file) | `src/components/agent-status/IncomingCallOverlay.tsx` | Restyled content wrapped in a plain-Tailwind positioning `<div>` (pure layout utilities, no old color tokens). Self-suppresses on `queue`/call-room routes so it never double-renders against `QueuePage`'s own inline card. |

### Case summary — not restyled, contradicts the Round 31 handoff
| Screen | Files | Status |
|---|---|---|
| Post-call confirmation / Case Summary | `src/components/call/PostCallConfirmation.tsx` | **Not restyled** — zero `cf-design-system.css` classes anywhere in the file, despite being the exact component the Round 31 handoff named for the `.trail-item` port. |

### Other agent pages (out of Round 31's stated scope, confirmed still old)
Profile (`ProfilePage.tsx`), Analytics/Performance (`PerformancePage.tsx`), Knowledge Center grid and doc
viewer (`KnowledgePage.tsx`, `KnowledgeDocPage.tsx`) — all **not restyled**, all old `Card`/`StatCard`/
`StatusPill` primitives and raw Tailwind.

### Modals / misc
| Component | Status |
|---|---|
| `DeviceCheckModal` | Not restyled |
| `OnBreakCard`, `SessionSummaryCard`, `OnlineStatusStrip` | Not restyled |
| Shared `Modal.tsx` | Not restyled — wraps the local `@cashfree-intl/cashmere` **stub** (`src/vendor/cashmere-stub.tsx`; the real package needs Artifactory credentials this machine doesn't have). Still used by `DeviceCheckModal`, all of `VideoPanel.tsx`'s 5 modals, all of `ReportStep.tsx`'s modals (dead code), `CallLogViewModal.tsx`. Bypassed (own `.scrim`/`.modal` markup) only by `RiskSnapshotModal.tsx`. |

## A2. Design-system coverage — summary

**Fully restyled (cf-design-system.css tokens/components):** Login, OTP, Auth brand panel, App shell,
Sidebar, Header, Status cluster, Home (offline-fresh state only), Queue (online state only), Pre-call
dossier, Amber main Q&A + AbortAccordion + SpeechCapture, Risk Snapshot modal, Incoming Call card
(+ its overlay wrapper's content).

**Not restyled (old Tailwind + `Card`/`Button`/`Modal` primitives from `src/components/ui/`, or the
cashmere stub):** Home's online/on-break/already-online-today states, Queue's own on-break/offline
branches, `CallRoomPage`, `VideoPanel`, `ProgressRail`, `StepWorkspace` shell, all 7 KYC step files (dead
code — see A1), the Amber `ResolutionCard`, Case Summary (`PostCallConfirmation.tsx`), Profile, Analytics,
Knowledge Center (both screens), `DeviceCheckModal`, `OnBreakCard`, `SessionSummaryCard`,
`OnlineStatusStrip`, the shared `Modal.tsx`.

**Two corrections to the Round 31 handoff's own claims, verified against live code, not assumed:**
`ResolutionCard` and `PostCallConfirmation.tsx` are both listed in that handoff's scope table as
in-scope/expected-done items — neither was actually built. This audit is the first document to catch that
gap.

**Is a future restyle pass safe to continue additively?** Yes. `tailwind.config.js` still defines the
full pre-Round-30 palette (`primary`, `bg`, `surface`, `text*`, `success`, `danger`, `warning`, `border*`,
`accent`, `focus`) verbatim alongside the newer `brand`/`ok`/`wa`/`da`/`re` keys — the file's own comment
states this was deliberately additive, and every "not restyled" screen above is cleanly and exclusively
on the old tokens with zero collision against the new ones. Nothing needs to be removed or renamed before
continuing the port.

## A3. Known bugs — reconciled, open and fixed

### The four bugs from Round 34 (`handoff_round34_ui_layout_overflow_fixes.md`) — no resolution doc exists; verified fresh this round

| # | Bug | Status | Evidence |
|---|---|---|---|
| 1 | Incoming-call card sits after the queue table in normal document flow — buried below the fold on a long queue | **STILL OPEN** | `QueuePage.tsx:352-378` — the card is a plain sibling after `<TodaysQueue>`, with an explicit in-file comment saying this was *consciously* left unfixed at Round 31 to avoid fighting `IncomingCallOverlay`'s route-suppression logic. Live-verified: at a normal 1400×900 viewport the card is entirely below the fold after a 14-row queue; even at 1400×1400 it barely peeks in at the bottom edge. |
| 2 | Risk Snapshot modal overflows / renders a ghosted duplicate frame | **FIXED** | `cf-design-system.css:870-888` — `.modal` has `max-height: 88vh`, `.modal__body` has `overflow: auto`. No double-mount at either call site (Queue row click, Incoming-call card's "Risk snapshot" button — independently gated `open` booleans). Live-verified against Deepak Malhotra (5/5 flagged dimensions, the tallest real content) at viewport heights down to 500px: clean single frame, internal scroll, no ghosting. |
| 3 | "Manually choose bucket ▾" dropdown overflows its card, runs off the page edge | **STILL OPEN** | `.select` in `cf-design-system.css:1217-1221` sets no `width`/`max-width`. The native `<select>` in `AmberPanel.tsx`'s `SpeechCapture` (~line 1187) sizes itself to its longest bilingual `<option>` label (farmer-tree options combine English + Hindi, ~80 chars). Live-verified on Ramesh Yadav's Q1: the select measured 723px wide against a 1243px-wide card in a 1300px viewport — overshoots the card by ~200px, clipped rather than scrolled by an ancestor `overflow: hidden`. Reproduces at default window width, every question with a long bilingual label (i.e. the whole farmer tree). |
| 4a | Call-room: blank left rail above the video panel | **FIXED / not reproducible** | `ProgressRail.tsx` was deliberately moved from a vertical side rail to a full-width horizontal strip (its own header comment documents this); live screenshots show no blank region. |
| 4b | Call-room: End Call button misaligned with sibling icon controls | **FIXED / not reproducible** | Measured live via `getBoundingClientRect()` on all 6 controls: every control's vertical center is identical (`items-center`), gaps are a uniform 12px including up to End Call. Reads as an intentional larger/emphasized red CTA next to smaller icon buttons, not a layout bug. |

### Other bugs/gaps found while auditing, not previously reported

| Issue | Screen/component | Severity | Status |
|---|---|---|---|
| Avatar and `customer.language` regenerate randomly on every incoming call, rather than being stable per persona | `AgentContext.tsx`, `IncomingCallCard.tsx`, `CustomerDetailsStep.tsx` | Cosmetic, but visible on every single call | **Open** — flagged in the previous audit refresh too (rounds 22–29 all confirmed it untouched); still present, unchanged since. |
| Bigha/regional-unit acreage conversion (Round 30, farmer tree `land_area` node) is state-aware but **not stable** — 5 identical live calls for the same stated bigha count in the same state returned figures implying a >3x range in acres-per-bigha | Farmer tree, `land_area` classification | Data-integrity risk, not visual — feeds directly into the live income-reconciliation arithmetic | **Open, flagged by Round 30's own resolution doc as needing a follow-up decision** (accept the variance, add a plausibility clamp, or revisit a hardcoded table) — no round since has acted on it. |
| `CallRoomPage.tsx`'s root hardcodes a 56px header height (`h-[calc(100vh-3.5rem)]`) but the real header has been 64px since before Round 30 | `CallRoomPage.tsx` | Cosmetic — an ~8px internal-scroll discrepancy, nothing is clipped/unreachable | **Open**, explicitly deferred by Round 30's own resolution doc as out of scope for a screens-01-03 round. |
| A hard navigation/reload mid-session (e.g. deep-linking to `/agent/queue`) drops the whole session back to the login screen rather than preserving online/queue state | App-wide (no persistence layer) | Expected for a prototype, but worth knowing before a live demo that might involve a refresh | **By design**, not a bug — flagged here only so it doesn't surprise anyone during a demo. |
| Application code for Rounds 30–33 is entirely uncommitted (see the introduction above and Part C) | Repo-wide | Structural/operational | **Standing, deliberate practice**, not a bug — flagged for visibility. |

## A4. API / integration state

| Integration | Status | Detail |
|---|---|---|
| **Anthropic Claude Haiku** (bucket classification + acreage extraction) | **Wired and working with what appears to be a real key** | Model `claude-haiku-4-5-20251001`. Dev path: client → Vite middleware (`vite.config.ts`) → `api/_classify-core.ts` → real Anthropic API. Prod path: client → Vercel functions (`api/classify.ts`, `api/extract-acreage.ts`) → same shared core. `ANTHROPIC_API_KEY` read server-side only (`.env` in dev via `loadEnv`, `process.env` in prod), confirmed present in `.env` in the correct `sk-ant-...` format (value itself not disclosed). A 9-second `AbortController`-based fetch timeout (Round 30) wraps both calls, confirmed still present. |
| **ElevenLabs Scribe v2 Realtime** (primary STT tier) | **Wired and working with what appears to be a real key** | WebSocket to `wss://api.elevenlabs.io/v1/speech-to-text/realtime`. Token issuance (`api/_stt-token-core.ts` → real ElevenLabs single-use-token endpoint) mirrors the classifier's dev/prod split exactly. `ELEVENLABS_API_KEY` confirmed present in `.env` in a plausible format (value not disclosed). Two real protocol bugs (message-type discriminator key, audio field name) were found and fixed via a live test in Round 24 — documented in the file's own header as a cautionary note. |
| **Google Cloud Speech-to-Text** (2nd STT tier) | **Dead code** | `connectGcp()` is an unconditional `return null` — no network call, no key configured, blocked on Cashfree IT's SSL-inspecting proxy per the file's own comment. |
| **Web Speech API** (3rd/final STT tier) | Native browser API, not a vendor integration | Original pre-Round-24 mechanism, unchanged, always available as the last fallback. |
| **`@cashfree-intl/cashmere`** (internal Cashfree design-system package) | **Mocked — not a real network integration at all** | This machine has no Artifactory credentials for the real private-registry package; `vite.config.ts` aliases it to a local hand-written stub (`src/vendor/cashmere-stub.tsx`). Every screen still listed as "not restyled" above that uses `Card`/`Button`/`Tag`/`Modal` is actually using this local stub, not the real Cashfree design system. |

No other `fetch(`/`axios`/env-var-gated integrations exist anywhere in `apps/agent/src` or `apps/agent/api`
— confirmed by a full-repo grep.

---

# Part B — Decision logic, data model, language, UI copy, and STT architecture

**Everything in this Part was verified as still accurate against current code** (via file mtimes,
in-file round-tag comments, and every intervening handoff's own explicit "no tree/scoring logic change"
scope statement) with two exceptions, both called out inline where they occur: the classifier-reliability
additions from Round 30 (§2e, new), and three persona `dimensions` updates from Rounds 32–33 (§5, §6).
`tree.ts` itself — every node, tap, and verdict definition — has not changed since Round 28.

## 1. Every decision tree, in full

Three rule trees exist, registered in `RULE_TREES` (`tree.ts:1067-1092`). There is no fourth — that registry is the complete list.

| Tree id | Label | Entry node | Rotated entry node (prior-attempt applicants) |
|---|---|---|---|
| `sim_circle_mismatch` | SIM circle does not match declared address | `q1` | `q1_reask` |
| `farmer_income_mismatch` | Declared income inconsistent with declared occupation (Farmer) | `q1` | `q1` (no rotation) |
| `premium_address_risk` | Declared address inconsistent with declared income/occupation | `q1_addr` | `q1_addr` (no rotation) |

Routing targets used throughout: a plain node id (advance to that node), `TERMINAL:x` (resolve straight to verdict `x`), `DYNAMIC:x` (call a resolver function that returns a `Verdict` directly), `ROUTE:x` (call a resolver that returns another routing target string, itself possibly a node id or another `TERMINAL:`).

### 1a. SIM Circle Mismatch (`simCircleNodes`, `tree.ts:136-266`)

**Untouched since Round 21.**

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

**Unchanged since Round 28.** Every node carries a `questionHi` field and every tap a `labelHi` field (Round 26) — omitted below for readability; see §7.

**q1** ("What do you grow, and is this land your own?", `tree.ts:736-749`):

| Tap id | Label | Path | Routes to |
|---|---|---|---|
| `food_grain_own` | Food grain (wheat, rice, pulses) + Own it | A | `land_area` |
| `cash_crop_own` | Cash crop (cotton, sugarcane, spices) + Own it | A | `land_area` |
| `horticulture_own` | Horticulture (grapes, pomegranate, mango, vegetables) + Own it | A | `land_area` |
| `seasonal` | Different crops in different seasons | B | `TERMINAL:human_review_farmer_seasonal` |
| `livestock_or_aquaculture` | Livestock/dairy, poultry, fish or shrimp farming | C | `TERMINAL:human_review_farmer_livestock` |
| `tenancy_or_labour` | Works as farm labour, or leases land in/out | D | `TERMINAL:human_review_farmer_tenancy` |
| `unclear` | Other / Doesn't know / Unclear | catch-all | `TERMINAL:human_review_unclear_bucket` |

**Round 28's ownership-assumption change to the three "_own" buckets:** a real crop in the matching category is sufficient on its own; ownership is assumed by default. Only an explicit non-ownership signal (leasing, working someone else's land) routes to `tenancy_or_labour`.

**Round 28's `seasonal` tightening:** now requires actual rotation/timing language (season, kharif, rabi, summer/winter, or an explicit "in X we grow Y, in Z we grow W" pattern) — previously misrouting 100% of the time on plain two-crop answers with no seasonal language.

**Path A's remaining nodes** (`tree.ts:750-855`):

| Node | Question | Taps → next |
|---|---|---|
| `land_area` | "How much land do you farm, roughly?" | `land_under2`/`land_2to5`/`land_5to10`/`land_10to20`/`land_over20`→`land_water`, `unclear`→`TERMINAL:human_review_unclear_bucket` |
| `land_water` | "Is your land irrigated, or does it depend on rainfall?" | `irrigated`/`partly_irrigated`/`rainfed`→`ROUTE:farmerCalc`, `unclear`→`TERMINAL:human_review_unclear_bucket` |
| `year_clean_path` | "Would you say last year was normal for your farming, or better or worse than usual?" | 4 taps→`q4_sales`, `unclear`→`TERMINAL:human_review_unclear_bucket` |
| `year_recheck` | "Was last year normal for your farming, or was it better or worse than usual — drought, flood, pest?" | `normal`/`better`/`varies`→`q3_alt`, `worse`→`ROUTE:farmerCalcSoftened`, `unclear`→`TERMINAL:human_review_unclear_bucket` |
| `q4_sales` | "Where do you usually sell what you grow?" | 7 taps→`q5_equipment`, `unclear`→`TERMINAL:human_review_unclear_bucket` |
| `q5_equipment` | "Do you own a tractor or any other farm equipment?" | 5 taps→`ROUTE:farmerEquipment`, `unclear`→`TERMINAL:human_review_unclear_bucket` |
| `q3_alt` | *(reworded Round 26)* | 6 named-category taps→`DYNAMIC:farmerIncomeExplained`, `farming_alone`→`TERMINAL:red_farmer_cannot_reconcile`, `unclear`→`TERMINAL:human_review_unclear_bucket` |

Resolvers (`tree.ts:661-732`):
- **`resolveFarmerCalc`** (`ROUTE:farmerCalc`): acreage × sourced ₹/acre band for the crop+irrigation combo, compared against declared income. In-band → `year_clean_path`; out-of-band → `year_recheck`. Since Round 28, the acreage figure is not always the bucket midpoint — see the addendum below.
- **`resolveFarmerCalcSoftened`** (`ROUTE:farmerCalcSoftened`): only fires from `year_recheck`'s "Worse" tap — re-runs with the band's low end shifted down 30% (`FARMER_BAD_YEAR_LOW_END_SOFTENING`, still a Code judgment call, not a sourced figure). In-band → `TERMINAL:step_up_bad_year_explained`; still out → `q3_alt`.
- **`resolveFarmerEquipment`** (`ROUTE:farmerEquipment`): equipment-ownership claim + a "large holding + informal-only sales" flag → four outcomes (`step_up_both_flags`, `step_up_equipment_pending`, `step_up_sales_scale`, `green_farmer_reconciled`). Equipment ownership can never resolve live-Green — VAHAN is backend-only.
- **`resolveFarmerIncomeExplained`** (`DYNAMIC:farmerIncomeExplained`): always `step_up_income_explained` (STEP_UP), personalized reason string.

Sugarcane detection is transcript-based (`FARMER_SUGARCANE_CUES`, consumed inside `deriveFarmerFacts`), not a separate q1 bucket.

**Round 28 — the acreage-extraction addendum (`FARMER_ACREAGE_RANGE`, `PathEntry.extractedAcreage`).**
`deriveFarmerFacts()` used to always substitute a fixed representative midpoint
(`FARMER_ACREAGE_MIDPOINT`) for whatever `land_area` bucket the classifier chose — coarse enough on a
3x-wide bucket to flip a genuinely plausible declared income into a false mismatch (confirmed as a real
bug on Ramesh Yadav: the 3.5-acre midpoint falsely mismatched his declared ₹2.3L; his actual 4 acres
correctly reconciles). Fixed with a second, separate Haiku call (`extractAcreageAcres`, §2b) that pulls
the literal figure from the transcript, used **only** when it agrees with the already-confirmed bucket's
own range — otherwise falls back to the midpoint (the normal, non-failure case for a vague answer) or logs
a disagreement for review (a likely STT/self-correction artifact).

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

`human_review_farmer_other` and `human_review_no_acreage` no longer exist — both old catch-all taps were renamed to the shared `unclear` id in Round 23.

### 1c. Premium Address Risk (`premiumAddressNodes`, `tree.ts:950-1018`)

**Untouched since Round 21.**

| Node | Question | Taps → next |
|---|---|---|
| `q1_addr` | "Is this address where you currently live, or an address for correspondence?" | `i_live_there`/`both_move_between`→`addr_tenure`, `correspondence_only`→`addr_whose`, `not_sure`→`TERMINAL:human_review_addr_unclear` |
| `addr_tenure` | "How long have you been living there?" | 4 duration taps→`addr_work`, `cannot_recall`→`TERMINAL:human_review_addr_unclear` |
| `addr_work` | "What do you do for work here?" | all 4 taps→`addr_living` |
| `addr_living` | "Do you stay alone, or with family or others?" | `alone`→`addr_landmark`, `with_family`→`TERMINAL:green_addr_family`, `shared`/`employer_provided`→`TERMINAL:strong_green_addr_shared_or_employer` |
| `addr_landmark` | "Which station or landmark is nearest to you?" | `answers_readily`→`TERMINAL:green_leaning_addr_landmark`, `hesitates`/`does_not_know`→`TERMINAL:red_leaning_addr_landmark` |
| `addr_whose` | "Whose address is this one, then?" | `family_member`/`employer`→`TERMINAL:green_addr_family`, `friend`/`not_sure`→`TERMINAL:human_review_addr_unclear`, `someone_who_helped`→`TERMINAL:block_addr_victim_flag` |

No resolver functions — every path is a static `TERMINAL:` target.

**Premium-address terminal verdicts** (`premiumAddressVerdicts`, `tree.ts:1020-1065`):

| Verdict id | Band | Condition |
|---|---|---|
| `human_review_addr_unclear` | HUMAN_REVIEW | Unclear address relationship (3 entry taps land here) |
| `green_addr_family` | PROCEED | Family/employer address for correspondence, or living with family |
| `strong_green_addr_shared_or_employer` | PROCEED | Shared accommodation or employer-provided housing |
| `green_leaning_addr_landmark` | PROCEED | Knows the local landmark readily |
| `red_leaning_addr_landmark` | STEP_UP | Claims to live alone, hesitates on/doesn't know a routine landmark |
| `block_addr_victim_flag` | BLOCK | Address belongs to whoever arranged the application — victim-flagged |

### 1d. Stubs / TODOs / partial builds

- **Farmer Paths B, C, D**: still direction-locked, not built as question sequences.
- **`resolveFarmerCalcSoftened`'s 30% softening magnitude**: still "a Code judgment call, not a sourced figure."
- **Equipment ownership (`step_up_equipment_pending`)**: always pending by design — VAHAN cannot complete live.
- **GCP as an STT tier**: interface slot only — see Part A4.
- **Round 25's classifier-collision precedent**: Round 23's farmer catch-all tap id `unclear` collided with Round 21's classifier escape-hatch string; fixed by moving the escape hatch to `NO_MATCH`. Recorded as a cautionary example of two independently-correct rounds interacting badly, found only via a live call.
- **Round 27's classifier-reliability bug, fixed**: Haiku doesn't always comply with "respond with only the bucket id" — a too-tight `max_tokens` truncated real answers. See §2.
- **Round 30's bigha-conversion instability, still open — see Part A3.**

---

## 2. Classification logic

**As of Round 28, still a hybrid: farmer tree classifies via two real Claude Haiku API calls; SIM and premium-address still classify via keyword/phrase matching.** Round 30 (§2e below) added reliability wrapping, not new classification logic.

**Signature** (`classify.ts:145-164`): `classifyAnswer(question, transcript, taps, treeId?)`. `treeId === 'farmer_income_mismatch'` routes to Haiku; anything else uses the keyword path.

### 2a. Farmer tree bucket classification — Claude Haiku (`classifyViaHaiku` → `/api/classify` → `_classify-core.ts`, `classifyWithClaude`)

- **Model:** `claude-haiku-4-5-20251001`.
- **Call path:** client → `fetch('/api/classify')` → Vite dev middleware or Vercel function → `_classify-core.ts` → real Anthropic Messages API. Key stays server-side.
- **Prompt**: rubric-style, built from real per-bucket `definition` fields. Round 27 strengthened the closing instruction to forbid preamble more forcefully.
- **Escape-hatch sentinel is `NO_MATCH`** (Round 25 fix, see §1d).
- **`max_tokens` raised 20 → 60** (Round 27) — the model doesn't always comply with "respond with only X"; 20 tokens was truncating real answers mid-explanation.
- **Two-tiered response parsing**: exact match first, then a full-response regex search for the sentinel or any bucket id as a whole-word match (Round 27).
- **Failure handling:** any failure returns `null` → same degraded/manual-selection UX, now with the Round 30 default-suggestion behavior layered on top (§2e).

### 2b. Farmer `land_area` acreage extraction — a second, separate Claude Haiku call (Round 28)

Deliberately a second call, not a widened contract on the existing one — Round 27 had just narrowed
`classifyWithClaude` to one bare token; a second field would have loosened exactly what that fix hardened.

- Same model, same `max_tokens: 60`, same defense-in-depth parsing.
- **Escape-hatch sentinel:** `NONE` (`ACREAGE_NO_MATCH_SENTINEL`), distinct from the bucket classifier's `NO_MATCH`.
- **Range handling:** a stated range returns the midpoint, documented explicitly.
- Only ever called for `land_area`, only on the real classification path (skipped in "Manually choose bucket" simulate mode).

### 2c. SIM + premium-address — keyword/phrase matching (unchanged)

`BUCKET_RULES`, `MATCH_CONFIDENCE = 0.95`, `CONFIDENCE_THRESHOLD = 0.6`, `normalizeHindi()` nuqta-stripping. No round since 21 has touched this table or these two trees' classification path. A `null` result or confidence below 0.6 sets `degraded = true`.

**Which questions have a genuine catch-all bucket:**

| Tree | Node | Catch-all tap id | Status |
|---|---|---|---|
| SIM | `q1` | `vague` | keyword cue, unchanged |
| SIM | `q1_reask` | `still_vague` | keyword cue, unchanged |
| SIM | `a2_duration` | `dur_cannot_recall` | keyword cue, unchanged |
| SIM | `a3` | `ret_cannot_recall` | keyword cue, unchanged |
| SIM | `r1` | `prefers_not` | keyword cue, unchanged |
| SIM | `r3` | `does_not_know` | keyword cue, unchanged |
| SIM | `b2`, `b3` | `other` | keyword cue, unchanged |
| SIM | `a2_city` | — | no catch-all exists |
| Farmer | every node (8 total) | `unclear` | universal since Round 23 |
| Premium | `q1_addr` | `not_sure` | keyword cue, unchanged |
| Premium | `addr_tenure` | `cannot_recall` | keyword cue, unchanged |
| Premium | `addr_whose` | `not_sure` | keyword cue, unchanged |
| Premium | `addr_landmark` | `does_not_know` | keyword cue, unchanged |
| Premium | `addr_work`, `addr_living` | — | no catch-all exists |

### 2d. A risk worth restating: `land_area` drives live arithmetic — via two LLM calls, not one

Since Round 21 the bucket choice comes from Haiku; since Round 28 the acreage figure itself can too. Both are real, tested, LLM-dependent inputs to the farmer resolvers' arithmetic. Round 28's own regression check confirmed the acreage-extraction fix flips only Ramesh Yadav's case (the one persona that actually sat near a bucket-midpoint edge).

### 2e. Round 30 additions — classifier/STT reliability (new since the previous audit refresh)

Four items, all in `apps/agent/api/_classify-core.ts`, `AmberPanel.tsx`, and `useMultiProviderSpeechRecognition.ts`; a fifth threads a new parameter through the acreage call. All verified still present in current code.

1. **Fetch timeout.** Both `classifyWithClaude` and `extractAcreageAcres` now race their `fetch` against a `fetchWithTimeout()` helper — a 9-second `AbortController`. A timeout resolves to `null`, handled identically to any other classifier failure by existing degraded-mode logic.
2. **Degraded mode now defaults to Option B (suggest Other/Unclear, Confirm still required).** When the classifier returns `null` or below-threshold confidence, if the current node has a tap literally id `unclear`, it's now set as the suggested tap (still marked `degraded: true`, with degraded-specific copy — "Mr. Holmes couldn't narrow this down" instead of "Mr. Holmes suggests"). In practice this **only ever fires on the farmer tree** — SIM/premium-address's own catch-all taps use different literal ids (`vague`, `not_sure`, etc.), so their degraded-mode UI is unchanged, despite the Round 30 handoff's own text loosely implying otherwise (flagged explicitly by that round's resolution doc as a premise mismatch worth recording, not a bug).
3. **~150-word STT auto-stop cutoff.** A new `WORD_LIMIT = 150` in the STT hook stops listening once the *committed* (not interim) transcript crosses that count, using the same teardown path a manual stop already used — uniform across all three STT tiers. `AmberPanel.tsx` intercepts a `cutoffForLength` transcript before it ever reaches the classifier, and defaults straight to the same degraded Option-B suggestion as item 2, with an "Answer was too long to process" banner.
4. **State-aware bigha/regional-unit conversion.** The applicant's declared state (parsed from `persona.declaredAddress`) is now threaded into the acreage-extraction prompt, which converts bigha/gaz/kanal-style answers "using `<state>`'s standard local size for that unit" when a state is known, falling into the existing no-confident-figure path otherwise. **No hardcoded conversion table exists — this is deliberately an LLM-governed conversion, not a lookup table**, per an explicit user decision. **Open reliability gap, not silently patched:** 13 real live calls showed the conversion is not stable — the same stated bigha count in the same state returned figures implying a >3x range in acres-per-bigha across 5 identical trials. Flagged by Round 30's own resolution doc as needing a follow-up decision (accept the variance, add a plausibility clamp, or reconsider a hardcoded table) — still open as of this audit, see Part A3/C.
5. None of the above touches `FARMER_ACREAGE_RANGE`, `FARMER_ACREAGE_MIDPOINT`, `FARMER_CROP_VALUE_BAND`, the bucket-classification prompt itself, or either non-farmer tree.

---

## 3. Human Review triggers — every coded path

**Tree-native HUMAN_REVIEW verdicts** (terminal, reached by normal question routing — see §1's tables for the exact triggering tap):

- SIM: `no_comprehension`, `other_at_q1`, `other_at_b2`, `other_at_b3`, `human_review_still_vague`, `human_review_vague_timeline`, `human_review_declined_r_q1`, `human_review_family_unknown`, `human_review_vague_duration`, `human_review_plausibility`, `human_review_arithmetic_vague` (11 total)
- Farmer: `human_review_farmer_seasonal`, `human_review_farmer_livestock`, `human_review_farmer_tenancy` (3 total)
- Premium address: `human_review_addr_unclear` (1, reached from 3 different taps across 2 nodes)

**`human_review_unclear_bucket`** — the universal farmer catch-all's terminal, farmer-tree only, since Round 23. Unlike every verdict above, this is **not** a static table entry — its `reasons`/`agentNote` vary per node and per call, constructed dynamically at commit time:

- Confirming the `unclear` tap on any farmer node pauses at the terminal (`AmberPanel.tsx`'s `advance()` interception) for an optional free-text note, not gating the Confirm/Retake CTAs.
- On submit, `submitUnclearNote()` builds the verdict with a `reasons` array plus a separate `agentNote` field, rendered as its own labeled block only for this verdict in Case Summary.
- Score passed as `null`, matching every other agent-initiated HUMAN_REVIEW verdict.

**Agent-initiated, not tree-native:**
- **`handleOtherSubmit`** — the free-floating "Other" panel, now SIM/premium-address only (farmer nodes have their own inline `unclear` tap).
- **`escalate()`** — the abort/escalation flow (§4).

Every `Verdict` carries `reasons: string[]`, and `onVerdict(verdict, score, path)` always passes the full `PathEntry[]` trail. `PathEntry` gained one optional field in Round 28, `extractedAcreage?: number`, set only on a `land_area` entry after the agreement check validated it.

---

## 4. Abort / escalation flow

Defined entirely in `AmberPanel.tsx:44-89`, general across all three trees.

**Six abort reasons, three kinds:**

| Reason id | Label | Kind | Behavior |
|---|---|---|---|
| `ask_repeat` | Applicant asks to repeat | `retry_ask_repeat` | Always retry-safe, unlimited |
| `rambles_unclear` | Applicant rambles / unclear | `retry_unclear` | Retry-safe up to once; a second unclear tap auto-escalates |
| `distressed_hostile` | Applicant distressed or hostile | `escalation` | One-line routing confirmation, then ends the tree |
| `language_barrier` | Language the agent can't handle | `escalation` | Same |
| `connection_unrecoverable` | Connection unrecoverable | `escalation` | Same |
| `stt_model_failing` | Speech-to-text / model repeatedly failing | `escalation` | Same |

**Retake — uncapped since Round 23**, a cross-tree change. "Retake" buttons are always visible/clickable, any number of times, for every tree.

**Round 29 — the "Customer still connected" confirmation dialog is gone entirely.** "End Session" now calls `onContinue` directly — one click straight to Case Summary, for every verdict band. The `showEndConfirm` state, its `<Modal>`, and the now-unused `PhoneOff`/`Modal` imports were all deleted.

---

## 5. Risk dimensions

**Names, keys, canonical order — unchanged.** `RiskDimensions` (`personas.ts:20-26`), `DIMENSION_LABELS`, `DIMENSION_ORDER` — five keys (`identity`, `digitalPresence`, `telecom`, `paymentFraudBlacklists`, `coherenceRisk`), same order, same tie-break note. `Dimension { level; primarySignal? }`.

**How a dimension's tier is assigned — hand-authored literals, no formula.** Two rounds of real changes since Round 21:

**Round 22 (Farmer personas):** `coherenceRisk` reframed from `NOT_AVAILABLE` to a real pincode-benchmark flag (MEDIUM for Ramesh Yadav/Bhagwan Singh, HIGH for Meena Devi(farmer)/Dilip Chaudhary); `paymentFraudBlacklists` dropped to LOW for all four (the signal moved to `coherenceRisk`); `identity`'s wording shortened to "No EPFO record found."

**Rounds 32–33 (Suresh Yadav, Lakshmi Bai, Meera Iyer) — confirmed landed in current code, verified by direct read of `personas.ts`, not assumed:**

| Persona | Change | Current `coherenceRisk` |
|---|---|---|
| Suresh Yadav (`suresh`, SIM tree) | Was `NOT_AVAILABLE`; Round 32 added a real value reflecting both SIM-circle mismatch **and** SIM recency together (a fairness rule: a geography/circle signal must never fire alone) | HIGH — "SIM registered in a different circle from declared address, and the SIM itself is recently activated" |
| Lakshmi Bai (`lakshmi`, Premium Address tree) | Round 33 moved the coherence-shaped signal off `paymentFraudBlacklists` (now LOW) onto `coherenceRisk`, mirroring the Round 22 Farmer precedent exactly | MEDIUM — "Declared address inconsistent with declared income/occupation" |
| Meena Devi → **Meera Iyer** (`meena`, Premium Address tree — id unchanged, only the display name changed to resolve a naming collision with the unrelated Farmer persona `meenadevi`) | Same move as Lakshmi's | HIGH — "Address affluence does not match applicant profile" |

A repo-wide grep for the literal string "Meena Devi" turns up only the Farmer persona (`meenadevi`, correctly untouched) and historical handoff docs — no stale or ambiguous reference to the renamed Premium Address persona remains anywhere in live code.

SIM's `ramesh` (Ramesh Kumar) and every Farmer persona's other fields: untouched by rounds 30–34.

`computeScore()` (`scoring.ts:28-38`) — the tree's own live "Composite score" — remains unrelated to the five `RiskDimensions`.

**Dimension-display logic:** `CustomerDetailsStep.tsx`'s pre-call callout and `RiskSnapshotModal.tsx` both render all 5 dimensions via the same shared, exported `DimensionList({ dimensions })` component (extracted in Round 22 so both call sites can never visually drift apart) — confirmed unchanged, and confirmed both are now fully restyled (Part A2). `QueuePage.tsx`'s queue table shows only "N rule(s) fired," no tree-label/scenario line (Round 22). No icon set exists per dimension or per level anywhere — colored chips/dots and text only.

---

## 6. Personas and test data

**Count and identity unchanged; three personas' `dimensions` values changed (Rounds 32–33, confirmed landed), one persona's display name changed (Round 33, confirmed landed).**

| Group | ids | primaryTreeId |
|---|---|---|
| SIM circle mismatch | `ramesh`, `suresh` | `sim_circle_mismatch` |
| Farmer income mismatch | `rameshyadav`, `meenadevi`, `bhagwansingh`, `dilipchaudhary` | `farmer_income_mismatch` |
| Premium Address Risk | `lakshmi`, `meena` (displays as **"Meera Iyer"**, id unchanged) | `premium_address_risk` |
| Sample cases | `sample_green`, `sample_red` | none, view-only |
| Queue filler rows | `filler_priya`, `filler_arjun`, `filler_sunita`, `filler_farhan` | none, synthetic |

Still 8 interactive Amber personas + 2 sample cases + 4 filler rows = 14 records total.

**Ramesh Yadav's persona:** `declaredAnnualIncome` = 230000 (Round 22's pincode-benchmark reframing), and this is the exact persona Round 28's acreage-midpoint fix was built and verified for (§1b).

**What's hardcoded vs. generated per persona:** `AgentContext.tsx` calls `buildIncomingCustomer(sessionRng, ...)`, a random draw from a 500-customer pool; `applyPersonaToCustomer` overlays only `name`/`currentAddress`/`incomeEmployment`.

**Avatar/language randomization — still confirmed open, still not fixed** (see Part A3). Re-confirmed via grep that `sessionRng`, `buildIncomingCustomer`, and the `customer.language` read sites are unchanged since Round 30.

**Note on the two "story asset" personas not yet built** (Round 32 context, not part of this prototype's scope): a tier-3-pharmacist coherence persona was explicitly deprioritized by the user; a 30-year-old Mumbai digital-thinness persona was flagged as wanted but not yet built. Neither exists in `personas.ts` — mentioned here only so a future round doesn't assume otherwise.

**Cross-check against the PRD's rule catalogue — not independently re-verified this round.** The Round 35 handoff suggested checking `[PRD] Mule Sentinel.docx`'s on-paper 57-rule/9-category catalogue against this prototype's simplified rule/scoring logic. Neither this audit nor its predecessor did that comparison — flagged here as a genuine gap in the audit itself, not a finding about the product, worth a dedicated follow-up round if useful (see Part C).

---

## 7. Language / localization handling

**Every place the UI branches on language:**

1. `AmberPanel.tsx` — `SPEECH_LANGUAGES` (English → `en-IN`, Hindi → `hi-IN`) sets which language the active STT provider listens in — feeds either ElevenLabs Scribe v2 (first) or the Web Speech API (fallback).
2. `useSpeechRecognition.ts` — `languageToTag()` maps 4 bank-declared language strings to BCP-47, only 2 surfaced as selectable options.
3. `IncomingCallCard.tsx` / `CustomerDetailsStep.tsx` — render `customer.language` as a static read-only label.

**Round 26 — the Farmer tree is genuinely bilingual**, question text and every tap label, not just `sampleTranscript`. `QuestionNode.questionHi?`/`Tap.labelHi?` — both optional, additive; only Farmer-tree nodes/taps populate them. **Display is always both languages together**, not a dropdown-driven toggle, rendered via `QuestionText`/`TapLabel` in `AmberPanel.tsx`. Explicitly confirmed the classifier prompt only ever reads the English `definition`/`label` — `labelHi` never reaches it.

**Round 24 — ElevenLabs' language codes are ISO 639-1, not BCP-47**, no combined Hinglish code for STT input (`toElevenLabsLanguageCode()` drops the BCP-47 region suffix: `hi-IN`→`hi`, `en-IN`→`en`). Scribe v2 handles code-switching natively within a single code.

**`tree.ts` question fields: no longer English-only, for the Farmer tree specifically** — every Farmer question/tap now carries real Hindi (three typos caught and corrected during Round 26's own transcription). SIM and premium-address remain English-only.

---

## 8. UI copy inventory

The previous audit's line-by-line UI-copy table (AmberPanel header/question-card/abort-accordion/persistent-controls/SpeechCapture/ResolutionCard text, QueuePage table headers) is unchanged in content since Round 29 — not reproduced verbatim here to avoid duplicating ~150 lines that carry no new information; see the Round 30-and-earlier version of this document (recoverable via `git log`/this file's own history if ever needed) for the exhaustive line-number table. The one relevant update: **`ResolutionCard`'s copy is unchanged text-wise, but the component itself is still on old Tailwind styling** — see Part A1/A2, not a copy change.

---

## 9. Speech-to-text provider architecture

**A three-tier fallback, shared beneath all three trees:** ElevenLabs Scribe v2 Realtime (tried first, always) → Google Cloud Speech-to-Text (tried second, currently dead code — no key, blocked on Cashfree IT's SSL-inspecting proxy) → Web Speech API (final fallback, the original pre-Round-24 mechanism, unchanged).

**Interface preservation:** the orchestrating hook `useMultiProviderSpeechRecognition` returns the exact same shape `useSpeechRecognition` always did, so consuming components need no structural change and are unaware which provider is actually running.

**Backend token endpoint** (`api/_stt-token-core.ts`): mirrors the classifier's dev/deployed split exactly, mints a short-lived single-use ElevenLabs token server-side — the raw key never reaches the browser bundle. See Part A4 for current key/status confirmation.

**Two real protocol bugs found via live calls, both fixed** (documented in the file's own header as a cautionary note): the discriminator key is `message_type` not `type`; the audio field is `audio_base_64` not `audio_chunk`.

**Round 30 addition — the 150-word auto-stop cutoff — is layered on top of this hook**, see §2e for the full mechanism; it doesn't change the tier-fallback architecture itself.

**Disclosed gaps, not independently verified:** mid-call ElevenLabs failure → fallback (reasoned through, not exercised live); multi-segment commit behavior (only ever observed single-segment); the actual in-browser mic → WebSocket path (this sandbox's mic is blocked — verified instead via a standalone Node script against the real endpoint); the GCP tier (interface only).

---

# Part C — Flagged issues (severity-tagged, not prioritized)

Presented for Jack's own prioritization call — grouped by blast radius, not by suggested order.

### Blocks or visibly mars a live demo
- **Bug 1 (open): incoming-call card is buried below the fold on the Queue page** once the queue has more than a screenful of rows — an agent (or a demo audience) sees no indication a call is waiting unless they scroll past the whole table. `QueuePage.tsx:352-378`.
- **Bug 3 (open): the "Manually choose bucket ▾" dropdown overshoots its card by ~200px** on every farmer-tree question, clipped rather than scrolled — visible on the single most-demoed flow in the app (the Amber Q&A machine). `AmberPanel.tsx` ~line 1187, `cf-design-system.css:1217-1221`.
- **`ResolutionCard` (the verdict card) and Case Summary are still on the old Tailwind styling**, not the new design system — a visible style mismatch immediately after the now-fully-restyled Amber Q&A flow resolves, right at the moment a demo would land its conclusion. `AmberPanel.tsx`'s `ResolutionCard`, `PostCallConfirmation.tsx`.

### Data-integrity risk, not visual
- **Bigha/regional-unit acreage conversion is unstable** — the same stated bigha count in the same state produced up to a 3x spread in implied acres-per-bigha across 5 identical live calls. This number feeds directly into farmer-tree income-reconciliation arithmetic that can produce a BLOCK/STEP_UP/PROCEED verdict. Flagged by Round 30's own resolution doc as needing a follow-up decision; still open. `_classify-core.ts`, the `land_area` acreage-extraction prompt.

### Structural — needs a decision from Jack, not a quick fix
- **All of Rounds 30–33's application code is uncommitted**, sitting only in this one working tree (4 total commits exist repo-wide; the two "Round 30 resolution" commits contain only the resolution docs, confirmed via `git show --stat`). This is the engagement's own long-standing deliberate practice (commit handoff docs, not app code), not a mistake — but it does mean a fresh clone or a different machine would not see any of the design-system restyle, the shell rebuild, or the Round 32/33 persona edits. Worth a conscious decision about when (if ever) to commit this, especially before this repo becomes the shared reference for two ongoing conversations per Round 35's own stated purpose.
- **7 KYC-step files are dead code, not just unrestyled** (`AadhaarStep.tsx`, `CaptureFaceStep.tsx`, `CaptureSignStep.tsx`, `LivelinessStep.tsx`, `LocationStep.tsx`, `PanStep.tsx`, `ReportStep.tsx`, plus `ThresholdChip.tsx`) — unreachable from any live route today. Worth deciding whether to delete them or keep them as a landing pad for a future round that reintroduces a compliance-step sequence.
- **`.trail-item` and the P01–P10 narrative-screen CSS were ported into `cf-design-system.css` but never used anywhere** — dead CSS today, reserved for Case Summary and a narrative screen respectively. Not harmful, but worth knowing before assuming "if it's in the CSS file, it's live somewhere."

### Cosmetic, low visibility
- **Avatar and `customer.language` regenerate randomly on every incoming call** instead of being stable per persona — visible on close inspection, not demo-blocking. Open since at least Round 22, confirmed unchanged through Round 34.
- **`CallRoomPage.tsx`'s root height calc is off by ~8px** (assumes a 56px header, the real one is 64px) — produces a small internal scroll region, nothing is clipped or unreachable. Explicitly deferred by Round 30's own resolution doc.

### Confirmed fixed — no action needed
- **Bug 2 (Risk Snapshot modal overflow/ghosting):** fixed — `.modal` has a `max-height`/`overflow-y:auto` pair, no double-mount anywhere. Verified live at multiple viewport heights.
- **Bug 4a/4b (call-room blank rail; End Call misalignment):** both not reproducible against current code — the rail was intentionally redesigned into a full-width strip, and the End Call button's geometry measures as correctly aligned with its siblings.

### Data gaps flagged in the audit process itself, not the product
- **The PRD's 57-rule/9-category catalogue was not cross-checked against this prototype's simplified rule/scoring logic** — the Round 35 handoff suggested this as useful context; neither this refresh nor the previous one did it. A real gap in audit coverage, not a claim about the product, worth a dedicated pass if useful.
