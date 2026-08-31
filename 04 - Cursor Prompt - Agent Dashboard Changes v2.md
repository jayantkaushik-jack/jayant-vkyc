# Cursor Prompt — Agent Dashboard: Change Request v2 (Call Flow Fidelity)

> Apply to the existing repo (`Agent_Admin_Dashboard_Implementation`). 16 changes, mostly in the call room. Keep the Cashfree light theme and existing conventions (`Card`, `StatusPill`, `Button`, `Modal`, `cn`). Where a change references the "Karza reference", implement exactly what is specified here — do not invent extra fields.

---

## 1. Remove webhook toasts

Delete the `event: CUSTOMER_ARRIVED` / `CALL_INITIATED` / etc. toasts that pop in the bottom-left during the call. Remove the webhook-toast wiring from `src/features/agent/CallRoomPage.tsx` (and the related toast variant in `src/components/ui/Toast.tsx` if now unused). Webhook data stays in the data layer (admin uses it).

## 2. Use the real Cashfree logo

`Cashfree_Logo.png` (400×400) is at the repo root. Move it to `public/cashfree-logo.png` and update `src/components/layout/CashfreeLogo.tsx` to render it (`<img>`, ~28px height, auto width). If the PNG is icon-only (no wordmark), keep "Cashfree Payments" text next to it in the current style; if it includes the wordmark, drop the text. Use it on the login page brand panel too.

## 3. Agent & auditor avatars in the call room left rail

In `src/features/agent/call/VideoPanel.tsx`: the left icon rail should show two small circular avatars with tooltips — the logged-in **Agent** (ring in `primary`) and the assigned **Auditor** (gray ring, tooltip "Auditor: <name>"). Add an avatar system:

- Create `public/avatars/` with deterministic dummy portraits. Add a small script (`scripts/fetch-avatars.sh`) that downloads ~30 portraits from `https://randomuser.me/api/portraits/{men|women}/{n}.jpg` into `public/avatars/` as `m-1.jpg…m-15.jpg`, `w-1.jpg…w-15.jpg`, and run it once
- Add `src/lib/avatar.ts`: `getAvatarUrl(person)` → picks `m-*`/`w-*` deterministically from person id + gender, with initials-circle fallback if the image 404s
- Use these avatars everywhere a person appears: call room rail, agent header, Profile page, incoming-call card

## 4. Fix gender ↔ name mismatches in mock data

In `src/data/generate.ts`, gender is currently `rng.pick(['Male','Female','Other'])`, independent of the name — that's the bug. Replace with an explicit map and derive gender from the chosen first name:

- Male: Sumit, Rahul, Vikram, Arjun, Rohan, Amit, Rajesh, Sanjay, Karan, Nikhil, Manish, Ashok
- Female: Priya, Ananya, Neha, Kavita, Deepa, Sneha, Pooja, Meera, Divya, Shreya, Ritu, Lakshmi

Father's name must pick from the male list only. Aadhaar data gender must equal customer gender. Avatars (change 3) must match gender.

## 5. Pre-call checks: keep two tags only

In `src/features/agent/call/steps/CustomerDetailsStep.tsx`, replace the three checks (`Clear View`, `Audible`, `Video Visibility`) with exactly two: **`Video Visible`** and **`Audible`**. (Rationale: "Clear View" and "Video Visibility" are redundant for the demo — face clarity vs feed visibility.) Both must be confirmed to enable `Proceed`.

## 6. Workflow progress: collapsible right sidebar instead of top stepper

Replace the horizontal top stepper (`src/features/agent/call/Stepper.tsx`) with a **vertical, collapsible right rail** in the call room:

- Expanded (~240px): each step as a row — status icon (pending gray circle / active purple ring / passed green check / failed red ✗), step name, and for the active step a thin progress connector; clicking a *completed* step scrolls/switches the workspace to review it (read-only); future steps not clickable
- Collapsed (~56px): icons only, tooltips on hover; chevron button at the top toggles, state persisted in component state
- Layout becomes: video panel (left) | step workspace (center, flexible) | progress rail (right)

