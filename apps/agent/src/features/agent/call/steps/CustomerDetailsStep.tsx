import { useState } from 'react';
import { Camera, Volume2 } from 'lucide-react';
import { Button } from '@agent/components/ui/Button';
import { Card } from '@agent/components/ui/Card';
import { DetailRow } from '@agent/features/agent/call/StepWorkspace';
import type { Customer } from '@vkyc/shared/data/types';
import type { PreCheckState } from '@agent/features/agent/call/CallFlowContext';
import { cn } from '@vkyc/shared/lib/cn';
import { getInitials } from '@vkyc/shared/lib/avatar';
import type { AmberPersona } from '@agent/features/agent/call/amber/personas';
import { DimensionList } from '@agent/components/risk/RiskSnapshotModal';

interface CustomerDetailsStepProps {
  customer: Customer;
  persona: AmberPersona;
  onProceed: (checks: PreCheckState) => void;
}

type CheckKey = 'videoVisible' | 'audible';
type CheckValue = 'yes' | 'no' | null;

/**
 * Display-only masking for the Customer Details panel — the underlying
 * synthetic data is untouched (other steps, like the liveness Q&A, still
 * use the real generated values), but anything realistic-looking enough to
 * be mistaken for a real customer's details on a shared screen gets an
 * obviously-dummy pattern here.
 */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (digits.length < 10) return 'XXXXXXXXXX';
  return `${digits.slice(0, 2)}XXXXXX${digits.slice(8)}`;
}

const MASKED_EMAIL = 'applicant_demo@example.com';

function maskAddressLine(addr: { city: string; state: string; pincode: string }): string {
  return `House No. XX, Sample Road, ${addr.city}, ${addr.state} - ${addr.pincode}`;
}

export function CustomerDetailsStep({ customer, persona, onProceed }: CustomerDetailsStepProps) {
  const [checks, setChecks] = useState<Record<CheckKey, CheckValue>>({
    videoVisible: null,
    audible: null,
  });

  const setCheck = (key: CheckKey, value: 'yes' | 'no') => {
    setChecks((prev) => ({ ...prev, [key]: value }));
  };

  const allYes = checks.videoVisible === 'yes' && checks.audible === 'yes';
  const hasNo = checks.videoVisible === 'no' || checks.audible === 'no';

  return (
    <div className="p-5 space-y-5 overflow-y-auto">
      <div className="flex flex-wrap gap-2 items-center">
        <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-bg text-text border border-border">
          Onboarding Channel: {persona.onboardingChannel}
        </span>
      </div>

      <DimensionList dimensions={persona.riskSnapshot.dimensions} />

      <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-accent-subtle text-accent">
        Language selected by customer: {customer.language}
      </span>

      <div className="grid sm:grid-cols-2 gap-4">
        {([
          ['videoVisible', 'Video Visible', Camera, 'accent'],
          ['audible', 'Audible', Volume2, 'success'],
        ] as const).map(([key, label, Icon, hue]) => {
          const solid = hue === 'accent' ? 'bg-accent' : 'bg-success';
          // `!` beats Card's own bg-surface — cn() here is plain concatenation, not tailwind-merge, so two same-property classes would otherwise depend on unpredictable stylesheet source order.
          const subtleBg = hue === 'accent' ? '!bg-accent-subtle' : '!bg-success-subtle';
          const text = hue === 'accent' ? 'text-accent' : 'text-success-strong';
          const border = hue === 'accent' ? 'border-accent' : 'border-success';
          const hoverBorder = hue === 'accent' ? 'hover:border-accent/40' : 'hover:border-success/40';
          return (
            <Card key={key} padding className={cn('space-y-3', subtleBg)}>
              <div className="flex items-center gap-2">
                <span className={cn('inline-flex items-center justify-center w-7 h-7 rounded-full text-white shrink-0', solid)}>
                  <Icon size={14} />
                </span>
                <p className="text-sm font-medium">{label}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCheck(key, 'yes')}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                    checks[key] === 'yes' ? cn(solid, 'text-white', border) : cn('bg-surface border-border', hoverBorder),
                  )}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setCheck(key, 'no')}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium border bg-surface transition-colors',
                    checks[key] === 'no' ? cn(border, text) : cn('border-border', hoverBorder),
                  )}
                >
                  No
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {hasNo && (
        <p className="text-sm text-warning bg-warning-subtle border border-warning-border rounded-lg px-3 py-2">
          Ask the customer to adjust camera/audio, or report an issue.
        </p>
      )}

      <Card>
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-accent text-white text-xs font-semibold shrink-0">
            {getInitials(customer.name)}
          </span>
          <div>
            <p className="font-semibold text-sm">{customer.name}</p>
            <p className="text-xs text-text-muted">{customer.customerStatus} applicant · {customer.productType}</p>
          </div>
        </div>

        <DetailSection label="Identity" dotClass="bg-accent" labelClass="text-accent">
          <DetailRow label="Gender" value={customer.gender} />
          <DetailRow label="DOB" value={customer.dob} />
          <DetailRow label="Father's Name" value={customer.fatherName} />
          <DetailRow label="Mobile No." value={maskPhone(customer.phone)} />
        </DetailSection>

        <DetailSection label="Contact & Address" dotClass="bg-success" labelClass="text-success-strong">
          <DetailRow label="Email ID" value={MASKED_EMAIL} />
          <DetailRow label="Current Add." value={maskAddressLine(customer.currentAddress)} />
          <DetailRow label="Permanent Add." value={maskAddressLine(customer.permanentAddress)} />
        </DetailSection>

        <DetailSection label="Account" dotClass="bg-warning" labelClass="text-warning-text" last>
          <DetailRow label="Product Type" value={customer.productType} />
          <DetailRow label="Onboarding Channel" value={persona.onboardingChannel} />
          {persona.onboardingChannel === 'Assisted — BC Agent' && persona.bcSourcingCode && (
            <DetailRow label="BC Sourcing Code" value={persona.bcSourcingCode} />
          )}
          <DetailRow label="Customer Status" value={customer.customerStatus} />
        </DetailSection>

        <p className="text-[11px] text-text-muted mt-3 pt-2 border-t border-border/60">
          Illustrative data only — no real customer information is used in this demo.
        </p>
      </Card>

      <Button
        disabled={!allYes}
        onClick={() => onProceed({ videoVisible: true, audible: true })}
        className="disabled:!bg-primary disabled:!text-white disabled:!opacity-100"
      >
        Proceed
      </Button>
    </div>
  );
}

/**
 * Round 15 (§5): labeled sections with a divider, instead of one flat
 * two-column grid. Round 16 (§9): each section's label gets its own colored
 * dot + colored uppercase text instead of uniform gray, to break up the
 * monochrome look.
 */
function DetailSection({
  label,
  dotClass,
  labelClass,
  last,
  children,
}: {
  label: string;
  dotClass: string;
  labelClass: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('mb-4 pb-4', !last && 'border-b border-border/60')}>
      <p className={cn('flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide mb-1', labelClass)}>
        <span className={cn('w-1.5 h-1.5 rounded-full', dotClass)} />
        {label}
      </p>
      {children}
    </div>
  );
}
