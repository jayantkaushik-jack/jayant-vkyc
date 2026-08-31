import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { formatHoursMinutes } from '../../lib/format';
import { cn } from '../../lib/cn';
import { StatusPill } from '../ui/StatusPill';
import { Avatar } from '../ui/Avatar';
import type { AgentStatus } from '../../data/types';
import type { AvatarPerson } from '../../lib/avatar';

function VerticalDivider() {
  return <div className="w-px h-5 bg-border" />;
}

interface SessionStatusHeaderClusterProps {
  person: AvatarPerson;
  status: AgentStatus;
  setStatus: (s: AgentStatus) => void;
  getLoggedInSec: () => number;
  getBreakSec: () => number;
}

/** Logged-in · Break · avatar · status dropdown — shared by agent and auditor headers. */
export function SessionStatusHeaderCluster({
  person,
  status,
  setStatus,
  getLoggedInSec,
  getBreakSec,
}: SessionStatusHeaderClusterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (status === 'offline') return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const statusLabel = status === 'online' ? 'Online' : status === 'on_break' ? 'On Break' : 'Offline';
  const statusVariant = status === 'online' ? 'passed' : status === 'on_break' ? 'average' : 'pending';

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-text-muted">Logged in: </span>
          <span className="font-semibold">{formatHoursMinutes(getLoggedInSec())}</span>
        </div>
        <VerticalDivider />
        <div>
          <span className="text-text-muted">Break: </span>
          <span className="font-semibold">{formatHoursMinutes(getBreakSec())}</span>
        </div>
        <VerticalDivider />
      </div>

      <Avatar person={person} size="xs" ring="primary" title={person.name} />

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-primary-soft text-sm"
        >
          <StatusPill label={statusLabel} variant={statusVariant} />
          <ChevronDown size={14} className="text-text-muted" />
        </button>
        {open && (
          <div className="absolute right-0 mt-1 w-40 bg-surface border border-border rounded-lg shadow-card py-1 z-50">
            {(['online', 'on_break', 'offline'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={cn(
                  'w-full text-left px-4 py-2 text-sm hover:bg-primary-soft',
                  status === s && 'text-primary font-medium',
                )}
                onClick={() => {
                  setStatus(s);
                  setOpen(false);
                }}
              >
                {s === 'online' ? 'Online' : s === 'on_break' ? 'On Break' : 'Offline'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
