import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  getFailureReasonsByStatus,
  getFailureVolumeOverTime,
  getNonApprovedCases,
  getStatusFlowSummary,
  getTotalCallsInRange,
  toFailureVolumeChartRows,
  NON_APPROVED_STATUS_COLORS,
  NON_APPROVED_STATUS_ORDER,
  type FailureVolumeMode,
  type NonApprovedStatus,
  type NonApprovedCaseRow,
} from '@vkyc/shared/data/adminSelectors';
import { PARTNERS, type PartnerId } from '@vkyc/shared/data/types';
import { PartnerMultiSelect } from '@vkyc/shared/components/ui/PartnerMultiSelect';
import {
  DEFAULT_NON_APPROVED_CRITERIA,
  type NonApprovedCaseCriteria,
} from '@vkyc/shared/data';
import { NonApprovedCasesTable } from '@vkyc/shared/components/tables/NonApprovedCasesTable';
import { StatCard } from '@vkyc/shared/components/ui/StatCard';
import { Card } from '@vkyc/shared/components/ui/Card';
import { CustomerDetailsDrawer } from '@admin/features/admin/components/CustomerDetailsDrawer';
import { ActivityLogModal } from '@admin/features/admin/components/ActivityLogModal';
import { CallLogViewModal } from '@vkyc/shared/components/call/CallLogViewModal';
import { ReasonBarChart } from '@vkyc/shared/components/charts/ReasonBarChart';
import { cn } from '@vkyc/shared/lib/cn';
import { StatusFlowDiagram } from '@admin/features/admin/components/StatusFlowDiagram';

const STATUS_ORDER = NON_APPROVED_STATUS_ORDER;
const STATUS_COLORS = NON_APPROVED_STATUS_COLORS;
const DEFAULT_DATE_PRESET: 'today' | '7d' | '30d' | 'custom' = 'today';

