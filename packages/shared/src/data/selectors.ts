import type { AgentStats, AttendanceRecord, AuditorAttendanceRecord, CallRecord, DateRange, EfficiencyScore, PartnerId } from './types';
import { EFFICIENCY_CONFIG } from '../lib/constants';

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function getDateRangeFromPreset(preset: string): DateRange {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);

  switch (preset) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case '7d':
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    case '30d':
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      break;
    case '90d':
    default:
      start.setDate(start.getDate() - 89);
      start.setHours(0, 0, 0, 0);
      break;
  }
  return { start, end };
}

function filterCalls(
  calls: CallRecord[],
  agentId: string,
  range: DateRange,
  partners?: PartnerId[],
): CallRecord[] {
  return calls.filter((c) => {
    if (c.agentId !== agentId) return false;
    const ts = new Date(c.timestamp);
    if (ts < range.start || ts > range.end) return false;
    if (partners && partners.length > 0 && !partners.includes(c.partnerId)) return false;
    return true;
  });
}

export function getCallDropRate(
  calls: CallRecord[],
  agentId: string,
  range: DateRange,
  partners?: PartnerId[],
): number | null {
  const routed = filterCalls(calls, agentId, range, partners);
  if (routed.length === 0) return null;
  const unanswered = routed.filter((c) => c.callStatus === 'User Dropped').length;
  return Math.round((unanswered / routed.length) * 1000) / 10;
}

export function getAvgAgentWaitSec(
  calls: CallRecord[],
  agentId: string,
  range: DateRange,
  partners?: PartnerId[],
): number {
  const answered = filterCalls(calls, agentId, range, partners).filter((c) => c.callStatus === 'Connected');
  if (answered.length === 0) return 0;
  return Math.round(answered.reduce((s, c) => s + c.agentWaitSec, 0) / answered.length);
}

export function getAvgReviewTimeSec(
  calls: CallRecord[],
  agentId: string,
  range: DateRange,
  partners?: PartnerId[],
): number {
  const decided = filterCalls(calls, agentId, range, partners).filter(
    (c) => c.callStatus === 'Connected' && c.agentStatus !== 'Unable to Verify',
  );
  if (decided.length === 0) return 0;
  return Math.round(decided.reduce((s, c) => s + c.reviewTimeSec, 0) / decided.length);
}

function scoreCallTime(avgCallSec: number): number {
  const { min, max } = EFFICIENCY_CONFIG.callTimeBandSec;
  const { below, above } = EFFICIENCY_CONFIG.callTimeZeroSec;
  if (avgCallSec >= min && avgCallSec <= max) return 100;
  if (avgCallSec < min) return clamp(100 * ((avgCallSec - below) / (min - below)));
  return clamp(100 * ((above - avgCallSec) / (above - max)));
}

function scoreReview(avgReviewSec: number): number {
  const floor = EFFICIENCY_CONFIG.reviewFloorSec;
  const zero = EFFICIENCY_CONFIG.reviewZeroSec;
  return clamp(100 * (1 - (avgReviewSec - floor) / (zero - floor)));
}

function avgDailyOnlineHrs(attendanceRows: AttendanceRecord[]): number {
  if (attendanceRows.length === 0) return 0;
  const totalHrs = attendanceRows.reduce((s, a) => s + a.totalOnlineMin, 0) / 60;
  return totalHrs / attendanceRows.length;
}

