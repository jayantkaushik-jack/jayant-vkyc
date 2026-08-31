# Handoff 29 — Remove the "Customer still connected" confirmation dialog on End Session

**Status:** locked, ready to build. UX change requested by Jack after reviewing a live call
recording, applies to every verdict path, not one specific case.

## 1. What's there today

Once any Amber case resolves to a verdict (BLOCK, STEP_UP, or PROCEED — this is the shared
`ResolutionCard` component in `AmberPanel.tsx`, used for all bands, not just Red), the agent sees an
"End Session" button. Clicking it does not end the session — it opens a second modal, titled
"Customer still connected," asking "The customer is still connected. Are you sure you want to end
the customer session?" with a "Back" / "End Session" choice. Only clicking "End Session" a second
time inside that modal actually calls `onContinue` (wired to `flow.finalizeAmberCase` in
`StepWorkspace.tsx`), which is what actually ends the case and moves to the Case Summary screen.

So today it's a two-click flow to reach the Case Summary from any resolved verdict: click "End
Session" on the resolution card → confirm "End Session" again inside the "Customer still connected"
modal → Case Summary appears.

## 2. What to change

**Remove the "Customer still connected" modal entirely, for every verdict band.** Clicking "End
Session" on the resolution card should go straight to ending the session and transitioning to the
Case Summary — no intermediate confirmation step, no second click, regardless of whether the
resolved band is BLOCK, STEP_UP, HUMAN_REVIEW, or PROCEED. This is not scoped to Red/BLOCK only —
apply it uniformly to the one shared `ResolutionCard` component, since all bands render through it.

## 3. Where this lives

`apps/agent/src/features/agent/call/amber/AmberPanel.tsx`, inside the `ResolutionCard` component
(~line 1270-1300):

- Remove the `showEndConfirm` state and the `<Modal>` block that renders the "Customer still
  connected" dialog (title, body text, Back/End Session footer).
- Change the "End Session" button's `onClick` from `() => setShowEndConfirm(true)` directly to
  `onContinue` (the prop already passed into `ResolutionCard`, currently only invoked from inside
  the modal). One click, same destination, no intermediate step.
- No change needed to `finalizeAmberCase` in `CallFlowContext.tsx` or to `onContinue`'s wiring in
  `StepWorkspace.tsx` — confirmed by reading `finalizeAmberCase`: it's a pure client-side state
  transition (marks the case resolved, submits the mapped decision) with no actual call-hangup logic
  of its own, so removing the confirmation in front of it doesn't skip any real technical safety
  check — it only removes a UX confirmation step.

## 4. Why this was requested

Jack reviewed a live call recording (screenshots) and found this two-step confirmation adds an
extra click and an extra screen between the verdict resolving and the Case Summary appearing, for
every case — not something that needs to exist for BLOCK specifically vs. STEP_UP specifically,
since both currently show the identical dialog. The requested experience: whichever band the case
resolves to, clicking "End Session" once should smoothly transition straight to the Case Summary.

## 5. Explicit non-changes

- No change to the Case Summary / `PostCallConfirmation` screen itself, or to how it's triggered
  (`flow.showConfirmation && flow.decision`, per the existing code — still fires automatically once
  `finalizeAmberCase` runs, exactly as today).
- No change to `finalizeAmberCase`'s decision-mapping logic (BLOCK→rejected, HUMAN_REVIEW→unable,
  else→approved).
- No change to the non-Amber call-ending flow (`endCall`/`endCallWithReasons` in
  `CallFlowContext.tsx`, used for incomplete/non-Amber call terminations) — this handoff is scoped
  to the Amber-resolution "End Session" button and its confirmation modal specifically.
- No change to any verdict logic, reasons text, or scoring — purely a UI simplification removing one
  confirmation step.

## 6. Regression check to run after implementing

Confirm all Amber-resolvable outcomes (PROCEED/green, STEP_UP/amber — all its sub-reasons, BLOCK/red,
HUMAN_REVIEW) still transition cleanly to Case Summary with a single "End Session" click, and that
no residual reference to the removed modal/state remains (unused import of the confirmation icon,
dead `showEndConfirm` state, etc.).
