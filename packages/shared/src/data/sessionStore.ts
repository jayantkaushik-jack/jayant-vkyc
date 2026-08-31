import { useSyncExternalStore } from 'react';
import { agents as seedAgents, auditors as seedAuditors } from './datasets';
import { generateAdmins, generateQueues } from './generate';
import type { AdminConfigState, AdminUser, Agent, Auditor, PartnerId, Queue } from './types';
import {
  DEFAULT_THRESHOLDS,
  DEFAULT_VIRTUAL_BACKGROUND,
  SBM_SAMPLE_VIRTUAL_BACKGROUND,
} from '../lib/thresholds';
import { DEFAULT_SERVICE_HOURS } from '../lib/serviceHours';

/**
 * In-memory roster + config store layered on top of the seeded demo datasets.
 *
 * Agents/auditors/admins added or edited via the Users page wizards, plus
 * Configuration (queues, auto-answer, negative lists, thresholds), live here
 * for the lifetime of the tab (survives navigation, not a hard reload).
 */

export interface SessionRosterState {
  agents: Agent[];
  auditors: Auditor[];
  admins: AdminUser[];
  queues: Queue[];
  config: AdminConfigState;
}

const DEFAULT_CONFIG: AdminConfigState = {
  autoAnswer: false,
  blockedStates: ['Jammu & Kashmir'],
  blockedPinCodes: ['190001', '193101-193199'],
  maxBreakMinPerDay: 60,
  minOnlineHrsPerDay: 7.5,
  thresholds: { ...DEFAULT_THRESHOLDS },
  virtualBackground: {
    ...DEFAULT_VIRTUAL_BACKGROUND,
    activeUrl: SBM_SAMPLE_VIRTUAL_BACKGROUND,
    label: 'SBM sample',
  },
  serviceHours: {
    weekday: { ...DEFAULT_SERVICE_HOURS.weekday },
    weekend_holiday: { ...DEFAULT_SERVICE_HOURS.weekend_holiday },
    excludeNationalHolidays: DEFAULT_SERVICE_HOURS.excludeNationalHolidays,
  },
  alerts: {
    maxWaitingQueue: 25,
    maxAuditorBacklog: 40,
    noCallsIntervalMin: 30,
  },
  topPerformerKpi: 'efficiency',
};

let state: SessionRosterState = {
  agents: [...seedAgents],
  auditors: [...seedAuditors],
  admins: generateAdmins(),
  queues: generateQueues(seedAgents),
  config: { ...DEFAULT_CONFIG },
};

const listeners = new Set<() => void>();

function emit(next: SessionRosterState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): SessionRosterState {
  return state;
}

// ─── Reads ──────────────────────────────────────────────────────────────────

export function getSessionAgents(): Agent[] {
  return state.agents;
}

export function getSessionAuditors(): Auditor[] {
  return state.auditors;
}

export function getSessionAdmins(): AdminUser[] {
  return state.admins;
}

export function getSessionQueues(): Queue[] {
  return state.queues;
}

export function getAdminConfig(): AdminConfigState {
  return state.config;
}

/** Partners an agent serves, derived from queue membership (unique, stable order). */
export function getAgentPartnersFromQueues(agentId: string, queues = state.queues): PartnerId[] {
  const set = new Set<PartnerId>();
  for (const q of queues) {
    if (q.agentIds.includes(agentId)) {
      for (const p of q.partnerIds) set.add(p);
    }
  }
  const order = ['PAISABAZAAR', 'CREDILIO', 'NIYO', 'ZET', 'GENERAL'] as PartnerId[];
  return order.filter((p) => set.has(p));
}

// ─── ID generation (deterministic mock IDs when fields are left blank) ────

