import { useSyncExternalStore } from 'react';
import { PARTNERS } from './types';
import type { PartnerId } from './types';
import { REPORT_CATALOG, defaultFiltersFor, type ReportFilters, type ReportType } from './reportGenerators';

/**
 * In-memory store for report history (session-added entries) and email
 * schedules. Layered on top of a deterministic filler "backlog" so the
 * history table keeps its large, realistic pagination even though only a
 * handful of entries are ever actually generated during a session.
 */

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
  partnerScope: PartnerId[] | 'all';
  enabled: boolean;
  lastSent: string | null;
}

interface ReportSessionState {
  history: ReportHistoryEntry[];
  schedules: ReportSchedule[];
}

function seedSchedules(): ReportSchedule[] {
  return [
    {
      id: 'sched-001',
      reportType: 'vkyc_daily_dashboard',
      reportLabel: 'VKYC Daily Dashboard',
      cadence: 'Daily at 18:00',
      recipients: ['ops.head@sbm-vkyc.com', 'partner.desk@sbm-vkyc.com', 'quality.lead@sbm-vkyc.com', 'ops.admin@sbm-vkyc.com'],
      partnerScope: 'all',
      enabled: true,
      lastSent: null,
    },
    {
      id: 'sched-002',
      reportType: 'standard_mis',
      reportLabel: 'Standard MIS Report',
      cadence: 'Daily at 09:00',
      recipients: ['mis.team@sbm-vkyc.com', 'compliance@sbm-vkyc.com'],
      partnerScope: 'all',
      enabled: true,
      lastSent: null,
    },
  ];
}

let state: ReportSessionState = {
  history: [],
  schedules: seedSchedules(),
};

const listeners = new Set<() => void>();

function emit(next: ReportSessionState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ReportSessionState {
  return state;
}

export function useReportSession(): ReportSessionState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function getSchedules(): ReportSchedule[] {
  return state.schedules;
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
  partnerScope: PartnerId[] | 'all';
}): ReportSchedule {
  const catalog = REPORT_CATALOG.find((r) => r.id === input.reportType);
  const schedule: ReportSchedule = {
    id: `sched-${Date.now().toString(36)}`,
    reportType: input.reportType,
    reportLabel: catalog?.name ?? input.reportType,
    cadence: input.cadence,
    recipients: input.recipients,
    partnerScope: input.partnerScope,
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

export function findHistoryEntry(id: string): ReportHistoryEntry | null {
  return state.history.find((e) => e.requestId === id) ?? null;
}

// ─── Backlog filler (keeps the "3,000+ historical reports" pagination) ─────

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

const FILLER_TOTAL = 3200;

function fillerEntry(idx: number): ReportHistoryEntry {
  const seed = hashId(`report-filler-${idx}`);
  const catalog = REPORT_CATALOG[seed % REPORT_CATALOG.length];
  const daysAgo = seed % 90;
  const start = new Date();
  start.setDate(start.getDate() - daysAgo - 7);
  const end = new Date();
  end.setDate(end.getDate() - daysAgo);
  const startStr = formatDateStr(start);
  const endStr = formatDateStr(end);
  const filters = defaultFiltersFor(catalog.id);
  filters.dateFrom = startStr;
  filters.dateTo = endStr;

  return {
    requestId: `RPT-${String(100000 + idx).slice(0, 8)}-${seed.toString(16).slice(0, 4).toUpperCase()}`,
    reportType: catalog.id,
    reportLabel: catalog.name,
    startDate: startStr,
    endDate: endStr,
    requestTime: new Date(end.getTime() + 3_600_000).toISOString(),
    status: 'Completed',
    paramsSummary: 'All partners · No status filters',
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

export function getReportHistoryPage(page = 1, pageSize = 10): ReportHistoryPage {
  const sessionEntries = state.history;
  const total = FILLER_TOTAL + sessionEntries.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const rows: ReportHistoryEntry[] = [];
  for (let i = 0; i < pageSize; i++) {
    const idx = start + i;
    if (idx >= total) break;
    rows.push(idx < sessionEntries.length ? sessionEntries[idx] : fillerEntry(idx - sessionEntries.length));
  }
  return { rows, total, page: safePage, pageSize, totalPages };
}

export const ALL_PARTNER_IDS: PartnerId[] = PARTNERS.map((p) => p.id);
