import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Card } from '@vkyc/shared/components/ui/Card';
import { StatCard } from '@vkyc/shared/components/ui/StatCard';
import { StatusPill } from '@vkyc/shared/components/ui/StatusPill';
import { formatDateLabel, formatHoursMinutes, formatTimeLabel } from '@vkyc/shared/lib/format';
import { cn } from '@vkyc/shared/lib/cn';
import { auditorAttendance } from '@vkyc/shared/data';
import { getAuditorAttendance, getDateRangeFromPreset } from '@vkyc/shared/data/selectors';
import {
  countDecisionCriteria,
  DEFAULT_DECISION_CRITERIA,
  DECISION_FILTER_OPTIONS,
  filterDecisions,
  getReasonOptionsForCategories,
  REASON_CATEGORY_OPTIONS,
  type AuditorDecisionCriteria,
} from '@vkyc/shared/data';
import {
  SEED_AUDITOR,
  getAuditorDecisionHistory,
  getPendingQueue,
  useAuditorSession,
  type AuditorReviewDecision,
} from '@vkyc/shared/data/auditorStore';

const PAGE_SIZE = 25;
const PAGE_DATE_RANGE = getDateRangeFromPreset('30d');
const PAGE_DATE_FROM = PAGE_DATE_RANGE.start.toISOString().slice(0, 10);
const PAGE_DATE_TO = PAGE_DATE_RANGE.end.toISOString().slice(0, 10);

const DECISION_COLORS: Record<AuditorReviewDecision, string> = {
  Approved: '#22A06B',
  Recapture: '#F5A623',
  Rejected: '#E5484D',
};

function decisionPill(decision: AuditorReviewDecision) {
  if (decision === 'Approved') return <StatusPill label="Approved" variant="accepted" />;
  if (decision === 'Recapture') return <StatusPill label="Recapture" variant="recapture" />;
  return <StatusPill label="Rejected" variant="rejected" />;
}

