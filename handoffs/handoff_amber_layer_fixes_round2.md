# Handoff: Amber Resolution Layer — Round 2 Fixes

**Context:** follow-up to `handoff_to_new_prototype_chat.md`. Grounded against the current build
screenshots (queue, risk snapshot modal, call screen, question/bucket panel, capture sign, report)
and the actual `dimensions` / `primary_signal` API contract from the Mule Sentinel PRD. Same standing
rule applies: every item below is a decision, not a menu — if something is genuinely open, it's
flagged explicitly rather than left as an option set.

---

## 1. Remove "Attempt 2" everywhere

Cross-cutting removal, not just one screen:
- Queue card badge (Accept/Reject card, next to AMBER badge)
- Call screen header badge
- Report step "Attempt: 2" row

No repeat-attempt framing anywhere in the prototype going forward.

---

## 2. Call-screen context banner — replace metadata line + Document Submitted badge

**Remove:**
- "Document Submitted: eAadhaar · API" badge
- The line: *"18 Aug 2026 by Rajesh Joshi — Call Ended — Incomplete: Customer Related — Customer
  requested reschedule / ran out of time. Pay special attention to previous failure points during
  this call."*

**Replace Document Submitted badge with:** `Onboarding Channel` badge.
Values: `Self-Serve App` / `Assisted — BC Agent`.
One badge slot serves two purposes — no new badge added elsewhere, and it's information the agent
can actually use (who conducted the KYC), unlike the doc-type badge it replaces.

**Replace the metadata line with a Fired Signal line**, sourced from `dimensions.[x].primary_signal`
(same field already driving the Risk Snapshot modal — UI reuse, not new plumbing):

```
Fired: [primary_signal text] · [Dimension name] · [Assessment level]
e.g. Fired: SIM circle does not match declared address · Telecom Intelligence · Medium Risk
```

- Zone: same position as the old banner, plain text, no border (don't stack a second amber box
  under the existing "customer may have stepped away" banner already on this screen).
- **State — populated, single rule:** as above.
- **State — populated, multiple rules:** show top signal by contribution magnitude (matches
  `risk_signals` sort order) + `+2 more` suffix, matching the queue table's "2 rules" language.
  Full list stays in Risk Snapshot only.
  - **Ranking, resolved:** `RiskSnapshot.dimensions` only carries a categorical `level`
    (LOW/MEDIUM/HIGH), not a numeric weight — proceed on that basis rather than adding real weights
    first. Rank by severity (HIGH > MEDIUM > LOW), ties broken by the fixed PRD dimension order:
    Identity Authenticity → Digital Presence → Telecom Intelligence → Fraud & Compliance → Payment
    Behaviour.
  - **"+N more" count, resolved:** count = number of *non-LOW dimensions* beyond the one already
    shown as the primary signal. Not `firedRules.length` — that's a different taxonomy from what the
    rest of the line is built from (`dimensions`), and mixing them undercuts the line's whole
    purpose.
- **State — zero dominant signal** (pure-aggregate amber): render
  `Flagged: [top dimension name] — near band boundary`. Never blank.

---

## 3. Customer Details — add Onboarding Channel field

Add `Onboarding Channel` row, right column of the Customer Details grid, directly under
`Product Type`.
Values: `Self-Serve App` / `Assisted — BC Agent` — "BC" (Business Correspondent) used deliberately;
it's the real term banks/NBFCs use for their agent-network onboarding channel.

**Decided — `BC Sourcing Code` field, included this round.**
Format: `BC-[2-letter state code]-[4-digit zone code]-[4-digit sequential agent ID]`
Example, tied to Ramesh Kumar's declared address (Agra, Uttar Pradesh): `BC-UP-0412-8834`

Tying the state prefix to the applicant's own declared address (rather than a random string) is
what makes it read as authentic — a real BC network's codes are regionally structured, and matching
the applicant's own state reinforces the ordinary, unremarkable demo quality already required
elsewhere in this project.

Rendering rule: shown as a second line directly beneath `Onboarding Channel`, only when
`Onboarding Channel = Assisted — BC Agent`. A Self-Serve App applicant has no BC code — the field
does not render at all in that case (not blank, not N/A — simply absent), since there's nothing to
report for that channel.

Not adding: device fingerprint / IP-region match fields here — those already live in Browser & IP
Details at the Report step; duplicating would blend the two panels.

