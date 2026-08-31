export interface RejectionCategory {
  id: string;
  label: string;
  reasons: string[];
}

export type ReasonDecisionClass = 'unable' | 'rejected' | 'dropped';

export interface RejectionReasonItem {
  id: string;
  label: string;
  /** Chart-only abbreviated label (≤26 chars). Full label used in tables/modals. */
  shortLabel: string;
  categoryId: string;
  category: string;
  decision: ReasonDecisionClass;
}

// Unable to Verify = process couldn't complete, no adverse finding, customer may reattempt.
// Rejected = adverse finding or integrity concern; reattempt doesn't cure it.
export const REJECTION_REASONS: RejectionReasonItem[] = [
  // Technical (unable)
  { id: 'tech-poor-internet', label: 'Poor internet connection', shortLabel: 'Poor internet', categoryId: 'technical', category: 'Technical', decision: 'unable' },
  { id: 'tech-audio-unclear', label: 'Audio not clear / one-way audio', shortLabel: 'Audio unclear', categoryId: 'technical', category: 'Technical', decision: 'unable' },
  { id: 'tech-video-frozen', label: 'Video frozen or black screen', shortLabel: 'Video frozen', categoryId: 'technical', category: 'Technical', decision: 'unable' },
  { id: 'tech-disconnected-mid-journey', label: 'Call disconnected mid-journey', shortLabel: 'Disconnected mid-call', categoryId: 'technical', category: 'Technical', decision: 'unable' },
  { id: 'tech-platform-error', label: 'Platform or session error', shortLabel: 'Platform error', categoryId: 'technical', category: 'Technical', decision: 'unable' },

  // Photo (unable)
  { id: 'photo-low-light', label: 'Low or dim lighting', shortLabel: 'Low lighting', categoryId: 'photo', category: 'Photo Related', decision: 'unable' },
  { id: 'photo-poor-camera', label: 'Poor camera quality', shortLabel: 'Poor camera', categoryId: 'photo', category: 'Photo Related', decision: 'unable' },
  { id: 'photo-face-not-clear', label: 'Face not clearly visible (angle/backlight/obstruction)', shortLabel: 'Face not clear', categoryId: 'photo', category: 'Photo Related', decision: 'unable' },
  { id: 'photo-noisy-background', label: 'Excessive background noise', shortLabel: 'Background noise', categoryId: 'photo', category: 'Photo Related', decision: 'unable' },

  // Document (unable)
  { id: 'doc-pan-not-available', label: 'PAN card not available at the time of the call', shortLabel: 'PAN not available', categoryId: 'document', category: 'Document Related', decision: 'unable' },
  { id: 'doc-sign-material-missing', label: 'Blank paper/pen not available for signature', shortLabel: 'Sign materials missing', categoryId: 'document', category: 'Document Related', decision: 'unable' },
  { id: 'doc-sign-capture-blurry', label: 'Signature capture blurry', shortLabel: 'Signature blurry', categoryId: 'document', category: 'Document Related', decision: 'unable' },

  // Customer (unable)
  { id: 'cust-process-unknown', label: "User doesn't know about the process", shortLabel: 'Process unknown', categoryId: 'customer', category: 'Customer Related', decision: 'unable' },
  { id: 'cust-screen-left', label: 'Customer minimized the screen, locked the device, or received an incoming call (did not return)', shortLabel: 'Screen left / no return', categoryId: 'customer', category: 'Customer Related', decision: 'unable' },
  { id: 'cust-in-transit', label: 'Customer in transit / unstable location', shortLabel: 'In transit', categoryId: 'customer', category: 'Customer Related', decision: 'unable' },
  { id: 'cust-accessibility', label: 'Customer is DEAF/DUMB/BLIND (route to assisted channel)', shortLabel: 'Accessibility issue', categoryId: 'customer', category: 'Customer Related', decision: 'unable' },
  { id: 'cust-language-mismatch', label: 'Preferred-language mismatch', shortLabel: 'Language mismatch', categoryId: 'customer', category: 'Customer Related', decision: 'unable' },
  { id: 'cust-reschedule', label: 'Customer requested reschedule / ran out of time', shortLabel: 'Reschedule requested', categoryId: 'customer', category: 'Customer Related', decision: 'unable' },

  // Agent induced (unable)
  { id: 'agent-wrong-doc', label: 'Wrong document captured', shortLabel: 'Wrong document', categoryId: 'agent_induced', category: 'Agent Induced', decision: 'unable' },
  { id: 'agent-capture-quality', label: 'Capture quality unacceptable', shortLabel: 'Capture quality', categoryId: 'agent_induced', category: 'Agent Induced', decision: 'unable' },
  { id: 'agent-verification-error', label: 'Agent error during verification', shortLabel: 'Agent error', categoryId: 'agent_induced', category: 'Agent Induced', decision: 'unable' },

  // Verification failures (rejected)
  { id: 'rej-face-aadhaar-mismatch', label: 'Face match with Aadhaar photo failed', shortLabel: 'Aadhaar face match failed', categoryId: 'photo', category: 'Photo Related', decision: 'rejected' },
  { id: 'rej-face-pan-mismatch', label: 'Face match with PAN photo failed', shortLabel: 'PAN face match failed', categoryId: 'photo', category: 'Photo Related', decision: 'rejected' },
  { id: 'rej-liveness-failed', label: "Liveness check failed (wrong/scripted answers, couldn't read code)", shortLabel: 'Liveness check failed', categoryId: 'photo', category: 'Photo Related', decision: 'rejected' },
  { id: 'rej-pan-ocr-failed', label: 'PAN OCR or verification failed', shortLabel: 'PAN OCR failed', categoryId: 'document', category: 'Document Related', decision: 'rejected' },
  { id: 'rej-aadhaar-mismatch', label: 'Aadhaar data mismatch beyond tolerance', shortLabel: 'Aadhaar data mismatch', categoryId: 'document', category: 'Document Related', decision: 'rejected' },
  { id: 'rej-sign-mismatch', label: 'Signature mismatch or refused to sign', shortLabel: 'Signature mismatch', categoryId: 'document', category: 'Document Related', decision: 'rejected' },
  { id: 'rej-original-not-shown', label: 'Original document not shown (photocopy/print/screen)', shortLabel: 'Original doc not shown', categoryId: 'document', category: 'Document Related', decision: 'rejected' },
  { id: 'rej-document-tampered', label: 'Document tampered or deliberately obscured', shortLabel: 'Document tampered', categoryId: 'document', category: 'Document Related', decision: 'rejected' },

  // Suspicious customer (rejected)
  { id: 'sus-third-person', label: '3rd person prompting the answers', shortLabel: '3rd person prompting', categoryId: 'suspicious', category: 'Suspicious Customer', decision: 'rejected' },
  { id: 'sus-coerced', label: 'Customer appears coerced or under duress', shortLabel: 'Appears coerced', categoryId: 'suspicious', category: 'Suspicious Customer', decision: 'rejected' },
  { id: 'sus-impersonation', label: 'Impersonation suspected', shortLabel: 'Impersonation suspected', categoryId: 'suspicious', category: 'Suspicious Customer', decision: 'rejected' },
  { id: 'sus-scripted', label: 'Customer reading answers from a script', shortLabel: 'Reading from script', categoryId: 'suspicious', category: 'Suspicious Customer', decision: 'rejected' },
  { id: 'sus-staged-env', label: 'Suspicious environment (staged/call-center setup)', shortLabel: 'Suspicious environment', categoryId: 'suspicious', category: 'Suspicious Customer', decision: 'rejected' },
  { id: 'sus-vpn', label: 'VPN or proxy detected / location spoofing', shortLabel: 'VPN / location spoofing', categoryId: 'suspicious', category: 'Suspicious Customer', decision: 'rejected' },
  { id: 'sus-outside-india', label: 'Customer found outside India during the call', shortLabel: 'Customer outside India', categoryId: 'suspicious', category: 'Suspicious Customer', decision: 'rejected' },
  { id: 'sus-same-face-device', label: 'Same face/device across unrelated applications', shortLabel: 'Same face/device repeat', categoryId: 'suspicious', category: 'Suspicious Customer', decision: 'rejected' },
  { id: 'sus-bank-blocked', label: 'Customer blocked by the bank', shortLabel: 'Bank blocked', categoryId: 'suspicious', category: 'Suspicious Customer', decision: 'rejected' },
  { id: 'sus-abusive', label: 'Abusive or threatening conduct', shortLabel: 'Abusive conduct', categoryId: 'suspicious', category: 'Suspicious Customer', decision: 'rejected' },

  // Connection/drop synthetic (dropped)
  { id: 'drop-disconnected', label: 'Customer disconnected before call completion', shortLabel: 'Disconnected pre-complete', categoryId: 'connection_drop', category: 'Connection/Drop', decision: 'dropped' },
];

