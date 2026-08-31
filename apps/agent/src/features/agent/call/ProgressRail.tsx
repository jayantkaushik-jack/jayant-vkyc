import { Check, Circle } from 'lucide-react';
import { CALL_STEPS } from '@vkyc/shared/lib/constants';
import type { StepStatus } from '@vkyc/shared/lib/constants';
import { cn } from '@vkyc/shared/lib/cn';
import {
  Activity, MapPin, ScanFace, IdCard, CreditCard, PenLine, Search,
} from 'lucide-react';

const STEP_ICONS: Record<string, React.ReactNode> = {
  liveliness: <Activity size={14} />,
  location: <MapPin size={14} />,
  face: <ScanFace size={14} />,
  aadhaar: <IdCard size={14} />,
  pan: <CreditCard size={14} />,
  sign: <PenLine size={14} />,
};

/** Round 15 (§6): shortened to one word each so the horizontal strip never needs a scrollbar. */
const STEP_SHORT_LABEL: Record<string, string> = {
  liveliness: 'Liveliness',
  location: 'Location',
  face: 'Face',
  aadhaar: 'Aadhaar',
  pan: 'PAN',
  sign: 'Sign',
};

/**
 * Rounds 6-8: the applicant completes the entire VKYC sequence, including
 * signing, before an agent ever joins an amber case — Report is cut from
 * the journey entirely and never appears here, and the six real stages
 * before Amber Resolution are always pre-completed with no live/active
 * state of their own (see CallFlowContext.startWorkflow).
 */
const PROGRESS_STEPS = CALL_STEPS.filter((s) => s.id !== 'report');

function StepStatusIcon({ status }: { status: StepStatus }) {
  if (status === 'passed') return <Check size={14} className="text-success shrink-0 relative z-10 bg-surface rounded-full" />;
  if (status === 'failed') return <span className="text-danger text-sm shrink-0 relative z-10 bg-surface">✗</span>;
  return <Circle size={14} className="text-text-disabled shrink-0 relative z-10 bg-surface" />;
}

interface ProgressRailProps {
  stepStatuses: StepStatus[];
  /**
   * The single current-stage value for the whole call screen (see
   * CallFlowContext) — the Amber Resolution pill's active/complete state is
   * derived from exact equality against this one value, never a separate
   * local flag.
   */
  currentStage: 'pre' | 'resolve_signal' | 'done';
}

/**
 * Round 15 (§6): moved from a persistent right-hand vertical rail to a
 * horizontal strip spanning the full width above the video + question row,
 * so both get more horizontal room. The state logic this rail renders
 * (every real stage pre-completed on load, Amber Resolution the sole
 * active trailing item) is unchanged from rounds 6-8 — only the layout is
 * different. The collapse/expand toggle the vertical rail needed to avoid
 * crowding the middle column doesn't apply here — a fixed-height horizontal
 * strip with single-word labels doesn't need it.
 */
export function ProgressRail({ stepStatuses, currentStage }: ProgressRailProps) {
  const amberStatus: 'complete' | 'active' | 'pending' =
    currentStage === 'resolve_signal' ? 'active' : currentStage === 'pre' ? 'pending' : 'complete';

  return (
    <nav className="w-full flex items-center bg-surface border border-border rounded-xl shadow-card px-4 py-3">
      {PROGRESS_STEPS.map((step, i) => (
        <div key={step.id} className="flex items-center flex-1 min-w-0 last:flex-none">
          <div className="flex flex-col items-center gap-1 shrink-0">
            <StepStatusIcon status={stepStatuses[i]} />
            <span className="flex items-center gap-1 text-[11px] font-medium text-text-muted whitespace-nowrap">
              <span className="opacity-70">{STEP_ICONS[step.id]}</span>
              {STEP_SHORT_LABEL[step.id] ?? step.label}
            </span>
          </div>
          <div className="flex-1 h-0.5 bg-success mx-2 mb-[18px]" aria-hidden />
        </div>
      ))}
      <div
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 text-xs',
          amberStatus === 'active' ? 'bg-primary-soft text-primary font-medium' : 'text-text-muted',
        )}
      >
        {amberStatus === 'complete' && <Check size={14} className="text-success shrink-0" />}
        {amberStatus === 'active' && <Circle size={14} className="text-primary fill-primary/20 shrink-0" />}
        {amberStatus === 'pending' && <Circle size={14} className="text-text-disabled shrink-0" />}
        <Search size={14} className="opacity-70 shrink-0" />
        Amber Resolution
      </div>
    </nav>
  );
}
