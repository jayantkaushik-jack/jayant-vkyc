import { useSyncExternalStore } from 'react';
import { PARTNERS } from './types';
import type { PartnerId, PartnerUser } from './types';

/**
 * Partner-user directory. One realistic user is seeded per partner; the partner
 * dashboard authenticates against this SEEDED list only (session-added users
 * from the admin app are demo-only and not cross-app visible — no backend).
 */

interface PartnerUserSeed {
  partnerId: PartnerId;
  name: string;
  email: string;
  phone: string;
}

const SEEDS: PartnerUserSeed[] = [
  { partnerId: 'PAISABAZAAR', name: 'Rohan Malhotra', email: 'ops@paisabazaar.com', phone: '+91 98330 21001' },
  { partnerId: 'CREDILIO', name: 'Anjali Verma', email: 'vkyc@credilio.com', phone: '+91 98330 21002' },
  { partnerId: 'NIYO', name: 'Karthik Rao', email: 'ops@niyo.in', phone: '+91 98330 21003' },
  { partnerId: 'ZET', name: 'Sneha Kapoor', email: 'vkyc@zet.app', phone: '+91 98330 21004' },
  { partnerId: 'GENERAL', name: 'Vikram Shetty', email: 'desk@sbm-direct.in', phone: '+91 98330 21005' },
];

export const SEED_PARTNER_USERS: PartnerUser[] = SEEDS.map((s, i) => ({
  id: `puser-${String(i + 1).padStart(3, '0')}`,
  partnerId: s.partnerId,
  name: s.name,
  email: s.email,
  phone: s.phone,
}));

/** Demo accounts hint shown on the partner login page + documented in the README. */
export const PARTNER_DEMO_ACCOUNTS = SEED_PARTNER_USERS.map((u) => ({
  email: u.email,
  partnerName: PARTNERS.find((p) => p.id === u.partnerId)?.name ?? u.partnerId,
}));

interface PartnerUserState {
  users: PartnerUser[];
}

let state: PartnerUserState = {
  users: [...SEED_PARTNER_USERS],
};

const listeners = new Set<() => void>();

function emit(next: PartnerUserState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): PartnerUserState {
  return state;
}

export function useSessionPartnerUsers(): PartnerUser[] {
  return useSyncExternalStore(subscribe, () => getSnapshot().users);
}

export function getSessionPartnerUsers(): PartnerUser[] {
  return state.users;
}

let seq = 0;

export function addPartnerUser(input: {
  partnerId: PartnerId;
  name: string;
  email: string;
  phone: string;
}): PartnerUser {
  seq += 1;
  const user: PartnerUser = {
    id: `puser-new-${seq}`,
    partnerId: input.partnerId,
    name: input.name.trim() || 'New Partner User',
    email: input.email.trim(),
    phone: input.phone.trim(),
  };
  emit({ ...state, users: [user, ...state.users] });
  return user;
}

/** Partner-app login: match against the SEEDED list only (no backend). */
export function findSeededPartnerUserByEmail(email: string): PartnerUser | null {
  const q = email.trim().toLowerCase();
  if (!q) return null;
  return SEED_PARTNER_USERS.find((u) => u.email.toLowerCase() === q) ?? null;
}