**Resolved — channel assignment across personas.** Code authors this directly: alternate
`Self-Serve App` / `Assisted — BC Agent` by persona list order, independent of genuine/mule/victim
label. Alternating by position (not by outcome) is what actually guarantees no correlation with
ground truth — hand-picking risks reproducing the exact "tell" this was meant to avoid. Ramesh keeps
the worked example value (BC Agent, `BC-UP-0412-8834`) already specified above; the rest follow the
alternation from there.

---

## 4. Capture Sign stuck state — new enum

**Decision:** `capture_sign_status: 'stage_jump'`, added as a valid value alongside `pending` /
`captured`.

Naming logic: needs to read unambiguously in code/logs as "bypassed for a live-demo jump," distinct
from any other future test flag. `stage_jump` says exactly that; `demo_skip` / `preset_complete` are
too generic and risk getting reused for unrelated shortcuts later.

**Behavior:** when set, Capture Sign is treated as satisfied without the actual "Capture Signature"
interaction; state machine advances to Report; End Session control (Section 5) becomes available
exactly as it would after a real capture.

**Decided — trigger location.** A `Skip to Report (demo)` text link, placed directly next to the
`End Session` link in the top-right utility strip (Section 5), visible only in the demo/dev build —
not in the persona picker or queue. Consistent with where `End Session` already lives, and doesn't
require a new UI surface.

---

## 5. End Session control — persistent fallback

The existing "All captures complete — end the customer session?" modal only fires automatically
after a real signature capture — exactly the path Section 4's bug breaks, leaving no fallback.

**Decision:** add a persistent, low-emphasis `End Session` text link in the top-right utility strip,
next to `Online ▾`. Available at every call-screen state from Capture Face onward — not only after
signature capture — so neither a real agent nor a demo operator can get stuck without a manual exit.
Sits alongside, not instead of, the existing auto-triggered modal.

---

## 6. "Mr. Holmes" processing state — needs its own visual identity

Bug: currently reuses the same font weight/size as the option buttons below it, reading as an inert
row rather than active processing.

**Decision — replace the option-button zone entirely (not overlay) during processing:**
- Single centered block replaces the 4 option buttons + "Other" link.
- Small pulsing 3-dot loader (not a spinner — reads as "thinking," not "fetching").
- Label beneath, muted gray, smaller/lighter than option-button text: `Reviewing response…`
- No border, no button shape — must not read as tappable.
- Duration: fixed ~1.5s simulated delay, then transitions directly to bucket-suggestion state
  (Section 8).

---

## 7. "READ VERBATIM" → renamed

**Decision:** `AGENT SCRIPT` — same small-caps eyebrow treatment/position as the existing
`AMBER CASE` / `Question 1 of 3–5` labels above it, so all three read as one consistent metadata row
rather than one of them shouting an instruction.

---

## 8. Full answer → bucket-confirmation flow (exact states)

Replaces the current flat options list. Five states, one zone, each fully replacing the previous —
no partial overlap.

**State A — Awaiting answer.**
Question text + `AGENT SCRIPT` label. Below it: `Listen for applicant answer` (live path) and
`Simulate spoken answer ▾` (demo path — now a dropdown, see Simulate Control spec below).

**State B — Transcript captured.**
Answer renders as a transcript block, visually distinct from both question and options: light gray
background, quote-mark icon, italic text, labeled `Applicant said:` above it. Applies to both real
and simulated paths — this is what makes the simulate path show *what the answer was*, not just skip
to a result.

**State C — Processing.**
Section 6's Mr. Holmes state. Transcript block stays visible above it; loader appears below, not
instead of — agent should still see what was said while the system works.

**State D — Bucket suggested, awaiting confirmation.**
Highlighted suggestion card: `Suggested: [Bucket Name]` as primary action, `Confirm` button, plus a
lower-emphasis `Choose a different bucket ▾` that expands the other options only on tap (collapsed by
default). This is the concrete build of "model classifies, agent confirms" — default action is one
tap, not scanning a list.

**State D, no-classification variant — resolved, real gap, not a restated decision.** This is the
documented "degraded mode" from the Amber Resolution Layer doc's corner-case table (Section 11: "if
confidence is below threshold, no pre-selection appears, agent taps unaided"), and it needed
defining since no funded Anthropic API key means `classifyAnswer()` returns null in the live build
today — State D as specified above would otherwise never trigger outside simulate. When
`classifyAnswer()` returns null:
- Full bucket list renders expanded — no highlighted suggestion, no collapsed "different bucket"
  toggle (nothing to collapse).
