import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Button } from '@agent/components/ui/Button';
import { Card } from '@agent/components/ui/Card';
import { OnBreakCard } from '@agent/components/session-status/OnBreakCard';
import { SessionSummaryCard } from '@agent/components/session-status/SessionSummaryCard';
import { useState } from 'react';
import { IncomingCallCard } from '@agent/components/agent-status/IncomingCallCard';
import { RiskSnapshotModal } from '@agent/components/risk/RiskSnapshotModal';
import { useAgent } from '@agent/features/agent/AgentContext';
import {
  PERSONAS,
  SAMPLE_QUEUE_ROWS,
  DIMENSION_LABELS,
  DIMENSION_ORDER,
  type AmberPersona,
  type QueueRow,
  type DimensionLevel,
} from '@agent/features/agent/call/amber/personas';
import { getInitials } from '@vkyc/shared/lib/avatar';
import { cn } from '@vkyc/shared/lib/cn';

/** I · D · T · P · C — same fixed order as DIMENSION_ORDER, initials for the dot-strip sub-header (round 15 rename). */
const DIMENSION_INITIALS: Record<keyof typeof DIMENSION_LABELS, string> = {
  identity: 'I',
  digitalPresence: 'D',
  telecom: 'T',
  paymentFraudBlacklists: 'P',
  coherenceRisk: 'C',
};

/**
 * Static, slowly-illustrative aggregate — not a request to generate 10,000
 * real case records. Deliberately decoupled from however many actual
 * clickable cases exist below (SAMPLE_QUEUE_ROWS); a single source so this
 * never needs hand-editing in more than one place.
 */
const FUNNEL_TODAY = { scored: 10_000, green: 8_200, red: 1_400, amber: 400 };

const DOT_COLOR: Record<DimensionLevel, string> = {
  LOW: 'bg-success',
  MEDIUM: 'bg-warning',
  HIGH: 'bg-danger',
  NOT_AVAILABLE: 'bg-text-disabled',
};

const BAND_WORD: Record<QueueRow['riskSnapshot']['muleScoreBand'], string> = {
  LOW: 'Green',
  MEDIUM: 'Amber',
  HIGH: 'Red',
};

/** Round 15 (§1): Band/Status render as pill chips now, not plain colored text. */
const BAND_CHIP_CLASS: Record<QueueRow['riskSnapshot']['muleScoreBand'], string> = {
  LOW: 'bg-success-subtle text-success-strong',
  MEDIUM: 'bg-warning-subtle text-warning-text',
  HIGH: 'bg-danger-subtle text-danger',
};

const FUNNEL_DOT_CLASS = { green: 'bg-success', red: 'bg-danger', amber: 'bg-warning' } as const;

function isSelectablePersonaRow(row: QueueRow): row is QueueRow & { id: AmberPersona['id'] } {
  return row.status === 'Waiting' && row.id in PERSONAS;
}

