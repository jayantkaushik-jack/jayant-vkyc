# Round 36 — ResolutionCard restyle, Amber Resolution pill bug, Bug 3 re-fix — Resolution (Code)

All three items built as specced. Item 2's actual root cause was traced and confirmed to be exactly
the kind of state-timing gap the handoff suspected — not a guess, a specific line. No tree logic,
classifier behaviour, scoring, or verdict logic was touched by any of the three fixes.

## 1. `ResolutionCard` restyled onto `cf-design-system.css`

`apps/agent/src/features/agent/call/amber/AmberPanel.tsx` — `ResolutionCard` (~line 1238) rewritten
onto `.card`/`.card--pad`, `.t-h1`/`.t-eyebrow`/`.t-body-str`/`.t-small`, and `.btn btn--primary
btn--lg btn--sheen` for "End Session," replacing the old `Card`/`Button` primitives and Tailwind
`bg-success-subtle`/`bg-danger-subtle`/`bg-warning-subtle`/`bg-bg` classes.

**Band tint** reuses the exact `--ok-*`/`--wa-*`/`--da-*` tokens already read by the queue table's and
Risk Snapshot modal's `.chip--ok/wa/da` classes, applied inline on a nested `.card card--pad`
(`background`/`borderColor`/`color` from `var(--ok-bg)` etc.) — the same inline-tint-on-`.card`
pattern this file already uses elsewhere (the suggested-bucket card, `AbortAccordion`'s red-tinted
panel), per the handoff's own instruction not to invent new `.card--ok`/`.card--da` classes for a
single call site. HUMAN_REVIEW's neutral case uses `--n-50`/`--n-200`/`--n-600`.

Copy, verdict/band logic, `victimFlag`, `hiddenReveal`, and the `isReview` branch are byte-for-byte
unchanged — only the JSX's classes/markup changed. `Button`/`Card` imports removed from the file
after confirming (via grep) `ResolutionCard` was their only remaining call site.

**Verified live, all four bands, via the real farmer-tree flow (queue → accept call → pre-call checks
→ "Manually choose bucket" simulate path, this sandbox's mic being blocked):**
- **STEP_UP** (Ramesh Yadav, out-of-band → side-business explanation → `step_up_income_explained`):
  amber tint, correct copy, correct score, "End Session" button styled and functional.
- **BLOCK** (Dilip Chaudhary, smallest/rainfed land vs. his real declared income, no alternate income
  offered → `red_farmer_cannot_reconcile`): red/danger tint, correct copy.
- **HUMAN_REVIEW** (Bhagwan Singh, q1 Path C → `human_review_farmer_livestock`): neutral tint,
  "SEPARATE REVIEW REQUIRED" heading, and the `isReview`-only explanatory box all rendered correctly.
- **PROCEED**: not reached in the same live session (an unrelated mid-session HMR full-page-reload —
  the same `AgentContext.tsx` "Could not Fast Refresh" pattern already documented as a known
  environment quirk in this engagement — dropped the session back to login right as this fourth case
  was mid-flow). Confirmed instead by reading the ternary directly: the PROCEED branch is the same
  `{ background, borderColor, color }` shape reading `var(--ok-bg)`/`var(--ok-br)`/`var(--ok-fg)` as
  the other three confirmed branches, with no conditional logic distinguishing it structurally from
  STEP_UP/BLOCK's already-verified rendering path.

## 2. "Amber Resolution" progress-rail pill — root cause found and fixed

**Root cause, confirmed in code, not guessed:** `ProgressRail`'s pill was always correctly wired to
`currentStage === 'done'`, and `currentStage` (`CallFlowContext.tsx`) was always correctly computed —
but it was keyed off `amberResolved`, a flag that only becomes `true` inside `finalizeAmberCase()`,
which fires when the agent clicks **"End Session" on `ResolutionCard`** — not when the verdict is
first reached. `recordAmberVerdict()` (called earlier, the instant a verdict computes and
`ResolutionCard` starts rendering) only sets `amberVerdict`/`amberPath`, deliberately not
`amberResolved` — the function's own existing comment explains why: `StepWorkspace`'s render gate
(`isAmberCase && !amberResolved`) has to keep rendering `AmberPanel` while `ResolutionCard` is
showing, so `amberResolved` can't flip the instant a verdict is recorded without unmounting the panel
before the agent ever sees it.

Net effect: the pill's "done" condition and the moment `ResolutionCard` actually appears were two
different events, with "End Session" (which also immediately calls `submitDecision` and moves the
whole screen to Case Summary, unmounting `ProgressRail` entirely) sitting in between — so the pill
never had a real window in which to render green while anyone could see it.

**Fix:** `currentStage`'s `useMemo` in `CallFlowContext.tsx` now checks `!amberVerdict` instead of
`!amberResolved`. Confirmed via a repo-wide grep that `currentStage` has exactly one consumer
(`ProgressRail`, via `CallRoomPage.tsx`) — so this change is fully isolated. `amberResolved` itself,
`finalizeAmberCase`, and `StepWorkspace`'s own separate gate logic are completely untouched; they
still govern when `AmberPanel` unmounts and Case Summary takes over, exactly as before.

**Verified live:** in all three of the band walkthroughs above, the "Amber Resolution" pill flipped
to the same green `lucide-check`/`text-success` treatment as the other six steps the instant
`ResolutionCard` rendered — confirmed via DOM inspection (`nav`'s last child's `outerHTML`) that the
icon and its class match the "complete" branch exactly, not a visual approximation.

## 3. Bug 3 (bucket dropdown overflow) — re-fixed

Root cause was exactly what `handoff_round34_ui_layout_overflow_fixes.md` §3 already diagnosed:
`.select` in `cf-design-system.css` (~line 1217) had no `width`/`max-width`, so the native `<select>`
sized itself to its longest `<option>` — the farmer tree's bilingual bucket labels (English + Hindi,
~80 chars) — rather than its container.

