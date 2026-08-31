import { useMemo, useState } from 'react';
import {
  getWorkforceKpis,
  getAgentPerformanceMatrix,
  getHeatmapData,
  getStaffingByWeek,
  getDateRangeFromPreset,
  getEfficiencyScore,
  getProductivityAgentRows,
  getStaffingRecommendation,
  getDailyRosteringPct,
  DEFAULT_STAFFING_ASSUMPTIONS,
  type StaffingAssumptions,
  attendance,
  calls,
} from '@vkyc/shared/data';
import { useAdminConfig } from '@vkyc/shared/data/sessionStore';
import { PARTNERS, type PartnerId } from '@vkyc/shared/data/types';
import { StatCard } from '@vkyc/shared/components/ui/StatCard';
import { Card } from '@vkyc/shared/components/ui/Card';
import { Avatar } from '@vkyc/shared/components/ui/Avatar';
import { cn } from '@vkyc/shared/lib/cn';
import { formatMinutes } from '@vkyc/shared/lib/format';
import type { EfficiencyComponent } from '@vkyc/shared/data/types';
import { PRODUCTIVITY_METRICS } from '@admin/features/admin/productivityMetrics';

function efficiencyColor(score: number | null): string {
  if (score === null) return 'text-text-muted';
  if (score >= 85) return 'text-success';
  if (score >= 70) return 'text-warning';
  return 'text-danger';
}

