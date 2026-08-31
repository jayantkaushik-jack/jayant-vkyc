import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { agents } from '../../data';
import type { NonApprovedCaseRow } from '../../data/adminSelectors';
import type { PartnerId } from '../../data/types';
import {
  countActiveCriteria,
  DEFAULT_NON_APPROVED_CRITERIA,
  filterCases,
  getReasonOptionsForCategories,
  NON_APPROVED_STATUS_FILTER_OPTIONS,
  REASON_CATEGORY_OPTIONS,
  type NonApprovedCaseCriteria,
} from '../../data/nonApprovedCaseFilters';
import { PartnerMultiSelect } from '../ui/PartnerMultiSelect';
import { Card } from '../ui/Card';
import { StatusPill } from '../ui/StatusPill';
import { cn } from '../../lib/cn';
import { formatDateLabel, formatTimeLabel } from '../../lib/format';
import { maskStaffName } from '../../lib/maskStaff';
import type { NonApprovedStatus } from '../../data/adminSelectors';

const PAGE_SIZE = 25;

export interface NonApprovedCasesTableProps {
  cases: NonApprovedCaseRow[];
  criteria: NonApprovedCaseCriteria;
  onCriteriaChange: (next: NonApprovedCaseCriteria) => void;
  pageDateFrom: string;
  pageDateTo: string;
  variant: 'admin' | 'partner';
  renderActions?: (row: NonApprovedCaseRow) => React.ReactNode;
}

function displayedReason(row: NonApprovedCaseRow): string {
  return row.status === 'User Dropped' ? (row.call.dropStage ?? row.reason) : row.reason;
}

function statusPillVariant(status: NonApprovedStatus) {
  if (status === 'Rejected' || status === 'Auditor Rejected') return 'rejected' as const;
  if (status === 'Recapture' || status === 'Unable to Verify') return 'recapture' as const;
  return 'pending' as const;
}

