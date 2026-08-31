import { useSyncExternalStore } from 'react';
import { agents, auditors, calls, customers } from './datasets';
import type { Agent, AuditReallocation, AuditorStatusLevel, CallRecord, Customer } from './types';

/**
 * Auditor workspace store. Pending cases are auto-assigned round-robin to
 * online auditors (capacity-aware). Admins can reallocate with a mandatory
 * reason. Decisions submitted during the session leave the pending queue.
 */

export type AuditorReviewDecision = Extract<AuditorStatusLevel, 'Approved' | 'Recapture' | 'Rejected'>;

export interface AuditorSessionDecision {
  callId: string;
  decision: AuditorReviewDecision;
  reason: string | null;
  remarks: string;
  decidedAt: string;
  decisionTimeSec: number;
}

export type AssignmentSource = 'auto' | 'admin';

export interface CaseAssignment {
  auditorId: string;
  assignedAt: string;
  source: AssignmentSource;
  assignedByName?: string;
}

export interface PendingCase {
  call: CallRecord;
  customer: Customer;
  agent: Agent;
  approvedAt: string;
  attemptNumber: number;
  previousAttempt: { date: string; decision: string } | null;
  assignment: CaseAssignment;
  reallocations: AuditReallocation[];
}

export interface AuditorDecisionRecord {
  call: CallRecord;
  customer: Customer;
  agent: Agent;
  decision: AuditorReviewDecision;
  reason: string | null;
  remarks: string;
  decidedAt: string;
  decisionTimeSec: number | null;
  live: boolean;
}

const customerMap = new Map(customers.map((c) => [c.id, c]));
const agentMap = new Map(agents.map((a) => [a.id, a]));
const auditorMap = new Map(auditors.map((a) => [a.id, a]));

/** First seeded auditor is the logged-in identity for the demo. */
export const SEED_AUDITOR = auditors[0];

/** Demo: first half of auditors are "online" for capacity-aware assignment. */
const ONLINE_AUDITOR_IDS = auditors.slice(0, Math.max(2, Math.ceil(auditors.length / 2))).map((a) => a.id);

const attemptMeta = (() => {
  const byCustomer = new Map<string, CallRecord[]>();
  for (const c of calls) {
    const arr = byCustomer.get(c.customerId) ?? [];
    arr.push(c);
    byCustomer.set(c.customerId, arr);
  }
  const attempt = new Map<string, number>();
  const prev = new Map<string, { date: string; decision: string } | null>();
  for (const arr of byCustomer.values()) {
    arr.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    arr.forEach((c, i) => {
      attempt.set(c.id, i + 1);
      if (i === 0) {
        prev.set(c.id, null);
      } else {
        const p = arr[i - 1];
        const decision = p.callStatus === 'User Dropped'
          ? 'Call dropped'
          : p.agentStatus ?? 'Completed';
        prev.set(c.id, { date: p.timestamp.slice(0, 10), decision });
      }
    });
  }
  return { attempt, prev };
})();

function approvedAtFor(call: CallRecord): string {
  const base = call.answeredAt ?? call.timestamp;
  const ms = new Date(base).getTime() + (call.durationSec + call.reviewTimeSec) * 1000;
  return new Date(ms).toISOString();
}

/** Round-robin + capacity-aware (max ~8 open cases per auditor). */
function autoAssignAuditor(index: number, load: Map<string, number>): string {
  const CAPACITY = 8;
  const ordered = [...ONLINE_AUDITOR_IDS];
  for (let offset = 0; offset < ordered.length; offset++) {
    const id = ordered[(index + offset) % ordered.length];
    if ((load.get(id) ?? 0) < CAPACITY) {
      load.set(id, (load.get(id) ?? 0) + 1);
      return id;
    }
  }
  const fallback = ordered[index % ordered.length];
  load.set(fallback, (load.get(fallback) ?? 0) + 1);
  return fallback;
}

