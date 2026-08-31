import { Button } from '@agent/components/ui/Button';

interface StepFooterProps {
  remarks: string;
  onRemarksChange: (v: string) => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  reviewMode?: boolean;
  reviewDirty?: boolean;
}

export function StepFooter({
  remarks,
  onRemarksChange,
  onNext,
  nextLabel = 'Next',
  nextDisabled = false,
  reviewMode,
  reviewDirty,
}: StepFooterProps) {
  const label = reviewMode
    ? reviewDirty
      ? 'Save & Return to Current Step'
      : 'Return to Current Step'
    : nextLabel;

  return (
    <div className="mt-6 pt-4 border-t border-border space-y-3">
      <div>
        <label className="block text-sm text-text-muted mb-1.5">Add Remarks (optional)</label>
        <input
          type="text"
          value={remarks}
          onChange={(e) => onRemarksChange(e.target.value)}
          placeholder="Add remarks for this step..."
          className="w-full px-3 py-2 rounded-lg border border-border text-sm"
        />
      </div>
      <Button className="w-full" onClick={onNext} disabled={nextDisabled}>
        {label}
      </Button>
    </div>
  );
}

interface CaptureActionsProps {
  captureLabel: string;
  onCapture: () => void;
  onFlip: () => void;
  disabled?: boolean;
}

export function CaptureActions({ captureLabel, onCapture, onFlip, disabled }: CaptureActionsProps) {
  return (
    <div className="flex gap-3">
      <Button onClick={onCapture} disabled={disabled}>{captureLabel}</Button>
      <Button variant="secondary" onClick={onFlip}>
        <span className="inline-flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" />
            <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
            <polyline points="8 12 11 9 8 6" />
            <polyline points="16 12 13 15 16 18" />
          </svg>
          Flip Camera
        </span>
      </Button>
    </div>
  );
}
