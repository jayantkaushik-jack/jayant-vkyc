import { SectionCard } from '@admin/features/admin/components/SectionCard';
import { cn } from '@vkyc/shared/lib/cn';
import {
  getAgentOverview,
  getPartnerDayBreakdown,
  getProductivityFleetSummary,
} from '@vkyc/shared/data/adminSelectors';
import { getDateRangeFromPreset } from '@vkyc/shared/data';
import { usePartnerId } from '@admin/features/admin/PartnerFilterContext';

function KpiTile({
  label,
  value,
  subtext,
  alert = false,
  warn = false,
  tooltip,
}: {
  label: string;
  value: string | number;
  subtext: string;
  alert?: boolean;
  warn?: boolean;
  tooltip?: string;
}) {
  return (
    <div className={cn(
      'rounded-lg border p-4',
      alert ? 'border-danger/40 bg-red-50/40' : warn ? 'border-warning/40 bg-amber-50/40' : 'border-border bg-bg/60',
    )}
    >
      <p className="text-xs text-text-muted" title={tooltip}>{label}</p>
      <p className={cn('text-2xl font-semibold mt-1', alert ? 'text-danger' : warn ? 'text-warning' : '')}>{value}</p>
      <p className="text-[11px] text-text-muted mt-1">{subtext}</p>
    </div>
  );
}

export function KpiStripCard() {
  const partnerId = usePartnerId();
  return (
    <SectionCard title="Live KPIs" bodyClassName="overflow-hidden">
      {() => {
        const breakdown = getPartnerDayBreakdown();
        const total = breakdown.find((r) => r.partnerId === (partnerId ?? 'TOTAL'));
        const overview = getAgentOverview();
        const totalCalls = total?.totalCalls ?? 0;
        const avgWait = total?.avgWaitSec ?? 0;
        const dropRate = total?.dropRate ?? 0;
        const fleet = getProductivityFleetSummary(getDateRangeFromPreset('today'), partnerId ? [partnerId] : undefined);
        const occupancyAlert = fleet.occupancy > 90;
        const occupancySub = fleet.occupancy > 90 ? 'overload' : fleet.occupancy < 60 ? 'under-utilized' : 'healthy';

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <KpiTile
              label="Total Calls Today"
              value={totalCalls.toLocaleString()}
              subtext="Target 1,500"
            />
            <KpiTile
              label="Avg Wait Time"
              value={`${avgWait}s`}
              subtext="SLA 60s"
            />
            <KpiTile
              label="Call Drop Rate"
              value={`${dropRate.toFixed(1)}%`}
              subtext="Alert >5%"
              alert={dropRate > 5}
            />
            <KpiTile
              label="Active Agents"
              value={overview.online}
              subtext={`${overview.onBreak} on break, ${overview.offline} offline`}
            />
            <KpiTile
              label="Occupancy"
              value={`${fleet.occupancy.toFixed(1)}%`}
              subtext={occupancySub}
              alert={occupancyAlert}
              warn={fleet.occupancy < 60}
              tooltip="Handling time (on-call + post-call review) divided by online time. Sustained >90% indicates overload risk."
            />
          </div>
        );
      }}
    </SectionCard>
  );
}