function buildBasePending(): PendingCase[] {
  const load = new Map<string, number>();
  const raw = calls
    .filter((c) => c.callStatus === 'Connected' && c.agentStatus === 'Approved' && c.auditorDecision === 'In Review')
    .map((call) => {
      const customer = customerMap.get(call.customerId);
      const agent = agentMap.get(call.agentId);
      if (!customer || !agent) return null;
      return {
        call,
        customer,
        agent,
        approvedAt: approvedAtFor(call),
        attemptNumber: attemptMeta.attempt.get(call.id) ?? 1,
        previousAttempt: attemptMeta.prev.get(call.id) ?? null,
      };
    })
    .filter((v): v is NonNullable<typeof v> => !!v)
    .sort((a, b) => a.approvedAt.localeCompare(b.approvedAt));

  return raw.map((row, i) => {
    const auditorId = autoAssignAuditor(i, load);
    const assignedAt = new Date(new Date(row.approvedAt).getTime() + 1000).toISOString();
    return {
      ...row,
      assignment: { auditorId, assignedAt, source: 'auto' as const },
      reallocations: [] as AuditReallocation[],
    };
  });
}

let BASE_PENDING: PendingCase[] = buildBasePending();

function seededHistoryFor(auditorId: string): AuditorDecisionRecord[] {
  return calls
    .filter(
      (c) =>
        c.auditorId === auditorId
        && c.auditorDecision !== undefined
        && c.auditorDecision !== 'In Review',
    )
    .map((call): AuditorDecisionRecord | null => {
      const customer = customerMap.get(call.customerId);
      const agent = agentMap.get(call.agentId);
      if (!customer || !agent) return null;
      return {
        call,
        customer,
        agent,
        decision: call.auditorDecision as AuditorReviewDecision,
        reason: call.auditorReason,
        remarks: call.auditorRemarks ?? '',
        decidedAt: call.auditorReviewedAt ?? call.timestamp,
        decisionTimeSec: null,
        live: false,
      };
    })
    .filter((v): v is AuditorDecisionRecord => !!v)
    .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
}

interface AuditorState {
  decisions: AuditorSessionDecision[];
  /** Session overrides of assignment keyed by callId. */
  assignmentOverrides: Record<string, CaseAssignment>;
  reallocations: AuditReallocation[];
  /** Bumped to notify listeners of reallocation. */
  version: number;
}

let state: AuditorState = {
  decisions: [],
  assignmentOverrides: {},
  reallocations: [],
  version: 0,
};

const listeners = new Set<() => void>();

