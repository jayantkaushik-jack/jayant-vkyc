import type { Agent, Auditor } from '../data/types';

/**
 * Deterministic staff masking for the partner-facing app. Partners must never
 * see real agent/auditor identities, so every render site maps a staff id to a
 * stable pseudonym like `Agent A-14` / `Auditor R-3`.
 */

const LETTERS = 'ABCDEFGHJKLMNPRSTVWXYZ';

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function maskStaffName(id: string, role: 'agent' | 'auditor'): string {
  const h = hashId(id);
  const letter = LETTERS[h % LETTERS.length];
  const num = 1 + (h % 60);
  const prefix = role === 'auditor' ? 'Auditor' : 'Agent';
  return `${prefix} ${letter}-${num}`;
}

/** Returns a shallow agent copy with the name replaced by its masked pseudonym. */
export function maskAgent<T extends Pick<Agent, 'id' | 'name'>>(agent: T): T {
  return { ...agent, name: maskStaffName(agent.id, 'agent') };
}

/** Returns a shallow auditor copy with the name replaced by its masked pseudonym. */
export function maskAuditor<T extends Pick<Auditor, 'id' | 'name'>>(auditor: T | null): T | null {
  if (!auditor) return null;
  return { ...auditor, name: maskStaffName(auditor.id, 'auditor') };
}
