# Cursor Prompt — SoW Compliance Gaps (Geo-fence Rejection, Chat Menu, Service Hours)

> Three gaps between the codebase and the signed-off SoW, found by audit. Read files before editing; minimal diffs. Note: the threshold-gating modal's current behavior (Review step / Unable to Verify / Reject, approval blocked) is CORRECT — do not change it.

---

## 1. Geo-fence: replace 'flagged' with reject-at-gate (shared + customer + agent)

**Current state:** `packages/shared/src/lib/geoFence.ts` still returns a third outcome `'flagged'` (both checks failed → customer proceeds with a flag). **SoW behavior:** both checks failed → the customer is **rejected pre-call** and never reaches an agent.

- `geoFence.ts`: outcomes become `'radius_pass' | 'pin_pass' | 'rejected'` (rename/replace `'flagged'`); update the JSDoc
- **Customer app**: on `'rejected'`, route to a full-screen failure — "Please initiate the call from your registered address area" — with retry guidance (retriable from the correct location within the validity window); journey does not proceed; fire the `CUSTOMER_RESTRICTED` event chip. Landing result chip for passes: "Location verified ✓ (2.1 km from registered address)" or "Location verified ✓ (PIN region match)". Demo panel: the third simulate button becomes "rejected" (was "flagged")
- **Agent app**: remove all flagged-session remnants (amber banner on location panel / pre-call card, any `flagged` conditionals). The location panel and step 3 show the **passing basis** ("Geo-fence: passed — 3.2 km within radius" / "passed — PIN region match") plus distances
- Sweep: `grep -ri "flagged" packages/shared apps/customer apps/agent` — remaining hits must only be legitimate uses (e.g., "flagged Latest Session" in data docs), none geo-fence-related

## 2. Remove chat from the agent ⋮ menu

The call-room menu's panel union still includes `'chat'`. Per the ruling: chat opens **only** via its dedicated icon in the call controls. Remove the chat entry from the ⋮ menu (menu item + `'chat'` from the `MenuPanel` type if the panel now opens exclusively from the icon path); the ⋮ menu contains exactly **Mark Status** and **View customer location**. Chat functionality itself unchanged.

## 3. Service hours (shared config + admin + customer)

Missing entirely. Implement per the SoW:

- **Shared config**: `serviceHours` in the shared platform config — `{ weekday: { start: '08:00', end: '23:00' }, weekend_holiday: { start: '10:00', end: '19:00' }, excludeNationalHolidays: true }`
- **Admin → Configuration**: a "Service Hours" card (place near Verification Thresholds): editable time ranges for Weekdays and Weekends/Bank holidays + the national-holidays exclusion toggle; save toast; ⓘ explaining enforcement ("outside these hours customers see service timings and can book a slot")
- **Customer app**:
  - The landing "Please note" block's service-hours line renders **from this config** (no hardcoded hours; verify the line exists — add if missing)
  - An **outside-hours state**: when the (virtual demo) clock is outside configured hours, the journey shows a "Service currently closed" screen after the landing page — service timings, next opening time, and a **Book a slot** CTA (slot picker for the next working window, confirmation toast; booked slot shows in the admin Scheduled queue if trivial to wire, else a session-local confirmation)
  - Demo panel: "Simulate outside service hours" toggle
- **Agent/admin displays**: no enforcement needed beyond config + customer behavior (routing hours are cosmetic in the demo)

## Acceptance

1. Geo-fence: three outcomes (radius pass / PIN pass / rejected); rejection screen with retry guidance reachable via demo panel; no geo-fence 'flagged' code or UI remains anywhere; agent location panel shows passing basis
2. Agent ⋮ menu: exactly Mark Status + View customer location; chat via its icon only; threshold modal untouched (Review / Unable / Reject)
3. Admin Service Hours card edits persist in session and drive both the landing hours line and the outside-hours screen; outside-hours simulation shows timings + slot booking
4. All five apps build clean; agent/customer happy paths regress clean