function emit(next: AuditorState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AuditorState {
  return state;
}

export function useAuditorSession(): AuditorState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

function withAssignments(cases: PendingCase[]): PendingCase[] {
  return cases.map((c) => {
    const override = state.assignmentOverrides[c.call.id];
    const reallocations = state.reallocations.filter((r) => r.caseId === c.call.id);
    if (!override && reallocations.length === 0) return c;
    return {
      ...c,
      assignment: override ?? c.assignment,
      reallocations: [...c.reallocations, ...reallocations],
    };
  });
}

export function submitAuditorDecision(input: {
  callId: string;
  decision: AuditorReviewDecision;
  reason: string | null;
  remarks: string;
  decisionTimeSec: number;
}): void {
  const record: AuditorSessionDecision = {
    callId: input.callId,
    decision: input.decision,
    reason: input.reason,
    remarks: input.remarks,
    decidedAt: new Date().toISOString(),
    decisionTimeSec: input.decisionTimeSec,
  };
  emit({ ...state, decisions: [record, ...state.decisions], version: state.version + 1 });
}

/** All pending cases still open (any auditor). */
export function getPendingQueue(): PendingCase[] {
  const decided = new Set(state.decisions.map((d) => d.callId));
  return withAssignments(BASE_PENDING).filter((c) => !decided.has(c.call.id));
}

/** Cases assigned to a specific auditor, FIFO by assignment time. */
export function getMyPendingQueue(auditorId: string): PendingCase[] {
  return getPendingQueue()
    .filter((c) => c.assignment.auditorId === auditorId)
    .sort((a, b) => a.assignment.assignedAt.localeCompare(b.assignment.assignedAt));
}

export function getPendingCase(callId: string): PendingCase | null {
  const decided = new Set(state.decisions.map((d) => d.callId));
  if (decided.has(callId)) return null;
  return withAssignments(BASE_PENDING).find((c) => c.call.id === callId) ?? null;
}

export function getNextPendingCase(afterCallId: string, auditorId = SEED_AUDITOR.id): PendingCase | null {
  const queue = getMyPendingQueue(auditorId);
  if (queue.length === 0) return null;
  const idx = queue.findIndex((c) => c.call.id === afterCallId);
  if (idx === -1) return queue[0];
  return queue[idx + 1] ?? queue[0] ?? null;
}

export function getAuditorQueueStats(): { totalPending: number; auditorCount: number } {
  const queue = getPendingQueue();
  const auditorCount = new Set(queue.map((c) => c.assignment.auditorId)).size;
  return { totalPending: queue.length, auditorCount };
}

export function getOnlineAuditorsForAllocation(): { id: string; name: string; openCount: number }[] {
  const queue = getPendingQueue();
  return ONLINE_AUDITOR_IDS.map((id) => ({
    id,
    name: auditorMap.get(id)?.name ?? id,
    openCount: queue.filter((c) => c.assignment.auditorId === id).length,
  }));
}

export function reallocateCase(input: {
  caseId: string;
  toAuditorId: string;
  byAdminId: string;
  byAdminName: string;
  reason: string;
}): AuditReallocation | null {
  const pending = getPendingCase(input.caseId);
  if (!pending) return null;
  const fromAuditorId = pending.assignment.auditorId;
  if (fromAuditorId === input.toAuditorId) return null;

  const entry: AuditReallocation = {
    id: `realloc-${Date.now()}`,
    caseId: input.caseId,
    fromAuditorId,
    toAuditorId: input.toAuditorId,
    byAdminId: input.byAdminId,
    byAdminName: input.byAdminName,
    reason: input.reason.trim(),
    at: new Date().toISOString(),
  };

  const assignment: CaseAssignment = {
    auditorId: input.toAuditorId,
    assignedAt: entry.at,
    source: 'admin',
    assignedByName: input.byAdminName,
  };

  emit({
    ...state,
    assignmentOverrides: { ...state.assignmentOverrides, [input.caseId]: assignment },
    reallocations: [entry, ...state.reallocations],
    version: state.version + 1,
  });
  return entry;
}

export function getReallocations(caseId?: string): AuditReallocation[] {
  if (!caseId) return state.reallocations;
  return state.reallocations.filter((r) => r.caseId === caseId);
}

export function getAllPendingForAdmin(): PendingCase[] {
  return getPendingQueue();
}

export function getAuditorDecisionHistory(auditorId: string): AuditorDecisionRecord[] {
  const live: AuditorDecisionRecord[] = state.decisions
    .map((d): AuditorDecisionRecord | null => {
      const base = BASE_PENDING.find((c) => c.call.id === d.callId);
      if (!base) return null;
      return {
        call: base.call,
        customer: base.customer,
        agent: base.agent,
        decision: d.decision,
        reason: d.reason,
        remarks: d.remarks,
        decidedAt: d.decidedAt,
        decisionTimeSec: d.decisionTimeSec,
        live: true,
      };
    })
    .filter((v): v is AuditorDecisionRecord => !!v);

  return [...live, ...seededHistoryFor(auditorId)].sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
}

export function getAuditorName(auditorId: string | null | undefined): string {
  if (!auditorId) return '—';
  return auditorMap.get(auditorId)?.name ?? auditorId;
}
