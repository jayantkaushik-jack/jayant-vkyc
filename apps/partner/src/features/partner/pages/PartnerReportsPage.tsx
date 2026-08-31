import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ChevronDown, Clock, Download, Eye, Mail, Plus, Send, X,
} from 'lucide-react';
import {
  REPORT_CATALOG,
  buildReportCsv,
  getCatalogEntry,
  type ReportFilters,
  type ReportResult,
  type ReportType,
} from '@vkyc/shared/data/reportGenerators';
import { getDateRangeFromPreset } from '@vkyc/shared/data/selectors';
import { Card } from '@vkyc/shared/components/ui/Card';
import { Button } from '@vkyc/shared/components/ui/Button';
import { Modal, ModalFooter } from '@vkyc/shared/components/ui/Modal';
import {
  type AgentStatusLevel,
  type AuditorStatusLevel,
  type CallStatusLevel,
  type DateRangePreset,
} from '@vkyc/shared/data/types';
import { maskStaffName } from '@vkyc/shared/lib/maskStaff';
import { cn } from '@vkyc/shared/lib/cn';
import { usePartnerScope } from '@partner/features/partner/PartnerScopeContext';
import { usePartnerReportService } from '@partner/features/partner/partnerReportService';
import {
  PARTNER_REPORT_TYPES,
  addHistoryEntry,
  addSchedule,
  buildPartnerParamsSummary,
  getReportHistoryPage,
  getSchedules,
  sendNow,
  toggleSchedule,
  useReportSession,
  type ReportHistoryEntry,
  type ReportSchedule,
} from '@partner/features/partner/reportStore';

const PAGE_SIZE = 10;

const DATE_PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
];

const AGENT_NAME_COLUMNS = new Set(['Agent Name', 'Agent', 'Agent ID']);
const AUDITOR_NAME_COLUMNS = new Set(['Auditor', 'Auditor Name', 'Auditor ID']);

function maskRows(columns: string[], rows: Record<string, string | number>[]) {
  return rows.map((row) => {
    const next = { ...row };
    for (const col of columns) {
      const val = row[col];
      if (val == null || val === '' || val === '—') continue;
      if (AGENT_NAME_COLUMNS.has(col)) next[col] = maskStaffName(String(val), 'agent');
      else if (AUDITOR_NAME_COLUMNS.has(col)) next[col] = maskStaffName(String(val), 'auditor');
    }
    return next;
  });
}

