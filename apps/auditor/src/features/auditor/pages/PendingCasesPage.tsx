import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Search } from 'lucide-react';
import { Card } from '@vkyc/shared/components/ui/Card';
import { Button } from '@vkyc/shared/components/ui/Button';
import { StatusPill } from '@vkyc/shared/components/ui/StatusPill';
import { GoOnlineCard } from '@vkyc/shared/components/session-status/GoOnlineCard';
import { OnBreakCard } from '@vkyc/shared/components/session-status/OnBreakCard';
import { SessionSummaryCard } from '@vkyc/shared/components/session-status/SessionSummaryCard';
import { useSessionStatus } from '@vkyc/shared/features/session/SessionStatusContext';
import { formatDuration, formatTimeLabel } from '@vkyc/shared/lib/format';
import {
  getAuditorQueueStats,
  getAuditorName,
  getMyPendingQueue,
  getPendingQueue,
  reallocateCase,
  SEED_AUDITOR,
  useAuditorSession,
} from '@vkyc/shared/data/auditorStore';

/** SLA aging thresholds (minutes) for the Waiting column colour. */
const SLA_WARN_MIN = 30;
const SLA_BREACH_MIN = 60;

function agingSeconds(approvedAt: string, now: number): number {
  return Math.max(0, Math.floor((now - new Date(approvedAt).getTime()) / 1000));
}

function agingLabel(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

function agingVariant(sec: number): 'passed' | 'average' | 'failed' {
  const min = sec / 60;
  if (min >= SLA_BREACH_MIN) return 'failed';
  if (min >= SLA_WARN_MIN) return 'average';
  return 'passed';
}

export function PendingCasesPage() {
  const navigate = useNavigate();
  const {
    status,
    setStatus,
    breakStartedAt,
    sessionSummary,
    getBreakSec,
  } = useSessionStatus();

  const session = useAuditorSession();
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const prevAssignedIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const myQueue = getMyPendingQueue(SEED_AUDITOR.id);
  const stats = getAuditorQueueStats();
  const isOnline = status === 'online';

  const q = query.trim().toLowerCase();
  const searchResults = q
    ? getPendingQueue()
        .filter((c) => c.customer.appId.toLowerCase().includes(q) || c.customer.phone.toLowerCase().includes(q))
        .slice(0, 8)
    : [];

  const pickUp = (callId: string, mine: boolean) => {
    if (!mine) {
      reallocateCase({
        caseId: callId,
        toAuditorId: SEED_AUDITOR.id,
        byAdminId: SEED_AUDITOR.id,
        byAdminName: SEED_AUDITOR.name,
        reason: `Priority pickup (manager-directed) by ${SEED_AUDITOR.name}`,
      });
      setToast('Case picked up and reassigned to you.');
    }
    navigate(`/cases/${callId}`);
  };

  // Toast when a previously assigned case is reassigned away (still pending, different auditor).
  useEffect(() => {
    const currentIds = new Set(getMyPendingQueue(SEED_AUDITOR.id).map((c) => c.call.id));
    const stillPending = new Set(getPendingQueue().map((c) => c.call.id));
    const prev = prevAssignedIdsRef.current;
    if (prev) {
      for (const id of prev) {
        if (!currentIds.has(id) && stillPending.has(id)) {
          setToast('A case was reassigned to another auditor.');
          break;
        }
      }
    }
    prevAssignedIdsRef.current = currentIds;
  }, [session.version]);

  const handleResume = () => setStatus('online');

  const renderStatusCard = () => {
    if (status === 'on_break') {
      return (
        <OnBreakCard
          breakStartedAt={breakStartedAt}
          onResume={handleResume}
          layout="hero"
          subtitle="Case review is paused while you're on break"
        />
      );
    }
    if (sessionSummary.hasBeenOnlineToday) {
      return (
        <SessionSummaryCard
          wentOnlineAt={sessionSummary.wentOnlineAt}
          totalActiveSec={sessionSummary.totalActiveSec}
          totalBreakSec={getBreakSec()}
          wentOfflineAt={sessionSummary.wentOfflineAt}
          onGoOnline={() => setStatus('online')}
          layout="hero"
        />
      );
    }
    return (
      <GoOnlineCard
        onGoOnline={() => setStatus('online')}
        subtitle="Ready to review cases?"
      />
    );
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">My Cases</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Cases assigned to you — oldest assignment first.
          </p>
          <p className="text-xs text-text-muted mt-1">
            Queue: {stats.totalPending} cases across {stats.auditorCount} auditors
          </p>
        </div>
        {isOnline && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Clock size={16} />
            <span className="font-semibold text-text">{myQueue.length}</span> assigned
          </div>
        )}
      </div>

      {isOnline ? (
        <>
        <Card>
          <div className="flex items-center gap-2 mb-1">
            <Search size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-text">Find a specific case</h2>
          </div>
          <p className="text-xs text-text-muted mb-3">
            Search by Application ID or Mobile Number to pick up a case directly (e.g. a manager-directed priority review),
            instead of waiting for round-robin allocation.
          </p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Application ID or Mobile Number…"
            className="w-full px-3 py-2 rounded-lg border border-border text-sm"
          />
          {q && (
            <div className="mt-3 divide-y divide-border border border-border rounded-lg">
              {searchResults.map((c) => {
                const mine = c.assignment.auditorId === SEED_AUDITOR.id;
                return (
                  <div key={c.call.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-text">{c.customer.appId}</div>
                      <div className="text-sm text-text truncate">{c.customer.name} · {c.customer.phone}</div>
                      <div className="text-xs text-text-muted">
                        {mine ? 'Assigned to you' : `Currently with ${getAuditorName(c.assignment.auditorId)}`}
                      </div>
                    </div>
                    <Button size="sm" variant={mine ? 'secondary' : 'primary'} onClick={() => pickUp(c.call.id, mine)}>
                      {mine ? 'Open' : 'Pick up this case'}
                    </Button>
                  </div>
                );
              })}
              {searchResults.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-text-muted">
                  No pending case matches “{query.trim()}”.
                </div>
              )}
            </div>
          )}
        </Card>
        <Card padding={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="px-4 py-3 font-medium">Assigned At</th>
                  <th className="px-4 py-3 font-medium">App ID</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Mobile</th>
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Call Duration</th>
                  <th className="px-4 py-3 font-medium text-right">Waiting</th>
                </tr>
              </thead>
              <tbody>
                {myQueue.map((c) => {
                  const sec = agingSeconds(c.approvedAt, now);
                  return (
                    <tr
                      key={c.call.id}
                      onClick={() => navigate(`/cases/${c.call.id}`)}
                      className="border-b border-border last:border-0 transition-colors hover:bg-primary-soft/40 cursor-pointer"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                        {formatTimeLabel(c.assignment.assignedAt)}
                        <span className="text-text-muted/70 ml-1">
                          {new Date(c.assignment.assignedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text">{c.customer.appId}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-text">{c.customer.name}</div>
                        <div className="text-xs text-text-muted">{c.customer.productType}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text whitespace-nowrap">{c.customer.phone}</td>
                      <td className="px-4 py-3 text-text">{c.agent.name}</td>
                      <td className="px-4 py-3 font-mono tabular-nums text-text-muted">
                        {formatDuration(c.call.durationSec)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <StatusPill label={agingLabel(sec)} variant={agingVariant(sec)} />
                      </td>
                    </tr>
                  );
                })}
                {myQueue.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-text-muted">
                      All caught up — no cases assigned to you.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        </>
      ) : (
        renderStatusCard()
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-lg bg-text text-white text-sm shadow-card">
          {toast}
        </div>
      )}
    </div>
  );
}
