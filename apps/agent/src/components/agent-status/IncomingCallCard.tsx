import { useEffect, useState } from 'react';
import { Tag } from '@cashfree-intl/cashmere';
import { Button } from '@agent/components/ui/Button';
import { Card } from '@agent/components/ui/Card';
import { Avatar } from '@agent/components/ui/Avatar';
import { RiskSnapshotModal } from '@agent/components/risk/RiskSnapshotModal';
import { formatDuration } from '@vkyc/shared/lib/format';
import type { Customer } from '@vkyc/shared/data/types';
import { getRiskSummaryLines, type RiskSnapshot } from '@agent/features/agent/call/amber/personas';

/**
 * The risk-summary box is a custom panel on DS tokens, not a cashmere component.
 *
 * cashmere has no inline-message primitive: `AlertCard` is a full card with its own title,
 * tag and button; `Banner` is a marketing-weight gradient block; `Toast` is transient. This
 * card has no competing amber box the way the live call screen does, so the bordered
 * treatment stays — a custom panel on the DS's warning tokens is the honest answer, and
 * matches the treatment used elsewhere in the app for the same shape.
 */

interface IncomingCallCardProps {
  customer: Customer;
  incomingSince: number | null;
  riskSnapshot: RiskSnapshot;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallCard({ customer, incomingSince, riskSnapshot, onAccept, onReject }: IncomingCallCardProps) {
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const { scoreLine, firedLine } = getRiskSummaryLines(riskSnapshot);

  useEffect(() => {
    if (!incomingSince) {
      setWaitSeconds(0);
      return;
    }
    const tick = () => setWaitSeconds(Math.floor((Date.now() - incomingSince) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [incomingSince]);

  return (
    <Card className="w-full max-w-md text-center" padding>
      <Avatar
        person={{ id: customer.id, name: customer.name, gender: customer.gender }}
        size="lg"
        className="mx-auto mb-4"
      />
      <h2 className="mb-1 flex items-center justify-center gap-2 text-xl font-semibold">
        {customer.name}
        <Tag size="small" type="background" status="warning" showIcon={false}>
          AMBER
        </Tag>
      </h2>
      <p className="mb-1 text-sm text-text-muted">Language: {customer.language}</p>
      <div className="mx-auto mb-4 max-w-sm space-y-0.5 rounded-lg border border-warning-border/40 bg-warning-subtle px-3 py-2 text-left text-[11px] text-warning-text">
        <p>{scoreLine}</p>
        {firedLine && <p className="opacity-80">{firedLine}</p>}
      </div>
      <p className="text-text-muted text-sm mb-1">
        Waiting since {formatDuration(waitSeconds)}
      </p>
      <button
        type="button"
        onClick={() => setSnapshotOpen(true)}
        className="mb-6 text-xs text-primary underline hover:no-underline"
      >
        View Risk Snapshot
      </button>
      <div className="flex gap-3 justify-center">
        <Button variant="success" size="lg" onClick={onAccept}>
          Accept Call
        </Button>
        <Button variant="destructive-secondary" size="lg" onClick={onReject}>
          Reject
        </Button>
      </div>
      <RiskSnapshotModal
        open={snapshotOpen}
        onClose={() => setSnapshotOpen(false)}
        name={customer.name}
        subtitle={`${customer.incomeEmployment?.occupation ?? 'Occupation not on file'} — ${customer.currentAddress.city}, ${customer.currentAddress.state}`}
        riskSnapshot={riskSnapshot}
      />
    </Card>
  );
}
