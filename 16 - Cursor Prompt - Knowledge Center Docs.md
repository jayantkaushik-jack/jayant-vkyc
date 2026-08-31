# Cursor Prompt — Knowledge Center: Document Pages + Full Sample Content

> Make the four Knowledge Center cards open real document pages. All content is provided below verbatim — do not invent or shorten it. Minimal changes elsewhere.

---

## Implementation

1. **Route**: add `/agent/knowledge/:docId` under the agent layout. Card click navigates (replace the "Opening document…" toast). Doc IDs: `reference-docs`, `vkyc-script`, `rejection-guide`, `compliance`
2. **Content store**: `src/data/knowledgeDocs.ts` — export the four docs as structured content (title, icon, updatedDaysAgo, sections: `{ heading, body }[]`; body supports simple markdown: bold, bullet lists, numbered lists, tables)
3. **Doc viewer page**: clean document layout — back link ("← Knowledge Center"), title + "Updated N days ago" + doc icon, sticky right-side mini table of contents (section links, scrollspy), prose sections in cards. Print-friendly. Keep the Cashfree light theme
4. The Knowledge Center grid page stays as is, cards now link through

---

## Document 1 — Agent Reference Docs (`reference-docs`, updated 3 days ago)

### 1. About this platform
The Cashfree Video KYC platform lets you complete a customer's KYC through a secure, recorded video call. Every call follows a fixed 7-step journey: Check Liveliness → Check Location → Capture Face → Check Aadhaar → Check PAN → Capture Sign → Report. You must complete each step in order; the progress rail on the right tracks where you are, and you can revisit any completed step to correct an entry before submitting your decision.

### 2. Your day at a glance
- **Login** with your work email and OTP
- **Go Online** from the Home page — complete the device check (camera, microphone, speaker) every time
- Calls are routed to you automatically while you are Online. Answer within **2 minutes** — after that the call reroutes to another agent and counts toward your Call Drop Rate
- Use **On Break** for lunch/breaks — calls stop routing and your break timer runs
- Go **Offline** at shift end and check your session summary (online time, break time)

### 3. Statuses explained
| Status | Calls routed? | What's tracked |
|---|---|---|
| Online | Yes | Online time, calls answered/dropped |
| On Break | No | Break duration |
| Offline | No | Session ends; logout time recorded |

### 4. During the call — quick rules
- Confirm **Video Visible** and **Audible** before proceeding; if either is No, help the customer adjust or report an issue
- Ask every liveness question using the **Ask Question** button — this timestamps the question for the audit log
- Guide captures patiently: the sharp window shows exactly what will be captured
- Use **Facing an issue?** (⋮ menu) for problems mid-call; use **End Call** only when the journey cannot continue
- Your remarks on each step are visible to auditors — write them as if the auditor is reading them tomorrow (they are)

### 5. After the call
Submit Approve / Reject / Unable to Verify with reasons. Your decision, the recording, and the KYC report go to the bank's audit queue and document management system automatically. The confirmation screen shows the push status; you'll be routed to the next call.

### 6. Your metrics (Analytics page)
- **Efficiency (0–100)**: weighted score — answer rate 30%, online time 25%, wait time 15%, call time 15%, review time 15%
- **Accuracy**: % of your decisions upheld by auditors
- **Call Drop Rate**: routed calls you didn't answer within 2 minutes
- **Avg Wait / Call / Review Time**: speed of answering, handling, and deciding
Check the Call Log section to see each auditor's decision and comments on your calls.

### 7. Escalations
- Technical problems: raise via Facing an issue → Technical Issue; contact the floor supervisor if it repeats
- Suspicious customer: mark under Suspicious Customer with detailed remarks — never confront the customer
- For anything ambiguous, prefer **Unable to Verify** over guessing

## Document 2 — VKYC Script (`vkyc-script`, updated 7 days ago)

### 1. Opening (greeting + identity)
"Good morning/afternoon, my name is **[Agent Name]**, and I'm a verification officer for **[Bank]** Video KYC. Am I speaking with **[Customer Name]**?"
Hindi: "नमस्ते, मेरा नाम [Agent Name] है, मैं [Bank] Video KYC से बात कर रहा/रही हूँ। क्या मेरी बात [Customer Name] से हो रही है?"

### 2. Consent (mandatory — verbatim)
"This video call is being **recorded** for completing your KYC as per RBI guidelines. Your personal information will be used only for verification. **Do you consent to proceed?**"
Wait for a clear verbal "Yes". If the customer hesitates or declines, thank them and end the call — do not persuade.

### 3. Setup checks
"Please ensure you are in a **well-lit room**, your **face is clearly visible**, and you are **alone** during this call. Please keep your **original PAN card** and a **blank sheet of paper with a pen** ready."

### 4. Liveness questions (use Ask Question for each)
- "What is your occupation?"
- "What is your annual income?"
- "Please read the **6-digit code** now appearing on your screen."
Mark each answer Correct/Wrong immediately. If wrong, you may re-ask once after clarifying.

### 5. Location
"I'm now verifying your location. Please stay where you are for a moment." — confirm the customer is in India, not on VPN, and the location details match. If the customer is driving or in transit: "For security, this process requires you to be stationary. Can you move to a quiet, stable location?"

### 6. Face capture
"Please look directly into the camera and hold still. Align your face inside the oval on your screen… capturing now. Thank you."

### 7. PAN capture
"Please hold your **original PAN card** inside the rectangle on your screen — flat, with no glare… hold still… captured. Please confirm the details I read out: your PAN number is **[read from OCR]**, correct?"

