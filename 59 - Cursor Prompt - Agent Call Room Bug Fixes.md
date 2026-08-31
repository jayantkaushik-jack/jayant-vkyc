# Cursor Prompt 59 — Agent Call Room: bug fixes + decouple disconnect from decision

Five fixes in the agent VKYC call room. Fixes 4 and 5 change the call-termination model: **disconnecting the call and submitting the decision are now two separate events.** Read all five before starting — they touch the same files.

Files in play:
- `packages/shared/src/lib/rejectionReasons.ts`
- `apps/agent/src/components/agent-status/IncomingCallCard.tsx`
- `apps/agent/src/features/agent/call/VideoPanel.tsx`
- `apps/agent/src/features/agent/call/CallFlowContext.tsx`
- `apps/agent/src/features/agent/CallRoomPage.tsx`
- `apps/agent/src/features/agent/call/steps/ReportStep.tsx` (verify only — decision buttons already correct)

Be careful: do not break the capture flow (face/PAN/sign), the post-signature "end session" prompt, the threshold gate modal in the Report step, or post-call immutability (captured data read-only after the session ends).

---

## Fix 1 — Remove the bogus "Customer declined consent to recording" reason

There is **no point in the journey where a customer declines consent to recording.** Recording is mandatory: the landing page shows a recorded-call notice and the Consent screen captures V-CIP consent (accept-only; declining just abandons the journey). So an agent can never legitimately mark "declined consent to recording," yet it currently surfaces as seeded prior-attempt history (e.g. *"Call Ended — Incomplete — Customer declined consent to recording"*).

In `packages/shared/src/lib/rejectionReasons.ts`, delete this row from `REJECTION_REASONS`:

```ts
{ id: 'cust-no-consent', label: 'Customer declined consent to recording', shortLabel: 'No recording consent', categoryId: 'customer', category: 'Customer Related', decision: 'unable' },
```

`REJECTION_CATEGORIES` is derived from `REJECTION_REASONS`, so this also removes the reason from the agent's reason picker, the charts, and the seeded `makePreviousAttempt` history — no other edits needed. Grep the repo for `cust-no-consent` afterward to confirm no lingering references.

---

## Fix 2 — Remove the "Next Up…" queue strip on the incoming-call card

In `apps/agent/src/components/agent-status/IncomingCallCard.tsx`, delete the block that renders:

```
Next Up…
1 customer waiting in the queue
```

Remove the whole `<div className="pt-4 border-t border-border"> … </div>` wrapper containing the "Next Up…" label and the "1 customer waiting in the queue" line. Leave the rest of the card (avatar, name, waiting timer, Accept/Reject) unchanged.

---

## Fix 3 — Chat lives in exactly ONE place (a standalone control), never under the ⋮

Chat must be a single standalone control in the call-controls bar (the `MessageSquare` button) and must **not** appear as an item inside the ⋮ (`MoreVertical`) menu. In the current `VideoPanel.tsx` the ⋮ menu should contain no chat item — verify this holds after Fix 4, and ensure there is exactly one chat entry point.

Note: if the running/deployed build still shows chat under the ⋮ **and** as a separate option, that is a stale bundle — redeploy the agent app after these changes so Vercel serves the corrected VideoPanel.

---

## Fix 4 — Red "End Call" becomes confirm-only; keep "Mark as issue" under the ⋮ as the mark-outcome path

Today the ⋮ → **Mark status** flow and the red **End Call** button do the same thing (both end the call with a reason), which is the redundancy. The fix is **not** to delete one — it's to make them do different things. The red End Call becomes a plain disconnect (no reason); the ⋮ item stays as the way to record the outcome + reason and end the call. Because End Call no longer collects a reason, the two are no longer redundant.

**In `VideoPanel.tsx`:**

1. **Keep the ⋮ menu item that marks the outcome — relabel it "Mark as issue".** Retain the `openMarkStatus`/`confirmMarkStatus` handlers, the `markDecision`/`markReasons` state, and both modals (`panel === 'mark-choice'` and `panel === 'mark-reasons'`); keep the `MenuPanel` type as-is. Change the menu button label from "Mark status" to **"Mark as issue"**, and the choice-modal title to **"Mark as issue"**. Behavior is unchanged: pick **Unable to Verify** or **Rejected** → pick the reason(s) + remarks → confirm → `flow.submitDecision(markDecision, markReasons)`, which records the outcome, ends the call, and shows the post-call confirmation. After Fix 3, the ⋮ menu contains exactly two items: **View customer location** and **Mark as issue** (no chat).

