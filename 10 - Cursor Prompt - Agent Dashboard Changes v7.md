# Cursor Prompt — Agent Dashboard: Change Request v7 (Two Small Fixes)

> Two surgical fixes. Read before editing, minimal diffs, no refactors. Root causes verified in code.

---

## 1. Liveness code overlay must appear only after "Ask Question" on the code question

**Current behavior:** the on-video code overlay shows as soon as the liveness step opens. **Root cause:** `src/features/agent/CallRoomPage.tsx` line ~123 gates it only on the active step: `livenessCode={flow.getActiveStepId() === 'liveliness' ? flow.livenessCode : undefined}`.

**Fix:** gate it on the *third question's asked state* as well. `CallFlowContext` already tracks per-question `asked` state (set by the `Ask Question` button — v3 change 6); expose it (e.g., `flow.isQuestionAsked('code')` or read from the questions array) and change the condition to: active step is liveliness **AND** the read-the-code question has been asked **AND** it hasn't been answered/marked yet (hide the overlay again once the question is marked Correct/Wrong). The overlay content must remain the same single-source code from `flow.livenessCode`.

Note: the reference behavior is that the code appears on the customer's screen only when the agent asks that question — this is what we're replicating.

**Also verify (from v6 item 1):** the code is 6 digits everywhere — question text, overlay, and answer chip. The user still sees 4 digits, so if the v6 fix isn't in this branch, apply it now: 6-digit code (`100000–999999`) generated once in `CallFlowContext`, consumed everywhere from that single source.

## 2. Break time must start at 0 — no seeded default

**Root cause:** `src/features/agent/AgentContext.tsx` line ~54: `const SEED_BREAK_SEC = 32 * 60;` seeded into `useState(SEED_BREAK_SEC)` for `accumulatedBreakSec`.

**Fix:** initialize `accumulatedBreakSec` to `0` and delete the `SEED_BREAK_SEC` constant. Break time accrues only from actual On-Break usage in the session. Check for any other seeded session values that misrepresent the live session (e.g., if `loginAt` is back-dated to 9:00 AM, today's "Logged in" counter and the offline session summary will show hours the agent never spent **this session** — set `loginAt` to the actual login time; historical/attendance mock data for past days stays as is). The header break counter, the On-Break screen timer, and the Offline session summary must all read 0m break at the start of a fresh session.

---

## Acceptance checklist

1. Enter Check Liveliness: no code overlay. Ask Q1, Q2: still none. Click `Ask Question` on the read-the-code question → 6-digit overlay appears on the video; mark it Correct → overlay disappears. Code matches the question's answer chip (6 digits)
2. Fresh login → header shows `Break: 0m`; go on break for ~1 min → header/On-Break timer show ~1m; go offline → session summary shows the same ~1m break and the real online-at time
3. No other behavior changed; `npm run build` clean
