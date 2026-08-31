import { Button } from '@agent/components/ui/Button';
import { Card } from '@agent/components/ui/Card';
import { ZoomableImage } from '@agent/components/ui/ZoomableImage';
import { StepFooter, CaptureActions } from '@agent/components/call/StepFooter';
import { StepResultChip } from '@agent/features/agent/call/steps/LivelinessStep';

interface CaptureSignStepProps {
  reviewMode?: boolean;
  reviewDirty?: boolean;
  stepPassed: boolean | null;
  capturedImage: string | null;
  pendingCapture: string | null;
  remarks: string;
  onRemarksChange: (v: string) => void;
  onCapture: () => void;
  onFlip: () => void;
  onConfirm: () => void;
  onRetake: () => void;
  onComplete: (passed: boolean) => void;
  readOnly?: boolean;
}

export function CaptureSignStep({
  reviewMode,
  reviewDirty,
  stepPassed,
  capturedImage,
  pendingCapture,
  remarks,
  onRemarksChange,
  onCapture,
  onFlip,
  onConfirm,
  onRetake,
  onComplete,
  readOnly,
}: CaptureSignStepProps) {
  if (pendingCapture && !capturedImage) {
    return (
      <Card>
        {reviewMode && stepPassed !== null && <StepResultChip passed={stepPassed} />}
        <h3 className="font-semibold text-sm mb-3">Captured Signature</h3>
        <ZoomableImage
          src={pendingCapture}
          alt="Signature"
          className="mb-4 w-full"
          imgClassName="w-full max-h-32 object-contain rounded-lg border bg-white"
        />
        {!readOnly && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onRetake}>Recapture</Button>
            <Button onClick={onConfirm}>Looks Good</Button>
          </div>
        )}
      </Card>
    );
  }

  if (capturedImage) {
    return (
      <div className="space-y-4">
        {reviewMode && stepPassed !== null && <StepResultChip passed={stepPassed} />}
        <Card>
          <h3 className="font-semibold text-sm mb-3">Captured Signature</h3>
          <ZoomableImage
            src={capturedImage}
            alt="Signature"
            className="mb-4 w-full"
            imgClassName="w-full max-h-32 object-contain rounded-lg border bg-white"
          />
          {!readOnly && (
            <Button variant="secondary" onClick={onRetake}>Recapture</Button>
          )}
        </Card>
        <StepFooter
          remarks={remarks}
          onRemarksChange={onRemarksChange}
          onNext={() => onComplete(!!capturedImage)}
          reviewMode={reviewMode}
          reviewDirty={reviewDirty}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviewMode && stepPassed !== null && <StepResultChip passed={stepPassed} />}
      <Card className="bg-primary-soft border-primary/20">
        <h3 className="font-semibold text-sm mb-2">Capture Signature</h3>
        <p className="text-sm text-text-muted mb-4">
          Ask the customer to sign on blank paper and show it to the camera within the guide box.
        </p>
        {!readOnly && (
          <CaptureActions captureLabel="Capture Signature" onCapture={onCapture} onFlip={onFlip} />
        )}
        {readOnly && (
          <p className="text-xs text-text-muted">Captures are locked after the customer session ends.</p>
        )}
      </Card>
      {reviewMode && (
        <StepFooter
          remarks={remarks}
          onRemarksChange={onRemarksChange}
          onNext={() => onComplete(false)}
          reviewMode={reviewMode}
          reviewDirty={reviewDirty}
        />
      )}
    </div>
  );
}
