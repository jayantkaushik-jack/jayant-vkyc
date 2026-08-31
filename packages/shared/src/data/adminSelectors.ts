import { agents, auditors, calls, customers, attendance } from './datasets';
import {
  getDateRangeFromPreset,
  getCallDropRate,
  getEfficiencyScore,
} from './selectors';
import {
  getReasonMeta,
  getReasonsByDecision,
  type ReasonDecisionClass,
} from '../lib/rejectionReasons';
import { getSessionAgents, getSessionAuditors, getSessionQueues, getAgentPartnersFromQueues, getAdminConfig } from './sessionStore';
import { PARTNERS } from './types';
import type {
  Agent,
  AgentStatusLevel,
  AttendanceRecord,
  Auditor,
  AuditorStatusLevel,
  CallStatusLevel,
  CallRecord,
  Customer,
  DateRange,
  PartnerId,
} from './types';

// ─── Chart palette ───────────────────────────────────────────────────────────

export const PARTNER_COLORS: Record<PartnerId, string> = {
  PAISABAZAAR: '#7C3AED',
  CREDILIO: '#0891B2',
  NIYO: '#DC2626',
  ZET: '#D97706',
  GENERAL: '#64748B',
};

// ─── Live-state hashing ────────────────────────────────────────────────────────

export type AgentLiveState =
  | 'logged_out'
  | 'offline'
  | 'online_idle'
  | 'online_assigned'
  | 'online_on_call'
  | 'online_on_report'
  | 'on_break';

export type AuditorLiveState =
  | 'logged_out'
  | 'offline'
  | 'online_idle'
  | 'busy'
  | 'on_break';

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildStateMap<T extends string>(
  ids: string[],
  buckets: { state: T; count: number }[],
): Map<string, T> {
  const sorted = [...ids].sort((a, b) => hashId(a) - hashId(b));
  const map = new Map<string, T>();
  let idx = 0;
  for (const bucket of buckets) {
    for (let i = 0; i < bucket.count; i++) {
      if (idx < sorted.length) {
        map.set(sorted[idx], bucket.state);
        idx++;
      }
    }
  }
  return map;
}

// Agent live state is no longer bucketed — it is reconstructed from the
// attendance log and the call timeline in section 27. Auditor workload is not
// simulated, so auditors keep a fixed distribution for now.
const AUDITOR_STATE_BUCKETS: { state: AuditorLiveState; count: number }[] = [
  { state: 'logged_out', count: 2 },
  { state: 'offline', count: 3 },
  { state: 'on_break', count: 2 },
  { state: 'online_idle', count: 5 },
  { state: 'busy', count: 7 },
];

const auditorStateMap = buildStateMap(
  auditors.map((a) => a.id),
  AUDITOR_STATE_BUCKETS,
);

