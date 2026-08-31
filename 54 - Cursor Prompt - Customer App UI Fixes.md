# Cursor Prompt — Customer App: Capture Guides, Stepper Arrows, SMT Return Screen

> Three fixes in `apps/customer`. Minimal diffs; no other apps touched.

---

## 1. Capture guides: size and position

The face oval and the PAN/signature rectangles render too small and sit near the bottom of the screen. Fix the guide geometry (single source, shared by the overlay, any capture animation, and the crop math if captures are taken):

- **Width = 80% of the video container's width**, for all three guides
- **Centered both horizontally and vertically** in the video area (not the full screen — the video panel), independent of caption/CTA placement
- Heights from shape: oval ≈ width ÷ 0.75 (portrait face oval, capped at 70% of container height — scale width down proportionally if the cap binds); PAN rectangle at credit-card ratio 1.586:1 (landscape); signature rectangle same footprint as PAN
- Captions ("Hold your PAN card inside the frame") move to a fixed band **below the centered guide**, never overlapping it; the blur/dim mask outside the guide must recompute from the same geometry so the sharp window matches the visible guide exactly at all viewport sizes (test at 390×844 and in the desktop phone frame)

## 2. Progress stepper: connect the steps

The top tags (Liveness · Location · Face · Aadhaar · PAN · Signature) read as disconnected chips. Insert a **small chevron/arrow (→)** between consecutive steps — muted gray by default, colored (primary) when the step *before* it is complete — so the row reads unambiguously as a left-to-right progression. Keep the existing states (done = green tick, active = highlighted, pending = muted). On narrow widths the row may scroll horizontally with the active step auto-centered; arrows stay attached between items.

## 3. Final screen: sample SMT screen instead of "Redirecting to Paisabazaar"

Replace the `PartnerReturnScreen` ("Returning you to Paisabazaar…") with a **sample SMT application-status screen** — a mock of the SBM onboarding platform the customer actually lands back on:

- Distinct visual context so it clearly reads as a different system: neutral banking-portal styling (not the Cashfree journey chrome), header "SBM Bank — Application Status" with a generic bank-mark placeholder (no incumbent branding)
- Content: application reference (App ID) + product name (from the token's mock application); a vertical status tracker — `Application details ✓ → KYC documents ✓ → Video KYC — Submitted, under review (24–48 hrs) → Card issuance — pending`; a note "You will be notified by SMS and email once verification completes"
- Small caption at the bottom: "Sample screen — SMT application journey (illustrative)" so reviewers know it's a mock of SBM's side, not our scope
- The completion screen's auto-redirect countdown now leads here; keep a subtle "Restart demo journey" link on this screen for demo looping

## Acceptance

1. All three guides render centered at 80% container width on a 390-wide viewport and in the desktop phone frame; sharp window == visible guide; captions below, never overlapping
2. Stepper shows arrows between all steps with correct state coloring; active step visible on narrow screens
3. Journey ends on the sample SMT status screen with the tracker and the illustrative caption; restart link loops the demo
4. `npm run build` clean
