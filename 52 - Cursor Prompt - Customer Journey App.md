# Cursor Prompt — Customer VKYC Journey (new app: `apps/customer`)

> Fifth monorepo app: the **customer-facing VKYC journey**, replicating the incumbent's end-user flow in Cashfree branding. Mobile-web-first. Consumes `@vkyc/shared` (theme preset, logo, ui components, data). Self-contained demo: the "agent side" is simulated — no cross-app connection. Follow the screen sequence exactly; it mirrors the SoW §5.1 and the reference customer recording.

---

## Scaffold & presentation

- `apps/customer`: standard app setup (Tailwind preset, aliases, `vercel.json` SPA rewrite, favicon/logo). Vercel project `vkyc-customer-journey`, Root Directory `apps/customer` (README note)
- **Mobile-first** (design at 390px). On desktop viewports, render the journey inside a centered phone frame (rounded bezel, ~390×844) on a soft background — so laptop demos still read as the mobile experience
- **Branding — explicit requirement**: the entire journey renders in the **Cashfree design system** (the shared Tailwind theme preset: purple primary, light surfaces, Inter) with the Cashfree logo in the header and footer line "Powered by Cashfree Payments". No incumbent styling, colors, or names anywhere. Reference screens inform *content and sequence only*, never visual identity
- Entry route `/journey/:token` (any token) + `/` redirecting to a demo token. Header: minimal — Cashfree logo, "Video KYC"; a slim persistent ribbon under the header: **"Please do not refresh or close the tab"** (as in the reference)
- **Demo control panel**: hidden drawer (triple-tap the logo or `?demo=1`): buttons to trigger each failure state (VPN detected, outside India, negative PIN, eKYC expired, link expired, blacklisted), force reconnection mid-call, and set the recapture-reattempt variant. Marked visually as demo-only

## Screens (exact sequence)

