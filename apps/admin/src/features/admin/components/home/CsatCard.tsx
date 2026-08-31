import { Star } from 'lucide-react';
import { getCsatByPartner } from '@vkyc/shared/data/adminSelectors';
import { SectionCard } from '@admin/features/admin/components/SectionCard';
import { usePartnerId } from '@admin/features/admin/PartnerFilterContext';

function bandColor(score: number): string {
  if (score >= 4.2) return '#22A06B';
  if (score >= 3.5) return '#F5A623';
  return '#E5484D';
}

function Stars({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = score >= i + 1;
        const half = !filled && score > i;
        return (
          <span key={i} className="relative inline-flex">
            <Star size={18} className="text-border" fill="currentColor" />
            {(filled || half) && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: filled ? '100%' : `${(score - i) * 100}%` }}>
                <Star size={18} className="text-warning" fill="currentColor" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export function CsatCard() {
  const partnerId = usePartnerId();
  return (
    <SectionCard
      title="Customer Satisfaction (post-call survey)"
      className="h-full flex flex-col"
      bodyClassName="flex-1"
    >
      {() => {
        const csat = getCsatByPartner();
        const partners = partnerId ? csat.partners.filter((p) => p.partnerId === partnerId) : csat.partners;
        const headlineAvg = partnerId ? (partners[0]?.avg ?? 0) : csat.avg;
        const headlineCount = partnerId ? (partners[0]?.count ?? 0) : csat.count;
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border">
              <div>
                <div className="text-3xl font-semibold">
                  {headlineAvg.toFixed(1)} <span className="text-lg text-text-muted font-normal">/ 5</span>
                </div>
                <p className="text-[11px] text-text-muted">{headlineCount.toLocaleString()} responses today</p>
              </div>
              <div className="ml-auto"><Stars score={headlineAvg} /></div>
            </div>

            <div className="flex-1 flex flex-col justify-evenly gap-2.5">
              {partners.map((p) => (
                <div key={p.partnerId} className="grid grid-cols-[80px_1fr_32px] items-center gap-2">
                  <span className="text-xs text-text-muted truncate">{p.partnerName}</span>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(p.avg / 5) * 100}%`, backgroundColor: bandColor(p.avg) }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-right tabular-nums">{p.avg.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }}
    </SectionCard>
  );
}