function nextSequence(ids: string[], prefix: string, digits: number): string {
  let max = 0;
  for (const id of ids) {
    if (!id.startsWith(prefix)) continue;
    const n = parseInt(id.slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(digits, '0')}`;
}

export function nextAgentEmployeeId(): string {
  return nextSequence(state.agents.map((a) => a.employeeId), 'AS', 6);
}

export function nextAuditorEmployeeId(): string {
  return nextSequence(state.auditors.map((a) => a.employeeId), 'AU', 6);
}

export function nextAdminEmployeeId(): string {
  return nextSequence(state.admins.map((a) => a.employeeId), 'AD', 4);
}

function nextInternalId(ids: string[], prefix: string): string {
  let max = 0;
  for (const id of ids) {
    if (!id.startsWith(`${prefix}-`)) continue;
    const n = parseInt(id.slice(prefix.length + 1), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

export function nextQueueId(): string {
  return nextSequence(state.queues.map((q) => q.id), 'Q', 1);
}

// ─── Writes ─────────────────────────────────────────────────────────────────

/** Creates a new agent (auto-assigns id if blank) or updates an existing one by id. */
export function upsertSessionAgent(agent: Omit<Agent, 'id'> & { id?: string }): Agent {
  const existingIdx = agent.id ? state.agents.findIndex((a) => a.id === agent.id) : -1;
  if (existingIdx >= 0) {
    const updated: Agent = { ...state.agents[existingIdx], ...agent, id: state.agents[existingIdx].id };
    const nextAgents = [...state.agents];
    nextAgents[existingIdx] = updated;
    emit({ ...state, agents: nextAgents });
    return updated;
  }
  const created: Agent = { ...agent, id: nextInternalId(state.agents.map((a) => a.id), 'agent') };
  emit({ ...state, agents: [...state.agents, created] });
  return created;
}

/** Creates a new auditor (auto-assigns id if blank) or updates an existing one by id. */
export function upsertSessionAuditor(auditor: Omit<Auditor, 'id'> & { id?: string }): Auditor {
  const existingIdx = auditor.id ? state.auditors.findIndex((a) => a.id === auditor.id) : -1;
  if (existingIdx >= 0) {
    const updated: Auditor = { ...state.auditors[existingIdx], ...auditor, id: state.auditors[existingIdx].id };
    const nextAuditors = [...state.auditors];
    nextAuditors[existingIdx] = updated;
    emit({ ...state, auditors: nextAuditors });
    return updated;
  }
  const created: Auditor = { ...auditor, id: nextInternalId(state.auditors.map((a) => a.id), 'auditor') };
  emit({ ...state, auditors: [...state.auditors, created] });
  return created;
}

/** Creates a new admin (auto-assigns id if blank) or updates an existing one by id. */
export function upsertSessionAdmin(admin: Omit<AdminUser, 'id'> & { id?: string }): AdminUser {
  const existingIdx = admin.id ? state.admins.findIndex((a) => a.id === admin.id) : -1;
  if (existingIdx >= 0) {
    const updated: AdminUser = { ...state.admins[existingIdx], ...admin, id: state.admins[existingIdx].id };
    const nextAdmins = [...state.admins];
    nextAdmins[existingIdx] = updated;
    emit({ ...state, admins: nextAdmins });
    return updated;
  }
  const created: AdminUser = { ...admin, id: nextInternalId(state.admins.map((a) => a.id), 'admin') };
  emit({ ...state, admins: [...state.admins, created] });
  return created;
}

/**
 * Upsert a queue. Partner exclusivity: any partner checked here is removed
 * from other queues. Agents may belong to multiple queues.
 */
export function upsertSessionQueue(queue: Omit<Queue, 'id'> & { id?: string }): Queue {
  const id = queue.id && state.queues.some((q) => q.id === queue.id)
    ? queue.id
    : nextQueueId();
  const partnerIds = [...new Set(queue.partnerIds)];
  const agentIds = [...new Set(queue.agentIds)];

  const nextQueues = state.queues
    .filter((q) => q.id !== id)
    .map((q) => ({
      ...q,
      partnerIds: q.partnerIds.filter((p) => !partnerIds.includes(p)),
    }));

  const saved: Queue = { id, name: queue.name.trim() || `Queue ${id}`, partnerIds, agentIds };
  nextQueues.push(saved);
  nextQueues.sort((a, b) => a.id.localeCompare(b.id));
  emit({ ...state, queues: nextQueues });
  return saved;
}

/** Delete a queue; its agents are simply unassigned from it (other queues untouched). */
export function deleteSessionQueue(queueId: string): void {
  emit({ ...state, queues: state.queues.filter((q) => q.id !== queueId) });
}

export function updateAdminConfig(patch: Partial<AdminConfigState>): AdminConfigState {
  const next = { ...state.config, ...patch };
  emit({ ...state, config: next });
  return next;
}

// ─── React hook (useSyncExternalStore-friendly) ────────────────────────────

export function useSessionRoster(): SessionRosterState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useAdminConfig(): AdminConfigState {
  return useSyncExternalStore(subscribe, () => getSnapshot().config);
}

export function useSessionQueues(): Queue[] {
  return useSyncExternalStore(subscribe, () => getSnapshot().queues);
}
