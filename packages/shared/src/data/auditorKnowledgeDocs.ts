import { AlertCircle, BookOpen, ClipboardCheck, Shield, type LucideIcon } from 'lucide-react';
import type { KnowledgeDocSection } from './knowledgeDocs';

export type AuditorKnowledgeDocId =
  | 'auditor-reference'
  | 'audit-checklist'
  | 'recapture-vs-reject'
  | 'compliance-escalation';

export interface AuditorKnowledgeDoc {
  id: AuditorKnowledgeDocId;
  title: string;
  icon: LucideIcon;
  updatedDaysAgo: number;
  sections: KnowledgeDocSection[];
}

export const AUDITOR_KNOWLEDGE_DOCS: AuditorKnowledgeDoc[] = [
  {
    id: 'auditor-reference',
    title: 'Auditor Reference Guide',
    icon: BookOpen,
    updatedDaysAgo: 4,
    sections: [
      {
        heading: '1. Role of audit in V-CIP',
        body: `Video Customer Identification Procedure (V-CIP) requires an independent audit layer after the agent completes a call. Your job is **not** to redo the call — it is to review the recording, the KYC report, and the agent's decision against RBI-aligned standards, then record one of three outcomes: **Approve**, **Recapture**, or **Reject**.

Every agent-approved call enters the pending queue in **FIFO order** (oldest first). SLA expectation: review within **hours**, not days — the queue aging pill turns amber at 30 minutes and red at 60 minutes as a visual nudge, not a hard system cutoff.`,
      },
      {
        heading: '2. The three decisions',
        body: `| Decision | When to use | Customer impact | Agent impact |
|---|---|---|---|
| **Approve** | Recording and report support the agent's approval; no material defect or integrity concern | Application proceeds to bank processing | Counts toward agent **accuracy** (upheld decision) |
| **Recapture** | A **curable capture or quality defect** — the customer can reattempt with a corrected capture (lighting, camera, signature blur, agent-induced wrong doc) | Customer receives a **reattempt** instruction for the specific step | Agent accuracy may be affected if recapture traces to agent error |
| **Reject** | **Adverse finding or integrity concern** — face/PAN mismatch, liveness failure, tampered document, suspicious behaviour, location outside India | **Terminal** for this application path; customer does not simply "try again" | Counts against agent accuracy if the agent had approved |

When uncertain between Recapture and Reject, read the **Recapture vs Reject Guide** — the taxonomy's \`decision\` binding (\`unable\` vs \`rejected\`) is the same principle applied at audit time.`,
      },
      {
        heading: '3. Your working day',
        body: `- **Go Online** from Pending Cases — the queue is hidden until you are online
- Review cases in FIFO order; use the recording player and KYC report side by side
- **On Break** pauses routing visibility — no cases shown while on break
- **Offline** ends your session; the summary card shows online/break totals
- Decisions you make this session appear immediately in **Analytics → Recent Decisions**`,
      },
      {
        heading: '4. SLA and throughput',
        body: `Target **daily audit capacity** is listed on your Profile under Audit Scope (typically ~60 cases). Efficiency is measured by decision time and queue clearance, not by approval rate — do not rush approvals to "keep the number up."

Review checklist order: (1) watch key moments in the recording, (2) scan the KYC report data matches, (3) read agent remarks, (4) decide. Average decision time is tracked on Analytics for self-calibration only.`,
      },
      {
        heading: '5. How your decisions ripple',
        body: `**Agents**: Analytics shows accuracy — % of their approvals you uphold vs overturn. A Recapture or Reject on an agent-approved call lowers accuracy; constructive remarks help coaching, not punishment.

**Customers**: Approve → onward processing. Recapture → partner/bank sends the customer back for a specific step. Reject → application closed on adverse grounds; customer may need to contact the partner separately.

**Compliance**: Your remarks are persisted on the audit record and may be exported in MIS reports. Write facts ("signature on report does not match PAN specimen"), not conclusions ("customer is fraudulent").`,
      },
    ],
  },
  {
    id: 'audit-checklist',
    title: 'Audit Review Checklist',
    icon: ClipboardCheck,
    updatedDaysAgo: 6,
    sections: [
      {
        heading: '1. Recording — liveness and conduct',
        body: `- Confirm the **consent line** was read and the customer agreed before verification started
- Liveness Q&A: answers must be **unprompted** — watch for lip-sync delay, off-camera glances, or a third voice
- Agent must use **Ask Question** timestamps — gaps or missing questions are a process flag
- Note if the customer left the screen, received a call, or minimized the app mid-journey`,
      },
      {
        heading: '2. Face match plausibility',
        body: `- Compare **live face capture** vs Aadhaar and PAN photo crops in the report
- Scores are advisory — use judgment: lighting, angle, and age drift can lower scores without fraud
- Red flags: obvious different person, heavy filter/mask, face never stably visible despite agent prompts
- **Approve** if plausibly the same person; **Recapture** if capture quality invalidates the score; **Reject** if clearly different or liveness scripted`,
      },
      {
        heading: '3. Document originality',
        body: `- PAN must be shown **live on camera** — reject photocopies, printouts, or phone-screen displays
- Check for tampering: obscured numbers, glued overlays, inconsistent fonts
- Aadhaar data in the report should match what the agent read aloud (where applicable)
- Signature step: blank paper, pen visible, signature captured in one continuous motion`,
      },
      {
        heading: '4. Location and IP',
        body: `- Report must show **Inside India** and **SAFE IP — VPN and Proxy Not Detected**
- Cross-check lat/long plausibility with customer's stated city
- **Location Outside India** or VPN detected → **Reject** (agent should not have approved)
- If geo passed but customer clearly states they are abroad on the recording → escalate (Compliance doc)`,
      },
      {
        heading: '5. Signature consistency',
        body: `- Signature capture must be legible and match the specimen style on PAN where visible
- **Recapture** for blurry signature, wrong paper, or agent-induced capture quality issues
- **Reject** for refusal to sign, obvious mismatch, or customer signing a pre-printed name`,
      },
      {
        heading: '6. Coaching and impersonation red flags',
        body: `- Third person prompting answers → **Reject** (Suspicious Customer taxonomy)
- Scripted reading, coached pauses, call-centre background noise
- Customer unable to state own DOB/occupation without help
- Document these observations verbatim in remarks — they support downstream SAR/compliance review`,
      },
    ],
  },
  {
    id: 'recapture-vs-reject',
    title: 'Recapture vs Reject Guide',
    icon: AlertCircle,
    updatedDaysAgo: 9,
    sections: [
      {
        heading: '1. The decision principle',
        body: `**Recapture** = a **curable defect** in how the call was captured or completed; repeating the step may succeed without implying wrongdoing.

**Reject** = an **adverse finding or integrity concern**; reattempt does not cure the underlying issue.

This mirrors the agent taxonomy: reasons tagged \`unable\` are generally process failures; reasons tagged \`rejected\` are adverse findings. At audit, you apply the same logic to the **agent's Approved** decision you are reviewing.`,
      },
      {
        heading: '2. Recapture — typical reasons',
        body: `Use when the report/recording shows fixable quality issues:

**Photo Related (capture quality)**
- Low or dim lighting
- Poor camera quality
- Face not clearly visible (angle/backlight/obstruction)

**Document Related**
- Signature capture blurry

**Agent Induced**
- Wrong document captured
- Capture quality unacceptable

**Worked example**: Agent approved but the signature image is unreadable due to glare. → **Recapture** with reason "Signature capture blurry" and remarks describing the glare. Customer reattempts signature only.

**Worked example**: Face match score is low solely because the customer was backlit; liveness Q&A was natural. → **Recapture** for "Face not clearly visible" — not Reject.`,
      },
      {
        heading: '3. Reject — taxonomy-aligned adverse findings',
        body: `Reasons with \`decision: rejected\` in the shared taxonomy:

**Photo Related**
- Face match with Aadhaar photo failed (material mismatch)
- Face match with PAN photo failed
- Liveness check failed (scripted/wrong answers)

**Document Related**
- PAN OCR or verification failed
- Aadhaar data mismatch beyond tolerance
- Signature mismatch or refused to sign
- Original document not shown
- Document tampered or deliberately obscured

**Suspicious Customer**
- 3rd person prompting, coercion, impersonation, scripted answers, staged environment, VPN/location spoofing, customer outside India, same face/device repeat, bank-blocked, abusive conduct

**Worked example**: Customer reads liveness code after a 3-second pause with whispered prompting off-mic. → **Reject** — "3rd person prompting the answers."

**Worked example**: PAN shown is a colour photocopy — edges visible, no hologram. → **Reject** — "Original document not shown."`,
      },
      {
        heading: '4. Approve vs overturn',
        body: `If the agent **Approved** and your review finds no material defect: **Approve** (uphold).

If the agent **Approved** but you find a curable defect they missed: **Recapture**.

If the agent **Approved** but evidence supports an adverse finding: **Reject** — this is the highest-severity overturn and must have precise remarks.

Never **Approve** a case you did not watch sufficiently — partial review is worse than a delayed decision.`,
      },
      {
        heading: '5. Remarks discipline',
        body: `Recapture remarks: state **what** to redo ("Re-capture signature on blank white paper, no shadow").

Reject remarks: state **what you observed** ("Male voice audible coaching DOB answer at 04:12 in recording") — avoid legal conclusions.

Both flow to partner MIS and may be visible to compliance — no abbreviations or internal slang.`,
      },
    ],
  },
  {
    id: 'compliance-escalation',
    title: 'Compliance & Escalation',
    icon: Shield,
    updatedDaysAgo: 12,
    sections: [
      {
        heading: '1. RBI V-CIP audit obligations',
        body: `Regulated entities must maintain **recorded, geo-tagged, consent-based** V-CIP with independent audit. Your decision certifies that the bank's process was followed for that application. Approving a deficient file creates regulatory exposure; rejecting without evidence creates customer-dispute exposure. Both require **documented rationale**.`,
      },
      {
        heading: '2. When to escalate instead of deciding solo',
        body: `Escalate to the **Compliance queue / supervisor** (mark in remarks and hold if your workflow allows) when:

- Impersonation or organised fraud pattern suspected (same device across unrelated apps)
- Customer appears under duress or coercion
- Politically exposed person (PEP) or sanctions hint — do not guess; escalate
- Agent and recording materially conflict and you cannot reconcile
- Location/IP flags contradict each other (e.g., SAFE IP but customer states they are abroad)
- Any request to "approve anyway" from non-supervisor channels — refuse and escalate

Escalation is **not** failure — it protects the bank and you.`,
      },
      {
        heading: '3. Documentation standards for remarks',
        body: `**Do**
- Timestamp references where helpful ("at 03:45 agent zooms PAN — hologram not visible")
- Quote customer/agent words when relevant
- List which checklist item failed
- Separate **observation** from **decision**

**Don't**
- Write "looks fake" without specifics
- Copy-paste generic text across unrelated cases
- Include full Aadhaar numbers (masked last-4 only in reports)
- Use offensive language about customers or agents`,
      },
      {
        heading: '4. Data handling',
        body: `Recordings and reports stay inside the platform. Do not download, screenshot, or share cases on personal channels. Staff identities in partner-facing exports are masked — maintain the same confidentiality internally.`,
      },
      {
        heading: '5. Post-decision audit trail',
        body: `Your decision, reasons, remarks, and decision timestamp are immutable in the demo session store and feed Analytics immediately. Partners see outcomes in scoped reports only — never assume a decision is "internal." Write every remark as if the customer may request it under grievance redressal.`,
      },
    ],
  },
];

const AUDITOR_DOC_MAP = Object.fromEntries(
  AUDITOR_KNOWLEDGE_DOCS.map((doc) => [doc.id, doc]),
) as Record<AuditorKnowledgeDocId, AuditorKnowledgeDoc>;

export function getAuditorKnowledgeDoc(id: string): AuditorKnowledgeDoc | undefined {
  return AUDITOR_DOC_MAP[id as AuditorKnowledgeDocId];
}
