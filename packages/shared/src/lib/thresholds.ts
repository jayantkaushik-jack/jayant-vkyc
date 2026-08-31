import type { VerificationThresholds, VirtualBackgroundConfig } from '../data/types';

export const DEFAULT_THRESHOLDS: VerificationThresholds = {
  faceMatchAadhaarMin: 80,
  faceMatchPanMin: 70,
  nameMatchMin: 85,
  livenessRequireAll: true,
  geoFenceRadiusKm: 50,
  geoFencePinPrefixEnabled: true,
  ekycValidityBufferMin: 71 * 60 + 50, // 71h 50m
  callAnswerWindowSec: 120,
};

export const DEFAULT_VIRTUAL_BACKGROUND: VirtualBackgroundConfig = {
  activeUrl: null,
  label: null,
  changedBy: null,
  changedAt: null,
};

/** Seeded SBM-branded sample (CSS gradient data URL). */
export const SBM_SAMPLE_VIRTUAL_BACKGROUND =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0B3A6E"/>
          <stop offset="55%" stop-color="#1E5A9A"/>
          <stop offset="100%" stop-color="#2E7D32"/>
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#g)"/>
      <text x="320" y="180" text-anchor="middle" fill="rgba(255,255,255,0.35)" font-family="system-ui,sans-serif" font-size="36" font-weight="600">SBM Bank</text>
    </svg>`,
  );

export type ThresholdBand = 'green' | 'amber' | 'red' | 'gray';

export function bandForScore(score: number | null | undefined, min: number): ThresholdBand {
  if (score == null || Number.isNaN(score)) return 'gray';
  if (score >= min) return 'green';
  if (score >= min - 10) return 'amber';
  return 'red';
}

export function formatThresholdChip(
  score: number,
  min: number,
): { text: string; type: ThresholdBand } {
  return { text: `${score.toFixed(2)}%`, type: bandForScore(score, min) };
}

export interface ValidationCheck {
  id: string;
  label: string;
  value: string;
  threshold: string;
  passed: boolean;
}

export function evaluateApprovalGates(input: {
  faceMatchAadhaar: number;
  faceMatchPan: number;
  nameMatchPct: number;
  livenessAllCorrect: boolean;
  thresholds: VerificationThresholds;
}): ValidationCheck[] {
  const t = input.thresholds;
  // Geo-fence is enforced pre-call (rejected customers never reach an agent).
  return [
    {
      id: 'face_aadhaar',
      label: 'Face match (Aadhaar)',
      value: `${input.faceMatchAadhaar.toFixed(2)}%`,
      threshold: `≥ ${t.faceMatchAadhaarMin}%`,
      passed: input.faceMatchAadhaar >= t.faceMatchAadhaarMin,
    },
    {
      id: 'face_pan',
      label: 'Face match (PAN)',
      value: `${input.faceMatchPan.toFixed(2)}%`,
      threshold: `≥ ${t.faceMatchPanMin}%`,
      passed: input.faceMatchPan >= t.faceMatchPanMin,
    },
    {
      id: 'name',
      label: 'Name match',
      value: `${input.nameMatchPct.toFixed(2)}%`,
      threshold: `≥ ${t.nameMatchMin}%`,
      passed: input.nameMatchPct >= t.nameMatchMin,
    },
    {
      id: 'liveness',
      label: 'Liveness',
      value: input.livenessAllCorrect ? 'All correct' : 'Incomplete / incorrect',
      threshold: t.livenessRequireAll ? 'All answers required' : 'Optional',
      passed: !t.livenessRequireAll || input.livenessAllCorrect,
    },
  ];
}
