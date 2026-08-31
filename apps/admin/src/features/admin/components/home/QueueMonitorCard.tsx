import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@vkyc/shared/lib/cn';
import { formatDuration } from '@vkyc/shared/lib/format';
import { getQueueMonitorRows } from '@vkyc/shared/data/adminSelectors';
import { useSessionQueues } from '@vkyc/shared/data/sessionStore';
import { SectionCard } from '@admin/features/admin/components/SectionCard';
import { usePartnerId } from '@admin/features/admin/PartnerFilterContext';

export function QueueMonitorCard() {
  const [open, setOpen] = useState(false);
  const partnerId = usePartnerId();
  useSessionQueues(); // re-render when queues change

  const toggle = (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="flex items-center gap-1 px-3 py-1 rounded-lg border border-border text-xs text-text-muted hover:bg-primary-soft hover:text-primary transition-colors"
    >
      {open ? 'Collapse' : 'Expand'}
      <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
    </button>
  );

  return (
    <SectionCard title="Queue Monitor" headerRight={toggle}>
      {() => {
        if (!open) {
          return <p className="text-xs text-text-muted">Collapsed — expand to view per-queue depth and imbalance signals.</p>;
        }
        const queues = getQueueMonitorRows().filter(
          (q) => !partnerId || q.partnerIds.includes(partnerId),
        );
        const critical = queues.filter((q) => q.alert);
        return (
          <div className="space-y-3">
            {critical.length > 0 && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-danger font-medium">
                Critical Queue Alert — {critical.map((c) => c.queueName).join(', ')} queue depth exceeds 25
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-muted border-b border-border">
                    <th className="text-left pb-2 pr-3">Queue</th>
                    <th className="text-left pb-2 pr-3">Partners</th>
                    <th className="text-right pb-2 px-3">Agents</th>
                    <th className="text-right pb-2 px-3">Pending</th>
                    <th className="text-right pb-2 px-3">Avg Wait</th>
                    <th className="text-right pb-2 px-3">Drop Rate</th>
                    <th className="text-left pb-2 pl-3">Signal</th>
                  </tr>
                </thead>
                <tbody>
                  {queues.map((q, i) => (
                    <tr key={q.queueId} className={cn('border-b border-border/60', i % 2 === 1 && 'bg-bg/40')}>
                      <td className="py-2 pr-3">
                        <p className="font-medium">{q.queueName}</p>
                        <p className="text-[10px] text-text-muted font-mono">{q.queueId}</p>
                      </td>
                      <td className="py-2 pr-3 text-xs">{q.partnerNames || '—'}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{q.agentCount}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{q.pending}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatDuration(q.waitSec)}</td>
                      <td className={cn('py-2 px-3 text-right tabular-nums', q.dropRate > 5 && 'text-danger font-semibold')}>
                        {q.dropRate.toFixed(1)}%
                      </td>
                      <td className={cn(
                        'py-2 pl-3 text-xs',
                        q.signal === 'Critical depth' ? 'text-danger' : q.signal.startsWith('Under') ? 'text-warning' : 'text-success',
                      )}
                      >
                        {q.signal}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }}
    </SectionCard>
  );
}
