# Cursor Prompt — Admin + Auditor Apps: SBM Ops Feedback Round

> Changes to `apps/admin` and `apps/auditor` (+ shared) from SBM ops review. Companion to the customer/agent prompts of this round (they consume the thresholds config and virtual background added here). Read files before editing.

---

## A. Admin

### A1. Thresholds definitions (Configuration)

New Configuration card **"Verification Thresholds"** — the single definition point for every threshold used anywhere in the VKYC journey (stored in `@vkyc/shared` config; the agent app's gating reads these):

| Threshold | Default |
|---|---|
| Face match with Aadhaar (min %) | 80 |
| Face match with PAN (min %) | 70 |
| Name match (min %) | 85 |
| Liveness — required correct answers | all |
| Geo-fence radius (km) | 50 |
| Geo-fence PIN-prefix fallback | On |
| Aadhaar eKYC validity buffer | 71h 50m |
| Call answer window (reroute) | 2 min |

Editable (sliders/inputs + save toast), each with a ⓘ describing where it's enforced. These thresholds drive **two-state colour coding platform-wide**: every match percentage anywhere (agent workspaces, KYC reports, admin case views) renders green at/above its threshold, red below. Changing a value visibly changes both the coloring and the agent-side gating (demo: lower face-match threshold → previously blocked case becomes approvable and its value flips red→green).

### A2. Live call monitoring: current stage + time in stage

In the Customers → Live tab (and the Home availability drill-down for in-call agents): add columns **Current Stage** (Liveness / Location / Face / Aadhaar / PAN / Signature / Report — live-updating in the demo) and **Time in Stage** (ticking; amber when > 2× the typical stage duration). Overall call progress shown as a compact step-dots indicator per row.

### A3. Phone number: attribute + search + filter

Customer phone number becomes a visible column/attribute in Customer Queue and Call History (and the customer-details modal already shows it). Add phone to the **search** fields (partial match) and a phone filter input in the filter bar. Same in the partner app's scoped Customers view (shared component). Masked format for partner users if masking rules apply (they don't currently — full number is fine per current scope).

### A4. Virtual background management

Configuration card **"Agent Virtual Background"**: upload/select a background image (seed one SBM-branded sample: subtle SBM-blue gradient with logo placeholder), preview, Set active / Remove. Stored in shared config; the agent app renders it behind the agent (companion prompt). Changing it logs a config-audit entry (simple "changed by, at" line on the card).

### A5. Auditor allocation (replaces the open queue — see B1)

Users → Auditors and/or a new "Audit Allocation" view: incoming agent-approved cases are **auto-assigned** to online auditors (round-robin, capacity-aware). Admin can **reallocate** any pending case to another auditor: from the case row → Reallocate → pick auditor → mandatory reason → confirm. Every reallocation writes an audit-trail entry (case, from, to, by whom, when, reason) visible in the case's activity log and a small "Reallocations" log section. Access control: only admins reallocate.

### A6. Verify (no build expected)

Negative states/PIN configuration already exists — verify it renders and saves correctly; no change.

## B. Auditor

### B1. Assigned-cases model (no cherry-picking)

Pending Cases becomes **"My Cases"**: the auditor sees **only cases assigned to them**, FIFO by assignment time. Remove any ability to open unassigned cases. A muted header line shows global context ("Queue: 43 cases across 12 auditors") without listing others' cases. Reassigned-away cases disappear with a toast; newly assigned appear live. Case review itself unchanged (plus zoom inherited via the shared report).

### B2. Audit-trail visibility

Case Review shows an "Assignment" line (assigned at, by rule/by admin, reallocation history if any) above the report.

## Acceptance

1. Thresholds card lists all eight with editable values; lowering face-match threshold demonstrably unblocks a gated agent approval (cross-app check via shared config)
2. Live tab shows Current Stage + ticking Time in Stage per ongoing call; stage-dots progress renders
3. Phone number visible, searchable, and filterable in admin + partner Customers views
4. Virtual background: upload/preview/activate works; agent app reflects it; audit line updates
5. Auto-assignment distributes seeded pending cases across online auditors; admin reallocation with mandatory reason writes the audit trail (visible in activity log + Reallocations log); auditor app shows only own cases and reacts live to reallocation
6. All apps build clean; agent/customer companion prompts' integrations work end-to-end
