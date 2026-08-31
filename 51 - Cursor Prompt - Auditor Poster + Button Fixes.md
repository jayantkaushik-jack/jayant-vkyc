# Cursor Prompt — Auditor: Button Fix, Poster Avatar, Profile + Knowledge Center

> Four changes. The poster change touches the shared `RecordingPoster` component (used by auditor case review and admin View Video) — fix once. The Profile and Knowledge Center sections mirror the agent app — reuse/extract its components rather than rebuilding.

---

## 1. Offline summary card: normal-sized button

The "Go Online" button on the offline session-summary card currently stretches the full card width (huge purple bar). Make it a standard primary button: auto width (~160–200px), centered below the stat grid, normal height (`size="lg"` at most) — consistent with how the agent app's status cards render their buttons. Check the On-a-Break card's Resume button for the same issue and fix if present.

## 2. Recording poster: illustrated customer, no photographic face

In `RecordingPoster` (shared): replace the photographic customer image (`demo/face-live.jpg`) as the main feed with the **customer's professional (DiceBear) avatar** — rendered like a video-call placeholder: dark panel background, the avatar centered at ~96px in a soft circle, customer name beneath in muted text; keep the network badge, timestamp, agent PIP (already illustrated — unchanged), play overlay, and scrub bar exactly as they are.

Scope carefully:
- This changes the **poster only** (auditor case review player, admin View Video modal, agent Call Log recording tab if it uses the same component)
- The **agent app's live-call simulation and capture pipeline keep the photographic assets** (customer video feed, captured face, Aadhaar/PAN photo crops in reports) — face-match scores still need a real face; do not touch `demoAssets` usage outside the poster

## 3. Profile section (mirror the agent app)

Add **Profile** to the auditor sidebar (`/profile`), reusing the agent app's profile page pattern (extract shared pieces to `@vkyc/shared` if still agent-local):

- Identity card: avatar, name, employee ID, email, phone
- Read-only accordions from the auditor's mock record: Personal Information (manager name/ID/email), Branch Information, Work Plan (working days, office timings, break timings), **Audit Scope** (languages, product categories, daily audit capacity — the auditor's analog of the agent's Skill Set; no partner list needed), Leaves
- Extend the auditor generator with any missing fields (manager, branch, work plan, leaves) mirroring agent fields

## 4. Knowledge Center (auditor edition)

Add **Knowledge Center** to the auditor sidebar (`/knowledge`), reusing the agent app's grid + document-viewer components (TOC scrollspy, sections). Four auditor-oriented documents (write full content in the same style/depth as the agent docs):

1. **Auditor Reference Guide** — role of audit in V-CIP, the three decisions (Approve / Recapture / Reject) and when each applies, SLA expectations (review within hours, FIFO queue), how decisions affect agents (accuracy) and customers (reattempt vs terminal)
2. **Audit Review Checklist** — what to verify in the recording + report: liveness responses unprompted, face match plausibility, document originality cues, location/IP flags, signature consistency, red flags for coaching/impersonation
3. **Recapture vs Reject Guide** — the decision principle (curable capture defect → Recapture; adverse finding/integrity → Reject) with the taxonomy's reason lists per decision and worked examples
4. **Compliance & Escalation** — RBI V-CIP audit obligations, when to escalate to compliance instead of deciding solo, documentation standards for remarks (facts, not conclusions)

## Acceptance

1. Offline card: compact centered Go Online button; Break card checked; matches agent-app card styling
2. Auditor case review + admin View Video: poster shows the illustrated customer avatar placeholder (no photographic face anywhere in posters); per-case customer/agent identities still correct
3. Agent app call flow and KYC report imagery unchanged (captured face/PAN photos still photographic)
4. Auditor sidebar shows Pending Cases · Analytics · Profile · Knowledge Center; Profile renders identity + all accordions from real mock data
5. Knowledge Center: four documents, each fully written (no placeholders), TOC scrollspy working; Recapture vs Reject doc consistent with the taxonomy's decision bindings
6. Agent app's Profile/Knowledge pages unaffected by any extraction
7. All apps build clean
