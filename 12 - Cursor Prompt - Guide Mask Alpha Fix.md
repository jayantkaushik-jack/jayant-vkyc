# Cursor Prompt — Guide Overlay: Alpha Mask Fix (verified root cause, single-function change)

> One surgical fix in one function. Do not touch anything else — no refactors, no changes to `CaptureGuideOverlay.tsx`, geometry, borders, or capture crops. The defect and the fix below were **verified in a live browser** by reading the mask's alpha channel, so implement exactly this.

---

## Root cause (verified)

`src/lib/captureUtils.ts` → `buildGuideMaskDataUri()` builds the mask SVG as a **white full-size rect + a black cut-out shape**. That is luminance-mask logic. CSS `mask-image` / `-webkit-mask-image` with an image source masks by **alpha**, and both white and black pixels are fully opaque (alpha = 255) — so the mask keeps the blur layer over the *entire* video. Measured alpha of the current mask: center = 255, corner = 255 → full-screen blur, which is the reported bug.

## Fix

Rewrite `buildGuideMaskDataUri` so the cut-out is a genuine **transparent hole** using a single `fill-rule="evenodd"` path (outer rect + inner shape as subpaths, filled white). Measured alpha of this version: center = **0** (sharp), corner = 255 (blurred) — confirmed working.

```ts
export function buildGuideMaskDataUri(
  containerW: number,
  containerH: number,
  rect: PxRect,
  shape: 'face' | 'rect',
): string {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const rx = rect.width / 2;
  const ry = rect.height / 2;

  // Inner subpath drawn as a hole via fill-rule="evenodd"
  const hole =
    shape === 'face'
      ? `M ${cx - rx},${cy} a ${rx},${ry} 0 1,0 ${2 * rx},0 a ${rx},${ry} 0 1,0 ${-2 * rx},0`
      : roundedRectPath(rect, 12);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${containerW}" height="${containerH}">` +
    `<path fill-rule="evenodd" fill="white" d="M0,0 H${containerW} V${containerH} H0 Z ${hole}"/>` +
    `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// Rounded-rect subpath (clockwise) for pan/sign holes
function roundedRectPath(r: PxRect, rad: number): string {
  const x = r.left, y = r.top, w = r.width, h = r.height;
  const rr = Math.min(rad, w / 2, h / 2);
  return (
    `M ${x + rr},${y} H ${x + w - rr} A ${rr},${rr} 0 0 1 ${x + w},${y + rr} ` +
    `V ${y + h - rr} A ${rr},${rr} 0 0 1 ${x + w - rr},${y + h} ` +
    `H ${x + rr} A ${rr},${rr} 0 0 1 ${x},${y + h - rr} ` +
    `V ${y + rr} A ${rr},${rr} 0 0 1 ${x + rr},${y} Z`
  );
}
```

Notes:
- Keep the function signature and call sites unchanged
- `CaptureGuideOverlay` already regenerates the URI on resize and positions the dashed border from the same `PxRect` — that all stays as is
- The `rx="12"` rounding now lives in the path (`rad = 12`), matching the border's `rounded-xl`

## Acceptance

1. Face step: inside the oval sharp and bright, outside blurred + dimmed; the dashed border sits on the boundary; one oval only
2. PAN and Sign steps: same, with the rounded rectangle
3. Resize the window — boundary stays glued to the border on all three
4. Nothing else changed (`git diff` touches only `buildGuideMaskDataUri` + the new helper); `npm run build` clean
