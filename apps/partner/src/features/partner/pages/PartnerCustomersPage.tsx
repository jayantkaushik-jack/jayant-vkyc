import { useEffect, useMemo, useState } from 'react';
import {
  getCustomerQueue,
  getCallHistoryPage,
  type CustomerQueueTab,
  type CallHistoryRow,
} from '@vkyc/shared/data/adminSelectors';
import { agents, customers, getProductTypesForPartner } from '@vkyc/shared/data';
import { Avatar } from '@vkyc/shared/components/ui/Avatar';
import { Card } from '@vkyc/shared/components/ui/Card';
import { StatusPill } from '@vkyc/shared/components/ui/StatusPill';
import { formatDuration, formatTimeLabel } from '@vkyc/shared/lib/format';
import { maskStaffName } from '@vkyc/shared/lib/maskStaff';
import { cn } from '@vkyc/shared/lib/cn';
import {
  type AgentStatusLevel,
  type AuditorStatusLevel,
  type CallStatusLevel,
  type Customer,
} from '@vkyc/shared/data/types';
import { usePartnerScope } from '@partner/features/partner/PartnerScopeContext';
import { PartnerCallDrawer } from '@partner/features/partner/components/PartnerCallDrawer';

type MainTab = 'queue' | 'history';

interface QueueEntry {
  id: string;
  customer: Customer;
  assignedAgent: (typeof agents)[number] | null;
  joinMs: number;
  scheduledMs?: number;
  targetDurationSec?: number;
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
  agentStatuses: AgentStatusLevel[];
  auditorDecisions: AuditorStatusLevel[];
  productType: string;
  phone: string;
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_CRITERIA: HistoryCriteria = {
  statuses: [],
  agentStatuses: [],
  auditorDecisions: [],
  productType: '',
  phone: '',
  dateFrom: '',
  dateTo: '',
};

function hashNum(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function PartnerCustomersPage() {
  const { partnerId, partner } = usePartnerScope();
  const partnerCustomers = useMemo(
    () => customers.filter((c) => c.partnerId === partnerId),
    [partnerId],
  );

  const [mainTab, setMainTab] = useState<MainTab>('queue');
  const [queueTab, setQueueTab] = useState<CustomerQueueTab>('waiting');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CallHistoryRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [criteria, setCriteria] = useState<HistoryCriteria>(DEFAULT_CRITERIA);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Seed the queue from the fleet virtual-clock generator, remapped to this partner's customers.
  const [queueState, setQueueState] = useState<QueueState>(() => {
    const remap = (tab: CustomerQueueTab): QueueEntry[] =>
      getCustomerQueue(tab).map((r, i) => ({
        id: r.id,
        customer: partnerCustomers.length > 0 ? partnerCustomers[i % partnerCustomers.length] : r.customer,
        assignedAgent: r.assignedAgent,
        joinMs: new Date(r.joinTime).getTime(),
        scheduledMs: r.scheduledTime ? new Date(r.scheduledTime).getTime() : undefined,
        targetDurationSec: tab === 'live' ? 140 + (hashNum(r.id) % 120) : undefined,
      }));
    return {
      waiting: remap('waiting').sort((a, b) => a.joinMs - b.joinMs),
      live: remap('live'),
      scheduled: remap('scheduled'),
      cursor: 0,
      seq: 0,
    };
  });

  const demoBaseMs = useMemo(() => {
    const d = new Date();
    d.setHours(14, 5, 0, 0);
    return d.getTime();
  }, []);
  const demoNowMs = demoBaseMs + elapsedSec * 1000;

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
        movedToLive.push({
          ...picked,
          id: `queue-live-dyn-${seq}`,
          joinMs: demoNowMs,
          targetDurationSec: 140 + (hashNum(`${picked.customer.id}-${seq}`) % 120),
        });
        seq += 1;
      }
      if (movedToLive.length > 0) live = [...live, ...movedToLive];

      live = live.filter((entry) => {
        const maxSec = entry.targetDurationSec ?? 180;
        return (demoNowMs - entry.joinMs) / 1000 <= maxSec;
      });

      while (waiting.length < 6) {
        const customer = partnerCustomers.length > 0
          ? partnerCustomers[cursor % partnerCustomers.length]
          : customers[cursor % customers.length];
        const agent = agents[(cursor * 7) % agents.length];
        waiting.push({
          id: `queue-waiting-dyn-${seq}`,
          customer,
          assignedAgent: cursor % 3 === 0 ? agent : null,
          joinMs: demoNowMs,
        });
        cursor += 1;
        seq += 1;
      }

      return { ...prev, waiting, live, cursor, seq };
    });
  }, [demoNowMs, partnerCustomers]);

  const queueRows = queueTab === 'waiting'
    ? queueState.waiting
    : queueTab === 'live'
      ? queueState.live
      : queueState.scheduled;

  const history = getCallHistoryPage(page, 25, {
    partnerIds: [partnerId],
    search: search || undefined,
    phone: criteria.phone || undefined,
    callStatuses: criteria.statuses.length > 0 ? criteria.statuses : undefined,
    agentStatuses: criteria.agentStatuses.length > 0 ? criteria.agentStatuses : undefined,
    auditorDecisions: criteria.auditorDecisions.length > 0 ? criteria.auditorDecisions : undefined,
    productTypes: criteria.productType ? [criteria.productType] : undefined,
    dateFrom: criteria.dateFrom || undefined,
    dateTo: criteria.dateTo || undefined,
  });
  const pageItems = getPageItems(history.page, history.totalPages);
  const productTypes = useMemo(() => getProductTypesForPartner(partnerId), [partnerId]);
  const activeFilterCount = countActiveFilters(criteria);
  const droppedOnly = criteria.statuses.length > 0 && criteria.statuses.every((s) => s === 'User Dropped');

  const openDrawer = (row: CallHistoryRow) => {
    setSelected(row);
    setDrawerOpen(true);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text">Customers</h1>
        <p className="text-sm text-text-muted mt-0.5">{partner.name} — customer queue and verification history.</p>
      </div>

      <div className="flex gap-2 border-b border-border">
        {(['queue', 'history'] as MainTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setMainTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px',
              mainTab === t ? 'border-primary text-primary' : 'border-transparent text-text-muted',
            )}
          >
            {t === 'queue' ? 'Customer Queue' : 'Call History'}
          </button>
        ))}
      </div>

      {mainTab === 'queue' && (
        <>
          <div className="flex gap-2">
            {(['waiting', 'live', 'scheduled'] as CustomerQueueTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setQueueTab(t)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm border capitalize',
                  queueTab === t ? 'bg-primary text-white border-primary' : 'border-border',
                )}
              >
                {t} ({t === 'waiting' ? queueState.waiting.length : t === 'live' ? queueState.live.length : queueState.scheduled.length})
              </button>
            ))}
          </div>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="pb-2 pr-3">{queueTab === 'live' ? 'Start Time' : 'Join Time'}</th>
                  <th className="pb-2 pr-3">Customer Name</th>
                  <th className="pb-2 pr-3">Phone</th>
                  <th className="pb-2 pr-3">App ID</th>
                  <th className="pb-2 pr-3">Assigned Agent</th>
                  {queueTab === 'scheduled' && <th className="pb-2 pr-3">Scheduled Time</th>}
                  <th className="pb-2">{queueTab === 'live' ? 'In Call Time' : 'Waiting Since'}</th>
                </tr>
              </thead>
              <tbody>
                {queueRows.map((row) => (
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
                    <td className="py-2 pr-3">{row.assignedAgent ? maskStaffName(row.assignedAgent.id, 'agent') : '—'}</td>
                    {queueTab === 'scheduled' && (
                      <td className="py-2 pr-3">{row.scheduledMs ? formatTimeLabel(new Date(row.scheduledMs).toISOString()) : '—'}</td>
                    )}
                    <td className="py-2">
                      {formatDuration(Math.max(0, Math.floor((demoNowMs - row.joinMs) / 1000)))}
                    </td>
                  </tr>
                ))}
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
              placeholder="Search name, App ID, phone…"
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
            Showing {history.total === 0 ? 0 : (page - 1) * 25 + 1}–{Math.min(page * 25, history.total)} of {history.total.toLocaleString()} Records
          </p>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="pb-2 pr-2">Last Activity</th>
                  <th className="pb-2 pr-2">App ID</th>
                  <th className="pb-2 pr-2">Phone</th>
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
                  <tr
                    key={row.call.id}
                    className="border-b border-border/50 cursor-pointer hover:bg-primary-soft/20"
                    onClick={() => openDrawer(row)}
                  >
                    <td className="py-2 pr-2 text-xs">{row.lastActivity.slice(0, 16).replace('T', ' ')}</td>
                    <td className="py-2 pr-2 font-mono text-xs">{row.customer.appId}</td>
                    <td className="py-2 pr-2 font-mono text-xs whitespace-nowrap">{row.customer.phone}</td>
                    <td className="py-2 pr-2">{row.customer.name}</td>
                    <td className="py-2 pr-2">
                      <StatusPill label={row.callStatus} variant={row.callStatus === 'Connected' ? 'accepted' : 'neutral'} />
                    </td>
                    <td className="py-2 pr-2">{formatDuration(row.callStatus === 'User Dropped' ? 0 : row.call.durationSec)}</td>
                    <td className="py-2 pr-2">{maskStaffName(row.agent.id, 'agent')}</td>
                    <td className="py-2 pr-2">
                      {row.callStatus === 'User Dropped' ? '—' : (row.call.agentStatus ?? '—')}
                    </td>
                    <td className="py-2 pr-2">{row.call.agentStatus === 'Approved' ? (row.call.auditorDecision ?? '—') : '—'}</td>
                    <td className="py-2 pr-2 text-xs">{row.customer.productType}</td>
                    <td className="py-2">{row.callStatus === 'User Dropped' || !row.auditor ? '—' : maskStaffName(row.auditor.id, 'auditor')}</td>
                  </tr>
                ))}
                {history.rows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-text-muted">
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

      {selected && (
        <PartnerCallDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          call={selected.call}
          customer={selected.customer}
          agent={selected.agent}
        />
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