export function NonApprovedCasesTable({
  cases,
  criteria,
  onCriteriaChange,
  pageDateFrom,
  pageDateTo,
  variant,
  renderActions,
}: NonApprovedCasesTableProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [reasonQuery, setReasonQuery] = useState('');
  const [agentQuery, setAgentQuery] = useState('');

  const maskAgents = variant === 'partner';
  const getAgentDisplayName = (row: NonApprovedCaseRow) =>
    maskAgents ? maskStaffName(row.agentId, 'agent') : row.agentName;

  const filteredCases = useMemo(
    () => filterCases(cases, criteria, {
      getAgentDisplayName,
      pageDateFrom,
      pageDateTo,
    }),
    [cases, criteria, getAgentDisplayName, pageDateFrom, pageDateTo],
  );

  const totalPages = Math.max(1, Math.ceil(filteredCases.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredCases.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const activeFilterCount = countActiveCriteria(criteria, pageDateFrom, pageDateTo);
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

  const agentOptions = useMemo(() => {
    const ids = Array.from(new Set(cases.map((c) => c.agentId))).sort();
    return ids.map((id) => {
      const agent = agents.find((a) => a.id === id);
      const label = maskAgents ? maskStaffName(id, 'agent') : (agent?.name ?? id);
      return { id, label };
    });
  }, [cases, maskAgents]);

  const filteredAgentOptions = useMemo(() => {
    const q = agentQuery.trim().toLowerCase();
    if (!q) return agentOptions;
    return agentOptions.filter((a) => a.label.toLowerCase().includes(q));
  }, [agentOptions, agentQuery]);

  const patchCriteria = (patch: Partial<NonApprovedCaseCriteria>) => {
    onCriteriaChange({ ...criteria, ...patch });
    setPage(1);
  };

  const clearAll = () => {
    onCriteriaChange({ ...DEFAULT_NON_APPROVED_CRITERIA });
    setPage(1);
    setReasonQuery('');
    setAgentQuery('');
  };

  const showFrom = filteredCases.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showTo = Math.min(safePage * PAGE_SIZE, filteredCases.length);

  return (
    <Card className="overflow-x-auto">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-text">Non-approved cases</h3>
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 pb-1">
            <FilterToggleGroup
              label="Status"
              options={NON_APPROVED_STATUS_FILTER_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
              value={criteria.statuses}
              onChange={(next) => patchCriteria({ statuses: next as NonApprovedStatus[] })}
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

            <SearchableMultiSelect
              label="Agent"
              placeholder="Search agents…"
              query={agentQuery}
              onQueryChange={setAgentQuery}
              options={filteredAgentOptions}
              value={criteria.agentIds}
              onChange={(next) => patchCriteria({ agentIds: next })}
            />

            {variant === 'admin' && (
              <div>
                <p className="text-xs text-text-muted mb-1">Partner</p>
                <PartnerMultiSelect
                  value={criteria.partnerIds}
                  onChange={(next) => patchCriteria({ partnerIds: next as PartnerId[] })}
                  className="w-full"
                />
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs text-text-muted">Date</p>
              <input
                type="date"
                value={criteria.customDateRange ? criteria.dateFrom : (criteria.dateFrom || pageDateFrom)}
                onChange={(e) => patchCriteria({
                  dateFrom: e.target.value,
                  customDateRange: true,
                })}
                className="w-full px-2 py-1 border border-border rounded text-xs"
              />
              <input
                type="date"
                value={criteria.customDateRange ? criteria.dateTo : (criteria.dateTo || pageDateTo)}
                onChange={(e) => patchCriteria({
                  dateTo: e.target.value,
                  customDateRange: true,
                })}
                className="w-full px-2 py-1 border border-border rounded text-xs"
              />
            </div>
          </div>
        )}

        <p className="text-xs text-text-muted">
          Showing {showFrom}–{showTo} of {filteredCases.length.toLocaleString()} cases
        </p>
      </div>

      <div className="overflow-x-auto px-5 pb-4">
        {variant === 'admin' ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted border-b border-border">
                <th className="pb-2 pr-2">Timestamp</th>
                <th className="pb-2 pr-2">App ID</th>
                <th className="pb-2 pr-2">Customer</th>
                <th className="pb-2 pr-2">Partner</th>
                <th className="pb-2 pr-2">Agent</th>
                <th className="pb-2 pr-2">Call Status</th>
                <th className="pb-2 pr-2">Agent Status</th>
                <th className="pb-2 pr-2">Auditor Decision</th>
                <th className="pb-2 pr-2">Reason Category</th>
                <th className="pb-2 pr-2">Reason</th>
                <th className="pb-2 pr-2">Auditor</th>
                {renderActions && <th className="pb-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id} className="border-b border-border/50">
                  <td className="py-2 pr-2 text-xs">{formatTimeLabel(row.timestamp)} {row.timestamp.slice(0, 10)}</td>
                  <td className="py-2 pr-2 font-mono text-xs">{row.appId}</td>
                  <td className="py-2 pr-2">{row.customerName}</td>
                  <td className="py-2 pr-2">{row.partnerName}</td>
                  <td className="py-2 pr-2">{row.agentName}</td>
                  <td className="py-2 pr-2">
                    <span
                      className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        backgroundColor: row.call.callStatus === 'Connected' ? '#E8F7EF' : '#EEF0F4',
                        color: row.call.callStatus === 'Connected' ? '#166534' : '#64748B',
                      }}
                    >
                      {row.call.callStatus}
                    </span>
                  </td>
                  <td className="py-2 pr-2">{row.call.callStatus === 'User Dropped' ? '—' : (row.call.agentStatus ?? '—')}</td>
                  <td className="py-2 pr-2">{row.call.agentStatus === 'Approved' ? (row.call.auditorDecision ?? '—') : '—'}</td>
                  <td className="py-2 pr-2">{row.reasonCategory}</td>
                  <td className="py-2 pr-2 max-w-[220px] truncate" title={row.remarks || undefined}>
                    <span
                      className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        backgroundColor: row.reasonDecision === 'rejected' ? '#FEE2E2' : row.reasonDecision === 'unable' ? '#FEF3C7' : '#E2E8F0',
                        color: row.reasonDecision === 'rejected' ? '#B42318' : row.reasonDecision === 'unable' ? '#92400E' : '#475569',
                      }}
                    >
                      {displayedReason(row)}
                    </span>
                  </td>
                  <td className="py-2 pr-2">{row.auditorName}</td>
                  {renderActions && <td className="py-2 text-xs">{renderActions(row)}</td>}
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={renderActions ? 12 : 11} className="py-8 text-center text-text-muted">
                    {hasActiveFilters ? (
                      <span>
                        No cases match your filters.{' '}
                        <button type="button" onClick={clearAll} className="text-primary hover:underline">
                          Clear all
                        </button>
                      </span>
                    ) : 'No non-approved cases in this range.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted border-b border-border">
                <th className="pb-2 pr-2">Date</th>
                <th className="pb-2 pr-2">App ID</th>
                <th className="pb-2 pr-2">Customer</th>
                <th className="pb-2 pr-2">Agent</th>
                <th className="pb-2 pr-2">Status</th>
                <th className="pb-2 pr-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id} className="border-b border-border/50">
                  <td className="py-2 pr-2 whitespace-nowrap text-text-muted">{formatDateLabel(row.timestamp)}</td>
                  <td className="py-2 pr-2 font-mono text-xs">{row.appId}</td>
                  <td className="py-2 pr-2 text-text">{row.customerName}</td>
                  <td className="py-2 pr-2 text-text-muted">{getAgentDisplayName(row)}</td>
                  <td className="py-2 pr-2">
                    <StatusPill label={row.status} variant={statusPillVariant(row.status)} />
                  </td>
                  <td className="py-2 pr-2 text-text-muted max-w-[280px] truncate" title={displayedReason(row)}>
                    {displayedReason(row)}
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted">
                    {hasActiveFilters ? (
                      <span>
                        No cases match your filters.{' '}
                        <button type="button" onClick={clearAll} className="text-primary hover:underline">
                          Clear all
                        </button>
                      </span>
                    ) : 'No non-approved cases in this range.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
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
  );
}

function FilterToggleGroup({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
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
              disabled={disabled}
              onClick={() => onChange(toggleInList(value, o.id))}
              className={cn(
                'px-2 py-1 rounded-full text-xs border',
                disabled
                  ? 'opacity-40 cursor-not-allowed border-border'
                  : (on ? 'bg-primary text-white border-primary' : 'border-border'),
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

function toggleInList(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
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
                onClick={() => onChange(toggleInList(value, o.id))}
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
