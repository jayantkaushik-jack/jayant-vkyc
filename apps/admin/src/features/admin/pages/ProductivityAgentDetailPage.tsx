import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  getAgentBreakPatterns,
  getAgentProductivityTrends,
  getAgentReasonBreakdown,
  getProductivityAgentRows,
  type AgentReasonRow,
} from '@vkyc/shared/data/adminSelectors';
import { getDateRangeFromPreset } from '@vkyc/shared/data';
import { useAdminConfig } from '@vkyc/shared/data/sessionStore';
import { PARTNERS, type PartnerId } from '@vkyc/shared/data/types';
import { Avatar } from '@vkyc/shared/components/ui/Avatar';
import { Card } from '@vkyc/shared/components/ui/Card';
import { PRODUCTIVITY_METRICS, type ProductivityMetricId } from '@admin/features/admin/productivityMetrics';
import { cn } from '@vkyc/shared/lib/cn';

type TrendPreset = '7d' | '30d' | '90d';

function parsePartners(raw: string | null): PartnerId[] {
  if (!raw) return PARTNERS.map((p) => p.id);
  const set = new Set(raw.split(',').filter(Boolean));
  return PARTNERS.map((p) => p.id).filter((id) => set.has(id));
}

function formatTenure(dojIso: string): string {
  const doj = new Date(dojIso);
  const now = new Date();
  let months = (now.getFullYear() - doj.getFullYear()) * 12 + (now.getMonth() - doj.getMonth());
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return `${years} yr ${rem} mo`;
}

function numeric(row: Record<string, string | number>, key: ProductivityMetricId): number {
  const v = row[key];
  return typeof v === 'number' ? v : 0;
}