2. **Make the red End Call button a plain confirmation** — no reason picker. Replace the current End Call modal (the one containing `RejectionReasonPicker` and `endCallReasons`) with a simple confirm dialog:

   - Title: **"End the call with the customer?"**
   - Body: *"This disconnects the customer. The call recording stops here and the call time is locked. You'll stay on this screen to review the report and submit your decision."*
   - Buttons: **Cancel** / **End Call** (destructive).
   - On confirm → call the new disconnect action from Fix 5 (`flow.endCustomerSession()`), then close the modal. Do **not** collect a reason here and do **not** call `endCallIncomplete`.

   Delete the `endCallReasons` state.

So there are two distinct paths, no longer redundant: **End Call** (red) = disconnect only, then decide in the Report step; **Mark as issue** (⋮) = the quick mid-call path to record a non-approve outcome (Unable / Rejected) + reason and end the call in one step.

---

## Fix 5 — Disconnecting the call and submitting the decision are two separate events

**The core change.** Right now the red End Call routes to `endCallIncomplete`, which sets a decision and immediately throws the agent to the post-call confirmation screen — so the agent can't disconnect and *then* review. Split the two:

- **Disconnect (End Call)** = the event that ends the live customer session and **locks the call duration** (call time is measured to this moment). The agent stays in the call room with the review/report section open.
- **Decision (Approve / Unable / Reject in the Report step)** = a separate event that records the outcome and only then shows the post-call confirmation.

**In `CallFlowContext.tsx`:**

1. `endCustomerSession()` becomes the single disconnect event. It must:
   - set `sessionEnded = true`,
   - **freeze the call duration**: `setFinalDurationSec((prev) => prev ?? Math.floor((Date.now() - callStartedAt) / 1000))`,
   - log `'Customer session ended'` / `'Call disconnected — duration locked'`,
   - **not** set `decision` and **not** set `showConfirmation`.

2. `submitDecision(d, reasons)` (called by the Report step buttons) stays the decision event, but must **not** re-measure the duration if it's already locked — guard it: `setFinalDurationSec((prev) => prev ?? Math.floor((Date.now() - callStartedAt) / 1000))`. It still sets `decision`, stores reasons, and sets `showConfirmation = true`. If for any reason the session wasn't already disconnected, submitting a decision should also disconnect it (keep the existing "if (!sessionEnded) setSessionEnded(true)" behavior) so a decision always implies the call is over.

3. `endCallIncomplete` is no longer used by the End Call button. It (and the `'incomplete'` decision branch) can be left in place for backward-compat but should no longer be wired to any control. Every agent-ended call now resolves to a real decision (approved / unable / rejected) made in the Report step.

4. Add a small action to jump the workspace to the Report step after an early disconnect, e.g. `goToReport()`: sets `activeStep` to the `report` index (6 in `CALL_STEPS`), `reviewMode = false`. Expose it on the context.

**In `CallRoomPage.tsx`:**

- Change the VideoPanel wiring from `onEndCall={(reasons) => flow.endCallIncomplete(reasons)}` (and remove `onIssueEndCall`) to:
  ```tsx
  onEndCall={() => { flow.endCustomerSession(); flow.goToReport(); }}
  ```
- Keep the existing behavior where `showConfirmation && decision` renders `PostCallConfirmation` — that now only triggers after the agent submits a decision in the Report step, which is correct.

**Result of the new flow:**
1. Agent clicks red **End Call** at any step → confirm → customer disconnects, call duration locks, video panel shows "Session ended", agent lands on the **Report** step (now unblocked).
2. Agent reviews the report and clicks **Approve** / **Unable to Verify** / **Reject** (with reason where required) → post-call confirmation appears.
3. The post-signature "end the customer session?" prompt and the "Customer still connected" guard modal already call `endCustomerSession()` — they now also lock the duration, which is correct. Leave them as-is.

The captured-data read-only-after-`sessionEnded` behavior already exists (`readOnly = sessionEnded`) — keep it. So once disconnected, steps are read-only but the decision is still open. Good.

---

## Acceptance criteria

1. No occurrence of "declined consent to recording" anywhere in the app (agent reason picker, prior-attempt history, charts). `grep -r cust-no-consent` returns nothing.
2. The incoming-call card no longer shows "Next Up…" or "1 customer waiting in the queue".
3. Chat appears as exactly one standalone control; it is not an item in the ⋮ menu. The ⋮ menu shows exactly two items: "View customer location" and "Mark as issue".
4. Clicking the red **End Call** shows a plain confirm dialog (no reason picker). Confirming disconnects the customer, freezes the call timer, keeps the agent in the call room, and lands them on the Report step.
5. After disconnecting, the agent can review the report and separately Approve / Unable / Reject; the post-call confirmation appears only after that decision. The call duration shown reflects the disconnect moment, not the decision moment.
6. Face/PAN/sign capture, the threshold gate modal, and post-call immutability all still work.
