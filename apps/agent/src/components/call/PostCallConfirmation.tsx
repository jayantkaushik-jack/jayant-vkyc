import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, PhoneOff, ChevronDown } from 'lucide-react';
import { Button } from '@agent/components/ui/Button';
import { Card } from '@agent/components/ui/Card';
import { Avatar } from '@agent/components/ui/Avatar';
import { formatDuration } from '@vkyc/shared/lib/format';
import { formatRejectionSummary } from '@vkyc/shared/lib/rejectionReasons';
import { cn } from '@vkyc/shared/lib/cn';
import type { CallSession } from '@vkyc/shared/data/types';
import type { SelectedRejectionReasons } from '@vkyc/shared/lib/rejectionReasons';
import type { Verdict, PathEntry } from '@agent/features/agent/call/amber/tree';

interface PostCallConfirmationProps {
  decision: 'approved' | 'rejected' | 'unable' | 'incomplete';
  session: CallSession;
  callDurationSec: number;
  rejectionReasons: SelectedRejectionReasons;
  /** The resolved Amber verdict, if the call reached one — drives the Case Summary below. Null for a call ended before resolution. */
  verdict: Verdict | null;
  /** The question-by-question trail behind `verdict` — Case Summary's zone 5. */
  path: PathEntry[];
  /**
   * Round 15 (§8): the trail defaults collapsed for the agent who just ran
   * the call (they don't need to re-read it) and expanded for a second
   * reviewer opening the case cold — gated on this prop rather than a
   * hardcoded `false`, per the spec. Nothing in this build yet opens the
   * confirmation screen as a reviewer (there's no second-reviewer route),
   * so this only ever renders 'agent' today — the gate is wired for when
   * that view exists.
   */
  viewerRole?: 'agent' | 'reviewer';
  onNextCall: () => void;
  onGoHome: () => void;
}

const DECISION_CHIP_CLASS: Record<PostCallConfirmationProps['decision'], string> = {
  approved: 'bg-success-subtle text-success-strong',
  rejected: 'bg-danger-subtle text-danger',
  unable: 'bg-warning-subtle text-warning-text',
  incomplete: 'bg-bg text-text-muted',
};

/**
 * Case Summary's Final Outcome badge (round 15, §8). Band alone isn't
 * enough to pick the right AMBER flavor — see tree.ts's `amberFlavor` doc
 * comment — so this reads that field, defaulting an unflavored STEP_UP to
 * the more conservative "pending" reading rather than silently claiming an
 * explanation was logged when none was recorded. A genuine HUMAN_REVIEW
 * band (the call escalated with no verdict at all) isn't one of the four
 * outcomes the spec doc worked through — added a fifth, consistent label
 * for it rather than leaving that case with no badge.
 */
function finalOutcomeBadge(verdict: Verdict): { label: string; className: string } {
  if (verdict.band === 'PROCEED') return { label: 'GREEN — Cleared', className: 'bg-success-subtle border-success-subtle text-success-strong' };
  if (verdict.band === 'BLOCK') return { label: 'RED — Hard Stop', className: 'bg-danger-subtle border-danger text-danger' };
  if (verdict.band === 'HUMAN_REVIEW') return { label: 'AMBER — Escalated for Review', className: 'bg-bg border-border text-text-muted' };
  const label = verdict.amberFlavor === 'explanation-logged' ? 'AMBER — Explanation Logged' : 'AMBER — Routed to Human Review';
  return { label, className: 'bg-warning-subtle border-warning-border text-warning-text' };
}

/**
 * Zone 4's structured fields — shape depends on the outcome, per the spec:
 * omitted for Green/Red, one of two mutually-exclusive shapes for Amber.
 * A true HUMAN_REVIEW-band escalation (not one of the spec's four worked
 * examples) is treated as pending-verification-shaped, using its own
 * `reasons` as the referral reason — same idea as the farmer/SIM/address
 * pending-verification verdicts, just without hand-authored
 * documents/expertise text since nothing in this build supplies it.
 */
function CaseSummaryFields({ verdict }: { verdict: Verdict }) {
  if (verdict.band === 'PROCEED' || verdict.band === 'BLOCK') return null;

  if (verdict.band === 'STEP_UP' && verdict.amberFlavor === 'explanation-logged') {
    return (
      <div className="rounded-lg border border-border bg-surface/60 px-4 py-3 text-sm space-y-1">
        <p className="text-xs uppercase tracking-wide text-text-muted">Explanation logged</p>
        <p>{verdict.reasons[0]}</p>
      </div>
    );
  }

  const documentsRequired = verdict.pendingVerification?.documentsRequired ?? 'None from the applicant directly — reviewed against records already available to the review team.';
  const expertiseRequired = verdict.pendingVerification?.expertiseRequired ?? 'Standard risk review.';

  return (
    <div className="rounded-lg border border-border bg-surface/60 px-4 py-3 text-sm space-y-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-text-muted mb-0.5">Reason for referral</p>
        <p>{verdict.reasons.join(' ')}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-text-muted mb-0.5">Documents required</p>
        <p>{documentsRequired}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-text-muted mb-0.5">Expertise required</p>
        <p>{expertiseRequired}</p>
      </div>
      {/*
       * Round 23 (§4b): only ever rendered for the universal unclear-bucket
       * verdict — every other verdict's `agentNote` is unset, so this block
       * naturally never appears for them.
       */}
      {verdict.id === 'human_review_unclear_bucket' && (
        <div>
          <p className="text-xs uppercase tracking-wide text-text-muted mb-0.5">Agent note (at point of termination)</p>
          <p>"{verdict.agentNote?.trim() ? verdict.agentNote : 'No note provided'}"</p>
        </div>
      )}
    </div>
  );
}