export function ProductivityAgentDetailPage() {
  const { agentId = '' } = useParams();
  const [params] = useSearchParams();
  const config = useAdminConfig();
  const partners = parsePartners(params.get('partners'));
  const today = new Date().toISOString().slice(0, 10);
  const [trendPreset, setTrendPreset] = useState<TrendPreset>('30d');
  const [trendMetric, setTrendMetric] = useState<ProductivityMetricId>('efficiency');
  const [day, setDay] = useState(today);
  const range = useMemo(() => getDateRangeFromPreset((params.get('preset') as 'today' | '7d' | '30d') || '30d'), [params]);
  const trendRange = useMemo(() => getDateRangeFromPreset(trendPreset), [trendPreset]);

  const roster = useMemo(
    () => getProductivityAgentRows(range, partners),
    [range, partners, config.maxBreakMinPerDay, config.minOnlineHrsPerDay],
  );
  const row = roster.find((r) => r.agent.id === agentId) ?? null;
  const trend = useMemo(() => getAgentProductivityTrends(agentId, trendRange, partners), [agentId, trendRange, partners]);
  const breaks = useMemo(() => getAgentBreakPatterns(agentId, trendRange, day), [agentId, trendRange, day]);
  const reasons = useMemo(() => getAgentReasonBreakdown(agentId, range, partners), [agentId, range, partners]);
  const dayOptions = useMemo(() => trend.map((d) => String(d.date)), [trend]);

  if (!row) {
    return (
      <div className="p-6 max-w-[1200px] mx-auto">
        <Link to={`/productivity?${params.toString()}`} className="text-sm text-primary hover:underline">Back to roster</Link>
        <p className="mt-4 text-text-muted">Agent not found for selected filters.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <Link to={`/productivity?${params.toString()}`} className="text-sm text-primary hover:underline">Back to roster</Link>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar person={{ id: row.agent.id, name: row.agent.name }} size="md" />
            <div>
              <p className="font-semibold">{row.agent.name}</p>
              <p className="text-xs text-text-muted">{row.agent.employeeId}</p>
            </div>
          </div>
          <ProfileLine label="Date of Joining" value={`${row.agent.dateOfJoining} (${formatTenure(row.agent.dateOfJoining)})`} />
          <ProfileLine label="Manager" value={row.agent.manager} />
          <ProfileLine label="Branch" value={row.agent.branch} />
          <ProfileLine label="Email" value={row.agent.email} />
          <ProfileLine label="Languages" value={row.agent.skills.languages.join(', ')} />
          <ProfileLine label="Partner allocation" value={row.partners.length > 1 ? `Shared (${row.partners.length})` : 'Dedicated'} />
          <ProfileLine label="Partners" value={row.partners.map((p) => PARTNERS.find((x) => x.id === p)?.name ?? p).join(', ') || '—'} />
          <ProfileLine label="Work plan" value={`${row.agent.workPlan[0]?.officeStart}-${row.agent.workPlan[0]?.officeEnd} (Break ${row.agent.workPlan[0]?.breakStart}-${row.agent.workPlan[0]?.breakEnd})`} />
          <ProfileLine label="Status" value={row.liveState.replace(/_/g, ' ')} />
          {row.thresholdBreach && (
            <div className="px-2 py-1.5 rounded bg-red-50 border border-red-200 text-xs text-danger">
              Threshold breach
              {row.breakBreach ? ` · break ${row.avgBreakMin.toFixed(0)}m` : ''}
              {row.onlineBreach ? ` · online ${row.avgHoursOnline.toFixed(1)}h` : ''}
            </div>
          )}
        </Card>

        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {PRODUCTIVITY_METRICS.map((m) => {
              const breached = (m.id === 'avgBreakMin' && row.breakBreach) || (m.id === 'avgHoursOnline' && row.onlineBreach);
              return (
                <MetricSparkCard
                  key={m.id}
                  label={m.label}
                  value={m.format(row[m.id] as number)}
                  values={trend.map((t) => numeric(t, m.id))}
                  breach={breached}
                />
              );
            })}
          </div>

          <Card>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h3 className="font-semibold text-sm mr-2">Trend Explorer</h3>
              {(['7d', '30d', '90d'] as TrendPreset[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTrendPreset(p)}
                  className={cn('px-2 py-1 text-xs rounded border', trendPreset === p ? 'bg-primary text-white border-primary' : 'border-border')}
                >
                  {p.toUpperCase()}
                </button>
              ))}
              <select value={trendMetric} onChange={(e) => setTrendMetric(e.target.value as ProductivityMetricId)} className="ml-auto px-2 py-1.5 border border-border rounded text-sm">
                {PRODUCTIVITY_METRICS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => String(d).slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line dataKey={trendMetric} type="monotone" stroke="#6434D6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Break Patterns - Intraday</h3>
                <select value={breaks.selectedDay} onChange={(e) => setDay(e.target.value)} className="px-2 py-1 border border-border rounded text-xs">
                  {dayOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="relative h-10 rounded bg-primary-soft/30 border border-border">
                {breaks.intraday.map((b, idx) => {
                  const [sh, sm] = b.start.split(':').map(Number);
                  const [eh, em] = b.end.split(':').map(Number);
                  const startMin = sh * 60 + sm;
                  const endMin = eh * 60 + em;
                  const base = 9 * 60;
                  const span = 9 * 60;
                  const left = ((startMin - base) / span) * 100;
                  const width = Math.max(1, ((endMin - startMin) / span) * 100);
                  return (
                    <div
                      key={`${b.start}-${idx}`}
                      className="absolute top-1 h-8 rounded bg-warning/60 border border-warning/70"
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${b.start}-${b.end} (${b.durationMin}m)`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-text-muted mt-1">
                <span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span>
              </div>
            </Card>

            <Card>
              <h3 className="font-semibold text-sm mb-3">Break Patterns - By Weekday</h3>
              <div className="space-y-2">
                {breaks.byWeekday.map((w) => (
                  <div key={w.weekday} className="grid grid-cols-[40px_1fr_48px] items-center gap-2 text-xs">
                    <span>{w.weekday}</span>
                    <div className="h-2 rounded bg-primary-soft">
                      <div className="h-2 rounded bg-primary" style={{ width: `${Math.min(100, (w.avgBreakMin / 90) * 100)}%` }} />
                    </div>
                    <span className="text-right">{w.avgBreakMin.toFixed(1)}m</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <h3 className="font-semibold text-sm mb-1">Reasons breakdown (coaching)</h3>
            <p className="text-xs text-text-muted mb-3">
              This agent&apos;s Rejected and Unable-to-Verify reasons over the selected period — spot recurring
              patterns worth coaching.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ReasonList title="Rejected" rows={reasons.rejected} />
              <ReasonList title="Unable to Verify" rows={reasons.unable} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ReasonList({ title, rows }: { title: string; rows: AgentReasonRow[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-text-muted mb-2">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-text-muted">No cases in this period.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.reason} className="grid grid-cols-[1fr_auto] gap-2 items-center text-xs">
              <div className="min-w-0">
                <p className="truncate text-text">{r.reason}</p>
                <p className="text-[10px] text-text-muted">{r.category}</p>
              </div>
              <span className="tabular-nums text-text-muted">{r.count} · {r.pct}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-text-muted">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function MetricSparkCard({ label, value, values, breach }: { label: string; value: string; values: number[]; breach?: boolean }) {
  const max = Math.max(1, ...values);
  const min = Math.min(...values, 0);
  const points = values.map((v, i) => {
    const x = values.length <= 1 ? 0 : (i / (values.length - 1)) * 100;
    const y = 24 - ((v - min) / Math.max(1, max - min)) * 20;
    return `${x},${y}`;
  }).join(' ');
  return (
    <Card className={breach ? 'border-danger/40' : undefined}>
      <p className="text-xs text-text-muted">{label}</p>
      <p className={cn('text-xl font-semibold mt-1', breach && 'text-danger')}>{value}{breach ? ' ⚠' : ''}</p>
      <svg viewBox="0 0 100 24" className="w-full h-8 mt-2">
        <polyline points={points} fill="none" stroke={breach ? '#E5484D' : '#6434D6'} strokeWidth="2" />
      </svg>
    </Card>
  );
}