function maskResult(result: ReportResult): ReportResult {
  return {
    columns: result.columns,
    rows: maskRows(result.columns, result.rows),
    sections: result.sections?.map((s) => ({ ...s, rows: maskRows(s.columns, s.rows) })),
  };
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getPageItems(current: number, total: number): Array<number | '...'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: Array<number | '...'> = [1];
  if (current > 3) items.push('...');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) items.push(i);
  if (current < total - 2) items.push('...');
  items.push(total);
  return items;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function PartnerReportsPage() {
  useReportSession();
  const { partner } = usePartnerScope();
  const reportService = usePartnerReportService();
  const [page, setPage] = useState(1);
  const [selectedType, setSelectedType] = useState<ReportType | ''>('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [scheduleModalType, setScheduleModalType] = useState<ReportType | null>(null);
  const [previewEntry, setPreviewEntry] = useState<ReportHistoryEntry | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const catalog = useMemo(() => REPORT_CATALOG.filter((r) => PARTNER_REPORT_TYPES.includes(r.id)), []);
  const history = getReportHistoryPage(page, PAGE_SIZE, reportService.partnerId);
  const schedules = getSchedules();
  const selectedCatalog = selectedType ? getCatalogEntry(selectedType) : null;

  const handleSendNow = (schedule: ReportSchedule) => {
    const updated = sendNow(schedule.id);
    if (updated) {
      setToast(`${updated.reportLabel} sent to ${updated.recipients.length} recipient${updated.recipients.length === 1 ? '' : 's'}.`);
    }
  };

  const handleDownload = (entry: ReportHistoryEntry) => {
    const result = maskResult(reportService.generateReport(entry.reportType, entry.filters));
    downloadCsv(buildReportCsv(result), `${entry.requestId}.csv`);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-text">Reports</h1>
        <p className="text-sm text-text-muted mt-1">{partner.name} — generate, preview and schedule your VKYC reports. Staff identities are masked.</p>
      </div>

      <Card className="space-y-4 max-w-2xl">
        <h2 className="font-semibold text-sm">Generate Report</h2>
        <div>
          <label className="block text-xs text-text-muted mb-1">Report Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ReportType | '')}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface"
          >
            <option value="">Select a report type…</option>
            {catalog.map((r) => (
              <option key={r.id} value={r.id}>{r.name} — {r.description}</option>
            ))}
          </select>
          {selectedCatalog && <p className="text-xs text-text-muted mt-2">{selectedCatalog.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button disabled={!selectedType} onClick={() => setFiltersOpen(true)}>Generate</Button>
          <Button
            variant="secondary"
            disabled={!selectedType}
            onClick={() => selectedType && setScheduleModalType(selectedType)}
          >
            <Clock size={14} /> Schedule
          </Button>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-semibold text-sm">Request History</h2>
          <p className="text-xs text-text-muted">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, history.total)} of {history.total.toLocaleString()} Records
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b border-border">
              <th className="pb-2 pr-3">Request ID</th>
              <th className="pb-2 pr-3">Report</th>
              <th className="pb-2 pr-3">Params</th>
              <th className="pb-2 pr-3">Requested At</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {history.rows.map((row) => (
              <tr
                key={row.requestId}
                className={cn('border-b border-border/50', highlightId === row.requestId && 'bg-primary-soft/40')}
              >
                <td className="py-2 pr-3 font-mono text-xs">{row.requestId}</td>
                <td className="py-2 pr-3">{row.reportLabel}</td>
                <td className="py-2 pr-3 text-xs text-text-muted max-w-[280px] truncate" title={row.paramsSummary}>
                  {row.paramsSummary}
                </td>
                <td className="py-2 pr-3 text-xs">{row.requestTime.slice(0, 16).replace('T', ' ')}</td>
                <td className="py-2 pr-3 text-success">{row.status}</td>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-primary hover:text-primary-hover inline-flex items-center gap-1"
                      onClick={() => setPreviewEntry(row)}
                    >
                      <Eye size={15} /> Preview
                    </button>
                    <button
                      type="button"
                      className="text-primary hover:text-primary-hover"
                      title="Download CSV"
                      onClick={() => handleDownload(row)}
                    >
                      <Download size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-end gap-1 text-sm mt-4">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 border rounded disabled:opacity-40">‹</button>
          {getPageItems(history.page, history.totalPages).map((item, idx) => (
            item === '...'
              ? <span key={`ellipsis-${idx}`} className="px-2 text-text-muted">…</span>
              : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={cn('w-8 h-8 border rounded', item === page ? 'bg-primary text-white border-primary' : 'border-border')}
                >
                  {item}
                </button>
              )
          ))}
          <button type="button" disabled={page >= history.totalPages} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 border rounded disabled:opacity-40">›</button>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-sm mb-3">Email Schedules</h2>
        <div className="space-y-2">
          {schedules.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 p-3 border border-border rounded-lg flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-medium">{s.reportLabel}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {s.cadence} · {s.recipients.length} recipient{s.recipients.length === 1 ? '' : 's'}
                </p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Last sent: {s.lastSent ? new Date(s.lastSent).toLocaleString('en-IN') : 'Never'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Toggle checked={s.enabled} onChange={() => toggleSchedule(s.id)} />
                <Button size="sm" variant="secondary" disabled={!s.enabled} onClick={() => handleSendNow(s)}>
                  <Send size={14} /> Send now
                </Button>
              </div>
            </div>
          ))}
          {schedules.length === 0 && (
            <p className="text-sm text-text-muted py-6 text-center">No schedules configured yet — use “Schedule” after selecting a report type.</p>
          )}
        </div>
      </Card>

      {filtersOpen && selectedType && (
        <GenerateFiltersModal
          reportType={selectedType}
          onClose={() => setFiltersOpen(false)}
          onGenerated={(requestId) => {
            setFiltersOpen(false);
            setPage(1);
            setHighlightId(requestId);
          }}
        />
      )}

      {scheduleModalType && (
        <ScheduleModal
          reportType={scheduleModalType}
          onClose={() => setScheduleModalType(null)}
          onSaved={(msg) => { setScheduleModalType(null); setToast(msg); }}
        />
      )}

      {previewEntry && <ReportPreviewDrawer entry={previewEntry} onClose={() => setPreviewEntry(null)} />}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] px-4 py-3 bg-surface border border-border shadow-card rounded-lg text-sm max-w-sm">
          {toast}
        </div>
      )}
    </div>
  );
}

