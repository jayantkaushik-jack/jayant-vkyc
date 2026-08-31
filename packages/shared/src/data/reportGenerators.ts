import { agents, auditors, customers, calls, attendance } from './datasets';
import { getSessionAdmins } from './sessionStore';
import { getDateRangeFromPreset } from './selectors';
import { PARTNERS } from './types';
import {
  getAgentAllocationByPartner,
  getNonApprovedCases,
  getPartnerFunnel,
  getPartnerTatTable,
  getProductivityFleetSummary,
  type AllocationResult,
  type NonApprovedStatus,
} from './adminSelectors';
import type {
  AgentStatusLevel,
  AuditorStatusLevel,
  CallRecord,
  CallStatusLevel,
  Customer,
  DateRange,
  DateRangePreset,
  PartnerId,
} from './types';
import { formatDuration } from '../lib/format';

// ─── Report catalog ─────────────────────────────────────────────────────────

export type ReportType =
  | 'standard_mis'
  | 'active_users'
  | 'user_productivity'
  | 'vkyc_daily_dashboard'
  | 'partner_daywise'
  | 'vkyc_partner_summary'
  | 'customer_issues';

export type ActiveUserRole = 'Agent' | 'Auditor' | 'Admin';

export interface ReportFilterApplicability {
  partner: boolean;
  status: boolean;
  role: boolean;
  columns: boolean;
}

export interface ReportCatalogEntry {
  id: ReportType;
  name: string;
  description: string;
  icon: string;
  filters: ReportFilterApplicability;
  allColumns: string[];
}

const MIS_ALL_COLUMNS = [
  'S. No', 'Client ID', 'Customer ID', 'Customer Name', 'Application ID', 'Phone Number',
  'Customer Type', 'Customer Status', 'DOB in PAN', 'DOB in Aadhaar', 'DOB in application form',
  'Annual Income Details', 'Occupation details', 'Customer Device Country', 'Customer State',
  'Customer Pincode', 'Customer City', 'Location Latitude', 'Location Longitude', 'Customer IP Address',
  'Customer IP Risk', 'Customer IP Country', 'IP Latitude', 'IP Longitude', 'IP Address State',
  'IP Address City', 'Customer Proxy detected', 'Customer VPN detected', 'Customer Bot detected',
  'Customer Tor detected', 'Customer Device OS', 'Customer Browser Name', 'Customer Browser Version',
  'Customer Device Type', 'Brand', 'Model', 'OS Version', 'Journey Type', 'Customer Onboarding Timestamp',
  'Customer Onboarding Type', 'Transaction ID', 'Session ID', 'Session Number', 'Latest session',
  'Call Status', 'Call Type', 'Session Start Time', 'Session End Time', 'Call End Time', 'Call Start Time',
  'Customer Wait Time', 'Call Duration', 'Last Activity Timestamp', 'Last Activity Description',
  'Agent Issue remark', 'Issue Category', 'Issue Description (if applicable)', 'Verification Failure Reason',
  'Customer Blocked', 'Agent Status', 'Agent Remarks', 'Agent ID', 'Agent Name', 'Agent Verification Date',
  'Agent Rejection Reason', 'Auditor Status', 'Auditor Remarks', 'Auditor Rejection Reason', 'Auditor ID',
  'Auditor Name', 'Auditor Verification Date', 'Video available', 'Agent Callback', 'Auditor Callback',
  'Product Type', 'Master Id', 'Channel Partner', 'Face Match Score with Aadhaar', 'Face Match Score with PAN',
  'Customer Download Speed', 'Customer Upload Speed', 'Agent Download Speed', 'Agent Upload Speed',
  'High Call Volume', 'Customer Current Address', 'Customer Permanent Address', 'PAN Name Match Score',
  "PAN Father's Name Match Score", 'PAN DOB Match Status', 'Aadhaar Name Match Score',
  'Aadhaar Address Match Score with Current Address', 'Aadhaar Address Match Score with Permanent Address',
  'Aadhaar DOB Match Status', 'Customer Email in Application Form', 'Customer Aadhaar in Application Form',
  'Customer PAN Number in Application Form', 'Live - Current Distance (in KMs)', 'Live - Permanent Distance (in KMs)',
  'CKYC Status',
];

export const PRODUCTIVITY_ALL_COLUMNS = [
  'S.No', 'Date', 'Name', 'Username', 'User Type', 'Login At', 'Logout At',
  'Total Duration', 'Idle Duration', 'Offline Duration', 'Busy Duration',
  'Total Breaks', 'Total Calls', 'Success Calls', 'Failed Calls', 'Pending Calls', 'Approved Calls',
];

const ACTIVE_USERS_ALL_COLUMNS = [
  'S.No', 'Date', 'Name', 'Employee ID', 'Role', 'Login At', 'Logout At', 'Online Duration', 'Total Calls', 'Status',
];

const DAYWISE_ALL_COLUMNS = [
  'Date', 'Partner', 'Leads', 'Connected', 'User Dropped', 'Agent Approved', 'Agent Unable', 'Agent Rejected',
  'Auditor Approved', 'Auditor Recapture', 'Auditor Rejected', 'Auditor In Review', 'Approval %', 'Avg Wait', 'AHT', 'CSAT',
];

const ISSUES_ALL_COLUMNS = [
  'Timestamp', 'App ID', 'Customer', 'Partner', 'Agent', 'Issue Category', 'Sub-reason', 'Remarks', 'Final Outcome',
];

const AGGREGATE_NA_COLUMNS: string[] = [];

