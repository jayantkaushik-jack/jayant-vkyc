# Round 29 — Remove "Customer Still Connected" Confirmation Dialog — Resolution (Code)

Built exactly as specced — a straightforward UI simplification, no logic changes.

## What changed

`apps/agent/src/features/agent/call/amber/AmberPanel.tsx`, `ResolutionCard`:
- Removed the `showEndConfirm` state and the entire `<Modal>` block ("Customer still connected"
  title, body text, Back/End Session footer).
- "End Session" button's `onClick` changed from `() => setShowEndConfirm(true)` directly to
  `onContinue` — the same prop that was previously only reachable from inside the removed modal.
  One click, same destination.
- Removed the now-unused `PhoneOff` icon import and `Modal` component import — both were only
  referenced inside the removed dialog, confirmed by grep before deleting.

No change to `finalizeAmberCase`, `onContinue`'s wiring in `StepWorkspace.tsx`, or any verdict/scoring
logic — this button already called `onContinue` (just one click removed from it, not a new
destination), matching the handoff's own confirmation that `finalizeAmberCase` is a pure client-side
state transition with no hangup logic to skip.

Applies uniformly to every band: `ResolutionCard` has no band-conditional branching anywhere near
this button (the `bandColor`/`band` logic above it is display-only), so there was no way to remove
the dialog for BLOCK without also removing it for STEP_UP/PROCEED/HUMAN_REVIEW — one shared component,
one change, all four bands.

## Testing

- `npx tsc --noEmit -p tsconfig.json`: clean.
- Grepped for `showEndConfirm` and `"Customer still connected"` after the edit: zero matches — no
  residual dead state or unreachable JSX left behind.
- Live in the browser, full call walkthrough (Dilip Chaudhary, farmer tree, via "Manually choose
  bucket" since this sandbox's mic is blocked) through to a resolved **BLOCK** verdict: clicked "End
  Session" once — went straight to the Case Summary screen ("KYC Rejected" / "RED — Hard Stop"), no
  intermediate dialog, no second click. No console errors.
- Didn't separately re-run the identical click through STEP_UP/PROCEED/HUMAN_REVIEW live, since the
  change touches no band-specific code path — confirmed this directly by reading `ResolutionCard` in
  full before and after the edit, not assumed.
