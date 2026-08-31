import { Check, X } from 'lucide-react';
import { Button } from '@agent/components/ui/Button';
import { Card } from '@agent/components/ui/Card';
import { ZoomableImage } from '@agent/components/ui/ZoomableImage';
import { StepFooter } from '@agent/components/call/StepFooter';
import { formatAddress } from '@vkyc/shared/lib/format';
import { computeFieldMatch } from '@vkyc/shared/lib/matchUtils';
import { DEMO_ASSETS } from '@vkyc/shared/lib/demoAssets';
import type { CallSession } from '@vkyc/shared/data/types';
import { StepResultChip } from '@agent/features/agent/call/steps/LivelinessStep';
import { MatchTypeChip, ThresholdChip } from '@agent/features/agent/call/steps/ThresholdChip';
import { cn } from '@vkyc/shared/lib/cn';
import { bandForScore } from '@vkyc/shared/lib/thresholds';

interface AadhaarStepProps {
  session: CallSession;
  capturedFace: string | null;
  reviewMode?: boolean;
  reviewDirty?: boolean;
  stepPassed: boolean | null;
  faceMatch: boolean | null;
  remarks: string;
  onRemarksChange: (v: string) => void;
  onFaceMatch: (v: boolean | null) => void;
  onComplete: (passed: boolean) => void;
  readOnly?: boolean;
  nameMatchMin?: number;
  faceMatchMin?: number;
}

export function AadhaarStep({
  session,
  capturedFace,
  reviewMode,
  reviewDirty,
  stepPassed,
  faceMatch,
  remarks,
  onRemarksChange,
  onFaceMatch,
  onComplete,
  readOnly,
  nameMatchMin = 85,
  faceMatchMin = 80,
}: AadhaarStepProps) {
  const { customer } = session;
  const matchScore = session.faceMatchAadhaar;
  const faceImg = capturedFace ?? DEMO_ASSETS.faceLive;
  const scoreBand = bandForScore(matchScore, faceMatchMin);

  const fieldRows = [
    { label: 'NAME', form: customer.name, aadhaar: customer.name, seededPct: 93.52 },
    { label: "FATHER'S NAME", form: customer.fatherName, aadhaar: '—' },
    { label: 'DOB', form: customer.dob, aadhaar: customer.dob },
    { label: 'GENDER', form: customer.gender, aadhaar: customer.gender },
    { label: 'CURRENT ADDRESS', form: formatAddress(customer.currentAddress), aadhaar: formatAddress(customer.currentAddress), forcePercent: true },
    { label: 'PERMANENT ADDRESS', form: formatAddress(customer.permanentAddress), aadhaar: formatAddress(customer.permanentAddress), forcePercent: true },
    { label: 'MOBILE NUMBER', form: customer.phone, aadhaar: customer.phone },
    { label: 'EMAIL', form: customer.email, aadhaar: '—' },
  ];

  const rows = fieldRows.map((r) => {
    const match = computeFieldMatch(r.form, r.aadhaar, {
      fieldLabel: r.label,
      seededPct: r.seededPct,
      nameMatchMin,
      forcePercent: r.forcePercent,
    });
    return { ...r, match: match.text, matchType: match.type };
  });

  return (
    <div className="space-y-4">
      {reviewMode && stepPassed !== null && <StepResultChip passed={stepPassed} />}
      <ThresholdChip label="Face match (Aadhaar)" score={matchScore} min={faceMatchMin} />

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg text-xs text-text-muted">
              <th className="text-left p-3 font-medium w-[18%]">Field</th>
              <th className="text-left p-3 font-medium w-[28%] bg-accent-subtle/60">Applicant Form Data</th>
              <th className="text-left p-3 font-medium w-[28%]">Aadhaar Data</th>
              <th className="text-left p-3 font-medium w-[16%]">Match</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-border/60 align-top">
                <td className="p-3 font-medium text-left align-top">{r.label}</td>
                <td className="p-3 text-left align-top bg-accent-subtle/40">{r.form}</td>
                <td className="p-3 text-left align-top">{r.aadhaar}</td>
                <td className="p-3 text-left align-top">
                  <MatchTypeChip value={r.match} type={r.matchType} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-text-muted">
        Generation Date: {customer.aadhaarGenerationDate} ✓
      </p>

      <Card>
        <h3 className="font-semibold text-sm mb-3">Face Match — Aadhaar Photo</h3>
        <div className="flex gap-4 items-center mb-3">
          <div className="text-center">
            <ZoomableImage src={faceImg} alt="Captured" imgClassName="w-20 h-24 object-cover rounded-lg border" />
            <p className="text-xs mt-1">Captured Image</p>
          </div>
          <div className="text-center">
            <ZoomableImage
              src={DEMO_ASSETS.faceAadhaar}
              alt="Aadhaar"
              imgClassName="w-20 h-24 object-cover rounded-lg border grayscale"
            />
            <p className="text-xs mt-1">Aadhaar Image</p>
          </div>
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
            <p className="text-sm text-text-muted mt-1">Does the face match with the Aadhaar Photo?</p>
          </div>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button size="sm" variant={faceMatch === true ? 'success' : 'secondary'} onClick={() => onFaceMatch(true)}>
              <Check size={14} /> Yes
            </Button>
            <Button size="sm" variant={faceMatch === false ? 'destructive' : 'secondary'} onClick={() => onFaceMatch(false)}>
              <X size={14} /> No
            </Button>
          </div>
        )}
        {readOnly && faceMatch != null && (
          <p className={cn('text-sm font-medium', faceMatch ? 'text-success' : 'text-danger')}>
            {faceMatch ? 'Yes' : 'No'}
          </p>
        )}
      </Card>

      <StepFooter
        remarks={remarks}
        onRemarksChange={onRemarksChange}
        onNext={() => onComplete(faceMatch === true)}
        nextDisabled={faceMatch === null}
        reviewMode={reviewMode}
        reviewDirty={reviewDirty}
      />
    </div>
  );
}