export function hashAuditorLiveState(auditorId: string): AuditorLiveState {
  return auditorStateMap.get(auditorId) ?? 'offline';
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayStr(): string {
  return formatDate(new Date());
}

function hasAttendanceToday(agentId: string): boolean {
  return attendance.some((a) => a.agentId === agentId && a.date === todayStr());
}

function getPeriodRange(period: 'daily' | 'weekly' | 'monthly'): DateRange {
  switch (period) {
    case 'daily':
      return getDateRangeFromPreset('today');
    case 'weekly':
      return getDateRangeFromPreset('7d');
    case 'monthly':
      return getDateRangeFromPreset('30d');
  }
}

function filterFleetCalls(range: DateRange, partnerId?: PartnerId): CallRecord[] {
  return calls.filter((c) => {
    const ts = new Date(c.timestamp);
    if (ts < range.start || ts > range.end) return false;
    if (partnerId && c.partnerId !== partnerId) return false;
    return true;
  });
}

function partnerName(id: PartnerId): string {
  return PARTNERS.find((p) => p.id === id)?.name ?? id;
}

const customerMap = new Map(customers.map((c) => [c.id, c]));
const agentMap = new Map(agents.map((a) => [a.id, a]));
const auditorMap = new Map(auditors.map((a) => [a.id, a]));

// ─── 3. Agent overview ─────────────────────────────────────────────────────────

export interface AgentOverview {
  totalOnboarded: number;
  present: number;
  online: number;
  offline: number;
  loggedOut: number;
  busy: number;
  busyAssigned: number;
  busyOnCall: number;
  busyOnReport: number;
  onBreak: number;
}

export function getAgentOverview(): AgentOverview {
  const rosterAgents = getSessionAgents();
  let present = 0;
  let online = 0;
  let offline = 0;
  let loggedOut = 0;
  let busyAssigned = 0;
  let busyOnCall = 0;
  let busyOnReport = 0;
  let onBreak = 0;

  for (const agent of rosterAgents) {
    const state = getAgentLiveStateNow(agent.id);
    if (state === 'logged_out' && !hasAttendanceToday(agent.id)) {
      loggedOut++;
      continue;
    }
    present++;

    switch (state) {
      case 'logged_out':
        offline++;
        break;
      case 'offline':
        offline++;
        break;
      case 'on_break':
        onBreak++;
        offline++;
        break;
      case 'online_idle':
        online++;
        break;
      case 'online_assigned':
        online++;
        busyAssigned++;
        break;
      case 'online_on_call':
        online++;
        busyOnCall++;
        break;
      case 'online_on_report':
        online++;
        busyOnReport++;
        break;
    }
  }

  return {
    totalOnboarded: rosterAgents.length,
    present,
    online,
    offline,
    loggedOut,
    busy: busyAssigned + busyOnCall + busyOnReport,
    busyAssigned,
    busyOnCall,
    busyOnReport,
    onBreak,
  };
}

// ─── 4. Auditor overview ───────────────────────────────────────────────────────

export interface AuditorOverview {
  totalOnboarded: number;
  present: number;
  online: number;
  offline: number;
  loggedOut: number;
  busy: number;
  onBreak: number;
}

export function getAuditorOverview(): AuditorOverview {
  const rosterAuditors = getSessionAuditors();
  let present = 0;
  let online = 0;
  let offline = 0;
  let loggedOut = 0;
  let busy = 0;
  let onBreak = 0;

  for (const auditor of rosterAuditors) {
    const state = hashAuditorLiveState(auditor.id);
    if (state === 'logged_out') {
      loggedOut++;
      continue;
    }
    present++;

    switch (state) {
      case 'offline':
        offline++;
        break;
      case 'on_break':
        onBreak++;
        offline++;
        break;
      case 'online_idle':
        online++;
        break;
      case 'busy':
        online++;
        busy++;
        break;
    }
  }

  return {
    totalOnboarded: rosterAuditors.length,
    present,
    online,
    offline,
    loggedOut,
    busy,
    onBreak,
  };
}

// ─── 5–6. Summary stats ────────────────────────────────────────────────────────

export interface AgentSummaryStats {
  initiated: number;
  success: number;
  failed: number;
  approved: number;
  rejected: number;
  onHold: number;
}

export function getAgentSummaryStats(period: 'daily' | 'weekly' | 'monthly'): AgentSummaryStats {
  const range = getPeriodRange(period);
  const filtered = filterFleetCalls(range);

  const success = filtered.filter((c) => c.answered && c.agentDecision !== 'failed').length;
  const failed = filtered.filter((c) => !c.answered || c.agentDecision === 'failed').length;
  const approved = filtered.filter((c) => c.agentDecision === 'approved').length;
  const rejected = filtered.filter((c) => c.agentDecision === 'rejected').length;
  const onHold = filtered.filter(
    (c) => c.answered && c.agentDecision !== 'failed' && c.auditorDecision === 'In Review',
  ).length;

  return {
    initiated: filtered.length,
    success,
    failed,
    approved,
    rejected,
    onHold,
  };
}

export interface AuditorSummaryStats {
  assigned: number;
  completed: number;
  pending: number;
  accepted: number;
  declined: number;
  recapture: number;
}

export function getAuditorSummaryStats(period: 'daily' | 'weekly' | 'monthly'): AuditorSummaryStats {
  const range = getPeriodRange(period);
  const filtered = filterFleetCalls(range);
  const assigned = filtered.filter(
    (c) => c.agentDecision === 'approved' || c.agentDecision === 'rejected',
  );
  const completed = assigned.filter((c) => c.auditorDecision !== undefined && c.auditorDecision !== 'In Review');
  const pending = assigned.length - completed.length;

  return {
    assigned: assigned.length,
    completed: completed.length,
    pending,
    accepted: completed.filter((c) => c.auditorDecision === 'Approved').length,
    declined: completed.filter((c) => c.auditorDecision === 'Rejected').length,
    recapture: completed.filter((c) => c.auditorDecision === 'Recapture').length,
  };
}

// ─── 7. Fleet KPIs ─────────────────────────────────────────────────────────────

export function getFleetDropRate(range: DateRange): number | null {
  const filtered = filterFleetCalls(range);
  if (filtered.length === 0) return null;
  const unanswered = filtered.filter((c) => !c.answered).length;
  return Math.round((unanswered / filtered.length) * 1000) / 10;
}

export function getFleetAvgWait(range: DateRange, partnerId?: PartnerId): number {
  const answered = filterFleetCalls(range, partnerId).filter((c) => c.answered);
  if (answered.length === 0) return 0;
  return Math.round(answered.reduce((s, c) => s + c.agentWaitSec, 0) / answered.length);
}

export function getTodayCallCount(): number {
  return filterFleetCalls(getDateRangeFromPreset('today')).length;
}

// ─── 8. Hourly volume ──────────────────────────────────────────────────────────

export interface HourlyVolumeRow {
  hour: string;
  hourNum: number;
  ALL: number;
  [partnerId: string]: number | string;
}

export interface HourlyVolumeOptions {
  range?: DateRange;
  partnerIds?: PartnerId[];
  averagePerDay?: boolean;
}

function dayCountInRange(range: DateRange): number {
  const start = new Date(range.start);
  start.setHours(0, 0, 0, 0);
  const end = new Date(range.end);
  end.setHours(0, 0, 0, 0);
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.max(1, diff);
}

export function getHourlyVolumeByPartner(options: HourlyVolumeOptions = {}): HourlyVolumeRow[] {
  const range = options.range ?? getDateRangeFromPreset('today');
  const selected = new Set(options.partnerIds ?? PARTNERS.map((p) => p.id));
  const callsInRange = filterFleetCalls(range).filter((c) => selected.has(c.partnerId));
  const divisor = options.averagePerDay ? dayCountInRange(range) : 1;
  const rows: HourlyVolumeRow[] = [];

  for (let h = 8; h <= 20; h++) {
    const row: HourlyVolumeRow = {
      hour: `${String(h).padStart(2, '0')}:00`,
      hourNum: h,
      ALL: 0,
    };
    for (const p of PARTNERS) {
      const count = callsInRange.filter((c) => {
        const ts = new Date(c.timestamp);
        return ts.getHours() === h && c.partnerId === p.id;
      }).length;
      const normalized = Math.round((count / divisor) * 10) / 10;
      row[p.id] = normalized;
      row.ALL += normalized;
    }
    rows.push(row);
  }
  return rows;
}

// ─── 9. Queue depth ────────────────────────────────────────────────────────────

export interface QueueDepthRow {
  partnerId: PartnerId;
  partnerName: string;
  pending: number;
  waitSec: number;
  completionPct: number;
  dropRate: number;
  alert: boolean;
}

export function getQueueDepthByPartner(): QueueDepthRow[] {
  const byPartner = getPartnerDayBreakdown({ range: getDateRangeFromPreset('today') }).filter(
    (r): r is PartnerDayRow & { partnerId: PartnerId } => r.partnerId !== 'TOTAL',
  );

  return byPartner.map((row) => {
    // Live depth resolves through the single live-queue source (section 27).
    const pending = getPartnerQueueDepth(row.partnerId);

    return {
      partnerId: row.partnerId,
      partnerName: row.partnerName,
      pending,
      waitSec: Math.max(15, row.avgWaitSec),
      completionPct: row.totalCalls > 0 ? Math.round(((row.totalCalls - row.dropped) / row.totalCalls) * 100) : 0,
      dropRate: row.dropRate,
      alert: pending > 25,
    };
  });
}

export interface QueueMonitorRow {
  queueId: string;
  queueName: string;
  partnerIds: PartnerId[];
  partnerNames: string;
  agentCount: number;
  pending: number;
  waitSec: number;
  dropRate: number;
  alert: boolean;
  signal: 'Under-utilized (reallocate)' | 'Optimal load' | 'Critical depth';
}

/**
 * Home Queue Monitor — one row per configured queue. Depth, wait and agent
 * counts are read from the live-queue source (section 27) so this card and the
 * Max Wait Time card can never disagree.
 */
export function getQueueMonitorRows(): QueueMonitorRow[] {
  const byPartner = new Map(getQueueDepthByPartner().map((r) => [r.partnerId, r]));

  return getLiveQueueStates().map((live) => {
    const parts = live.partnerIds.map((pid) => byPartner.get(pid)).filter(Boolean) as QueueDepthRow[];
    const dropRate = parts.length > 0
      ? Math.round((parts.reduce((s, p) => s + p.dropRate, 0) / parts.length) * 10) / 10
      : 0;
    const alert = live.status === 'breach' || live.waiting > 25;
    return {
      queueId: live.queueId,
      queueName: live.queueName,
      partnerIds: live.partnerIds,
      partnerNames: live.partnerNames,
      agentCount: live.agentsRostered,
      pending: live.waiting,
      waitSec: live.avgWaitToDateSec,
      dropRate,
      alert,
      signal: alert
        ? 'Critical depth'
        : live.waiting < 10
          ? 'Under-utilized (reallocate)'
          : 'Optimal load',
    };
  });
}

// ─── 10. Partner funnel ────────────────────────────────────────────────────────

export interface FunnelStage {
  stage: string;
  count: number;
  dropPct: number | null;
}

export interface PartnerFunnelOptions {
  range?: DateRange;
  partnerIds?: PartnerId[];
  mode?: 'calls' | 'customers';
}

function countDistinctCustomers(rows: CallRecord[]): number {
  return new Set(rows.map((c) => c.customerId)).size;
}

export function getPartnerFunnel(options: PartnerFunnelOptions = {}): FunnelStage[] {
  const range = options.range ?? getDateRangeFromPreset('30d');
  const partnerSet = new Set(options.partnerIds ?? PARTNERS.map((p) => p.id));
  const mode = options.mode ?? 'calls';
  const filtered = filterFleetCalls(range).filter((c) => partnerSet.has(c.partnerId));

  const queueRows = filtered;
  const connectedRows = filtered.filter((c) => c.answered);
  const completedRows = filtered.filter((c) => c.answered && c.agentDecision !== 'failed');
  const reviewRows = filtered.filter((c) => c.agentDecision === 'approved' || c.agentDecision === 'rejected');
  const approvedRows = filtered.filter((c) => c.agentDecision === 'approved');

  const queueEntry = mode === 'customers' ? countDistinctCustomers(queueRows) : queueRows.length;
  const connected = mode === 'customers' ? countDistinctCustomers(connectedRows) : connectedRows.length;
  const completed = mode === 'customers' ? countDistinctCustomers(completedRows) : completedRows.length;
  const reviewSubmitted = mode === 'customers' ? countDistinctCustomers(reviewRows) : reviewRows.length;
  const approved = mode === 'customers' ? countDistinctCustomers(approvedRows) : approvedRows.length;

  const stages = [
    { stage: 'Queue Entry', count: queueEntry },
    { stage: 'Call Connected', count: connected },
    { stage: 'Call Completed', count: completed },
    { stage: 'Review Submitted', count: reviewSubmitted },
    { stage: 'VKYC Approved', count: approved },
  ];

  return stages.map((s, i) => {
    const prev = i > 0 ? stages[i - 1].count : null;
    const dropPct = prev !== null && prev > 0
      ? Math.round(((prev - s.count) / prev) * 1000) / 10
      : null;
    return { stage: s.stage, count: s.count, dropPct };
  });
}

// ─── 11. Wait-time histogram ───────────────────────────────────────────────────

export interface WaitHistogramBucket {
  bucket: string;
  count: number;
}

export interface HistogramOptions {
  range?: DateRange;
  partnerIds?: PartnerId[];
}

export function getWaitTimeHistogram(options: HistogramOptions = {}): WaitHistogramBucket[] {
  const range = options.range ?? getDateRangeFromPreset('30d');
  const selected = new Set(options.partnerIds ?? PARTNERS.map((p) => p.id));
  const answered = filterFleetCalls(range).filter((c) => c.answered && selected.has(c.partnerId));

  const buckets = [
    { bucket: '0–30s', min: 0, max: 30 },
    { bucket: '31–60s', min: 31, max: 60 },
    { bucket: '1–2m', min: 61, max: 120 },
    { bucket: '2m+', min: 121, max: Infinity },
  ];

  return buckets.map((b) => ({
    bucket: b.bucket,
    count: answered.filter((c) => c.agentWaitSec >= b.min && c.agentWaitSec <= b.max).length,
  }));
}

export function getCallTimeHistogram(options: HistogramOptions = {}): WaitHistogramBucket[] {
  const range = options.range ?? getDateRangeFromPreset('30d');
  const selected = new Set(options.partnerIds ?? PARTNERS.map((p) => p.id));
  const answered = filterFleetCalls(range).filter((c) => c.answered && selected.has(c.partnerId));

  const buckets = [
    { bucket: '<1m', min: 0, max: 59 },
    { bucket: '1–2m', min: 60, max: 119 },
    { bucket: '2–3m', min: 120, max: 179 },
    { bucket: '3–4m', min: 180, max: 239 },
    { bucket: '4–5m', min: 240, max: 299 },
    { bucket: '5m+', min: 300, max: Infinity },
  ];

  return buckets.map((b) => ({
    bucket: b.bucket,
    count: answered.filter((c) => c.durationSec >= b.min && c.durationSec <= b.max).length,
  }));
}

// ─── 12. TAT table ─────────────────────────────────────────────────────────────

export interface PartnerTatRow {
  partnerId: PartnerId;
  partnerName: string;
  leadsReceived: number;
  vkycInitiated: number;
  completed: number;
  approved: number;
  avgTatMin: number;
  dropOffPct: number;
  trend: number[];
}

export interface PartnerTatTableOptions {
  range?: DateRange;
  partnerIds?: PartnerId[];
}

const TAT_LEAD_LAG_MIN: Record<PartnerId, number> = {
  PAISABAZAAR: 42,
  CREDILIO: 118,
  NIYO: 276,
  ZET: 332,
  GENERAL: 74,
};

function eachDay(range: DateRange): string[] {
  const out: string[] = [];
  const d = new Date(range.start);
  d.setHours(0, 0, 0, 0);
  const end = new Date(range.end);
  end.setHours(0, 0, 0, 0);
  while (d <= end) {
    out.push(formatDate(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function getPartnerTatTable(options: PartnerTatTableOptions = {}): PartnerTatRow[] {
  const range = options.range ?? getDateRangeFromPreset('30d');
  const selected = new Set(options.partnerIds ?? PARTNERS.map((p) => p.id));
  const partners = PARTNERS.filter((p) => selected.has(p.id));
  const days = eachDay(range);

  return partners.map((p) => {
    const filtered = filterFleetCalls(range).filter((c) => c.partnerId === p.id);
    const initiated = filtered.length;
    const completed = filtered.filter((c) => c.answered && c.agentDecision !== 'failed').length;
    const approved = filtered.filter((c) => c.agentDecision === 'approved').length;
    const leadsReceived = initiated + Math.round(initiated * 0.08);

    const tatCalls = filtered.filter((c) => c.agentDecision === 'approved' && c.answered);
    const lag = TAT_LEAD_LAG_MIN[p.id];
    const avgTatMin = tatCalls.length > 0
      ? Math.round(
        tatCalls.reduce((s, c) => s + c.customerWaitSec + c.durationSec + c.agentWaitSec + c.reviewTimeSec + lag, 0)
          / tatCalls.length
          / 60,
      )
      : 0;

    const dropOffPct = leadsReceived > 0
      ? Math.round(((leadsReceived - approved) / leadsReceived) * 1000) / 10
      : 0;

    const trend: number[] = days.map((day) => filtered.filter((c) => c.timestamp.startsWith(day)).length);

    return {
      partnerId: p.id,
      partnerName: p.name,
      leadsReceived,
      vkycInitiated: initiated,
      completed,
      approved,
      avgTatMin,
      dropOffPct,
      trend,
    };
  });
}

// ─── 13. Quality & compliance ──────────────────────────────────────────────────

export interface QualityKpis {
  callAuditScore: number;
  firstTimeApproval: number;
  complianceFlags24h: number;
}

export function getQualityKpis(): QualityKpis {
  const range = getDateRangeFromPreset('30d');
  const filtered = filterFleetCalls(range);
  const reviewed = filtered.filter((c) => c.auditorDecision !== undefined && c.auditorDecision !== 'In Review' && c.agentDecision !== 'failed');
  const upheld = reviewed.filter((c) => {
    if (c.agentDecision === 'approved') return c.auditorDecision === 'Approved';
    if (c.agentDecision === 'rejected') return c.auditorDecision === 'Approved';
    return false;
  });
  const callAuditScore = reviewed.length > 0
    ? Math.round((upheld.length / reviewed.length) * 1000) / 10
    : 92.4;

  const approved = filtered.filter((c) => c.agentDecision === 'approved');
  const firstTimeAccepted = approved.filter((c) => c.auditorDecision === 'Approved').length;
  const firstTimeApproval = approved.length > 0
    ? Math.round((firstTimeAccepted / approved.length) * 1000) / 10
    : 88.1;

  const flags = getComplianceFlags();

  return {
    callAuditScore,
    firstTimeApproval,
    complianceFlags24h: flags.reduce((s, f) => s + f.count, 0),
  };
}

export interface ComplianceFlagRow {
  category: string;
  count: number;
}

export function getComplianceFlags(): ComplianceFlagRow[] {
  const range = getDateRangeFromPreset('today');
  const filtered = filterFleetCalls(range);
  const base = filtered.length || 100;

  return [
    { category: 'Face Mismatch', count: Math.max(1, Math.round(base * 0.003)) },
    { category: 'Geo-tag Issue', count: Math.max(2, Math.round(base * 0.004)) },
    { category: 'VPN Detected', count: Math.max(1, Math.round(base * 0.0015)) },
    { category: 'Consent Missing', count: Math.max(1, Math.round(base * 0.0025)) },
  ];
}

export interface AuditChecklistRow {
  item: string;
  score: number;
}

export function getAuditChecklist(): AuditChecklistRow[] {
  const range = getDateRangeFromPreset('30d');
  const filtered = filterFleetCalls(range);
  const n = filtered.length || 1;

  const faceIssues = filtered.filter((c) => c.auditorReason === 'Face Match Failed').length;
  const livenessIssues = filtered.filter((c) => c.auditorReason === 'Liveness Check Failed').length;
  const geoIssues = filtered.filter((c) => c.auditorReason === 'Location Outside India').length;

  return [
    { item: 'Document Clarity', score: Math.min(100, Math.round(100 - (faceIssues / n) * 500)) },
    { item: 'Liveness Check', score: Math.min(100, Math.round(100 - (livenessIssues / n) * 800)) },
    { item: 'Script Adherence', score: 89 },
    { item: 'Consent Recording', score: 100 },
    { item: 'Geo-tag Confirmation', score: Math.min(100, Math.round(100 - (geoIssues / n) * 600)) },
  ];
}

export interface AuditorDecisionRow extends CallRecord {
  customerName: string;
  appId: string;
  agentName: string;
  auditorName: string;
}

export interface AuditorDecisionFilters {
  decision?: AuditorStatusLevel | 'all';
  reason?: string;
  range?: DateRange;
  search?: string;
}

export function getAllAuditorDecisions(filters: AuditorDecisionFilters = {}): AuditorDecisionRow[] {
  const range = filters.range ?? getDateRangeFromPreset('90d');

  let rows = filterFleetCalls(range)
    .filter((c) => c.auditorDecision !== undefined && c.auditorDecision !== 'In Review')
    .map((c) => {
      const customer = customerMap.get(c.customerId);
      const agent = agentMap.get(c.agentId);
      const auditor = c.auditorId ? auditorMap.get(c.auditorId) : null;
      return {
        ...c,
        customerName: customer?.name ?? 'Unknown',
        appId: customer?.appId ?? '—',
        agentName: agent?.name ?? 'Unknown',
        auditorName: auditor?.name ?? 'Unknown',
      };
    });

  if (filters.decision && filters.decision !== 'all') {
    rows = rows.filter((r) => r.auditorDecision === filters.decision);
  }
  if (filters.reason) {
    rows = rows.filter((r) => r.auditorReason === filters.reason);
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.customerName.toLowerCase().includes(q)
        || r.appId.toLowerCase().includes(q)
        || r.agentName.toLowerCase().includes(q),
    );
  }

  return rows.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// ─── 14. Workforce ─────────────────────────────────────────────────────────────

export interface WorkforceKpis {
  agentUtilization: number;
  occupancy: number;
  breakAdherence: number;
}

export function getWorkforceKpis(): WorkforceKpis {
  const range = getDateRangeFromPreset('7d');
  const todayAtt = attendance.filter((a) => {
    const d = new Date(a.date);
    return d >= range.start && d <= range.end;
  });

  if (todayAtt.length === 0) {
    return { agentUtilization: 82, occupancy: 89, breakAdherence: 94 };
  }

  const avgOnline = todayAtt.reduce((s, a) => s + a.totalOnlineMin, 0) / todayAtt.length;
  const avgBreak = todayAtt.reduce((s, a) => s + a.totalBreakMin, 0) / todayAtt.length;
  const avgIdle = todayAtt.reduce((s, a) => s + a.idleMin, 0) / todayAtt.length;
  const avgAdherence = todayAtt.reduce((s, a) => s + a.adherencePct, 0) / todayAtt.length;

  const productive = avgOnline - avgBreak - avgIdle;
  const agentUtilization = Math.round((productive / avgOnline) * 100);
  const occupancy = Math.round(((avgOnline - avgIdle) / avgOnline) * 100);

  return {
    agentUtilization: Math.min(95, Math.max(70, agentUtilization)),
    occupancy: Math.min(98, Math.max(75, occupancy)),
    breakAdherence: Math.round(avgAdherence),
  };
}

export interface AgentPerformanceRow {
  agent: Agent;
  languages: string[];
  partners: PartnerId[];
  calls: number;
  avgDurationSec: number;
  avgReviewSec: number;
  dropRate: number | null;
  efficiency: number | null;
  liveState: AgentLiveState;
}

export interface ProductivityAgentRow {
  agent: Agent;
  partners: PartnerId[];
  liveState: AgentLiveState;
  totalCalls: number;
  efficiency: number | null;
  accuracy: number;
  /** Share of connected calls the agent approved (%). */
  approvalRate: number;
  callDropRate: number | null;
  csat: number | null;
  avgWaitSec: number;
  avgCallSec: number;
  avgReviewSec: number;
  /** Average Handling Time = avg call time + avg review time (seconds). */
  aht: number;
  avgBreakMin: number;
  avgHoursOnline: number;
  occupancy: number | null;
  /** True when avg break exceeds configured max, or avg online falls below configured min. */
  thresholdBreach: boolean;
  breakBreach: boolean;
  onlineBreach: boolean;
}

export interface ProductivityFleetSummary {
  totalCalls: number;
  efficiency: number;
  accuracy: number;
  callDropRate: number;
  csat: number;
  occupancy: number;
  activeAgents: number;
  avgWaitSec: number;
}

export interface AuditorProductivityRow {
  auditor: Auditor;
  auditsCompleted: number;
  avgTatMin: number;
  avgDecisionTimeMin: number;
  approvedPct: number;
  recapturePct: number;
  rejectedPct: number;
  overturnRate: number;
  avgHoursOnline: number;
}

export interface AuditorProductivitySummary {
  auditsCompleted: number;
  avgTatMin: number;
  pendingQueue: number;
  overallOverturnRate: number;
  rows: AuditorProductivityRow[];
}

function callMatchesPartnerFilter(call: CallRecord, partnerIds?: PartnerId[]): boolean {
  if (!partnerIds || partnerIds.length === 0) return true;
  return partnerIds.includes(call.partnerId);
}

function attendanceRows(agentId: string, range: DateRange): AttendanceRecord[] {
  return attendance.filter((a) => {
    if (a.agentId !== agentId) return false;
    const d = new Date(a.date);
    return d >= range.start && d <= range.end;
  });
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function calculateAccuracy(callsForAgent: CallRecord[]): number {
  const auditedApprovals = callsForAgent.filter(
    (c) => c.agentStatus === 'Approved' && c.auditorDecision !== undefined && c.auditorDecision !== 'In Review',
  );
  if (auditedApprovals.length === 0) return 100;
  const overturned = auditedApprovals.filter((c) => c.auditorDecision === 'Rejected' || c.auditorDecision === 'Recapture').length;
  return round1(100 - (overturned / auditedApprovals.length) * 100);
}

function calculateOccupancy(callsForAgent: CallRecord[], attendanceForAgent: AttendanceRecord[]): number | null {
  const onlineMin = attendanceForAgent.reduce((s, a) => s + a.totalOnlineMin, 0);
  if (onlineMin <= 0) return null;
  const handlingMin = callsForAgent.reduce((s, c) => s + (c.durationSec + c.reviewTimeSec) / 60, 0);
  return round1((handlingMin / onlineMin) * 100);
}

export function getProductivityAgentRows(range: DateRange, partnerIds?: PartnerId[]): ProductivityAgentRow[] {
  const config = getAdminConfig();
  // Scope the roster itself: an agent who serves none of the selected partners
  // must not appear at all (previously only their calls were filtered).
  const wanted = partnerIds && partnerIds.length > 0 ? new Set(partnerIds) : null;
  const rosterAgents = getSessionAgents().filter((a) => {
    if (!wanted) return true;
    return getAgentPartnersFromQueues(a.id).some((pid) => wanted.has(pid));
  });
  return rosterAgents.map((agent) => {
    const partners = getAgentPartnersFromQueues(agent.id);
    const scopedCalls = calls.filter((c) => {
      if (c.agentId !== agent.id) return false;
      const ts = new Date(c.timestamp);
      if (ts < range.start || ts > range.end) return false;
      return callMatchesPartnerFilter(c, partnerIds);
    });
    const connected = scopedCalls.filter((c) => c.callStatus === 'Connected');
    const completed = connected.filter((c) => c.agentStatus !== 'Unable to Verify');
    const rated = scopedCalls.filter((c) => c.csatRating !== null);
    const attRows = attendanceRows(agent.id, range);
    const eff = getEfficiencyScore(calls, agent.id, range, attendance, partnerIds);
    const avgWaitSec = connected.length > 0
      ? Math.round(connected.reduce((s, c) => s + c.agentWaitSec, 0) / connected.length)
      : 0;
    const avgCallSec = completed.length > 0
      ? Math.round(completed.reduce((s, c) => s + c.durationSec, 0) / completed.length)
      : 0;
    const avgReviewSec = completed.length > 0
      ? Math.round(completed.reduce((s, c) => s + c.reviewTimeSec, 0) / completed.length)
      : 0;
    const avgBreakMin = attRows.length > 0
      ? round1(attRows.reduce((s, a) => s + a.totalBreakMin, 0) / attRows.length)
      : 0;
    const avgHoursOnline = attRows.length > 0
      ? round1(attRows.reduce((s, a) => s + a.totalOnlineMin, 0) / attRows.length / 60)
      : 0;
    const csat = rated.length > 0
      ? round1(rated.reduce((s, c) => s + (c.csatRating ?? 0), 0) / rated.length)
      : null;
    const breakBreach = avgBreakMin > config.maxBreakMinPerDay;
    const onlineBreach = avgHoursOnline > 0 && avgHoursOnline < config.minOnlineHrsPerDay;
    return {
      agent,
      partners,
      liveState: getAgentLiveStateNow(agent.id),
      totalCalls: scopedCalls.length,
      efficiency: eff.score,
      accuracy: calculateAccuracy(scopedCalls),
      approvalRate: connected.length > 0
        ? Math.round((connected.filter((c) => c.agentStatus === 'Approved').length / connected.length) * 1000) / 10
        : 0,
      callDropRate: getCallDropRate(calls, agent.id, range, partnerIds),
      csat,
      avgWaitSec,
      avgCallSec,
      avgReviewSec,
      aht: avgCallSec + avgReviewSec,
      avgBreakMin,
      avgHoursOnline,
      occupancy: calculateOccupancy(scopedCalls, attRows),
      thresholdBreach: breakBreach || onlineBreach,
      breakBreach,
      onlineBreach,
    };
  });
}

export function getProductivityFleetSummary(range: DateRange, partnerIds?: PartnerId[]): ProductivityFleetSummary {
  const rows = getProductivityAgentRows(range, partnerIds);
  const rangeCalls = filterFleetCalls(range).filter((c) => callMatchesPartnerFilter(c, partnerIds));
  const connected = rangeCalls.filter((c) => c.callStatus === 'Connected');
  const dropped = rangeCalls.filter((c) => c.callStatus === 'User Dropped').length;
  const rated = rangeCalls.filter((c) => c.csatRating !== null);
  const efficiencyRows = rows.filter((r) => r.efficiency !== null);
  const avgEff = efficiencyRows.length > 0
    ? round1(efficiencyRows.reduce((s, r) => s + (r.efficiency ?? 0), 0) / efficiencyRows.length)
    : 0;
  const auditedApprovals = rangeCalls.filter(
    (c) => c.agentStatus === 'Approved' && c.auditorDecision !== undefined && c.auditorDecision !== 'In Review',
  );
  const overturns = auditedApprovals.filter((c) => c.auditorDecision === 'Rejected' || c.auditorDecision === 'Recapture').length;
  const accuracy = auditedApprovals.length > 0 ? round1(100 - (overturns / auditedApprovals.length) * 100) : 100;
  const dropRate = rangeCalls.length > 0 ? round1((dropped / rangeCalls.length) * 100) : 0;
  const csat = rated.length > 0
    ? round1(rated.reduce((s, c) => s + (c.csatRating ?? 0), 0) / rated.length)
    : 0;
  const activeAgents = rows.filter((r) => r.liveState.startsWith('online')).length;
  const avgWaitSec = connected.length > 0
    ? Math.round(connected.reduce((s, c) => s + c.agentWaitSec, 0) / connected.length)
    : 0;
  const occupancyRows = rows.filter((r) => r.occupancy !== null);
  const occupancy = occupancyRows.length > 0
    ? round1(occupancyRows.reduce((s, r) => s + (r.occupancy ?? 0), 0) / occupancyRows.length)
    : 0;
  return {
    totalCalls: rangeCalls.length,
    efficiency: avgEff,
    accuracy,
    callDropRate: dropRate,
    csat,
    occupancy,
    activeAgents,
    avgWaitSec,
  };
}

export function getAgentProductivityTrends(
  agentId: string,
  range: DateRange,
  partnerIds?: PartnerId[],
): Array<Record<string, string | number>> {
  const out: Array<Record<string, string | number>> = [];
  const day = new Date(range.start);
  day.setHours(0, 0, 0, 0);
  const end = new Date(range.end);
  end.setHours(0, 0, 0, 0);
  while (day <= end) {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    const dayRange = { start: dayStart, end: dayEnd };
    const row = getProductivityAgentRows(dayRange, partnerIds).find((r) => r.agent.id === agentId);
    out.push({
      date: day.toISOString().slice(0, 10),
      totalCalls: row?.totalCalls ?? 0,
      efficiency: row?.efficiency ?? 0,
      accuracy: row?.accuracy ?? 0,
      callDropRate: row?.callDropRate ?? 0,
      csat: row?.csat ?? 0,
      avgWaitSec: row?.avgWaitSec ?? 0,
      avgCallSec: row?.avgCallSec ?? 0,
      avgReviewSec: row?.avgReviewSec ?? 0,
      avgBreakMin: row?.avgBreakMin ?? 0,
      avgHoursOnline: row?.avgHoursOnline ?? 0,
      occupancy: row?.occupancy ?? 0,
    });
    day.setDate(day.getDate() + 1);
  }
  return out;
}

export function getAgentBreakPatterns(agentId: string, range: DateRange, dayIso: string) {
  const rows = attendanceRows(agentId, range);
  const selectedDay = rows.find((r) => r.date === dayIso) ?? rows[0] ?? null;
  const intraday = selectedDay?.breakIntervals ?? [];
  const weekdayBuckets = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => ({ weekday: w, avgBreakMin: 0, days: 0 }));
  for (const row of rows) {
    const d = new Date(row.date);
    const idx = (d.getDay() + 6) % 7;
    weekdayBuckets[idx].avgBreakMin += row.totalBreakMin;
    weekdayBuckets[idx].days += 1;
  }
  const byWeekday = weekdayBuckets.map((b, idx) => ({
    weekday: b.weekday,
    avgBreakMin: b.days > 0
      ? round1((b.avgBreakMin / b.days) + (idx === 4 ? 4 : 0))
      : 0,
  }));
  return {
    selectedDay: selectedDay?.date ?? dayIso,
    intraday,
    byWeekday,
  };
}

function mockDecisionTimeMin(callId: string): number {
  return 2 + (hashId(`${callId}-decision`) % 5);
}

function mockAuditorHoursOnline(auditorId: string): number {
  return round1(6.4 + (hashId(`${auditorId}-hrs`) % 25) / 10);
}

export function getAuditorProductivity(range: DateRange, partnerIds?: PartnerId[]): AuditorProductivitySummary {
  const scoped = filterFleetCalls(range).filter((c) => callMatchesPartnerFilter(c, partnerIds));
  const reviewed = scoped.filter((c) => c.auditorId && c.auditorDecision !== undefined && c.auditorDecision !== 'In Review');
  const pendingQueue = scoped.filter((c) => c.agentStatus === 'Approved' && c.auditorDecision === 'In Review').length;
  const byAuditor = new Map<string, CallRecord[]>();
  for (const call of reviewed) {
    const id = call.auditorId!;
    const arr = byAuditor.get(id) ?? [];
    arr.push(call);
    byAuditor.set(id, arr);
  }
  const rows: AuditorProductivityRow[] = getSessionAuditors().map((auditor) => {
    const arr = byAuditor.get(auditor.id) ?? [];
    const tatVals = arr.map((c) => {
      const start = new Date(c.timestamp).getTime();
      const end = c.auditorReviewedAt ? new Date(c.auditorReviewedAt).getTime() : start;
      return Math.max(2, (end - start) / 60000);
    });
    const approved = arr.filter((c) => c.auditorDecision === 'Approved').length;
    const recapture = arr.filter((c) => c.auditorDecision === 'Recapture').length;
    const rejected = arr.filter((c) => c.auditorDecision === 'Rejected').length;
    const total = arr.length || 1;
    const approvedPct = round1((approved / total) * 100);
    const recapturePct = round1((recapture / total) * 100);
    const rejectedPct = round1(Math.max(0, 100 - approvedPct - recapturePct));
    return {
      auditor,
      auditsCompleted: arr.length,
      avgTatMin: tatVals.length > 0 ? round1(tatVals.reduce((s, v) => s + v, 0) / tatVals.length) : 0,
      avgDecisionTimeMin: arr.length > 0 ? round1(arr.reduce((s, c) => s + mockDecisionTimeMin(c.id), 0) / arr.length) : 0,
      approvedPct,
      recapturePct,
      rejectedPct,
      overturnRate: round1(((recapture + rejected) / total) * 100),
      avgHoursOnline: mockAuditorHoursOnline(auditor.id),
    };
  });
  const totalReviewed = reviewed.length || 1;
  const totalOverturn = reviewed.filter((c) => c.auditorDecision === 'Recapture' || c.auditorDecision === 'Rejected').length;
  const allTat = reviewed.map((c) => {
    const start = new Date(c.timestamp).getTime();
    const end = c.auditorReviewedAt ? new Date(c.auditorReviewedAt).getTime() : start;
    return Math.max(2, (end - start) / 60000);
  });
  return {
    auditsCompleted: reviewed.length,
    avgTatMin: allTat.length > 0 ? round1(allTat.reduce((s, v) => s + v, 0) / allTat.length) : 0,
    pendingQueue,
    overallOverturnRate: round1((totalOverturn / totalReviewed) * 100),
    rows,
  };
}

export function getAgentPerformanceMatrix(
  range: DateRange,
  partnerFilter?: PartnerId,
): AgentPerformanceRow[] {
  // Scope the roster to the selected partner, not just that agent's calls.
  const scopedAgents = partnerFilter
    ? agents.filter((a) => getAgentPartnersFromQueues(a.id).includes(partnerFilter))
    : agents;
  return scopedAgents.map((agent) => {
    const agentCalls = calls.filter((c) => {
      if (c.agentId !== agent.id) return false;
      const ts = new Date(c.timestamp);
      if (ts < range.start || ts > range.end) return false;
      if (partnerFilter && c.partnerId !== partnerFilter) return false;
      return true;
    });

    const completed = agentCalls.filter((c) => c.answered && c.agentDecision !== 'failed');
    const avgDurationSec = completed.length > 0
      ? Math.round(completed.reduce((s, c) => s + c.durationSec, 0) / completed.length)
      : 0;
    const avgReviewSec = completed.length > 0
      ? Math.round(completed.reduce((s, c) => s + c.reviewTimeSec, 0) / completed.length)
      : 0;

    const efficiencyResult = getEfficiencyScore(
      calls,
      agent.id,
      range,
      attendance,
      partnerFilter ? [partnerFilter] : undefined,
    );

    return {
      agent,
      languages: agent.skills.languages,
      partners: agent.skills.partners,
      calls: agentCalls.length,
      avgDurationSec,
      avgReviewSec,
      dropRate: getCallDropRate(calls, agent.id, range, partnerFilter ? [partnerFilter] : undefined),
      efficiency: efficiencyResult.score,
      liveState: getAgentLiveStateNow(agent.id),
    };
  }).sort((a, b) => (b.efficiency ?? 0) - (a.efficiency ?? 0));
}

// ─── 15. Heatmap ───────────────────────────────────────────────────────────────

export interface HeatmapCell {
  day: string;
  dayIndex: number;
  hour: number;
  hourLabel: string;
  volume: number;
}

const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function getHeatmapData(): HeatmapCell[] {
  const range = getDateRangeFromPreset('30d');
  const filtered = filterFleetCalls(range);
  const cells: HeatmapCell[] = [];

  for (let d = 0; d < 7; d++) {
    for (let h = 9; h <= 20; h++) {
      const volume = filtered.filter((c) => {
        const ts = new Date(c.timestamp);
        const dayIdx = (ts.getDay() + 6) % 7;
        return dayIdx === d && ts.getHours() === h;
      }).length;
      cells.push({
        day: HEATMAP_DAYS[d],
        dayIndex: d,
        hour: h,
        hourLabel: `${String(h).padStart(2, '0')}:00`,
        volume,
      });
    }
  }
  return cells;
}

// ─── 16. Staffing by week ──────────────────────────────────────────────────────

export interface StaffingWeekRow {
  week: string;
  volume: number;
  isMonthEnd: boolean;
}

export function getStaffingByWeek(): StaffingWeekRow[] {
  const range = getDateRangeFromPreset('30d');
  const filtered = filterFleetCalls(range);
  const weeks: StaffingWeekRow[] = [];

  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(range.end);
    weekStart.setDate(weekStart.getDate() - (3 - w) * 7 - 6);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const volume = filtered.filter((c) => {
      const ts = new Date(c.timestamp);
      return ts >= weekStart && ts <= weekEnd;
    }).length;

    weeks.push({
      week: `W${w + 1}`,
      volume,
      isMonthEnd: w === 3,
    });
  }

  return weeks;
}

// ─── 17. Customer queue & call history ─────────────────────────────────────────

export type CustomerQueueTab = 'waiting' | 'live' | 'scheduled';

export type LiveCallStage =
  | 'Liveness'
  | 'Location'
  | 'Face'
  | 'Aadhaar'
  | 'PAN'
  | 'Signature'
  | 'Report';

export const LIVE_CALL_STAGES: LiveCallStage[] = [
  'Liveness',
  'Location',
  'Face',
  'Aadhaar',
  'PAN',
  'Signature',
  'Report',
];

/** Typical stage durations (seconds) for amber "2× typical" highlighting. */
export const TYPICAL_STAGE_DURATION_SEC: Record<LiveCallStage, number> = {
  Liveness: 90,
  Location: 45,
  Face: 40,
  Aadhaar: 60,
  PAN: 70,
  Signature: 40,
  Report: 120,
};

export interface CustomerQueueRow {
  id: string;
  joinTime: string;
  scheduledTime?: string;
  customer: Customer;
  partnerName: string;
  customerType: string;
  assignedAgent: Agent | null;
  agentAvailability: string;
  waitingSinceSec: number;
  language: string;
  /** Live-call only: current VKYC stage. */
  currentStage?: LiveCallStage;
  /** Live-call only: seconds spent in currentStage. */
  timeInStageSec?: number;
}

const QUEUE_TAB_COUNTS: Record<CustomerQueueTab, number> = {
  waiting: 6,
  live: 5,
  scheduled: 3,
};

function spreadSeconds(index: number, total: number, min: number, max: number): number {
  if (total <= 1) return min;
  return Math.round(min + ((max - min) * index) / (total - 1));
}

function isoTodayAt(hour: number, minute: number, second = 0): string {
  const d = new Date();
  d.setHours(hour, minute, second, 0);
  return d.toISOString();
}

function queueJoinTime(index: number, total: number): string {
  const sec = spreadSeconds(index, total, 0, 285); // 14:00:00 -> 14:04:45
  return isoTodayAt(14, Math.floor(sec / 60), sec % 60);
}

function queueScheduledTime(index: number): string {
  const slots = [
    isoTodayAt(14, 0),
    isoTodayAt(14, 2),
    isoTodayAt(14, 5),
  ];
  return slots[index % slots.length];
}

export function getCustomerQueue(tab: CustomerQueueTab): CustomerQueueRow[] {
  const count = QUEUE_TAB_COUNTS[tab];
  const rows: CustomerQueueRow[] = [];

  for (let i = 0; i < count; i++) {
    const seed = hashId(`${tab}-${i}`);
    const customer = customers[seed % customers.length];
    const agent = agents[seed % agents.length];
    const state = getAgentLiveStateNow(agent.id);
    const availability = state.startsWith('online') ? 'Available' : state === 'on_break' ? 'On Break' : 'Unavailable';
    const waitingSinceSec = tab === 'waiting'
      ? spreadSeconds(i, count, 15, 300)
      : tab === 'scheduled'
        ? spreadSeconds(i, count, 15, 120)
        : spreadSeconds(i, count, 45, 540);

    const currentStage = tab === 'live'
      ? LIVE_CALL_STAGES[seed % LIVE_CALL_STAGES.length]
      : undefined;
    const timeInStageSec = tab === 'live'
      ? spreadSeconds(i, count, 10, Math.max(20, TYPICAL_STAGE_DURATION_SEC[currentStage!] * 2.5))
      : undefined;

    rows.push({
      id: `queue-${tab}-${i}`,
      joinTime: queueJoinTime(i, count),
      scheduledTime: tab === 'scheduled' ? queueScheduledTime(i) : undefined,
      customer,
      partnerName: partnerName(customer.partnerId),
      customerType: customer.customerStatus,
      assignedAgent: tab === 'live' || seed % 3 === 0 ? agent : null,
      agentAvailability: availability,
      waitingSinceSec,
      language: customer.language,
      currentStage,
      timeInStageSec,
    });
  }

  return rows;
}

export interface CallHistoryFilters {
  search?: string;
  /** Partial phone match (digits compared after stripping non-digits). */
  phone?: string;
  partnerIds?: PartnerId[];
  callStatuses?: CallStatusLevel[];
  agentIds?: string[];
  auditorIds?: string[];
  productTypes?: string[];
  agentStatuses?: AgentStatusLevel[];
  auditorDecisions?: AuditorStatusLevel[];
  dateFrom?: string;
  dateTo?: string;
}

export interface CallHistoryRow {
  call: CallRecord;
  customer: Customer;
  agent: Agent;
  auditor: Auditor | null;
  callStatus: CallStatusLevel;
  agentLiveState: AgentLiveState;
  lastActivity: string;
}

export interface CallHistoryPage {
  rows: CallHistoryRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function getCallHistoryPage(
  page: number,
  pageSize: number,
  filters: CallHistoryFilters = {},
): CallHistoryPage {
  let rows = [...calls];

  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom ? new Date(filters.dateFrom) : new Date(0);
    const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : new Date();
    rows = rows.filter((c) => {
      const ts = new Date(c.timestamp);
      return ts >= from && ts <= to;
    });
  }

  if (filters.partnerIds && filters.partnerIds.length > 0) {
    const set = new Set(filters.partnerIds);
    rows = rows.filter((c) => set.has(c.partnerId));
  }

  if (filters.callStatuses && filters.callStatuses.length > 0) {
    const set = new Set(filters.callStatuses);
    rows = rows.filter((c) => set.has(c.callStatus));
  }

  if (filters.agentIds && filters.agentIds.length > 0) {
    const set = new Set(filters.agentIds);
    rows = rows.filter((c) => set.has(c.agentId));
  }

  if (filters.auditorIds && filters.auditorIds.length > 0) {
    const set = new Set(filters.auditorIds);
    rows = rows.filter((c) => c.auditorId !== null && set.has(c.auditorId));
  }

  if (filters.productTypes && filters.productTypes.length > 0) {
    const set = new Set(filters.productTypes);
    rows = rows.filter((c) => {
      const customer = customerMap.get(c.customerId);
      return !!customer && set.has(customer.productType);
    });
  }

  if (filters.agentStatuses && filters.agentStatuses.length > 0) {
    const set = new Set(filters.agentStatuses);
    rows = rows.filter((c) => c.agentStatus && set.has(c.agentStatus));
  }

  if (filters.auditorDecisions && filters.auditorDecisions.length > 0) {
    const set = new Set(filters.auditorDecisions);
    rows = rows.filter((c) => c.auditorDecision && set.has(c.auditorDecision));
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    rows = rows.filter((c) => {
      const customer = customerMap.get(c.customerId);
      const agent = agentMap.get(c.agentId);
      const auditor = c.auditorId ? auditorMap.get(c.auditorId) : null;
      const phoneDigits = (customer?.phone ?? '').replace(/\D/g, '');
      return (
        customer?.name.toLowerCase().includes(q)
        || customer?.appId.toLowerCase().includes(q)
        || customer?.phone.toLowerCase().includes(q)
        || (!!qDigits && phoneDigits.includes(qDigits))
        || agent?.name.toLowerCase().includes(q)
        || auditor?.name.toLowerCase().includes(q)
      );
    });
  }

  if (filters.phone) {
    const digits = filters.phone.replace(/\D/g, '');
    if (digits) {
      rows = rows.filter((c) => {
        const customer = customerMap.get(c.customerId);
        return !!customer && customer.phone.replace(/\D/g, '').includes(digits);
      });
    }
  }

  rows.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  const mapped: CallHistoryRow[] = pageRows.map((call) => {
    const customer = customerMap.get(call.customerId)!;
    const agent = agentMap.get(call.agentId)!;
    const callStatus: CallStatusLevel = call.callStatus;
    const lastActivity = call.auditorReviewedAt ?? call.answeredAt ?? call.timestamp;
    const auditor = call.callStatus === 'User Dropped' ? null : (call.auditorId ? auditorMap.get(call.auditorId) ?? null : null);

    return {
      call,
      customer,
      agent,
      auditor,
      callStatus,
      agentLiveState: getAgentLiveStateNow(agent.id),
      lastActivity,
    };
  });

  return { rows: mapped, total, page: safePage, pageSize, totalPages };
}

// ─── 18. Activity log ──────────────────────────────────────────────────────────

export interface ActivityLogRow {
  timestamp: string;
  name: string;
  role: 'Agent' | 'Customer' | 'System' | 'Auditor';
  action: string;
  section: string;
  callNo: number;
}
type ActivityActor = 'System' | 'Customer' | 'Agent';
interface ActivityCatalogItem {
  actor: ActivityActor;
  action: string;
  section: string;
  deltaSec: number;
}
const ACTIVITY_CATALOG: ActivityCatalogItem[] = [
  { actor: 'System', action: 'Customer was Added', section: '—', deltaSec: 0 },
  { actor: 'Customer', action: 'Customer clicked on link', section: 'Customer', deltaSec: 22 },
  { actor: 'Customer', action: 'Customer landed on Terms and Conditions screen', section: 'Connecting Agent', deltaSec: 1 },
  { actor: 'Customer', action: 'Customer accepted Terms and Conditions', section: 'Connecting Agent', deltaSec: 5 },
  { actor: 'Customer', action: 'Customer landed on Instructions screen', section: 'Connecting Agent', deltaSec: 1 },
  { actor: 'Customer', action: 'Customer landed on Permissions screen', section: 'Connecting Agent', deltaSec: 2 },
  { actor: 'Customer', action: 'Customer granted pre-requisite permissions', section: 'Connecting Agent', deltaSec: 12 },
  { actor: 'Customer', action: 'Customer is ready to start call with agent', section: 'Connecting Agent', deltaSec: 1 },
  { actor: 'Customer', action: 'Customer is waiting for agent to initiate call', section: 'Connecting Agent', deltaSec: 1 },
  { actor: 'Agent', action: 'agentAssigned', section: 'Agent Dashboard', deltaSec: 1 },
  { actor: 'Agent', action: 'Location captured with latitude - <lat> and longitude - <lng>', section: 'Landing Page', deltaSec: 1 },
  { actor: 'Agent', action: 'Customer IP status - SAFE IP Address | VPN and Proxy Not Detected | Inside India', section: 'Landing Page', deltaSec: 1 },
  { actor: 'Agent', action: 'Initiated call with the customer App ID <appId>', section: 'Landing Page', deltaSec: 40 },
  { actor: 'Agent', action: 'Viewed customer location', section: 'Left icon tray', deltaSec: 55 },
  { actor: 'Agent', action: 'Verified call instructions', section: 'Call Pre-requisite', deltaSec: 4 },
  { actor: 'Agent', action: 'Asked First Question', section: 'Check Liveliness', deltaSec: 33 },
  { actor: 'Agent', action: 'Reported Answer as Correct', section: 'Check Liveliness', deltaSec: 6 },
  { actor: 'Agent', action: 'Asked Second Question', section: 'Check Liveliness', deltaSec: 1 },
  { actor: 'Agent', action: 'Reported Answer as Correct', section: 'Check Liveliness', deltaSec: 5 },
  { actor: 'Agent', action: 'Asked Third Question', section: 'Check Liveliness', deltaSec: 1 },
  { actor: 'Agent', action: 'Reported Answer as Correct', section: 'Check Liveliness', deltaSec: 10 },
  { actor: 'Agent', action: 'Verified Live Location', section: 'Check Location', deltaSec: 4 },
  { actor: 'Agent', action: 'Captured Face', section: 'Capture Face', deltaSec: 1 },
  { actor: 'Agent', action: 'Captured Face Confirmed', section: 'Capture Face', deltaSec: 3 },
  { actor: 'Agent', action: 'Verified Captured Face', section: 'Capture Face', deltaSec: 2 },
  { actor: 'Agent', action: 'Reported face match with Aadhaar', section: 'Aadhaar Offline KYC', deltaSec: 2 },
  { actor: 'Agent', action: 'Verified Aadhaar Offline KYC Report', section: 'Aadhaar Offline KYC', deltaSec: 4 },
  { actor: 'Agent', action: 'Captured PAN Card', section: 'Capture PAN', deltaSec: 17 },
  { actor: 'Agent', action: 'Captured PAN Card Confirmed', section: 'Capture PAN', deltaSec: 2 },
  { actor: 'Agent', action: 'Reported face match with PAN card', section: 'Capture PAN', deltaSec: 3 },
  { actor: 'Agent', action: 'Confirmed PAN OCR output', section: 'Capture PAN', deltaSec: 4 },
  { actor: 'Agent', action: 'Verified PAN Capture Report', section: 'Capture PAN', deltaSec: 8 },
  { actor: 'Agent', action: 'Captured Sign', section: 'Capture Sign', deltaSec: 26 },
  { actor: 'Agent', action: 'Ended call with customer App ID <appId>', section: 'Session', deltaSec: 29 },
  { actor: 'Agent', action: 'Approved KYC for customer App ID <appId>', section: 'KYC Report', deltaSec: 8 },
  { actor: 'Agent', action: 'Initiated client data push', section: 'Data Saved', deltaSec: 0 },
];

/** Maps dropStage → last catalog action included in the truncated activity log. */
const DROP_STAGE_STOP_ACTION: Record<string, string> = {
  'Before connecting': 'Customer is waiting for agent to initiate call',
  'Pre-call checks': 'Verified call instructions',
  Liveliness: 'Reported Answer as Correct', // third liveliness answer
  Location: 'Verified Live Location',
  'Face Capture': 'Verified Captured Face',
  Aadhaar: 'Verified Aadhaar Offline KYC Report',
  PAN: 'Verified PAN Capture Report',
  Signature: 'Captured Sign',
  Report: 'Ended call with customer App ID <appId>',
};

function findDropStopIndex(stage: string | undefined): number {
  const stopAction = DROP_STAGE_STOP_ACTION[stage ?? 'Before connecting']
    ?? DROP_STAGE_STOP_ACTION['Before connecting'];
  if (stage === 'Liveliness') {
    // Third "Reported Answer as Correct" under Check Liveliness
    let seen = 0;
    for (let i = 0; i < ACTIVITY_CATALOG.length; i++) {
      const e = ACTIVITY_CATALOG[i];
      if (e.section === 'Check Liveliness' && e.action === 'Reported Answer as Correct') {
        seen += 1;
        if (seen === 3) return i;
      }
    }
  }
  const idx = ACTIVITY_CATALOG.findIndex((e) => e.action === stopAction);
  return idx >= 0 ? idx : 8;
}

const callAttemptMap = (() => {
  const byCustomer = new Map<string, CallRecord[]>();
  for (const c of calls) {
    const arr = byCustomer.get(c.customerId) ?? [];
    arr.push(c);
    byCustomer.set(c.customerId, arr);
  }
  const map = new Map<string, number>();
  for (const arr of byCustomer.values()) {
    arr.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    arr.forEach((c, i) => map.set(c.id, i + 1));
  }
  return map;
})();

function resolveAction(template: string, call: CallRecord, customer: Customer): string {
  const lat = (19 + (hashId(`${call.id}-lat`) % 30000) / 100000).toFixed(6);
  const lng = (72 + (hashId(`${call.id}-lng`) % 30000) / 100000).toFixed(6);
  return template
    .replace(/<appId>/g, customer.appId)
    .replace(/<lat>/g, lat)
    .replace(/<lng>/g, lng);
}

export function generateActivityLog(
  call: CallRecord,
  customer: Customer,
  agent: Agent,
): ActivityLogRow[] {
  const base = new Date(call.answeredAt ?? call.routedAt ?? call.timestamp);
  const rows: ActivityLogRow[] = [];
  const callNo = callAttemptMap.get(call.id) ?? 1;
  const isDropped = !call.answered;
  const isSuccess = call.agentDecision === 'approved';
  const decisionText = call.agentDecision === 'rejected'
    ? 'Rejected KYC for customer App ID <appId>'
    : call.agentDecision === 'failed'
      ? 'Unable to Verify KYC for customer App ID <appId>'
      : 'Approved KYC for customer App ID <appId>';

  const truncatedStopAction = isDropped
    ? null
    : call.agentDecision === 'rejected'
      ? 'Verified PAN Capture Report'
      : 'Verified call instructions';
  const sequence = isSuccess
    ? ACTIVITY_CATALOG
    : isDropped
      ? ACTIVITY_CATALOG.slice(0, findDropStopIndex(call.dropStage) + 1)
    : [
        ...ACTIVITY_CATALOG.slice(0, ACTIVITY_CATALOG.findIndex((e) => e.action === truncatedStopAction) + 1),
        { actor: 'Agent' as const, action: 'Ended call with customer App ID <appId>', section: 'Session', deltaSec: 24 },
        { actor: 'Agent' as const, action: decisionText, section: 'KYC Report', deltaSec: 7 },
        { actor: 'Agent' as const, action: 'Initiated client data push', section: 'Data Saved', deltaSec: 0 },
      ];

  let elapsed = 0;
  for (const event of sequence) {
    elapsed += event.deltaSec;
    const role = event.actor;
    rows.push({
      timestamp: new Date(base.getTime() + elapsed * 1000).toISOString(),
      name: role === 'Agent' ? agent.name : '-',
      role,
      action: resolveAction(event.action, call, customer),
      section: event.section,
      callNo,
    });
  }

  return rows.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// ─── 19/20. Report CSV & history — see reportGenerators.ts / reportSessionStore.ts ──

// ─── 31. Rejection & failure reasons ───────────────────────────────────────────

export type NonApprovedStatus =
  | 'Rejected'
  | 'Unable to Verify'
  | 'User Dropped'
  | 'Auditor Rejected'
  | 'Recapture';

export interface NonApprovedCaseRow {
  id: string;
  timestamp: string;
  appId: string;
  customerId: string;
  customerName: string;
  partnerId: PartnerId;
  partnerName: string;
  productType: string;
  agentId: string;
  agentName: string;
  auditorId: string | null;
  auditorName: string;
  status: NonApprovedStatus;
  reasonCategory: string;
  reason: string;
  reasonDecision: ReasonDecisionClass;
  remarks: string;
  call: CallRecord;
  customer: Customer;
  agent: Agent;
  auditor: Auditor | null;
}

export interface NonApprovedCaseFilters {
  range?: DateRange;
  partnerIds?: PartnerId[];
  statuses?: NonApprovedStatus[];
  reasonCategories?: string[];
  agentIds?: string[];
  productTypes?: string[];
  dateFrom?: string;
  dateTo?: string;
}

function pickTaxonomyReason(seed: string, decision: 'unable' | 'rejected'): { category: string; reason: string } {
  let h = 17;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const pool = getReasonsByDecision(decision);
  const idx = Math.abs(h) % Math.max(1, pool.length);
  const item = pool[idx];
  return { category: item?.category ?? 'Technical', reason: item?.label ?? 'Poor internet connection' };
}

function classifyNonApprovedStatus(call: CallRecord): NonApprovedStatus | null {
  if (call.callStatus === 'User Dropped') return 'User Dropped';
  if (call.agentStatus === 'Rejected') return 'Rejected';
  if (call.agentStatus === 'Unable to Verify') return 'Unable to Verify';
  if (call.agentStatus === 'Approved' && call.auditorDecision === 'Rejected') return 'Auditor Rejected';
  if (call.agentStatus === 'Approved' && call.auditorDecision === 'Recapture') return 'Recapture';
  return null;
}

function deriveReason(call: CallRecord, status: NonApprovedStatus): {
  category: string;
  reason: string;
  remarks: string;
  reasonDecision: ReasonDecisionClass;
} {
  if (status === 'User Dropped') {
    return {
      category: 'Connection/Drop',
      reason: 'Customer disconnected before call completion',
      reasonDecision: 'dropped',
      remarks: '',
    };
  }
  if (call.auditorReason) {
    const meta = getReasonMeta(call.auditorReason);
    if (meta) {
      return {
        category: meta.category,
        reason: call.auditorReason,
        reasonDecision: meta.decision,
        remarks: call.auditorRemarks ?? '',
      };
    }
  }
  const reasonDecision: ReasonDecisionClass = status === 'Recapture' || status === 'Unable to Verify' ? 'unable' : 'rejected';
  const fallback = pickTaxonomyReason(`${call.id}-${status}`, reasonDecision);
  return {
    category: fallback.category,
    reason: fallback.reason,
    reasonDecision,
    remarks: call.auditorRemarks ?? '',
  };
}

function filterByDateStrings(rows: NonApprovedCaseRow[], dateFrom?: string, dateTo?: string): NonApprovedCaseRow[] {
  if (!dateFrom && !dateTo) return rows;
  const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : new Date(0);
  const to = dateTo ? new Date(`${dateTo}T23:59:59`) : new Date();
  return rows.filter((r) => {
    const ts = new Date(r.timestamp);
    return ts >= from && ts <= to;
  });
}

export function getTotalCallsInRange(range: DateRange, partnerIds?: PartnerId[]): number {
  const set = partnerIds && partnerIds.length > 0 ? new Set(partnerIds) : null;
  return filterFleetCalls(range).filter((c) => !set || set.has(c.partnerId)).length;
}

export interface StatusFlowSummary {
  totalLeads: number;
  inReview: number;
  callConnected: number;
  callDropped: number;
  agentApproved: number;
  agentUnable: number;
  agentRejected: number;
  auditorApproved: number;
  auditorRecapture: number;
  auditorRejected: number;
  nonApprovedTotal: number;
}

export function getStatusFlowSummary(range: DateRange, partnerIds?: PartnerId[]): StatusFlowSummary {
  const set = partnerIds && partnerIds.length > 0 ? new Set(partnerIds) : null;
  const rows = filterFleetCalls(range).filter((c) => !set || set.has(c.partnerId));
  const totalLeads = rows.length;
  const callConnected = rows.filter((c) => c.callStatus === 'Connected').length;
  const callDropped = rows.filter((c) => c.callStatus === 'User Dropped').length;
  const agentApproved = rows.filter((c) => c.callStatus === 'Connected' && c.agentStatus === 'Approved').length;
  const agentUnable = rows.filter((c) => c.callStatus === 'Connected' && c.agentStatus === 'Unable to Verify').length;
  const agentRejected = rows.filter((c) => c.callStatus === 'Connected' && c.agentStatus === 'Rejected').length;
  const auditorApproved = rows.filter((c) => c.agentStatus === 'Approved' && c.auditorDecision === 'Approved').length;
  const auditorRecapture = rows.filter((c) => c.agentStatus === 'Approved' && c.auditorDecision === 'Recapture').length;
  const auditorRejected = rows.filter((c) => c.agentStatus === 'Approved' && c.auditorDecision === 'Rejected').length;
  const inReview = rows.filter((c) => c.agentStatus === 'Approved' && c.auditorDecision === 'In Review').length;
  const nonApprovedTotal = callDropped + agentUnable + agentRejected + auditorRecapture + auditorRejected;

  const consistency = auditorApproved + auditorRecapture + auditorRejected + inReview;
  if (agentApproved !== consistency) {
    throw new Error(`Status flow mismatch: approved=${agentApproved}, auditor-branch=${consistency}`);
  }

  return {
    totalLeads,
    inReview,
    callConnected,
    callDropped,
    agentApproved,
    agentUnable,
    agentRejected,
    auditorApproved,
    auditorRecapture,
    auditorRejected,
    nonApprovedTotal,
  };
}

export function getNonApprovedCases(filters: NonApprovedCaseFilters = {}): NonApprovedCaseRow[] {
  const range = filters.range ?? getDateRangeFromPreset('today');
  const selectedPartners = filters.partnerIds && filters.partnerIds.length > 0 ? new Set(filters.partnerIds) : null;

  let rows = filterFleetCalls(range)
    .filter((c) => !selectedPartners || selectedPartners.has(c.partnerId))
    .map((call) => {
      const status = classifyNonApprovedStatus(call);
      if (!status) return null;
      const customer = customerMap.get(call.customerId);
      const agent = agentMap.get(call.agentId);
      if (!customer || !agent) return null;
      const auditor = call.auditorId ? auditorMap.get(call.auditorId) ?? null : null;
      const reason = deriveReason(call, status);
      const auditorName = status === 'Auditor Rejected' || status === 'Recapture'
        ? (auditor?.name ?? '—')
        : '—';
      return {
        id: call.id,
        timestamp: call.timestamp,
        appId: customer.appId,
        customerId: customer.id,
        customerName: customer.name,
        partnerId: customer.partnerId,
        partnerName: partnerName(customer.partnerId),
        productType: customer.productType,
        agentId: agent.id,
        agentName: agent.name,
        auditorId: auditor?.id ?? null,
        auditorName,
        status,
        reasonCategory: reason.category,
        reason: reason.reason,
        reasonDecision: reason.reasonDecision,
        remarks: reason.remarks,
        call,
        customer,
        agent,
        auditor,
      } satisfies NonApprovedCaseRow;
    })
    .filter((r): r is NonApprovedCaseRow => !!r);

  if (filters.statuses && filters.statuses.length > 0) {
    const set = new Set(filters.statuses);
    rows = rows.filter((r) => set.has(r.status));
  }
  if (filters.reasonCategories && filters.reasonCategories.length > 0) {
    const set = new Set(filters.reasonCategories.map((x) => x.toLowerCase()));
    rows = rows.filter((r) => set.has(r.reasonCategory.toLowerCase()));
  }
  if (filters.agentIds && filters.agentIds.length > 0) {
    const set = new Set(filters.agentIds);
    rows = rows.filter((r) => set.has(r.agentId));
  }
  if (filters.productTypes && filters.productTypes.length > 0) {
    const set = new Set(filters.productTypes);
    rows = rows.filter((r) => set.has(r.productType));
  }

  rows = filterByDateStrings(rows, filters.dateFrom, filters.dateTo);
  rows.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return rows;
}

export const NON_APPROVED_STATUS_COLORS: Record<NonApprovedStatus, string> = {
  'User Dropped': '#9AA0AE',
  'Unable to Verify': '#F5A623',
  Rejected: '#E5484D',
  Recapture: '#F5A623',
  'Auditor Rejected': '#B42318',
};

export const NON_APPROVED_STATUS_ORDER: NonApprovedStatus[] = [
  'User Dropped',
  'Unable to Verify',
  'Rejected',
  'Recapture',
  'Auditor Rejected',
];

export interface FailureReasonBar {
  label: string;
  count: number;
  pct: number;
}

export function getFailureReasonsByStatus(
  status: NonApprovedStatus,
  cases: NonApprovedCaseRow[],
  topN = 8,
): FailureReasonBar[] {
  const scoped = cases.filter((c) => c.status === status);
  const total = scoped.length || 1;
  const map = new Map<string, number>();

  if (status === 'User Dropped') {
    for (const row of scoped) {
      const stage = row.call.dropStage ?? 'Before connecting';
      map.set(stage, (map.get(stage) ?? 0) + 1);
    }
  } else {
    for (const row of scoped) {
      map.set(row.reason, (map.get(row.reason) ?? 0) + 1);
    }
  }

  return [...map.entries()]
    .map(([label, count]) => ({ label, count, pct: Math.round((count / total) * 1000) / 10 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

export type FailureVolumeMode = 'count' | 'pct';

export interface FailureVolumeBucket {
  key: string;
  label: string;
  totalLeads: number;
  'User Dropped': number;
  'Unable to Verify': number;
  Rejected: number;
  Recapture: number;
  'Auditor Rejected': number;
}

function dayDiffInclusive(start: Date, end: Date): number {
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  return Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
}

function startOfIsoWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  return out;
}

export function getFailureVolumeOverTime(
  range: DateRange,
  partnerIds?: PartnerId[],
): FailureVolumeBucket[] {
  const set = partnerIds && partnerIds.length > 0 ? new Set(partnerIds) : null;
  const allCalls = filterFleetCalls(range).filter((c) => !set || set.has(c.partnerId));
  const cases = getNonApprovedCases({ range, partnerIds });
  const days = dayDiffInclusive(range.start, range.end);

  const emptyCounts = (): Omit<FailureVolumeBucket, 'key' | 'label' | 'totalLeads'> => ({
    'User Dropped': 0,
    'Unable to Verify': 0,
    Rejected: 0,
    Recapture: 0,
    'Auditor Rejected': 0,
  });

  const buckets: FailureVolumeBucket[] = [];

  if (days <= 1) {
    for (let h = 9; h <= 20; h++) {
      buckets.push({
        key: `h-${h}`,
        label: `${String(h).padStart(2, '0')}:00`,
        totalLeads: 0,
        ...emptyCounts(),
      });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    for (const c of allCalls) {
      const h = new Date(c.timestamp).getHours();
      const i = idx.get(`h-${h}`);
      if (i !== undefined) buckets[i].totalLeads += 1;
    }
    for (const c of cases) {
      const h = new Date(c.timestamp).getHours();
      const i = idx.get(`h-${h}`);
      if (i !== undefined) buckets[i][c.status] += 1;
    }
  } else if (days <= 31) {
    const d = new Date(range.start);
    d.setHours(0, 0, 0, 0);
    const end = new Date(range.end);
    end.setHours(0, 0, 0, 0);
    while (d <= end) {
      const key = d.toISOString().slice(0, 10);
      buckets.push({
        key,
        label: key.slice(5),
        totalLeads: 0,
        ...emptyCounts(),
      });
      d.setDate(d.getDate() + 1);
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    for (const c of allCalls) {
      const key = c.timestamp.slice(0, 10);
      const i = idx.get(key);
      if (i !== undefined) buckets[i].totalLeads += 1;
    }
    for (const c of cases) {
      const key = c.timestamp.slice(0, 10);
      const i = idx.get(key);
      if (i !== undefined) buckets[i][c.status] += 1;
    }
  } else {
    const d = startOfIsoWeek(range.start);
    const end = new Date(range.end);
    end.setHours(0, 0, 0, 0);
    while (d <= end) {
      const key = d.toISOString().slice(0, 10);
      buckets.push({
        key,
        label: `W ${key.slice(5)}`,
        totalLeads: 0,
        ...emptyCounts(),
      });
      d.setDate(d.getDate() + 7);
    }
    // Ensure at least 2 buckets for longer ranges that still collapse oddly
    if (buckets.length < 2) {
      const prev = new Date(buckets[0]?.key ?? range.start);
      prev.setDate(prev.getDate() - 7);
      buckets.unshift({
        key: prev.toISOString().slice(0, 10),
        label: `W ${prev.toISOString().slice(5, 10)}`,
        totalLeads: 0,
        ...emptyCounts(),
      });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    const weekKey = (iso: string) => {
      const wk = startOfIsoWeek(new Date(iso));
      return wk.toISOString().slice(0, 10);
    };
    for (const c of allCalls) {
      const key = weekKey(c.timestamp);
      const i = idx.get(key);
      if (i !== undefined) buckets[i].totalLeads += 1;
    }
    for (const c of cases) {
      const key = weekKey(c.timestamp);
      const i = idx.get(key);
      if (i !== undefined) buckets[i][c.status] += 1;
    }
  }

  return buckets;
}

export function toFailureVolumeChartRows(
  buckets: FailureVolumeBucket[],
  mode: FailureVolumeMode,
): Array<Record<string, string | number>> {
  return buckets.map((b) => {
    const denom = Math.max(b.totalLeads, 1);
    const scale = (n: number) => (mode === 'count' ? n : Math.round((n / denom) * 1000) / 10);
    return {
      label: b.label,
      totalLeads: b.totalLeads,
      'User Dropped': scale(b['User Dropped']),
      'Unable to Verify': scale(b['Unable to Verify']),
      Rejected: scale(b.Rejected),
      Recapture: scale(b.Recapture),
      'Auditor Rejected': scale(b['Auditor Rejected']),
      _rawUserDropped: b['User Dropped'],
      _rawUnable: b['Unable to Verify'],
      _rawRejected: b.Rejected,
      _rawRecapture: b.Recapture,
      _rawAuditorRejected: b['Auditor Rejected'],
    };
  });
}

// ─── 21. Availability summary (Home) ───────────────────────────────────────────

export type AvailabilityStatus = 'available' | 'in_call' | 'on_break' | 'offline';

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  available: 'Available',
  in_call: 'In a call',
  on_break: 'On a break',
  offline: 'Offline',
};

export const AVAILABILITY_DOT_COLORS: Record<AvailabilityStatus, string> = {
  available: '#22A06B',
  in_call: '#6434D6',
  on_break: '#F5A623',
  offline: '#9AA0AE',
};

export interface AvailabilityPerson {
  id: string;
  name: string;
  employeeId: string;
  partners: PartnerId[];
  dedicated: boolean;
  context: string;
}

export interface AvailabilityStatusGroup {
  status: AvailabilityStatus;
  label: string;
  count: number;
  people: AvailabilityPerson[];
}

export interface AvailabilitySummary {
  totalOnboarded: number;
  present: number;
  groups: AvailabilityStatusGroup[];
}

export interface AgentRosterRow extends AvailabilityPerson {
  status: AvailabilityStatus;
}

function agentStatusFromLive(state: AgentLiveState): AvailabilityStatus {
  switch (state) {
    case 'online_idle':
      return 'available';
    case 'online_assigned':
    case 'online_on_call':
    case 'online_on_report':
      return 'in_call';
    case 'on_break':
      return 'on_break';
    default:
      return 'offline';
  }
}

function auditorStatusFromLive(state: AuditorLiveState): AvailabilityStatus {
  switch (state) {
    case 'online_idle':
      return 'available';
    case 'busy':
      return 'in_call';
    case 'on_break':
      return 'on_break';
    default:
      return 'offline';
  }
}

function fmtClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function statusContext(status: AvailabilityStatus, seed: number): string {
  switch (status) {
    case 'in_call': {
      const dur = 45 + (seed % 420);
      const customer = customers[seed % customers.length];
      return `${fmtClock(dur)} · ${customer.appId}`;
    }
    case 'on_break':
      return `On break ${fmtClock(120 + (seed % 1500))}`;
    case 'available':
      return `Idle for ${1 + (seed % 18)}m`;
    case 'offline': {
      const h = 1 + (seed % 9);
      return `Last seen ${h}h ago`;
    }
  }
}

const AVAILABILITY_ORDER: AvailabilityStatus[] = ['available', 'in_call', 'on_break', 'offline'];

function buildAvailability(people: AgentRosterRow[]): AvailabilitySummary {
  const groups: Record<AvailabilityStatus, AvailabilityPerson[]> = {
    available: [],
    in_call: [],
    on_break: [],
    offline: [],
  };

  for (const p of people) {
    groups[p.status].push(p);
  }

  const present = groups.available.length + groups.in_call.length + groups.on_break.length;

  return {
    totalOnboarded: people.length,
    present,
    groups: AVAILABILITY_ORDER.map((status) => ({
      status,
      label: AVAILABILITY_LABELS[status],
      count: groups[status].length,
      people: groups[status].sort((a, b) => a.name.localeCompare(b.name)),
    })),
  };
}

export function getAgentRoster(): AgentRosterRow[] {
  return getSessionAgents().map((a) => {
    const partners = getAgentPartnersFromQueues(a.id);
    const status = agentStatusFromLive(getAgentLiveStateNow(a.id));
    return {
      id: a.id,
      name: a.name,
      employeeId: a.employeeId,
      partners,
      dedicated: partners.length <= 1,
      status,
      context: statusContext(status, hashId(a.id)),
    };
  });
}

export function getAgentsByStatus(partnerId?: PartnerId): AvailabilitySummary {
  const roster = getAgentRoster();
  return buildAvailability(partnerId ? roster.filter((a) => a.partners.includes(partnerId)) : roster);
}

export function getAuditorsByStatus(): AvailabilitySummary {
  return buildAvailability(
    getSessionAuditors().map((a) => {
      const status = auditorStatusFromLive(hashAuditorLiveState(a.id));
      return {
        id: a.id,
        name: a.name,
        employeeId: a.employeeId,
        partners: [] as PartnerId[],
        dedicated: true,
        status,
        context: statusContext(status, hashId(a.id)),
      };
    }),
  );
}

// ─── 22. Today by partner breakdown (Home) ─────────────────────────────────────

export interface PartnerDayRow {
  partnerId: PartnerId | 'TOTAL';
  partnerName: string;
  totalCalls: number;
  routedCalls: number;
  answeredCalls: number;
  approved: number;
  rejected: number;
  unable: number;
  dropped: number;
  inQueue: number;
  ongoing: number;
  inAuditorReview: number;
  avgWaitSec: number;
  dropRate: number;
  hotDrop: boolean;
}

export interface PartnerDayBreakdownOptions {
  range?: DateRange;
  partnerIds?: PartnerId[];
}

function includesToday(range: DateRange): boolean {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  return range.end >= todayStart && range.start <= todayEnd;
}

function todayPendingAuditorCount(partnerId: PartnerId): number {
  return filterFleetCalls(getDateRangeFromPreset('today'), partnerId).filter(
    (c) => c.answered && c.agentDecision === 'approved' && c.auditorDecision === 'In Review',
  ).length;
}

function partnerDayRow(partnerId: PartnerId, range: DateRange): PartnerDayRow {
  const rangeCalls = filterFleetCalls(range, partnerId);
  const answered = rangeCalls.filter((c) => c.answered);

  let dropped = rangeCalls.filter((c) => !c.answered).length;
  const unable = answered.filter((c) => c.agentDecision === 'failed').length;
  const decided = answered.filter(
    (c) => c.agentDecision === 'approved' || c.agentDecision === 'rejected',
  );
  const approved = decided.filter(
    (c) => c.agentDecision === 'approved' && c.auditorDecision !== undefined && c.auditorDecision !== 'In Review',
  ).length;
  const rejected = decided.filter(
    (c) => c.agentDecision === 'rejected' && c.auditorDecision !== undefined && c.auditorDecision !== 'In Review',
  ).length;

  const hasToday = includesToday(range);
  // Live counts come from the single live-queue source (section 27) so the
  // partner table, Queue Monitor, Max Wait card and assistant always agree.
  const ongoing = hasToday ? getPartnerOngoingCalls(partnerId) : 0;
  const inQueue = hasToday ? getPartnerQueueDepth(partnerId) : 0;
  const inAuditorReview = hasToday ? todayPendingAuditorCount(partnerId) : 0;

  // Keep NIYO as the single hot-drop partner for ranges that include today.
  if (hasToday && partnerId === 'NIYO') {
    const other = approved + rejected + unable + ongoing + inQueue + inAuditorReview;
    dropped = Math.max(dropped, Math.round((0.084 * other) / (1 - 0.084)));
  }

  const totalCalls = dropped + unable + inAuditorReview + approved + rejected + ongoing + inQueue;
  const avgWaitSec = answered.length > 0
    ? Math.round(answered.reduce((s, c) => s + c.agentWaitSec, 0) / answered.length)
    : 0;
  const dropRate = totalCalls > 0
    ? Math.round((dropped / totalCalls) * 1000) / 10
    : 0;

  return {
    partnerId,
    partnerName: partnerName(partnerId),
    totalCalls,
    routedCalls: rangeCalls.length,
    answeredCalls: answered.length,
    approved,
    rejected,
    unable,
    dropped,
    inQueue,
    ongoing,
    inAuditorReview,
    avgWaitSec,
    dropRate,
    hotDrop: dropRate > 5,
  };
}

export function getPartnerDayBreakdown(options: PartnerDayBreakdownOptions = {}): PartnerDayRow[] {
  const range = options.range ?? getDateRangeFromPreset('today');
  const partnerIds = options.partnerIds ?? PARTNERS.map((p) => p.id);
  const rows = partnerIds.map((pid) => partnerDayRow(pid, range));
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
  return [...rows, total];
}

// ─── 23. Agent allocation by partner (Home) ────────────────────────────────────

export interface AllocationAgent {
  id: string;
  name: string;
  employeeId: string;
  dedicated: boolean;
  otherPartners: PartnerId[];
}

export interface PartnerAllocation {
  partnerId: PartnerId;
  partnerName: string;
  agents: AllocationAgent[];
  dedicatedCount: number;
  sharedCount: number;
}

export interface AllocationResult {
  partners: PartnerAllocation[];
  unassigned: { id: string; name: string; employeeId: string }[];
}

export function getAgentAllocationByPartner(): AllocationResult {
  const roster = getAgentRoster();
  const partners = PARTNERS.map((p) => {
    const allocated = roster
      .filter((a) => a.partners.includes(p.id))
      .map((a) => ({
        id: a.id,
        name: a.name,
        employeeId: a.employeeId,
        dedicated: a.dedicated,
        otherPartners: a.partners.filter((pid) => pid !== p.id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      partnerId: p.id,
      partnerName: p.name,
      agents: allocated,
      dedicatedCount: allocated.filter((a) => a.dedicated).length,
      sharedCount: allocated.filter((a) => !a.dedicated).length,
    };
  });

  const unassigned = roster
    .filter((a) => a.partners.length === 0)
    .map((a) => ({ id: a.id, name: a.name, employeeId: a.employeeId }));

  return { partners, unassigned };
}

// ─── 24. Customer satisfaction (Home) ──────────────────────────────────────────

export interface CsatPartnerRow {
  partnerId: PartnerId;
  partnerName: string;
  avg: number;
  count: number;
}

export interface CsatSummary {
  avg: number;
  count: number;
  partners: CsatPartnerRow[];
}

export function getCsatByPartner(): CsatSummary {
  const todayCalls = filterFleetCalls(getDateRangeFromPreset('today')).filter(
    (c) => c.csatRating !== null,
  );

  const partners: CsatPartnerRow[] = PARTNERS.map((p) => {
    const rated = todayCalls.filter((c) => c.partnerId === p.id);
    const sum = rated.reduce((s, c) => s + (c.csatRating ?? 0), 0);
    return {
      partnerId: p.id,
      partnerName: p.name,
      avg: rated.length > 0 ? Math.round((sum / rated.length) * 10) / 10 : 0,
      count: rated.length,
    };
  });

  const totalSum = todayCalls.reduce((s, c) => s + (c.csatRating ?? 0), 0);
  return {
    avg: todayCalls.length > 0 ? Math.round((totalSum / todayCalls.length) * 10) / 10 : 0,
    count: todayCalls.length,
    partners,
  };
}

// ─── 25. Customer / call conversion (Home) ─────────────────────────────────────

export interface ConversionResult {
  rate: number;
  delta: number;
}



function convCallsForDay(dayOffset: number, partnerId?: PartnerId): CallRecord[] {
  const date = new Date();
  date.setDate(date.getDate() - dayOffset);
  const dateStr = formatDate(date);
  return calls.filter((c) => {
    if (!c.timestamp.startsWith(dateStr)) return false;
    return !partnerId || c.partnerId === partnerId;
  });
}

/** Call Conversion = approved calls ÷ connected calls (per attempt). */
function callConvForDay(dayOffset: number, partnerId?: PartnerId): number {
  const scoped = convCallsForDay(dayOffset, partnerId);
  const connected = scoped.filter((c) => c.callStatus === 'Connected');
  if (connected.length === 0) return 0;
  const approved = connected.filter((c) => c.agentStatus === 'Approved').length;
  return Math.round((approved / connected.length) * 1000) / 10;
}

/**
 * Customer Conversion = unique customers with at least one approval ÷ unique
 * customers who connected at least once. A customer needing two attempts adds
 * two calls but only one customer, so this always reads at or above the
 * per-call rate.
 */
function customerConvForDay(dayOffset: number, partnerId?: PartnerId): number {
  const scoped = convCallsForDay(dayOffset, partnerId);
  const connectedCustomers = new Set<string>();
  const approvedCustomers = new Set<string>();
  for (const c of scoped) {
    if (c.callStatus !== 'Connected') continue;
    connectedCustomers.add(c.customerId);
    if (c.agentStatus === 'Approved') approvedCustomers.add(c.customerId);
  }
  if (connectedCustomers.size === 0) return 0;
  return Math.round((approvedCustomers.size / connectedCustomers.size) * 1000) / 10;
}

export function getCallConversion(partnerId?: PartnerId): ConversionResult {
  const today = callConvForDay(0, partnerId);
  const yesterday = callConvForDay(1, partnerId);
  return { rate: today, delta: Math.round((today - yesterday) * 10) / 10 };
}

export function getCustomerConversion(partnerId?: PartnerId): ConversionResult {
  const today = customerConvForDay(0, partnerId);
  const yesterday = customerConvForDay(1, partnerId);
  return { rate: today, delta: Math.round((today - yesterday) * 10) / 10 };
}

// ─── 26. Assistant helpers ─────────────────────────────────────────────────────

export interface RejectionReasonRow {
  reason: string;
  count: number;
}

export function getRejectionReasonsToday(): RejectionReasonRow[] {
  const todayCalls = filterFleetCalls(getDateRangeFromPreset('today'));
  const counts = new Map<string, number>();
  for (const c of todayCalls) {
    if (c.auditorReason) {
      counts.set(c.auditorReason, (counts.get(c.auditorReason) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

export interface TopAgentRow {
  agent: Agent;
  efficiency: number;
  calls: number;
}

export function getTopAgentsToday(limit = 5): TopAgentRow[] {
  const range = getDateRangeFromPreset('today');
  return agents
    .map((agent) => {
      const eff = getEfficiencyScore(calls, agent.id, range, attendance);
      const agentCalls = calls.filter((c) => {
        if (c.agentId !== agent.id) return false;
        const ts = new Date(c.timestamp);
        return ts >= range.start && ts <= range.end;
      }).length;
      return { agent, efficiency: eff.score ?? 0, calls: agentCalls };
    })
    .filter((r) => r.calls > 0)
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, limit);
}

export function getHighestVolumePartnerToday(): PartnerDayRow | null {
  const rows = PARTNERS.map((p) => partnerDayRow(p.id, getDateRangeFromPreset('today')));
  if (rows.length === 0) return null;
  return rows.reduce((best, r) => (r.totalCalls > best.totalCalls ? r : best));
}

export function findAgentByName(query: string): Agent | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    agents.find((a) => a.name.toLowerCase() === q)
    ?? agents.find((a) => a.name.toLowerCase().includes(q))
    ?? agents.find((a) => a.name.split(' ')[0].toLowerCase() === q)
    ?? null
  );
}

// ─── Dashboard alerts (§5.4.9) ───────────────────────────────────────────────

export interface DashboardAlert {
  id: string;
  type: 'long_break' | 'waiting_queue' | 'auditor_backlog' | 'no_calls';
  severity: 'warning' | 'critical';
  message: string;
  partnerId?: PartnerId;
  at: string;
}

/** Evaluate configurable operational alerts. Scoped to a partner when provided. */
export function getDashboardAlerts(partnerId?: PartnerId): DashboardAlert[] {
  const cfg = getAdminConfig();
  const out: DashboardAlert[] = [];
  const at = new Date().toISOString();
  const today = todayStr();

  // Long break — agents whose total break today exceeds the configured max.
  for (const a of attendance.filter((r) => r.date === today)) {
    if (a.totalBreakMin > cfg.maxBreakMinPerDay) {
      const agent = getSessionAgents().find((g) => g.id === a.agentId);
      out.push({
        id: `alert-break-${a.agentId}`,
        type: 'long_break',
        severity: a.totalBreakMin > cfg.maxBreakMinPerDay * 1.5 ? 'critical' : 'warning',
        message: `${agent?.name ?? a.agentId} on break ${a.totalBreakMin}m today (limit ${cfg.maxBreakMinPerDay}m)`,
        at,
      });
    }
  }

  // High waiting queue — per queue, filtered to the selected partner.
  for (const row of getQueueMonitorRows()) {
    if (partnerId && !row.partnerIds.includes(partnerId)) continue;
    if (row.pending > cfg.alerts.maxWaitingQueue) {
      out.push({
        id: `alert-wait-${row.queueId}`,
        type: 'waiting_queue',
        severity: row.pending > cfg.alerts.maxWaitingQueue * 1.5 ? 'critical' : 'warning',
        message: `${row.queueName}: ${row.pending} customers waiting (limit ${cfg.alerts.maxWaitingQueue})`,
        at,
      });
    }
  }

  // High auditor backlog — agent-approved cases not yet audited.
  const backlog = filterFleetCalls(getDateRangeFromPreset('today'), partnerId).filter(
    (c) => c.agentStatus === 'Approved' && (c.auditorDecision === 'In Review' || !c.auditorDecision),
  ).length;
  if (backlog > cfg.alerts.maxAuditorBacklog) {
    out.push({
      id: 'alert-backlog',
      type: 'auditor_backlog',
      severity: backlog > cfg.alerts.maxAuditorBacklog * 1.5 ? 'critical' : 'warning',
      message: `${backlog} cases awaiting audit (limit ${cfg.alerts.maxAuditorBacklog})`,
      at,
    });
  }

  // No calls received — no connected call within the configured rolling interval,
  // anchored to the platform's most recent activity, evaluated overall and per partner.
  const windowMs = cfg.alerts.noCallsIntervalMin * 60 * 1000;
  const allConnected = filterFleetCalls(getDateRangeFromPreset('today')).filter((c) => c.callStatus === 'Connected');
  const platformNow = allConnected.length > 0
    ? Math.max(...allConnected.map((c) => new Date(c.timestamp).getTime()))
    : Date.now();
  const scope = partnerId ? PARTNERS.filter((p) => p.id === partnerId) : PARTNERS;
  for (const p of scope) {
    const recent = allConnected.some(
      (c) => c.partnerId === p.id && platformNow - new Date(c.timestamp).getTime() <= windowMs,
    );
    if (!recent) {
      out.push({
        id: `alert-nocalls-${p.id}`,
        type: 'no_calls',
        severity: 'warning',
        message: `No connected calls for ${p.name} in the last ${cfg.alerts.noCallsIntervalMin}m`,
        partnerId: p.id,
        at,
      });
    }
  }
  if (!partnerId && allConnected.length === 0) {
    out.push({
      id: 'alert-nocalls-all',
      type: 'no_calls',
      severity: 'critical',
      message: `No connected calls received in the last ${cfg.alerts.noCallsIntervalMin}m`,
      at,
    });
  }

  return out;
}

// ─── Agent-level reason breakdown (coaching, §5.4.4) ─────────────────────────

export interface AgentReasonRow {
  reason: string;
  category: string;
  count: number;
  pct: number;
}
export interface AgentReasonBreakdown {
  rejected: AgentReasonRow[];
  unable: AgentReasonRow[];
}

/** Distribution of an agent's Rejected and Unable-to-Verify reasons over a range. */
export function getAgentReasonBreakdown(
  agentId: string,
  range: DateRange,
  partnerIds?: PartnerId[],
): AgentReasonBreakdown {
  const scoped = calls.filter((c) => {
    if (c.agentId !== agentId) return false;
    const ts = new Date(c.timestamp);
    if (ts < range.start || ts > range.end) return false;
    if (c.callStatus !== 'Connected') return false;
    return callMatchesPartnerFilter(c, partnerIds);
  });
  const build = (status: AgentStatusLevel): AgentReasonRow[] => {
    const rows = scoped.filter((c) => c.agentStatus === status && c.auditorReason);
    const total = rows.length;
    const map = new Map<string, number>();
    for (const c of rows) map.set(c.auditorReason as string, (map.get(c.auditorReason as string) ?? 0) + 1);
    return [...map.entries()]
      .map(([reason, count]) => ({
        reason,
        category: getReasonMeta(reason)?.category ?? '—',
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  };
  return { rejected: build('Rejected'), unable: build('Unable to Verify') };
}

// ─── Staffing & rostering recommendation (§5.4.8) ────────────────────────────

export interface StaffingAssumptions {
  occupancyTarget: number; // 0..1
  shrinkage: number;       // 0..1
  ahtSec: number;          // agent handling time (call + review) per call
  reviewSec: number;       // auditor review time per approved case
  concurrency: number;     // calls handled per agent at once
}

export const DEFAULT_STAFFING_ASSUMPTIONS: StaffingAssumptions = {
  occupancyTarget: 0.8,
  shrinkage: 0.3,
  ahtSec: 210,
  reviewSec: 90,
  concurrency: 1,
};

export interface StaffingShiftRow {
  id: string;
  label: string;
  requiredAgents: number;
  agentsToRoster: number;
  requiredAuditors: number;
  auditorsToRoster: number;
}

const STAFFING_SHIFTS = [
  { id: 'A', label: '08:00–17:00', start: 8, end: 17 },
  { id: 'B', label: '12:00–21:00', start: 12, end: 21 },
  { id: 'C', label: '14:00–23:00', start: 14, end: 23 },
];

/** Recommend agents/auditors per shift from historical hourly volume (workload/occupancy method). */
export function getStaffingRecommendation(
  range: DateRange,
  a: StaffingAssumptions = DEFAULT_STAFFING_ASSUMPTIONS,
): StaffingShiftRow[] {
  const rangeCalls = filterFleetCalls(range);
  const days = Math.max(1, dayCountInRange(range));
  const connectedPerHour = new Array(24).fill(0);
  const approvedPerHour = new Array(24).fill(0);
  for (const c of rangeCalls) {
    const h = new Date(c.timestamp).getHours();
    if (c.callStatus === 'Connected') connectedPerHour[h] += 1;
    if (c.agentStatus === 'Approved') approvedPerHour[h] += 1;
  }
  for (let h = 0; h < 24; h++) {
    connectedPerHour[h] /= days;
    approvedPerHour[h] /= days;
  }
  const cover = (h: number) => STAFFING_SHIFTS.filter((s) => h >= s.start && h < s.end).length || 1;
  const need = (perHour: number, timeSec: number) =>
    Math.ceil((perHour * (timeSec / 3600)) / (Math.max(0.01, a.occupancyTarget) * Math.max(1, a.concurrency)));
  const gross = (n: number) => Math.ceil(n / Math.max(0.05, 1 - a.shrinkage));

  return STAFFING_SHIFTS.map((s) => {
    let reqAgents = 0;
    let reqAuditors = 0;
    for (let h = s.start; h < s.end; h++) {
      reqAgents = Math.max(reqAgents, Math.ceil(need(connectedPerHour[h], a.ahtSec) / cover(h)));
      reqAuditors = Math.max(reqAuditors, Math.ceil(need(approvedPerHour[h], a.reviewSec) / cover(h)));
    }
    return {
      id: s.id,
      label: s.label,
      requiredAgents: reqAgents,
      agentsToRoster: gross(reqAgents),
      requiredAuditors: reqAuditors,
      auditorsToRoster: gross(reqAuditors),
    };
  });
}

export interface DailyRosterRow {
  day: string;
  requiredPresent: number;
  pct: number;
  onLeaveOrOff: number;
}
export interface DailyRosteringResult {
  totalHeadcount: number;
  dailyRoster: number;
  rows: DailyRosterRow[];
}

/** Daily rostering %: share of total agents required present each day, honouring the
 *  6-consecutive-day rule and 6 leaves/month. */
export function getDailyRosteringPct(
  range: DateRange,
  a: StaffingAssumptions = DEFAULT_STAFFING_ASSUMPTIONS,
): DailyRosteringResult {
  const rec = getStaffingRecommendation(range, a);
  const dailyRoster = rec.reduce((s, r) => s + r.agentsToRoster, 0);
  // Availability per agent: max 6 of 7 days, minus ~6 leaves per 30-day month.
  const availability = (6 / 7) * (1 - 6 / 30);
  const totalHeadcount = Math.ceil(dailyRoster / Math.max(0.05, availability));

  const connected = filterFleetCalls(range).filter((c) => c.callStatus === 'Connected');
  const byDow = new Array(7).fill(0);
  for (const c of connected) byDow[new Date(c.timestamp).getDay()] += 1;
  const peak = Math.max(1, ...byDow);
  const order = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const rows: DailyRosterRow[] = order.map((dow, i) => {
    const factor = byDow[dow] / peak;
    const requiredPresent = Math.round(dailyRoster * factor);
    return {
      day: labels[i],
      requiredPresent,
      pct: totalHeadcount > 0 ? Math.round((requiredPresent / totalHeadcount) * 100) : 0,
      onLeaveOrOff: Math.max(0, totalHeadcount - requiredPresent),
    };
  });
  return { totalHeadcount, dailyRoster, rows };
}


// ─── 27. Point-in-time queue state ─────────────────────────────────────────────
//
// Every "how busy was the floor" number — the admin queue cards, the Queue
// Monitor, the partner-day table's In Queue / Ongoing columns, the partner queue
// snapshot and the Ops Assistant — is reconstructed here from stored records
// alone, for an arbitrary instant. Nothing is modelled or hashed:
//
//   live call at T      answeredAt ≤ T < answeredAt + durationSec
//   waiting at T        routedAt ≤ T and the customer has neither connected
//                       nor abandoned yet
//   agent present at T   attendance loginAt ≤ T ≤ logoutAt
//   agent on break at T  T falls inside a logged break interval
//   AHT at T            mean (duration + review) over calls that ended in the
//                       hour before T
//
// "Now" is just T = new Date(), so the live view and "what did it look like at
// 2pm yesterday" are the same function and cannot drift apart.

/** Wait above this is off-policy — mirrors the platform's 2-minute reroute rule. */
export const WAIT_SLA_SEC = 120;
/** Wait above this is a breach worth escalating. */
export const WAIT_BREACH_SEC = 300;
/** Fallback handle time when nothing completed in the trailing window. */
const DEFAULT_AHT_SEC = 210;
/** Trailing window used to measure handle time at an instant. */
const AHT_WINDOW_MS = 60 * 60 * 1000;

export type QueueHealth = 'ok' | 'watch' | 'breach';

/** Live views tick in whole steps of this many seconds. */
const LIVE_TICK_MS = 15_000;

/**
 * The instant every "right now" view resolves to. Quantised so that cards,
 * the queue monitor and the assistant rendered in the same moment all describe
 * the same instant rather than drifting by the milliseconds between their calls.
 */
export function getLiveInstant(): Date {
  return new Date(Math.floor(Date.now() / LIVE_TICK_MS) * LIVE_TICK_MS);
}

interface TimelineCall {
  partnerId: PartnerId;
  agentId: string;
  enteredMs: number;
  connectedMs: number | null;
  endedMs: number | null;
  reviewEndMs: number | null;
  /** When the customer left the queue: connected, or abandoned. */
  leftQueueMs: number;
  handleSec: number | null;
  waitSec: number | null;
}

function dayKeyOf(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

let timelineByDay: Map<string, TimelineCall[]> | null = null;
let timelineByAgentDay: Map<string, TimelineCall[]> | null = null;

function buildTimeline(): void {
  if (timelineByDay !== null) return;
  timelineByDay = new Map();
  timelineByAgentDay = new Map();

  for (const c of calls) {
    const enteredMs = new Date(c.routedAt).getTime();
    const connectedMs = c.answeredAt ? new Date(c.answeredAt).getTime() : null;
    const endedMs = connectedMs !== null ? connectedMs + c.durationSec * 1000 : null;
    const entry: TimelineCall = {
      partnerId: c.partnerId,
      agentId: c.agentId,
      enteredMs,
      connectedMs,
      endedMs,
      reviewEndMs: endedMs !== null ? endedMs + c.reviewTimeSec * 1000 : null,
      // An unanswered call occupied the queue until the customer gave up.
      leftQueueMs: connectedMs ?? enteredMs + c.customerWaitSec * 1000,
      handleSec: connectedMs !== null ? c.durationSec + c.reviewTimeSec : null,
      waitSec: connectedMs !== null ? Math.round((connectedMs - enteredMs) / 1000) : null,
    };

    const key = dayKeyOf(new Date(enteredMs));
    const day = timelineByDay.get(key);
    if (day) day.push(entry);
    else timelineByDay.set(key, [entry]);

    const agentKey = `${key}|${c.agentId}`;
    const perAgent = timelineByAgentDay.get(agentKey);
    if (perAgent) perAgent.push(entry);
    else timelineByAgentDay.set(agentKey, [entry]);
  }
}

function callsOnDay(key: string): TimelineCall[] {
  buildTimeline();
  return timelineByDay!.get(key) ?? [];
}

function callsForAgentOnDay(agentId: string, key: string): TimelineCall[] {
  buildTimeline();
  return timelineByAgentDay!.get(`${key}|${agentId}`) ?? [];
}

// ─── Agent presence, reconstructed from the attendance log ─────────────────────

let attendanceIndex: Map<string, AttendanceRecord> | null = null;

function attendanceFor(agentId: string, dayKey: string): AttendanceRecord | undefined {
  if (attendanceIndex === null) {
    attendanceIndex = new Map();
    for (const a of attendance) attendanceIndex.set(`${a.date}|${a.agentId}`, a);
  }
  return attendanceIndex.get(`${dayKey}|${agentId}`);
}

/** HH:MM on a given day → epoch ms. Returns null on a malformed clock value. */
function clockMs(dayKey: string, hhmm: string): number | null {
  const [h, m] = hhmm.split(':').map((n) => Number(n));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const d = new Date(`${dayKey}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

/**
 * What an agent was doing at an instant, derived from their attendance row and
 * their calls that day. This replaces the previous hashed live state, so the
 * availability card, the queue cards and the assistant all read one thing.
 */
export function getAgentLiveStateAt(agentId: string, at: Date): AgentLiveState {
  const dayKey = dayKeyOf(at);
  const record = attendanceFor(agentId, dayKey);
  if (!record) return 'logged_out';

  const t = at.getTime();

  // An agent demonstrably on a call is on a call, whatever the roster says. A
  // call can overrun a shift end or run into a scheduled break, and checking the
  // timeline first is what keeps the in-call agent count equal to the live-call
  // count on every surface.
  for (const c of callsForAgentOnDay(agentId, dayKey)) {
    if (c.connectedMs === null || c.endedMs === null) continue;
    if (t >= c.connectedMs && t < c.endedMs) return 'online_on_call';
    if (c.reviewEndMs !== null && t >= c.endedMs && t < c.reviewEndMs) return 'online_on_report';
  }

  const login = clockMs(dayKey, record.loginAt);
  const logout = clockMs(dayKey, record.logoutAt);
  if (login === null || logout === null || t < login || t > logout) return 'offline';

  for (const b of record.breakIntervals ?? []) {
    const start = clockMs(dayKey, b.start);
    const end = clockMs(dayKey, b.end);
    if (start !== null && end !== null && t >= start && t < end) return 'on_break';
  }

  return 'online_idle';
}

/** Live state at the current quantised instant. */
export function getAgentLiveStateNow(agentId: string): AgentLiveState {
  return getAgentLiveStateAt(agentId, getLiveInstant());
}

// ─── Queue state at an instant ─────────────────────────────────────────────────

export interface QueueStateAt {
  /** The instant this snapshot describes. */
  atMs: number;
  queueId: string;
  queueName: string;
  partnerIds: PartnerId[];
  partnerNames: string;
  /** Calls in progress in this queue at that instant. */
  liveCalls: number;
  /** Customers in the queue, not yet connected and not yet abandoned. */
  waiting: number;
  /** Agents mapped to this queue, regardless of presence. */
  agentsRostered: number;
  /** Logged in — online plus on a break. */
  agentsPresent: number;
  /** Logged in and not on a break. */
  agentsOnline: number;
  agentsOnBreak: number;
  agentsBusy: number;
  agentsAvailable: number;
  /** Longest elapsed wait among customers in the queue at that instant. */
  maxWaitSec: number;
  /** Projected wait for a customer entering the queue at that instant. */
  expectedWaitSec: number;
  /** Mean wait across calls connected in this queue between day start and T. */
  avgWaitToDateSec: number;
  ahtSec: number;
  /** Customers are queued with nobody online to serve them. */
  noAgents: boolean;
  /** Nobody was rostered on at all — outside service hours, or a non-working day. */
  outsideServiceHours: boolean;
  status: QueueHealth;
}

function healthFor(maxWaitSec: number, noAgents: boolean): QueueHealth {
  if (noAgents) return 'breach';
  if (maxWaitSec > WAIT_BREACH_SEC) return 'breach';
  if (maxWaitSec > WAIT_SLA_SEC) return 'watch';
  return 'ok';
}

/**
 * Reconstruct every queue's position at `at`. Pass a partnerId to narrow to the
 * queues that serve it.
 */
export function getQueueStatesAt(at: Date = getLiveInstant(), partnerId?: PartnerId): QueueStateAt[] {
  const t = at.getTime();
  const dayKey = dayKeyOf(at);
  const dayStart = new Date(`${dayKey}T00:00:00`).getTime();
  const dayCalls = callsOnDay(dayKey);

  return getSessionQueues()
    .filter((q) => !partnerId || q.partnerIds.includes(partnerId))
    .map((q) => {
      const scope = new Set(q.partnerIds);
      const queueCalls = dayCalls.filter((c) => scope.has(c.partnerId));

      let liveCalls = 0;
      let waiting = 0;
      let maxWaitSec = 0;
      let handleSum = 0;
      let handleCount = 0;
      let waitSum = 0;
      let waitCount = 0;

      for (const c of queueCalls) {
        if (c.connectedMs !== null && c.endedMs !== null && c.connectedMs <= t && c.endedMs > t) {
          liveCalls += 1;
        }
        if (c.enteredMs <= t && c.leftQueueMs > t) {
          waiting += 1;
          maxWaitSec = Math.max(maxWaitSec, Math.round((t - c.enteredMs) / 1000));
        }
        if (c.endedMs !== null && c.handleSec !== null && c.endedMs <= t && c.endedMs > t - AHT_WINDOW_MS) {
          handleSum += c.handleSec;
          handleCount += 1;
        }
        if (c.connectedMs !== null && c.waitSec !== null && c.connectedMs >= dayStart && c.connectedMs <= t) {
          waitSum += c.waitSec;
          waitCount += 1;
        }
      }

      let agentsAvailable = 0;
      let agentsBusy = 0;
      let agentsOnBreak = 0;
      for (const agentId of q.agentIds) {
        switch (getAgentLiveStateAt(agentId, at)) {
          case 'online_idle':
            agentsAvailable += 1;
            break;
          case 'online_assigned':
          case 'online_on_call':
          case 'online_on_report':
            agentsBusy += 1;
            break;
          case 'on_break':
            agentsOnBreak += 1;
            break;
          default:
            break;
        }
      }
      const agentsOnline = agentsAvailable + agentsBusy;
      const agentsPresent = agentsOnline + agentsOnBreak;

      const ahtSec = handleCount > 0 ? Math.round(handleSum / handleCount) : DEFAULT_AHT_SEC;
      const backlog = Math.max(0, waiting - agentsAvailable);
      const noAgents = agentsOnline === 0 && waiting > 0;
      const expectedWaitSec = noAgents
        ? 0
        : Math.round((backlog * ahtSec) / Math.max(agentsOnline, 1));

      return {
        atMs: t,
        queueId: q.id,
        queueName: q.name,
        partnerIds: q.partnerIds,
        partnerNames: q.partnerIds.map((pid) => partnerName(pid)).join(', '),
        liveCalls,
        waiting,
        agentsRostered: q.agentIds.length,
        agentsPresent,
        agentsOnline,
        agentsOnBreak,
        agentsBusy,
        agentsAvailable,
        maxWaitSec,
        expectedWaitSec,
        avgWaitToDateSec: waitCount > 0 ? Math.round(waitSum / waitCount) : 0,
        ahtSec,
        noAgents,
        outsideServiceHours: agentsPresent === 0,
        status: healthFor(maxWaitSec, noAgents),
      };
    });
}

export interface QueueStateSummary {
  atMs: number;
  /** Longest current wait across every queue in scope. */
  maxWaitSec: number;
  worstQueueId: string | null;
  worstQueueName: string | null;
  totalWaiting: number;
  totalLiveCalls: number;
  totalAgentsOnline: number;
  totalAgentsAvailable: number;
  /** True when no queue had anyone rostered on at that instant. */
  outsideServiceHours: boolean;
  status: QueueHealth;
  rows: QueueStateAt[];
}

export function getQueueStateSummaryAt(at: Date = getLiveInstant(), partnerId?: PartnerId): QueueStateSummary {
  const rows = getQueueStatesAt(at, partnerId);
  const worst = rows.reduce<QueueStateAt | null>(
    (acc, r) => (acc === null || r.maxWaitSec > acc.maxWaitSec ? r : acc),
    null,
  );

  // Agent totals count each person once: a shared agent appears in a row for
  // every queue they serve, so summing per-queue counts would double-count them.
  const scoped = new Set<string>();
  for (const q of getSessionQueues()) {
    if (partnerId && !q.partnerIds.includes(partnerId)) continue;
    for (const agentId of q.agentIds) scoped.add(agentId);
  }
  let totalAgentsOnline = 0;
  let totalAgentsAvailable = 0;
  for (const agentId of scoped) {
    const state = getAgentLiveStateAt(agentId, at);
    if (state === 'online_idle') {
      totalAgentsOnline += 1;
      totalAgentsAvailable += 1;
    } else if (state === 'online_assigned' || state === 'online_on_call' || state === 'online_on_report') {
      totalAgentsOnline += 1;
    }
  }

  return {
    atMs: at.getTime(),
    maxWaitSec: worst?.maxWaitSec ?? 0,
    worstQueueId: worst?.queueId ?? null,
    worstQueueName: worst?.queueName ?? null,
    totalWaiting: rows.reduce((s, r) => s + r.waiting, 0),
    totalLiveCalls: rows.reduce((s, r) => s + r.liveCalls, 0),
    totalAgentsOnline,
    totalAgentsAvailable,
    outsideServiceHours: rows.length > 0 && rows.every((r) => r.outsideServiceHours),
    status: rows.some((r) => r.status === 'breach')
      ? 'breach'
      : rows.some((r) => r.status === 'watch')
        ? 'watch'
        : 'ok',
    rows,
  };
}

// ─── Partner-level views over the same reconstruction ──────────────────────────

/** This partner's customers in the queue at an instant. */
export function getPartnerQueueDepth(partnerId: PartnerId, at: Date = getLiveInstant()): number {
  const t = at.getTime();
  return callsOnDay(dayKeyOf(at)).filter(
    (c) => c.partnerId === partnerId && c.enteredMs <= t && c.leftQueueMs > t,
  ).length;
}

/** This partner's calls in progress at an instant. */
export function getPartnerOngoingCalls(partnerId: PartnerId, at: Date = getLiveInstant()): number {
  const t = at.getTime();
  return callsOnDay(dayKeyOf(at)).filter(
    (c) => c.partnerId === partnerId
      && c.connectedMs !== null
      && c.endedMs !== null
      && c.connectedMs <= t
      && c.endedMs > t,
  ).length;
}

export interface PartnerQueueSnapshot {
  atMs: number;
  partnerId: PartnerId;
  partnerName: string;
  queueName: string;
  /** True when the partner shares its queue with another partner. */
  sharedQueue: boolean;
  waiting: number;
  liveCalls: number;
  agentsServing: number;
  expectedWaitSec: number;
  maxWaitSec: number;
  avgWaitToDateSec: number;
  outsideServiceHours: boolean;
  status: QueueHealth;
}

/**
 * Partner-scoped view. Waiting and live calls are the partner's own; wait
 * projections are queue-level, because on a shared queue this partner's
 * customers genuinely compete with the other partner's for the same agents.
 */
export function getPartnerQueueSnapshotAt(partnerId: PartnerId, at: Date = getLiveInstant()): PartnerQueueSnapshot {
  const summary = getQueueStateSummaryAt(at, partnerId);
  const worst = summary.rows.find((r) => r.queueId === summary.worstQueueId) ?? null;

  return {
    atMs: at.getTime(),
    partnerId,
    partnerName: partnerName(partnerId),
    queueName: summary.rows.map((r) => r.queueName).join(', ') || '—',
    sharedQueue: summary.rows.some((r) => r.partnerIds.length > 1),
    waiting: getPartnerQueueDepth(partnerId, at),
    liveCalls: getPartnerOngoingCalls(partnerId, at),
    agentsServing: summary.totalAgentsOnline,
    expectedWaitSec: worst?.expectedWaitSec ?? 0,
    maxWaitSec: summary.maxWaitSec,
    avgWaitToDateSec: worst?.avgWaitToDateSec ?? 0,
    outsideServiceHours: summary.outsideServiceHours,
    status: summary.status,
  };
}

/** Convenience wrappers for "right now". */
export function getLiveQueueStates(partnerId?: PartnerId): QueueStateAt[] {
  return getQueueStatesAt(getLiveInstant(), partnerId);
}

export function getLiveQueueSummary(partnerId?: PartnerId): QueueStateSummary {
  return getQueueStateSummaryAt(getLiveInstant(), partnerId);
}

export function getPartnerQueueSnapshot(partnerId: PartnerId): PartnerQueueSnapshot {
  return getPartnerQueueSnapshotAt(partnerId, getLiveInstant());
}
