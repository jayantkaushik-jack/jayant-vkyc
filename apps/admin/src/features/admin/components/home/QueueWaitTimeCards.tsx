import { useState } from 'react';
import { ChevronDown, Timer } from 'lucide-react';
import { Card } from '@vkyc/shared/components/ui/Card';
import { cn } from '@vkyc/shared/lib/cn';
import { formatMinutes } from '@vkyc/shared/lib/format';
import {
  getQueueStatesAt,
  getLiveInstant,
  WAIT_SLA_SEC,
  type QueueHealth,
  type QueueStateAt,
} from '@vkyc/shared/data/adminSelectors';
import { useSessionQueues } from '@vkyc/shared/data/sessionStore';
import { usePartnerId } from '@admin/features/admin/PartnerFilterContext';

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

const HEALTH_BORDER: Record<QueueHealth, string> = {
  ok: 'border-border',
  watch: 'border-warning/40',
  breach: 'border-danger/40',
};

const HEALTH_PILL: Record<QueueHealth, string> = {
  ok: 'bg-green-50 text-success border-success/30',
  watch: 'bg-amber-50 text-warning border-warning/30',
  breach: 'bg-red-50 text-danger border-danger/30',
};

const HEALTH_LABEL: Record<QueueHealth, string> = {
  ok: 'Within policy',
  watch: 'Above policy',
  breach: 'Breach',
};

function Metric({ label, value, tone, hint }: {
  label: string;
  value: string | number;
  tone?: QueueHealth;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg/60 px-3 py-2">
      <p className="text-[11px] text-text-muted leading-tight" title={hint}>{label}</p>
      <p className={cn('text-base font-semibold mt-0.5 tabular-nums', tone && HEALTH_TEXT[tone])}>{value}</p>
    </div>
  );
}

function QueueCard({ row }: { row: QueueStateAt }) {
  const [open, setOpen] = useState(false);
  const idle = row.outsideServiceHours;

  return (
    <Card className={cn('border', HEALTH_BORDER[idle ? 'ok' : row.status])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{row.queueName}</p>
          <p className="text-[11px] text-text-muted truncate">{row.partnerNames || '—'}</p>
        </div>
        <span
          className={cn(
            'shrink-0 px-2 py-0.5 rounded-full border text-[11px] font-medium',
            idle ? 'bg-bg text-text-muted border-border' : HEALTH_PILL[row.status],
          )}
        >
          {idle ? 'No shift on' : HEALTH_LABEL[row.status]}
        </span>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
            idle ? 'bg-bg text-text-muted' : HEALTH_ICON_BG[row.status],
          )}
        >
          <Timer size={20} />
        </div>
        <div className="min-w-0">
          <p className={cn(
            'text-2xl font-semibold tabular-nums leading-none',
            idle ? 'text-text-muted' : HEALTH_TEXT[row.status],
          )}
          >
            {idle ? '—' : formatMinutes(row.maxWaitSec)}
          </p>
          <p className="text-[11px] text-text-muted mt-1">
            longest waiting now · policy {Math.round(WAIT_SLA_SEC / 60)}m
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-3">
        <span className="text-text-muted">
          Waiting <span className="text-text font-semibold tabular-nums">{row.waiting}</span>
        </span>
        <span className="text-text-muted">
          Live <span className="text-text font-semibold tabular-nums">{row.liveCalls}</span>
        </span>
        <span className="text-text-muted">
          Free <span className="text-text font-semibold tabular-nums">{row.agentsAvailable}</span>
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-3 w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:bg-primary-soft hover:text-primary transition-colors"
      >
        {open ? 'Hide detail' : 'Show detail'}
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="mt-3 space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <Metric label="Live calls" value={row.liveCalls} hint="Calls in progress in this queue right now." />
            <Metric
              label="Customers in queue"
              value={row.waiting}
              hint="Customers waiting, not yet connected and not yet abandoned."
            />
            <Metric
              label="Agents active in queue"
              value={row.agentsOnline}
              hint={`Logged in and not on a break. ${row.agentsBusy} on a call, ${row.agentsAvailable} free, ${row.agentsOnBreak} on a break.`}
            />
            <Metric
              label="Expected wait (new customer)"
              value={row.noAgents ? 'No agents' : formatMinutes(row.expectedWaitSec)}
              tone={row.noAgents ? 'breach' : undefined}
              hint="Projected wait for a customer entering now: backlog ÷ throughput, where throughput = agents online ÷ average handle time."
            />
            <Metric
              label="Avg wait today"
              value={formatMinutes(row.avgWaitToDateSec)}
              hint="Mean wait across every call connected in this queue so far today."
            />
            <Metric
              label="Avg handle time"
              value={formatMinutes(row.ahtSec)}
              hint="Talk plus post-call review, across calls that finished in the last hour."
            />
          </div>

          <p className="text-[11px] text-text-muted">
            {row.agentsRostered} agents rostered · {row.agentsPresent} present ·{' '}
            {row.agentsOnBreak} on a break
          </p>
        </div>
      )}
    </Card>
  );
}

/**
 * One card per queue. Each shows that queue's current wait and expands to the
 * full position. All figures are reconstructed from call records and the
 * attendance log at the current instant.
 */
export function QueueWaitTimeCards() {
  const partnerId = usePartnerId();
  useSessionQueues(); // re-render when queue configuration changes

  const at = getLiveInstant();
  const rows = getQueueStatesAt(at, partnerId ?? undefined);
  const asOf = at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">Queue wait times</h2>
        <span className="text-[11px] text-text-muted">as of {asOf}</span>
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="text-xs text-text-muted">No queues match the current partner filter.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {rows.map((row) => (
            <QueueCard key={row.queueId} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
