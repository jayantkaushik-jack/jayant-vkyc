import { Timer } from 'lucide-react';
import { Card } from '@vkyc/shared/components/ui/Card';
import { cn } from '@vkyc/shared/lib/cn';
import { formatMinutes } from '@vkyc/shared/lib/format';
import {
  getPartnerQueueSnapshot,
  WAIT_SLA_SEC,
  type QueueHealth,
} from '@vkyc/shared/data/adminSelectors';
import { usePartnerScope } from '@partner/features/partner/PartnerScopeContext';

const HEALTH_TEXT: Record<QueueHealth, string> = {
  ok: 'text-success',
  watch: 'text-warning',
  breach: 'text-danger',
};

const HEALTH_ICON_BG: Record<QueueHealth, string> = {
  ok: 'bg-green-50 text-success',
  watch: 'bg-amber-50 text-warning',
  breach: 'bg-red-50 text-danger',
};

const HEALTH_NOTE: Record<QueueHealth, string> = {
  ok: 'Customers are being answered within the 2-minute policy.',
  watch: 'Waits are running above the 2-minute answer policy.',
  breach: 'Waits are well above policy — the queue is backed up.',
};

function asOfLabel(atMs: number): string {
  return new Date(atMs).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg/60 px-3 py-2.5">
      <p className="text-[11px] text-text-muted leading-tight" title={hint}>{label}</p>
      <p className="text-lg font-semibold text-text mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

/**
 * Partner-scoped live queue position. Deliberately shows no agent names, no
 * other partner's volumes and no fleet totals — only this partner's own queue
 * and the capacity serving it (PRD-14 hard isolation).
 */
export function QueueSnapshotCard() {
  const { partnerId } = usePartnerScope();
  const snap = getPartnerQueueSnapshot(partnerId);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-text">
            Queue right now
            <span className="ml-2 text-[11px] font-normal text-text-muted">as of {asOfLabel(snap.atMs)}</span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Live position in {snap.queueName}
            {snap.sharedQueue && ' — a shared queue, so waits reflect total demand on it'}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', HEALTH_ICON_BG[snap.status])}>
            <Timer size={20} />
          </div>
          <div>
            <p className={cn('text-2xl font-semibold tabular-nums leading-none', HEALTH_TEXT[snap.status])}>
              {formatMinutes(snap.maxWaitSec)}
            </p>
            <p className="text-[11px] text-text-muted mt-1">
              longest waiting now · policy {Math.round(WAIT_SLA_SEC / 60)}m
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <Metric
          label="Your customers waiting"
          value={snap.waiting}
          hint="Your customers in the queue right now, not yet connected to an agent."
        />
        <Metric label="Your live calls" value={snap.liveCalls} hint="Your customers on a call with an agent right now." />
        <Metric
          label="Agents serving your queue"
          value={snap.agentsServing}
          hint="Agents online and handling this queue right now."
        />
        <Metric
          label="Expected wait if you join now"
          value={formatMinutes(snap.expectedWaitSec)}
          hint="Projected wait for a customer entering the queue now: backlog ÷ throughput at the current handle time."
        />
      </div>

      <p className="text-xs text-text-muted mt-3">
        {snap.outsideServiceHours
          ? 'No agents are rostered on at the moment, so there is no live queue to report.'
          : HEALTH_NOTE[snap.status]}{' '}
        Average wait across your calls connected today is {formatMinutes(snap.avgWaitToDateSec)}.
      </p>
    </Card>
  );
}
