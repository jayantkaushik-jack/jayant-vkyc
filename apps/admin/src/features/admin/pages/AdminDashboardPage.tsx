import { useSearchParams } from 'react-router-dom';
import { PARTNERS, type PartnerId } from '@vkyc/shared/data/types';
import { AvailabilitySummaryCard } from '@admin/features/admin/components/home/AvailabilitySummaryCard';
import { CustomerMetricsCard } from '@admin/features/admin/components/home/CustomerMetricsCard';
import { PartnerDayBreakdownCard } from '@admin/features/admin/components/home/PartnerDayBreakdownCard';
import { HourlyVolumeCard } from '@admin/features/admin/components/home/HourlyVolumeCard';
import { CsatCard } from '@admin/features/admin/components/home/CsatCard';
import { AgentAllocationCard } from '@admin/features/admin/components/home/AgentAllocationCard';
import { KpiStripCard } from '@admin/features/admin/components/home/KpiStripCard';
import { QueueMonitorCard } from '@admin/features/admin/components/home/QueueMonitorCard';
import { QueueWaitTimeCards } from '@admin/features/admin/components/home/QueueWaitTimeCards';
import { AlertsCard } from '@admin/features/admin/components/home/AlertsCard';
import { PartnerFilterProvider, type PartnerFilterValue } from '@admin/features/admin/PartnerFilterContext';

export function AdminDashboardPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('partner');
  const partner: PartnerFilterValue = raw && PARTNERS.some((p) => p.id === raw) ? (raw as PartnerId) : 'ALL';

  const setPartner = (value: PartnerFilterValue) => {
    const next = new URLSearchParams(params);
    if (value === 'ALL') next.delete('partner');
    else next.set('partner', value);
    setParams(next, { replace: true });
  };

  return (
    <PartnerFilterProvider value={partner}>
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-text-muted">Partner</span>
            <select
              value={partner}
              onChange={(e) => setPartner(e.target.value as PartnerFilterValue)}
              className="px-3 py-1.5 rounded-lg border border-border text-sm bg-surface"
            >
              <option value="ALL">All partners</option>
              {PARTNERS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
        </div>

        <KpiStripCard />

        <AlertsCard />

        <QueueWaitTimeCards />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2 h-full">
            <AvailabilitySummaryCard />
          </div>
          <div className="lg:col-span-1 h-full">
            <CustomerMetricsCard />
          </div>
        </div>

        <PartnerDayBreakdownCard />
        <QueueMonitorCard />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2 h-full min-h-[420px]">
            <HourlyVolumeCard />
          </div>
          <div className="lg:col-span-1 h-full min-h-[420px]">
            <CsatCard />
          </div>
        </div>

        <AgentAllocationCard />
      </div>
    </PartnerFilterProvider>
  );
}
