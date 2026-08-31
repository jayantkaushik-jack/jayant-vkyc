# Cursor Prompt — Agent: Repeat-Customer Context on the Pre-Call Page

> One feature in the agent app (`apps/agent`). Minimal diffs; data additions in the shared package extend, not change, existing semantics.

---

## Data layer (`@vkyc/shared`)

- Extend the customer/session model with `attemptNumber` and `previousAttempt?: { date, decision, reasonCategory, reason, agentRemarks?, agentName }`
- Seed the incoming-call generator so **~25–30% of incoming customers are on their 2nd attempt**. Their previous attempt is most commonly `Unable to Verify` (occasionally `Call Ended — Incomplete`), with a reason drawn from the existing rejection-reason taxonomy — e.g., Technical Issue → "Poor internet connection", Photo Related → "Low or dim lighting", Customer Related → "Customer has minimized the screen, locked the device, or received an incoming call"
- First-attempt customers have `attemptNumber: 1` and no banner

## Agent UI — pre-call Customer Details step

When `attemptNumber > 1`, show a prominent **amber banner at the top of the Customer Details card** (above the chips row):

- Icon (↻) + bold heading: **"Repeat customer — 2nd attempt"**
- Line 1: `Previous call on 04 Jul 2026 by Suraj Tiwari was marked Unable to Verify`
- Line 2: `Reason: Technical Issue — Poor internet connection`
- Line 3 (only if remarks exist): `Agent remarks: "Video froze twice during liveness check"`
- A small hint line in muted text: "Pay special attention to the previous failure point during this call"
- Banner is informational, not dismissible; it must not push the Proceed button below the fold (compact spacing)

Also add a small `2nd attempt` amber pill on the **incoming-call card** (next to the customer name) so the agent has the context even before accepting.

## Report tie-in

The KYC Report's Additional Details section gains a row: `Attempt: 2 (previous: Unable to Verify — Poor internet connection, 04 Jul 2026)` for repeat customers; `Attempt: 1` otherwise. Admin's View Report shows the same (shared component — automatic).

## Acceptance

1. Across several simulated calls, roughly 1 in 3–4 customers shows the repeat banner with a coherent previous-attempt story (date in the recent past, reason from the real taxonomy, previous agent is a real agent name)
2. First-time customers: no banner, no pill, `Attempt: 1` in the report
3. Incoming-call card shows the amber pill for repeat customers
4. Repeat context appears in the KYC report (agent and admin views)
5. `npm run build` clean for both apps; no other agent-flow changes
