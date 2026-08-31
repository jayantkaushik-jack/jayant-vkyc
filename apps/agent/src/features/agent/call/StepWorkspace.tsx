import { useCallFlow } from '@agent/features/agent/call/CallFlowContext';
import { CustomerDetailsStep } from '@agent/features/agent/call/steps/CustomerDetailsStep';
import { computeFieldMatch } from '@vkyc/shared/lib/matchUtils';
import { cn } from '@vkyc/shared/lib/cn';
import { AmberPanel } from '@agent/features/agent/call/amber/AmberPanel';
import { PERSONAS } from '@agent/features/agent/call/amber/personas';

export function StepWorkspace() {
  const flow = useCallFlow();
  const { started, session } = flow;

  if (!started) {
    return (
      <CustomerDetailsStep
        customer={session.customer}
        persona={PERSONAS[flow.amberPersonaId]}
        onProceed={flow.startWorkflow}
      />
    );
  }

  /**
   * Every call in this build is an amber case, and per rounds 6-8 the
   * agent's job starts and ends at Amber Resolution — the applicant
   * completes the entire VKYC sequence, including signing, before an agent
   * ever joins. There are no compliance steps or Report to fall through to
   * once the amber gate resolves; AmberPanel itself now owns the
   * end-session confirmation and hands the finalized verdict off to
   * finalizeAmberCase, which is what actually ends the call.
   */
  if (flow.isAmberCase && !flow.amberResolved) {
    return (
      <AmberPanel
        persona={PERSONAS[flow.amberPersonaId]}
        hasPriorAttempt={(session.customer.attemptNumber ?? 1) > 1}
        onVerdict={flow.recordAmberVerdict}
        onContinue={flow.finalizeAmberCase}
        onLog={flow.logActivity}
      />
    );
  }

  return null;
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-2 text-sm border-b border-border/50 last:border-0">
      <span className="text-text-muted">{label}</span>
      <span className="text-text">{value}</span>
    </div>
  );
}

export function MatchChip({
  label,
  formValue,
  compareValue,
  seededPct,
  nameMatchMin,
}: {
  label: string;
  formValue: string;
  compareValue: string;
  seededPct?: number;
  nameMatchMin?: number;
}) {
  const match = computeFieldMatch(formValue, compareValue, {
    fieldLabel: label,
    seededPct,
    nameMatchMin,
  });
  const chipCls =
    match.type === 'green' ? 'bg-success-subtle text-success-strong border-success-subtle'
      : match.type === 'amber' ? 'bg-warning-subtle text-warning-text border-warning-border'
      : match.type === 'red' ? 'bg-danger-subtle text-danger border-danger'
      : 'bg-bg text-text-muted border-border';

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 py-2 px-3 text-sm border-b border-border/50 bg-surface">
      <span className="font-medium">{label}</span>
      <span>{formValue}</span>
      <span>{compareValue}</span>
      <span className={cn('inline-flex items-center h-6 px-2 rounded text-xs font-medium border align-top', chipCls)}>
        {match.text}
      </span>
    </div>
  );
}
