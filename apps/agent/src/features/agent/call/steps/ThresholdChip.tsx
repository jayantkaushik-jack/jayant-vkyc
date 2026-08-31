import { cn } from '@vkyc/shared/lib/cn';
import { bandForScore, type ThresholdBand } from '@vkyc/shared/lib/thresholds';

export function ThresholdChip({
  score,
  min,
  label,
  passedOverride,
}: {
  score?: number | null;
  min?: number;
  label?: string;
  /** For non-numeric checks (liveness / geo). */
  passedOverride?: boolean;
}) {
  let band: ThresholdBand = 'gray';
  let text = '—';

  if (passedOverride != null) {
    band = passedOverride ? 'green' : 'red';
    text = passedOverride ? 'Pass' : 'Fail';
  } else if (score != null && min != null) {
    band = bandForScore(score, min);
    text = `${score.toFixed(2)}% / ≥ ${min}%`;
  }

  const cls =
    band === 'green' ? 'bg-success-subtle text-success-strong border-success-subtle'
      : band === 'amber' ? 'bg-warning-subtle text-warning-text border-warning-border'
      : band === 'red' ? 'bg-danger-subtle text-danger border-danger'
      : 'bg-bg text-text-muted border-border';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {label && <span className="text-xs text-text-muted">{label}</span>}
      <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-medium border', cls)}>
        {text}
      </span>
    </div>
  );
}

export function MatchTypeChip({
  value,
  type,
}: {
  value: string;
  type: 'green' | 'amber' | 'red' | 'gray';
}) {
  const cls =
    type === 'green' ? 'bg-success-subtle text-success-strong border-success-subtle'
      : type === 'amber' ? 'bg-warning-subtle text-warning-text border-warning-border'
      : type === 'red' ? 'bg-danger-subtle text-danger border-danger'
      : 'bg-bg text-text-muted border-border';
  return (
    <span className={cn('inline-flex items-center h-6 px-2 rounded text-xs font-medium border align-top', cls)}>
      {value}
    </span>
  );
}