### 1. Landing / Instructions
Title "Instructions" + sub-line "Please read the instructions carefully before getting on a video call with the agent". Product context card (partner co-brand name from the token's mock application, e.g., "SBM Bank Paisabazaar Paisa+ Credit Card") and the **72-hour validity countdown** (live, seeded ~71h remaining).

**Four prerequisite tiles** (icon + title + sub-line, verbatim from the reference):
1. *Good Internet Connectivity* — "Ensure your internet connection is stable"
2. *Stay Document-ready!* — "Keep your original physical PAN Card handy to show during the call"
3. *Find a quiet, well-lit spot* — "Please choose a quiet & well-lit spot for a smooth verification"
4. *Keep a pen and blank paper handy* — "You need to give a live signature during the call"

**"Please note:" block** (all six items, verbatim with the config-marked values):
- The Video KYC process will take 3–5 minutes
- You will be asked security questions during the call
- Please ensure that you are not connected through a Proxy/VPN or any Public IP
- If you are an iOS user, please deactivate your Private Relay before initiating the call — Steps: Settings → iCloud → iCloud+ features → Private Relay
- Video KYC Service operates from **8 am to 11 pm Monday to Friday** & **10 am to 7 pm on Saturdays, Sundays & bank holidays**, excluding national holidays *(render from a config constant — hours are SBM-configurable)*
- It is mandatory for you to initiate the call from your Permanent or Communication address provided earlier

**Language selector** (English/Hindi chips — stored, shown later to the "agent"); recorded-call notice; primary CTA **"Initiate the video KYC call"** (video-camera icon, full-width).

### 2. Terms & Consent
Scrollable T&C block (concise demo copy: recording, data use per RBI V-CIP); checkbox + **Accept & Continue**; decline path → graceful exit screen ("You can return anytime within the validity window"). Acceptance timestamped into a visible mini-log (see Activity strip below).

### 3. Permissions
Rationale card ("We need your camera & microphone for the video call") → browser `getUserMedia` prompt → live self-view preview confirms. **Denied path**: recovery screen with browser-specific instructions + retry. No camera available (laptop demo without permission): fall back to a simulated self-view with a "Simulated camera" chip.

### 4. Pre-call checks
Animated checklist screen (each check ticks in sequence ~500ms apart): Device & browser ✓ · Internet speed ✓ · VPN/Proxy ✓ · Location (geolocate or simulate) ✓ · Aadhaar eKYC validity ✓. **Failure states** (via demo panel or token variant) render dedicated full-screen failure pages with the exact semantics: VPN detected (retry CTA) · outside India / negative state-PIN (terminal) · eKYC expired (regenerate via application journey — terminal here) · link expired (request new link) · blacklisted (contact support). Each shows its reason plainly and fires a visible event chip.

### 5. Waiting / queue
Breathing animation + "Connecting you to a bank official…"; expected wait ("under 2 minutes"); queue position ticking down; then ringing state → connected.

### 6. In-call (the core screen)
- **Customer video full-bleed** (their real camera; fallback simulated), **agent PIP** top-right: looping placeholder or professional-avatar tile with "SBM Verification Officer · <name>" label and a speaking indicator
- **Top progress stepper**: Liveness → Location → Face → Aadhaar → PAN → Signature, ticking green as the scripted agent completes each
- **Scripted agent sequence** (auto-advancing with natural pauses; captions as the agent "speaks"): greeting + language confirmation → consent re-confirmation → liveness questions rendered as caption cards ("What is your occupation?" — customer answers aloud; auto-advance) → **6-digit code overlay** ("Please read the code on your screen") → location check moment ("verifying your location", map-pin animation) → **face capture**: oval guide, countdown 3-2-1, flash, "Face captured ✓" → **PAN capture**: card-shaped guide rectangle (sharp inside, dimmed outside), "Hold your PAN card inside the frame", auto-capture after 2s hold, "PAN card captured successfully ✓" → **signature**: "Sign on the white paper and hold it up", rectangle guide, capture ✓ → closing script ("That completes your video KYC…")
- **Interruption simulation** (demo panel): reconnecting overlay ("Reconnecting… please don't close this window") → resume where left off; a "customer stepped away" variant
- Mute/network indicators; End-call hidden from customer (bank-terminated only) — matching the reference

### 7. Feedback
"How was your experience?" — 5 tappable stars + optional comment + Skip; submit → thank-you microcopy. (Feeds the CSAT story; log the rating in the mini-log.)

### 8. Completion
"Verification submitted ✓ — your KYC is under review; typically 24–48 hours." Application reference (App ID), then auto-redirect countdown to a mock partner return page ("Returning you to Paisabazaar…"). **Reattempt variant** (demo panel): outcome screens for dropped/unable ("Something interrupted your KYC — resume anytime before <deadline>") with a Resume CTA looping to screen 1 with context retained.

## Cross-cutting

- **Activity strip (demo storytelling)**: a small collapsible ribbon (demo-only, hidden by default) listing the customer-side events as they occur — mirrors the Activity Log catalog (clicked link, accepted T&C, permissions granted, waiting, connected, captures) — so demos can show the audit-trail story from the customer side
- All copy SBM-appropriate and concise; no lorem ipsum; Hindi variant for key lines when Hindi is selected (greeting, main CTAs) — cosmetic bilinguality is enough
- Session state resets cleanly on journey restart; two consecutive runs work without reload

## Acceptance

1. Full happy path on a phone-sized viewport: landing (countdown ticking) → consent → permissions (real camera) → checks → queue → simulated call with all six steps, real self-view, code overlay, three guided captures → feedback → completion redirect
2. Every failure state reachable from the demo panel renders its dedicated screen with correct semantics (curable vs terminal)
3. Reconnection simulation resumes mid-call at the right step
4. Desktop shows the phone-frame presentation; camera-denied path falls back with the Simulated chip
5. Language selection reflects in the call (agent greeting caption + chip)
6. All apps build clean; no changes to other apps; shared package untouched except additive needs
