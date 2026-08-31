# Cursor Prompt — Agent Dashboard: Change Request v4 (Regression Fixes + Polish)

## ⚠️ Working protocol — read first

The last round of changes broke previously working behavior. This round you must work differently:

1. **Read before you edit.** Open and fully read every file you touch, and trace how its props/state are wired from the parent, before changing a line
2. **Minimal diffs.** Fix exactly what each item asks. No refactors, no renames, no "while I'm here" cleanups, no dependency changes
3. **One item at a time.** Implement, then mentally re-run the full call flow before moving to the next item
4. **Do not regress the working flow.** After all items, verify the end-to-end path: Login → Home → Go Online → device check → waiting → incoming call → Accept → pre-call checks → Liveliness → Location → Capture Face → Check Aadhaar → Check PAN → Capture Sign → Report → Approve (with new modal) → post-call screen → Next Call → waiting. Every screen must render with correct data and no console errors
5. If an instruction conflicts with something existing, prefer the instruction here but flag the conflict in a code comment `// NOTE(v4):`

---

## Fixes

### 1. Step data must persist when navigating back
Going back to a completed section currently shows it empty. All step state (liveness answers/results, location remarks, captured face, Aadhaar remarks, PAN image + OCR fields + edits, signature image, per-step remarks) must live in the **call-session state at `CallRoomPage`/`AgentContext` level — not in local `useState` inside step components** that unmounts and loses data. Lift any remaining local state up (or into a `useCallSession` reducer). Revisiting a completed step (via the progress rail) renders it read-only with all previously entered data and captured images visible, plus the step's result chip.

### 2. Progress rail: color the line only up to the current section
The vertical timeline is currently colored past the active step (into the next segment). Rule: segment *above* a completed step = green; segment ending at the **active** step = purple; every segment *below/after the active step* = gray. The colored portion must stop exactly at the active step's icon — never extend to the next step.

### 3. "Breathe in, breathe out" waiting animation
On the queue/waiting screen, animate the breathing circle properly: the ring slowly expands over ~4s while the label reads **"breathe in"**, then contracts over ~4s with the label **"breathe out"**, looping (scale ~1.0 → 1.15 → 1.0, ease-in-out, text cross-fading in sync). Keep "Waiting for next customer…" as a separate static line below.

### 4. Capture Face: blur outside the oval
Same treatment as the PAN box: everything outside the oval is blurred (blurred copy of the video with an oval cut-out mask; sharp video visible only through the oval). Use CSS mask / SVG clipPath — e.g., a blurred full-bleed layer with `mask: radial-gradient/ellipse` cut-out, over the sharp layer clipped to the oval.

### 5. Remove "Does the face match with Aadhaar?" from Capture Face
That prompt (and its score/✓✗) belongs to **Check Aadhaar** only. Capture Face shows just: guide oval, capture action (in the right workspace), captured-face card with Retake. Move the face-match card + prompt into the Aadhaar step (alongside the eKYC table) if it isn't already there, and make sure it feeds the report unchanged.

### 6. Fix: PAN guide rectangle no longer appears
Root cause to check in `CallRoomPage` → `VideoPanel`: `captureMode` is likely no longer set to `'pan'` when the PAN step becomes active (probably lost when capture buttons moved to the workspace in v3). Restore the wiring: **entering the PAN step sets `captureMode='pan'`** (rectangle + outside-blur visible immediately, 1.586:1 box); the workspace `Capture PAN Card` button triggers `VideoPanel`'s capture routine (expose it via ref/callback). Same for `'sign'` on Capture Sign and `'face'` on Capture Face. `captureMode` clears when the captured image is accepted ("Looks Good") or the step changes.

### 7. Fix: PAN and Sign steps show a pre-captured image on entry
In `PanStep.tsx` the render falls back to the demo asset (e.g., `capturedPan ?? DEMO_ASSETS.panCard` and `panImage = capturedPan ?? pendingCapture`) so a captured card appears before the agent captures anything; `CaptureSignStep.tsx` has the same pattern. Fix both: **before capture, show the empty state** (instruction text + Capture/Flip Camera buttons, no image). Demo assets may only appear *inside the on-video guide box simulation* (the card sliding in), never as a pre-filled "captured" result. The captured card renders only after the agent clicks Capture.

### 8. Confirmation modal on Approve
Clicking `Approve` opens a modal: title "Approve this KYC?", summary line (customer name, App ID), text "You are confirming that all verification checks passed. This decision will be recorded and sent for audit review.", optional remarks field, `Cancel` / green `Confirm Approval`. Only on confirm does the existing post-approval flow run. (Reject / Unable to Verify keep their existing reason modals.)

### 9. Post-call screen UX cleanup
Rebuild the layout as a single centered column (`max-w-xl`, everything center-aligned, consistent spacing scale):
1. Status icon (56px) + heading ("KYC Approved") + subtext, centered
2. Summary card: avatar + name + App ID on one row; below it a 2×2 grid — Call Duration, Decision, Sections Completed (7/7), Auditor Assignment — labels `text-text-muted text-xs`, values semibold, **left-aligned within the grid**, consistent row heights
3. The three staggered check items ("Call recording saved ✓ / KYC report generated ✓ / Pushed to bank DMS ✓") as a tidy left-aligned list inside a soft card, equal spacing
4. Buttons row centered: primary `Next Call (10s)`, secondary `View Report`, text link "Back to Home"
Fix all mismatched alignments/margins; spacing multiples of 4px; nothing touching card edges.

---

## Acceptance checklist

1. Complete a call, then from the rail revisit Liveliness / Aadhaar / PAN: all entered data, results, and images are visible read-only
2. Rail line colored exactly up to the active step, gray beyond
3. Waiting screen breathes in/out with synced labels
4. Face oval: sharp inside, blurred outside; no Aadhaar-match prompt on Capture Face (it's on Check Aadhaar and still feeds the report)
5. PAN step entry: rectangle + blur visible, **no** pre-captured image; capture from the workspace button produces the cropped card; same for Sign
6. Approve requires modal confirmation; post-call screen is cleanly aligned per the spec
7. Full regression pass (protocol step 4) with zero console errors; `npm run build` clean
