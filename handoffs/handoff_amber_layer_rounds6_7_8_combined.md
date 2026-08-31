# Handoff: Amber Resolution Layer — Rounds 6–8 (Combined)

**Context:** consolidates three rounds into one file. Round 7 revised one of round 6's decisions
(Capture Sign's fate) — this file reflects only the final, current state, not the superseded
version. Noted inline where a revision happened, for traceability.

---

## Part A — Progress list and flow (rounds 6 + 7)

### 1. Rename `Resolve Signal` → `Amber Resolution`

Label change only. Same icon, same three states (not_started / active / complete).

### 2. Final Progress list order — all prior stages pre-completed on screen load

Order: `Check Liveliness` → `Check Location` → `Capture Face` → `Check Aadhaar` → `Check PAN` →
`Capture Sign` → `Amber Resolution`.

**Revision note:** round 6 originally asked to remove `Capture Sign` from the Progress list
entirely. Round 7 revised this — `Capture Sign` stays in the list, but the applicant completes the
entire VKYC sequence, including signing, before an agent ever joins an amber case. So by the time the
agent's call screen renders, **all six stages up to and including `Capture Sign` already show
`complete`** (green check) — no click-through sequence, no intermediate active states. `Amber
Resolution` is the only stage that starts `active`, immediately, on first load. This extends the
logic already present in the existing "All KYC steps completed. Resolving 1 flagged signal" banner.

### 3. Call screen lands directly on Amber Resolution — no interstitial

When the agent accepts the call, the first thing rendered is the Amber Resolution screen itself
(Question 1, Agent Script, bucket list) — not a sequence of KYC-step screens to progress through.

### 4. Video feed — plain view from the very first frame, no exception

Round 5 fixed the signature guide-box/caption leaking into the resolution screen, but scoped that
fix to "while Resolve Signal is active." That scoping is now wrong given item 2 above — there is no
state, at any point in this screen, where the signature guide box or the "ask the customer to show
the signed paper" caption should appear. Capture Sign already happened before the agent joined;
nothing about it is ever shown again. Plain, unmodified video feed for the entire duration of the
agent's involvement.

### 5. New end-session confirmation on Amber Resolution completion

Once every flagged question is resolved (the point that used to trigger "Continue to compliance
steps"), show an end-session confirmation directly — same visual pattern as the reference screenshot
(title bar with close X, one message paragraph, `Back` + dark primary button):

- **Title:** `Customer still connected`
- **Message:** `The customer is still connected. Are you sure you want to end the customer session?`
- **Primary button:** `End Session` — reuses the exact label already used for the persistent link in
  the top utility strip.
- **Secondary button:** `Back` — closes the modal, agent remains on the current completed-state
  screen, no session change.

Conditional on the copy itself: this modal only appears if the live call is still connected. If the
customer has already disconnected on their own, ending the session proceeds without this
confirmation.

### 6. Report — cut entirely from the journey

Section Remarks, Browser & IP Details, and Agent Remarks are removed from this flow completely — not
hidden, not reachable via another path. Confirming `End Session` ends the case outright.

---

## Part B — Design system alignment (round 8)

**Context:** Code got VPN access to the real Cashmere Storybook. Key finding: the color tokens
already in `tailwind.config.js` (`primary`, `surface`, `text`, `success`, `danger`, `warning` +
`subtle`/`border`/`text` variants, `border`, `accent` + `hover`/`subtle`) are already correctly
mapped to the real Cashmere values — confirmed by direct match against the Storybook's authoritative
token tables. The problem isn't missing tokens, it's 121 places that bypass them.

### 7. Migrate the 121 raw-Tailwind-class occurrences to existing token classes

Every raw palette class (`bg-red-50`, `border-amber-200`, `text-purple-800`, etc.) across the
flagged files gets replaced with the correct existing semantic token class —
`success`/`danger`/`warning`/`accent`/`primary`/`surface`/`text`/`border`, using the appropriate tier
(`subtle`/`hover`/`pressed`/`active`/`disabled`) for the specific UI state involved, not just the
flat default shade.

Files, per Code's grep, minus one now-moot entry: `ThresholdChip.tsx`, `LivelinessStep.tsx`,
`CustomerDetailsStep.tsx`, `AadhaarStep.tsx`, `AmberPanel`/`RiskSnapshotModal`, plus the rest of the
15+ file list Code already has. **`ReportStep.tsx` is removed from this list** — Report is cut
entirely per item 6 above, so this file needs no migration.

Mapping the specific 121 occurrences is Code's task, not something to pre-specify here — Code has
direct access to both the real token values and the actual lines of code; the instruction is the
principle (migrate to the correct existing alias + tier), not a per-line table.

### 8. This session's HTML mockup's hex values are structural reference only

`queue_page_redesign_mockup.html` used approximated colors to demonstrate spacing rhythm, type
hierarchy, and table structure — not real Cashmere values. Its structural decisions (4px spacing
grid, type scale, table layout with headers + legend row, right-aligned score) still hold. Its hex
values should be discarded in favor of the real tokens confirmed in `tailwind.config.js` — not
treated as a second color source competing with the real one.

### 9. Ask for Code: pull Typography / Spacing / Radius / Elevation tokens

While Storybook VPN access holds, get the rest of the foundations:

- **Typography** — type scale (size/weight/line-height steps), font family, heading/body/caption
  role naming convention.
- **Spacing / Radius / Elevation** — real spacing scale, corner-radius tokens, shadow/elevation
  tokens for cards and modals.

Same treatment as colors: once these are real, only the values change in the mockup's structural
decisions, not the decisions themselves.

---

## Open items

None — every item across rounds 6, 7, and 8 is fully decided. Item 9 is a request for Code to gather
more information, not a decision pending from Jack.

---

## Resolution (Code)

**Part A — built and verified end-to-end in-browser:**

- `Resolve Signal` renamed to `Amber Resolution` (display label only).
- `ProgressRail` now filters `Report` out of the rendered list entirely (the shared `CALL_STEPS`
  constant itself is untouched — it's also used by `apps/customer`) and moves the synthetic Amber
  Resolution row to the end, after Capture Sign, matching the new order. `startWorkflow` pre-marks
  all six real steps `passed` (including `sign`, previously left `active`).
- `currentStage` (the single source of truth introduced in round 5) is now `'pre' | 'resolve_signal'
  | 'done'` — it never resolves to a real step id anymore, since no compliance step is ever live for
  an amber case post-round-8. `getCaptureMode()` is therefore structurally always `null` — item 4 is
  satisfied by construction, not a conditional.
- The new end-session confirmation lives inside `AmberPanel`'s `ResolutionCard`, opened by its own
  CTA (relabeled `End Session`, replacing the old "Continue to compliance steps" /
  "Continue call — case escalated" copy, which no longer applies). Confirming calls a new
  `finalizeAmberCase()` in `CallFlowContext`, which marks the gate resolved and maps the verdict band
  to a decision — `PROCEED`/`STEP_UP` → `approved`, `BLOCK` → `rejected`, `HUMAN_REVIEW` → `unable` —
  then submits it through the existing `submitDecision` flow, so `PostCallConfirmation` still fires
  correctly with the right metrics bucket. This mapping (particularly `STEP_UP` → `approved`) wasn't
  specified here and was Code's call — flagging it in case that's wrong.
- The "if the customer has already disconnected on their own" bypass in item 5 has no real backing
  state in this simulated build (no live connection to actually drop) — the modal always shows,
  which is the correct behavior given that condition never occurs today.
- Report's screen and its content (`ReportStep`, `KycReport`'s render path, the "View Report"
  button on `PostCallConfirmation`) are no longer reachable from the amber journey — StepWorkspace no
  longer renders any CALL_STEPS-driven step at all, since none can ever be live. The step component
  files themselves (`LivelinessStep.tsx`, `CaptureSignStep.tsx`, etc.) were left on disk rather than
  deleted — they're unreachable but harmless, and deleting ~8 files felt like a separate, bigger
  decision than what was asked here.

**Part B — item 7 done, item 9 blocked:**

- Extended `tailwind.config.js` with the missing tiers, all sourced from the verified Storybook
  values: `success.subtle`/`success.strong`, `danger.subtle`, `text.disabled`. No new top-level color
  families were added — two real gaps came up and were resolved by re-mapping rather than inventing:
  - Cashmere has no purple in its palette at all. The two spots that used raw purple (a handover-log
    line, the victim-flag reveal box) are re-mapped to `accent` (Cashmere's Info blue shares the
    Accent family's exact values) as the closest real semantic fit for an informational callout.
  - The muted/inert gray dots (e.g. `NOT_AVAILABLE` risk dimension, offline status, "not started"
    progress icon) map to the real `--sds-neutral-text-disabled` (`#8d8d8d`) — a deliberately
    different, slightly darker tone than the Tailwind gray it replaced, since that's what the actual
    token specifies.
  - Negative's tiers don't lighten the way Positive's/Warning's do — `--sds-negative-border-subtle`
    is `#b80000`, the same as `danger`'s own default, not a pale tint. Used as-is rather than
    softened to match the visual pattern of the other statuses.
  - All 121 flagged occurrences are migrated; confirmed by grep and a full visual pass (queue table
    dots, Risk Snapshot chips, Amber Case banners, the abort accordion's escalation zone, toggle
    states) — nothing left unstyled, no console errors.
- Item 9 (pull Typography/Spacing/Radius/Elevation tokens): the Storybook VPN session dropped
  between finishing the color work and starting this — same CloudFront 403 as before VPN was first
  connected. Colors were already fully captured before this happened, so item 7 wasn't affected. This
  is still open — needs a fresh VPN connection to resume.

Files touched (Part B): `apps/agent/tailwind.config.js` plus ~20 component files across
`components/`, `features/agent/`, and `vendor/cashmere-stub.tsx`.