function TodaysQueue({
  demoPersonaId,
  onSelectPersona,
}: {
  demoPersonaId: AmberPersona['id'];
  onSelectPersona: (id: AmberPersona['id']) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [openRow, setOpenRow] = useState<QueueRow | null>(null);

  return (
    <div className="rounded-lg border border-border bg-surface shadow-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-2.5 text-xs text-text-muted flex items-center gap-1.5 flex-wrap text-left hover:bg-primary-soft/40"
      >
        <span className="font-medium text-text">Today's Queue:</span>
        <span>{FUNNEL_TODAY.scored.toLocaleString()} scored</span>
        <span>→</span>
        <span className="inline-flex items-center gap-1 text-success">
          <span className={cn('w-1.5 h-1.5 rounded-full', FUNNEL_DOT_CLASS.green)} />
          {FUNNEL_TODAY.green.toLocaleString()} Green (auto)
        </span>
        <span>→</span>
        <span className="inline-flex items-center gap-1 text-danger">
          <span className={cn('w-1.5 h-1.5 rounded-full', FUNNEL_DOT_CLASS.red)} />
          {FUNNEL_TODAY.red.toLocaleString()} Red (auto)
        </span>
        <span>→</span>
        <span className="inline-flex items-center gap-1 text-warning">
          <span className={cn('w-1.5 h-1.5 rounded-full', FUNNEL_DOT_CLASS.amber)} />
          {FUNNEL_TODAY.amber.toLocaleString()} Amber (you)
        </span>
        <ChevronDown size={14} className={cn('ml-auto shrink-0 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <>
          <div className="border-t border-border max-h-80 overflow-y-auto">
            <div className="flex items-start gap-3 px-4 py-1.5 border-b border-border text-[10.5px] uppercase tracking-wide text-text-disabled font-medium sticky top-0 bg-surface z-10">
              <span className="w-[30px] shrink-0" aria-hidden />
              <span className="w-28 shrink-0">Customer</span>
              <span className="w-14 shrink-0">Band</span>
              <span className="w-10 shrink-0 text-right">Score</span>
              <span className="w-28 shrink-0">
                <span className="block">Risk Profile</span>
                <span className="flex gap-1.5 mt-0.5 normal-case">
                  {DIMENSION_ORDER.map((key) => (
                    <span key={key} className="w-3.5 text-center text-[9px]">{DIMENSION_INITIALS[key]}</span>
                  ))}
                </span>
              </span>
              <span className="w-24 shrink-0">Rules</span>
              <span className="ml-auto shrink-0">Status</span>
            </div>
            <div className="divide-y divide-border">
              {SAMPLE_QUEUE_ROWS.map((row) => {
                const selectable = isSelectablePersonaRow(row);
                const selected = selectable && row.id === demoPersonaId;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => (selectable ? onSelectPersona(row.id) : setOpenRow(row))}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2 text-xs text-left hover:bg-primary-soft/40 border-l-2',
                      selected ? 'border-primary bg-primary-soft/60' : 'border-transparent',
                    )}
                  >
                    <span
                      className={cn(
                        'w-[30px] h-[30px] shrink-0 rounded-full flex items-center justify-center text-[10px] font-semibold',
                        selected ? 'bg-primary-soft text-primary' : 'bg-bg text-text-muted',
                      )}
                    >
                      {getInitials(row.name)}
                    </span>
                    <span className="font-medium text-text w-28 truncate shrink-0">{row.name}</span>
                    <span className="w-14 shrink-0">
                      <span className={cn('inline-flex px-2.5 py-1 rounded-md text-[11px] font-semibold', BAND_CHIP_CLASS[row.riskSnapshot.muleScoreBand])}>
                        {BAND_WORD[row.riskSnapshot.muleScoreBand]}
                      </span>
                    </span>
                    <span className="w-10 shrink-0 text-text-muted text-right">{row.riskSnapshot.muleScore}</span>
                    <span className="flex gap-1.5 shrink-0 w-28">
                      {DIMENSION_ORDER.map((key) => (
                        <span
                          key={key}
                          title={`${DIMENSION_LABELS[key]}: ${row.riskSnapshot.dimensions[key].level}`}
                          className={cn('w-3.5 h-3.5 rounded-full', DOT_COLOR[row.riskSnapshot.dimensions[key].level])}
                        />
                      ))}
                    </span>
                    <span className="w-24 shrink-0 min-w-0">
                      <span className="block text-text-muted">
                        {row.rulesFiredCount > 0 ? `${row.rulesFiredCount} rule${row.rulesFiredCount === 1 ? '' : 's'} fired` : 'No rules fired'}
                      </span>
                    </span>
                    <span className="ml-auto shrink-0">
                      <span
                        className={cn(
                          'inline-flex px-2.5 py-1 rounded-md text-[11px] font-semibold',
                          row.status === 'Waiting' ? 'bg-warning-subtle text-warning-text' : 'bg-bg text-text-muted',
                        )}
                      >
                        {row.status}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {/*
           * Round 16 (§1a): sibling AFTER the scrollable row container, not a
           * descendant of it — the legend previously lived inside the
           * overflow-y-auto div and scrolled away with the rows.
           */}
          <div className="flex items-center gap-3 px-4 py-2 border-t border-border text-[10px] text-text-muted flex-wrap">
            <span className="font-medium text-text">Risk Profile:</span>
            {DIMENSION_ORDER.map((key) => (
              <span key={key} className="inline-flex items-center gap-1">
                <span className="font-bold text-text">{DIMENSION_INITIALS[key]}</span> {DIMENSION_LABELS[key]}
              </span>
            ))}
          </div>
        </>
      )}

      {openRow && (
        <RiskSnapshotModal
          open
          onClose={() => setOpenRow(null)}
          name={openRow.name}
          riskSnapshot={openRow.riskSnapshot}
        />
      )}
    </div>
  );
}

export function QueuePage() {
  const navigate = useNavigate();
  const {
    acceptCall,
    clearCall,
    currentCustomer,
    status,
    setStatus,
    breakStartedAt,
    sessionSummary,
    getBreakSec,
    incomingSince,
    demoPersonaId,
    selectQueuedPersona,
  } = useAgent();

  const handleAccept = () => {
    const callId = acceptCall();
    navigate(`/agent/call/${callId}`);
  };

  const handleResume = () => {
    setStatus('online');
  };

  if (status === 'on_break') {
    return (
      <div className="p-6 min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <OnBreakCard
          breakStartedAt={breakStartedAt}
          onResume={handleResume}
          className="max-w-md"
        />
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div className="p-6 min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        {sessionSummary.hasBeenOnlineToday ? (
          <SessionSummaryCard
            wentOnlineAt={sessionSummary.wentOnlineAt}
            totalActiveSec={sessionSummary.totalActiveSec}
            totalBreakSec={getBreakSec()}
            wentOfflineAt={sessionSummary.wentOfflineAt}
            onGoOnline={() => setStatus('online')}
            className="max-w-md"
          />
        ) : (
          <Card className="max-w-md w-full text-center" padding>
            <h2 className="text-xl font-semibold mb-2">You&apos;re offline</h2>
            <p className="text-sm text-text-muted mb-6">Go online from Home to start taking calls.</p>
            <Button onClick={() => navigate('/agent')}>Back to Home</Button>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 min-h-[calc(100vh-3.5rem)]">
      <div className="max-w-[1100px] mx-auto mb-4">
        <TodaysQueue demoPersonaId={demoPersonaId} onSelectPersona={selectQueuedPersona} />
      </div>
      <div className="max-w-[1100px] mx-auto flex flex-col items-center justify-center min-h-[500px]">
        {currentCustomer ? (
          <IncomingCallCard
            customer={currentCustomer}
            incomingSince={incomingSince}
            riskSnapshot={PERSONAS[demoPersonaId].riskSnapshot}
            onAccept={handleAccept}
            onReject={clearCall}
          />
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 wait-breathe-ring pointer-events-none" />
              <div className="absolute inset-8 rounded-full bg-primary-soft pointer-events-none wait-breathe-ring" style={{ animationDelay: '0.1s' }} />
              <div className="relative z-10 text-center w-32">
                <p className="text-sm font-medium text-primary breath-label-in absolute inset-x-0">breathe in</p>
                <p className="text-sm font-medium text-primary breath-label-out absolute inset-x-0">breathe out</p>
              </div>
            </div>
            <p className="mt-8 text-lg font-medium text-text-muted">
              Waiting for next customer…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
