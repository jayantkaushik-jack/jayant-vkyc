import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import {
  getPartnerFunnel,
  getWaitTimeHistogram,
  getCallTimeHistogram,
  getPartnerTatTable,
  getHourlyVolumeByPartner,
  PARTNER_COLORS,
  getAgentRoster,
} from '@vkyc/shared/data/adminSelectors';
import { InfoTooltip } from '@vkyc/shared/components/ui/InfoTooltip';
import { PartnerMultiSelect } from '@vkyc/shared/components/ui/PartnerMultiSelect';
import { PARTNERS, type PartnerId } from '@vkyc/shared/data/types';
import { Card } from '@vkyc/shared/components/ui/Card';
import { cn } from '@vkyc/shared/lib/cn';

const PARTNER_IDS = new Set(PARTNERS.map((p) => p.id));

export function PartnerAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get('partner');
  const [selectedPartners, setSelectedPartners] = useState<PartnerId[]>(
    initial && PARTNER_IDS.has(initial as PartnerId) ? [initial as PartnerId] : PARTNERS.map((p) => p.id),
  );
  const [funnelMode, setFunnelMode] = useState<'calls' | 'customers'>('calls');
  const [datePreset, setDatePreset] = useState<'today' | '7d' | '30d' | 'custom'>('today');
  const todayIso = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(todayIso);
  const [toDate, setToDate] = useState(todayIso);
  const selectedPartnerSet = useMemo(() => new Set(selectedPartners), [selectedPartners]);
  const isMultiDay = datePreset !== 'today';

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
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      const fallbackStart = new Date();
      fallbackStart.setHours(0, 0, 0, 0);
      const fallbackEnd = new Date();
      fallbackEnd.setHours(23, 59, 59, 999);
      return { start: fallbackStart, end: fallbackEnd };
    }
    return start <= end ? { start, end } : { start: end, end: start };
  }, [datePreset, fromDate, toDate]);

  const allSelected = selectedPartners.length === PARTNERS.length;
  const singleSelected = selectedPartners.length === 1 ? selectedPartners[0] : null;
  const setPartnersAndUrl = (next: PartnerId[]) => {
    const params = new URLSearchParams(searchParams);
    if (next.length === 1) params.set('partner', next[0]);
    else params.delete('partner');
    setSelectedPartners(next.length > 0 ? next : PARTNERS.map((p) => p.id));
    setSearchParams(params, { replace: true });
  };
  const funnel = getPartnerFunnel({ range, partnerIds: selectedPartners, mode: funnelMode });
  const waitHistogram = getWaitTimeHistogram({ range, partnerIds: selectedPartners });
  const callHistogram = getCallTimeHistogram({ range, partnerIds: selectedPartners });
  const tatTable = getPartnerTatTable({ range, partnerIds: selectedPartners });
  const hourly = getHourlyVolumeByPartner({ range, partnerIds: selectedPartners, averagePerDay: isMultiDay });
  const roster = getAgentRoster().filter((a) => a.partners.some((pid) => selectedPartnerSet.has(pid)));

  const funnelWithDrop = funnel.map((stage, i) => ({
    ...stage,
    drop: i > 0 ? Math.max(0, funnel[i - 1].count - stage.count) : 0,
    dropPct: i > 0 && funnel[i - 1].count > 0
      ? Math.round(((funnel[i - 1].count - stage.count) / funnel[i - 1].count) * 1000) / 10
      : 0,
  }));
  const allocatedHeadline = roster.length;
  const dedicatedHeadline = roster.filter((a) => a.dedicated).length;
  const sharedHeadline = allocatedHeadline - dedicatedHeadline;
  const hasSpecificPartnerSelection = selectedPartners.length < PARTNERS.length;
  const allocationByPartner = PARTNERS.filter((p) => selectedPartnerSet.has(p.id)).map((p) => {
    const agents = roster.filter((a) => a.partners.includes(p.id));
    return {
      partnerId: p.id,
      partnerName: p.name,
      dedicated: agents.filter((a) => a.dedicated),
      shared: agents.filter((a) => !a.dedicated),
      total: agents.length,
    };
  });

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Partner Analytics</h1>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPartnersAndUrl(PARTNERS.map((p) => p.id))}
          className={cn('px-3 py-1.5 rounded-lg text-sm border', allSelected ? 'bg-primary text-white border-primary' : 'border-border')}
        >
          All
        </button>
        {PARTNERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPartnersAndUrl([p.id])}
            className={cn('px-3 py-1.5 rounded-lg text-sm border', singleSelected === p.id ? 'bg-primary text-white border-primary' : 'border-border')}
          >
            {p.name}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            {(['today', '7d', '30d', 'custom'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDatePreset(preset)}
                className={cn(
                  'px-2 py-1 text-xs rounded',
                  datePreset === preset ? 'bg-primary text-white' : 'text-text-muted',
                )}
              >
                {preset === 'today' ? 'Today' : preset === '7d' ? '7D' : preset === '30d' ? '30D' : 'Custom'}
              </button>
            ))}
          </div>
          {datePreset === 'custom' && (
            <div className="flex items-center gap-1">
              <input
                type="date"
                max={todayIso}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2 py-1 rounded border border-border text-xs"
              />
              <span className="text-xs text-text-muted">to</span>
              <input
                type="date"
                max={todayIso}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2 py-1 rounded border border-border text-xs"
              />
            </div>
          )}
          <PartnerMultiSelect
            value={selectedPartners}
            onChange={(next) => {
              setPartnersAndUrl(next);
            }}
          />
        </div>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-sm">Conversion Funnel</h3>
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            <button
              type="button"
              onClick={() => setFunnelMode('calls')}
              className={cn('px-2.5 py-1 text-xs rounded', funnelMode === 'calls' ? 'bg-primary text-white' : 'text-text-muted')}
            >
              Calls
            </button>
            <button
              type="button"
              onClick={() => setFunnelMode('customers')}
              className={cn('px-2.5 py-1 text-xs rounded', funnelMode === 'customers' ? 'bg-primary text-white' : 'text-text-muted')}
            >
              Unique Customers
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {funnelWithDrop.map((stage) => (
            <div key={stage.stage}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span>{stage.stage}</span>
                <span className="font-semibold">{stage.count.toLocaleString()}</span>
              </div>
              <div className="h-6 bg-gray-100 rounded overflow-hidden">
                <div
                  className="h-full bg-primary rounded"
                  style={{ width: `${(stage.count / funnel[0].count) * 100}%` }}
                />
              </div>
              {stage.drop > 0 && (
                <p className="text-xs text-danger mt-0.5">
                  −{stage.drop.toLocaleString()} ({stage.dropPct.toFixed(1)}% drop)
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-semibold text-sm mb-4">Wait Time Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={waitHistogram}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBE8F2" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6434D6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h3 className="font-semibold text-sm mb-4">Call Time Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={callHistogram}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBE8F2" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#7C5EF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <h3 className="font-semibold text-sm mb-4">TAT & Drop-off by Partner</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b border-border">
              <th className="pb-2 pr-3">Partner</th>
              <th className="pb-2 pr-3">Leads</th>
              <th className="pb-2 pr-3">Initiated</th>
              <th className="pb-2 pr-3">Completed</th>
              <th className="pb-2 pr-3">Approved</th>
              <th className="pb-2 pr-3">
                Avg TAT
                <InfoTooltip text="Average turnaround time from lead creation (Create User) to final KYC approval - includes queue, call, and auditor review time." />
              </th>
              <th className="pb-2 pr-3">Drop-off %</th>
              <th className="pb-2">
                Trend
                <InfoTooltip text="Daily call volume over the selected period." />
              </th>
            </tr>
          </thead>
          <tbody>
            {tatTable.map((row) => (
              <tr key={row.partnerId} className="border-b border-border/50">
                <td className="py-2 pr-3 font-medium">{row.partnerName}</td>
                <td className="py-2 pr-3">{row.leadsReceived.toLocaleString()}</td>
                <td className="py-2 pr-3">{row.vkycInitiated.toLocaleString()}</td>
                <td className="py-2 pr-3">{row.completed.toLocaleString()}</td>
                <td className="py-2 pr-3">{row.approved.toLocaleString()}</td>
                <td
                  className={cn(
                    'py-2 pr-3 rounded',
                    row.avgTatMin <= 60 ? 'bg-green-50 text-success' : row.avgTatMin <= 240 ? 'bg-amber-50 text-warning' : 'bg-red-50 text-danger',
                  )}
                >
                  {row.avgTatMin}m
                </td>
                <td
                  className={cn(
                    'py-2 pr-3 rounded',
                    row.dropOffPct < 15 ? 'bg-green-50 text-success' : row.dropOffPct <= 25 ? 'bg-amber-50 text-warning' : 'bg-red-50 text-danger',
                  )}
                >
                  {row.dropOffPct}%
                </td>
                <td className="py-2">
                  <svg width="90" height="24" className="inline-block">
                    <polyline
                      fill="none"
                      stroke={PARTNER_COLORS[row.partnerId]}
                      strokeWidth="2"
                      points={row.trend.map((v, i) => {
                        const max = Math.max(...row.trend, 1);
                        const x = row.trend.length === 1 ? 45 : (i / (row.trend.length - 1)) * 86 + 2;
                        const y = 20 - (v / max) * 16;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                  </svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 text-xs text-text-muted border-t border-border pt-2 flex flex-wrap gap-4">
          <span><b>TAT bands:</b> green ≤ 1h · amber 1–4h · red &gt; 4h</span>
          <span><b>Drop-off bands:</b> green &lt; 15% · amber 15–25% · red &gt; 25%</span>
        </div>
      </Card>

      <Card>
        <div className="flex items-baseline justify-between mb-4 gap-3">
          <h3 className="font-semibold text-sm">Hourly Call Volume</h3>
          {isMultiDay && (
            <p className="text-xs text-text-muted">Avg per hour over {Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / 86_400_000) + 1)} days</p>
          )}
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={hourly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EBE8F2" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="ALL" name="All" stroke="#6434D6" strokeWidth={3} dot={false} />
            {hasSpecificPartnerSelection && selectedPartners.map((pid) => (
              <Line
                type="monotone"
                key={pid}
                dataKey={pid}
                name={PARTNERS.find((p) => p.id === pid)?.name ?? pid}
                stroke={PARTNER_COLORS[pid]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <div className="mb-4">
          <h3 className="font-semibold text-sm">Agents Allocated</h3>
          <p className="text-xs text-text-muted mt-0.5">as of now</p>
          <p className="text-sm mt-2">
            <span className="font-semibold">Agents allocated: {allocatedHeadline}</span>
            <span className="text-text-muted"> · {dedicatedHeadline} dedicated · {sharedHeadline} shared</span>
          </p>
        </div>
        <div className="space-y-3">
          {allocationByPartner.map((row) => (
            <div key={row.partnerId}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">{row.partnerName}</span>
                <span className="text-text-muted">{row.total} agents</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
                <div
                  className="bg-[#6434D6]"
                  style={{ width: `${row.total > 0 ? (row.dedicated.length / row.total) * 100 : 0}%` }}
                  title={`${row.dedicated.length} dedicated`}
                />
                <div
                  className="bg-[#B9A3FF]"
                  style={{ width: `${row.total > 0 ? (row.shared.length / row.total) * 100 : 0}%` }}
                  title={row.shared.length > 0
                    ? row.shared
                        .map((a) => `${a.name}: ${a.partners.filter((pid) => pid !== row.partnerId).join(', ')}`)
                        .join(' | ')
                    : '0 shared'}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
