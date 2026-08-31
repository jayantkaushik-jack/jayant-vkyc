# Cursor Prompt 64 — KYC Report: field parity from frame-by-frame video review

I reviewed the incumbent (Perfios/Karza) KYC Report screens frame by frame from the SBM recording (the `/videokyc/admin` KYC Report modal and the in-call `/videokyc/kyc-session` verification steps). **Good news: our `KycReport` (`packages/shared/src/components/report/KycReport.tsx`) is already close to parity** — Customer Details, Face Match (Aadhaar/PAN), Captured Signature, Location Check (incl. CA→Geo / PA→Geo), Verifying Agent's Status, Liveliness Check, Section Remarks, Browser & IP Details, and Additional Details are all present.

These are the **remaining deltas** found in the incumbent report that we should add or align for exact parity. All changes are in `KycReport.tsx` unless noted.

## 1. Match-score summary banners at the top of the report
The incumbent shows two prominent banners at the top of the report body (above Location Check): **"Match Score — {aadhaar face-match %}   Status — Yes"** and **"Match Score — {pan face-match %}   Status — Yes"**. Add a summary strip near the top of the report (after the download row, before/above Customer Details or just above Location Check) with these two banners, colour-coded by band (green ≥ threshold, amber/red below), reading from `session.faceMatchAadhaar` / `session.faceMatchPan` and their thresholds. Keep the detailed Face-Match sections as they are.

## 2. Aadhaar Generation Date — move into the column header, with time
Incumbent shows it inside the Aadhaar column header: **"Aadhaar Data (XXXX XXXX 2242) ✓ — Generation Date : 08/06/2026, 02:55:17 PM"**. Today we render it only as a caption below the table and without the time. Change the Aadhaar Data `<th>` to include a second line "Generation Date: {date}, {HH:MM:SS AM/PM}" using `customer.aadhaarGenerationDate` (include the time component). This matters because the generation date+time drives the 72-hour eKYC rule, so it must be prominent and precise. You may keep or drop the caption below the table.

## 3. Explicit verification-status indicators
- Add **"PAN Status: Verified ✓"** as a visible line in/under the Customer Details or PAN section (the in-call Check-PAN screen shows "PAN Status - Verified").
- Ensure the green **verified tick** renders on both the Aadhaar Data and PAN details column headers (already present as "✓" — keep, and make it a proper success-coloured tick).

## 4. Location Check: real geo-accuracy value + capture timestamp
Incumbent shows **"Geo coordinates accurate to {n} meters"** with an actual value (e.g. 14.71 m) and **"Date & Time: {location capture time}"**. Today we hardcode "accurate to 10 meters · {now}". Use a seeded/plausible accuracy value carried on the session (or a stable per-session number) and the **location capture timestamp** rather than `new Date()` at render time, so the report is stable on re-open.

## 5. Additional Details: show the raw product code
Incumbent Additional Details shows **Product Type = "CRL_SC_FD"** (the bank's product code) alongside Customer status (NTB/ETB) and Branch. If the product code is available on the application/customer object, show it (either instead of or alongside the friendly product name). Leave Customer status and Branch as they are.

## Notes
- Keep every existing section and field — this is additive/alignment only.
- These changes flow through both the agent/auditor in-call report and the admin/partner report views since they all render the shared `KycReport`.
- Verify against the recording: the report sections in incumbent order are — Customer Details → (Match-score banners) → Face Match with Aadhaar → Face Match with PAN → Captured Signature → Location Check → Verifying Agent's Status → Liveliness Check → Summary/Section Remarks (Chat) → Browser & IP Details → Additional Details.

## Acceptance criteria
1. Two match-score status banners appear at the top of the report, colour-coded, reading the real face-match scores.
2. The Aadhaar Data column header shows the generation date **and time**; the value is stable across re-opens.
3. "PAN Status: Verified" and the verified ticks render correctly.
4. Location Check shows a stable geo-accuracy value and the capture timestamp (not the render-time clock).
5. Product code (e.g. CRL_SC_FD) is shown in Additional Details where available.
6. No existing report field is removed; partner-facing render still masks staff identities.
