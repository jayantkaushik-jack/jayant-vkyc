import { useState, useEffect } from 'react';
import { Check, X, Pencil } from 'lucide-react';
import { Button } from '@agent/components/ui/Button';
import { Card } from '@agent/components/ui/Card';
import { ZoomableImage } from '@agent/components/ui/ZoomableImage';
import { InlineToast } from '@agent/components/ui/Toast';
import { StepFooter, CaptureActions } from '@agent/components/call/StepFooter';
import { StepResultChip } from '@agent/features/agent/call/steps/LivelinessStep';
import { MatchTypeChip, ThresholdChip } from '@agent/features/agent/call/steps/ThresholdChip';
import { computeFieldMatch } from '@vkyc/shared/lib/matchUtils';
import { bandForScore } from '@vkyc/shared/lib/thresholds';
import type { CallSession } from '@vkyc/shared/data/types';
import type { PanOcrData } from '@agent/features/agent/call/CallFlowContext';
import { cn } from '@vkyc/shared/lib/cn';

interface PanStepProps {
  session: CallSession;
  capturedFace: string | null;
  panPhotoCrop: string | null;
  reviewMode?: boolean;
  reviewDirty?: boolean;
  stepPassed: boolean | null;
  capturedPan: string | null;
  pendingCapture: string | null;
  panOcr: PanOcrData;
  panEditedFields: string[];
  panConfirmed: boolean;
  panFaceMatch: boolean | null;
  remarks: string;
  onRemarksChange: (v: string) => void;
  onCapture: () => void;
  onFlip: () => void;
  onPanOcrChange: (data: PanOcrData) => void;
  onEditedFields: (fields: string[]) => void;
  onPanConfirmed: (v: boolean) => void;
  onPanFaceMatch: (v: boolean | null) => void;
  onConfirmCapture: () => void;
  onRetake: () => void;
  onComplete: (passed: boolean) => void;
  readOnly?: boolean;
  nameMatchMin?: number;
  faceMatchMin?: number;
}

