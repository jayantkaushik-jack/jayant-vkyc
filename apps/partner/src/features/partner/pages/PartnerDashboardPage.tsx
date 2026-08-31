import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Card } from '@vkyc/shared/components/ui/Card';
import { StatCard } from '@vkyc/shared/components/ui/StatCard';
import { getDateRangeFromPreset } from '@vkyc/shared/data/selectors';
import {
  getCallTimeHistogram,
  getHourlyVolumeByPartner,
  getPartnerDayBreakdown,
  getPartnerFunnel,
  getPartnerTatTable,
  getStatusFlowSummary,
  getWaitTimeHistogram,
  NON_APPROVED_STATUS_COLORS,
  NON_APPROVED_STATUS_ORDER,
} from '@vkyc/shared/data/adminSelectors';
import { formatMinutes } from '@vkyc/shared/lib/format';
import { usePartnerScope } from '@partner/features/partner/PartnerScopeContext';
import { RangeTabs, type RangePreset } from '@partner/components/RangeTabs';
import { QueueSnapshotCard } from '@partner/features/partner/components/QueueSnapshotCard';

function tatBand(avgTatMin: number): string {
  if (avgTatMin <= 60) return 'Fast';
  if (avgTatMin <= 240) return 'Moderate';
  return 'Slow';
}

export function PartnerDashboardPage() {
  const { partnerId, partner } = usePartnerScope();
  const [preset, setPreset] = useState<RangePreset>('30d');
  const range = useMemo(() => getDateRangeFromPreset(preset), [preset]);
  const isMultiDay = preset !== 'today';
  const dayCount = useMemo(
    () => Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) + 1),
    [range],
  );

  const flow = useMemo(() => getStatusFlowSummary(range, [partnerId]), [range, partnerId]);
  const dayRow = useMemo(
    () => getPartnerDayBreakdown({ range, partnerIds: [partnerId] }).find((r) => r.partnerId === partnerId),
    [range, partnerId],
  );
  const tat = useMemo(
    () => getPartnerTatTable({ range, partnerIds: [partnerId] }).find((r) => r.partnerId === partnerId),
    [range, partnerId],
  );
  const funnel = useMemo(() => getPartnerFunnel({ range, partnerIds: [partnerId] }), [range, partnerId]);
  const hourly = useMemo(
    () => getHourlyVolumeByPartner({ range, partnerIds: [partnerId], averagePerDay: isMultiDay }),
    [range, partnerId, isMultiDay],
  );
  const waitHistogram = useMemo(() => getWaitTimeHistogram({ range, partnerIds: [partnerId] }), [range, partnerId]);
  const callHistogram = useMemo(() => getCallTimeHistogram({ range, partnerIds: [partnerId] }), [range, partnerId]);

  const totalLeads = flow.totalLeads;
  const finalApproved = flow.auditorApproved;
  const approvalRate = totalLeads > 0 ? Math.round((finalApproved / totalLeads) * 1000) / 10 : 0;
  const dropRate = dayRow?.dropRate ?? 0;
  const avgWaitSec = dayRow?.avgWaitSec ?? 0;
  const avgTatMin = tat?.avgTatMin ?? 0;

  const outcomeData = NON_APPROVED_STATUS_ORDER.map((status) => {
    const count =
      status === 'User Dropped' ? flow.callDropped
        : status === 'Unable to Verify' ? flow.agentUnable
        : status === 'Rejected' ? flow.agentRejected
        : status === 'Recapture' ? flow.auditorRecapture
        : flow.auditorRejected;
    return { status, count };
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Dashboard</h1>
          <p className="text-sm text-text-muted mt-0.5">{partner.name} — VKYC performance overview.</p>
        </div>
        <RangeTabs value={preset} onChange={setPreset} />
      </div>

      <QueueSnapshotCard />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label="Total Leads" value={totalLeads} />
        <StatCard label="Connected" value={flow.callConnected} />
        <StatCard label="VKYC Approved" value={finalApproved} />
        <StatCard label="Approval Rate" value={`${approvalRate}%`} tooltip="Final auditor-approved ÷ total leads." />
        <StatCard
          label="Avg Wait"
          value={formatMinutes(avgWaitSec)}
          tooltip="Mean wait across the selected period. For the live position, see 'Queue right now' above."
        />
        <StatCard label="Drop Rate" value={`${dropRate}%`} />
        <StatCard
          label="Avg TAT"
          value={`${avgTatMin}m`}
          subtext={tatBand(avgTatMin)}
          tooltip="Average turnaround from lead to approval."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-text mb-4">Conversion funnel</h3>
          <div className="space-y-2.5">
            {funnel.map((s) => {
              const max = funnel[0]?.count || 1;
              const pct = Math.round((s.count / max) * 100);
              return (
                <div key={s.stage}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-text font-medium">{s.stage}</span>
                    <span className="text-text-muted">
                      {s.count}
                      {s.dropPct != null && <span className="text-danger ml-2">-{s.dropPct}%</span>}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-primary-soft overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-text mb-4">Non-approved outcomes</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={outcomeData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBE8F2" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="status" tick={{ fontSize: 10 }} width={100} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                {outcomeData.map((d) => (
                  <Cell key={d.status} fill={NON_APPROVED_STATUS_COLORS[d.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-text">Hourly call volume</h3>
        <p className="text-xs text-text-muted mb-4">
          {isMultiDay ? `Avg calls per hour across ${dayCount} days` : 'Calls received per hour today'}
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={hourly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EBE8F2" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey={partnerId} name="Calls" stroke="#6434D6" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-semibold text-text mb-4">Agent wait time distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={waitHistogram}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBE8F2" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#6434D6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-text mb-4">Call duration distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={callHistogram}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBE8F2" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#22A06B" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
