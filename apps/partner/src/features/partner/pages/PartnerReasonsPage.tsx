import { useMemo, useState } from 'react';
import { Card } from '@vkyc/shared/components/ui/Card';
import { StatCard } from '@vkyc/shared/components/ui/StatCard';
import { ReasonBarChart } from '@vkyc/shared/components/charts/ReasonBarChart';
import { NonApprovedCasesTable } from '@vkyc/shared/components/tables/NonApprovedCasesTable';
import { getDateRangeFromPreset } from '@vkyc/shared/data/selectors';
import {
  DEFAULT_NON_APPROVED_CRITERIA,
  type NonApprovedCaseCriteria,
} from '@vkyc/shared/data';
import {
  getFailureReasonsByStatus,
  getNonApprovedCases,
  NON_APPROVED_STATUS_COLORS,
  NON_APPROVED_STATUS_ORDER,
  type NonApprovedStatus,
} from '@vkyc/shared/data/adminSelectors';
import { usePartnerScope } from '@partner/features/partner/PartnerScopeContext';
import { RangeTabs, type RangePreset } from '@partner/components/RangeTabs';

export function PartnerReasonsPage() {
  const { partnerId, partner } = usePartnerScope();
  const [preset, setPreset] = useState<RangePreset>('30d');
  const [criteria, setCriteria] = useState<NonApprovedCaseCriteria>(DEFAULT_NON_APPROVED_CRITERIA);
  const range = useMemo(() => getDateRangeFromPreset(preset), [preset]);
  const pageDateFrom = range.start.toISOString().slice(0, 10);
  const pageDateTo = range.end.toISOString().slice(0, 10);

  const cases = useMemo(() => getNonApprovedCases({ range, partnerIds: [partnerId] }), [range, partnerId]);

  const countByStatus = (status: NonApprovedStatus) => cases.filter((c) => c.status === status).length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Rejection & Failure Reasons</h1>
          <p className="text-sm text-text-muted mt-0.5">{partner.name} — why cases don't get approved.</p>
        </div>
        <RangeTabs value={preset} onChange={setPreset} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Non-approved" value={cases.length} />
        {NON_APPROVED_STATUS_ORDER.map((status) => (
          <StatCard key={status} label={status} value={countByStatus(status)} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {NON_APPROVED_STATUS_ORDER.map((status) => {
          const bars = getFailureReasonsByStatus(status, cases, 6);
          if (bars.length === 0) return null;
          return (
            <Card key={status}>
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: NON_APPROVED_STATUS_COLORS[status] }}
                />
                <h3 className="text-sm font-semibold text-text">{status}</h3>
              </div>
              <ReasonBarChart
                rows={bars}
                color={NON_APPROVED_STATUS_COLORS[status]}
                rowHeight={36}
              />
            </Card>
          );
        })}
      </div>

      <NonApprovedCasesTable
        cases={cases}
        criteria={criteria}
        onCriteriaChange={setCriteria}
        pageDateFrom={pageDateFrom}
        pageDateTo={pageDateTo}
        variant="partner"
      />
    </div>
  );
}
