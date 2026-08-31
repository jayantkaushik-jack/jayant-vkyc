import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ReferenceLine, Area, AreaChart,
} from 'recharts';
import { ChevronDown, Eye, TrendingDown, TrendingUp } from 'lucide-react';
import {
  calls,
  customers,
  auditors,
  attendance,
  getAgentStats,
  getDateRangeFromPreset,
  getDailyCallTrend,
  getAccuracyTrend,
  getEfficiencyTrend,
  getEfficiencyScore,
  getCallTimeTrend,
  getAuditorOutcomes,
} from '@vkyc/shared/data';
import type { DateRangePreset, EfficiencyComponent } from '@vkyc/shared/data/types';
import { METRIC_TOOLTIPS } from '@vkyc/shared/lib/constants';
import { formatMinutes } from '@vkyc/shared/lib/format';
import { StatCard } from '@agent/components/ui/StatCard';
import { Card } from '@agent/components/ui/Card';
import { StatusPill } from '@agent/components/ui/StatusPill';
import { InfoTooltip } from '@agent/components/ui/InfoTooltip';
import { CallLogViewModal } from '@agent/components/call/CallLogViewModal';
import { useAgent } from '@agent/features/agent/AgentContext';
import { cn } from '@vkyc/shared/lib/cn';

const PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
];

/**
 * Hero-card sparkline box: 40% of the card's content width rather than a fixed 112px,
 * so the trend stays readable as the cards grow on wide viewports. `shrink-0` keeps the
 * basis honest against the value column, which carries `flex-1 min-w-0` so a long value
 * wraps instead of squeezing the chart. Height scales with the width to hold roughly a
 * 3:1 box — a 40%-wide strip at the old 48px would read as a flat line.
 */
const SPARKLINE_BOX = 'w-[40%] shrink-0 h-16';

/**
 * recharts clips the stroke at the SVG edge, so the top of the peak and the bottom of
 * the trough are shaved off without a little breathing room. 2px is half the 4px stroke
 * box (`strokeWidth={2}` centred on the path).
 */
const SPARKLINE_MARGIN = { top: 2, right: 0, bottom: 2, left: 0 };

/**
 * Recharts takes color props as literal strings, not Tailwind classes, so these
 * can't reference tailwind.config.js's tokens directly — kept here as one named,
 * commented source instead of the same hex repeated at each chart call site.
 * Values read straight from the real Cashmere package's semantics.css; "Rejected"
 * and "Failed" already matched --sds-negative-bg-pressed/--sds-neutral-bg-inverse-hover
 * exactly before this constant existed, so this is a naming/documentation fix, not
 * a color change.
 */
const CHART_COLORS = {
  primary: '#1b1b1b', // --sds-brand-bg-default / --sds-neutral-text-primary
  grid: '#e8e8e8', // --sds-neutral-border-light
  accent: '#094eff', // --sds-accent-bg-default (95% target reference line)
  approved: '#008641', // --sds-positive-bg-pressed
  rejected: '#940000', // --sds-negative-bg-pressed
  failed: '#494949', // --sds-neutral-bg-inverse-hover
} as const;

type AdherenceFilter = 'all' | 'below90' | '90plus';
type CallLogStatusFilter = 'all' | 'approved' | 'rejected' | 'recapture';

function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateRangeFromInputs(from: string, to: string) {
  return {
    start: new Date(`${from}T00:00:00`),
    end: new Date(`${to}T23:59:59`),
  };
}

function defaultAttendanceRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 13);
  return { from: toDateInput(from), to: toDateInput(to) };
}

function efficiencyBand(score: number | null): { label: string; color: string } {
  if (score === null) return { label: '—', color: 'text-text-muted' };
  if (score >= 85) return { label: 'Excellent', color: 'text-success' };
  if (score >= 70) return { label: 'Good', color: 'text-warning' };
  return { label: 'Needs attention', color: 'text-danger' };
}

interface EfficiencyHeroCardProps {
  score: number | null;
  components: EfficiencyComponent[] | null;
  tooltip: string;
  sparkData: { value: number }[];
}

