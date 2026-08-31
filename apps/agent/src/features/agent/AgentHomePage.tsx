import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTodayStats, calls } from '@vkyc/shared/data';
import { METRIC_TOOLTIPS } from '@vkyc/shared/lib/constants';
import { getGreeting, formatMinutes } from '@vkyc/shared/lib/format';
import { StatCard } from '@agent/components/ui/StatCard';
import { OnBreakCard } from '@agent/components/session-status/OnBreakCard';
import { SessionSummaryCard } from '@agent/components/session-status/SessionSummaryCard';
import { OnlineStatusStrip } from '@agent/components/session-status/OnlineStatusStrip';
import { GoOnlineCard } from '@agent/components/session-status/GoOnlineCard';
import { useAgent } from '@agent/features/agent/AgentContext';
import { DeviceCheckModal } from '@agent/features/agent/components/DeviceCheckModal';

export function AgentHomePage() {
  const navigate = useNavigate();
  const { agent, status, breakStartedAt, sessionSummary, getBreakSec, setStatus } = useAgent();
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const stats = getTodayStats(calls, agent.id);
  const firstName = agent.name.split(' ')[0];

  const handleResume = () => {
    setStatus('online');
    navigate('/agent/queue');
  };

  const renderHeroSlot = () => {
    if (status === 'online') {
      return <OnlineStatusStrip queueHref="/agent/queue" />;
    }
    if (status === 'on_break') {
      return (
        <OnBreakCard
          breakStartedAt={breakStartedAt}
          onResume={handleResume}
          layout="hero"
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
          onGoOnline={() => setDeviceModalOpen(true)}
          layout="hero"
        />
      );
    }
    return <GoOnlineCard onGoOnline={() => setDeviceModalOpen(true)} />;
  };

  return (
    <div className="p-6">
      <div className="max-w-[1100px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-text-muted text-sm mt-1">Here&apos;s your performance snapshot for today</p>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <StatCard label="Calls Taken" value={stats.callsTaken} tooltip={METRIC_TOOLTIPS.callsTaken} />
          <StatCard label="Approved" value={stats.approved} tooltip={METRIC_TOOLTIPS.approved} />
          <StatCard label="Rejected" value={stats.rejected} tooltip={METRIC_TOOLTIPS.rejected} />
          <StatCard
            label="Avg Call Time"
            value={formatMinutes(stats.avgCallTimeSec)}
            tooltip={METRIC_TOOLTIPS.avgCallTime}
          />
          <StatCard
            label="My Accuracy"
            value={`${stats.accuracy}%`}
            tooltip={METRIC_TOOLTIPS.accuracy}
          />
        </div>

        {renderHeroSlot()}
      </div>

      <DeviceCheckModal open={deviceModalOpen} onClose={() => setDeviceModalOpen(false)} />
    </div>
  );
}
