import { TrendingUp, TrendingDown } from 'lucide-react';
import { InfoTooltip } from '@vkyc/shared/components/ui/InfoTooltip';
import { cn } from '@vkyc/shared/lib/cn';
import {
  getCallConversion,
  getCustomerConversion,
  type ConversionResult,
} from '@vkyc/shared/data/adminSelectors';
import { SectionCard } from '@admin/features/admin/components/SectionCard';
import { usePartnerId } from '@admin/features/admin/PartnerFilterContext';

function Delta({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-[11px] text-text-muted">no change vs yesterday</span>;
  const up = delta > 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[11px]', up ? 'text-success' : 'text-danger')}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? '+' : ''}{delta}pp vs yesterday
    </span>
  );
}

function Metric({ label, tooltip, result }: { label: string; tooltip: string; result: ConversionResult }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center text-text-muted text-xs">
        {label}
        <InfoTooltip text={tooltip} />
      </div>
      <div className="text-3xl font-semibold text-text mt-1">{result.rate}%</div>
      <div className="mt-1"><Delta delta={result.delta} /></div>
    </div>
  );
}

export function CustomerMetricsCard() {
  const partnerId = usePartnerId();

  return (
    <SectionCard
      title="Customer Metrics"
      className="h-full flex flex-col"
      bodyClassName="flex-1 flex flex-col"
    >
      {() => {
        const call = getCallConversion(partnerId);
        const customer = getCustomerConversion(partnerId);
        return (
          <div className="flex-1 flex flex-col justify-between gap-4">
            <Metric
              label="Call Conversion Rate"
              tooltip="Of calls answered by agents, % approved"
              result={call}
            />
            <Metric
              label="Customer Conversion Rate"
              tooltip="Of customers who started VKYC today, % whose KYC was approved"
              result={customer}
            />
          </div>
        );
      }}
    </SectionCard>
  );
}