export function AuditorAnalyticsPage() {
  const session = useAuditorSession();
  const [criteria, setCriteria] = useState<AuditorDecisionCriteria>(DEFAULT_DECISION_CRITERIA);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [reasonQuery, setReasonQuery] = useState('');

  const history = useMemo(
    () => getAuditorDecisionHistory(SEED_AUDITOR.id),
    [session],
  );
  const pendingCount = getPendingQueue().length;

  const filteredDecisions = useMemo(
    () => filterDecisions(history, criteria, { pageDateFrom: PAGE_DATE_FROM, pageDateTo: PAGE_DATE_TO }),
    [history, criteria],
  );

  const totalPages = Math.max(1, Math.ceil(filteredDecisions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredDecisions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const activeFilterCount = countDecisionCriteria(criteria, PAGE_DATE_FROM, PAGE_DATE_TO);
  const hasActiveFilters = activeFilterCount > 0 || criteria.search.trim().length > 0;

  const reasonOptions = useMemo(
    () => getReasonOptionsForCategories(criteria.reasonCategories),
    [criteria.reasonCategories],
  );
  const filteredReasonOptions = useMemo(() => {
    const q = reasonQuery.trim().toLowerCase();
    if (!q) return reasonOptions;
    return reasonOptions.filter((r) => r.toLowerCase().includes(q));
  }, [reasonOptions, reasonQuery]);

  const patchCriteria = (patch: Partial<AuditorDecisionCriteria>) => {
    setCriteria((c) => ({ ...c, ...patch }));
    setPage(1);
  };

  const clearAll = () => {
    setCriteria(DEFAULT_DECISION_CRITERIA);
    setPage(1);
    setReasonQuery('');
  };

  const attendanceRows = useMemo(
    () => getAuditorAttendance(auditorAttendance, SEED_AUDITOR.id, getDateRangeFromPreset('30d')),
    [],
  );
  const avgHoursOnline = attendanceRows.length > 0
    ? attendanceRows.reduce((s, r) => s + r.totalOnlineMin, 0) / attendanceRows.length / 60
    : 0;
  const avgBreakMin = attendanceRows.length > 0
    ? attendanceRows.reduce((s, r) => s + r.totalBreakMin, 0) / attendanceRows.length
    : 0;

  const reviewed = history.length;
  const approved = history.filter((d) => d.decision === 'Approved').length;
  const recapture = history.filter((d) => d.decision === 'Recapture').length;
  const rejected = history.filter((d) => d.decision === 'Rejected').length;

  const decidedTimes = history.map((d) => d.decisionTimeSec).filter((v): v is number => v != null);
  const avgDecisionSec = decidedTimes.length
    ? Math.round(decidedTimes.reduce((a, b) => a + b, 0) / decidedTimes.length)
    : null;

  const byDay = useMemo(() => {
    const map = new Map<string, { date: string; Approved: number; Recapture: number; Rejected: number }>();
    for (const d of history) {
      const key = d.decidedAt.slice(0, 10);
      const row = map.get(key) ?? { date: key, Approved: 0, Recapture: 0, Rejected: 0 };
      row[d.decision] += 1;
      map.set(key, row);
    }
    return Array.from(map.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)
      .map((r) => ({
        ...r,
        label: new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      }));
  }, [history]);

  const showFrom = filteredDecisions.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showTo = Math.min(safePage * PAGE_SIZE, filteredDecisions.length);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text">Analytics</h1>
        <p className="text-sm text-text-muted mt-0.5">Your audit decisions and throughput.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard label="Cases Reviewed" value={reviewed} />
        <StatCard label="Approved" value={approved} />
        <StatCard label="Recapture" value={recapture} />
        <StatCard label="Rejected" value={rejected} />
        <StatCard
          label="Avg Decision Time"
          value={avgDecisionSec != null ? `${Math.floor(avgDecisionSec / 60)}m ${avgDecisionSec % 60}s` : '—'}
          tooltip="Average time spent per case decided in this session."
        />
        <StatCard
          label="Avg Hours Online"
          value={avgHoursOnline > 0 ? `${avgHoursOnline.toFixed(1)}h` : '—'}
          tooltip="Average daily online hours over the last 30 days."
        />
        <StatCard
          label="Avg Break Time"
          value={avgBreakMin > 0 ? formatHoursMinutes(Math.round(avgBreakMin * 60)) : '—'}
          tooltip="Average daily break time over the last 30 days."
        />
        <StatCard label="Pending Queue" value={pendingCount} />
      </div>

      <Card>
        <h3 className="text-sm font-semibold text-text mb-4">Decisions over time</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={byDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EBE8F2" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Approved" stackId="d" fill={DECISION_COLORS.Approved} />
            <Bar dataKey="Recapture" stackId="d" fill={DECISION_COLORS.Recapture} />
            <Bar dataKey="Rejected" stackId="d" fill={DECISION_COLORS.Rejected} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {/* Approval-rate trend removed: redundant with the stacked chart above and incentivizes the wrong metric for audit work. */}
      </Card>

      <Card padding={false}>
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text">Recent decisions</h3>
        </div>

        <div className="px-5 pt-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <input
                type="search"
                placeholder="Search name, App ID, agent, reason…"
                value={criteria.search}
                onChange={(e) => patchCriteria({ search: e.target.value })}
                className="w-full pl-9 pr-8 py-1.5 border border-border rounded-lg text-sm"
              />
              {criteria.search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => patchCriteria({ search: '' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="px-3 py-1.5 border border-border rounded-lg text-sm"
            >
              Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </button>

            {hasActiveFilters && (
              <button type="button" onClick={clearAll} className="text-xs text-primary hover:underline">
                Clear all
              </button>
            )}

            {criteria.customDateRange && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-soft text-primary border border-primary/20">
                custom range
              </span>
            )}
          </div>

          {filtersOpen && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 pb-1">
              <FilterToggleGroup
                label="Decision"
                options={DECISION_FILTER_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
                value={criteria.decisions}
                onChange={(next) => patchCriteria({ decisions: next as AuditorReviewDecision[] })}
              />
              <FilterToggleGroup
                label="Reason Category"
                options={REASON_CATEGORY_OPTIONS.map((c) => ({ id: c, label: c }))}
                value={criteria.reasonCategories}
                onChange={(next) => {
                  const validReasons = getReasonOptionsForCategories(next);
                  const validSet = new Set(validReasons.map((r) => r.toLowerCase()));
                  const prunedReasons = criteria.reasons.filter((r) => validSet.has(r.toLowerCase()));
                  patchCriteria({ reasonCategories: next, reasons: prunedReasons });
                }}
              />
              <SearchableMultiSelect
                label="Reason"
                placeholder={criteria.reasonCategories.length === 0 ? 'Select categories first' : 'Search reasons…'}
                disabled={criteria.reasonCategories.length === 0}
                query={reasonQuery}
                onQueryChange={setReasonQuery}
                options={filteredReasonOptions.map((r) => ({ id: r, label: r }))}
                value={criteria.reasons}
                onChange={(next) => patchCriteria({ reasons: next })}
              />
              <div className="space-y-1">
                <p className="text-xs text-text-muted">Date</p>
                <input
                  type="date"
                  value={criteria.customDateRange ? criteria.dateFrom : (criteria.dateFrom || PAGE_DATE_FROM)}
                  onChange={(e) => patchCriteria({ dateFrom: e.target.value, customDateRange: true })}
                  className="w-full px-2 py-1 border border-border rounded text-xs"
                />
                <input
                  type="date"
                  value={criteria.customDateRange ? criteria.dateTo : (criteria.dateTo || PAGE_DATE_TO)}
                  onChange={(e) => patchCriteria({ dateTo: e.target.value, customDateRange: true })}
                  className="w-full px-2 py-1 border border-border rounded text-xs"
                />
              </div>
            </div>
          )}

          <p className="text-xs text-text-muted">
            Showing {showFrom}–{showTo} of {filteredDecisions.length.toLocaleString()} decisions
          </p>
        </div>

        <div className="overflow-x-auto px-5 pb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted border-b border-border">
                <th className="px-0 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">App ID</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">Decision</th>
                <th className="px-4 py-3 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((d, i) => (
                <tr key={`${d.call.id}-${i}`} className="border-b border-border last:border-0">
                  <td className="py-3 whitespace-nowrap text-text-muted">
                    {formatDateLabel(d.decidedAt)}, {formatTimeLabel(d.decidedAt)}
                    {d.live && <span className="ml-2 text-[10px] text-primary font-medium">NEW</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{d.customer.appId}</td>
                  <td className="px-4 py-3 text-text">{d.customer.name}</td>
                  <td className="px-4 py-3 text-text-muted">{d.agent.name}</td>
                  <td className="px-4 py-3">{decisionPill(d.decision)}</td>
                  <td className="px-4 py-3 text-text-muted max-w-[280px] truncate" title={d.reason ?? ''}>
                    {d.reason ?? '—'}
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-muted">
                    {hasActiveFilters ? (
                      <span>
                        No decisions match your filters.{' '}
                        <button type="button" onClick={clearAll} className="text-primary hover:underline">
                          Clear all
                        </button>
                      </span>
                    ) : 'No decisions yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 pb-4">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 border rounded text-sm disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs text-text-muted">Page {safePage} of {totalPages}</span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1 border rounded text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </Card>
    </div>
  );
}

function FilterToggleGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div>
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(on ? value.filter((v) => v !== o.id) : [...value, o.id])}
              className={cn(
                'px-2 py-1 rounded-full text-xs border',
                on ? 'bg-primary text-white border-primary' : 'border-border',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SearchableMultiSelect({
  label,
  placeholder,
  query,
  onQueryChange,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  placeholder: string;
  query: string;
  onQueryChange: (q: string) => void;
  options: Array<{ id: string; label: string }>;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {value.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-primary-soft text-primary border border-primary/20">
              <span className="max-w-[120px] truncate" title={v}>{v}</span>
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => onChange(value.filter((x) => x !== v))}
                className="hover:text-text"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="search"
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => { onQueryChange(e.target.value); setOpen(true); }}
        className="w-full px-2 py-1.5 border border-border rounded text-xs disabled:opacity-50"
      />
      {open && !disabled && options.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-40 overflow-y-auto rounded border border-border bg-white shadow-sm text-xs">
          {options.map((o) => {
            const selected = value.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onChange(selected ? value.filter((x) => x !== o.id) : [...value, o.id])}
                className={cn(
                  'w-full text-left px-2 py-1.5 hover:bg-primary-soft/40 truncate',
                  selected && 'bg-primary-soft/30 text-primary',
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
