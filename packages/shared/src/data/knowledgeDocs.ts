import { AlertCircle, BookOpen, FileText, Shield, type LucideIcon } from 'lucide-react';

export type KnowledgeDocId = 'reference-docs' | 'vkyc-script' | 'rejection-guide' | 'compliance';

export interface KnowledgeDocSection {
  heading: string;
  body: string;
}

export interface KnowledgeDoc {
  id: KnowledgeDocId;
  title: string;
  icon: LucideIcon;
  updatedDaysAgo: number;
  sections: KnowledgeDocSection[];
}

export const KNOWLEDGE_DOCS: KnowledgeDoc[] = [
  {
    id: 'reference-docs',
    title: 'Agent Reference Docs',
    icon: BookOpen,
    updatedDaysAgo: 3,
    sections: [
      {
        heading: '1. About this platform',
        body: `The Cashfree Video KYC platform lets you complete a customer's KYC through a secure, recorded video call. Every call follows a fixed 7-step journey: Check Liveliness → Check Location → Capture Face → Check Aadhaar → Check PAN → Capture Sign → Report. You must complete each step in order; the progress rail on the right tracks where you are, and you can revisit any completed step to correct an entry before submitting your decision.`,
      },
      {
        heading: '2. Your day at a glance',
        body: `- **Login** with your work email and OTP
- **Go Online** from the Home page — complete the device check (camera, microphone, speaker) every time
- Calls are routed to you automatically while you are Online. Answer within **2 minutes** — after that the call reroutes to another agent and counts toward your Call Drop Rate
- Use **On Break** for lunch/breaks — calls stop routing and your break timer runs
- Go **Offline** at shift end and check your session summary (online time, break time)`,
      },
      {
        heading: '3. Statuses explained',
        body: `| Status | Calls routed? | What's tracked |
|---|---|---|
| Online | Yes | Online time, calls answered/dropped |
| On Break | No | Break duration |
| Offline | No | Session ends; logout time recorded |`,
      },
      {
        heading: '4. During the call — quick rules',
        body: `- Confirm **Video Visible** and **Audible** before proceeding; if either is No, help the customer adjust or report an issue
- Ask every liveness question using the **Ask Question** button — this timestamps the question for the audit log
- Guide captures patiently: the sharp window shows exactly what will be captured
- Use **Facing an issue?** (⋮ menu) for problems mid-call; use **End Call** only when the journey cannot continue
- Your remarks on each step are visible to auditors — write them as if the auditor is reading them tomorrow (they are)`,
      },
      {
        heading: '5. After the call',
        body: `Submit Approve / Reject / Unable to Verify with reasons. Your decision, the recording, and the KYC report go to the bank's audit queue and document management system automatically. The confirmation screen shows the push status; you'll be routed to the next call.`,
      },
      {
        heading: '6. Your metrics (Analytics page)',
        body: `- **Efficiency (0–100)**: weighted score — answer rate 30%, online time 25%, wait time 15%, call time 15%, review time 15%
- **Accuracy**: % of your decisions upheld by auditors
- **Call Drop Rate**: routed calls you didn't answer within 2 minutes
- **Avg Wait / Call / Review Time**: speed of answering, handling, and deciding

Check the Call Log section to see each auditor's decision and comments on your calls.`,
      },
      {
        heading: '7. Escalations',
        body: `- Technical problems: raise via Facing an issue → Technical Issue; contact the floor supervisor if it repeats
- Suspicious customer: mark under Suspicious Customer with detailed remarks — never confront the customer
- For anything ambiguous, prefer **Unable to Verify** over guessing`,
      },
    ],
  },
  {
    id: 'vkyc-script',
    title: 'VKYC Script',
    icon: FileText,
    updatedDaysAgo: 7,
    sections: [
      {
        heading: '1. Opening (greeting + identity)',
        body: `"Good morning/afternoon, my name is **[Agent Name]**, and I'm a verification officer for **[Bank]** Video KYC. Am I speaking with **[Customer Name]**?"

Hindi: "नमस्ते, मेरा नाम [Agent Name] है, मैं [Bank] Video KYC से बात कर रहा/रही हूँ। क्या मेरी बात [Customer Name] से हो रही है?"`,
      },
      {
        heading: '2. Consent (mandatory — verbatim)',
        body: `"This video call is being **recorded** for completing your KYC as per RBI guidelines. Your personal information will be used only for verification. **Do you consent to proceed?**"

Wait for a clear verbal "Yes". If the customer hesitates or declines, thank them and end the call — do not persuade.`,
      },
      {
        heading: '3. Setup checks',
        body: `"Please ensure you are in a **well-lit room**, your **face is clearly visible**, and you are **alone** during this call. Please keep your **original PAN card** and a **blank sheet of paper with a pen** ready."`,
      },
      {
        heading: '4. Liveness questions (use Ask Question for each)',
        body: `- "What is your occupation?"
- "What is your annual income?"
- "Please read the **6-digit code** now appearing on your screen."

Mark each answer Correct/Wrong immediately. If wrong, you may re-ask once after clarifying.`,
      },
      {
        heading: '5. Location',
        body: `"I'm now verifying your location. Please stay where you are for a moment." — confirm the customer is in India, not on VPN, and the location details match. If the customer is driving or in transit: "For security, this process requires you to be stationary. Can you move to a quiet, stable location?"`,
      },
      {
        heading: '6. Face capture',
        body: `"Please look directly into the camera and hold still. Align your face inside the oval on your screen… capturing now. Thank you."`,
      },
      {
        heading: '7. PAN capture',
        body: `"Please hold your **original PAN card** inside the rectangle on your screen — flat, with no glare… hold still… captured. Please confirm the details I read out: your PAN number is **[read from OCR]**, correct?"`,
      },
      {
        heading: '8. Signature capture',
        body: `"On the blank paper, please **sign as you do on official documents**, then hold the paper inside the rectangle… captured, thank you."`,
      },
      {
        heading: '9. Closing',
        body: `"That completes your Video KYC. Your application will be reviewed and you'll be notified of the status by SMS/email. Thank you for your time, and have a great day."

Hindi: "आपकी Video KYC पूरी हो गई है। समीक्षा के बाद आपको SMS/ईमेल से सूचित किया जाएगा। धन्यवाद।"`,
      },
      {
        heading: '10. If things go wrong (recovery lines)',
        body: `- Poor video: "Your video is unclear — could you move closer to a window or switch on a light?"
- Third person visible: "This process requires you to be alone. We'll need to reschedule if someone is assisting you."
- Audio drop: "I can't hear you clearly — please check your microphone or move to a quieter place."`,
      },
    ],
  },
  {
    id: 'rejection-guide',
    title: 'Rejection Reason Guide',
    icon: AlertCircle,
    updatedDaysAgo: 14,
    sections: [
      {
        heading: '1. How to use this guide',
        body: `Choose the **category first**, then the specific sub-reason(s). Always add remarks with facts you observed ("PAN photo has glare covering the number"), never conclusions ("customer is a fraud"). Your reasons appear verbatim in the KYC report and the auditor's queue.`,
      },
      {
        heading: '2. Agent Induced Rejection',
        body: `These are now classified under **Unable to Verify** (not Reject) because they are recoverable process failures. Sub-reasons: wrong document captured; capture quality unacceptable; agent error during verification. **Example**: you captured the Aadhaar letter instead of PAN and only noticed at Report. Declare clearly in remarks.`,
      },
      {
        heading: '3. Technical Issue',
        body: `Classified under **Unable to Verify**. Sub-reasons: poor internet connection; audio not clear / one-way audio; video frozen or black screen; call disconnected mid-journey; platform or session error. **Rule**: attempt one reconnect before ending; note timestamp and symptom.`,
      },
      {
        heading: '4. Photo Related Issue',
        body: `This category now has split outcomes: **Unable to Verify** for low/dim lighting, poor camera quality, face not clearly visible, excessive background noise; **Reject** for face match with Aadhaar/PAN failed and liveness check failed. **Rule**: give two corrective attempts before choosing a terminal decision.`,
      },
      {
        heading: '5. Customer Related Issue',
        body: `Most are **Unable to Verify**: process unknown, customer left screen, in transit, accessibility routed to assisted channel, language mismatch, reschedule requested, consent declined. Integrity concerns (like 3rd person prompting) are now under **Suspicious Customer** and should be **Reject**.`,
      },
      {
        heading: '6. Document Related Issue',
        body: `Split outcomes apply here too: **Unable to Verify** for PAN not available at call time and blank paper/pen unavailable; **Reject** for PAN OCR/verification failed, Aadhaar mismatch beyond tolerance, signature mismatch/refusal, original document not shown, or document tampering.`,
      },
      {
        heading: '7. Suspicious Customer',
        body: `Always **Reject**. Sub-reasons: 3rd person prompting, coercion/duress, impersonation, scripted responses, staged environment, VPN/proxy/location spoofing, outside India, same face/device across unrelated applications, bank-blocked customer, abusive or threatening conduct.`,
      },
      {
        heading: '8. Reject vs Unable to Verify',
        body: `Unable to Verify = process couldn't complete, no adverse finding, customer may reattempt. Rejected = adverse finding or integrity concern; reattempt doesn't cure it.

- **Reject**: disqualifying mismatch, integrity red flag, suspicious behavior, tampered/non-original documents
- **Unable to Verify**: recoverable process failure (technical, capture quality, customer unprepared/accessibility/language/time)

When in doubt, choose Unable to Verify.`,
      },
    ],
  },
  {
    id: 'compliance',
    title: "Compliance Do's & Don'ts",
    icon: Shield,
    updatedDaysAgo: 21,
    sections: [
      {
        heading: '1. Why this matters',
        body: `Video KYC (V-CIP) is regulated by the RBI. Every call is recorded, geo-tagged, and audited. A compliant call protects the customer, the bank, and you.`,
      },
      {
        heading: '2. DO',
        body: `- **Do** obtain explicit recorded consent before starting verification
- **Do** confirm the customer is physically **in India** (geo + IP checks must both pass)
- **Do** ensure the customer is **live** — ask the scripted questions yourself; the code must be read from the customer's own screen
- **Do** verify the **original PAN** only — captured live on camera
- **Do** complete every mandatory step; use remarks to document anything unusual
- **Do** end the call politely if the customer withdraws consent at any point`,
      },
      {
        heading: '3. DON\'T',
        body: `- **Don't** prompt or coach answers — if a third person prompts, use Customer Related Issue
- **Don't** proceed if a **VPN/proxy** is detected or location is outside India — the platform blocks this; never work around it
- **Don't** accept photocopies, screenshots, or documents shown on another device
- **Don't** record or note customer data outside the platform (no personal notebooks, phones, screenshots)
- **Don't** continue a call where the customer's face is persistently obscured (cap, mask, sunglasses, backlight)
- **Don't** rush: a compliant call takes the time it takes — target band is 2.5–4.5 minutes, not a race`,
      },
      {
        heading: '4. Data privacy',
        body: `Customer data stays inside the platform. Aadhaar numbers are always masked (last 4 digits only). Never read a full Aadhaar number aloud. Reports and recordings transfer automatically to the bank's DMS — you never need to export anything.`,
      },
      {
        heading: '5. Red flags to escalate',
        body: `Same face across different customer applications; background voices giving instructions; customer reading answers from a script; device propped in a moving vehicle; reluctance to show the physical PAN card. Mark Suspicious Customer and describe exactly what you observed.`,
      },
      {
        heading: '6. Audit outcomes',
        body: `Auditors review every approved call. Decisions: **Accepted**, **Rejected** (your approval overturned), or **Recapture** (specific step must be redone). Check Analytics → Call Log for auditor comments on your calls — recurring comments are coaching signals, not punishments.`,
      },
    ],
  },
];

export const KNOWLEDGE_DOC_MAP = Object.fromEntries(
  KNOWLEDGE_DOCS.map((doc) => [doc.id, doc]),
) as Record<KnowledgeDocId, KnowledgeDoc>;

export function getKnowledgeDoc(id: string): KnowledgeDoc | undefined {
  return KNOWLEDGE_DOC_MAP[id as KnowledgeDocId];
}