export function PanStep({
  session,
  capturedFace,
  panPhotoCrop,
  reviewMode,
  reviewDirty,
  stepPassed,
  capturedPan,
  pendingCapture,
  panOcr,
  panEditedFields,
  panConfirmed,
  panFaceMatch,
  remarks,
  onRemarksChange,
  onCapture,
  onFlip,
  onPanOcrChange,
  onEditedFields,
  onPanConfirmed,
  onPanFaceMatch,
  onConfirmCapture,
  onRetake,
  onComplete,
  readOnly,
  nameMatchMin = 85,
  faceMatchMin = 70,
}: PanStepProps) {
  const { customer } = session;
  const matchScore = session.faceMatchPan;
  const scoreBand = bandForScore(matchScore, faceMatchMin);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(panOcr);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(panOcr);
  }, [panOcr, editing]);

  const saveEdit = () => {
    if (readOnly) return;
    const edited: string[] = [];
    if (draft.panNumber !== customer.panNumber) edited.push('PAN No');
    if (draft.name !== customer.name) edited.push('Name');
    if (draft.fatherName !== customer.fatherName) edited.push("Father's Name");
    if (draft.dob !== customer.dob) edited.push('DOB');
    onPanOcrChange(draft);
    onEditedFields(edited);
    setEditing(false);
  };

  const verificationRows = [
    { field: 'NAME', form: customer.name, pan: panOcr.name, seededPct: 93.52 },
    { field: 'DOB', form: customer.dob, pan: panOcr.dob },
    { field: "FATHER'S NAME", form: customer.fatherName, pan: panOcr.fatherName },
    { field: 'PAN NUMBER', form: customer.panNumber, pan: panOcr.panNumber },
    { field: 'EMAIL', form: customer.email, pan: '—' },
    { field: 'MOBILE NUMBER', form: customer.phone, pan: '—' },
  ].map((r) => {
    const match = computeFieldMatch(r.form, r.pan, {
      fieldLabel: r.field,
      seededPct: r.seededPct,
      nameMatchMin,
    });
    return { ...r, match: match.text, matchType: match.type };
  });

  if (!capturedPan && !pendingCapture) {
    return (
      <div className="space-y-4">
        {reviewMode && stepPassed !== null && <StepResultChip passed={stepPassed} />}
        <ThresholdChip label="Face match (PAN)" score={matchScore} min={faceMatchMin} />
        <Card className="bg-primary-soft border-primary/20">
          <h3 className="font-semibold text-sm mb-2">Capture PAN Card</h3>
          <p className="text-sm text-text-muted mb-4">
            Ask the customer to hold their PAN card up to the camera when aligned in the guide box.
          </p>
          {!readOnly && (
            <CaptureActions captureLabel="Capture PAN Card" onCapture={onCapture} onFlip={onFlip} />
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

  if (pendingCapture && !capturedPan) {
    return (
      <Card>
        {reviewMode && stepPassed !== null && <StepResultChip passed={stepPassed} />}
        <h3 className="font-semibold text-sm mb-3">Captured PAN Card</h3>
        <ZoomableImage
          src={pendingCapture}
          alt="PAN"
          className="mb-4 w-full"
          imgClassName="w-full max-h-40 object-contain rounded-lg border"
        />
        {!readOnly && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onRetake}>Retake</Button>
            <Button onClick={() => { onConfirmCapture(); setShowToast(true); }}>Looks Good</Button>
          </div>
        )}
        {showToast && <InlineToast message="PAN card captured successfully ✓" />}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviewMode && stepPassed !== null && <StepResultChip passed={stepPassed} />}
      <ThresholdChip label="Face match (PAN)" score={matchScore} min={faceMatchMin} />
      {showToast && <InlineToast message="PAN card captured successfully ✓" />}
      <Card>
        {capturedPan && (
          <ZoomableImage
            src={capturedPan}
            alt="PAN"
            className="mb-4 w-full"
            imgClassName="w-full max-h-36 object-contain rounded-lg border"
          />
        )}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">OCR Details</h3>
          {!editing && !readOnly && (
            <button type="button" onClick={() => { setDraft(panOcr); setEditing(true); }} className="text-primary p-1">
              <Pencil size={16} />
            </button>
          )}
        </div>
        {editing && !readOnly ? (
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            {(['panNumber', 'name', 'fatherName', 'dob'] as const).map((key) => (
              <div key={key}>
                <label className="text-text-muted text-xs capitalize">{key}</label>
                <input
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                  className="w-full px-2 py-2 rounded border border-border text-sm mt-0.5"
                />
              </div>
            ))}
            <div className="col-span-2 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={saveEdit}>Save</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            {[
              ['PAN No', panOcr.panNumber],
              ['Name', panOcr.name],
              ["Father's Name", panOcr.fatherName],
              ['DOB', panOcr.dob],
            ].map(([label, val]) => (
              <div key={label as string}>
                <span className="text-text-muted">{label}</span>
                <p className="flex items-center gap-1">
                  {val}
                  {panEditedFields.includes(label as string) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" title="Edited by agent" />
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
        {!panConfirmed && !editing && !readOnly && (
          <Button onClick={() => onPanConfirmed(true)}>Confirm</Button>
        )}
      </Card>

      {(panConfirmed || reviewMode || readOnly) && capturedPan && (
        <>
          <Card>
            <h3 className="font-semibold text-sm mb-3">Verification Table</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-text-muted border-b border-border">
                    <th className="text-left py-2 pr-2">User Detail</th>
                    <th className="text-left py-2 pr-2">Applicant Form Data</th>
                    <th className="text-left py-2 pr-2">PAN Data</th>
                    <th className="text-left py-2">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {verificationRows.map((r) => (
                    <tr key={r.field} className="border-b border-border/50 align-top">
                      <td className="py-2 pr-2">{r.field}</td>
                      <td className="py-2 pr-2">{r.form}</td>
                      <td className="py-2 pr-2">{r.pan}</td>
                      <td className="py-2">
                        <MatchTypeChip value={r.match} type={r.matchType} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-success mt-3">PAN Status: ✓ Verified</p>
          </Card>

          <Card>
            <h3 className="font-semibold text-sm mb-3">Face Match — PAN Photo</h3>
            <div className="flex gap-4 items-center mb-3">
              {capturedFace && (
                <div className="text-center">
                  <ZoomableImage
                    src={capturedFace}
                    alt="Captured"
                    imgClassName="w-20 h-24 object-cover rounded-lg border"
                  />
                  <p className="text-xs mt-1">Captured Face</p>
                </div>
              )}
              {panPhotoCrop && (
                <div className="text-center">
                  <ZoomableImage
                    src={panPhotoCrop}
                    alt="PAN photo"
                    imgClassName="w-20 h-24 object-cover rounded-lg border"
                  />
                  <p className="text-xs mt-1">PAN Photo</p>
                </div>
              )}
              <div>
                <p className={cn(
                  'text-sm font-medium',
                  scoreBand === 'green' ? 'text-success'
                    : scoreBand === 'amber' ? 'text-warning'
                      : scoreBand === 'red' ? 'text-danger' : '',
                )}>
                  Match Score: {matchScore.toFixed(2)}%
                </p>
                <p className="text-xs text-text-muted">Threshold ≥ {faceMatchMin}%</p>
                <p className="text-sm text-text-muted mt-1">Does the face match with the face on PAN Card?</p>
              </div>
            </div>
            {!readOnly && (
              <div className="flex gap-2">
                <Button size="sm" variant={panFaceMatch === true ? 'success' : 'secondary'} onClick={() => onPanFaceMatch(true)}>
                  <Check size={14} /> Yes
                </Button>
                <Button size="sm" variant={panFaceMatch === false ? 'destructive' : 'secondary'} onClick={() => onPanFaceMatch(false)}>
                  <X size={14} /> No
                </Button>
              </div>
            )}
            {readOnly && panFaceMatch != null && (
              <p className={cn('text-sm font-medium', panFaceMatch ? 'text-success' : 'text-danger')}>
                {panFaceMatch ? 'Yes' : 'No'}
              </p>
            )}
          </Card>

          <StepFooter
            remarks={remarks}
            onRemarksChange={onRemarksChange}
            onNext={() => onComplete(panFaceMatch === true)}
            nextDisabled={panFaceMatch === null}
            reviewMode={reviewMode}
            reviewDirty={reviewDirty}
          />
        </>
      )}
    </div>
  );
}
