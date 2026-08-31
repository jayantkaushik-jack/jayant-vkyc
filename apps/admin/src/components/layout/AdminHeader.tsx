import { useEffect, useRef, useState } from 'react';
import { CashfreeLogo } from '@vkyc/shared/components/layout/CashfreeLogo';
import { Avatar } from '@vkyc/shared/components/ui/Avatar';
import { getQueueMonitorRows } from '@vkyc/shared/data/adminSelectors';
import { useSessionQueues } from '@vkyc/shared/data/sessionStore';
import { ADMIN_NAME } from '@admin/features/admin/constants';
import { cn } from '@vkyc/shared/lib/cn';

export function AdminHeader() {
  const firstName = ADMIN_NAME.split(' ')[0];
  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-border">
      <div className="flex items-center justify-between h-14 px-6">
        <div className="flex items-center gap-4">
          <CashfreeLogo />
          <span className="text-sm font-semibold text-text">Hi, {firstName}</span>
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <SystemStatusChip />
          <Avatar person={{ id: 'admin-1', name: ADMIN_NAME }} size="xs" ring="primary" title={ADMIN_NAME} />
        </div>
      </div>
    </header>
  );
}

function SystemStatusChip() {
  useSessionQueues();
  const queues = getQueueMonitorRows();
  const critical = queues.filter((q) => q.alert);
  const hasAlert = critical.length > 0;
  const chipLabel = hasAlert
    ? `${critical[0].queueName.replace(/ Queue$/, '')} queue latency`
    : 'All systems operational';
  const detail = hasAlert
    ? `Queue alert — ${critical.map((c) => c.queueName).join(', ')} depth exceeds threshold. Other queues operational.`
    : 'All queues operational. No latency alerts detected.';

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative min-w-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 max-w-[200px] h-8 px-2.5 rounded-full border text-xs transition-colors',
          hasAlert
            ? 'border-warning/40 bg-amber-50 text-amber-900 hover:bg-amber-100'
            : 'border-border bg-primary-soft/40 text-text-muted hover:bg-primary-soft',
        )}
        aria-expanded={open}
        aria-label="System status"
      >
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0 animate-pulse',
            hasAlert ? 'bg-warning' : 'bg-success',
          )}
        />
        <span className="truncate">{chipLabel}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 p-3 rounded-lg border border-border bg-surface shadow-card z-50">
          <p className="text-xs font-semibold mb-1.5">System Status</p>
          <div className="flex items-start gap-2">
            <span
              className={cn(
                'w-2 h-2 rounded-full mt-1 shrink-0 animate-pulse',
                hasAlert ? 'bg-warning' : 'bg-success',
              )}
            />
            <p className="text-xs text-text-muted leading-snug">{detail}</p>
          </div>
        </div>
      )}
    </div>
  );
}
