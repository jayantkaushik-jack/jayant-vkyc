# Cursor Prompt — Agent Dashboard: Change Request v3 (Polish + SBM Field Parity)

> Apply to the existing repo (`Agent_Admin_Dashboard_Implementation`). 21 changes. Keep the Cashfree light theme and existing conventions. Section B is a field-parity audit against the SBM reference system — treat it as the source of truth and reconcile every listed screen.

---

## A. Changes

### 1. Logo everywhere, including the browser tab
The favicon still shows the old logo. In `index.html`: point the favicon to the Cashfree logo (`<link rel="icon" type="image/png" href="/cashfree-logo.png">`), set `<title>Cashfree Video KYC</title>`, and remove the stale `vite.svg`/old favicon references. Sweep the app for any other old-logo usage (login page, loading states).

### 2. Remove the "Select role" modal
Delete the post-login role picker. Login → always `/agent`. The admin app is reached directly via its URL (`/admin`) with no role gate for the demo (keep auth guard only, if any). Remove now-dead role state from `AuthContext`.

### 3. Fix the red End Call button
It currently does nothing. Clicking it must open a confirmation modal: "End this call?" — sub-text "The KYC journey is incomplete. This will be recorded as an unfinished call." — optional reason dropdown (reuse the category/sub-reason component from the issue modal) + `Cancel` / red `End Call`. Confirming ends the session and routes to the post-call confirmation screen (with decision shown as "Call Ended — Incomplete"), then follows change 15 (next call).

### 4. Pre-call checks: explicit Yes/No buttons
The `Video Visible` / `Audible` cards currently show an ambiguous "✗" box. Replace each with a card: label + two toggle buttons — `Yes` (green fill when selected) / `No` (red outline when selected). `Proceed` enables only when both are `Yes`. Selecting `No` shows a hint ("Ask the customer to adjust camera/audio, or report an issue").

### 5 & 21. Field parity with the SBM reference — see Section B below. Implement every reconciliation listed there.

### 6 & 7. Liveness questions: "Ask Question" button, no "Ask again"
Each question card gets a primary-outline **`Ask Question`** button. Flow per question: agent clicks `Ask Question` (this is the logging event — timestamp it in the session log and the admin Activity Log data) → the answer chip reveals → ✓ Correct / ✗ Wrong become enabled. Remove the `Ask again` button entirely. A question's result cannot be marked before `Ask Question` is clicked.

### 8. Progress rail fixes
1. The collapse chevron (`>`) must be **right-aligned** in the rail header (flex row, `justify-between`: "Progress" label left, chevron right)
2. Space the step rows out (~20px vertical gap) and connect them with a **continuous vertical progress line** behind the status icons — line segment green for completed steps, purple for the active segment, gray for pending — like a vertical timeline
3. **Location step map default**: the map view (and Location Details) defaults to the SBM Lower Parel office — address: `SBM Bank (India) Ltd., 19th Floor, 95 Urmi Estate, Ganpatrao Kadam Marg, Lower Parel (West), Mumbai – 400013`; coordinates `19.0018, 72.8285`; Area `Lower Parel`, City `Mumbai`, State `Maharashtra`, Pincode `400013`, District `Mumbai City`. Use a static map image/SVG centered there with a pin

### 9. Capture Face page
1. Make the oval face-guide **2× its current size**
2. Move the **Capture** button off the video and into the right-hand step workspace (a proper action card: "Capture Face" primary button)
3. Add a **Flip Camera** secondary button next to it (with a camera-rotate icon; in live-camera mode switch `facingMode`/deviceId when possible, otherwise mirror the feed as a visual stand-in)

### 10. Check Aadhaar page — alignment fixes
1. Column headers `Applicant Form Data` and `Aadhaar Data` are misaligned — rebuild as a proper `<table>` (or CSS grid with fixed column tracks): `Field | Applicant Form Data | Aadhaar Data | Match` so headers sit exactly over their columns
2. All values within a column must be **left-aligned** (including the field-label column)
3. Match chips (e.g., amber `93.8%`) must have a **fixed height** (`h-6`, vertically centered) regardless of row height — tall address rows must not stretch the chip; align chips to the top of the cell (`align-top` + padding)

