import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, PhoneOff } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { formatDuration } from '../../lib/format';
import { formatRejectionSummary } from '../../lib/rejectionReasons';
import { cn } from '../../lib/cn';
import type { CallSession } from '../../data/types';
import type { SelectedRejectionReasons } from '../../lib/rejectionReasons';

interface PostCallConfirmationProps {
  decision: 'approved' | 'rejected' | 'unable' | 'incomplete';
  session: CallSession;
  callDurationSec: number;
  rejectionReasons: SelectedRejectionReasons;
  onViewReport: () => void;
  onNextCall: () => void;
  onGoHome: () => void;
}

export function PostCallConfirmation({
  decision,
  session,
  callDurationSec,
  rejectionReasons,
  onViewReport,
  onNextCall,
  onGoHome,
}: PostCallConfirmationProps) {
  const [countdown, setCountdown] = useState(10);
  const [visibleItems, setVisibleItems] = useState(0);

  const config = {
    approved: {
      icon: CheckCircle,
      color: 'text-success',
      label: 'KYC Approved',
      subtext: 'All verification checks passed and recorded.',
    },
    rejected: {
      icon: XCircle,
      color: 'text-danger',
      label: 'KYC Rejected',
      subtext: 'The verification was rejected and logged for review.',
    },
    unable: {
      icon: AlertTriangle,
      color: 'text-warning',
      label: 'Unable to Verify',
      subtext: 'The session could not be fully verified.',
    },
    incomplete: {
      icon: PhoneOff,
      color: 'text-text-muted',
      label: 'Call Ended — Incomplete',
      subtext: 'The KYC journey was not completed.',
    },
  }[decision];

  const Icon = config.icon;
  const lineItems = decision === 'incomplete'
    ? ['Call marked as incomplete', 'Partial KYC report saved', 'Session logged for review']
    : [
        'Call recording saved ✓',
        'KYC report generated ✓',
        'Pushed to bank DMS ✓',
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
    <div className="fixed inset-0 z-50 bg-bg flex items-center justify-center p-6">
      <div className="max-w-xl w-full flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Icon className={cn('w-14 h-14', config.color)} />
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
              <p className={cn('text-sm font-semibold', config.color)}>{config.label}</p>
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
                  'text-sm text-left transition-opacity duration-300',
                  i < visibleItems ? 'opacity-100' : 'opacity-0',
                )}
              >
                {item}
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col items-center gap-3 w-full">
          <Button className="min-w-[200px]" onClick={onNextCall}>
            Next Call ({countdown}s)
          </Button>
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={onViewReport}>View Report</Button>
            <button type="button" onClick={onGoHome} className="text-sm text-primary hover:underline">
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