### 8. Signature capture
"On the blank paper, please **sign as you do on official documents**, then hold the paper inside the rectangle… captured, thank you."

### 9. Closing
"That completes your Video KYC. Your application will be reviewed and you'll be notified of the status by SMS/email. Thank you for your time, and have a great day."
Hindi: "आपकी Video KYC पूरी हो गई है। समीक्षा के बाद आपको SMS/ईमेल से सूचित किया जाएगा। धन्यवाद।"

### 10. If things go wrong (recovery lines)
- Poor video: "Your video is unclear — could you move closer to a window or switch on a light?"
- Third person visible: "This process requires you to be alone. We'll need to reschedule if someone is assisting you."
- Audio drop: "I can't hear you clearly — please check your microphone or move to a quieter place."

## Document 3 — Rejection Reason Guide (`rejection-guide`, updated 14 days ago)

### 1. How to use this guide
Choose the **category first**, then the specific sub-reason(s). Always add remarks with facts you observed ("PAN photo has glare covering the number"), never conclusions ("customer is a fraud"). Your reasons appear verbatim in the KYC report and the auditor's queue.

### 2. Agent Induced Rejection
Use when *you* made the error. Sub-reasons: wrong document captured; capture quality unacceptable; agent error during verification. **Example**: you captured the Aadhaar letter instead of PAN and only noticed at Report. *Honesty here protects your accuracy score — auditors treat self-declared errors differently from concealed ones.*

### 3. Technical Issue
Use for platform/network failures. Sub-reasons: poor internet connection; audio not clear / one-way audio; video frozen or black screen; page/session error. **Rule**: attempt one reconnect before rejecting; note the timestamp of the failure.

### 4. Photo Related Issue
Sub-reasons: face not clearly visible; low or dim lighting; face mismatch with document photo; camera quality too poor. **Rule**: give the customer two chances to fix lighting/positioning before rejecting; record the match score in remarks when it's a mismatch.

### 5. Customer Related Issue
Sub-reasons: customer has minimized the screen, locked the device, or received an incoming call; 3rd person prompting the answers; customer is DEAF/DUMB/BLIND; user doesn't know about the process. **Note**: for accessibility cases, do not reject outright — mark Unable to Verify and add remarks so the bank can route to an assisted channel.

### 6. Document Related Issue
Sub-reasons: PAN card not available; original document not shown (photocopy/screen); document damaged/illegible; PAN OCR or verification failed. **Rule**: photocopies, laminated color prints, and photos of documents on another phone screen are all "original not shown".

### 7. Suspicious Customer
Sub-reasons: customer appears coerced; identity suspicion / impersonation; suspicious background or environment; VPN/remote-access suspicion. **Rule**: stay neutral, complete or end the call calmly, select this category, and write detailed factual remarks. Never tell the customer they are suspected.

### 8. Reject vs Unable to Verify
- **Reject**: you verified and found a disqualifying problem (mismatch, non-original document, suspicious behavior)
- **Unable to Verify**: the journey couldn't be completed properly (technical failure, accessibility, customer unprepared) — the customer can reattempt
When in doubt, choose Unable to Verify.

## Document 4 — Compliance Do's & Don'ts (`compliance`, updated 21 days ago)

### 1. Why this matters
Video KYC (V-CIP) is regulated by the RBI. Every call is recorded, geo-tagged, and audited. A compliant call protects the customer, the bank, and you.

### 2. DO
- **Do** obtain explicit recorded consent before starting verification
- **Do** confirm the customer is physically **in India** (geo + IP checks must both pass)
- **Do** ensure the customer is **live** — ask the scripted questions yourself; the code must be read from the customer's own screen
- **Do** verify the **original PAN** only — captured live on camera
- **Do** complete every mandatory step; use remarks to document anything unusual
- **Do** end the call politely if the customer withdraws consent at any point

### 3. DON'T
- **Don't** prompt or coach answers — if a third person prompts, use Customer Related Issue
- **Don't** proceed if a **VPN/proxy** is detected or location is outside India — the platform blocks this; never work around it
- **Don't** accept photocopies, screenshots, or documents shown on another device
- **Don't** record or note customer data outside the platform (no personal notebooks, phones, screenshots)
- **Don't** continue a call where the customer's face is persistently obscured (cap, mask, sunglasses, backlight)
- **Don't** rush: a compliant call takes the time it takes — target band is 2.5–4.5 minutes, not a race

### 4. Data privacy
Customer data stays inside the platform. Aadhaar numbers are always masked (last 4 digits only). Never read a full Aadhaar number aloud. Reports and recordings transfer automatically to the bank's DMS — you never need to export anything.

### 5. Red flags to escalate
Same face across different customer applications; background voices giving instructions; customer reading answers from a script; device propped in a moving vehicle; reluctance to show the physical PAN card. Mark Suspicious Customer and describe exactly what you observed.

### 6. Audit outcomes
Auditors review every approved call. Decisions: **Accepted**, **Rejected** (your approval overturned), or **Recapture** (specific step must be redone). Check Analytics → Call Log for auditor comments on your calls — recurring comments are coaching signals, not punishments.

---

## Acceptance

1. All four cards navigate to their document pages; back link returns to the grid
2. Each page renders every section above with TOC scrollspy; tables and bold render correctly
3. Documents are readable top-to-bottom without layout breaks; print preview is clean
4. `npm run build` clean; no other pages touched
