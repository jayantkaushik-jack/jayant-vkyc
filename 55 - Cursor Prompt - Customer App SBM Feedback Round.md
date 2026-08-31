# Cursor Prompt — Customer App: SBM Ops Feedback Round

> Changes to `apps/customer` from SBM ops review. Read files before editing; shared additions (geo-fence config, thresholds) go in `@vkyc/shared` as specified — the agent/admin prompts of this round consume them.

---

## 1. Live location capture on the landing page (mandatory)

- On the landing screen, after the instructions block: a **"Verify your location"** step (button → browser geolocation prompt). The journey cannot proceed to consent without a captured location (mandatory fail-safe). Denied geolocation → guidance screen (enable location, retry)
- **Geo-fence check** (new shared util `checkGeoFence(liveLatLng, addresses, config)` in `@vkyc/shared`):
  1. Pass if the live location is within **50 km** (configurable radius) of the current OR permanent address coordinates
  2. Else, reverse-geocode the live location to a PIN code (mock/deterministic in demo) and pass if its **first 3 digits** match either address PIN's first 3 digits
  3. Else **reject at the gate** — full-screen failure ("Please initiate the call from your registered address area"); the customer may retry from the correct location within the validity window; journey does not proceed
- Result chip on the landing screen after a passing capture: "Location verified ✓ (2.1 km from registered address)" or "Location verified ✓ (PIN region match)"
- Demo panel: buttons to simulate within-radius / PIN-prefix-match / rejected

## 2. Device quality checks (extend the pre-call checklist)

Extend the pre-call checks sequence with two quality checks (simulated scoring; real capture where permission exists):

- **Camera quality**: with the live stream — resolution/fps from track settings, plus brightness (mean luminance of sampled frames) and sharpness (Laplacian variance); fail states show specific guidance ("Move to a brighter spot", "Clean your camera lens") with re-test
- **Microphone check**: "Say 'hello' to test your microphone" — 2s sample, RMS level check; fail → guidance + re-test
- Both appear as items in the existing checklist UI with pass/fail ticks; demo panel can force each failure

## 3. 72-hour hard threshold (71h50m rule)

At journey entry AND at queue entry: if elapsed time since Aadhaar authentication/weblink generation exceeds **71h 50m**, the link is treated as expired — show the eKYC-expired failure screen ("Your Aadhaar verification window has lapsed; please restart Aadhaar verification from your application") and block progress. The 10-minute buffer prevents a call from landing that would cross 72h mid-call. Demo panel: "simulate near-expiry" sets elapsed to 71h55m.

## 4. No customer mute control (verify)

Verify the in-call screen exposes **no mute/unmute or camera-off control to the customer** (per SBM requirement, the customer cannot mute during VKYC). Remove if present; only the bank side controls the session.

## 5. In-call chat (customer side)

Add a chat affordance in the in-call screen: a small chat button opening a message panel over the video (keyboard-safe on mobile); scripted agent messages in the simulation (e.g., agent sends "Please hold your PAN closer" during PAN step); customer can type replies (logged to the activity strip). Visually marked "Phase 2 preview" via a subtle tag in the demo build.

## Acceptance

1. Landing requires location capture; all three geo-fence outcomes reachable (radius pass, PIN-prefix pass, rejected-at-gate with retry guidance)
2. Pre-call checklist includes camera + mic quality with working fail/retry paths
3. At 71h55m elapsed the journey blocks with the lapse screen; below the threshold it proceeds
4. No customer mute/camera control anywhere in-call
5. Chat opens, scripted messages appear at the right step, replies log; "Phase 2 preview" tag visible
6. All apps build clean
