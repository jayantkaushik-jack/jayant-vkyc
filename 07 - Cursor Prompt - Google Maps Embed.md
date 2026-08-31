# Cursor Prompt — Location Step: Embed Google Maps

> Single, scoped change to the existing repo (`Agent_Admin_Dashboard_Implementation`). Touch only the map rendering in the Location step. No refactors, no other files, no dependency changes. Do not alter the lat/long caption row, the Location Details grid, the SAFE IP banner, the remarks input, or the Next button.

---

## Change

In `src/features/agent/call/steps/LocationStep.tsx`, replace the current static map (SVG/image) with a real embedded Google Map, keeping the exact same slot, size, and rounded-card styling.

### 1. Map component

Create `src/components/ui/MapEmbed.tsx`:

```tsx
interface MapEmbedProps {
  lat: number;
  lng: number;
  zoom?: number;   // default 16
  className?: string;
}
```

- Render an `<iframe>` using Google's keyless embed endpoint:
  `https://maps.google.com/maps?q={lat},{lng}&z={zoom}&output=embed`
- Attributes: `loading="lazy"`, `referrerPolicy="no-referrer-when-downgrade"`, `title="Customer location map"`, no border, full width, fixed height from the parent (default `h-[220px]`), `rounded-lg overflow-hidden`
- Comment in code: `// NOTE: keyless embed endpoint — fine for demo, use Maps Embed API + key for production`

### 2. Offline / load-failure fallback

The demo must not show a gray broken box if there's no internet:

- Render the iframe inside a wrapper that also contains the existing static map graphic absolutely positioned **behind** the iframe (`z-0` static, `z-10` iframe). If the iframe fails to load or is blocked, the static map remains visible
- Additionally, listen for `navigator.onLine === false` at mount: skip the iframe entirely and show the static fallback with a small gray chip "Offline — static map"

### 3. Wire it into the Location step

- Use the customer's mock coordinates (the SBM Lower Parel default: `19.0018, 72.8285`, zoom 16)
- The pin location must match the values shown in the caption row (Latitude / Longitude / Plus code) and the Location Details grid — single source in the session/mock data, no hardcoded duplicates
- The map keeps its position above the caption row; card padding/margins unchanged

### 4. Report reuse (only if trivial)

If the KYC Report's Location Check section (`KycReport.tsx`) currently shows the same static map graphic, swap it for `<MapEmbed>` with the same coordinates and fallback. If it shows no map, change nothing there.

## Acceptance checklist

1. Location step shows a live, pannable Google Map centered on SBM Lower Parel with the red pin, inside the same rounded card and dimensions as before
2. Caption row and Location Details values are unchanged and consistent with the map pin
3. With network blocked (DevTools offline), the step still renders cleanly with the static fallback — no broken iframe box, no console errors
4. Nothing else on the Location step or in the call flow changed; `npm run build` clean