function QuestionTrail({ path, viewerRole }: { path: PathEntry[]; viewerRole: 'agent' | 'reviewer' }) {
  const [open, setOpen] = useState(viewerRole === 'reviewer');

  if (path.length === 0) return null;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium bg-surface hover:bg-bg"
      >
        Question-by-question trail
        <ChevronDown size={16} className={cn('text-text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <ul className="divide-y divide-border">
          {path.map((entry, i) => (
            <li key={i} className="px-4 py-3 text-sm space-y-1 bg-surface/60">
              <p className="text-text-muted">{entry.question}</p>
              {entry.transcript && <p className="italic">Applicant said: "{entry.transcript}"</p>}
              <span className={cn(
                'inline-flex px-2 py-0.5 rounded-md text-xs font-medium',
                entry.corrected ? 'bg-warning-subtle text-warning-text' : 'bg-primary-soft text-primary',
              )}>
                {entry.tapLabel}
                {entry.corrected && ' (corrected)'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CaseSummary({ verdict, path, viewerRole }: { verdict: Verdict; path: PathEntry[]; viewerRole: 'agent' | 'reviewer' }) {
  const badge = finalOutcomeBadge(verdict);
  const narrative = verdict.reasons.join(' ');

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-text-muted shrink-0">Case Summary</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <Card className="w-full p-5 space-y-4">
        <div className={cn('rounded-lg border px-4 py-3', badge.className)}>
          <p className="text-2xl font-semibold">{badge.label}</p>
        </div>

        <p className="text-sm text-text">{narrative}</p>

        <CaseSummaryFields verdict={verdict} />

        <QuestionTrail path={path} viewerRole={viewerRole} />
      </Card>
    </div>
  );
}

export function PostCallConfirmation({
  decision,
  session,
  callDurationSec,
  rejectionReasons,
  verdict,
  path,
  viewerRole = 'agent',
  onNextCall,
  onGoHome,
}: PostCallConfirmationProps) {
  const [countdown, setCountdown] = useState(10);
  const [visibleItems, setVisibleItems] = useState(0);

  const config = {
    approved: {
      icon: CheckCircle,
      color: 'text-success',
      iconBg: 'bg-success-subtle',
      label: 'KYC Approved',
      subtext: 'All verification checks passed and recorded.',
    },
    rejected: {
      icon: XCircle,
      color: 'text-danger',
      iconBg: 'bg-danger-subtle',
      label: 'KYC Rejected',
      subtext: 'The verification was rejected and logged for review.',
    },
    unable: {
      icon: AlertTriangle,
      color: 'text-warning',
      iconBg: 'bg-warning-subtle',
      label: 'Unable to Verify',
      subtext: 'The session could not be fully verified.',
    },
    incomplete: {
      icon: PhoneOff,
      color: 'text-text-muted',
      iconBg: 'bg-bg',
      label: 'Call Ended — Incomplete',
      subtext: 'The KYC journey was not completed.',
    },
  }[decision];

  const Icon = config.icon;
  const lineItems = decision === 'incomplete'
    ? ['Call marked as incomplete', 'Partial KYC report saved', 'Session logged for review']
    : [
        'Call recording saved',
        'KYC report generated',
        'Pushed to bank DMS',
      ];

  useEffect(() => {
    lineItems.forEach((_, i) => {
      setTimeout(() => setVisibleItems(i + 1), (i + 1) * 600);
    });
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          onNextCall();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [onNextCall]);

  return (
    <div className="fixed inset-0 z-50 bg-bg flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-xl w-full flex flex-col items-center gap-6 py-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className={cn('inline-flex items-center justify-center w-16 h-16 rounded-full', config.iconBg)}>
            <Icon className={cn('w-8 h-8', config.color)} />
          </span>
          <h2 className="text-2xl font-semibold">{config.label}</h2>
          <p className="text-sm text-text-muted">{config.subtext}</p>
        </div>

        <Card className="w-full p-5">
          <div className="flex items-center gap-4 mb-5">
            <Avatar person={{ id: session.customer.id, name: session.customer.name, gender: session.customer.gender }} size="md" />
            <div>
              <p className="font-semibold">{session.customer.name}</p>
              <p className="text-xs text-text-muted font-mono">{session.customer.appId}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-muted mb-1">Call Duration</p>
              <p className="text-sm font-semibold">{formatDuration(callDurationSec)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted mb-1">Decision</p>
              <span className={cn('inline-flex px-2.5 py-1 rounded-md text-sm font-semibold', DECISION_CHIP_CLASS[decision])}>
                {config.label}
              </span>
            </div>
          </div>

          {rejectionReasons.selections.length > 0 && (
            <p className="text-xs text-text-muted mt-4 pt-4 border-t border-border">
              {formatRejectionSummary(rejectionReasons)}
            </p>
          )}
        </Card>

        <Card className="w-full p-5 bg-primary-soft/30 border-primary/10">
          <ul className="space-y-3">
            {lineItems.map((item, i) => (
              <li
                key={item}
                className={cn(
                  'flex items-center gap-2 text-sm text-left transition-opacity duration-300',
                  i < visibleItems ? 'opacity-100' : 'opacity-0',
                )}
              >
                <CheckCircle size={16} className="text-success shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </Card>

        {verdict && <CaseSummary verdict={verdict} path={path} viewerRole={viewerRole} />}

        <div className="flex flex-col items-center gap-3 w-full">
          <Button className="min-w-[200px]" onClick={onNextCall}>
            Next Call ({countdown}s)
          </Button>
          <div className="flex items-center gap-4">
            <button type="button" onClick={onGoHome} className="text-sm text-primary hover:underline">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
