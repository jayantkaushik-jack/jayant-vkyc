import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnBreakCard } from '@agent/components/session-status/OnBreakCard';
import { SessionSummaryCard } from '@agent/components/session-status/SessionSummaryCard';
import { OnlineStatusStrip } from '@agent/components/session-status/OnlineStatusStrip';
import { useAgent } from '@agent/features/agent/AgentContext';
import { DeviceCheckModal } from '@agent/features/agent/components/DeviceCheckModal';
import { FUNNEL_TODAY } from '@agent/features/agent/queueStats';

/**
 * Round 30 (screen 03) — the offline empty state is rebuilt on the new
 * `.empty`/`.card`/`.chip`/`.metric` classes, matching the reference exactly:
 * icon, "You're offline", body copy, a reason-to-act card bound to the real
 * FUNNEL_TODAY.amber count (see queueStats.ts), a primary Go online action,
 * and the break-timer footnote. The performance stat-card row (Calls Taken /
 * Approved / Rejected / Avg Call Time / My Accuracy) that used to sit above
 * every hero-slot state is dropped per the reference — confirmed with the
 * user before building, since it wasn't mentioned anywhere in the handoff
 * and the reference screen doesn't show it. The Online / On break / "already
 * been online today" hero states are untouched — none of those are covered
 * by this round's reference, only the fresh-offline case is.
 */
export function AgentHomePage() {
  const navigate = useNavigate();
  const { status, breakStartedAt, sessionSummary, getBreakSec, setStatus } = useAgent();
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);

  const handleResume = () => {
    setStatus('online');
    navigate('/agent/queue');
  };

  if (status === 'online') {
    return (
      <div className="p-6">
        <OnlineStatusStrip queueHref="/agent/queue" />
      </div>
    );
  }

  if (status === 'on_break') {
    return (
      <div className="p-6">
        <OnBreakCard breakStartedAt={breakStartedAt} onResume={handleResume} layout="hero" />
      </div>
    );
  }

  if (sessionSummary.hasBeenOnlineToday) {
    return (
      <div className="p-6">
        <SessionSummaryCard
          wentOnlineAt={sessionSummary.wentOnlineAt}
          totalActiveSec={sessionSummary.totalActiveSec}
          totalBreakSec={getBreakSec()}
          wentOfflineAt={sessionSummary.wentOfflineAt}
          onGoOnline={() => setDeviceModalOpen(true)}
          layout="hero"
        />
        <DeviceCheckModal open={deviceModalOpen} onClose={() => setDeviceModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="relative min-h-full flex items-center justify-center">
      <div className="atmos" aria-hidden="true" style={{ opacity: 0.72 }}>
        <div className="atmos__blob" style={{ width: '52%', aspectRatio: '1', top: '-22%', left: '2%', background: 'var(--blob-1)', opacity: 0.62 }} />
        <div className="atmos__blob" style={{ width: '40%', aspectRatio: '1', top: '18%', right: '-6%', background: 'var(--blob-3)', opacity: 0.5 }} />
        <div className="atmos__blob" style={{ width: '46%', aspectRatio: '1', bottom: '-24%', right: '12%', background: 'var(--blob-4)', opacity: 0.55 }} />
      </div>
      <div className="blueprint" aria-hidden="true" style={{ color: 'var(--n-900)', opacity: 0.7 }}>
        <div className="blueprint__grid" />
        <span className="blueprint__bracket blueprint__bracket--tl" />
        <span className="blueprint__bracket blueprint__bracket--br" />
      </div>

      <div className="empty glass anim-rise d-2">
        <div className="empty__icon" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z" /><path d="M5.6 5.6l12.8 12.8" />
          </svg>
        </div>

        <h2 className="t-h1 empty__title">You&rsquo;re offline</h2>
        <p className="t-body empty__body">
          No cases are being routed to you. Go online to start receiving amber
          cases from today&rsquo;s queue.
        </p>

        <div className="card card--flat" style={{
          background: 'rgba(255,255,255,.5)', borderColor: 'var(--n-200)',
          padding: 'var(--s-3) var(--s-4)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 'var(--s-3)', marginBottom: 'var(--s-6)',
        }}>
          <span className="chip chip--wa">Amber</span>
          <div className="metric">
            <span className="metric__num">{FUNNEL_TODAY.amber}</span>
            <span className="t-small c-muted">cases waiting in today&rsquo;s queue</span>
          </div>
        </div>

        <button className="btn btn--primary btn--lg btn--sheen" type="button" onClick={() => setDeviceModalOpen(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          Go online
        </button>

        <p className="t-small c-faint" style={{ marginTop: 'var(--s-4)' }}>
          Your break timer keeps running until you do.
        </p>
      </div>

      <DeviceCheckModal open={deviceModalOpen} onClose={() => setDeviceModalOpen(false)} />
    </div>
  );
}