- Small caption above the list: `Degraded mode — select manually` — so it reads as an intentional,
  documented fallback rather than a broken suggestion.

Simulate path is unaffected either way — see the Simulate control spec below, which sets the
operator-picked bucket directly as the "suggestion," bypassing `classifyAnswer()` entirely, so State
D always resolves cleanly there regardless of API key status.

**State E — Confirmed.**
Collapses to a compact one-line summary (`✓ [Bucket Name] confirmed`), advances to next question or
resolution.

**Simulate control spec:**
`Simulate spoken answer ▾` opens a dropdown listing that question's buckets by name (e.g. for SIM
Circle Mismatch Q1: "Yes, lived or worked elsewhere" / "No, always lived here" / "Still not sure /
vague" / "Did not understand"). Picking one plays States B→C→D→E using that bucket's canned
transcript text. This is a demo-control affordance tucked next to the real "Listen" button, not a
separate mode switch — lets every bucket per tree be exercised without a live call.

**Per-tap canned transcripts, resolved — mechanism now, placeholder content only.** The dropdown
needs one canned transcript per *tap*, not per node (the current `sampleAnswer` field lives on the
node) — extend `Tap` to carry a sample transcript field. Don't author real vernacular phrasing across
all nodes in this round — that's the same content-authorship work already sitting with the
sample-answers task in the strategy chat. Generic placeholder text (e.g. `"Sample answer for
[bucket name]"`) is enough to make the mechanism demonstrable now.

---

## 9. Abort section — restored, visually separated

Reasons pulled from the Amber Resolution Layer doc's corner-case table (Section 11), not invented.

**Zone:** collapsed accordion, `Unable to resolve / Abort call ▾`, below a horizontal rule at the
bottom of the question card. Background shift (light red-gray tint vs. the white/cream question
card) separates it from the resolution flow above — must not visually compete with the primary
confirm-a-bucket action. Collapsed by default, opens only on tap.

**Resolved — round 1 vs round 2 conflict on connection handling.** Round 1 had built "Technical
failure — call must restart" as retry-safe (no flag). This list puts "Connection unrecoverable"
under escalation-required instead. **Round 2 supersedes round 1**: this framing is the one actually
sourced from the Amber Resolution Layer doc's Section 11 corner-case table; round 1's "retry-safe,
call must restart" wasn't grounded in that table. Remove round 1's abort-reason set entirely rather
than merging it — this list below is the full replacement, not an addition.

**Retry-safe** (stays on this question, no abort):
- Applicant asks to repeat → re-ask, no state change
- Applicant rambles / unclear → re-ask once; a second failure on the same question auto-escalates to
  Review (this becomes escalation automatically, not a manual tap)

**Confirmed — per-question retry counter, net-new.** Source rule: "agent re-asks once; two failed
attempts on the same question and the tree terminates to review." Requires a counter scoped
per-question (reset on each new question), incremented on an unclear/rambling tap, auto-escalating
to Review at count 2.

**Escalation-required** (manual tap → routes case to Review, ends the tree):
- Applicant distressed or hostile → Review, explicitly no penalty to applicant
- Language the agent can't handle → routes to language-matched agent or Review
- Connection unrecoverable → Review with partial evidence attached (if reconnect succeeds instead,
  resume from last confirmed bucket — not an abort)
- Speech-to-text / model repeatedly failing → Review

Each escalation reason, once tapped, shows a one-line confirmation of where it's routing (e.g.
"Routing to Review — no penalty to applicant") before committing.

---

## Open items

None remaining from this round — both prior open items (BC Sourcing Code format, stage_jump
trigger location) are now decided above, and the six build-time questions Code raised while
implementing this round (dimension ranking/count source, BC-channel assignment across personas, the
State D no-classification variant, the round 1/round 2 abort-reason conflict, and per-tap transcript
scope) are resolved inline in their respective sections above.

---

## Reference material used for this round

- `[PRD] Mule Sentinel` — `dimensions` / `primary_signal` / `key_signals` API contract (Section 2, 8).
- `[GFF] MuleSentinel_Amber_Resolution_Layer_v3` — Section 11 corner-case table (source for Section 9
  abort reasons above), Section 10 runtime turn loop (source for Section 8 states above).
