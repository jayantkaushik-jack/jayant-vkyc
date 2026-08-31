import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, AlertTriangle, RefreshCw, ChevronsUpDown } from 'lucide-react';
import {
  getAuditorProductivity,
  getProductivityAgentRows,
  getProductivityFleetSummary,
  type ProductivityAgentRow,
  type AuditorProductivityRow,
  type AgentLiveState,
} from '@vkyc/shared/data/adminSelectors';
import { getDateRangeFromPreset } from '@vkyc/shared/data';
import { useAdminConfig } from '@vkyc/shared/data/sessionStore';
import { PARTNERS, type DateRange, type PartnerId } from '@vkyc/shared/data/types';
import { Card } from '@vkyc/shared/components/ui/Card';
import { PartnerMultiSelect } from '@vkyc/shared/components/ui/PartnerMultiSelect';
import { Avatar } from '@vkyc/shared/components/ui/Avatar';
import { cn } from '@vkyc/shared/lib/cn';
import { PRODUCTIVITY_METRICS, type ProductivityMetricId } from '@admin/features/admin/productivityMetrics';

type SortDir = 'asc' | 'desc';
type DatePreset = 'today' | '7d' | '30d' | 'custom';

function parsePartnerCsv(raw: string | null): PartnerId[] {
  if (!raw) return PARTNERS.map((p) => p.id);
  const set = new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
  return PARTNERS.map((p) => p.id).filter((id) => set.has(id));
}