### 11. Check PAN page — capture UX rework
1. **Move `Capture PAN Card` and `Flip Camera` buttons into the right-hand step workspace** (agent action area). No buttons overlaid on the video
2. The on-video guide rectangle must use **real PAN card proportions — 85.6mm × 53.98mm (aspect ratio 1.586:1)**, landscape, centered
3. **Blur everything outside the rectangle** (`backdrop-filter: blur` on a masked overlay, or two stacked layers: blurred video + sharp clipped window). Inside the rectangle stays sharp
4. Capture must **crop to the rectangle bounds only** — the captured PAN image is exactly the guide-box region (both in live-camera mode via canvas crop and in simulated mode)
5. **Fix: the PAN photo is missing in the "Face Match — PAN Photo" card.** Derive the photo crop from the captured PAN card image (fixed crop region where the photo sits on a PAN card, left-center) and render it next to the live captured face with the match score

### 12. Capture Sign — same rework as PAN
Buttons (`Capture Signature`, `Flip Camera`) in the right-hand workspace; on-video guide rectangle (wider/shorter, ~3:1); blur outside, sharp inside; capture crops to the box only.

### 13. Report section
1. Verify all SBM-reference tables render — checklist: (1) Customer Details 5-column match table, (2) Face Match with Aadhaar, (3) Face Match with PAN, (4) Captured Signature, (5) Location Check grid + SAFE IP banner, (6) Verifying Agent's Status, (7) Liveliness Check Q&A table, (8) Section Remarks (Chat row), (9) Browser & IP Details, (10) Additional Details. Anything missing: add it
2. `Approve` / `Reject` / `Unable to Verify` must **not** be sticky/fixed — place them in normal document flow at the end of the report so they appear only after scrolling through it

### 14. Remove the two avatar circles on the left of the video
Delete the agent/auditor avatar rail added in v2 change 3 (keep avatars elsewhere — header, profile, incoming call).

### 15. After call completion → next call, not Home
On the post-call confirmation screen: primary button becomes **`Next Call`** (with the 10s auto-countdown) → routes to `/agent/queue` where the waiting animation runs and the next simulated call arrives; secondary link "Back to Home". **Fix the status bug**: the agent must remain `Online` throughout call → confirmation → queue; returning to Home must never show Offline unless the agent chose it.

### 16. Remove the stray "Go Online" button on Home
Remove the redundant Go Online button at the top-right of the Home page (below the top bar). The hero Go Online card is the single entry point.

### 17. "On a break" state blocks calls
When status = On Break: the queue page stops spawning incoming calls; show a paused state — coffee-cup icon, "On a break", live break timer (mm:ss), and a purple `Resume — Go Online` button. Break time accrues into the header counter.

### 18. "Offline" state shows session summary
When status = Offline (after having been online): stop incoming calls and show a **session summary card**: Went online at, Total active time, Total break time, Went offline at (logout time) — plus a `Go Online` button. If the agent was never online today, show a simple "You're offline" empty state.

### 19. Top bar greeting
Replace the "Video KYC" text next to the logo with **"Hi, <agent first name>"** (e.g., "Hi, Sumit"). Keep the logo itself.

### 20. Customer language = Hindi
The pre-call Customer Details header chip must read **"Language selected by customer: Hindi"** (set Hindi as the demo customer's preferred language in the mock data; agent's skill set should list Hindi so routing makes sense).

---

## B. Field parity audit (changes 5 & 21) — reconcile each screen to exactly this

Verified against the SBM reference system. Every step page also carries an **"Add Remarks (optional)"** input above a full-width blue **`Next`** button at the bottom — ensure ours does (the report step keeps its own buttons per change 13.2).