/** Drop-stage labels for User Dropped charts (already short; chart-only overrides where needed). */
const DROP_STAGE_SHORT_LABELS: Record<string, string> = {
  'Before connecting': 'Before connecting',
  'Pre-call checks': 'Pre-call checks',
  Liveliness: 'Liveliness',
  Location: 'Location',
  'Face Capture': 'Face Capture',
  Aadhaar: 'Aadhaar',
  PAN: 'PAN',
  Signature: 'Signature',
  Report: 'Report',
};

const CATEGORY_ORDER = ['technical', 'photo', 'customer', 'document', 'suspicious', 'agent_induced', 'connection_drop'];

export const REJECTION_CATEGORIES: RejectionCategory[] = CATEGORY_ORDER
  .map((categoryId) => {
    const rows = REJECTION_REASONS.filter((r) => r.categoryId === categoryId);
    if (rows.length === 0) return null;
    return {
      id: categoryId,
      label: rows[0].category,
      reasons: rows.map((r) => r.label),
    } satisfies RejectionCategory;
  })
  .filter((v): v is RejectionCategory => !!v);

const REASON_BY_LABEL = new Map(REJECTION_REASONS.map((r) => [r.label.toLowerCase(), r]));

/** Chart-only label — full text remains in tables, modals, and tooltips. */
export function getReasonChartShortLabel(fullLabel: string): string {
  const meta = REASON_BY_LABEL.get(fullLabel.toLowerCase());
  if (meta) return meta.shortLabel;
  return DROP_STAGE_SHORT_LABELS[fullLabel] ?? fullLabel;
}

export function getReasonMeta(reasonLabel: string): RejectionReasonItem | null {
  return REASON_BY_LABEL.get(reasonLabel.toLowerCase()) ?? null;
}

export function getReasonsByDecision(decision: Exclude<ReasonDecisionClass, 'dropped'>): RejectionReasonItem[] {
  return REJECTION_REASONS.filter((r) => r.decision === decision);
}

export const AUDITOR_RECAPTURE_REASON_IDS = new Set([
  'photo-low-light',
  'photo-poor-camera',
  'agent-capture-quality',
  'doc-sign-capture-blurry',
]);

export interface SelectedRejectionReasons {
  selections: { category: string; reasons: string[] }[];
  remarks: string;
}

export function formatRejectionSummary(selected: SelectedRejectionReasons): string {
  const parts = selected.selections.flatMap((s) =>
    s.reasons.map((r) => `${s.category}: ${r}`),
  );
  return parts.join('; ');
}
