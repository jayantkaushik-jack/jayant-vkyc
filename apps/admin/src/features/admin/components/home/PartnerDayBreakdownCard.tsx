import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PartnerMultiSelect } from '@vkyc/shared/components/ui/PartnerMultiSelect';
import { PARTNERS, type PartnerId } from '@vkyc/shared/data/types';
import { cn } from '@vkyc/shared/lib/cn';
import { getPartnerDayBreakdown, type PartnerDayRow } from '@vkyc/shared/data/adminSelectors';
import { SectionCard } from '@admin/features/admin/components/SectionCard';

const COLUMNS: { key: keyof PartnerDayRow; label: string; showPct?: boolean }[] = [
  { key: 'totalCalls', label: 'Total Calls' },
  { key: 'approved', label: 'Approved', showPct: true },
  { key: 'rejected', label: 'Rejected', showPct: true },
  { key: 'unable', label: 'Unable to Verify', showPct: true },
  { key: 'dropped', label: 'Call Dropped', showPct: true },
  { key: 'inQueue', label: 'In Queue' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'inAuditorReview', label: 'In Auditor Review' },
];

function jitter(nonce: number, key: string): number {
  if (nonce === 0) return 0;
  let h = nonce * 131;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(h) % 3;
}

export function PartnerDayBreakdownCard() {
  const navigate = useNavigate();
  const [selectedPartners, setSelectedPartners] = useState<PartnerId[]>(PARTNERS.map((p) => p.id));
  const [dateMode, setDateMode] = useState<'today' | 'custom'>('today');
  const todayIso = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(todayIso);
  const [toDate, setToDate] = useState(todayIso);

  const range = useMemo(() => {
    if (dateMode === 'today') return undefined;
    const start = new Date(`${fromDate}T00:00:00`);
    const end = new Date(`${toDate}T23:59:59`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;
    return start <= end ? { start, end } : { start: end, end: start };
  }, [dateMode, fromDate, toDate]);

  return (
    <SectionCard
      title="Call Breakdown"
      subtitle="Today's calls by partner"
      bodyClassName="overflow-x-auto"
      headerRight={(
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
            <button
              type="button"
              onClick={() => setDateMode('today')}
              className={cn('px-2 py-1 text-xs rounded', dateMode === 'today' ? 'bg-primary text-white' : 'text-text-muted')}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDateMode('custom')}
              className={cn('px-2 py-1 text-xs rounded', dateMode === 'custom' ? 'bg-primary text-white' : 'text-text-muted')}
            >
              Custom
            </button>
          </div>
          {dateMode === 'custom' && (
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
          <PartnerMultiSelect value={selectedPartners} onChange={setSelectedPartners} />
        </div>
      )}
    >
      {({ nonce }) => {
        const base = getPartnerDayBreakdown({ range, partnerIds: selectedPartners }).filter((r) => r.partnerId !== 'TOTAL');
        const rows = base.map((r) => {
          if (range) return r;
          const dOngoing = jitter(nonce, `${r.partnerId}-ongoing`);
          const dQueue = jitter(nonce, `${r.partnerId}-queue`);
          return {
            ...r,
            ongoing: r.ongoing + dOngoing,
            inQueue: r.inQueue + dQueue,
            totalCalls: r.totalCalls + dOngoing + dQueue,
          };
        });

        const total: PartnerDayRow = {
          partnerId: 'TOTAL',
          partnerName: 'Total',
          totalCalls: rows.reduce((s, r) => s + r.totalCalls, 0),
          routedCalls: rows.reduce((s, r) => s + r.routedCalls, 0),
          answeredCalls: rows.reduce((s, r) => s + r.answeredCalls, 0),
          approved: rows.reduce((s, r) => s + r.approved, 0),
          rejected: rows.reduce((s, r) => s + r.rejected, 0),
          unable: rows.reduce((s, r) => s + r.unable, 0),
          dropped: rows.reduce((s, r) => s + r.dropped, 0),
          inQueue: rows.reduce((s, r) => s + r.inQueue, 0),
          ongoing: rows.reduce((s, r) => s + r.ongoing, 0),
          inAuditorReview: rows.reduce((s, r) => s + r.inAuditorReview, 0),
          avgWaitSec: 0,
          dropRate: 0,
          hotDrop: false,
        };
        total.avgWaitSec = total.answeredCalls > 0
          ? Math.round(rows.reduce((s, r) => s + r.avgWaitSec * r.answeredCalls, 0) / total.answeredCalls)
          : 0;
        total.dropRate = total.totalCalls > 0
          ? Math.round((total.dropped / total.totalCalls) * 1000) / 10
          : 0;
        total.hotDrop = total.dropRate > 5;

        const hotRows = rows.filter((r) => r.dropRate > 5);

        return (
          <div>
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr className="text-text-muted">
                  <th className="sticky left-0 z-10 bg-surface text-left font-medium pb-2 pr-3">Partner</th>
                  {COLUMNS.map((c) => (
                    <th key={c.key} className="text-right font-medium pb-2 px-3 whitespace-nowrap">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.partnerId}
                    className={cn('hover:bg-primary-soft/30', i % 2 === 1 && 'bg-bg/50')}
                    title={`View ${r.partnerName} in Partner Analytics`}
                  >
                    <td className={cn('sticky left-0 z-10 py-2 pr-3 font-medium border-t border-border', i % 2 === 1 ? 'bg-[#FBFAFE]' : 'bg-surface')}>
                      {r.partnerName}
                    </td>
                    {COLUMNS.map((c) => (
                      <td key={c.key} className={cn('text-right py-2 px-3 tabular-nums border-t border-border', c.key === 'dropped' && r.dropRate > 5 && 'text-danger font-semibold')}>
                        {c.key === 'totalCalls' ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/partners?partner=${r.partnerId}`)}
                            className="hover:underline text-primary font-medium"
                          >
                            {r.totalCalls.toLocaleString()}
                          </button>
                        ) : c.showPct ? (
                          <>
                            {(r[c.key] as number).toLocaleString()} <span className="text-text-muted">({r.totalCalls > 0 ? (((r[c.key] as number / r.totalCalls) * 100).toFixed(1)) : '0.0'}%)</span>
                          </>
                        ) : (
                          (r[c.key] as number).toLocaleString()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="font-semibold bg-primary-soft/40">
                  <td className="sticky left-0 z-10 bg-primary-soft/40 py-2 pr-3 border-t-2 border-border">{total.partnerName}</td>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className={cn('text-right py-2 px-3 tabular-nums border-t-2 border-border', c.key === 'dropped' && total.dropRate > 5 && 'text-danger')}>
                      {c.showPct
                        ? (
                          <>
                            {(total[c.key] as number).toLocaleString()} <span className="text-text-muted">({total.totalCalls > 0 ? (((total[c.key] as number / total.totalCalls) * 100).toFixed(1)) : '0.0'}%)</span>
                          </>
                        )
                        : (total[c.key] as number).toLocaleString()}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>

            {hotRows.length > 0 && (
              <div className="mt-3 px-3 py-2 rounded-lg border border-danger/30 bg-red-50 text-sm text-danger">
                {hotRows.map((r) => `⚠ High drop rate on ${r.partnerName} (${r.dropRate.toFixed(1)}%) — consider reallocating agents`).join(' · ')}
              </div>
            )}
          </div>
        );
      }}
    </SectionCard>
  );
}
