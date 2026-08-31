import { useSyncExternalStore } from 'react';
import {
  REPORT_CATALOG,
  getCatalogEntry,
  type ReportFilters,
  type ReportType,
} from '@vkyc/shared/data/reportGenerators';
import { defaultPartnerReportFilters } from '@partner/features/partner/partnerReportService';
import type { PartnerId } from '@vkyc/shared/data/types';

/**
 * Partner-scoped report session store. Mirrors the admin report store's shape
 * (session history + schedules layered on a deterministic filler backlog) but
 * only ever surfaces the report types partners are allowed to run, and never
 * exposes a partner scope (the whole app is implicitly one partner).
 */

export const PARTNER_REPORT_TYPES: ReportType[] = ['standard_mis', 'partner_daywise', 'customer_issues'];

export interface ReportHistoryEntry {
  requestId: string;
  reportType: ReportType;
  reportLabel: string;
  startDate: string;
  endDate: string;
  requestTime: string;
  status: 'Completed';
  paramsSummary: string;
  filters: ReportFilters;
  rowCount: number;
}

export interface ReportSchedule {
  id: string;
  reportType: ReportType;
  reportLabel: string;
  cadence: string;
  recipients: string[];
  enabled: boolean;
  lastSent: string | null;
}

interface State {
  history: ReportHistoryEntry[];
  schedules: ReportSchedule[];
}

function seedSchedules(): ReportSchedule[] {
  return [
    {
      id: 'p-sched-001',
      reportType: 'partner_daywise',
      reportLabel: 'Partner Day-wise Calls Report',
      cadence: 'Daily at 09:00',
      recipients: ['ops@partner.com', 'mis@partner.com'],
      enabled: true,
      lastSent: null,
    },
    {
      id: 'p-sched-002',
      reportType: 'standard_mis',
      reportLabel: 'Standard MIS Report',
      cadence: 'Weekly on Monday at 08:00',
      recipients: ['compliance@partner.com'],
      enabled: false,
      lastSent: null,
    },
  ];
}

let state: State = { history: [], schedules: seedSchedules() };
const listeners = new Set<() => void>();

function emit(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useReportSession(): State {
  return useSyncExternalStore(subscribe, () => state);
}

export function getSchedules(): ReportSchedule[] {
  return state.schedules;
}

/** Params summary that deliberately omits any partner scope. */
export function buildPartnerParamsSummary(type: ReportType, filters: ReportFilters): string {
  const catalog = getCatalogEntry(type);
  const parts: string[] = [];
  const from = filters.dateFrom;
  const to = filters.dateTo;
  parts.push(from === to ? from : `${from} → ${to}`);
  if (catalog.filters.status) {
    const statuses: string[] = [];
    if (filters.callStatuses.length) statuses.push(filters.callStatuses.join('/'));
    if (filters.agentStatuses.length) statuses.push(filters.agentStatuses.join('/'));
    if (filters.auditorDecisions.length) statuses.push(filters.auditorDecisions.join('/'));
    parts.push(statuses.length ? statuses.join(', ') : 'No status filters');
  }
  return parts.join(' · ');
}

let seq = 0;

export function addHistoryEntry(input: {
  reportType: ReportType;
  startDate: string;
  endDate: string;
  paramsSummary: string;
  filters: ReportFilters;
  rowCount: number;
}): ReportHistoryEntry {
  seq += 1;
  const catalog = REPORT_CATALOG.find((r) => r.id === input.reportType);
  const entry: ReportHistoryEntry = {
    requestId: `RPT-${Date.now().toString(36).toUpperCase()}-${seq}`,
    reportType: input.reportType,
    reportLabel: catalog?.name ?? input.reportType,
    startDate: input.startDate,
    endDate: input.endDate,
    requestTime: new Date().toISOString(),
    status: 'Completed',
    paramsSummary: input.paramsSummary,
    filters: input.filters,
    rowCount: input.rowCount,
  };
  emit({ ...state, history: [entry, ...state.history] });
  return entry;
}

export function addSchedule(input: {
  reportType: ReportType;
  cadence: string;
  recipients: string[];
}): ReportSchedule {
  const catalog = REPORT_CATALOG.find((r) => r.id === input.reportType);
  const schedule: ReportSchedule = {
    id: `p-sched-${Date.now().toString(36)}`,
    reportType: input.reportType,
    reportLabel: catalog?.name ?? input.reportType,
    cadence: input.cadence,
    recipients: input.recipients,
    enabled: true,
    lastSent: null,
  };
  emit({ ...state, schedules: [...state.schedules, schedule] });
  return schedule;
}

export function toggleSchedule(id: string): void {
  emit({ ...state, schedules: state.schedules.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)) });
}

export function sendNow(id: string): ReportSchedule | null {
  let updated: ReportSchedule | null = null;
  const schedules = state.schedules.map((s) => {
    if (s.id !== id) return s;
    updated = { ...s, lastSent: new Date().toISOString() };
    return updated;
  });
  if (updated) emit({ ...state, schedules });
  return updated;
}

// ─── Filler backlog (partner report types only) ────────────────────────────

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const FILLER_TOTAL = 420;

function fillerEntry(idx: number, partnerId: PartnerId): ReportHistoryEntry {
  const seed = hashId(`partner-report-filler-${idx}-${partnerId}`);
  const type = PARTNER_REPORT_TYPES[seed % PARTNER_REPORT_TYPES.length];
  const catalog = getCatalogEntry(type);
  const daysAgo = seed % 90;
  const start = new Date();
  start.setDate(start.getDate() - daysAgo - 7);
  const end = new Date();
  end.setDate(end.getDate() - daysAgo);
  const startStr = formatDateStr(start);
  const endStr = formatDateStr(end);
  const filters = defaultPartnerReportFilters(type, partnerId);
  filters.dateFrom = startStr;
  filters.dateTo = endStr;

  return {
    requestId: `RPT-${String(100000 + idx).slice(0, 8)}-${seed.toString(16).slice(0, 4).toUpperCase()}`,
    reportType: type,
    reportLabel: catalog.name,
    startDate: startStr,
    endDate: endStr,
    requestTime: new Date(end.getTime() + 3_600_000).toISOString(),
    status: 'Completed',
    paramsSummary: `${startStr} → ${endStr} · No status filters`,
    filters,
    rowCount: 0,
  };
}

export interface ReportHistoryPage {
  rows: ReportHistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function getReportHistoryPage(page = 1, pageSize = 10, partnerId: PartnerId): ReportHistoryPage {
  const sessionEntries = state.history;
  const total = FILLER_TOTAL + sessionEntries.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const rows: ReportHistoryEntry[] = [];
  for (let i = 0; i < pageSize; i++) {
    const idx = start + i;
    if (idx >= total) break;
    rows.push(idx < sessionEntries.length ? sessionEntries[idx] : fillerEntry(idx - sessionEntries.length, partnerId));
  }
  return { rows, total, page: safePage, pageSize, totalPages };
}