function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
  hint,
}: {
  label: string;
  options: T[];
  value: T[];
  onChange: (next: T[]) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <button
              key={o}
              type="button"
              disabled={disabled}
              onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs border',
                disabled
                  ? 'opacity-40 cursor-not-allowed border-border'
                  : (on ? 'bg-primary text-white border-primary' : 'border-border hover:bg-primary-soft'),
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
      {disabled && hint && <p className="text-[11px] text-text-muted mt-1 italic">{hint}</p>}
    </div>
  );
}

function GenerateFiltersModal({
  reportType,
  onClose,
  onGenerated,
}: {
  reportType: ReportType;
  onClose: () => void;
  onGenerated: (requestId: string) => void;
}) {
  const reportService = usePartnerReportService();
  const catalog = getCatalogEntry(reportType);
  const [filters, setFilters] = useState<ReportFilters>(() => reportService.defaultFilters(reportType));
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [rowCount, setRowCount] = useState<number | null>(null);

  const droppedOnly = filters.callStatuses.length > 0 && filters.callStatuses.every((s) => s === 'User Dropped');
  const agentNonApprovedSelected = filters.agentStatuses.some((s) => s !== 'Approved');
  const auditorDisabled = droppedOnly || agentNonApprovedSelected;

  // Partner scope is always forced at the service layer.
  const scopedFilters = useMemo<ReportFilters>(() => reportService.scopeFilters(filters), [filters, reportService]);

  useEffect(() => {
    if (droppedOnly && (filters.agentStatuses.length > 0 || filters.auditorDecisions.length > 0)) {
      setFilters((f) => ({ ...f, agentStatuses: [], auditorDecisions: [] }));
    }
  }, [droppedOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!droppedOnly && agentNonApprovedSelected && filters.auditorDecisions.length > 0) {
      setFilters((f) => ({ ...f, auditorDecisions: [] }));
    }
  }, [agentNonApprovedSelected, droppedOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => {
      const result = reportService.generateReport(reportType, scopedFilters);
      setRowCount(result.rows.length);
    }, 300);
    return () => clearTimeout(timer);
  }, [reportType, scopedFilters]);

  const applyPreset = (preset: DateRangePreset) => {
    const range = getDateRangeFromPreset(preset);
    setFilters((f) => ({ ...f, datePreset: preset, dateFrom: toDateStr(range.start), dateTo: toDateStr(range.end) }));
  };

  const setCustomDate = (field: 'dateFrom' | 'dateTo', value: string) => {
    setFilters((f) => ({ ...f, datePreset: 'custom', [field]: value }));
  };

  const toggleAllColumns = (select: boolean) => {
    setFilters((f) => ({ ...f, columns: select ? [...catalog.allColumns] : [] }));
  };

  const resetFilters = () => setFilters(reportService.defaultFilters(reportType));

  const handleGenerate = () => {
    const result = reportService.generateReport(reportType, scopedFilters);
    const paramsSummary = buildPartnerParamsSummary(reportType, scopedFilters);
    const entry = addHistoryEntry({
      reportType,
      startDate: scopedFilters.dateFrom,
      endDate: scopedFilters.dateTo,
      paramsSummary,
      filters: scopedFilters,
      rowCount: result.rows.length,
    });
    onGenerated(entry.requestId);
  };

  const zeroMatches = rowCount === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[640px] max-h-[80vh] bg-surface rounded-xl border border-border shadow-card flex flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border bg-surface rounded-t-xl">
          <h2 className="text-base font-semibold">Generate — {catalog.name}</h2>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text p-1 rounded-lg hover:bg-primary-soft">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <p className="text-xs text-text-muted mb-1">Date Range</p>
            <div className="flex flex-wrap items-center gap-2">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs border',
                    filters.datePreset === p.id ? 'bg-primary text-white border-primary' : 'border-border hover:bg-primary-soft',
                  )}
                >
                  {p.label}
                </button>
              ))}
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setCustomDate('dateFrom', e.target.value)}
                className="px-2 py-1 border border-border rounded text-xs"
              />
              <span className="text-xs text-text-muted">to</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setCustomDate('dateTo', e.target.value)}
                className="px-2 py-1 border border-border rounded text-xs"
              />
            </div>
          </div>

          {catalog.filters.status && (
            <div className="grid grid-cols-1 gap-4 pt-4 border-t border-border">
              <ToggleGroup<CallStatusLevel>
                label="Call Status"
                options={['Connected', 'User Dropped']}
                value={filters.callStatuses}
                onChange={(next) => setFilters((f) => ({ ...f, callStatuses: next }))}
              />
              <ToggleGroup<AgentStatusLevel>
                label="Agent Status"
                options={['Approved', 'Unable to Verify', 'Rejected']}
                value={filters.agentStatuses}
                onChange={(next) => setFilters((f) => ({ ...f, agentStatuses: next }))}
                disabled={droppedOnly}
                hint="Not applicable for dropped calls"
              />
              <ToggleGroup<AuditorStatusLevel>
                label="Auditor Decision"
                options={['Approved', 'Recapture', 'Rejected', 'In Review']}
                value={filters.auditorDecisions}
                onChange={(next) => setFilters((f) => ({ ...f, auditorDecisions: next }))}
                disabled={auditorDisabled}
                hint={droppedOnly ? 'Not applicable for dropped calls' : 'Only applicable when Agent Status is Approved'}
              />
            </div>
          )}

          {catalog.filters.columns && (
            <div className="pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setColumnsOpen((o) => !o)}
                className="flex items-center gap-1.5 text-sm font-medium"
              >
                <ChevronDown size={16} className={cn('transition-transform', columnsOpen && 'rotate-180')} />
                Columns
                <span className="text-xs text-text-muted font-normal">
                  ({filters.columns.length}/{catalog.allColumns.length} selected)
                </span>
              </button>
              {columnsOpen && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-3 text-xs">
                    <button type="button" className="text-primary hover:underline" onClick={() => toggleAllColumns(true)}>Select all</button>
                    <button type="button" className="text-primary hover:underline" onClick={() => toggleAllColumns(false)}>Select none</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto text-xs pr-2">
                    {catalog.allColumns.map((col) => (
                      <label key={col} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filters.columns.includes(col)}
                          onChange={(e) => {
                            setFilters((f) => ({
                              ...f,
                              columns: e.target.checked ? [...f.columns, col] : f.columns.filter((c) => c !== col),
                            }));
                          }}
                        />
                        <span className="truncate">{col}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={cn('rounded-lg border px-3 py-2.5', zeroMatches ? 'border-warning/50 bg-amber-50/40' : 'border-border')}>
            {rowCount === null ? (
              <p className="text-sm text-text-muted">Calculating matching rows…</p>
            ) : zeroMatches ? (
              <p className="text-sm text-warning flex items-center gap-1.5">
                <AlertTriangle size={15} /> No rows match your filters — adjust filters to generate a report.
              </p>
            ) : (
              <p className="text-sm">
                <span className="font-semibold">{rowCount.toLocaleString()}</span> rows match your filters
              </p>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-t border-border bg-surface rounded-b-xl">
          <button type="button" onClick={resetFilters} className="text-sm text-primary hover:underline">Reset filters</button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={zeroMatches || rowCount === null}>Generate Report</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn('w-10 h-5 rounded-full transition-colors relative shrink-0', checked ? 'bg-success' : 'bg-gray-300')}
    >
      <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform', checked ? 'left-5' : 'left-0.5')} />
    </button>
  );
}

function ScheduleModal({
  reportType,
  onClose,
  onSaved,
}: {
  reportType: ReportType;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const catalog = getCatalogEntry(reportType);
  const [cadenceType, setCadenceType] = useState<'daily' | 'weekly'>('daily');
  const [time, setTime] = useState('09:00');
  const [weekday, setWeekday] = useState('Monday');
  const [recipients, setRecipients] = useState<string[]>(['ops@partner.com']);
  const [recipientInput, setRecipientInput] = useState('');

  const addRecipient = () => {
    const v = recipientInput.trim();
    if (v && !recipients.includes(v)) setRecipients((r) => [...r, v]);
    setRecipientInput('');
  };

  const save = () => {
    if (recipients.length === 0) return;
    const cadence = cadenceType === 'daily' ? `Daily at ${time}` : `Weekly on ${weekday} at ${time}`;
    const schedule = addSchedule({ reportType, cadence, recipients });
    onSaved(`Schedule created — ${schedule.reportLabel}, ${schedule.cadence.toLowerCase()}.`);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Schedule — ${catalog.name}`}
      size="md"
      footer={<ModalFooter onCancel={onClose} onConfirm={save} confirmLabel="Save Schedule" />}
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs text-text-muted mb-1">Cadence</p>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={cadenceType}
              onChange={(e) => setCadenceType(e.target.value as 'daily' | 'weekly')}
              className="px-2 py-1.5 border border-border rounded text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
            {cadenceType === 'weekly' && (
              <select value={weekday} onChange={(e) => setWeekday(e.target.value)} className="px-2 py-1.5 border border-border rounded text-sm">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
            <span className="text-xs text-text-muted">at</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="px-2 py-1.5 border border-border rounded text-sm" />
          </div>
        </div>

        <div>
          <p className="text-xs text-text-muted mb-1">Recipients</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {recipients.map((r) => (
              <span key={r} className="inline-flex items-center gap-1 px-2 py-1 bg-primary-soft text-primary rounded text-xs">
                <Mail size={11} /> {r}
                <button type="button" onClick={() => setRecipients((rs) => rs.filter((x) => x !== r))}>
                  <X size={12} />
                </button>
              </span>
            ))}
            {recipients.length === 0 && <span className="text-xs text-danger">Add at least one recipient.</span>}
          </div>
          <div className="flex gap-2">
            <input
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRecipient(); } }}
              placeholder="name@company.com"
              className="flex-1 px-2 py-1.5 border border-border rounded text-sm"
            />
            <Button size="sm" variant="secondary" onClick={addRecipient}><Plus size={14} /></Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function PreviewTable({ columns, rows }: { columns: string[]; rows: Record<string, string | number>[] }) {
  const visible = rows.slice(0, 200);
  return (
    <div className="overflow-x-auto border border-border rounded-lg">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-text-muted bg-bg/60 border-b border-border">
            {columns.map((c) => <th key={c} className="px-3 py-2 whitespace-nowrap">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {visible.map((row, i) => (
            <tr key={i} className="border-b border-border/50">
              {columns.map((c) => <td key={c} className="px-3 py-1.5 whitespace-nowrap">{row[c] ?? ''}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 200 && (
        <p className="text-[11px] text-text-muted px-3 py-2">
          Showing first 200 of {rows.length.toLocaleString()} rows — download the CSV for the full export.
        </p>
      )}
    </div>
  );
}

function ReportPreviewDrawer({ entry, onClose }: { entry: ReportHistoryEntry; onClose: () => void }) {
  const reportService = usePartnerReportService();
  const result = useMemo(
    () => maskResult(reportService.generateReport(entry.reportType, entry.filters)),
    [entry, reportService],
  );
  const download = () => downloadCsv(buildReportCsv(result), `${entry.requestId}.csv`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[95vw] lg:max-w-[1200px] max-h-[88vh] bg-surface rounded-xl border border-border shadow-card flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold">{entry.reportLabel} — Preview</h2>
            <p className="text-xs text-text-muted mt-0.5">
              {entry.paramsSummary} · {result.rows.length.toLocaleString()} row{result.rows.length === 1 ? '' : 's'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text p-1 rounded-lg hover:bg-primary-soft">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto px-5 py-4 space-y-6">
          {result.sections && result.sections.length > 0 ? (
            result.sections.map((section, idx) => (
              <div key={idx}>
                <h3 className="text-sm font-semibold mb-2">{section.title}</h3>
                <PreviewTable columns={section.columns} rows={section.rows} />
              </div>
            ))
          ) : result.rows.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-10">No rows match this report&apos;s filters.</p>
          ) : (
            <PreviewTable columns={result.columns} rows={result.rows} />
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={download}><Download size={14} /> Download CSV</Button>
        </div>
      </div>
    </div>
  );
}