export function WorkforcePage() {
  const range = useMemo(() => getDateRangeFromPreset('30d'), []);
  const [partnerFilter, setPartnerFilter] = useState<PartnerId | 'ALL'>('ALL');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const config = useAdminConfig();
  const [assumptions, setAssumptions] = useState<StaffingAssumptions>(DEFAULT_STAFFING_ASSUMPTIONS);

  const kpis = getWorkforceKpis();
  const matrix = getAgentPerformanceMatrix(range, partnerFilter === 'ALL' ? undefined : partnerFilter);
  const heatmap = getHeatmapData();
  const staffing = getStaffingByWeek();
  const staffingRec = useMemo(() => getStaffingRecommendation(range, assumptions), [range, assumptions]);
  const rostering = useMemo(() => getDailyRosteringPct(range, assumptions), [range, assumptions]);

  const kpiId = config.topPerformerKpi;
  const kpiMeta = PRODUCTIVITY_METRICS.find((m) => m.id === kpiId);
  const prodRows = useMemo(
    () => getProductivityAgentRows(range, partnerFilter === 'ALL' ? undefined : [partnerFilter]),
    [range, partnerFilter],
  );
  type ProdRow = (typeof prodRows)[number];
  const kpiVal = (r: ProdRow): number => {
    switch (kpiId) {
      case 'accuracy':
        return r.accuracy;
      case 'approvalRate':
        return r.approvalRate;
      case 'csat':
        return r.csat ?? 0;
      case 'aht':
        return -r.aht; // lower is better
      default:
        return r.efficiency ?? 0;
    }
  };
  const kpiFmt = (r: ProdRow): string =>
    kpiMeta ? kpiMeta.format(kpiId === 'aht' ? r.aht : kpiVal(r)) : String(kpiVal(r));
  const prodSorted = [...prodRows].sort((a, b) => kpiVal(b) - kpiVal(a));
  const top5 = prodSorted.slice(0, 5);
  const bottom5 = prodSorted.slice(-5).reverse();

  const selectedEfficiency = selectedAgentId
    ? getEfficiencyScore(calls, selectedAgentId, range, attendance, partnerFilter === 'ALL' ? undefined : [partnerFilter])
    : null;

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 12 }, (_, i) => `${String(9 + i).padStart(2, '0')}:00`);
  const maxHeat = Math.max(...heatmap.map((h) => h.volume), 1);

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Workforce</h1>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Agent Utilization" value={`${kpis.agentUtilization}%`} subtext="Target 75–85%" />
        <StatCard label="Occupancy" value={`${kpis.occupancy}%`} />
        <StatCard label="Break Adherence" value={`${kpis.breakAdherence}%`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <Card className="xl:col-span-3 overflow-x-auto">
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => setPartnerFilter('ALL')}
              className={cn('px-2.5 py-1 rounded text-xs border', partnerFilter === 'ALL' ? 'bg-primary text-white border-primary' : 'border-border')}
            >
              All Partners
            </button>
            {PARTNERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPartnerFilter(p.id)}
                className={cn('px-2.5 py-1 rounded text-xs border', partnerFilter === p.id ? 'bg-primary text-white border-primary' : 'border-border')}
              >
                {p.name}
              </button>
            ))}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted border-b border-border">
                <th className="pb-2 pr-2">Agent</th>
                <th className="pb-2 pr-2">Skills</th>
                <th className="pb-2 pr-2">Calls</th>
                <th className="pb-2 pr-2">Avg Duration</th>
                <th className="pb-2 pr-2">Review Time</th>
                <th className="pb-2 pr-2">Drop Rate</th>
                <th className="pb-2 pr-2">Efficiency</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {matrix.slice(0, 20).map((row) => (
                <tr
                  key={row.agent.id}
                  className={cn('border-b border-border/50 cursor-pointer hover:bg-primary-soft/20', selectedAgentId === row.agent.id && 'bg-primary-soft/30')}
                  onClick={() => { setSelectedAgentId(row.agent.id); setBreakdownOpen(false); }}
                >
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-2">
                      <Avatar person={{ id: row.agent.id, name: row.agent.name }} size="xs" />
                      {row.agent.name}
                    </div>
                  </td>
                  <td className="py-2 pr-2 text-xs text-text-muted max-w-[140px] truncate">
                    {row.languages.join(', ')} · {row.partners.join(', ')}
                  </td>
                  <td className="py-2 pr-2">{row.calls}</td>
                  <td className="py-2 pr-2">{formatMinutes(row.avgDurationSec)}</td>
                  <td className="py-2 pr-2">{row.avgReviewSec}s</td>
                  <td className="py-2 pr-2">{row.dropRate ?? '—'}%</td>
                  <td className={cn('py-2 pr-2 font-semibold', efficiencyColor(row.efficiency))}>
                    {row.efficiency?.toFixed(1) ?? '—'}
                  </td>
                  <td className="py-2">
                    <span className={cn(
                      'w-2 h-2 rounded-full inline-block',
                      row.liveState.startsWith('online') ? 'bg-success' : row.liveState === 'on_break' ? 'bg-warning' : 'bg-gray-400',
                    )} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-text-muted mt-3">View all {matrix.length} agents</p>
        </Card>

        <div className="space-y-4">
          {selectedAgentId && selectedEfficiency && (
            <Card>
              <h4 className="font-semibold text-sm mb-2">Efficiency Breakdown</h4>
              <p className={cn('text-2xl font-semibold mb-2', efficiencyColor(selectedEfficiency.score))}>
                {selectedEfficiency.score?.toFixed(1) ?? '—'} / 100
              </p>
              <button type="button" className="text-xs text-primary hover:underline mb-2" onClick={() => setBreakdownOpen(!breakdownOpen)}>
                {breakdownOpen ? 'Hide' : 'Show'} breakdown
              </button>
              {breakdownOpen && selectedEfficiency.components?.map((c: EfficiencyComponent) => (
                <div key={c.label} className="grid grid-cols-[1fr_auto] gap-2 text-xs py-1 border-t border-border/50">
                  <span className="text-text-muted">{c.label}</span>
                  <span>{c.score} ({Math.round(c.weight * 100)}%)</span>
                </div>
              ))}
            </Card>
          )}
          <Card>
            <h4 className="font-semibold text-sm mb-3">Top Performers · {kpiMeta?.label ?? 'Efficiency'}</h4>
            <ul className="space-y-2 text-sm">
              {top5.map((a) => (
                <li key={a.agent.id} className="flex justify-between">
                  <span>{a.agent.name.split(' ')[0]}</span>
                  <span className="font-semibold text-success">{kpiFmt(a)}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h4 className="font-semibold text-sm mb-3">Focus Required · {kpiMeta?.label ?? 'Efficiency'}</h4>
            <ul className="space-y-2 text-sm">
              {bottom5.map((a) => (
                <li key={a.agent.id} className="flex justify-between">
                  <span>{a.agent.name.split(' ')[0]}</span>
                  <span className="font-semibold text-danger">{kpiFmt(a)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-sm">Staffing Recommendation</h3>
          <span className="text-xs text-text-muted">Shifts 08:00–17:00 · 12:00–21:00 · 14:00–23:00 — from the last 30 days' volume</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <AssumptionInput label="Target occupancy %" value={Math.round(assumptions.occupancyTarget * 100)} onChange={(v) => setAssumptions((a) => ({ ...a, occupancyTarget: Math.min(100, Math.max(1, v)) / 100 }))} />
          <AssumptionInput label="Shrinkage %" value={Math.round(assumptions.shrinkage * 100)} onChange={(v) => setAssumptions((a) => ({ ...a, shrinkage: Math.min(90, Math.max(0, v)) / 100 }))} />
          <AssumptionInput label="Agent AHT (s)" value={assumptions.ahtSec} onChange={(v) => setAssumptions((a) => ({ ...a, ahtSec: Math.max(30, v) }))} />
          <AssumptionInput label="Auditor review (s)" value={assumptions.reviewSec} onChange={(v) => setAssumptions((a) => ({ ...a, reviewSec: Math.max(15, v) }))} />
          <AssumptionInput label="Calls / agent" value={assumptions.concurrency} onChange={(v) => setAssumptions((a) => ({ ...a, concurrency: Math.max(1, v) }))} />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b border-border">
              <th className="pb-2 pr-3">Shift</th>
              <th className="pb-2 pr-3 text-right">Agents on floor</th>
              <th className="pb-2 pr-3 text-right">Agents to roster</th>
              <th className="pb-2 text-right">Auditors to roster</th>
            </tr>
          </thead>
          <tbody>
            {staffingRec.map((s) => (
              <tr key={s.id} className="border-b border-border/50">
                <td className="py-2 pr-3">{s.label}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{s.requiredAgents}</td>
                <td className="py-2 pr-3 text-right tabular-nums font-semibold">{s.agentsToRoster}</td>
                <td className="py-2 text-right tabular-nums font-semibold">{s.auditorsToRoster}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2 pr-3">Total</td>
              <td className="py-2 pr-3 text-right tabular-nums">{staffingRec.reduce((x, s) => x + s.requiredAgents, 0)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{staffingRec.reduce((x, s) => x + s.agentsToRoster, 0)}</td>
              <td className="py-2 text-right tabular-nums">{staffingRec.reduce((x, s) => x + s.auditorsToRoster, 0)}</td>
            </tr>
          </tbody>
        </table>
        <p className="text-[11px] text-text-muted">
          Planning estimate: workload = calls × handling time ÷ (occupancy × concurrency), grossed up for shrinkage;
          auditors sized on approved-call volume × review time.
        </p>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-sm">Daily Rostering</h3>
          <span className="text-xs text-text-muted">
            Total headcount required: <span className="font-semibold text-text">{rostering.totalHeadcount}</span>{' '}
            (no agent &gt; 6 consecutive days · 6 leaves/month)
          </span>
        </div>
        <div className="space-y-1.5">
          {rostering.rows.map((r) => (
            <div key={r.day} className="grid grid-cols-[40px_1fr_150px] items-center gap-2 text-xs">
              <span>{r.day}</span>
              <div className="h-2.5 bg-primary-soft rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${r.pct}%` }} />
              </div>
              <span className="text-right tabular-nums">{r.pct}% · {r.requiredPresent} present · {r.onLeaveOrOff} off</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-sm mb-4">Call Volume Heatmap (Day × Hour)</h3>
        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr>
                <th className="p-1" />
                {hours.map((h) => <th key={h} className="p-1 text-text-muted font-normal">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day}>
                  <td className="p-1 font-medium">{day}</td>
                  {hours.map((hour) => {
                    const cell = heatmap.find((h) => h.day === day && h.hourLabel === hour);
                    const intensity = cell ? cell.volume / maxHeat : 0;
                    return (
                      <td key={hour} className="p-0.5">
                        <div
                          className="w-8 h-6 rounded"
                          style={{ backgroundColor: `rgba(100, 52, 214, ${0.1 + intensity * 0.85})` }}
                          title={`${day} ${hour}: ${cell?.volume ?? 0} calls`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-sm mb-4">Week-of-Month Staffing Trend</h3>
        <div className="flex items-end gap-4 h-40">
          {staffing.map((w) => (
            <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn('w-full rounded-t', w.isMonthEnd ? 'bg-danger/80' : 'bg-primary')}
                style={{ height: `${(w.volume / Math.max(...staffing.map((s) => s.volume))) * 120}px` }}
              />
              <span className="text-xs font-medium">{w.week}</span>
              <span className="text-[10px] text-text-muted">{w.volume.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-3 italic">*Month-end spike requires ~20% additional staffing</p>
      </Card>
    </div>
  );
}

function AssumptionInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] text-text-muted">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 w-full px-2 py-1.5 rounded-lg border border-border text-sm"
      />
    </label>
  );
}