export function getEfficiencyScore(
  calls: CallRecord[],
  agentId: string,
  range: DateRange,
  attendance: AttendanceRecord[],
  partners?: PartnerId[],
): EfficiencyScore {
  const routed = filterCalls(calls, agentId, range, partners);
  if (routed.length === 0) return { score: null, components: null };

  const answered = routed.filter((c) => c.callStatus === 'Connected');
  const decided = answered.filter((c) => c.agentStatus !== 'Unable to Verify');
  const attendanceRows = getAgentAttendance(attendance, agentId, range);

  const callDropRate = getCallDropRate(calls, agentId, range, partners) ?? 0;
  const S_answer = clamp(100 - callDropRate);

  const avgWaitSec = answered.length > 0
    ? answered.reduce((s, c) => s + c.agentWaitSec, 0) / answered.length
    : 0;
  const S_wait = clamp(100 * (1 - avgWaitSec / EFFICIENCY_CONFIG.rerouteCapSec));

  const avgCallSec = decided.length > 0
    ? decided.reduce((s, c) => s + c.durationSec, 0) / decided.length
    : 0;
  const S_callTime = scoreCallTime(avgCallSec);

  const avgReviewSec = decided.length > 0
    ? decided.reduce((s, c) => s + c.reviewTimeSec, 0) / decided.length
    : 0;
  const S_review = scoreReview(avgReviewSec);

  const onlineHrs = avgDailyOnlineHrs(attendanceRows);
  const S_online = clamp(100 * Math.min(1, onlineHrs / EFFICIENCY_CONFIG.onlineTargetHrs));

  const w = EFFICIENCY_CONFIG.weights;
  const score = Math.round((
    w.answer * S_answer
    + w.wait * S_wait
    + w.callTime * S_callTime
    + w.review * S_review
    + w.online * S_online
  ) * 10) / 10;

  return {
    score,
    components: [
      {
        label: 'Answer Rate',
        rawValue: `Call Drop Rate ${callDropRate.toFixed(1)}%`,
        score: Math.round(S_answer * 10) / 10,
        weight: w.answer,
      },
      {
        label: 'Wait Time',
        rawValue: `Avg Wait ${Math.round(avgWaitSec)}s`,
        score: Math.round(S_wait * 10) / 10,
        weight: w.wait,
      },
      {
        label: 'Call Time',
        rawValue: `Avg Call ${Math.round(avgCallSec)}s`,
        score: Math.round(S_callTime * 10) / 10,
        weight: w.callTime,
      },
      {
        label: 'Review Time',
        rawValue: `Avg Review ${Math.round(avgReviewSec)}s`,
        score: Math.round(S_review * 10) / 10,
        weight: w.review,
      },
      {
        label: 'Online Time',
        rawValue: `Avg Online ${onlineHrs.toFixed(1)}h/day`,
        score: Math.round(S_online * 10) / 10,
        weight: w.online,
      },
    ],
  };
}

export function getAgentStats(
  calls: CallRecord[],
  agentId: string,
  range: DateRange,
  partners?: PartnerId[],
  attendance?: AttendanceRecord[],
): AgentStats {
  const filtered = filterCalls(calls, agentId, range, partners);
  const answered = filtered.filter((c) => c.callStatus === 'Connected');
  const completed = answered.filter((c) => c.agentStatus !== 'Unable to Verify');
  const approved = filtered.filter((c) => c.agentStatus === 'Approved').length;
  const rejected = filtered.filter((c) => c.agentStatus === 'Rejected').length;
  const failed = filtered.filter((c) => c.agentStatus === 'Unable to Verify' || c.callStatus === 'User Dropped').length;
  const callsTaken = filtered.length;

  const avgCallTimeSec =
    completed.length > 0
      ? Math.round(completed.reduce((s, c) => s + c.durationSec, 0) / completed.length)
      : 0;
  const avgWaitSec = getAvgAgentWaitSec(calls, agentId, range, partners);
  const avgReviewSec = getAvgReviewTimeSec(calls, agentId, range, partners);
  const callDropRate = getCallDropRate(calls, agentId, range, partners);

  const approvalRate = callsTaken > 0 ? Math.round((approved / callsTaken) * 100) : 0;

  const reviewed = filtered.filter(
    (c) => c.auditorDecision !== undefined && c.auditorDecision !== 'In Review' && c.agentStatus !== 'Unable to Verify',
  );
  const upheld = reviewed.filter((c) => {
    if (c.agentStatus === 'Approved') return c.auditorDecision === 'Approved';
    if (c.agentStatus === 'Rejected') return c.auditorDecision === 'Approved';
    return false;
  });
  const accuracy = reviewed.length > 0 ? Math.round((upheld.length / reviewed.length) * 100) : 95;

  const efficiencyResult = getEfficiencyScore(
    calls,
    agentId,
    range,
    attendance ?? [],
    partners,
  );

  return {
    callsTaken,
    approved,
    rejected,
    failed,
    approvalRate,
    avgCallTimeSec,
    avgWaitSec,
    avgReviewSec,
    callDropRate,
    efficiency: efficiencyResult.score,
    accuracy,
  };
}

export function getDailyCallTrend(
  calls: CallRecord[],
  agentId: string,
  range: DateRange,
  partners?: PartnerId[],
) {
  const filtered = filterCalls(calls, agentId, range, partners);
  const byDay = new Map<string, { approved: number; rejected: number; failed: number }>();

  filtered.forEach((c) => {
    const day = c.timestamp.slice(0, 10);
    const entry = byDay.get(day) ?? { approved: 0, rejected: 0, failed: 0 };
    if (c.agentStatus === 'Approved') entry.approved++;
    else if (c.agentStatus === 'Rejected') entry.rejected++;
    else entry.failed++;
    byDay.set(day, entry);
  });

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));
}