export function QualityPage() {
  const [datePreset, setDatePreset] = useState<'today' | '7d' | '30d' | 'custom'>(DEFAULT_DATE_PRESET);
  const todayIso = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(todayIso);
  const [toDate, setToDate] = useState(todayIso);
  const [selectedPartners, setSelectedPartners] = useState<PartnerId[]>(PARTNERS.map((p) => p.id));
  const [criteria, setCriteria] = useState<NonApprovedCaseCriteria>(DEFAULT_NON_APPROVED_CRITERIA);
  const [selected, setSelected] = useState<NonApprovedCaseRow | null>(null);
  const [modal, setModal] = useState<'details' | 'activity' | 'report' | null>(null);
  const [reasonTab, setReasonTab] = useState<NonApprovedStatus>('User Dropped');
  const [volumeMode, setVolumeMode] = useState<FailureVolumeMode>('count');

  const range = useMemo(() => {
    if (datePreset === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    if (datePreset === '7d') {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    if (datePreset === '30d') {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    const start = new Date(`${fromDate}T00:00:00`);
    const end = new Date(`${toDate}T23:59:59`);
    return start <= end ? { start, end } : { start: end, end: start };
  }, [datePreset, fromDate, toDate]);

  const cases = getNonApprovedCases({ range, partnerIds: selectedPartners });
  const totalCallsInRange = getTotalCallsInRange(range, selectedPartners);
  const flow = getStatusFlowSummary(range, selectedPartners);
  if (flow.nonApprovedTotal !== cases.length) {
    throw new Error(`Flow/table mismatch: ${flow.nonApprovedTotal} vs ${cases.length}`);
  }
  const statusCounts = STATUS_ORDER.map((status) => ({
    status,
    count: cases.filter((c) => c.status === status).length,
  }));
  const kpiMap = new Map(statusCounts.map((s) => [s.status, s.count]));

  const pageDateFrom = range.start.toISOString().slice(0, 10);
  const pageDateTo = range.end.toISOString().slice(0, 10);
  const selectedFlowStatus = criteria.statuses.length === 1 ? criteria.statuses[0] : null;
  const activeStatus = criteria.statuses[0] ?? reasonTab;

  const setSharedStatus = (status: NonApprovedStatus | null) => {
    setCriteria((c) => ({ ...c, statuses: status ? [status] : [] }));
    if (status) setReasonTab(status);
  };

  const reasonBars = useMemo(
    () => getFailureReasonsByStatus(activeStatus, cases),
    [activeStatus, cases],
  );

  const volumeBuckets = useMemo(
    () => getFailureVolumeOverTime(range, selectedPartners),
    [range, selectedPartners],
  );
  const volumeChartData = useMemo(
    () => toFailureVolumeChartRows(volumeBuckets, volumeMode),
    [volumeBuckets, volumeMode],
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Rejection &amp; Failure Reasons</h1>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          {(['today', '7d', '30d', 'custom'] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setDatePreset(preset)}
              className={cn('px-2 py-1 text-xs rounded', datePreset === preset ? 'bg-primary text-white' : 'text-text-muted')}
            >
              {preset === 'today' ? 'Today' : preset === '7d' ? '7D' : preset === '30d' ? '30D' : 'Custom'}
            </button>
          ))}
        </div>
        {datePreset === 'custom' && (
          <div className="flex items-center gap-1">
            <input type="date" max={todayIso} value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="px-2 py-1 rounded border border-border text-xs" />
            <span className="text-xs text-text-muted">to</span>
            <input type="date" max={todayIso} value={toDate} onChange={(e) => setToDate(e.target.value)} className="px-2 py-1 rounded border border-border text-xs" />
          </div>
        )}
        <PartnerMultiSelect value={selectedPartners} onChange={setSelectedPartners} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard label="Total Non-Approved" value={cases.length.toLocaleString()} subtext={`${totalCallsInRange > 0 ? ((cases.length / totalCallsInRange) * 100).toFixed(1) : '0.0'}% of all calls`} />
        <StatCard label="User Dropped" value={(kpiMap.get('User Dropped') ?? 0).toLocaleString()} subtext={`${totalCallsInRange > 0 ? (((kpiMap.get('User Dropped') ?? 0) / totalCallsInRange) * 100).toFixed(1) : '0.0'}%`} />
        <StatCard label="Unable to Verify" value={(kpiMap.get('Unable to Verify') ?? 0).toLocaleString()} subtext={`${totalCallsInRange > 0 ? (((kpiMap.get('Unable to Verify') ?? 0) / totalCallsInRange) * 100).toFixed(1) : '0.0'}%`} />
        <StatCard label="Agent Rejected" value={(kpiMap.get('Rejected') ?? 0).toLocaleString()} subtext={`${totalCallsInRange > 0 ? (((kpiMap.get('Rejected') ?? 0) / totalCallsInRange) * 100).toFixed(1) : '0.0'}%`} />
        <StatCard label="Auditor Recapture" value={(kpiMap.get('Recapture') ?? 0).toLocaleString()} subtext={`${totalCallsInRange > 0 ? (((kpiMap.get('Recapture') ?? 0) / totalCallsInRange) * 100).toFixed(1) : '0.0'}%`} />
        <StatCard label="Auditor Rejected" value={(kpiMap.get('Auditor Rejected') ?? 0).toLocaleString()} subtext={`${totalCallsInRange > 0 ? (((kpiMap.get('Auditor Rejected') ?? 0) / totalCallsInRange) * 100).toFixed(1) : '0.0'}%`} />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Lead Status Flow</h3>
          {selectedFlowStatus && (
            <button type="button" className="text-xs text-primary hover:underline" onClick={() => setSharedStatus(null)}>
              Clear flow filter
            </button>
          )}
        </div>
        <StatusFlowDiagram summary={flow} selectedStatus={selectedFlowStatus} onSelectStatus={setSharedStatus} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-sm mb-3">Failure Reasons by Status</h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {STATUS_ORDER.map((status) => {
              const count = kpiMap.get(status) ?? 0;
              const active = activeStatus === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSharedStatus(status)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs border transition-colors',
                    active ? 'text-white border-transparent' : 'border-border text-text-muted hover:border-primary/40',
                  )}
                  style={active ? { backgroundColor: STATUS_COLORS[status] } : undefined}
                >
                  {status} ({count})
                </button>
              );
            })}
          </div>
          {activeStatus === 'User Dropped' && (
            <p className="text-[11px] text-text-muted mb-2">Stage at which the customer dropped</p>
          )}
          <ReasonBarChart
            rows={reasonBars}
            color={STATUS_COLORS[activeStatus]}
            rowHeight={36}
          />
        </Card>

        <Card>
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div>
              <h3 className="font-semibold text-sm">Failure Volume Over Time</h3>
              <p className="text-[11px] text-text-muted mt-0.5">non-approved cases in the selected period</p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
              {([
                { id: 'count' as const, label: 'Count' },
                { id: 'pct' as const, label: '% of leads' },
              ]).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setVolumeMode(opt.id)}
                  className={cn('px-2 py-1 text-xs rounded', volumeMode === opt.id ? 'bg-primary text-white' : 'text-text-muted')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={volumeChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBE8F2" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit={volumeMode === 'pct' ? '%' : undefined} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0]?.payload as Record<string, number | string> | undefined;
                  const leads = Number(row?.totalLeads ?? 0);
                  const rawMap: Record<string, string> = {
                    'User Dropped': '_rawUserDropped',
                    'Unable to Verify': '_rawUnable',
                    Rejected: '_rawRejected',
                    Recapture: '_rawRecapture',
                    'Auditor Rejected': '_rawAuditorRejected',
                  };
                  const bucketLabel = daysLabel(datePreset);
                  return (
                    <div className="rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-sm space-y-1">
                      <p className="font-medium text-text">{label}</p>
                      {payload.map((p) => {
                        const status = String(p.dataKey);
                        const raw = Number(row?.[rawMap[status]] ?? p.value ?? 0);
                        const share = leads > 0 ? ((raw / leads) * 100).toFixed(0) : '0';
                        return (
                          <p key={status} style={{ color: p.color }}>
                            {status} — {raw} cases ({share}% of {bucketLabel})
                          </p>
                        );
                      })}
                    </div>
                  );
                }}
              />
              <Legend />
              {STATUS_ORDER.map((s) => (
                <Bar key={s} dataKey={s} stackId="fail" fill={STATUS_COLORS[s]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <NonApprovedCasesTable
        cases={cases}
        criteria={criteria}
        onCriteriaChange={(next) => {
          setCriteria(next);
          if (next.statuses.length === 1) setReasonTab(next.statuses[0]);
        }}
        pageDateFrom={pageDateFrom}
        pageDateTo={pageDateTo}
        variant="admin"
        renderActions={(row) => (
          <div className="flex flex-wrap gap-3">
            <button type="button" className="text-primary hover:underline" onClick={() => { setSelected(row); setModal('details'); }}>View Details</button>
            <button type="button" className="text-primary hover:underline" onClick={() => { setSelected(row); setModal('activity'); }}>Activity Log</button>
            <button
              type="button"
              className="text-primary hover:underline disabled:opacity-40 disabled:no-underline"
              disabled={row.status === 'User Dropped'}
              title={row.status === 'User Dropped' ? 'No report — call never completed' : undefined}
              onClick={() => { setSelected(row); setModal('report'); }}
            >
              View Report
            </button>
          </div>
        )}
      />

      {selected && modal === 'details' && (
        <CustomerDetailsDrawer open onClose={() => setModal(null)} call={selected.call} customer={selected.customer} agent={selected.agent} />
      )}
      {selected && modal === 'activity' && (
        <ActivityLogModal open onClose={() => setModal(null)} call={selected.call} customer={selected.customer} agent={selected.agent} />
      )}
      {selected && modal === 'report' && (
        <CallLogViewModal open onClose={() => setModal(null)} call={selected.call} customer={selected.customer} auditor={selected.auditor} />
      )}
    </div>
  );
}

function daysLabel(preset: 'today' | '7d' | '30d' | 'custom'): string {
  if (preset === 'today') return "this hour's leads";
  if (preset === '7d' || preset === '30d') return "this day's leads";
  return "this bucket's leads";
}

