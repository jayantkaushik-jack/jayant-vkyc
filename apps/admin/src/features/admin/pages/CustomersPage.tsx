import { useEffect, useMemo, useState, Fragment } from 'react';
import { Activity, FileText, UserRound, Video } from 'lucide-react';
import {
  getCustomerQueue,
  getCallHistoryPage,
  LIVE_CALL_STAGES,
  TYPICAL_STAGE_DURATION_SEC,
  type CustomerQueueTab,
  type CallHistoryRow,
  type LiveCallStage,
} from '@vkyc/shared/data/adminSelectors';
import { agents, auditors, customers, getAllProductTypes } from '@vkyc/shared/data';
import { Avatar } from '@vkyc/shared/components/ui/Avatar';
import { Card } from '@vkyc/shared/components/ui/Card';
import { StatusPill } from '@vkyc/shared/components/ui/StatusPill';
import { CallLogViewModal } from '@vkyc/shared/components/call/CallLogViewModal';
import { CallRecordingPlayer } from '@vkyc/shared/components/call/CallRecordingPlayer';
import { CustomerDetailsDrawer } from '@admin/features/admin/components/CustomerDetailsDrawer';
import { ActivityLogModal } from '@admin/features/admin/components/ActivityLogModal';
import { Modal } from '@vkyc/shared/components/ui/Modal';
import { PartnerMultiSelect } from '@vkyc/shared/components/ui/PartnerMultiSelect';
import { formatDuration, formatTimeLabel } from '@vkyc/shared/lib/format';
import { cn } from '@vkyc/shared/lib/cn';
import {
  PARTNERS,
  type AgentStatusLevel,
  type AuditorStatusLevel,
  type CallStatusLevel,
  type PartnerId,
} from '@vkyc/shared/data/types';

type MainTab = 'queue' | 'history';
interface QueueEntry {
  id: string;
  customer: (typeof customers)[number];
  partnerName: string;
  assignedAgent: (typeof agents)[number] | null;
  joinMs: number;
  scheduledMs?: number;
  targetDurationSec?: number;
  currentStage?: LiveCallStage;
  /** Baseline seconds in stage at entry creation / seed load. */
  baseTimeInStageSec?: number;
  /** Wall-clock ms when baseTimeInStageSec was captured (for ticking). */
  stageClockMs?: number;
}

interface QueueState {
  waiting: QueueEntry[];
  live: QueueEntry[];
  scheduled: QueueEntry[];
  cursor: number;
  seq: number;
}

interface HistoryCriteria {
  statuses: CallStatusLevel[];
  agentId: string;
  auditorId: string;
  partnerIds: PartnerId[];
  agentStatuses: AgentStatusLevel[];
  auditorDecisions: AuditorStatusLevel[];
  productType: string;
  phone: string;
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_CRITERIA: HistoryCriteria = {
  statuses: [],
  agentId: '',
  auditorId: '',
  partnerIds: [],
  agentStatuses: [],
  auditorDecisions: [],
  productType: '',
  phone: '',
  dateFrom: '',
  dateTo: '',
};

function partnerName(partnerId: (typeof PARTNERS)[number]['id']) {
  return PARTNERS.find((p) => p.id === partnerId)?.name ?? partnerId;
}

function hashNum(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function entryFromSeedRow(row: ReturnType<typeof getCustomerQueue>[number], kind: CustomerQueueTab, clockMs: number): QueueEntry {
  return {
    id: row.id,
    customer: row.customer,
    partnerName: row.partnerName,
    assignedAgent: row.assignedAgent,
    joinMs: new Date(row.joinTime).getTime(),
    scheduledMs: row.scheduledTime ? new Date(row.scheduledTime).getTime() : undefined,
    targetDurationSec: kind === 'live' ? 140 + (hashNum(row.id) % 120) : undefined,
    currentStage: row.currentStage,
    baseTimeInStageSec: row.timeInStageSec,
    stageClockMs: kind === 'live' ? clockMs : undefined,
  };
}

function liveTimeInStageSec(entry: QueueEntry, nowMs: number): number {
  const base = entry.baseTimeInStageSec ?? 0;
  if (entry.stageClockMs == null) return base;
  return base + Math.max(0, Math.floor((nowMs - entry.stageClockMs) / 1000));
}

function StageDots({ stage }: { stage: LiveCallStage }) {
  const idx = LIVE_CALL_STAGES.indexOf(stage);
  return (
    <div className="flex items-center gap-0.5" title={`Progress: ${stage}`}>
      {LIVE_CALL_STAGES.map((s, i) => (
        <span
          key={s}
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            i < idx ? 'bg-primary' : i === idx ? 'bg-primary ring-2 ring-primary/30' : 'bg-border',
          )}
        />
      ))}
    </div>
  );
}