**Fix:** added `max-width: 100%; min-width: 0;` plus `overflow: hidden; text-overflow: ellipsis;
white-space: nowrap;` to `.select`. `min-width: 0` is necessary alongside `max-width: 100%` because a
`<select>` as a flex child otherwise won't shrink below its content's intrinsic width even when
capped above it — `max-width` alone would not have fixed this. The truncation styles keep the
closed-state text legible if a label is still wider than the available space, rather than leaving it
silently clipped.

**Verified live** via `getBoundingClientRect()` on Ramesh Yadav's Q1 (the same long bilingual label
Round 34's screenshot showed overflowing): the select's right edge measured 1189px against its card's
1223px right edge and a 1280px viewport — contained with margin to spare, at the default window
width. This also affects the language `<select>` in the same row (short options, "English"/"Hindi")
— no visible change there, since it was never near its `max-width` anyway.

## Verification summary

- `npx tsc --noEmit -p tsconfig.json`: clean, after all three fixes.
- Dev server (`nohup npm run dev:agent`, port 4001) running throughout; regression-walked the full
  farmer-tree flow three times end-to-end (STEP_UP, BLOCK, HUMAN_REVIEW) with no console errors from
  this round's own edits — the `useAgent must be used within AgentProvider` messages seen during
  testing are confirmed stale, carried over from an earlier point in this environment's session
  history (cross-checked against `/tmp/jayant-vkyc-agent-dev.log`'s clean HMR reloads after this
  round's edits landed), not a live regression.
- Not independently re-verified: PROCEED band's live rendering (see Item 1 above — confirmed by
  reading the unchanged ternary structure instead, after a session reset interrupted the fourth
  walkthrough); this sandbox's mic-blocked constraint meant every verification here used the
  "Manually choose bucket" simulate path rather than real speech, consistent with every STT-dependent
  round in this engagement.

## Explicit non-changes, confirmed

No change to any tree logic, classifier behaviour, scoring math, or verdict logic. No change to
persona data (`personas.ts`). `ResolutionCard`'s copy, verdict-band logic, and the
`isReview`/`victimFlag`/`hiddenReveal` branches are unchanged — restyle only. No other screen touched.
No other component was found reusing `ResolutionCard`'s old classes in a way that would have broken
from this restyle.
