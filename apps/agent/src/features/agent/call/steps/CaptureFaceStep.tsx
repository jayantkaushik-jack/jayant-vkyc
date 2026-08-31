import { Button } from '@agent/components/ui/Button';
import { Card } from '@agent/components/ui/Card';
import { ZoomableImage } from '@agent/components/ui/ZoomableImage';
import { StepFooter, CaptureActions } from '@agent/components/call/StepFooter';
import { StepResultChip } from '@agent/features/agent/call/steps/LivelinessStep';

interface CaptureFaceStepProps {
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

export function CaptureFaceStep({
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
}: CaptureFaceStepProps) {
  if (pendingCapture && !capturedImage) {
    return (
      <div className="space-y-4">
        {reviewMode && stepPassed !== null && <StepResultChip passed={stepPassed} />}
        <Card>
          <h3 className="font-semibold text-sm mb-3">Captured Face</h3>
          <ZoomableImage
            src={pendingCapture}
            alt="Captured face"
            className="mx-auto mb-4"
            imgClassName="w-40 h-48 object-cover rounded-xl border"
          />
          {!readOnly && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onRetake}>Retake</Button>
              <Button onClick={onConfirm}>Looks Good</Button>
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (capturedImage) {
    return (
      <div className="space-y-4">
        {reviewMode && stepPassed !== null && <StepResultChip passed={stepPassed} />}
        <Card>
          <h3 className="font-semibold text-sm mb-3">Captured Face</h3>
          <ZoomableImage
            src={capturedImage}
            alt="Captured face"
            className="mx-auto mb-4"
            imgClassName="w-40 h-48 object-cover rounded-xl border"
          />
          {!readOnly && (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onRetake}>Retake</Button>
            </div>
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
        <h3 className="font-semibold text-sm mb-2">Capture Face</h3>
        <p className="text-sm text-text-muted mb-4">
          Position the customer&apos;s face within the oval guide on the video panel, then capture.
        </p>
        {!readOnly && (
          <CaptureActions captureLabel="Capture Face" onCapture={onCapture} onFlip={onFlip} />
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