**B1. Customer Details (pre-call):** header chips — `Document Submitted: eAadhaar · API`, `ETB_Product Customer` (amber chip), `Product Type: ZET_SC_FD` (blue chip), plus the language line (change 20). Fields, two columns: Name, Gender, DOB, Father's Name, Mobile No., Email ID, Current Add. | Permanent Add., Product Type, Customer Status. Add the amber in-call notice banner used when the customer drops focus: "The customer may have momentarily stepped away from the VKYC process due to an incoming call or phone lock. Please refrain from ending the call…" (show it once mid-call for realism, dismissible)

**B2. Check Liveliness:** 3 questions — "What is your occupation?", "What is your annual income?", "Read the 6-digit text seen on your screen" (6-digit code also overlays the customer video). Per change 6/7: Ask Question → answer → Correct/Wrong

**B3. Check Location:** map caption row under the map: `Latitude: <val>  Longitude: <val>  Plus code: <val>` + right-aligned `(Accurate to 14.71 meters)`. **Location Details** grid (3 columns × 3 rows): `Area | State | IP Address ✓` / `City | Pincode | District` / `Country ✓ | CA → Geo (km) | PA → Geo (km)`. Green banner: `✓ SAFE IP Address – VPN and Proxy Not Detected | Inside India`. Values per change 8.3 (Lower Parel)

**B4. Capture Face:** capture per change 9; after capture show captured-face card + "Does the face match with the Aadhaar Photo?" prompt with Match Score and ✓/✗ — this result feeds the report

**B5. Check Aadhaar eKYC:** rows in order: NAME, FATHER'S NAME, DOB, GENDER, CURRENT ADDRESS, PERMANENT ADDRESS, MOBILE NUMBER, EMAIL. Columns: `Field | Applicant Form Data (soft-blue highlighted column) | Aadhaar Data | Match`. Match values mirror the reference: NAME `93.52%`, FATHER'S NAME `null` (gray), DOB `Yes`, GENDER `Yes`, addresses `100%`, MOBILE/EMAIL `-`. Footer line: `Generation Date: <date> ✓`

**B6. Check PAN:** after capture+confirm, verification table columns `User Detail | Applicant Form Data | PAN Data | Match`, rows: NAME (`93.52%`), DOB (`Yes`), FATHER'S NAME (`-` in form, value in PAN Data), PAN NUMBER (`Yes`), EMAIL (`-`), MOBILE NUMBER (`-`). Below the table: `PAN Status: ✓ Verified`. On-video success toast after capture: "PAN card captured successfully ✓". Face-match card: "Does the face match with the face on PAN Card?" + score (per change 11.5)

**B7. Capture Sign:** per change 12; captured signature card feeds report section 4

**B8. Report:** the 10 sections (change 13.1), all populated from the live session

---

## Acceptance checklist

1. Browser tab shows the Cashfree favicon + "Cashfree Video KYC" title; no old logo anywhere
2. No role modal; `/agent` and `/admin` work as direct URLs
3. End Call → confirmation → ends call → confirmation screen → `Next Call` → queue → next call; status stays Online end-to-end
4. Pre-call checks are Yes/No buttons; Proceed gated on both Yes
5. Liveness: `Ask Question` gates each answer + logs with timestamp; no `Ask again` anywhere
6. Progress rail: right-aligned chevron, spaced steps on a continuous colored timeline
7. Location shows SBM Lower Parel by default (map pin + details + banner)
8. Face oval is 2× and all capture buttons (face/PAN/sign) live in the right workspace with Flip Camera; PAN/sign guide boxes blur outside only; PAN box is 1.586:1; captures crop to box bounds; PAN photo visible in face-match card
9. Aadhaar table columns align, values left-aligned, match chips fixed-height
10. Report contains all 10 reference sections; decision buttons only reachable by scrolling
11. Break state: no calls + timer; Offline state: no calls + session summary (online at / active / break / logout)
12. Header reads "Hi, <name>"; customer language chip reads Hindi; every step page has Add Remarks + Next
13. `npm run build` clean; full happy path re-tested