function createNewWaitingEntry(state: QueueState, demoNowMs: number): QueueEntry {
  const customer = customers[state.cursor % customers.length];
  const agent = agents[(state.cursor * 7) % agents.length];
  return {
    id: `queue-waiting-dyn-${state.seq}`,
    customer,
    partnerName: partnerName(customer.partnerId),
    assignedAgent: state.cursor % 3 === 0 ? agent : null,
    joinMs: demoNowMs,
  };
}

export function CustomersPage() {
  const [mainTab, setMainTab] = useState<MainTab>('queue');
  const [queueTab, setQueueTab] = useState<CustomerQueueTab>('waiting');
  const [queuePartner, setQueuePartner] = useState<PartnerId | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<CallHistoryRow | null>(null);
  const [modal, setModal] = useState<'details' | 'activity' | 'report' | 'video' | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [criteria, setCriteria] = useState<HistoryCriteria>(DEFAULT_CRITERIA);
  const [elapsedSec, setElapsedSec] = useState(0);
  const mountMs = useMemo(() => Date.now(), []);
  const [queueState, setQueueState] = useState<QueueState>(() => ({
    waiting: getCustomerQueue('waiting').map((r) => entryFromSeedRow(r, 'waiting', mountMs)).sort((a, b) => a.joinMs - b.joinMs),
    live: getCustomerQueue('live').map((r) => entryFromSeedRow(r, 'live', mountMs)),
    scheduled: getCustomerQueue('scheduled').map((r) => entryFromSeedRow(r, 'scheduled', mountMs)),
    cursor: 0,
    seq: 0,
  }));
  const demoBaseMs = useMemo(() => {
    const d = new Date();
    d.setHours(14, 5, 0, 0);
    return d.getTime();
  }, []);
  const demoNowMs = demoBaseMs + elapsedSec * 1000;
  const wallNowMs = mountMs + elapsedSec * 1000;

  useEffect(() => {
    const id = setInterval(() => setElapsedSec((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setQueueState((prev) => {
      let waiting = [...prev.waiting].sort((a, b) => a.joinMs - b.joinMs);
      let live = [...prev.live];
      let cursor = prev.cursor;
      let seq = prev.seq;

      const movedToLive: QueueEntry[] = [];
      while (waiting.length > 0 && demoNowMs - waiting[0].joinMs > 5 * 60 * 1000) {
        const picked = waiting.shift()!;
        const stage = LIVE_CALL_STAGES[hashNum(`${picked.customer.id}-${seq}`) % LIVE_CALL_STAGES.length];
        movedToLive.push({
          ...picked,
          id: `queue-live-dyn-${seq}`,
          joinMs: demoNowMs,
          targetDurationSec: 140 + (hashNum(`${picked.customer.id}-${seq}`) % 120),
          currentStage: stage,
          baseTimeInStageSec: 5 + (hashNum(`${picked.id}-stage`) % 40),
          stageClockMs: Date.now(),
        });
        seq += 1;
      }
      if (movedToLive.length > 0) {
        live = [...live, ...movedToLive];
      }

      live = live.filter((entry) => {
        const maxSec = entry.targetDurationSec ?? 180;
        return (demoNowMs - entry.joinMs) / 1000 <= maxSec;
      });

      while (waiting.length < 6) {
        const next: QueueEntry = createNewWaitingEntry(
          { waiting, live, scheduled: prev.scheduled, cursor, seq },
          demoNowMs,
        );
        waiting.push(next);
        cursor += 1;
        seq += 1;
      }

      return { ...prev, waiting, live, cursor, seq };
    });
  }, [demoNowMs]);

  const queueRows = queueTab === 'waiting'
    ? queueState.waiting
    : queueTab === 'live'
      ? queueState.live
      : queueState.scheduled;
  const byPartner = (list: QueueEntry[]) =>
    queuePartner === 'ALL' ? list : list.filter((e) => e.customer.partnerId === queuePartner);
  const displayedRows = byPartner(queueRows);

  const history = getCallHistoryPage(page, 25, {
    search: search || undefined,
    phone: criteria.phone || undefined,
    callStatuses: criteria.statuses.length > 0 ? criteria.statuses : undefined,
    agentIds: criteria.agentId ? [criteria.agentId] : undefined,
    auditorIds: criteria.auditorId ? [criteria.auditorId] : undefined,
    partnerIds: criteria.partnerIds.length > 0 ? criteria.partnerIds : undefined,
    agentStatuses: criteria.agentStatuses.length > 0 ? criteria.agentStatuses : undefined,
    auditorDecisions: criteria.auditorDecisions.length > 0 ? criteria.auditorDecisions : undefined,
    productTypes: criteria.productType ? [criteria.productType] : undefined,
    dateFrom: criteria.dateFrom || undefined,
    dateTo: criteria.dateTo || undefined,
  });
  const pageItems = getPageItems(history.page, history.totalPages);
  const productTypes = useMemo(() => getAllProductTypes(), []);
  const activeFilterCount = countActiveFilters(criteria);
  const droppedOnly = criteria.statuses.length > 0 && criteria.statuses.every((s) => s === 'User Dropped');

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Customers</h1>

      <div className="flex gap-2 border-b border-border">
        {(['queue', 'history'] as MainTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setMainTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize',
              mainTab === t ? 'border-primary text-primary' : 'border-transparent text-text-muted',
            )}
          >
            {t === 'queue' ? 'Customer Queue' : 'Call History'}
          </button>
        ))}
      </div>

      {mainTab === 'queue' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              {(['waiting', 'live', 'scheduled'] as CustomerQueueTab[]).map((t) => {
                const list = t === 'waiting' ? queueState.waiting : t === 'live' ? queueState.live : queueState.scheduled;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setQueueTab(t)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm border capitalize',
                      queueTab === t ? 'bg-primary text-white border-primary' : 'border-border',
                    )}
                  >
                    {t} ({byPartner(list).length})
                  </button>
                );
              })}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-text-muted">Partner</span>
              <select
                value={queuePartner}
                onChange={(e) => setQueuePartner(e.target.value as PartnerId | 'ALL')}
                className="px-3 py-1.5 rounded-lg border border-border text-sm bg-surface"
              >
                <option value="ALL">All partners</option>
                {PARTNERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          </div>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="pb-2 pr-3">{queueTab === 'live' ? 'Start Time' : 'Join Time'}</th>
                  <th className="pb-2 pr-3">Customer Name</th>
                  <th className="pb-2 pr-3">Phone</th>
                  <th className="pb-2 pr-3">App ID</th>
                  <th className="pb-2 pr-3">Partner</th>
                  <th className="pb-2 pr-3">Assigned Agent</th>
                  {queueTab === 'live' && (
                    <>
                      <th className="pb-2 pr-3">Current Stage</th>
                      <th className="pb-2 pr-3">Time in Stage</th>
                      <th className="pb-2 pr-3">Progress</th>
                    </>
                  )}
                  {queueTab === 'scheduled' && <th className="pb-2 pr-3">Scheduled Time</th>}
                  <th className="pb-2">{queueTab === 'live' ? 'In Call Time' : 'Waiting Since'}</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row) => {
                  const stageSec = queueTab === 'live' ? liveTimeInStageSec(row, wallNowMs) : 0;
                  const typical = row.currentStage ? TYPICAL_STAGE_DURATION_SEC[row.currentStage] : 0;
                  const stageAmber = queueTab === 'live' && typical > 0 && stageSec > typical * 2;
                  return (
                    <tr key={row.id} className="border-b border-border/50">
                      <td className="py-2 pr-3">{formatTimeLabel(new Date(row.joinMs).toISOString())}</td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <Avatar person={{ id: row.customer.id, name: row.customer.name, gender: row.customer.gender }} size="xs" />
                          {row.customer.name}
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs whitespace-nowrap">{row.customer.phone}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{row.customer.appId}</td>
                      <td className="py-2 pr-3">{row.partnerName}</td>
                      <td className="py-2 pr-3">{row.assignedAgent?.name ?? '—'}</td>
                      {queueTab === 'live' && (
                        <>
                          <td className="py-2 pr-3">{row.currentStage ?? '—'}</td>
                          <td className={cn('py-2 pr-3 font-mono tabular-nums', stageAmber && 'text-amber-600 font-semibold')}>
                            {formatDuration(stageSec)}
                          </td>
                          <td className="py-2 pr-3">
                            {row.currentStage ? <StageDots stage={row.currentStage} /> : '—'}
                          </td>
                        </>
                      )}
                      {queueTab === 'scheduled' && (
                        <td className="py-2 pr-3">{row.scheduledMs ? formatTimeLabel(new Date(row.scheduledMs).toISOString()) : '—'}</td>
                      )}
                      <td className="py-2">
                        {formatDuration(Math.max(0, Math.floor((demoNowMs - row.joinMs) / 1000)))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {mainTab === 'history' && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="px-3 py-1.5 border border-border rounded-lg text-sm"
            >
              Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </button>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => { setCriteria(DEFAULT_CRITERIA); setPage(1); }}
                className="text-xs text-primary hover:underline"
              >
                Clear all
              </button>
            )}
            <input
              type="search"
              placeholder="Search name, App ID, phone, agent, auditor…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="px-3 py-1.5 border border-border rounded-lg text-sm flex-1 min-w-[200px]"
            />
          </div>
          {showFilters && (
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                <FilterToggleGroup
                  label="Call Status"
                  options={[
                    { id: 'Connected', label: 'Connected' },
                    { id: 'User Dropped', label: 'User Dropped' },
                  ]}
                  value={criteria.statuses}
                  onChange={(next) => { setCriteria((c) => ({ ...c, statuses: next as HistoryCriteria['statuses'] })); setPage(1); }}
                />
                <div>
                  <p className="text-xs text-text-muted mb-1">Phone</p>
                  <input
                    type="search"
                    value={criteria.phone}
                    onChange={(e) => { setCriteria((c) => ({ ...c, phone: e.target.value })); setPage(1); }}
                    placeholder="Partial phone…"
                    className="w-full px-2 py-1.5 border border-border rounded font-mono"
                  />
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">Agent</p>
                  <input
                    list="agent-filter-list"
                    value={criteria.agentId ? (agents.find((a) => a.id === criteria.agentId)?.name ?? '') : ''}
                    onChange={(e) => {
                      const match = agents.find((a) => a.name.toLowerCase() === e.target.value.toLowerCase());
                      setCriteria((c) => ({ ...c, agentId: match?.id ?? '' }));
                      setPage(1);
                    }}
                    placeholder="Search/select agent"
                    className="w-full px-2 py-1.5 border border-border rounded"
                  />
                  <datalist id="agent-filter-list">
                    {agents.map((a) => <option key={a.id} value={a.name} />)}
                  </datalist>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">Auditor</p>
                  <input
                    list="auditor-filter-list"
                    value={criteria.auditorId ? (auditors.find((a) => a.id === criteria.auditorId)?.name ?? '') : ''}
                    onChange={(e) => {
                      const match = auditors.find((a) => a.name.toLowerCase() === e.target.value.toLowerCase());
                      setCriteria((c) => ({ ...c, auditorId: match?.id ?? '' }));
                      setPage(1);
                    }}
                    placeholder="Search/select auditor"
                    className="w-full px-2 py-1.5 border border-border rounded"
                  />
                  <datalist id="auditor-filter-list">
                    {auditors.map((a) => <option key={a.id} value={a.name} />)}
                  </datalist>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">Partner</p>
                  <PartnerMultiSelect
                    value={criteria.partnerIds}
                    onChange={(next) => { setCriteria((c) => ({ ...c, partnerIds: next })); setPage(1); }}
                    className="w-full"
                  />
                </div>
                <FilterToggleGroup
                  label="Agent Status"
                  options={[
                    { id: 'Approved', label: 'Approved' },
                    { id: 'Unable to Verify', label: 'Unable to Verify' },
                    { id: 'Rejected', label: 'Rejected' },
                  ]}
                  value={criteria.agentStatuses}
                  onChange={(next) => { setCriteria((c) => ({ ...c, agentStatuses: next as HistoryCriteria['agentStatuses'] })); setPage(1); }}
                  disabled={droppedOnly}
                />
                <FilterToggleGroup
                  label="Auditor Decision"
                  options={[
                    { id: 'Approved', label: 'Approved' },
                    { id: 'Recapture', label: 'Recapture' },
                    { id: 'Rejected', label: 'Rejected' },
                    { id: 'In Review', label: 'In Review' },
                  ]}
                  value={criteria.auditorDecisions}
                  onChange={(next) => { setCriteria((c) => ({ ...c, auditorDecisions: next as HistoryCriteria['auditorDecisions'] })); setPage(1); }}
                  disabled={droppedOnly}
                />
                <div>
                  <p className="text-xs text-text-muted mb-1">Product</p>
                  <select
                    value={criteria.productType}
                    onChange={(e) => { setCriteria((c) => ({ ...c, productType: e.target.value })); setPage(1); }}
                    className="w-full px-2 py-1.5 border border-border rounded"
                  >
                    <option value="">All</option>
                    {productTypes.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">Date From</p>
                  <input
                    type="date"
                    value={criteria.dateFrom}
                    onChange={(e) => { setCriteria((c) => ({ ...c, dateFrom: e.target.value })); setPage(1); }}
                    className="w-full px-2 py-1.5 border border-border rounded"
                  />
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">Date To</p>
                  <input
                    type="date"
                    value={criteria.dateTo}
                    onChange={(e) => { setCriteria((c) => ({ ...c, dateTo: e.target.value })); setPage(1); }}
                    className="w-full px-2 py-1.5 border border-border rounded"
                  />
                </div>
              </div>
            </Card>
          )}
          <p className="text-xs text-text-muted">
            Showing {(page - 1) * 25 + 1}–{Math.min(page * 25, history.total)} of {history.total.toLocaleString()} Records
          </p>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="pb-2 pr-2">Last Activity</th>
                  <th className="pb-2 pr-2">App ID</th>
                  <th className="pb-2 pr-2">Phone</th>
                  <th className="pb-2 pr-2">Partner</th>
                  <th className="pb-2 pr-2">Customer</th>
                  <th className="pb-2 pr-2">Call Status</th>
                  <th className="pb-2 pr-2">Duration</th>
                  <th className="pb-2 pr-2">Agent</th>
                  <th className="pb-2 pr-2">Agent Status</th>
                  <th className="pb-2 pr-2">Auditor Decision</th>
                  <th className="pb-2 pr-2">Product</th>
                  <th className="pb-2">Auditor</th>
                </tr>
              </thead>
              <tbody>
                {history.rows.map((row) => (
                  <Fragment key={row.call.id}>
                    <tr
                      className="border-b border-border/50 cursor-pointer hover:bg-primary-soft/20"
                      onClick={() => setExpandedId(expandedId === row.call.id ? null : row.call.id)}
                    >
                      <td className="py-2 pr-2 text-xs">{row.lastActivity.slice(0, 16).replace('T', ' ')}</td>
                      <td className="py-2 pr-2 font-mono text-xs">{row.customer.appId}</td>
                      <td className="py-2 pr-2 font-mono text-xs whitespace-nowrap">{row.customer.phone}</td>
                      <td className="py-2 pr-2">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] bg-primary-soft text-primary">
                          {partnerName(row.customer.partnerId)}
                        </span>
                      </td>
                      <td className="py-2 pr-2">{row.customer.name}</td>
                      <td className="py-2 pr-2">
                        <StatusPill label={row.callStatus} variant={row.callStatus === 'Connected' ? 'accepted' : 'neutral'} />
                      </td>
                      <td className="py-2 pr-2">{formatDuration(row.callStatus === 'User Dropped' ? 0 : row.call.durationSec)}</td>
                      <td className="py-2 pr-2">{row.agent.name}</td>
                      <td className="py-2 pr-2">
                        {row.callStatus === 'User Dropped' ? '—' : (row.call.agentStatus ?? '—')}
                      </td>
                      <td className="py-2 pr-2">{row.call.agentStatus === 'Approved' ? (row.call.auditorDecision ?? '—') : '—'}</td>
                      <td className="py-2 pr-2 text-xs">{row.customer.productType}</td>
                      <td className="py-2">{row.callStatus === 'User Dropped' ? '—' : (row.auditor?.name ?? '—')}</td>
                    </tr>
                    {expandedId === row.call.id && (
                      <tr>
                        <td colSpan={12} className="py-3 bg-primary-soft/20">
                          <div className="flex flex-wrap justify-center items-center gap-8 text-xs">
                            {[
                              { label: 'View Details', action: 'details' as const, icon: <UserRound size={14} /> },
                              { label: 'Activity Log', action: 'activity' as const, icon: <Activity size={14} /> },
                              { label: 'View Video', action: 'video' as const, icon: <Video size={14} /> },
                              { label: 'View Report', action: 'report' as const, icon: <FileText size={14} />, disabled: row.callStatus === 'User Dropped' },
                            ].map(({ label, action, icon }) => (
                              <button
                                key={label}
                                type="button"
                                title={label === 'View Report' && row.callStatus === 'User Dropped' ? 'No report — call never completed' : undefined}
                                disabled={label === 'View Report' && row.callStatus === 'User Dropped'}
                                className="text-primary hover:underline font-medium inline-flex items-center gap-1.5 disabled:opacity-40 disabled:no-underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelected(row);
                                  setModal(action as typeof modal);
                                }}
                              >
                                {icon}
                                {label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {history.rows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-text-muted">
                      {search.trim() ? `No results for '${search.trim()}'` : 'No call history records'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
          <div className="flex items-center justify-end gap-1 text-sm">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2 py-1 border rounded disabled:opacity-40"
            >
              ‹
            </button>
            {pageItems.map((item, idx) => (
              item === '...'
                ? <span key={`ellipsis-${idx}`} className="px-2 text-text-muted">…</span>
                : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    className={cn(
                      'w-8 h-8 border rounded',
                      item === page ? 'bg-primary text-white border-primary' : 'border-border',
                    )}
                  >
                    {item}
                  </button>
                )
            ))}
            <button
              type="button"
              disabled={page >= history.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2 py-1 border rounded disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </>
      )}

      {selected && modal === 'details' && (
        <CustomerDetailsDrawer open onClose={() => setModal(null)} call={selected.call} customer={selected.customer} agent={selected.agent} />
      )}
      {selected && modal === 'activity' && (
        <ActivityLogModal open onClose={() => setModal(null)} call={selected.call} customer={selected.customer} agent={selected.agent} />
      )}
      {selected && modal === 'report' && (
        <CallLogViewModal
          open
          onClose={() => setModal(null)}
          call={selected.call}
          customer={selected.customer}
          auditor={selected.auditor}
        />
      )}
      {selected && modal === 'video' && (
        <Modal open onClose={() => setModal(null)} title="Video Recording" size="lg">
          <CallRecordingPlayer
            customer={selected.customer}
            agent={selected.agent}
            timestamp={selected.call.answeredAt ?? selected.call.timestamp}
            durationSec={selected.call.durationSec || 180}
          />
        </Modal>
      )}
    </div>
  );
}

function getPageItems(current: number, total: number): Array<number | '...'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: Array<number | '...'> = [1];
  if (current > 3) items.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) items.push(i);
  if (current < total - 2) items.push('...');
  items.push(total);
  return items;
}

function countActiveFilters(criteria: HistoryCriteria): number {
  return [
    criteria.statuses.length > 0,
    !!criteria.agentId,
    !!criteria.auditorId,
    criteria.partnerIds.length > 0,
    criteria.agentStatuses.length > 0,
    criteria.auditorDecisions.length > 0,
    !!criteria.productType,
    !!criteria.phone.trim(),
    !!criteria.dateFrom || !!criteria.dateTo,
  ].filter(Boolean).length;
}

function FilterToggleGroup({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(on ? value.filter((v) => v !== o.id) : [...value, o.id])}
              className={cn(
                'px-2 py-1 rounded-full text-xs border',
                disabled
                  ? 'opacity-40 cursor-not-allowed border-border'
                  : (on ? 'bg-primary text-white border-primary' : 'border-border'),
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