export const REPORT_CATALOG: ReportCatalogEntry[] = [
  {
    id: 'standard_mis',
    name: 'Standard MIS Report',
    description: 'Full session-level MIS extract — one row per session with verification, match-score and CKYC detail.',
    icon: 'FileSpreadsheet',
    filters: { partner: true, status: true, role: false, columns: true },
    allColumns: MIS_ALL_COLUMNS,
  },
  {
    id: 'active_users',
    name: 'Active Users Report',
    description: 'Login activity across agents, auditors and admins for the selected period.',
    icon: 'Users',
    filters: { partner: false, status: false, role: true, columns: false },
    allColumns: ACTIVE_USERS_ALL_COLUMNS,
  },
  {
    id: 'user_productivity',
    name: 'User Productivity Report',
    description: 'Per-agent attendance, break and call-handling metrics for the selected period.',
    icon: 'Gauge',
    filters: { partner: false, status: false, role: false, columns: true },
    allColumns: PRODUCTIVITY_ALL_COLUMNS,
  },
  {
    id: 'vkyc_daily_dashboard',
    name: 'VKYC Daily Dashboard',
    description: 'Replica of the emailed ops digest — agent allocation and hourly wait-time summary.',
    icon: 'LayoutDashboard',
    filters: { partner: true, status: false, role: false, columns: false },
    allColumns: AGGREGATE_NA_COLUMNS,
  },
  {
    id: 'partner_daywise',
    name: 'Partner Day-wise Calls Report',
    description: 'One row per day per partner — funnel counts, approval % and handling-time metrics.',
    icon: 'CalendarDays',
    filters: { partner: true, status: true, role: false, columns: true },
    allColumns: DAYWISE_ALL_COLUMNS,
  },
  {
    id: 'vkyc_partner_summary',
    name: 'V-KYC Partner Summary',
    description: 'Single-period partner rollup — funnel, top failure reasons, TAT, allocation and CSAT.',
    icon: 'PieChart',
    filters: { partner: true, status: false, role: false, columns: false },
    allColumns: AGGREGATE_NA_COLUMNS,
  },
  {
    id: 'customer_issues',
    name: 'Customer Issues Report',
    description: 'Every non-approved / failure case in range with category, sub-reason and final outcome.',
    icon: 'AlertTriangle',
    filters: { partner: true, status: true, role: false, columns: true },
    allColumns: ISSUES_ALL_COLUMNS,
  },
];

export function getCatalogEntry(type: ReportType): ReportCatalogEntry {
  const entry = REPORT_CATALOG.find((r) => r.id === type);
  if (!entry) throw new Error(`Unknown report type: ${type}`);
  return entry;
}

// ─── Filters & result shapes ────────────────────────────────────────────────

export interface ReportFilters {
  datePreset: DateRangePreset;
  dateFrom: string;
  dateTo: string;
  partnerIds: PartnerId[];
  callStatuses: CallStatusLevel[];
  agentStatuses: AgentStatusLevel[];
  auditorDecisions: AuditorStatusLevel[];
  roles: ActiveUserRole[];
  columns: string[];
}

export interface ReportSection {
  title: string;
  columns: string[];
  rows: Record<string, string | number>[];
}

