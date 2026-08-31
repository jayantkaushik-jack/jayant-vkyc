# Cursor Prompt — Agent Dashboard: Change Request v5 (Capture Geometry + State Fixes)

> Four surgical fixes to the existing repo (`Agent_Admin_Dashboard_Implementation`). Same working protocol as v4: read every file you touch first, minimal diffs, no refactors, full call-flow regression pass at the end. Root causes are identified below — fix those, not symptoms.

---

## 1. PAN guide box renders portrait — must be landscape PAN proportions

**Root cause:** inverted aspect convention. `src/lib/captureUtils.ts` → `getGuideBoxStyle('pan')` returns `aspect: 1 / 1.586` (≈0.63), and `VideoPanel.tsx` feeds it straight into CSS `aspectRatio`, which is **width/height** — so the box renders taller than wide (portrait).

**Fix:** standardize `aspect` as **width/height** everywhere:
- `pan` → `{ widthPct: 0.78, aspect: 1.586 }` (85.6 × 53.98 mm card, breadth > height)
- Update **all** consumers of `aspect` to the same convention — the CSS `aspectRatio` styles in `VideoPanel.tsx` AND the crop math in `captureUtils.ts` (`h = w / aspect` is correct only once aspect is w/h; verify both the guide-box sizing at line ~25 and the canvas crop at line ~88 produce the same landscape region)
- The captured PAN image must come out landscape, matching the on-screen box exactly

## 2. Signature guide box: same dimensions as PAN

`getGuideBoxStyle('sign')` currently returns `aspect: 1/3`. Change it to **exactly the PAN box values** (`widthPct: 0.78, aspect: 1.586`) so PAN and signature use the identical rectangle. The signature crop math follows automatically from fix 1's convention. Update `sign-paper` demo asset presentation inside the box if it now letterboxes oddly (fit within, centered).

## 3. Duplicate ovals on selfie retake

After capturing a selfie and clicking **Retake**, two ovals of different sizes appear stacked. Likely cause: the oval guide is rendered from two places (VideoPanel's `captureMode='face'` guide **plus** a leftover overlay in the step/retake path), or retake re-enters capture mode through a different code path with different dimensions than first entry.

**Fix:**
- The oval guide must have **exactly one** render site: `VideoPanel`'s guide layer. Search for any other oval/ellipse overlay (CaptureFaceStep, retake handler, mask layers from the v4 blur work) and remove duplicates
- `Retake` must reset to *precisely* the first-entry state: clear the pending/captured face image, set `captureMode='face'` through the same path used on step entry, same `getGuideBoxStyle('face')` dimensions
- Verify the outside-oval blur layer (v4 change 4) is part of that single guide render, not a second independent oval

## 4. Pre-captured image still visible on entering Capture PAN / Capture Sign

`PanStep.tsx`'s empty-state logic (`!capturedPan && !pendingCapture`) is now correct, so the leak is upstream — the session state or an auto-capture effect populates `pendingCapture`/`capturedPan`/`capturedSign` before the agent clicks Capture. Trace and fix:

- Check the call-session initialization (v4 lifted state into `CallRoomPage`/`useCallSession`): captured images must initialize to `null`, never to demo assets
- Check `VideoPanel`'s simulation effect (~line 93): the timer that slides the demo asset into the guide box must only set the *visual* flag (`showPanAsset`/`showSignAsset`) — confirm it does not also call `onCapture`/set pending images. The demo asset appearing inside the guide box is video-panel-only; a captured image exists **only after the agent clicks the Capture button**
- Check the read-only revisit path (v4 change 1) isn't marking these steps as having images when the forward journey first arrives
- Apply the identical audit to the Sign step

**Expected on first entry to each capture step:** video shows guide box (+ demo asset sliding in, simulated mode), right workspace shows instruction card + `Capture` / `Flip Camera` buttons, and **no image anywhere** until Capture is clicked.

---

## Acceptance checklist

1. PAN box is landscape 1.586:1 (breadth > height), centered; captured PAN image matches the box region and orientation
2. Signature box is identical in size/shape to the PAN box; captured signature matches it
3. Selfie → Retake shows exactly one oval, same size as the original, with the outside blur intact; repeat retake 3× — still one oval
4. Fresh entry into Capture PAN and Capture Sign shows no captured image; images appear only after clicking Capture; revisiting completed steps still shows their captured images read-only
5. Full call-flow regression pass with zero console errors; `npm run build` clean
