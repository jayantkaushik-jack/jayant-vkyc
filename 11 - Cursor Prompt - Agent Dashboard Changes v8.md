# Cursor Prompt — Agent Dashboard: Change Request v8 (Guide Overlay Rebuild + Step Navigation)

> Four fixes. Read files fully before editing; minimal diffs except item 1, which is a deliberate small rebuild of one component because CSS-patching it has failed across three rounds. Full call-flow regression pass at the end.

---

## 1. Double oval / double rectangle — rebuild the guide overlay as ONE component with ONE geometry source

Still broken after v6: the face oval shows twice (dashed oval + a differently-sized blur boundary), and PAN/sign now show double rectangles. The pattern-level cause: the blur-mask geometry (%-based gradient/mask math) and the border div (flex-centered, `width%` + CSS `aspect-ratio`) are computed by **two different layout systems** that will never agree at all container sizes.

**Rebuild:** create `src/features/agent/call/CaptureGuideOverlay.tsx` — the *only* place a guide shape is ever rendered:

- Props: `{ mode: 'face' | 'pan' | 'sign', showAsset?: ReactNode }`
- Measure the video container in **pixels** with a `ResizeObserver`. From `getGuideBoxStyle(mode)` compute one rect: `width = widthPct * containerW`, `height = width / aspect` (for face, height per the oval spec), `left/top` centered. All geometry below uses **exactly this px rect**
- **Blur layer:** `absolute inset-0 backdrop-blur-md bg-black/40` with `maskImage`/`WebkitMaskImage` set to an inline SVG data-URI generated from the px rect: full white rect + black cut-out (`<ellipse>` for face with `cx/cy/rx/ry` from the rect; `<rect rx="12">` for pan/sign matching the border radius). Regenerate the data-URI on resize
- **Border:** one absolutely-positioned div at `left/top/width/height` of the same px rect — dashed white, `rounded-[50%]` for face / `rounded-xl` for pan/sign. Because border and mask come from the same numbers, they coincide by construction
- `showAsset` (the sliding demo PAN/sign image) renders inside the rect, above the sharp window
- **Delete** all existing guide/mask/border code in `VideoPanel.tsx` (`faceOutsideBlurMask`, the boxShadow remnants, both branch renders) and mount `<CaptureGuideOverlay mode={captureMode}>` instead. `captureVideoFrame`/`cropImageToGuide` must consume the same px-rect function so captures match the visible window exactly
- Acceptance: at any window size, exactly one dashed shape whose edge *is* the sharp/blur boundary — face, PAN, and sign

## 2. Match column shows "-" when both values exist and are equal

Example: `MOBILE NUMBER | +91 7728794464 | +91 7728794464 | -`. The match values are hardcoded from the reference layout (where the Aadhaar/PAN side was empty). Replace hardcoded match values with a computed rule in both the **Check Aadhaar** and **Check PAN** tables (and the report's Customer Details table):

- Either side missing/`-`/null → `—` (gray)
- Both present, exactly equal (normalize whitespace/case) → `Yes` (green)
- Both present, name-like fields with minor differences → keep the reference-style percentage chip (e.g., `93.52%`, amber if <95, green if ≥95); compute a simple similarity or keep the seeded per-field score, but **only when values actually differ**
- Never show `—` when both columns have values

## 3. Agent can go back and change previous inputs

Revisited completed steps are currently read-only. Make them editable:

- Remove the read-only rendering for revisited steps; render the normal interactive step UI pre-filled with existing session data (answers marked, captures shown, remarks filled)
- Agent can: re-mark liveness answers (after re-asking via `Ask Question`), Retake face/PAN/sign (guide overlay + capture pipeline must work in review mode — `getCaptureMode` currently returns `null` when `reviewMode` is true; allow it when the reviewed step has a pending retake), edit PAN OCR fields, edit remarks
- Any change writes to the session state immediately and recomputes the step's passed/failed status and the report content
- The step footer in review mode reads **`Save & Return to Current Step`** instead of `Next` (returns per item 4); if the agent changed nothing, it's just `Return to Current Step`

## 4. Fix: can't return to the live step after going back

**Verified root cause** in `CallFlowContext.tsx`: `goToStep(index)` sets `reviewMode=true` and `setActiveStep(index)`, but nothing remembers which step was live, and `ProgressRail` only makes `passed`/`failed` steps clickable — the live step (status `active`) isn't clickable and no other return path exists.

**Fix:**
- Add `liveStep: number` state (the furthest not-yet-completed step). `completeStep` updates it; `goToStep` never touches it
- Add `returnToLive()`: sets `activeStep = liveStep`, `reviewMode = false`
- `ProgressRail`: the live step (and any step at all when in review mode? no — just the live step) is always clickable while in review mode; clicking it calls `returnToLive()`. Also show a slim banner at the top of the workspace whenever `reviewMode` is true: "Viewing a completed step — [Return to current step]" wired to `returnToLive()`
- The item-3 footer button calls `returnToLive()` too
- Guard: `completeStep` must never fire from a review visit (the footer never advances the flow from review mode)

---

## Acceptance checklist

1. Face/PAN/sign each show exactly one dashed guide shape; its edge is precisely the blur boundary; resize the window — still one shape; captured images match the sharp window
2. Aadhaar & PAN tables: equal values → `Yes`; no `—` anywhere both sides have data; missing side → `—`
3. From the PAN step, go back to Liveliness, change an answer to Wrong → step turns failed in the rail and the report reflects it; retake the face from review → new image flows to Aadhaar face-match and the report
4. From any revisited step: rail click on the live step, the banner link, and the footer button all return to the exact step you left; the flow continues normally to completion
5. Two consecutive calls: all state resets; full regression pass; `npm run build` clean
