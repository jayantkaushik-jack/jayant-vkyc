# Cursor Prompt — Agent App: SBM Ops Feedback Round

> Changes to `apps/agent` (+ shared) from SBM ops review. Consumes the shared geo-fence util and the thresholds config added in the companion prompts of this round. Read files before editing; minimal diffs outside the listed items.

---

## 1. Live location discovery — anytime

Under the video panel's three-dots (⋮) menu, add **"View customer location"**: opens a panel with the customer's **live lat/long**, reverse-geocoded address, map (existing `MapEmbed`), the geo-fence result (which basis passed: 50 km radius or PIN-prefix — customers failing both never reach the agent), and distances to current/permanent addresses. Available at **any point during the call**, any step; each open is logged to the activity log ("Viewed customer live location").

## 2. Captured image zoom

Every captured/derived image the agent reviews — captured face, Aadhaar photo, PAN card image, PAN photo crop, signature — gets **click-to-zoom**: full-screen lightbox with pinch/scroll zoom (up to ~4×), pan, and close. Applies in the step workspaces AND inside the KYC report (shared `KycReport` — auditors inherit automatically).

## 3. Name Match as percentage

Replace Yes/No name-match displays with **percentage scores** everywhere name matching appears: Aadhaar comparison table (name row), PAN verification table (name row), and the KYC report's customer-details table. Threshold-band the chip (green ≥ threshold, amber within 10 points below, red beyond). Non-name exact-match fields (DOB, gender) stay Yes/No.

## 4. Stage-wise validation gating (threshold enforcement)

Consumes the **thresholds config** (defined in the admin prompt; lives in `@vkyc/shared`): face-match (Aadhaar), face-match (PAN), name-match, liveness pass requirement, geo-fence.

- Every validation percentage renders **green at/above its configured threshold, red below** — in the step workspaces AND the KYC report (two-state coloring, no amber)
- **Approve gating**: on Approve, if ANY validation score is below its threshold → block, and open a modal: "Validation below threshold" — listing each failing check (value vs threshold) — with exactly two actions: **Review step** (jump to it and redo the capture to cure the value where possible) or **Reject with the appropriate reason** (reason screen pre-scoped to the failing check's category). Unable to Verify is NOT offered for threshold failures; the agent cannot approve while any check is below threshold

## 5. Decision available at any time — status-first call termination (rework the ⋮ flow)

The three-dots menu currently only offers "Unable to Verify". Rework:
- Menu item **"Mark Status"** → step 1: choose **Unable to Verify** or **Rejected**; step 2: the corresponding reason screen (existing taxonomy accordions per decision binding) + remarks → confirm **ends the call** with that status. Available at any point, including before the signature step
- The **red End Call button** no longer ends a call as "incomplete": if no status has been marked, it opens the Mark Status flow (with a one-line explainer "select an outcome to end the call"); an agent-initiated end always carries a recorded status. Customer-side disconnections that never resume still auto-close as User Dropped (system behavior, unchanged)
- **Remove the "Facing an issue during the call?" modal entirely** (menu item, component, and its route into ending calls) — its logging purpose is covered by per-step remarks; its termination purpose by Mark Status. Remove dead code and any references
- **Remove the chat entry from the ⋮ menu** — chat opens only via its dedicated icon in the call controls
- The end-of-flow Report step keeps its full decision bar (with gating per item 4)

## 6. Previous attempts: show the COMPLETE call history

Extend the repeat-customer context (data + UI): the pre-call banner and incoming-call card show the **complete history of all previous attempts** — every prior call with date, agent, outcome, and reason (e.g., the specific Unable-to-Verify reason). Compact chronological list (newest first), scrollable within the banner when more than three; count chip ("3rd attempt"). Data generator: seed customers with one, two, and three prior sessions so the list length varies.

## 7. Automatic session closure after signature

- When the signature capture is confirmed, prompt the agent: "All captures complete — end the customer session?" with a prominent warning line: **"Once the call ends, captured data becomes read-only — no retakes or edits will be possible."** Actions: **End customer session** (primary) / "Keep customer connected" (secondary, with reason input)
- If the agent navigates to the Report step with the customer session still live, show a blocking modal: "The customer is still connected. End the customer session before submitting your review." — carrying the same read-only warning → **End session & continue** / back
- After session end, the customer side proceeds to feedback/completion; the agent completes the report and decision

## 8. Post-call data immutability

Once the customer session ends: all captured data becomes **read-only** — captures (no retake), liveness results (no re-marking), PAN OCR fields (no edit), step results frozen. The agent may still add remarks and make the decision. Revisit-and-edit (the earlier editable-review behavior) is only available **while the customer is connected**. Enforce in the session state (a `sessionEnded` flag gates every mutating action), not just by hiding buttons.

## 9. Shuffled liveness questions

The liveness question set is drawn per call as a random selection/order from a larger pool (seeded per call — different calls show different question order/mix; the 6-digit-code question always included). Question text logged as asked.

## 10. Virtual background behind the agent

Consume the admin-configured **SBM virtual background** (companion prompt): the agent's self-tile/PIP renders the configured background image behind the agent (simulated compositing is fine — background image with the agent avatar/webcam oval overlaid). Where no background is configured, current appearance stays.

## 11. In-call chat (agent side — Phase 2 preview)

Chat panel in the call room (toggle in the ⋮ menu or a chat icon): send/receive with the simulated customer (scripted responses); messages logged to the activity log. Tagged "Phase 2 preview".

## Acceptance

1. Location panel opens at any step with live coords + geo-fence result (passing basis shown); opens are logged
2. Every reviewable image zooms (workspace + report); auditor app inherits report zoom without changes
3. Name rows show % colour-coded green/red against the threshold in both tables + report; DOB/gender remain Yes/No
4. With a below-threshold face match seeded: the value shows red, Approve is blocked with the modal listing the failing check; only Review-step and Reject are offered, and Reject lands on the appropriate reason
5. ⋮ → Mark status offers both decisions then the correct reason screens, at any step
6. Repeat customers show their complete prior-attempt history with outcome + reason; 3-attempt seed renders a scrollable list with count chip
7. Signature confirm prompts session end; Report entry is blocked while the customer is connected; after end, all data is read-only except remarks/decision (verify a retake and an OCR edit are impossible)
8. Two consecutive calls show different liveness question order; virtual background renders when configured
9. Chat opens only via its dedicated icon (not in ⋮); works both directions with logging; ⋮ contains Mark Status and View customer location but no issue modal and no chat; End Call with no status routes into Mark Status; all apps build clean
