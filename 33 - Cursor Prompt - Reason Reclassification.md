# Cursor Prompt — Reclassify Reasons Under Rejected vs Unable to Verify (Both Apps)

> Restructures the shared rejection-reason taxonomy so every reason is bound to the correct decision. The classified list below is canonical (also saved as "Reference - Reason Classification (Rejected vs Unable to Verify).md" in the project folder). Touches the shared data layer, the agent Report-step modals, and admin displays. Read touched files first; minimal diffs elsewhere.

**Principle (encode as a comment atop the taxonomy file):** Unable to Verify = process couldn't complete, no adverse finding, customer may reattempt. Rejected = adverse finding or integrity concern; reattempt doesn't cure it.

---

## A. Shared taxonomy restructure

Rework the taxonomy module: each reason gets `{ id, label, category, decision: 'unable' | 'rejected' }`. Categories stay (Technical, Photo Related, Customer Related, Document Related, Suspicious Customer, Agent Induced, + Connection/Drop for dropped calls), but every sub-reason now carries its decision binding:

**decision: 'unable'** —
Technical: Poor internet connection · Audio not clear / one-way audio · Video frozen or black screen · Call disconnected mid-journey · Platform or session error
Photo Related: Low or dim lighting · Poor camera quality · Face not clearly visible (angle/backlight/obstruction) · Excessive background noise
Document Related: PAN card not available at the time of the call · Blank paper/pen not available for signature
Customer Related: User doesn't know about the process · Customer minimized the screen, locked the device, or received an incoming call (did not return) · Customer in transit / unstable location · Customer is DEAF/DUMB/BLIND (route to assisted channel) · Preferred-language mismatch · Customer requested reschedule / ran out of time · Customer declined consent to recording
Agent Induced: Wrong document captured · Capture quality unacceptable · Agent error during verification

**decision: 'rejected'** —
Verification failures (Document/Photo categories): Face match with Aadhaar photo failed · Face match with PAN photo failed · Liveness check failed (wrong/scripted answers, couldn't read code) · PAN OCR or verification failed · Aadhaar data mismatch beyond tolerance · Signature mismatch or refused to sign · Original document not shown (photocopy/print/screen) · Document tampered or deliberately obscured
Suspicious Customer: 3rd person prompting the answers · Customer appears coerced or under duress · Impersonation suspected · Customer reading answers from a script · Suspicious environment (staged/call-center setup) · VPN or proxy detected / location spoofing · Customer found outside India during the call · Same face/device across unrelated applications · Customer blocked by the bank · Abusive or threatening conduct

## B. Agent app — decision modals

- **Reject** modal ("What happened?"): shows **only** `decision: 'rejected'` reasons, grouped by category accordions
- **Unable to Verify** modal: shows **only** `decision: 'unable'` reasons, grouped likewise
- The mid-call "Facing an issue?" modal keeps showing all categories (it's an incident report, not a decision) — unchanged
- If an agent picks reasons then switches decision buttons, selections clear (no cross-decision leakage)

## C. Data generator

Seeded calls must use decision-consistent reasons: Rejected calls draw only from the rejected list, Unable calls only from the unable list, auditor Rejected reuses the rejected list, auditor Recapture draws from the unable "capture quality" items (low light, poor camera, capture quality unacceptable, signature capture blurry). Add a dev assertion: a call whose reason's `decision` binding contradicts its status throws.

## D. Admin displays

- R&F page reason bars and the cases table group by category as today, but reason chips render with their decision color (amber = unable-class, red = rejected-class); the diagram/table need no structural change
- Knowledge Center "Rejection Reason Guide" (agent app): update sections 2–8 to reflect the new bindings — notably PAN-not-available and face-not-clearly-visible move under Unable to Verify, and the "Reject vs Unable" section states the principle above verbatim

## Acceptance

1. Reject modal contains no remediable reasons (spot: "PAN card not available", "Face not clearly visible", "Low or dim lighting" appear ONLY under Unable to Verify); Unable modal contains no integrity reasons (spot: "3rd person prompting the answers" appears ONLY under Reject)
2. Seeded data: zero contradictions (assertion silent); R&F reason bars show unable-class reasons only on Unable/Recapture statuses and rejected-class only on Rejected statuses
3. Issue modal unchanged; switching decision buttons clears selections
4. Knowledge doc updated and consistent with the modals
5. `npm run build` clean for both apps