export interface ReportResult {
  columns: string[];
  rows: Record<string, string | number>[];
  sections?: ReportSection[];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function defaultFiltersFor(type: ReportType): ReportFilters {
  const today = getDateRangeFromPreset('today');
  const catalog = getCatalogEntry(type);
  return {
    datePreset: 'today',
    dateFrom: formatDateStr(today.start),
    dateTo: formatDateStr(today.end),
    partnerIds: PARTNERS.map((p) => p.id),
    callStatuses: [],
    agentStatuses: [],
    auditorDecisions: [],
    roles: ['Agent', 'Auditor', 'Admin'],
    columns: [...catalog.allColumns],
  };
}

function resolveRange(filters: ReportFilters): DateRange {
  return {
    start: new Date(`${filters.dateFrom}T00:00:00`),
    end: new Date(`${filters.dateTo}T23:59:59`),
  };
}

function partnerScope(filters: ReportFilters): PartnerId[] {
  if (!filters.partnerIds || filters.partnerIds.length === 0 || filters.partnerIds.length >= PARTNERS.length) {
    return PARTNERS.map((p) => p.id);
  }
  return filters.partnerIds;
}

function pickColumns(all: string[], selected: string[] | undefined): string[] {
  if (!selected || selected.length === 0) return all;
  const set = new Set(selected);
  const filtered = all.filter((c) => set.has(c));
  return filtered.length > 0 ? filtered : all;
}

function eachDateStr(range: DateRange): string[] {
  const out: string[] = [];
  const d = new Date(range.start);
  d.setHours(0, 0, 0, 0);
  const end = new Date(range.end);
  end.setHours(0, 0, 0, 0);
  while (d <= end) {
    out.push(formatDateStr(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function singleDayRange(dateStr: string): DateRange {
  return { start: new Date(`${dateStr}T00:00:00`), end: new Date(`${dateStr}T23:59:59`) };
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function hashRange(seed: string, min: number, max: number): number {
  return min + (hashId(seed) % (max - min + 1));
}

const customerMap = new Map(customers.map((c) => [c.id, c]));
const agentMap = new Map(agents.map((a) => [a.id, a]));

function partnerName(id: PartnerId): string {
  return PARTNERS.find((p) => p.id === id)?.name ?? id;
}

// ─── Standard MIS Report ────────────────────────────────────────────────────

interface SessionMeta {
  sessionNumber: number;
  isLatest: boolean;
}

let sessionMetaCache: Map<string, SessionMeta> | null = null;

function getSessionMeta(): Map<string, SessionMeta> {
  if (sessionMetaCache) return sessionMetaCache;
  const byCustomer = new Map<string, CallRecord[]>();
  for (const c of calls) {
    const arr = byCustomer.get(c.customerId) ?? [];
    arr.push(c);
    byCustomer.set(c.customerId, arr);
  }
  const map = new Map<string, SessionMeta>();
  for (const arr of byCustomer.values()) {
    const sorted = [...arr].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    sorted.forEach((c, idx) => {
      map.set(c.id, { sessionNumber: idx + 1, isLatest: idx === sorted.length - 1 });
    });
  }
  sessionMetaCache = map;
  return map;
}

function panDobStatus(customer: Customer): string {
  if (!customer.panDetails) return 'Not Available';
  return customer.panDetails.dob === customer.dob ? 'Match' : 'Mismatch';
}

function aadhaarDobStatus(customer: Customer): string {
  if (!customer.asPerAadhaar) return 'Not Available';
  return customer.asPerAadhaar.dob === customer.dob ? 'Match' : 'Mismatch';
}

function deviceCountry(call: CallRecord): string {
  if (call.auditorReason === 'Location Outside India') return 'United Arab Emirates';
  return hashId(`${call.id}-geo`) % 180 === 0 ? 'United Arab Emirates' : 'India';
}

function ckycStatus(call: CallRecord): string {
  if (call.callStatus !== 'Connected') return '—';
  if (call.agentStatus === 'Approved') {
    return call.auditorDecision === 'Approved'
      ? 'To be downloaded from CKYC after Confirm Match'
      : 'Awaiting images';
  }
  return 'Awaiting images';
}

function agentRemarkFor(call: CallRecord): string {
  if (call.callStatus !== 'Connected') return '—';
  switch (call.agentStatus) {
    case 'Approved':
      return 'All checks passed; customer verified successfully.';
    case 'Rejected':
      return call.auditorReason ?? 'Verification could not be completed.';
    case 'Unable to Verify':
      return call.auditorReason ?? 'Process could not be completed.';
    default:
      return '—';
  }
}

const DEVICE_OS = ['Android', 'iOS'];
const BROWSERS = ['Chrome Mobile', 'Mobile Safari', 'Opera Mobile', 'Chrome Mobile WebView'];
const DEVICE_TYPES = ['mobile', 'mobile', 'mobile', 'tablet'];
const BRANDS = ['Generic_Android', 'Samsung', 'Xiaomi', 'Vivo', 'OnePlus', 'Apple'];

function fmtAddr(a: { line1: string; line2: string; city: string; state: string; pincode: string }): string {
  return [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ');
}
function fmtDateTime(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(0, 19).replace('T', ' ') : '—';
}

function buildMisRow(call: CallRecord, index: number): Record<string, string | number> {
  const customer = customerMap.get(call.customerId)!;
  const agent = agentMap.get(call.agentId)!;
  const auditor = call.auditorId ? auditors.find((a) => a.id === call.auditorId) ?? null : null;
  const meta = getSessionMeta().get(call.id) ?? { sessionNumber: 1, isLatest: true };
  const connected = call.callStatus === 'Connected';
  const answered = call.answeredAt ? new Date(call.answeredAt) : null;
  const callEnd = answered ? new Date(answered.getTime() + call.durationSec * 1000) : null;
  const sessionEnd = answered ? new Date(answered.getTime() + (call.durationSec + call.reviewTimeSec) * 1000) : null;
  const os = DEVICE_OS[hashId(`${call.id}-os`) % DEVICE_OS.length];
  const isIos = os === 'iOS';
  const pct = (s: string, mn: number, mx: number) => (connected ? `${hashRange(`${call.id}-${s}`, mn, mx)}%` : '—');
  const rejReason = call.agentStatus === 'Rejected' ? (call.auditorReason ?? '—') : '—';
  const unableReason = call.agentStatus === 'Unable to Verify' ? (call.auditorReason ?? '—') : '—';
  const issueRemark = connected && (call.agentStatus === 'Rejected' || call.agentStatus === 'Unable to Verify')
    ? 'Agent reported' : '—';

  return {
    'S. No': index + 1,
    'Client ID': `SBM_Bank_${(hashId(customer.id) % 1_000_000).toString(36)}`,
    'Customer ID': customer.id,
    'Customer Name': customer.name,
    'Application ID': customer.appId,
    'Phone Number': customer.phone,
    'Customer Type': 'INDIVIDUAL',
    'Customer Status': customer.customerStatus === 'New' ? 'NTB' : 'ETB',
    'DOB in PAN': customer.dob,
    'DOB in Aadhaar': customer.asPerAadhaar?.dob ?? customer.dob,
    'DOB in application form': customer.dob,
    'Annual Income Details': customer.incomeEmployment?.annualIncome ?? '—',
    'Occupation details': customer.incomeEmployment?.occupation ?? '—',
    'Customer Device Country': deviceCountry(call),
    'Customer State': customer.currentAddress.state,
    'Customer Pincode': customer.currentAddress.pincode,
    'Customer City': customer.currentAddress.city,
    'Location Latitude': connected ? (18 + hashRange(`${call.id}-lat`, 0, 900) / 100).toFixed(6) : '—',
    'Location Longitude': connected ? (72 + hashRange(`${call.id}-lng`, 0, 1300) / 100).toFixed(6) : '—',
    'Customer IP Address': connected ? `${hashRange(`${call.id}-ip1`, 42, 220)}.${hashRange(`${call.id}-ip2`, 1, 250)}.${hashRange(`${call.id}-ip3`, 1, 250)}.${hashRange(`${call.id}-ip4`, 1, 250)}` : '—',
    'Customer IP Risk': 'Safe',
    'Customer IP Country': 'IN',
    'IP Latitude': connected ? (18 + hashRange(`${call.id}-iplat`, 0, 900) / 100).toFixed(1) : '—',
    'IP Longitude': connected ? (72 + hashRange(`${call.id}-iplng`, 0, 1300) / 100).toFixed(1) : '—',
    'IP Address State': customer.currentAddress.state,
    'IP Address City': customer.currentAddress.district,
    'Customer Proxy detected': 'No',
    'Customer VPN detected': 'No',
    'Customer Bot detected': 'No',
    'Customer Tor detected': 'No',
    'Customer Device OS': os,
    'Customer Browser Name': isIos ? 'Mobile Safari' : BROWSERS[hashId(`${call.id}-br`) % BROWSERS.length],
    'Customer Browser Version': `${hashRange(`${call.id}-brv`, 120, 149)}.0.0`,
    'Customer Device Type': DEVICE_TYPES[hashId(`${call.id}-dt`) % DEVICE_TYPES.length],
    'Brand': isIos ? 'Apple' : BRANDS[hashId(`${call.id}-brand`) % BRANDS.length],
    'Model': isIos ? `iPhone${hashRange(`${call.id}-mdl`, 11, 16)}` : `Model-${hashRange(`${call.id}-mdl`, 100, 999)}`,
    'OS Version': isIos ? `iOS ${hashRange(`${call.id}-osv`, 15, 18)}.${hashRange(`${call.id}-osv2`, 0, 6)}` : `${hashRange(`${call.id}-osv`, 10, 15)}`,
    'Journey Type': 'VKYC',
    'Customer Onboarding Timestamp': fmtDateTime(call.timestamp),
    'Customer Onboarding Type': call.partnerId === 'GENERAL' ? 'direct' : 'partner-assisted',
    'Transaction ID': `TXN${call.id.replace('call-', '')}`,
    'Session ID': call.id,
    'Session Number': meta.sessionNumber,
    'Latest session': meta.isLatest ? 'YES' : 'NO',
    'Call Status': call.callStatus,
    'Call Type': hashId(`${call.id}-ct`) % 5 === 0 ? 'scheduled' : 'live',
    'Session Start Time': fmtDateTime(call.timestamp),
    'Session End Time': connected && sessionEnd ? fmtDateTime(sessionEnd.toISOString()) : '—',
    'Call End Time': connected && callEnd ? fmtDateTime(callEnd.toISOString()) : '—',
    'Call Start Time': fmtDateTime(call.answeredAt),
    'Customer Wait Time': `${call.customerWaitSec}s`,
    'Call Duration': connected ? `${call.durationSec}s` : '—',
    'Last Activity Timestamp': fmtDateTime(call.answeredAt ?? call.timestamp),
    'Last Activity Description': connected ? 'Verification workflow completed' : 'Initiated client data push',
    'Agent Issue remark': issueRemark,
    'Issue Category': issueRemark !== '—' ? (call.agentStatus === 'Rejected' ? 'Suspicious Customer' : 'Customer Related') : '—',
    'Issue Description (if applicable)': issueRemark !== '—' ? (call.auditorReason ?? '—') : '—',
    'Verification Failure Reason': unableReason,
    'Customer Blocked': hashId(`${customer.id}-blocked`) % 47 === 0 ? 'Yes' : 'No',
    'Agent Status': call.agentStatus ?? '—',
    'Agent Remarks': agentRemarkFor(call),
    'Agent ID': agent.employeeId,
    'Agent Name': agent.name,
    'Agent Verification Date': fmtDateTime(call.answeredAt),
    'Agent Rejection Reason': rejReason,
    'Auditor Status': call.agentStatus === 'Approved' ? (call.auditorDecision ?? 'In Review') : '—',
    'Auditor Remarks': call.auditorRemarks ?? '—',
    'Auditor Rejection Reason': call.auditorDecision === 'Rejected' ? (call.auditorReason ?? '—') : '—',
    'Auditor ID': auditor?.employeeId ?? '—',
    'Auditor Name': auditor?.name ?? '—',
    'Auditor Verification Date': fmtDateTime(call.auditorReviewedAt),
    'Video available': connected ? 'available' : '—',
    'Agent Callback': connected ? 'Received' : '—',
    'Auditor Callback': 'Not sent',
    'Product Type': customer.productType,
    'Master Id': hashRange(`${customer.id}-master`, 100000, 999999),
    'Channel Partner': partnerName(call.partnerId),
    'Face Match Score with Aadhaar': pct('fmaad', 80, 99),
    'Face Match Score with PAN': pct('fmpan', 45, 98),
    'Customer Download Speed': connected ? hashRange(`${call.id}-cdl`, 40, 500) : '—',
    'Customer Upload Speed': connected ? hashRange(`${call.id}-cul`, 20, 300) : '—',
    'Agent Download Speed': connected ? hashRange(`${call.id}-adl`, 5, 90) : '—',
    'Agent Upload Speed': connected ? hashRange(`${call.id}-aul`, 5, 60) : '—',
    'High Call Volume': hashId(`${call.id}-hcv`) % 6 === 0 ? 'YES' : 'NO',
    'Customer Current Address': fmtAddr(customer.currentAddress),
    'Customer Permanent Address': fmtAddr(customer.permanentAddress),
    'PAN Name Match Score': pct('pann', 85, 100),
    "PAN Father's Name Match Score": pct('panf', 80, 100),
    'PAN DOB Match Status': panDobStatus(customer),
    'Aadhaar Name Match Score': pct('aadn', 85, 100),
    'Aadhaar Address Match Score with Current Address': pct('aadc', 70, 100),
    'Aadhaar Address Match Score with Permanent Address': pct('aadp', 60, 100),
    'Aadhaar DOB Match Status': aadhaarDobStatus(customer),
    'Customer Email in Application Form': customer.email,
    'Customer Aadhaar in Application Form': `XXXX XXXX ${customer.aadhaarLast4}`,
    'Customer PAN Number in Application Form': customer.panNumber,
    'Live - Current Distance (in KMs)': connected ? hashRange(`${call.id}-curdist`, 0, 22) : '—',
    'Live - Permanent Distance (in KMs)': connected ? hashRange(`${call.id}-permdist`, 0, 45) : '—',
    'CKYC Status': ckycStatus(call),
  };
}

function genStandardMis(filters: ReportFilters): ReportResult {
  const range = resolveRange(filters);
  const partnerSet = new Set(partnerScope(filters));
  let scoped = calls.filter((c) => {
    const ts = new Date(c.timestamp);
    if (ts < range.start || ts > range.end) return false;
    return partnerSet.has(c.partnerId);
  });

  if (filters.callStatuses.length > 0) {
    const s = new Set(filters.callStatuses);
    scoped = scoped.filter((c) => s.has(c.callStatus));
  }
  if (filters.agentStatuses.length > 0) {
    const s = new Set(filters.agentStatuses);
    scoped = scoped.filter((c) => c.agentStatus && s.has(c.agentStatus));
  }
  if (filters.auditorDecisions.length > 0) {
    const s = new Set(filters.auditorDecisions);
    scoped = scoped.filter((c) => c.auditorDecision && s.has(c.auditorDecision));
  }

  scoped = [...scoped].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const rows = scoped.map((c, i) => buildMisRow(c, i));
  return { columns: pickColumns(MIS_ALL_COLUMNS, filters.columns), rows };
}

// ─── User Productivity Report (existing pattern, unchanged shape) ──────────

function genUserProductivity(filters: ReportFilters): ReportResult {
  const range = resolveRange(filters);
  const attRows = attendance.filter((a) => {
    const d = new Date(`${a.date}T12:00:00`);
    return d >= range.start && d <= range.end;
  }).sort((a, b) => b.date.localeCompare(a.date) || a.agentId.localeCompare(b.agentId));

  const rows: Record<string, string | number>[] = [];
  let i = 0;
  for (const att of attRows) {
    const agent = agentMap.get(att.agentId);
    if (!agent) continue;

    const dayCalls = calls.filter((c) => c.agentId === att.agentId && c.timestamp.startsWith(att.date));
    const success = dayCalls.filter((c) => c.answered && c.agentDecision !== 'failed').length;
    const failed = dayCalls.filter((c) => !c.answered || c.agentDecision === 'failed').length;
    const pending = dayCalls.filter(
      (c) => c.answered && c.agentDecision !== 'failed' && c.auditorDecision === 'In Review',
    ).length;
    const approved = dayCalls.filter((c) => c.agentDecision === 'approved').length;
    const busyMin = Math.max(0, att.totalOnlineMin - att.idleMin - att.totalBreakMin);

    i += 1;
    rows.push({
      'S.No': i,
      Date: att.date,
      Name: agent.name,
      Username: agent.email,
      'User Type': 'Agent',
      'Login At': att.loginAt,
      'Logout At': att.logoutAt,
      'Total Duration': `${att.totalOnlineMin}m`,
      'Idle Duration': `${att.idleMin}m`,
      'Offline Duration': `${Math.max(0, 480 - att.totalOnlineMin)}m`,
      'Busy Duration': `${busyMin}m`,
      'Total Breaks': String(Math.round(att.totalBreakMin / 60)),
      'Total Calls': dayCalls.length,
      'Success Calls': success,
      'Failed Calls': failed,
      'Pending Calls': pending,
      'Approved Calls': approved,
    });
  }

  return { columns: pickColumns(PRODUCTIVITY_ALL_COLUMNS, filters.columns), rows };
}

// ─── Active Users Report ────────────────────────────────────────────────────

function isSunday(dateStr: string): boolean {
  return new Date(`${dateStr}T12:00:00`).getDay() === 0;
}

function genActiveUsers(filters: ReportFilters): ReportResult {
  const range = resolveRange(filters);
  const days = eachDateStr(range).filter((d) => !isSunday(d));
  const roles = filters.roles.length > 0 ? filters.roles : ['Agent', 'Auditor', 'Admin'];
  const rows: Record<string, string | number>[] = [];
  let i = 0;

  if (roles.includes('Agent')) {
    for (const day of days) {
      const dayAtt = attendance.filter((a) => a.date === day);
      for (const att of dayAtt) {
        const agent = agentMap.get(att.agentId);
        if (!agent) continue;
        const dayCalls = calls.filter((c) => c.agentId === agent.id && c.timestamp.startsWith(day));
        i += 1;
        rows.push({
          'S.No': i,
          Date: day,
          Name: agent.name,
          'Employee ID': agent.employeeId,
          Role: 'Agent',
          'Login At': att.loginAt,
          'Logout At': att.logoutAt,
          'Online Duration': `${att.totalOnlineMin}m`,
          'Total Calls': dayCalls.length,
          Status: 'Active',
        });
      }
    }
  }

  if (roles.includes('Auditor')) {
    for (const day of days) {
      for (const auditor of auditors) {
        const seed = hashId(`${auditor.id}-${day}`);
        const loginMin = 45 + (seed % 15);
        const logoutMin = (Math.floor(seed / 8)) % 30;
        i += 1;
        rows.push({
          'S.No': i,
          Date: day,
          Name: auditor.name,
          'Employee ID': auditor.employeeId,
          Role: 'Auditor',
          'Login At': `08:${pad(loginMin)}`,
          'Logout At': `18:${pad(logoutMin)}`,
          'Online Duration': '9h',
          'Total Calls': '—',
          Status: 'Active',
        });
      }
    }
  }

  if (roles.includes('Admin')) {
    const admins = getSessionAdmins();
    for (const day of days) {
      for (const admin of admins) {
        const seed = hashId(`${admin.id}-${day}`);
        i += 1;
        rows.push({
          'S.No': i,
          Date: day,
          Name: admin.name,
          'Employee ID': admin.employeeId,
          Role: 'Admin',
          'Login At': `09:${pad(10 + (seed % 20))}`,
          'Logout At': `18:${pad(seed % 30)}`,
          'Online Duration': '8h 45m',
          'Total Calls': '—',
          Status: 'Active',
        });
      }
    }
  }

  return { columns: ACTIVE_USERS_ALL_COLUMNS, rows };
}

// ─── Partner Day-wise Calls Report ──────────────────────────────────────────

function partnerDaywiseRow(day: string, pid: PartnerId, filters: ReportFilters): Record<string, string | number> {
  const dayRange = singleDayRange(day);
  let dayCalls = calls.filter((c) => {
    const ts = new Date(c.timestamp);
    return ts >= dayRange.start && ts <= dayRange.end && c.partnerId === pid;
  });

  if (filters.callStatuses.length > 0) {
    const s = new Set(filters.callStatuses);
    dayCalls = dayCalls.filter((c) => s.has(c.callStatus));
  }
  if (filters.agentStatuses.length > 0) {
    const s = new Set(filters.agentStatuses);
    dayCalls = dayCalls.filter((c) => c.agentStatus && s.has(c.agentStatus));
  }
  if (filters.auditorDecisions.length > 0) {
    const s = new Set(filters.auditorDecisions);
    dayCalls = dayCalls.filter((c) => c.auditorDecision && s.has(c.auditorDecision));
  }

  const leads = dayCalls.length;
  const connected = dayCalls.filter((c) => c.callStatus === 'Connected').length;
  const dropped = dayCalls.filter((c) => c.callStatus === 'User Dropped').length;
  const agentApproved = dayCalls.filter((c) => c.agentStatus === 'Approved').length;
  const agentUnable = dayCalls.filter((c) => c.agentStatus === 'Unable to Verify').length;
  const agentRejected = dayCalls.filter((c) => c.agentStatus === 'Rejected').length;
  const auditorApproved = dayCalls.filter((c) => c.auditorDecision === 'Approved').length;
  const auditorRecapture = dayCalls.filter((c) => c.auditorDecision === 'Recapture').length;
  const auditorRejected = dayCalls.filter((c) => c.auditorDecision === 'Rejected').length;
  const auditorInReview = dayCalls.filter((c) => c.auditorDecision === 'In Review').length;
  const answered = dayCalls.filter((c) => c.callStatus === 'Connected');
  const completed = answered.filter((c) => c.agentStatus !== 'Unable to Verify');
  const rated = dayCalls.filter((c) => c.csatRating !== null);
  const avgWaitSec = answered.length > 0 ? Math.round(answered.reduce((s, c) => s + c.agentWaitSec, 0) / answered.length) : 0;
  const ahtSec = completed.length > 0 ? Math.round(completed.reduce((s, c) => s + c.durationSec, 0) / completed.length) : 0;
  const csat = rated.length > 0 ? Math.round((rated.reduce((s, c) => s + (c.csatRating ?? 0), 0) / rated.length) * 10) / 10 : 0;
  const approvalPct = leads > 0 ? Math.round((auditorApproved / leads) * 1000) / 10 : 0;

  return {
    Date: day,
    Partner: partnerName(pid),
    Leads: leads,
    Connected: connected,
    'User Dropped': dropped,
    'Agent Approved': agentApproved,
    'Agent Unable': agentUnable,
    'Agent Rejected': agentRejected,
    'Auditor Approved': auditorApproved,
    'Auditor Recapture': auditorRecapture,
    'Auditor Rejected': auditorRejected,
    'Auditor In Review': auditorInReview,
    'Approval %': `${approvalPct}%`,
    'Avg Wait': formatDuration(avgWaitSec),
    AHT: formatDuration(ahtSec),
    CSAT: csat || '—',
  };
}

function genPartnerDaywise(filters: ReportFilters): ReportResult {
  const range = resolveRange(filters);
  const partners = partnerScope(filters);
  const days = eachDateStr(range);
  const rows: Record<string, string | number>[] = [];
  for (const day of days) {
    for (const pid of partners) {
      rows.push(partnerDaywiseRow(day, pid, filters));
    }
  }
  return { columns: pickColumns(DAYWISE_ALL_COLUMNS, filters.columns), rows };
}

// ─── Customer Issues Report ──────────────────────────────────────────────────

function mapNonApprovedStatuses(filters: ReportFilters): NonApprovedStatus[] | undefined {
  const explicit: NonApprovedStatus[] = [];
  if (filters.callStatuses.includes('User Dropped')) explicit.push('User Dropped');
  if (filters.agentStatuses.includes('Rejected')) explicit.push('Rejected');
  if (filters.agentStatuses.includes('Unable to Verify')) explicit.push('Unable to Verify');
  if (filters.auditorDecisions.includes('Rejected')) explicit.push('Auditor Rejected');
  if (filters.auditorDecisions.includes('Recapture')) explicit.push('Recapture');
  if (explicit.length > 0) return explicit;

  if (filters.callStatuses.length > 0 && !filters.callStatuses.includes('User Dropped')) {
    return ['Rejected', 'Unable to Verify', 'Auditor Rejected', 'Recapture'];
  }
  return undefined;
}

function genCustomerIssues(filters: ReportFilters): ReportResult {
  const range = resolveRange(filters);
  const partners = partnerScope(filters);
  const statuses = mapNonApprovedStatuses(filters);
  const cases = getNonApprovedCases({ range, partnerIds: partners, statuses });

  const rows = cases.map((c) => ({
    Timestamp: c.timestamp.slice(0, 19).replace('T', ' '),
    'App ID': c.appId,
    Customer: c.customerName,
    Partner: c.partnerName,
    Agent: c.agentName,
    'Issue Category': c.reasonCategory,
    'Sub-reason': c.reason,
    Remarks: c.remarks || '—',
    'Final Outcome': c.status,
  }));

  return { columns: pickColumns(ISSUES_ALL_COLUMNS, filters.columns), rows };
}

// ─── VKYC Daily Dashboard ────────────────────────────────────────────────────

const SHIFT_LABELS = ['1st Shift (08:00–17:00)', '2nd Shift (12:00–21:00)', '3rd Shift (14:00–23:00)'];

function shiftBucket(agentId: string): number {
  return hashId(`${agentId}-shift`) % 3;
}

function buildAgentAllocationSection(allocation: AllocationResult, partners: PartnerId[], day: string): ReportSection {
  const presentAgentIds = new Set(attendance.filter((a) => a.date === day).map((a) => a.agentId));
  const rows: Record<string, string | number>[] = [];
  let totalApproved = 0;
  let totalShrink = 0;
  const shiftTotals = [0, 0, 0];
  let grandTotal = 0;

  for (const pid of partners) {
    const p = allocation.partners.find((x) => x.partnerId === pid);
    const agentsForPartner = p?.agents ?? [];
    const approvedHeadcount = agentsForPartner.length;
    const shrinkage = Math.round(approvedHeadcount * 0.8);
    const shiftCounts = [0, 0, 0];
    for (const a of agentsForPartner) {
      if (!presentAgentIds.has(a.id)) continue;
      shiftCounts[shiftBucket(a.id)] += 1;
    }
    const presentTotal = shiftCounts[0] + shiftCounts[1] + shiftCounts[2];
    totalApproved += approvedHeadcount;
    totalShrink += shrinkage;
    shiftTotals[0] += shiftCounts[0];
    shiftTotals[1] += shiftCounts[1];
    shiftTotals[2] += shiftCounts[2];
    grandTotal += presentTotal;

    rows.push({
      'Partner Name': partnerName(pid),
      'Approved Headcount': approvedHeadcount,
      'Headcount with Shrinkage': shrinkage,
      [SHIFT_LABELS[0]]: shiftCounts[0],
      [SHIFT_LABELS[1]]: shiftCounts[1],
      [SHIFT_LABELS[2]]: shiftCounts[2],
      'Total Present': presentTotal,
    });
  }

  rows.push({
    'Partner Name': 'Total',
    'Approved Headcount': totalApproved,
    'Headcount with Shrinkage': totalShrink,
    [SHIFT_LABELS[0]]: shiftTotals[0],
    [SHIFT_LABELS[1]]: shiftTotals[1],
    [SHIFT_LABELS[2]]: shiftTotals[2],
    'Total Present': grandTotal,
  });

  return {
    title: 'Agent Allocation',
    columns: ['Partner Name', 'Approved Headcount', 'Headcount with Shrinkage', ...SHIFT_LABELS, 'Total Present'],
    rows,
  };
}

const WAIT_HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08..20

function fmtHourRange(h: number): string {
  return `${pad(h)}:00–${pad(h + 1)}:00`;
}

function buildWaitSummarySection(title: string, callsInScope: CallRecord[]): ReportSection {
  const hourly = WAIT_HOURS.map((h) => callsInScope.filter((c) => new Date(c.timestamp).getHours() === h));

  const answered = (subset: CallRecord[]) => subset.filter((c) => c.answered);
  const dropped = (subset: CallRecord[]) => subset.filter((c) => !c.answered);
  const waitBucket = (subset: CallRecord[], min: number, max: number) =>
    answered(subset).filter((c) => c.agentWaitSec >= min && c.agentWaitSec <= max).length;

  const metricRow = (label: string, calc: (subset: CallRecord[]) => string | number): Record<string, string | number> => {
    const row: Record<string, string | number> = { Metric: label, Total: calc(callsInScope) };
    WAIT_HOURS.forEach((h, i) => { row[fmtHourRange(h)] = calc(hourly[i]); });
    return row;
  };

  const rows = [
    metricRow('Connected', (s) => answered(s).length),
    metricRow('Unique Abandoned', (s) => new Set(dropped(s).map((c) => c.customerId)).size),
    metricRow('Connected in 0–1 min', (s) => waitBucket(s, 0, 60)),
    metricRow('Connected in 1–3 min', (s) => waitBucket(s, 61, 180)),
    metricRow('Connected in 3–5 min', (s) => waitBucket(s, 181, 300)),
    metricRow('Connected in 5–7 min', (s) => waitBucket(s, 301, 420)),
    metricRow('Connected in 7–10 min', (s) => waitBucket(s, 421, 600)),
    metricRow('Connected in >10 min', (s) => waitBucket(s, 601, Infinity)),
    metricRow('Max Wait Time', (s) => {
      const a = answered(s);
      return formatDuration(a.length > 0 ? a.reduce((m, c) => Math.max(m, c.agentWaitSec), 0) : 0);
    }),
    metricRow('Avg Wait Time', (s) => {
      const a = answered(s);
      return formatDuration(a.length > 0 ? Math.round(a.reduce((x, c) => x + c.agentWaitSec, 0) / a.length) : 0);
    }),
    metricRow('AHT', (s) => {
      const c2 = answered(s).filter((c) => c.agentStatus !== 'Unable to Verify');
      return formatDuration(c2.length > 0 ? Math.round(c2.reduce((x, c) => x + c.durationSec, 0) / c2.length) : 0);
    }),
    metricRow('Approval %', (s) => {
      const a = answered(s);
      const app = a.filter((c) => c.agentStatus === 'Approved').length;
      return a.length > 0 ? `${Math.round((app / a.length) * 1000) / 10}%` : '0%';
    }),
  ];

  return { title, columns: ['Metric', 'Total', ...WAIT_HOURS.map(fmtHourRange)], rows };
}

function genDailyDashboard(filters: ReportFilters): ReportResult {
  const range = resolveRange(filters);
  const partners = partnerScope(filters);
  const partnerSet = new Set(partners);
  const scoped = calls.filter((c) => {
    const ts = new Date(c.timestamp);
    return ts >= range.start && ts <= range.end && partnerSet.has(c.partnerId);
  });

  const allocation = getAgentAllocationByPartner();
  const allocationSection = buildAgentAllocationSection(allocation, partners, filters.dateTo);
  const waitSections = [
    buildWaitSummarySection('Wait Time Summary — Overall FTD', scoped),
    ...partners.map((pid) => buildWaitSummarySection(`Wait Time Summary — ${partnerName(pid)}`, scoped.filter((c) => c.partnerId === pid))),
  ];

  const sections = [allocationSection, ...waitSections];
  const flatRows = sections.flatMap((s) => s.rows);
  return { columns: allocationSection.columns, rows: flatRows, sections };
}

// ─── V-KYC Partner Summary ───────────────────────────────────────────────────

function buildPartnerSummarySection(pid: PartnerId, range: DateRange): ReportSection {
  const funnel = getPartnerFunnel({ range, partnerIds: [pid] });
  const fleet = getProductivityFleetSummary(range, [pid]);
  const tat = getPartnerTatTable({ range, partnerIds: [pid] })[0];
  const allocation = getAgentAllocationByPartner().partners.find((p) => p.partnerId === pid);
  const cases = getNonApprovedCases({ range, partnerIds: [pid] });

  const reasonTally = new Map<string, number>();
  for (const c of cases) {
    const label = c.status === 'User Dropped' ? (c.call.dropStage ?? 'Before connecting') : c.reason;
    reasonTally.set(label, (reasonTally.get(label) ?? 0) + 1);
  }
  const topReasons = [...reasonTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const totalLeads = funnel[0]?.count || 1;

  const rows: Record<string, string | number>[] = [];
  funnel.forEach((stage) => {
    rows.push({
      Metric: stage.stage,
      Value: stage.count,
      '% of Leads': `${Math.round((stage.count / totalLeads) * 1000) / 10}%`,
    });
  });
  if (topReasons.length === 0) {
    rows.push({ Metric: 'Top Failure Reasons', Value: 'None in range', '% of Leads': '—' });
  } else {
    topReasons.forEach(([reason, count], idx) => {
      rows.push({ Metric: `Top Failure Reason #${idx + 1}`, Value: `${reason} (${count})`, '% of Leads': '—' });
    });
  }
  rows.push({ Metric: 'Avg TAT (min)', Value: tat?.avgTatMin ?? 0, '% of Leads': '—' });
  rows.push({ Metric: 'Agents Allocated — Dedicated', Value: allocation?.dedicatedCount ?? 0, '% of Leads': '—' });
  rows.push({ Metric: 'Agents Allocated — Shared', Value: allocation?.sharedCount ?? 0, '% of Leads': '—' });
  rows.push({ Metric: 'CSAT', Value: fleet.csat, '% of Leads': '—' });

  return { title: `V-KYC Summary — ${partnerName(pid)}`, columns: ['Metric', 'Value', '% of Leads'], rows };
}

function genPartnerSummary(filters: ReportFilters): ReportResult {
  const range = resolveRange(filters);
  const partners = partnerScope(filters);
  const sections = partners.map((pid) => buildPartnerSummarySection(pid, range));
  const flatRows = sections.flatMap((s) => s.rows);
  return { columns: sections[0]?.columns ?? ['Metric', 'Value', '% of Leads'], rows: flatRows, sections };
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export function generateReport(type: ReportType, filters: ReportFilters): ReportResult {
  switch (type) {
    case 'standard_mis':
      return genStandardMis(filters);
    case 'active_users':
      return genActiveUsers(filters);
    case 'user_productivity':
      return genUserProductivity(filters);
    case 'vkyc_daily_dashboard':
      return genDailyDashboard(filters);
    case 'partner_daywise':
      return genPartnerDaywise(filters);
    case 'vkyc_partner_summary':
      return genPartnerSummary(filters);
    case 'customer_issues':
      return genCustomerIssues(filters);
    default:
      return { columns: [], rows: [] };
  }
}

export function getReportRowCount(type: ReportType, filters: ReportFilters): number {
  return generateReport(type, filters).rows.length;
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCsvBlock(columns: string[], rows: Record<string, string | number>[]): string {
  const header = columns.map((c) => csvEscape(c)).join(',');
  const dataRows = rows.map((r) => columns.map((c) => csvEscape(String(r[c] ?? ''))).join(','));
  return [header, ...dataRows].join('\n');
}

export function buildReportCsv(result: ReportResult): string {
  if (result.sections && result.sections.length > 0) {
    return result.sections
      .map((sec) => [`# ${sec.title}`, buildCsvBlock(sec.columns, sec.rows)].join('\n'))
      .join('\n\n');
  }
  return buildCsvBlock(result.columns, result.rows);
}

// ─── Params summary (for history table + params column) ────────────────────

function datePresetLabel(filters: ReportFilters): string {
  switch (filters.datePreset) {
    case 'today':
      return 'Today';
    case 'yesterday':
      return 'Yesterday';
    case '7d':
      return '7D';
    case '30d':
      return '30D';
    default:
      return filters.dateFrom === filters.dateTo ? filters.dateFrom : `${filters.dateFrom} → ${filters.dateTo}`;
  }
}

function partnersLabel(filters: ReportFilters): string {
  const all = PARTNERS.map((p) => p.id);
  if (filters.partnerIds.length === 0 || filters.partnerIds.length >= all.length) return 'All partners';
  return filters.partnerIds.map((id) => partnerName(id)).join(', ');
}

function statusLabel(filters: ReportFilters): string {
  if (filters.callStatuses.length === 1 && filters.callStatuses[0] === 'User Dropped'
    && filters.agentStatuses.length === 0 && filters.auditorDecisions.length === 0) {
    return 'Dropped only';
  }
  if (filters.callStatuses.length === 1 && filters.callStatuses[0] === 'Connected'
    && filters.agentStatuses.length === 0 && filters.auditorDecisions.length === 0) {
    return 'Connected only';
  }
  const parts: string[] = [];
  if (filters.callStatuses.length > 0) parts.push(filters.callStatuses.join('/'));
  if (filters.agentStatuses.length > 0) parts.push(filters.agentStatuses.join('/'));
  if (filters.auditorDecisions.length > 0) parts.push(filters.auditorDecisions.join('/'));
  return parts.length > 0 ? parts.join(', ') : 'No status filters';
}

function roleLabel(filters: ReportFilters): string {
  if (filters.roles.length === 0 || filters.roles.length >= 3) return 'All roles';
  return filters.roles.join('/');
}

export function buildParamsSummary(type: ReportType, filters: ReportFilters): string {
  const catalog = getCatalogEntry(type);
  const parts: string[] = [datePresetLabel(filters)];
  if (catalog.filters.partner) parts.push(partnersLabel(filters));
  if (catalog.filters.status) parts.push(statusLabel(filters));
  if (catalog.filters.role) parts.push(roleLabel(filters));
  return parts.join(' · ');
}