function rangeFromPreset(preset: DatePreset, from: string, to: string): DateRange {
  if (preset !== 'custom') return getDateRangeFromPreset(preset);
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T23:59:59`);
  return start <= end ? { start, end } : { start: end, end: start };
}

function metricValue(row: ProductivityAgentRow, id: ProductivityMetricId): number {
  const v = row[id];
  return typeof v === 'number' ? v : 0;
}

function metricTone(metric: ProductivityMetricId, value: number): string {
  if (metric === 'efficiency') return value >= 85 ? 'text-success' : value >= 70 ? 'text-warning' : 'text-danger';
  if (metric === 'accuracy') return value >= 97 ? 'text-success' : value >= 94 ? 'text-warning' : 'text-danger';
  if (metric === 'callDropRate') return value <= 3.5 ? 'text-success' : value <= 5 ? 'text-warning' : 'text-danger';
  if (metric === 'csat') return value >= 4.2 ? 'text-success' : value >= 3.5 ? 'text-warning' : 'text-danger';
  return '';
}

function occupancyTone(occupancy: number): { color: string; sub: string } {
  if (occupancy > 90) return { color: 'text-danger', sub: 'overload risk' };
  if (occupancy < 60) return { color: 'text-warning', sub: 'under-utilized' };
  return { color: 'text-success', sub: 'healthy range' };
}

function liveStatus(s: AgentLiveState): { label: string; cls: string } {
  switch (s) {
    case 'online_idle':
      return { label: 'Available', cls: 'bg-green-50 text-success border-green-200' };
    case 'online_assigned':
    case 'online_on_call':
    case 'online_on_report':
      return { label: 'On Call', cls: 'bg-blue-50 text-primary border-blue-200' };
    case 'on_break':
      return { label: 'Break', cls: 'bg-amber-50 text-warning border-amber-200' };
    default:
      return { label: 'Offline', cls: 'bg-gray-100 text-text-muted border-border' };
  }
}

export function ProductivityPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const config = useAdminConfig(); // re-compute breach flags when thresholds change
  const preset = (params.get('preset') as DatePreset) || '30d';
  const today = new Date().toISOString().slice(0, 10);
  const from = params.get('from') || today;
  const to = params.get('to') || today;
  const sort = (params.get('sort') as ProductivityMetricId) || 'totalCalls';
  const dir = (params.get('dir') as SortDir) || 'desc';
  const search = params.get('q') || '';
  const partners = parsePartnerCsv(params.get('partners'));
  const [auditorSort, setAuditorSort] = useState<'auditsCompleted' | 'avgTatMin' | 'avgDecisionTimeMin' | 'overturnRate'>('auditsCompleted');
  const [auditorDir, setAuditorDir] = useState<SortDir>('desc');
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [refreshedAt, setRefreshedAt] = useState(() => new Date());
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshNonce((n) => n + 1);
    setRefreshedAt(new Date());
    // Brief spin so the click is visibly acknowledged even when the
    // recomputed figures land on the same values.
    window.setTimeout(() => setRefreshing(false), 600);
  };

  const range = useMemo(() => rangeFromPreset(preset, from, to), [preset, from, to]);
  const rows = useMemo(() => getProductivityAgentRows(range, partners), [range, partners, config.maxBreakMinPerDay, config.minOnlineHrsPerDay, refreshNonce]);
  const fleet = useMemo(() => getProductivityFleetSummary(range, partners), [range, partners, config.maxBreakMinPerDay, config.minOnlineHrsPerDay, refreshNonce]);
  const auditor = useMemo(() => getAuditorProductivity(range, partners), [range, partners]);
  const occupancyBand = occupancyTone(fleet.occupancy);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return r.agent.name.toLowerCase().includes(q) || r.agent.employeeId.toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = metricValue(a, sort);
    const bv = metricValue(b, sort);
    return dir === 'asc' ? av - bv : bv - av;
  });

  const auditorSorted = [...auditor.rows].sort((a, b) => {
    const av = a[auditorSort];
    const bv = b[auditorSort];
    return auditorDir === 'asc' ? av - bv : bv - av;
  });

  /**
   * Apply one or more query-param updates in a single write. Calling a
   * single-key setter twice in the same handler is unsafe: both calls build
   * from the same `params` snapshot, so the second silently overwrites the
   * first (which previously broke column sorting).
   */
  const setParamValues = (updates: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(updates)) next.set(k, v);
    setParams(next, { replace: true });
  };
  const setParam = (key: string, value: string) => setParamValues({ [key]: value });

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Productivity</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          {(['today', '7d', '30d', 'custom'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setParam('preset', p)}
              className={cn('px-2 py-1 text-xs rounded', preset === p ? 'bg-primary text-white' : 'text-text-muted')}
            >
              {p === 'today' ? 'Today' : p === '7d' ? '7D' : p === '30d' ? '30D' : 'Custom'}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <>
            <input type="date" value={from} onChange={(e) => setParam('from', e.target.value)} className="px-2 py-1.5 border border-border rounded text-sm" />
            <input type="date" value={to} onChange={(e) => setParam('to', e.target.value)} className="px-2 py-1.5 border border-border rounded text-sm" />
          </>
        )}
        <PartnerMultiSelect value={partners} onChange={(v) => setParam('partners', v.join(','))} />
        <input
          value={search}
          onChange={(e) => setParam('q', e.target.value)}
          placeholder="Search name or employee ID"
          className="px-3 py-1.5 border border-border rounded-lg text-sm min-w-[220px]"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <MetricCard label="Total Calls" value={fleet.totalCalls.toLocaleString()} />
        <MetricCard label="Efficiency (0-100)" value={`${fleet.efficiency.toFixed(1)}`} />
        <MetricCard label="Accuracy" value={`${fleet.accuracy.toFixed(1)}%`} sub="auditor-upheld decisions" />
        <MetricCard label="Call Drop Rate" value={`${fleet.callDropRate.toFixed(1)}%`} />
        <MetricCard label="CSAT" value={fleet.csat.toFixed(1)} />
        <MetricCard label="Occupancy" value={`${fleet.occupancy.toFixed(1)}%`} tone={occupancyBand.color} sub={occupancyBand.sub} />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">Agent roster</h3>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>updated {refreshedAt.toLocaleTimeString('en-IN')}</span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh agent roster"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border hover:bg-primary-soft hover:text-primary active:scale-[0.97] disabled:opacity-60 transition-all"
          >
            <RefreshCw size={13} className={cn(refreshing && 'animate-spin')} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b border-border">
              <th className="pb-2 pr-3">Agent</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2 pr-3">Partner(s)</th>
              {(['totalCalls', 'efficiency', 'accuracy', 'callDropRate', 'csat', 'aht'] as ProductivityMetricId[]).map((id) => (
                <th key={id} className="pb-2 pr-3">
                  <button
                    type="button"
                    title={PRODUCTIVITY_METRICS.find((m) => m.id === id)?.tooltip}
                    className="inline-flex items-center gap-1 hover:text-text"
                    onClick={() => {
                      if (sort === id) setParamValues({ dir: dir === 'asc' ? 'desc' : 'asc' });
                      else setParamValues({ sort: id, dir: 'desc' });
                    }}
                  >
                    {PRODUCTIVITY_METRICS.find((m) => m.id === id)?.label}
                    {sort === id
                      ? (dir === 'asc' ? <ArrowUp size={13} className="text-primary" /> : <ArrowDown size={13} className="text-primary" />)
                      : <ChevronsUpDown size={13} className="opacity-40" />}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.agent.id}
                className="border-b border-border/50 hover:bg-primary-soft/20 cursor-pointer"
                onClick={() => navigate(`/productivity/${row.agent.id}?${params.toString()}`)}
              >
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <Avatar person={{ id: row.agent.id, name: row.agent.name }} size="xs" />
                    <div>
                      <p className="font-medium inline-flex items-center gap-1">
                        {row.agent.name}
                        {row.thresholdBreach && (
                          <span title="Break or online-time threshold breached">
                            <AlertTriangle size={12} className="text-danger" />
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-text-muted">{row.agent.employeeId}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2 pr-3">
                  {(() => {
                    const st = liveStatus(row.liveState);
                    return <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border', st.cls)}>{st.label}</span>;
                  })()}
                </td>
                <td className="py-2 pr-3 text-xs">{row.partners.map((p) => PARTNERS.find((x) => x.id === p)?.name ?? p).join(', ')}</td>
                <td className="py-2 pr-3">{row.totalCalls.toLocaleString()}</td>
                <td className={cn('py-2 pr-3 font-medium', metricTone('efficiency', row.efficiency ?? 0))}>{(row.efficiency ?? 0).toFixed(1)}</td>
                <td className={cn('py-2 pr-3 font-medium', metricTone('accuracy', row.accuracy))}>{row.accuracy.toFixed(1)}%</td>
                <td className={cn('py-2 pr-3 font-medium', metricTone('callDropRate', row.callDropRate ?? 0))}>{(row.callDropRate ?? 0).toFixed(1)}%</td>
                <td className={cn('py-2 pr-3 font-medium', metricTone('csat', row.csat ?? 0))}>{(row.csat ?? 0).toFixed(1)}</td>
                <td className="py-2 pr-3 tabular-nums">{PRODUCTIVITY_METRICS.find((m) => m.id === 'aht')!.format(row.aht)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="space-y-4">
        <h3 className="text-lg font-semibold">Auditor Productivity</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Audits Completed" value={auditor.auditsCompleted.toLocaleString()} />
          <MetricCard label="Avg Audit TAT" value={`${auditor.avgTatMin.toFixed(1)} min`} />
          <MetricCard label="Pending Queue" value={auditor.pendingQueue.toLocaleString()} />
          <MetricCard label="Overall Overturn Rate" value={`${auditor.overallOverturnRate.toFixed(1)}%`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted border-b border-border">
                <th className="pb-2 pr-3">Auditor</th>
                {[
                  ['auditsCompleted', 'Audits Completed'],
                  ['avgTatMin', 'Avg Audit TAT'],
                  ['avgDecisionTimeMin', 'Avg Decision Time'],
                  ['overturnRate', 'Overturn Rate'],
                ].map(([key, label]) => (
                  <th key={key} className="pb-2 pr-3">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-text"
                      onClick={() => {
                        if (auditorSort === key) setAuditorDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                        else { setAuditorSort(key as typeof auditorSort); setAuditorDir('desc'); }
                      }}
                    >
                      {label}
                      {auditorSort === key && (auditorDir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}
                    </button>
                  </th>
                ))}
                <th className="pb-2 pr-3">Decision Mix</th>
                <th className="pb-2">Avg Hours Online</th>
              </tr>
            </thead>
            <tbody>
              {auditorSorted.map((row) => (
                <AuditorRow key={row.auditor.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, tone, sub }: { label: string; value: string; tone?: string; sub?: string }) {
  return (
    <Card>
      <p className="text-xs text-text-muted">{label}</p>
      <p className={cn('text-2xl font-semibold mt-1', tone)}>{value}</p>
      {sub && <p className="text-[11px] text-text-muted mt-1">{sub}</p>}
    </Card>
  );
}

function AuditorRow({ row }: { row: AuditorProductivityRow }) {
  return (
    <tr className="border-b border-border/50">
      <td className="py-2 pr-3">
        <div className="flex items-center gap-2">
          <Avatar person={{ id: row.auditor.id, name: row.auditor.name }} size="xs" />
          <div>
            <p className="font-medium">{row.auditor.name}</p>
            <p className="text-xs text-text-muted">{row.auditor.employeeId}</p>
          </div>
        </div>
      </td>
      <td className="py-2 pr-3">{row.auditsCompleted}</td>
      <td className="py-2 pr-3">{row.avgTatMin.toFixed(1)} min</td>
      <td className="py-2 pr-3">{row.avgDecisionTimeMin.toFixed(1)} min</td>
      <td className="py-2 pr-3">{row.overturnRate.toFixed(1)}%</td>
      <td className="py-2 pr-3 min-w-[180px]">
        <div className="h-2 rounded bg-border overflow-hidden flex">
          <div style={{ width: `${row.approvedPct}%` }} className="bg-success" />
          <div style={{ width: `${row.recapturePct}%` }} className="bg-warning" />
          <div style={{ width: `${row.rejectedPct}%` }} className="bg-danger" />
        </div>
        <p className="text-[10px] text-text-muted mt-1">
          A {row.approvedPct.toFixed(0)}% / R {row.recapturePct.toFixed(0)}% / X {row.rejectedPct.toFixed(0)}%
        </p>
      </td>
      <td className="py-2">{row.avgHoursOnline.toFixed(1)}h</td>
    </tr>
  );
}

export function ProductivityBackLink() {
  return (
    <Link to="/productivity" className="text-sm text-primary hover:underline">Back to roster</Link>
  );
}

