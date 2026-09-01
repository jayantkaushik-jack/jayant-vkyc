import { useEffect, useRef, useState } from 'react';
import { formatHoursMinutes } from '@vkyc/shared/lib/format';
import { getInitials } from '@vkyc/shared/lib/avatar';
import type { AgentStatus } from '@vkyc/shared/data/types';
import type { AvatarPerson } from '@vkyc/shared/lib/avatar';

interface SessionStatusHeaderClusterProps {
  person: AvatarPerson;
  status: AgentStatus;
  setStatus: (s: AgentStatus) => void;
  getLoggedInSec: () => number;
  getBreakSec: () => number;
}

const STATUS_META: Record<AgentStatus, { label: string; desc: string; dotClass: string }> = {
  online: { label: 'Online', desc: 'Receive amber cases', dotClass: 'status-dot--online' },
  on_break: { label: 'On break', desc: 'Paused, time is tracked', dotClass: 'status-dot--break' },
  offline: { label: 'Offline', desc: 'No cases routed to you', dotClass: 'status-dot--offline' },
};

/**
 * Round 30 — rebuilt on the new `.topbar`/`.meter`/`.status-btn`/`.menu`
 * classes (cf-design-system.css §9). Real `<button role="menu">` semantics
 * added per the handoff (§8.2): `aria-haspopup`/`aria-expanded` on the
 * trigger, `role="menuitemradio"` + `aria-checked` on each option, Escape
 * closes in addition to the click-outside handling this already had. All
 * state/timer logic below is untouched from before this round — restyle
 * only, per the handoff's own explicit instruction not to reimplement the
 * presence logic or the timers.
 */
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

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const meta = STATUS_META[status];

  return (
    <div className="topbar__meters">
      <div className="meter">
        <span className="meter__label">Logged in</span>
        <span className="meter__value">{formatHoursMinutes(getLoggedInSec())}</span>
      </div>
      <div className="meter">
        <span className="meter__label">Break</span>
        <span className="meter__value">{formatHoursMinutes(getBreakSec())}</span>
      </div>
      <span className="topbar__rule" aria-hidden="true" />
      <span className="avatar avatar--sm" title={person.name}>{getInitials(person.name)}</span>

      <div style={{ position: 'relative' }} ref={ref}>
        <button
          type="button"
          className="status-btn"
          aria-haspopup="true"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={`status-dot ${meta.dotClass}`} aria-hidden="true" />
          <span>{meta.label}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9.5l6 6 6-6" /></svg>
        </button>
        {open && (
          <div className="menu" role="menu">
            {(['online', 'on_break'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className="menu__item"
                role="menuitemradio"
                aria-checked={status === s}
                onClick={() => { setStatus(s); setOpen(false); }}
              >
                <span className={`status-dot ${STATUS_META[s].dotClass}`} aria-hidden="true" />
                <span>{STATUS_META[s].label}<span className="menu__desc">{STATUS_META[s].desc}</span></span>
              </button>
            ))}
            <div className="menu__sep" role="separator" />
            <button
              type="button"
              className="menu__item"
              role="menuitemradio"
              aria-checked={status === 'offline'}
              onClick={() => { setStatus('offline'); setOpen(false); }}
            >
              <span className="status-dot status-dot--offline" aria-hidden="true" />
              <span>Offline<span className="menu__desc">No cases routed to you</span></span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
