# Cursor Prompt 63 — Auditor: priority case pickup by Application ID / Mobile

Let an auditor pull a **specific** case on demand instead of only working the round-robin-assigned queue. Surface on the auditor app (`apps/auditor/src/features/auditor/pages/PendingCasesPage.tsx` = "My Cases", and `CaseReviewPage.tsx`).

## Behaviour
Keep the existing model intact: cases are still **auto-assigned round-robin** and the auditor's default action is to work their assigned queue ("accept the next assigned case"). **Add** a priority-pickup path on top:

- A **search bar** on the Pending Cases page: search a case by **Application ID** or **Mobile Number**. On a match, show the case with a **"Pick up this case"** action that lets the auditor open and review it even if it isn't (or wasn't) assigned to them — this is the manager-directed override ("her/his manager asks for this specific case").
- Two clear entry points at the top of the page: **"Review next assigned case"** (works the round-robin queue as today) and **"Search a specific case"** (App ID / Mobile).
- Searching returns only cases that are in a reviewable state (In Review / pending audit). If the case is currently assigned to another auditor, show that ("Currently with <auditor>") and allow pickup with a confirmation.

## Guardrails (important — this is an exception to the auto-assignment rule in PRD-00)
- Picking up a case not assigned to you must be **logged with a reason/audit trail** (reallocation event with `source: 'manual-pickup'`, the picking auditor's id, timestamp, and an optional "manager-directed" note). Reuse the existing reallocation/assignment plumbing (`assignment`, `reallocations`, the reassign toast on `PendingCasesPage`).
- On pickup, reassign the case to the current auditor so the existing `CaseReviewPage` guard (`assignment.auditorId !== SEED_AUDITOR.id`) passes cleanly, and the prior assignee sees the standard "reassigned to another auditor" toast.
- Do not remove round-robin auto-assignment; this only adds a targeted pull.

## Acceptance criteria
1. An auditor can either take the next assigned case (unchanged) or search by Application ID / Mobile Number and pick up that specific case.
2. Picking up an unassigned/other-assignee case reassigns it to the current auditor, logs a manual-pickup reallocation with reason + timestamp, and the previous assignee is notified.
3. Search only surfaces reviewable (In Review) cases; a non-matching search shows a clear empty state.
4. No regression to round-robin auto-assignment or the existing My Cases queue.
