# Cursor Prompt — Agent Dashboard: Change Request v6 (Capture Pipeline — Root-Cause Fixes)

> Six fixes. Same protocol as v4/v5: read files fully before editing, minimal diffs, regression pass at the end. **The root causes below were verified by reading the current code — implement these exact fixes.** Items 2 and 6 are repeat complaints; they recur because previous rounds patched symptoms. This round fixes the architecture of the capture state.

---

## 1. Liveness code: text says 6-digit, screen shows 4 digits

Find where the liveness verification code is generated (it currently produces 4 digits, e.g. `8422`). Make it a **6-digit** code (`100000–999999`), generated once per call session in `CallFlowContext`, and consumed from that single source by BOTH: (a) the question card ("Read the 6-digit text seen on your screen") and (b) the on-video code overlay in `VideoPanel` (`livenessCode` prop — check its digit-splitting rendering handles 6 digits cleanly). The customer's "answer" chip must show the same 6 digits.

## 2. Two ovals on face capture — mask boundary ≠ dashed border

**Verified root cause:** in `VideoPanel.tsx` the face branch renders two independently-sized shapes: (a) the blur layer whose oval cut-out comes from `faceOutsideBlurMask(guideStyle)` and (b) a separate centered `div` with `rounded-[50%]` dashed border sized by `widthPct/aspect`. Their geometries don't coincide, so the user sees the dashed oval **and** the clear/blur boundary as a second oval.

**Fix:** make the blur-mask cut-out and the dashed border the *same geometry from one source*. Compute one oval rect (center, width = `widthPct` of container, height from aspect) and use it to generate both the CSS mask (`ellipse at center` with exactly those radii) and the dashed border div (same width/height, absolutely centered). The dashed border must sit exactly on the blur boundary — one visible oval, blurred outside, sharp inside. Test at multiple panel sizes (the mask must use % based geometry, not px constants).

## 3. Flip Camera → dummy button

`Flip Camera` (face, PAN, sign steps) must do nothing when pressed: keep the button rendered and clickable (it's part of the demo story) but make the `onFlip` handler a no-op — remove the mirror/`facingMode` switching added earlier. No visual change on click (no toast either).

## 4 & 5. PAN and signature: inside of the rectangle is also blurred

**Verified root cause:** the non-face branch in `VideoPanel.tsx` renders `<div className="absolute inset-0 backdrop-blur-sm bg-black/40" />` — a full-bleed blur covering the *entire* video including inside the guide box — plus a `boxShadow: 0 0 0 9999px rgba(0,0,0,0.55)` dim on the box itself. Result: everything is blurred; outside is additionally darkened.

**Fix:** apply the same masked-blur approach as the face oval, with a **rectangular** cut-out: the full-bleed blur layer gets a mask that excludes the guide-box rect (same geometry source as the dashed rect border, % based), so inside the box the video is fully sharp and undarkened. Keep a moderate dim on the outside region (fold `bg-black/40` into the masked layer). Remove the `boxShadow` spread hack — the masked layer now handles outside dimming. Demo assets sliding in (`showPanAsset`/`showSignAsset`) render inside the sharp window, above the video, unblurred. Same code path serves PAN and sign (only the aspect differs), so fixing once fixes both — verify both.

## 6. Signature shows as already captured on first entry — THIRD REPORT, fix architecturally

**Verified root cause:** `StepWorkspace.tsx` passes the **same shared `flow.workspaceCapture`** as `pendingCapture` into the Face (line ~81), PAN (~112), and Sign (~134) steps, and `CallFlowContext` keeps it alive across steps — three `useEffect`s (~lines 275–291) all watch this one field. When the PAN flow (or face flow) leaves a value in `workspaceCapture`, the Sign step receives it as its own `pendingCapture` and renders "Captured Signature" immediately. Previous fixes to the step components couldn't help because the leak is in the shared field.

**Fix — remove the shared field entirely:**
- In `CallFlowContext`: replace `workspaceCapture` with three independent fields: `pendingFace`, `pendingPan`, `pendingSign` (all `string | null`, initialized `null`)
- The capture action writes **only** the field for the currently active step (`captureMode` determines which); the three watcher effects become per-field (face effect watches `pendingFace` only, etc.) — no cross-talk possible
- `Looks Good`/confirm moves pending → captured and **nulls the pending field**; `Retake`/`Recapture` nulls it too; advancing to the next step defensively nulls all pending fields (`useEffect` on active step id)
- `StepWorkspace` passes each step its own field: Face gets `pendingFace`, PAN gets `pendingPan`, Sign gets `pendingSign`
- Delete the old `workspaceCapture` state, props, and any references — the build must fail if anything still uses it (that's the point: no silent fallback path can reintroduce this bug)

---

## Acceptance checklist

1. Liveness question, on-video overlay, and answer all show the same 6-digit code
2. Face capture shows exactly one oval (dashed border on the blur boundary), sharp inside / blurred outside; still true after 3× Retake and at different window sizes
3. Flip Camera clicks do nothing, on all three capture steps
4. PAN box: inside fully sharp and bright, outside blurred + dimmed; captured image = sharp box content
5. Signature box: same as PAN
6. Fresh call → arrive at Capture Sign having completed face + PAN: **no signature image** until Capture Signature is clicked. Also verify the reverse: PAN step shows nothing pre-captured after face capture. Repeat across two consecutive calls (state must reset between calls)
7. `grep -r "workspaceCapture" src/` returns nothing; full call-flow regression pass; `npm run build` clean