## 7. Camera access

*(Answered separately in chat — no code change in this prompt.)*

## 8–10, 12. Demo imagery pack (face, Aadhaar, PAN, signature)

Create `public/demo/` with consistent dummy assets and a tiny manifest in `src/lib/demoAssets.ts`:

- `face-live.jpg` — the "customer" portrait (pick one avatar identity, e.g. `m-3.jpg`, and reuse it for the in-call customer video placeholder so the story is coherent)
- `face-aadhaar.jpg` — same person, different crop/tone (simulate an ID photo: grayscale filter + slight crop of the same image is fine)
- `pan-card.svg` — a realistic **dummy** PAN card: Income Tax Department strip, "Permanent Account Number" label, `CXDPC7226G`, name, father's name, DOB, small photo (same identity), signature scribble, "SPECIMEN — DEMO" watermark
- `sign-paper.jpg`/`.svg` — a handwritten-style signature (SVG path scribble) on a paper-white background

Then:
- **Change 8 — Selfie/face capture (`CaptureFaceStep.tsx`)**: on Capture, show `face-live.jpg` in the "Captured face" card (not a gradient placeholder)
- **Change 9 — Aadhaar compare (`AadhaarStep.tsx`)**: stop tinting every row green. Rows are neutral (white) with a right-aligned match chip: green chip only for true matches (`100%`, `Yes`), **amber** chip for partial (address `93.2%`), gray `—` where Aadhaar has no value (e.g., Father's Name, Email). Only the chip is colored — never the whole row
- **Change 10 — Aadhaar face match card**: show `face-live.jpg` as "Captured Image" and `face-aadhaar.jpg` as "Aadhaar Image" side by side with the match score
- **Change 12 — PAN images (`PanStep.tsx`)**: captured PAN card shows `pan-card.svg`; PAN face-match card shows `face-live.jpg` vs the PAN photo crop

## 11. Editable PAN details

In `PanStep.tsx`, after OCR fills the PAN form (PAN No, Name, Father's Name, DOB): add a pencil **Edit** icon on the details card. Clicking switches the fields to inputs (pre-filled), with Save/Cancel. Saved edits flow into the verification table and the final report. Show an "edited by agent" dot next to any changed field.

## 13. PAN capture simulation on the video screen

Make PAN capture feel like a real capture, not a button-only interaction. When the PAN step becomes active:

1. A **guide rectangle** (rounded, dashed white border, darkened outside mask, "Align PAN card within the frame" caption) overlays the customer video in `VideoPanel.tsx`
2. After ~1.5s, `pan-card.svg` animates into the rectangle (slide up + settle, slight hand-held wobble) — simulating the customer holding up the card
3. A round **Capture** shutter button appears at the bottom-center of the video panel; clicking fires a white flash, freezes the frame, and sends the cropped card image to the workspace (thumbnail + "Retake" / "Looks Good")
4. "Looks Good" → OCR form fills (change 11 applies)

Implement via a `captureMode` prop on `VideoPanel` (`'pan' | 'sign' | 'face' | null`) driven by the active step.

## 14. Signature capture — same protocol

`CaptureSignStep.tsx` uses the same mechanism: guide rectangle ("Ask the customer to show the signed paper"), `sign-paper` asset animates in, shutter button captures with flash → thumbnail + Retake/Looks Good. Face capture (change 8) should also use `captureMode='face'` with an oval guide for consistency.

## 15. Full detailed verification report (Karza-parity)

Rebuild the Report step (`ReportStep.tsx`) — and extract it into a shared `src/components/report/KycReport.tsx` (the admin's View Report modal must reuse it). Exact sections, in order, styled as a document with light-blue section headers and a download icon top-right:

1. **Customer Details** — table, columns: `User Detail | Applicant Form Data | Aadhaar Data (XXXX XXXX 2242) ✓ (sub-line: Generation Date + timestamp) | PAN details (CXDPC7226G) ✓ | Match`. Rows: NAME (match `93.52%`), FATHER'S NAME (`—` where absent), DOB (`Yes`), GENDER (`Yes`), CURRENT ADDRESS (`100.00%`), PERMANENT ADDRESS (`100.00%`), MOBILE NUMBER, EMAIL. Match column values green; partial scores amber
2. **Face Match with Aadhaar** — Captured Image ✓ | Aadhaar Image thumbnails; below: `Match Score — 93.93%` (green) `Status — Yes`
3. **Face Match with PAN** — Captured Image ✓ | PAN Image; `Match Score — 45.63%` (amber) `Status — Yes`
4. **Captured Signature** — the captured signature image
5. **Location Check** — grid: Latitude, Longitude, Plus code, State, City, Pincode, District, Area, Country ✓, IP Address ✓, `CA → Geo: 4.165 km`, `PA → Geo: 4.165 km`; footnote "Geo coordinates accurate to N meters" + Date & Time; green banner **"SAFE IP Address – VPN and Proxy Not Detected | Inside India"**
6. **Verifying Agent's Status — Approved/Rejected** (colored) — rows: Timestamp; Remarks ("No status remarks added by the Verifying Agent" when empty)
7. **Liveliness Check** — table `Question Asked | Answer | Result`, rows from the actual liveness step (e.g., "What is your occupation?" / "Student" / `Correct` green; "Read the 6-digit text seen on your screen" / `794480` / `Correct`)
8. **Section Remarks** — table `Section | Remarks`, row: `Chat — "No chat activity was detected during the Video KYC call."`
9. **Browser & IP Details** — IP Country code (IN), Browser Name, Browser Version, Operating System (pull from `navigator.userAgent` for realism)
10. **Additional Details** — Customer status (NTB/ETB), Product Type (e.g., `CRL_SC_FD`), Branch (`—`)

All values come from the live call session + mock customer record — the report must reflect what actually happened in the steps (answers given, scores, agent decision, edits from change 11). Download icon exports the report section as PDF via `window.print()` on a print-styled route (keep it simple).

## 16. Extensive reject / unable-to-verify reasons (Karza-parity)

Replace the current short reason list with the Karza two-level structure. Shared component used by both the **"Facing an issue during the call?"** modal and the **Reject / Unable to Verify** flow ("What happened?"): accordion of categories, each expanding to sub-reason checkboxes (multi-select), plus "Add Remarks (optional)" textarea and actions (`Notify` / `End Call` in the issue modal; `Go Back` / `Confirm` in the reject flow):

- **Agent Induced Rejection** — Wrong document captured; Capture quality unacceptable; Agent error during verification *(assumed — confirm wording with SBM)*
- **Technical Issue** — Poor internet connection; Audio not clear / one-way audio; Video frozen or black screen; Page/session error *(assumed)*
- **Photo Related Issue** — Face not clearly visible; Low or dim lighting; Face mismatch with document photo; Camera quality too poor *(assumed)*
- **Customer Related Issue** — Customer has minimized the screen, locked the device, or received an incoming call; 3rd person prompting the answers; Customer is DEAF/DUMB/BLIND; User doesn't know about the process *(verbatim from reference)*
- **Document Related Issue** — PAN card not available; Original document not shown (photocopy/screen); Document damaged/illegible; PAN OCR or verification failed *(assumed)*
- **Suspicious Customer** — Customer appears coerced; Identity suspicion / impersonation; Suspicious background or environment; VPN/remote-access suspicion *(assumed)*

Selected category + sub-reasons + remarks land in the call record and appear in the final report (section 6) and in Analytics → Auditor Outcomes where applicable.

## 17. Post-call confirmation screen

After the agent submits a decision (Approve / Reject / Unable to Verify), do **not** jump straight away. Show a full-screen confirmation state in the call room:

- Big status icon (green check / red cross / amber alert) + "KYC Approved" (or matching label)
- Summary card: Customer name + avatar, App ID, call duration, decision, reason(s) if any, sections completed (7/7 with mini check row)
- Line items with staggered check animation: "Call recording saved ✓" → "KYC report generated ✓" → "Pushed to bank DMS ✓"
- Buttons: purple **Back to Home** (→ `/agent`, status stays Online) and secondary "View Report" (opens the change-15 report read-only)
- Auto-redirect to Home after 10s with a visible countdown on the button

## 18. Real camera access with graceful fallback

Wire up the browser camera so the demo can run with live video and real captures, falling back to the simulated flow when no camera is available or permission is denied.

- Add `src/lib/useCamera.ts`: a hook wrapping `navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false })` — returns `{ stream, status: 'idle'|'requesting'|'active'|'denied'|'unavailable', start(), stop() }`. Request the stream only on user action (never on page load). Stop all tracks on unmount and on call end
- **Device Check modal** (`DeviceCheckModal.tsx`): "Webcam Preview" becomes a live `<video autoPlay muted playsInline>` bound to the stream, requested when the modal opens. Populate the Microphone/Speaker/Camera dropdowns from `navigator.mediaDevices.enumerateDevices()` (labels available once permission is granted). If denied/unavailable, keep the current animated placeholder with a small amber note: "Camera unavailable — demo will use simulated video"
- **Call room** (`VideoPanel.tsx`): when the camera is active, the main customer feed is the live stream (the agent plays customer, like the reference test recording); the agent PIP can reuse the same stream (mirrored, it's a demo). When not active, keep the current placeholder + demo-asset behavior
- **Real captures**: when the live stream is on, the `captureMode` shutter (changes 13/14 and face capture) captures the actual frame — draw the `<video>` onto an offscreen `<canvas>`, crop to the guide rectangle/oval bounds, export via `toDataURL('image/jpeg', 0.9)`, and feed the result into the existing capture cards, verification steps, and the final report (sections 2–4 show the real captured images). The asset-slides-into-rectangle animation runs **only** in fallback mode — with a real camera, the guide overlay + shutter is enough (the agent physically holds up a PAN card / signed paper)
- Captured images live in the call session state only (in-memory); no uploads, no persistence
- Add a small camera status chip to the video panel ("Live camera" green / "Simulated" gray) so reviewers know which mode they're seeing
- Note in README: camera requires `localhost` or HTTPS; on `npm run dev` this is already satisfied

## Acceptance checklist

1. No webhook toasts anywhere in the agent flow; real Cashfree logo renders in header + login
2. Call room shows agent + auditor avatars; every person in the app has a gender-consistent portrait; no female name labeled Male anywhere (spot-check 20 customers)
3. Pre-call has exactly two tags (Video Visible, Audible); progress lives in a collapsible right rail; top stepper is gone
4. Face, Aadhaar, PAN, and signature steps all show the demo imagery; PAN + signature + face captures run the on-video guide-rectangle → asset-appears → shutter-capture simulation
5. Aadhaar compare has no fully-green rows — only per-row match chips (green/amber/gray)
6. PAN details editable with edit-trace; edits propagate to verification table + report
7. Report step renders all 10 sections with live session data; admin View Report reuses the same component
8. Reject/Unable/Issue modals show the 6 accordion categories with sub-reason checkboxes; selections persist to the report
9. Full happy path: Home → Go Online → call → 7 steps → Approve → confirmation screen → Back to Home; `npm run build` clean
10. With a webcam + permission granted: device check shows live preview, call room streams live video, and face/PAN/signature captures are real frames cropped to the guide bounds, appearing in the report. With permission denied: everything falls back to the simulated flow with the "Simulated" chip, and no console errors either way
