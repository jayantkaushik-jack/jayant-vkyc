# Cursor Prompt — Post-Call Confirmation Page: Two Small Fixes

> Two surgical fixes in `src/components/call/PostCallConfirmation.tsx` and its parent wiring. Minimal diffs, nothing else.

---

## 1. Freeze the call duration at decision time

The "Call Duration" on the confirmation page keeps ticking because the parent passes the live `timer` value into `callDurationSec`. Fix: capture the duration **once, at the moment the decision is submitted** (`submitDecision` / `endCallIncomplete` in `CallFlowContext` — store `finalDurationSec` in state alongside `decision`), and pass that frozen value to `PostCallConfirmation`. The live call timer must also stop ticking when the confirmation screen shows (clear the interval on decision, or gate the tick on `!showConfirmation`). The value shown = elapsed time from call start until the decision was recorded, static.

## 2. Trim the summary grid

In the summary card (grid at line ~113), remove the **"Sections Completed"** and **"Auditor Assignment"** items entirely. Keep **Call Duration** and **Decision**, side by side in a 2-column row (adjust the grid so spacing stays balanced — no empty cells). Delete any now-unused props (`sectionsCompleted`, auditor fields) from the component interface and its call site.

## Acceptance

1. Approve a call, stay on the confirmation page 20+ seconds: Call Duration doesn't change and equals the time at which the decision was made
2. Summary card shows only avatar/name/App ID row + Call Duration + Decision; layout clean, no gaps
3. `npm run build` clean, no unused-prop warnings; rest of the flow untouched
