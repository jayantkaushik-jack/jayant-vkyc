/**
 * Weighted signal scoring per the source thesis (Section 8 of the build brief).
 *
 * A signal that never fired is excluded from both the numerator and the
 * denominator — never scored as zero. Zeroing would let an absent signal
 * dilute real evidence, which is exactly the "rubber-stamp" failure mode the
 * source doc calls out (green must require positive corroboration, not
 * merely the absence of contradiction).
 */

export type SignalKey =
  | 'explanationQuality'
  | 'timelineArithmetic'
  | 'thirdPartyInvolvement'
  | 'corroboratingChecks';

export const SIGNAL_WEIGHTS: Record<SignalKey, number> = {
  explanationQuality: 0.4,
  timelineArithmetic: 0.25,
  thirdPartyInvolvement: 0.2,
  corroboratingChecks: 0.15,
};

export type Signals = Partial<Record<SignalKey, number>>;

export type Band = 'PROCEED' | 'STEP_UP' | 'BLOCK';

export function computeScore(signals: Signals): number | null {
  let numerator = 0;
  let denominator = 0;
  for (const key of Object.keys(signals) as SignalKey[]) {
    const value = signals[key];
    if (value === undefined) continue;
    numerator += value * SIGNAL_WEIGHTS[key];
    denominator += SIGNAL_WEIGHTS[key];
  }
  if (denominator === 0) return null;
  return numerator / denominator;
}

export function bandForScore(score: number): Band {
  if (score < -0.35) return 'BLOCK';
  if (score > 0.35) return 'PROCEED';
  return 'STEP_UP';
}

export const BAND_LABEL: Record<Band, string> = {
  PROCEED: 'PROCEED',
  STEP_UP: 'STEP-UP',
  BLOCK: 'BLOCK',
};