export function getAccuracyTrend(
  calls: CallRecord[],
  agentId: string,
  range: DateRange,
  partners?: PartnerId[],
) {
  const filtered = filterCalls(calls, agentId, range, partners);
  const byDay = new Map<string, CallRecord[]>();

  filtered.forEach((c) => {
    const day = c.timestamp.slice(0, 10);
    const arr = byDay.get(day) ?? [];
    arr.push(c);
    byDay.set(day, arr);
  });

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayCalls]) => {
      const reviewed = dayCalls.filter((c) => c.auditorDecision !== undefined && c.auditorDecision !== 'In Review' && c.agentStatus !== 'Unable to Verify');
      const upheld = reviewed.filter((c) => {
        if (c.agentStatus === 'Approved') return c.auditorDecision === 'Approved';
        if (c.agentStatus === 'Rejected') return c.auditorDecision === 'Approved';
        return false;
      });
      const accuracy = reviewed.length > 0 ? Math.round((upheld.length / reviewed.length) * 100) : 95;
      return { date, accuracy };
    });
}

export function getCallTimeTrend(
  calls: CallRecord[],
  agentId: string,
  range: DateRange,
  partners?: PartnerId[],
) {
  const filtered = filterCalls(calls, agentId, range, partners);
  const byDay = new Map<string, number[]>();

  filtered.forEach((c) => {
    if (c.agentStatus === 'Unable to Verify' || c.callStatus === 'User Dropped') return;
    const day = c.timestamp.slice(0, 10);
    const arr = byDay.get(day) ?? [];
    arr.push(c.durationSec);
    byDay.set(day, arr);
  });

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, durations]) => ({
      date,
      avgCallTime: Math.round(durations.reduce((s, d) => s + d, 0) / durations.length / 60),
    }));
}

export function getEfficiencyTrend(
  calls: CallRecord[],
  agentId: string,
  range: DateRange,
  attendance: AttendanceRecord[],
  partners?: PartnerId[],
) {
  const filtered = filterCalls(calls, agentId, range, partners);
  const days = [...new Set(filtered.map((c) => c.timestamp.slice(0, 10)))].sort();

  return days.map((date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    const result = getEfficiencyScore(calls, agentId, { start: dayStart, end: dayEnd }, attendance, partners);
    return { date, efficiency: result.score ?? 0 };
  });
}

export function getAuditorOutcomes(
  calls: CallRecord[],
  customers: { id: string; name: string; appId: string }[],
  agentId: string,
  range: DateRange,
  overturnedOnly = false,
) {
  const customerMap = new Map(customers.map((c) => [c.id, c]));
  return filterCalls(calls, agentId, range)
    .filter((c) => c.auditorDecision !== undefined && c.auditorDecision !== 'In Review')
    .filter((c) => {
      if (!overturnedOnly) return true;
      if (c.agentStatus === 'Approved') return c.auditorDecision !== 'Approved';
      if (c.agentStatus === 'Rejected') return c.auditorDecision === 'Approved';
      return false;
    })
    .map((c) => {
      const customer = customerMap.get(c.customerId);
      return {
        ...c,
        customerName: customer?.name ?? 'Unknown',
        appId: customer?.appId ?? '—',
      };
    });
}

export function getTodayStats(calls: CallRecord[], agentId: string, attendance?: AttendanceRecord[]): AgentStats {
  return getAgentStats(calls, agentId, getDateRangeFromPreset('today'), undefined, attendance);
}

export function getAgentAttendance(
  attendance: AttendanceRecord[],
  agentId: string,
  range: DateRange,
) {
  return attendance
    .filter((a) => {
      if (a.agentId !== agentId) return false;
      const d = new Date(a.date);
      return d >= range.start && d <= range.end;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getAuditorAttendance(
  attendance: AuditorAttendanceRecord[],
  auditorId: string,
  range: DateRange,
) {
  return attendance
    .filter((a) => {
      if (a.auditorId !== auditorId) return false;
      const d = new Date(a.date);
      return d >= range.start && d <= range.end;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getProductiveHours(attendance: { totalOnlineMin: number; totalBreakMin: number; idleMin: number }[]): number {
  const totalMin = attendance.reduce(
    (s, a) => s + a.totalOnlineMin - a.totalBreakMin - a.idleMin,
    0,
  );
  return Math.max(1, totalMin / 60);
}