function EfficiencyHeroCard({ score, components, tooltip, sparkData }: EfficiencyHeroCardProps) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const band = efficiencyBand(score);
  const delta = score !== null ? Math.round((score - 85) * 10) / 10 : 0;
  const positive = delta >= 0;

  return (
    <Card className="flex-1 min-w-[280px]">
      <div className="flex items-center text-text-muted text-sm mb-2">
        Efficiency
        <InfoTooltip text={tooltip} />
      </div>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-3xl font-semibold text-text mb-1">
            {score !== null ? `${score} / 100` : '—'}
          </div>
          <div className={cn('text-xs font-medium', band.color)}>{band.label}</div>
          {score !== null && (
            <div className={cn('flex items-center gap-1 text-xs font-medium mt-2', positive ? 'text-success' : 'text-danger')}>
              {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {`${delta >= 0 ? '+' : ''}${delta} vs 85 benchmark`}
            </div>
          )}
          {components && (
            <button
              type="button"
              onClick={() => setBreakdownOpen(!breakdownOpen)}
              className="-mx-2 mt-3 inline-flex min-h-8 items-center gap-1 rounded px-2 text-xs text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <ChevronDown size={14} className={cn('transition-transform', breakdownOpen && 'rotate-180')} />
              {breakdownOpen ? 'Hide breakdown' : 'Show breakdown'}
            </button>
          )}
        </div>
        {/* 40% of the card's content width — see the note on SPARKLINE_BOX. */}
        <div className={SPARKLINE_BOX}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={SPARKLINE_MARGIN}>
              <Area
                type="monotone"
                dataKey="value"
                stroke={CHART_COLORS.primary}
                fill={CHART_COLORS.primary}
                fillOpacity={0.15}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      {breakdownOpen && components && (
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          {components.map((c) => (
            <div key={c.label} className="grid grid-cols-[1fr_auto_auto] gap-3 text-xs items-center">
              <span className="text-text-muted">{c.label}</span>
              <span className="text-text">{c.rawValue}</span>
              <span className="font-medium tabular-nums">
                {c.score} <span className="text-text-muted">({Math.round(c.weight * 100)}%)</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

interface HeroMetricCardProps {
  label: string;
  value: string;
  target: string;
  delta: number;
  deltaLabel: string;
  tooltip: string;
  sparkData: { value: number }[];
  sparkColor: string;
}

function HeroMetricCard({
  label,
  value,
  target,
  delta,
  deltaLabel,
  tooltip,
  sparkData,
  sparkColor,
}: HeroMetricCardProps) {
  const positive = delta >= 0;

  return (
    <Card className="flex-1 min-w-[280px]">
      <div className="flex items-center text-text-muted text-sm mb-2">
        {label}
        <InfoTooltip text={tooltip} />
      </div>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-3xl font-semibold text-text mb-1">{value}</div>
          <div className="text-xs text-text-muted">{target}</div>
          <div className={cn('flex items-center gap-1 text-xs font-medium mt-2', positive ? 'text-success' : 'text-danger')}>
            {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {deltaLabel}
          </div>
        </div>
        <div className={SPARKLINE_BOX}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={SPARKLINE_MARGIN}>
              <Area
                type="monotone"
                dataKey="value"
                stroke={sparkColor}
                fill={sparkColor}
                fillOpacity={0.15}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

export function PerformancePage() {
  const { agent } = useAgent();
  const [preset, setPreset] = useState<DateRangePreset>('30d');
  const [overturnedOnly, setOverturnedOnly] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [attendanceRange, setAttendanceRange] = useState(defaultAttendanceRange);
  const [attendanceAdherence, setAttendanceAdherence] = useState<AdherenceFilter>('all');
  const [callLogStatus, setCallLogStatus] = useState<CallLogStatusFilter>('all');
  const [callLogRange, setCallLogRange] = useState<{ from: string; to: string } | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  const range = useMemo(() => getDateRangeFromPreset(preset), [preset]);

  useEffect(() => {
    setCallLogRange({
      from: toDateInput(range.start),
      to: toDateInput(range.end),
    });
  }, [range]);

  const attendanceRows = useMemo(() => {
    let rows = attendance.filter((a) => a.agentId === agent.id);
    rows = rows.filter((a) => a.date >= attendanceRange.from && a.date <= attendanceRange.to);
    if (attendanceAdherence === 'below90') rows = rows.filter((a) => a.adherencePct < 90);
    if (attendanceAdherence === '90plus') rows = rows.filter((a) => a.adherencePct >= 90);
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [agent.id, attendanceRange, attendanceAdherence]);

  const callLogDateRange = useMemo(
    () => (callLogRange ? dateRangeFromInputs(callLogRange.from, callLogRange.to) : range),
    [callLogRange, range],
  );

  const callLogEntries = useMemo(() => {
    let rows = getAuditorOutcomes(calls, customers, agent.id, callLogDateRange, overturnedOnly);
    if (callLogStatus === 'approved') rows = rows.filter((r) => r.auditorDecision === 'Approved');
    else if (callLogStatus === 'rejected') rows = rows.filter((r) => r.auditorDecision === 'Rejected');
    else if (callLogStatus === 'recapture') rows = rows.filter((r) => r.auditorDecision === 'Recapture');
    return rows;
  }, [agent.id, callLogDateRange, overturnedOnly, callLogStatus]);

  const selectedCall = useMemo(
    () => callLogEntries.find((c) => c.id === selectedCallId) ?? null,
    [callLogEntries, selectedCallId],
  );
  const selectedCustomer = useMemo(
    () => (selectedCall ? customers.find((c) => c.id === selectedCall.customerId) ?? null : null),
    [selectedCall],
  );
  const selectedAuditor = useMemo(
    () => (selectedCall?.auditorId ? auditors.find((a) => a.id === selectedCall.auditorId) ?? null : null),
    [selectedCall],
  );

  const stats = useMemo(
    () => getAgentStats(calls, agent.id, range, undefined, attendance),
    [agent.id, range],
  );

  const efficiencyResult = useMemo(
    () => getEfficiencyScore(calls, agent.id, range, attendance),
    [agent.id, range],
  );

  const dailyTrend = useMemo(
    () => getDailyCallTrend(calls, agent.id, range),
    [agent.id, range],
  );

  const accuracyTrend = useMemo(
    () => getAccuracyTrend(calls, agent.id, range),
    [agent.id, range],
  );

  const efficiencyTrend = useMemo(
    () => getEfficiencyTrend(calls, agent.id, range, attendance),
    [agent.id, range],
  );

  const callTimeTrend = useMemo(
    () => getCallTimeTrend(calls, agent.id, range),
    [agent.id, range],
  );

  const auditorOutcomes = callLogEntries;

  const setAttendanceQuickRange = (days: number | 'month') => {
    const to = new Date();
    const from = new Date();
    if (days === 'month') {
      from.setDate(1);
    } else {
      from.setDate(from.getDate() - (days - 1));
    }
    setAttendanceRange({ from: toDateInput(from), to: toDateInput(to) });
  };

  const accuracyDelta = stats.accuracy - 95;

  const efficiencySpark = efficiencyTrend.slice(-14).map((d) => ({ value: d.efficiency }));
  const accuracySpark = accuracyTrend.slice(-14).map((d) => ({ value: d.accuracy }));

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-text-muted text-sm mt-1">Track your VKYC metrics and auditor feedback</p>
      </div>

      <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 w-fit">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPreset(p.id)}
            className={cn(
              'px-3 py-2 rounded-md text-sm transition-colors',
              preset === p.id ? 'bg-primary text-white' : 'text-text-muted hover:bg-primary-soft',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <EfficiencyHeroCard
          score={efficiencyResult.score}
          components={efficiencyResult.components}
          tooltip={METRIC_TOOLTIPS.efficiency}
          sparkData={efficiencySpark}
        />
        <HeroMetricCard
          label="Accuracy"
          value={`${stats.accuracy}%`}
          target="Target: 95%"
          delta={accuracyDelta}
          deltaLabel={`${accuracyDelta >= 0 ? '+' : ''}${accuracyDelta}% vs target`}
          tooltip={METRIC_TOOLTIPS.accuracy}
          sparkData={accuracySpark}
          sparkColor={CHART_COLORS.approved}
        />
      </div>

      <div>
        <button
          type="button"
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="-mx-2 mb-4 inline-flex min-h-8 items-center gap-2 rounded px-2 text-sm font-semibold transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <ChevronDown size={18} className={cn('transition-transform', detailsOpen && 'rotate-180')} />
          Detailed Metrics
        </button>
        {detailsOpen && (
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard label="Calls Taken" value={stats.callsTaken} tooltip={METRIC_TOOLTIPS.callsTaken} />
            <StatCard label="Approved" value={stats.approved} tooltip={METRIC_TOOLTIPS.approved} />
            <StatCard label="Rejected" value={stats.rejected} tooltip={METRIC_TOOLTIPS.rejected} />
            <StatCard label="Approval Rate" value={`${stats.approvalRate}%`} tooltip={METRIC_TOOLTIPS.approvalRate} />
            <StatCard label="Avg Call Time" value={formatMinutes(stats.avgCallTimeSec)} tooltip={METRIC_TOOLTIPS.avgCallTime} />
            <StatCard
              label="Call Drop Rate"
              value={stats.callDropRate !== null ? `${stats.callDropRate}%` : '—'}
              tooltip={METRIC_TOOLTIPS.callDropRate}
              className={stats.callDropRate !== null && stats.callDropRate > 8 ? 'bg-danger-subtle/60 border-danger' : undefined}
            />
            <StatCard
              label="Avg Wait Time"
              value={stats.avgWaitSec > 0 ? `${stats.avgWaitSec}s` : '—'}
              tooltip={METRIC_TOOLTIPS.avgWait}
            />
            <StatCard
              label="Avg Review Time"
              value={stats.avgReviewSec > 0 ? `${stats.avgReviewSec}s` : '—'}
              tooltip={METRIC_TOOLTIPS.avgReview}
            />
          </div>
        )}
      </div>

      <Card>
        <h3 className="font-semibold text-sm mb-4">Attendance</h3>
        <div className="flex flex-wrap items-end gap-3 mb-4 pb-4 border-b border-border">
          <div>
            <label className="block text-xs text-text-muted mb-1">From</label>
            <input
              type="date"
              value={attendanceRange.from}
              onChange={(e) => setAttendanceRange((r) => ({ ...r, from: e.target.value }))}
              className="px-2 py-2 rounded-lg border border-border text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">To</label>
            <input
              type="date"
              value={attendanceRange.to}
              onChange={(e) => setAttendanceRange((r) => ({ ...r, to: e.target.value }))}
              className="px-2 py-2 rounded-lg border border-border text-sm"
            />
          </div>
          <div className="flex gap-1">
            {([7, 14, 30] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setAttendanceQuickRange(d)}
                className="px-2.5 py-2 rounded-md text-xs border border-border hover:bg-primary-soft"
              >
                {d}D
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAttendanceQuickRange('month')}
              className="px-2.5 py-2 rounded-md text-xs border border-border hover:bg-primary-soft"
            >
              This month
            </button>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Adherence</label>
            <select
              value={attendanceAdherence}
              onChange={(e) => setAttendanceAdherence(e.target.value as AdherenceFilter)}
              className="px-2 py-2 rounded-lg border border-border text-sm"
            >
              <option value="all">All</option>
              <option value="below90">Below 90%</option>
              <option value="90plus">90%+</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-text-muted mb-3">Showing {attendanceRows.length} days</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted border-b border-border">
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Login At</th>
                <th className="pb-2 pr-4">Logout At</th>
                <th className="pb-2 pr-4">Total Online</th>
                <th className="pb-2 pr-4">Total Break</th>
                <th className="pb-2 pr-4">Idle Time</th>
                <th className="pb-2">Adherence %</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRows.slice(0, 14).map((row) => (
                <tr key={row.date} className="border-b border-border/50">
                  <td className="py-2 pr-4">{row.date}</td>
                  <td className="py-2 pr-4">{row.loginAt}</td>
                  <td className="py-2 pr-4">{row.logoutAt}</td>
                  <td className="py-2 pr-4">{Math.floor(row.totalOnlineMin / 60)}h {row.totalOnlineMin % 60}m</td>
                  <td className="py-2 pr-4">{row.totalBreakMin}m</td>
                  <td className="py-2 pr-4">{row.idleMin}m</td>
                  <td className="py-2">
                    <span className={cn(
                      'font-medium',
                      row.adherencePct >= 90 ? 'text-success' : row.adherencePct >= 75 ? 'text-warning' : 'text-danger',
                    )}>
                      {row.adherencePct}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-sm">Call Log</h3>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={overturnedOnly}
              onChange={(e) => setOverturnedOnly(e.target.checked)}
              className="rounded text-primary"
            />
            Overturned only
          </label>
        </div>
        {callLogRange && (
          <div className="flex flex-wrap items-end gap-3 mb-4 pb-4 border-b border-border">
            <div className="flex gap-1">
              {([
                ['all', 'All'],
                ['approved', 'Approved'],
                ['rejected', 'Auditor Rejected'],
                ['recapture', 'Recapture'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCallLogStatus(id)}
                  className={cn(
                    'px-2.5 py-2 rounded-md text-xs border transition-colors',
                    callLogStatus === id
                      ? 'bg-primary text-white border-primary'
                      : 'border-border hover:bg-primary-soft',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">From</label>
              <input
                type="date"
                value={callLogRange.from}
                onChange={(e) => setCallLogRange((r) => r && ({ ...r, from: e.target.value }))}
                className="px-2 py-2 rounded-lg border border-border text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">To</label>
              <input
                type="date"
                value={callLogRange.to}
                onChange={(e) => setCallLogRange((r) => r && ({ ...r, to: e.target.value }))}
                className="px-2 py-2 rounded-lg border border-border text-sm"
              />
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted border-b border-border">
                <th className="pb-2 pr-4">App ID</th>
                <th className="pb-2 pr-4">Customer</th>
                <th className="pb-2 pr-4">My Decision</th>
                <th className="pb-2 pr-4">Auditor Decision</th>
                <th className="pb-2 pr-4">Reason</th>
                <th className="pb-2 pr-4">Auditor Remarks</th>
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {auditorOutcomes.slice(0, 20).map((row) => (
                <tr key={row.id} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono text-xs">{row.appId}</td>
                  <td className="py-2 pr-4">{row.customerName}</td>
                  <td className="py-2 pr-4 capitalize">{row.agentDecision}</td>
                  <td className="py-2 pr-4">
                    <StatusPill
                      label={row.auditorDecision ?? '—'}
                      variant={
                        row.auditorDecision === 'Approved' ? 'accepted'
                          : row.auditorDecision === 'Rejected' ? 'rejected'
                          : 'recapture'
                      }
                    />
                  </td>
                  <td className="py-2 pr-4 text-text-muted">{row.auditorReason ?? '—'}</td>
                  <td className="py-2 pr-4 text-text-muted max-w-[200px] truncate">{row.auditorRemarks ?? '—'}</td>
                  <td className="py-2 pr-4">{row.timestamp.slice(0, 10)}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCallId(row.id)}
                      className="inline-flex items-center gap-1 text-primary text-xs font-medium hover:underline"
                    >
                      <Eye size={14} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <CallLogViewModal
        open={!!selectedCallId}
        onClose={() => setSelectedCallId(null)}
        call={selectedCall}
        customer={selectedCustomer}
        auditor={selectedAuditor}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-sm mb-4">Calls per Day</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyTrend.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="approved" stackId="a" fill={CHART_COLORS.approved} name="Approved" />
              <Bar dataKey="rejected" stackId="a" fill={CHART_COLORS.rejected} name="Rejected" />
              <Bar dataKey="failed" stackId="a" fill={CHART_COLORS.failed} name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="font-semibold text-sm mb-4">Accuracy Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={accuracyTrend.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis domain={[80, 100]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <ReferenceLine y={95} stroke={CHART_COLORS.accent} strokeDasharray="4 4" label="95% target" />
              <Line type="monotone" dataKey="accuracy" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} name="Accuracy %" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-sm mb-4">Avg Call Time Over Time (minutes)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={callTimeTrend.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="avgCallTime" stroke={CHART_COLORS.approved} strokeWidth={2} dot={false} name="Avg Call Time (min)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
