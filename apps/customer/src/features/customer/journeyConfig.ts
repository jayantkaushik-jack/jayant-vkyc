import type { Address, GeoFenceOutcome } from '@vkyc/shared/data/types';
import type { LatLng } from '@vkyc/shared/lib/geoFence';

export const DEMO_TOKEN = 'demo-pbz-7f3a';

export const IN_CALL_STEPS = [
  'Liveness',
  'Location',
  'Face',
  'Aadhaar',
  'PAN',
  'Signature',
] as const;

export type InCallStep = (typeof IN_CALL_STEPS)[number];

export type JourneyLanguage = 'en' | 'hi';

export type JourneyPhase =
  | 'landing'
  | 'location_denied'
  | 'location_rejected'
  | 'service_closed'
  | 'consent'
  | 'decline_exit'
  | 'permissions'
  | 'permissions_denied'
  | 'prechecks'
  | 'failure_vpn'
  | 'failure_outside_india'
  | 'failure_ekyc_expired'
  | 'failure_link_expired'
  | 'failure_blacklisted'
  | 'waiting'
  | 'incall'
  | 'reconnecting'
  | 'stepped_away'
  | 'feedback'
  | 'completion'
  | 'reattempt'
  | 'partner_return';

export type FailureKind =
  | 'vpn'
  | 'outside_india'
  | 'ekyc_expired'
  | 'link_expired'
  | 'blacklisted';

export interface MockApplication {
  productLabel: string;
  appId: string;
  partnerName: string;
  validityEndsAt: number;
  /** Weblink / Aadhaar auth generation time (ms). */
  generatedAtMs: number;
}

/** Mock registered addresses near Mumbai for geo-fence demos. */
export const MOCK_REGISTERED_ADDRESSES: { current: Address; permanent: Address } = {
  current: {
    line1: '14, Andheri East',
    line2: 'MIDC Central Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400053',
    district: 'Mumbai Suburban',
    lat: 19.1136,
    lng: 72.8697,
  },
  permanent: {
    line1: '22, Bandra West',
    line2: 'Linking Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
    district: 'Mumbai Suburban',
    lat: 19.0596,
    lng: 72.8295,
  },
};

/** Demo lat/lng that produce each geo-fence outcome against MOCK_REGISTERED_ADDRESSES. */
export const DEMO_GEO_LOCATIONS: Record<GeoFenceOutcome, LatLng> = {
  radius_pass: { lat: 19.12, lng: 72.87 },
  pin_pass: { lat: 8, lng: 72 },
  rejected: { lat: 12.97, lng: 77.59 },
};

export interface ActivityEvent {
  id: string;
  label: string;
  at: string;
}

const PRODUCT_BY_TOKEN: Record<string, Omit<MockApplication, 'validityEndsAt' | 'generatedAtMs'>> = {
  'demo-pbz-7f3a': {
    productLabel: 'SBM Bank Paisabazaar Paisa+ Credit Card',
    appId: 'SBM_PBZ_5517874243',
    partnerName: 'Paisabazaar',
  },
  'demo-crl': {
    productLabel: 'SBM Bank Credilio Smart FD',
    appId: 'SBM_CRL_8829103456',
    partnerName: 'Credilio',
  },
};

export function mockApplicationFromToken(token: string): MockApplication {
  const base = PRODUCT_BY_TOKEN[token] ?? PRODUCT_BY_TOKEN[DEMO_TOKEN];
  const generatedAtMs = Date.now();
  return {
    ...base,
    generatedAtMs,
    validityEndsAt: generatedAtMs + 72 * 60 * 60 * 1000,
  };
}

/** Elapsed ms for demo "near-expiry" (71h 55m) — past the 71h50m buffer. */
export const DEMO_NEAR_EXPIRY_ELAPSED_MS = (71 * 60 + 55) * 60 * 1000;

export const AGENT_OFFICER = {
  id: 'agent-officer-1',
  name: 'Priya Sharma',
  title: 'SBM Verification Officer',
};

export function formatValidityRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export const COPY = {
  initiateCall: {
    en: 'Initiate the video KYC call',
    hi: 'वीडियो KYC कॉल शुरू करें',
  },
  agentGreeting: {
    en: (name: string) => `Good morning, am I speaking with ${name}? I am ${AGENT_OFFICER.name}, your SBM verification officer.`,
    hi: (name: string) => `नमस्ते, क्या मेरी बात ${name} से हो रही है? मैं ${AGENT_OFFICER.name} हूँ, SBM सत्यापन अधिकारी।`,
  },
  acceptContinue: {
    en: 'Accept & Continue',
    hi: 'स्वीकार करें और आगे बढ़ें',
  },
} as const;
