import { SeededRNG } from './rng';
import { ADMIN_MODULE_PERMISSIONS, DROP_STAGES, PARTNERS } from './types';
import type {
  AdminModulePermission,
  AdminUser,
  Agent,
  Auditor,
  AttendanceRecord,
  AuditorAttendanceRecord,
  CallRecord,
  Customer,
  CustomerStatus,
  DropStage,
  JourneyEntry,
  PartnerId,
  Queue,
  WebhookEvent,
  StaffLeave,
} from './types';
import {
  MALE_FIRST_NAMES,
  FEMALE_FIRST_NAMES,
  genderFromFirstName,
  pickMaleFirstName,
} from '../lib/avatar';
import { SBM_LOWER_PAREL, DEMO_CUSTOMER_OVERRIDES } from '../lib/sbmConstants';
import {
  AUDITOR_RECAPTURE_REASON_IDS,
  REJECTION_CATEGORIES,
  REJECTION_REASONS,
  getReasonMeta,
  getReasonsByDecision,
} from '../lib/rejectionReasons';
import { PARTNER_PRODUCT_CATALOGS } from './productCatalogs';

const ALL_FIRST_NAMES = [...MALE_FIRST_NAMES, ...FEMALE_FIRST_NAMES];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Singh', 'Kumar', 'Reddy', 'Gupta', 'Iyer', 'Nair',
  'Mehta', 'Joshi', 'Verma', 'Rao', 'Desai', 'Malhotra', 'Chopra', 'Agarwal',
];

const CITIES = [
  { city: 'Mumbai', state: 'Maharashtra', pincode: '400001', district: 'Mumbai City', lat: 18.9388, lng: 72.8354 },
  { city: 'Delhi', state: 'Delhi', pincode: '110001', district: 'Central Delhi', lat: 28.6328, lng: 77.2197 },
  { city: 'Bangalore', state: 'Karnataka', pincode: '560001', district: 'Bangalore Urban', lat: 12.9756, lng: 77.6012 },
  { city: 'Hyderabad', state: 'Telangana', pincode: '500001', district: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', district: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { city: 'Pune', state: 'Maharashtra', pincode: '411001', district: 'Pune', lat: 18.5204, lng: 73.8567 },
  { city: 'Kolkata', state: 'West Bengal', pincode: '700001', district: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { city: 'Ahmedabad', state: 'Gujarat', pincode: '380001', district: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { city: 'Jaipur', state: 'Rajasthan', pincode: '302001', district: 'Jaipur', lat: 26.9124, lng: 75.7873 },
  { city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001', district: 'Lucknow', lat: 26.8467, lng: 80.9462 },
];

const BRANCHES = [
  'Mumbai HQ', 'Delhi NCR', 'Bangalore Tech Park', 'Hyderabad Gachibowli',
  'Chennai T Nagar', 'Pune Hinjewadi', 'Kolkata Salt Lake',
];

const MANAGERS = [
  'Rajiv Mehta', 'Sunita Rao', 'Amit Desai', 'Kavita Nair', 'Suresh Iyer',
];

const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Marathi', 'Bengali'];
const PRODUCT_CATEGORIES = ['Credit Card', 'Savings Account', 'Fixed Deposit', 'Personal Loan', 'Home Loan'];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0');
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateTime(d: Date): string {
  return `${formatDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Minutes-since-midnight → HH:MM, always well-formed. */
function clockOf(totalMin: number): string {
  const total = Math.min(24 * 60 - 1, Math.max(0, Math.round(totalMin)));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function addMinutesClock(hour: number, minute: number, deltaMin: number): string {
  return clockOf(hour * 60 + minute + deltaMin);
}

/** Stable 0/1/2 break wave for a staff member, so lunch cover is staggered. */
function breakWave(staffId: string): number {
  let h = 0;
  for (let i = 0; i < staffId.length; i++) h = (h * 31 + staffId.charCodeAt(i)) | 0;
  return Math.abs(h) % 3;
}

/**
 * Realistic intraday call arrival curve across the 08:00–20:00 window: a morning
 * ramp, a broad midday peak, and a mild evening taper that keeps the 19:00–20:00
 * bucket meaningful (no post-18:00 cliff). Index i maps to hour 8 + i.
 */
const HOUR_WEIGHTS = [3, 6, 9, 11, 11, 9, 10, 11, 10, 9, 7, 6, 3]; // hours 08..20
const HOUR_WEIGHT_TOTAL = HOUR_WEIGHTS.reduce((s, w) => s + w, 0);

function pickCallHour(rng: SeededRNG): number {
  let roll = rng.next() * HOUR_WEIGHT_TOTAL;
  for (let i = 0; i < HOUR_WEIGHTS.length; i++) {
    roll -= HOUR_WEIGHTS[i];
    if (roll < 0) return 8 + i;
  }
  return 8 + HOUR_WEIGHTS.length - 1;
}

function sampleDateOfJoining(rng: SeededRNG): string {
  const now = new Date();
  const yearsAgo = rng.float(1, 4);
  const d = new Date(now);
  d.setDate(d.getDate() - Math.round(yearsAgo * 365 + rng.int(0, 180)));
  return formatDate(d);
}

function generateAddress(rng: SeededRNG, cityIdx?: number) {
  const loc = CITIES[cityIdx ?? rng.int(0, CITIES.length - 1)];
  const streetNum = rng.int(1, 999);
  const streets = ['MG Road', 'Park Street', 'Link Road', 'Station Road', 'Ring Road', 'Lake View Colony'];
  // Jitter coords slightly so each address is unique but near the city center.
  const lat = loc.lat + (rng.next() - 0.5) * 0.04;
  const lng = loc.lng + (rng.next() - 0.5) * 0.04;
  return {
    line1: `${streetNum}, ${rng.pick(streets)}`,
    line2: `${rng.pick(['Near Metro', 'Opp. City Mall', 'Behind Bus Stand', 'Sector ' + rng.int(1, 50)])}`,
    city: loc.city,
    state: loc.state,
    pincode: loc.pincode,
    district: loc.district,
    lat: Math.round(lat * 10000) / 10000,
    lng: Math.round(lng * 10000) / 10000,
  };
}

function generatePan(rng: SeededRNG): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const l = (n: number) => Array.from({ length: n }, () => letters[rng.int(0, 25)]).join('');
  return `${l(5)}${rng.int(1000, 9999)}${l(1)}`;
}

function buildAadhaarAddress(c: Customer['currentAddress']): string {
  return `${c.line1}, ${c.line2}, ${c.city}, ${c.state} - ${c.pincode}`;
}

function pickFirstName(rng: SeededRNG, fixed?: string): string {
  if (fixed) return fixed;
  return rng.pick(ALL_FIRST_NAMES);
}

function pickPartnersForAgent(rng: SeededRNG): PartnerId[] {
  const pool = [...PARTNERS.map((p) => p.id)];
  const out: PartnerId[] = [];
  const target = rng.next() < 0.1 ? 2 : 1; // ~90% dedicated, ~10% shared (exactly 2 when shared).
  while (out.length < target && pool.length > 0) {
    const idx = rng.int(0, pool.length - 1);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

export function generateAgents(rng: SeededRNG): Agent[] {
  const agents: Agent[] = [];
  for (let i = 0; i < 67; i++) {
    const firstName = i === 0 ? 'Sumit' : pickFirstName(rng);
    const lastName = rng.pick(LAST_NAMES);
    const id = `agent-${pad(i + 1, 3)}`;
    agents.push({
      id,
      employeeId: `AS${pad(2001 + i, 6)}`,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@cashfree.com`,
      dateOfJoining: sampleDateOfJoining(rng),
      manager: rng.pick(MANAGERS),
      branch: rng.pick(BRANCHES),
      skills: {
        languages: i === 0
          ? ['Hindi', 'English', 'Marathi']
          : Array.from(new Set([rng.pick(LANGUAGES), rng.pick(LANGUAGES), rng.pick(LANGUAGES)])).slice(0, rng.int(2, 4)),
        partners: i === 0 ? ['ZET'] : pickPartnersForAgent(rng),
        productCategories: PRODUCT_CATEGORIES.slice(0, rng.int(2, 4)),
      },
      workPlan: DAYS.map((day) => ({
        day,
        officeStart: '09:00',
        officeEnd: '18:00',
        breakStart: '13:00',
        breakEnd: '14:00',
      })),
    });
  }
  return agents;
}

const LEAVE_TEMPLATES: StaffLeave[] = [
  { type: 'Casual Leave', dates: '12 Mar 2026', status: 'Approved' },
  { type: 'Sick Leave', dates: '28 Feb 2026', status: 'Approved' },
  { type: 'Casual Leave', dates: '15 Jan 2026 – 16 Jan 2026', status: 'Approved' },
];

export function generateAuditors(rng: SeededRNG): Auditor[] {
  const auditors: Auditor[] = [];
  for (let i = 0; i < 19; i++) {
    const firstName = pickFirstName(rng);
    const lastName = rng.pick(LAST_NAMES);
    const manager = rng.pick(MANAGERS);
    auditors.push({
      id: `auditor-${pad(i + 1, 2)}`,
      employeeId: `AU${pad(3001 + i, 6)}`,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@cashfree.com`,
      mobile: `+91 9${rng.int(10000000, 99999999)}`,
      manager,
      managerId: `MGR-${pad(MANAGERS.indexOf(manager) + 1, 2)}`,
      branch: rng.pick(BRANCHES),
      vcipAuditTrained: true,
      trainingCompletedAt: sampleDateOfJoining(rng),
      languages: Array.from(
        new Set([rng.pick(LANGUAGES), rng.pick(LANGUAGES), rng.pick(LANGUAGES)]),
      ).slice(0, rng.int(2, 4)),
      partnerIds: PARTNERS.map((p) => p.id),
      productCategories: PRODUCT_CATEGORIES.slice(0, rng.int(3, 5)),
      dailyAuditCapacity: 60,
      workPlan: DAYS.map((day) => ({
        day,
        officeStart: '09:00',
        officeEnd: '18:00',
        breakStart: '13:00',
        breakEnd: '14:00',
      })),
      leaves: LEAVE_TEMPLATES.slice(0, rng.int(2, 3)),
      canTakeAgentCalls: rng.next() < 0.15,
    });
  }
  return auditors;
}

interface AdminSeedSpec {
  name: string;
  roleTitle: AdminUser['roleTitle'];
  accessLevel: AdminUser['accessLevel'];
  modules: AdminModulePermission[];
  partnerScope: 'all' | PartnerId[];
  mobile: string;
}

const ADMIN_SEED_SPECS: AdminSeedSpec[] = [
  {
    name: 'Priya Nair',
    roleTitle: 'Super Admin',
    accessLevel: 'Manage',
    modules: [...ADMIN_MODULE_PERMISSIONS],
    partnerScope: 'all',
    mobile: '+91 98200 11001',
  },
  {
    name: 'Rohit Sharma',
    roleTitle: 'Operations Admin',
    accessLevel: 'Manage',
    modules: ['Dashboard', 'Customers', 'Partner Analytics', 'Productivity', 'Users'],
    partnerScope: 'all',
    mobile: '+91 98200 11002',
  },
  {
    name: 'Ananya Iyer',
    roleTitle: 'Quality Lead',
    accessLevel: 'Manage',
    modules: ['Dashboard', 'Rejection & Failure Reasons', 'Productivity', 'Reports'],
    partnerScope: 'all',
    mobile: '+91 98200 11003',
  },
  {
    name: 'Karan Mehta',
    roleTitle: 'Operations Admin',
    accessLevel: 'View only',
    modules: ['Dashboard', 'Partner Analytics', 'Reports'],
    partnerScope: ['PAISABAZAAR', 'CREDILIO'],
    mobile: '+91 98200 11004',
  },
  {
    name: 'Sneha Kulkarni',
    roleTitle: 'Quality Lead',
    accessLevel: 'View only',
    modules: ['Dashboard', 'Rejection & Failure Reasons'],
    partnerScope: 'all',
    mobile: '+91 98200 11005',
  },
];

/** Fixed seed set of 5 admins (AD0001–AD0005). Deterministic, not RNG-driven. */
export function generateAdmins(): AdminUser[] {
  return ADMIN_SEED_SPECS.map((spec, i) => {
    const [firstName, lastName] = spec.name.split(' ');
    return {
      id: `admin-${pad(i + 1, 2)}`,
      employeeId: `AD${pad(i + 1, 4)}`,
      name: spec.name,
      email: `${firstName.toLowerCase()}.${(lastName ?? '').toLowerCase()}@cashfree.com`,
      mobile: spec.mobile,
      roleTitle: spec.roleTitle,
      accessLevel: spec.accessLevel,
      modules: spec.modules,
      partnerScope: spec.partnerScope,
    };
  });
}

const QUEUE_DEFS: Array<{ id: string; name: string; partnerIds: PartnerId[] }> = [
  { id: 'Q1', name: 'Paisabazaar Queue', partnerIds: ['PAISABAZAAR'] },
  { id: 'Q2', name: 'Credilio Queue', partnerIds: ['CREDILIO'] },
  { id: 'Q3', name: 'Niyo + ZET Queue', partnerIds: ['NIYO', 'ZET'] },
  { id: 'Q4', name: 'Direct Queue', partnerIds: ['GENERAL'] },
];

/**
 * Seed 4 queues. Every partner belongs to exactly one queue.
 * Agents are assigned to one or more queues (~90% one, ~10% two),
 * preferring queues that cover their seeded skill partners.
 */
export function generateQueues(agents: Agent[]): Queue[] {
  const agentIdsByQueue = new Map<string, string[]>(QUEUE_DEFS.map((q) => [q.id, []]));

  for (const agent of agents) {
    const covering = QUEUE_DEFS.filter((q) =>
      q.partnerIds.some((p) => agent.skills.partners.includes(p)),
    );
    let chosen: typeof QUEUE_DEFS;
    if (covering.length === 0) {
      // Fallback: hash into a single queue
      const idx = Math.abs(agent.id.split('').reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7)) % QUEUE_DEFS.length;
      chosen = [QUEUE_DEFS[idx]];
    } else if (covering.length === 1) {
      chosen = covering;
      // ~10% of dedicated agents also pick a second queue
      const hash = Math.abs(agent.id.split('').reduce((s, ch) => s * 17 + ch.charCodeAt(0), 3));
      if (hash % 10 === 0) {
        const other = QUEUE_DEFS.find((q) => q.id !== covering[0].id)!;
        chosen = [covering[0], other];
      }
    } else {
      // Already spans multiple queues via partners — keep those (capped at 2)
      chosen = covering.slice(0, 2);
    }
    for (const q of chosen) {
      agentIdsByQueue.get(q.id)!.push(agent.id);
    }
  }

  return QUEUE_DEFS.map((q) => ({
    id: q.id,
    name: q.name,
    partnerIds: [...q.partnerIds],
    agentIds: agentIdsByQueue.get(q.id) ?? [],
  }));
}

export function generateCustomers(rng: SeededRNG, count: number): Customer[] {
  const customers: Customer[] = [];
  for (let i = 0; i < count; i++) {
    const partner = rng.pick(PARTNERS);
    const firstName = pickFirstName(rng);
    const lastName = rng.pick(LAST_NAMES);
    const gender = genderFromFirstName(firstName);
    const cityIdx = rng.int(0, CITIES.length - 1);
    const currentAddr = generateAddress(rng, cityIdx);
    const permCityIdx = rng.int(0, CITIES.length - 1);
    const permanentAddr = generateAddress(rng, permCityIdx);
    const dobYear = rng.int(1975, 2000);
    const dobMonth = rng.int(1, 12);
    const dobDay = rng.int(1, 28);
    const fatherFirst = pickMaleFirstName(rng);
    const appDigits = String(rng.int(1000000000, 9999999999));
    const occupation = rng.pick(['Software Engineer', 'Business Analyst', 'Sales Executive', 'Operations Manager', 'Consultant']);
    const annualIncome = rng.int(420000, 2100000);
    const monthlyIncome = Math.round(annualIncome / 12);
    const partnerCode = partner.code;
    const panMiddle = rng.next() < 0.45 ? pickFirstName(rng) : '';
    const panNumber = generatePan(rng);

    customers.push({
      id: `cust-${pad(i + 1, 4)}`,
      appId: `SBM_${partner.code}_${appDigits}`,
      partnerId: partner.id,
      name: `${firstName} ${lastName}`,
      phone: `+91 ${rng.int(70000, 99999)}${rng.int(10000, 99999)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${rng.int(1, 99)}@gmail.com`,
      dob: `${dobYear}-${pad(dobMonth)}-${pad(dobDay)}`,
      gender,
      fatherName: `${fatherFirst} ${lastName}`,
      currentAddress: currentAddr,
      permanentAddress: permanentAddr,
      productType: rng.pick([...PARTNER_PRODUCT_CATALOGS[partner.id]]),
      customerStatus: rng.pick(['New', 'ETB'] as CustomerStatus[]),
      aadhaarLast4: String(rng.int(1000, 9999)),
      aadhaarGenerationDate: `${rng.int(2018, 2023)}-${pad(rng.int(1, 12))}-${pad(rng.int(1, 28))}`,
      panNumber,
      language: rng.pick(['English', 'Hindi']),
      asPerAadhaar: {
        name: `${firstName} ${lastName}`,
        dob: `${dobYear}-${pad(dobMonth)}-${pad(dobDay)}`,
        gender,
        address: buildAadhaarAddress(currentAddr),
      },
      panDetails: {
        firstName,
        middleName: panMiddle || undefined,
        lastName,
        printedName: [firstName, panMiddle, lastName].filter(Boolean).join(' ').toUpperCase(),
        fatherName: `${fatherFirst} ${lastName}`,
        panNumber,
        dob: `${dobYear}-${pad(dobMonth)}-${pad(dobDay)}`,
        source: rng.next() < 0.72 ? 'NSDL' : 'UTIITSL',
        verified: true,
      },
      incomeEmployment: {
        employmentType: rng.next() < 0.7 ? 'Salaried' : 'Self Employed',
        occupation,
        organization: rng.pick(['Cashfree Payments', 'SBM Bank', 'Apex Finserv', 'Urban Retail Pvt Ltd', 'Nimbus Technologies']),
        annualIncome,
        monthlyIncome,
      },
      accountDetails: {
        branch: rng.pick(BRANCHES),
        status: rng.next() < 0.9 ? 'Active' : 'Dormant',
        accountNumber: `${rng.int(1000, 9999)}${rng.int(1000, 9999)}${rng.int(1000, 9999)}`,
      },
      callAllocation: {
        applicantPriority: rng.pick(['High', 'Medium', 'Low'] as const),
        redirectLink: `https://weblink.sbm.co.in/${partnerCode.toLowerCase()}/${appDigits.slice(-8)}`,
      },
    });
  }
  return customers;
}

function generateCallDuration(rng: SeededRNG, tier: AgentQualityTier = 'strong'): number {
  // Prefer the efficiency green band (150–270s); weak agents drift long.
  if (tier === 'weak') {
    if (rng.next() < 0.35) return rng.int(280, 420);
    return rng.int(160, 280);
  }
  if (tier === 'amber') {
    if (rng.next() < 0.12) return rng.int(270, 340);
    return rng.int(150, 260);
  }
  if (rng.next() < 0.05) return rng.int(270, 320);
  return rng.int(155, 250);
}

// Partner-level CSAT bias so per-partner bars differ (mean rating offset).
const PARTNER_CSAT_BIAS: Record<PartnerId, number> = {
  PAISABAZAAR: 0.35,
  CREDILIO: 0.1,
  NIYO: -0.25,
  ZET: 0.2,
  GENERAL: -0.05,
};

type AgentQualityTier = 'strong' | 'amber' | 'weak';

/** ~60% strong / ~30% amber / ~10% weak — coherent across drop/CSAT/efficiency drivers. */
function agentQualityTier(agentId: string): AgentQualityTier {
  const h = Math.abs(agentId.split('').reduce((s, ch) => s * 31 + ch.charCodeAt(0), 11));
  const bucket = h % 10;
  if (bucket === 0) return 'weak';
  if (bucket <= 3) return 'amber';
  return 'strong';
}

// Draw a 1–5 rating weighted toward 4–5 with a per-partner + agent-tier mean shift.
function sampleCsat(rng: SeededRNG, partnerId: PartnerId, tier: AgentQualityTier = 'strong'): number {
  const bias = (PARTNER_CSAT_BIAS[partnerId] ?? 0) + (tier === 'strong' ? 0.35 : tier === 'amber' ? 0.05 : -0.55);
  const roll = rng.next() + bias * 0.5;
  if (roll >= 0.55) return 5;
  if (roll >= 0.22) return 4;
  if (roll >= 0.08) return 3;
  if (roll >= 0.03) return 2;
  return 1;
}

export function generateCalls(
  rng: SeededRNG,
  agents: Agent[],
  customers: Customer[],
  auditors: Auditor[],
): CallRecord[] {
  const calls: CallRecord[] = [];
  const now = new Date();
  let callIdx = 0;

  for (const agent of agents) {
    const tier = agentQualityTier(agent.id);
    const callCount = rng.int(380, 420);
    // Target fleet drop ~3%; weak agents ~8–10%, amber ~4–5%, strong ~2–3%.
    const dropRate = tier === 'weak'
      ? rng.float(0.075, 0.11)
      : tier === 'amber'
        ? rng.float(0.038, 0.052)
        : rng.float(0.018, 0.032);
    for (let i = 0; i < callCount; i++) {
      const daysAgo = rng.int(0, 89);
      const hour = pickCallHour(rng);
      const minute = rng.int(0, 59);
      const ts = new Date(now);
      ts.setDate(ts.getDate() - daysAgo);
      ts.setHours(hour, minute, rng.int(0, 59), 0);

      const customer = rng.pick(customers);
      const answered = rng.next() >= dropRate;
      const routedAt = formatDateTime(ts);

      let answeredAt: string | null = null;
      let agentWaitSec = 0;
      let durationSec = 0;
      let reviewTimeSec = 0;
      let agentDecision: 'approved' | 'rejected' | 'failed' = 'failed';
      let callStatus: 'Connected' | 'User Dropped' = 'User Dropped';
      let agentStatus: 'Approved' | 'Unable to Verify' | 'Rejected' | undefined;
      let auditorDecision: 'Approved' | 'Rejected' | 'Recapture' | 'In Review' | undefined;
      let auditorReason: string | null = null;
      let auditorRemarks: string | null = null;
      let auditorId: string | null = null;

      let auditorReviewedAt: string | null = null;
      let csatRating: number | null = null;
      let dropStage: DropStage | undefined;

      if (answered) {
        callStatus = 'Connected';
        agentWaitSec = tier === 'weak'
          ? rng.int(45, 110)
          : tier === 'amber'
            ? rng.int(20, 70)
            : rng.int(8, 40);
        const answerDate = new Date(ts.getTime() + agentWaitSec * 1000);
        answeredAt = formatDateTime(answerDate);
        durationSec = generateCallDuration(rng, tier);
        reviewTimeSec = tier === 'weak'
          ? rng.int(70, 160)
          : tier === 'amber'
            ? rng.int(35, 90)
            : rng.int(22, 55);
        // Strong agents approve more; weak agents fail/reject more (hurts accuracy via overturns on approvals).
        const approveP = tier === 'weak' ? 0.68 : tier === 'amber' ? 0.78 : 0.88;
        agentDecision = rng.next() < approveP
          ? 'approved'
          : (rng.next() < 0.75 ? 'failed' : 'rejected');
        agentStatus = agentDecision === 'approved'
          ? 'Approved'
          : (agentDecision === 'failed' ? 'Unable to Verify' : 'Rejected');

        if (agentDecision === 'approved') {
          csatRating = sampleCsat(rng, customer.partnerId, tier);
          auditorId = rng.pick(auditors).id;
          if (daysAgo <= 2 && rng.next() < 0.16) {
            auditorDecision = 'In Review';
            auditorId = null;
          } else {
            // Strong: ~96% upheld; amber ~93%; weak ~85% (more recapture/reject → lower accuracy).
            const outcomeRoll = rng.next();
            const approveCut = tier === 'weak' ? 0.85 : tier === 'amber' ? 0.93 : 0.965;
            const recaptureCut = tier === 'weak' ? 0.95 : 0.99;
            if (outcomeRoll < approveCut) auditorDecision = 'Approved';
            else if (outcomeRoll < recaptureCut) auditorDecision = 'Recapture';
            else auditorDecision = 'Rejected';
          }
          const callEndMs = ts.getTime() + (agentWaitSec + durationSec) * 1000;
          auditorReviewedAt = auditorDecision === 'In Review'
            ? null
            : formatDateTime(new Date(callEndMs + reviewTimeSec * 1000));
          if (auditorDecision === 'Recapture' || auditorDecision === 'Rejected') {
            auditorReason = auditorDecision === 'Recapture'
              ? pickRecaptureReason(`${callIdx}-recapture`)
              : pickReasonForDecision(`${callIdx}-auditor-rejected`, 'rejected');
            auditorRemarks = rng.pick([
              'Document quality insufficient for verification.',
              'Customer was not clearly visible during capture.',
              'Mismatch observed in submitted details.',
              'Re-capture recommended with better lighting.',
              'Additional verification required.',
            ]);
          }
        } else {
          auditorId = null;
          auditorDecision = undefined;
          auditorReason = pickReasonForDecision(
            `${callIdx}-${agentDecision === 'failed' ? 'unable' : 'rejected'}`,
            agentDecision === 'failed' ? 'unable' : 'rejected',
          );
          auditorRemarks = null;
          auditorReviewedAt = null;
          reviewTimeSec = 0;
        }
      } else {
        dropStage = pickDropStage(`drop-${callIdx}`);
      }

      callIdx++;
      calls.push({
        id: `call-${pad(callIdx, 5)}`,
        agentId: agent.id,
        customerId: customer.id,
        partnerId: customer.partnerId,
        timestamp: routedAt,
        routedAt,
        answeredAt,
        answered,
        durationSec,
        customerWaitSec: rng.int(10, 300),
        agentWaitSec,
        reviewTimeSec,
        callStatus,
        agentStatus,
        agentDecision,
        auditorDecision,
        auditorDecisionLegacy: auditorDecision === 'Approved'
          ? 'accepted'
          : (auditorDecision === 'Recapture'
            ? 'recapture'
            : (auditorDecision === 'Rejected' ? 'rejected' : null)),
        auditorReason,
        auditorRemarks,
        auditorId,
        auditorReviewedAt,
        csatRating,
        dropStage,
      });
    }
  }
  return calls.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}


// ─── Recent-week queue simulation ──────────────────────────────────────────────
//
// The base generator draws each call independently, so waits are sampled rather
// than caused — no queue can ever form and a point-in-time reconstruction of the
// floor comes back empty. For the trailing demo window we instead run a real
// discrete-event simulation: arrivals follow the intraday curve, agents are only
// available when the attendance log says they are logged in and not on a break,
// and a customer waits until an agent in their queue actually frees up (or
// abandons). Wait time is therefore an OUTPUT of capacity, which is what makes
// "why is the wait high right now" answerable from stored data alone.

/** Days of trailing history that get the simulated treatment. */
export const BURST_DAYS = 7;
/** Target arrivals per simulated day, sized just above the floor's capacity. */
const BURST_CALLS_PER_DAY = 8000;

/**
 * Arrival curve for the simulated window. Tapers harder after 17:00 than the
 * generic curve, because the seeded roster logs out between 16:00 and 18:45 —
 * without the taper the evening becomes an artefact of the shift pattern rather
 * than of demand. Index i maps to hour 8 + i.
 */
const BURST_HOUR_WEIGHTS = [3, 7, 10, 12, 12, 10, 11, 12, 10, 7, 3, 2, 1];
const BURST_HOUR_WEIGHT_TOTAL = BURST_HOUR_WEIGHTS.reduce((s, w) => s + w, 0);

function pickBurstHour(rng: SeededRNG): number {
  let roll = rng.next() * BURST_HOUR_WEIGHT_TOTAL;
  for (let i = 0; i < BURST_HOUR_WEIGHTS.length; i++) {
    roll -= BURST_HOUR_WEIGHTS[i];
    if (roll < 0) return 8 + i;
  }
  return 8 + BURST_HOUR_WEIGHTS.length - 1;
}

/** True when `iso` falls inside the re-simulated trailing window. */
export function isInBurstWindow(iso: string): boolean {
  const start = new Date();
  start.setDate(start.getDate() - (BURST_DAYS - 1));
  start.setHours(0, 0, 0, 0);
  return new Date(iso).getTime() >= start.getTime();
}

interface OnlineInterval {
  agentId: string;
  startMs: number;
  endMs: number;
}

function clockToMs(dayStart: number, hhmm: string): number {
  const [h, m] = hhmm.split(':').map((n) => Number(n));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return dayStart;
  return dayStart + (h * 60 + m) * 60_000;
}

/** Login→logout minus break intervals, as concrete online windows for a day. */
function onlineIntervalsFor(record: AttendanceRecord, dayStart: number): OnlineInterval[] {
  const login = clockToMs(dayStart, record.loginAt);
  const logout = clockToMs(dayStart, record.logoutAt);
  if (logout <= login) return [];

  const breaks = (record.breakIntervals ?? [])
    .map((b) => ({ start: clockToMs(dayStart, b.start), end: clockToMs(dayStart, b.end) }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);

  const out: OnlineInterval[] = [];
  let cursor = login;
  for (const b of breaks) {
    if (b.start > cursor) out.push({ agentId: record.agentId, startMs: cursor, endMs: Math.min(b.start, logout) });
    cursor = Math.max(cursor, b.end);
    if (cursor >= logout) break;
  }
  if (cursor < logout) out.push({ agentId: record.agentId, startMs: cursor, endMs: logout });
  return out.filter((i) => i.endMs > i.startMs);
}

/** Earliest moment at or after `from` that this agent is online. */
function nextOnlineAt(intervals: OnlineInterval[], from: number): number | null {
  for (const iv of intervals) {
    if (iv.endMs <= from) continue;
    return Math.max(from, iv.startMs);
  }
  return null;
}

function isOnlineAt(intervals: OnlineInterval[], at: number): boolean {
  return intervals.some((iv) => at >= iv.startMs && at < iv.endMs);
}

/**
 * Simulate the last `BURST_DAYS` working days queue by queue. Returns additional
 * call records whose waits, drops and concurrency are all consequences of the
 * roster in `attendance`.
 */
export function generateQueueBurstCalls(
  rng: SeededRNG,
  agents: Agent[],
  customers: Customer[],
  auditors: Auditor[],
  attendance: AttendanceRecord[],
  startIndex: number,
): CallRecord[] {
  const queues = generateQueues(agents);
  const customersByPartner = new Map<PartnerId, Customer[]>();
  for (const c of customers) {
    const list = customersByPartner.get(c.partnerId) ?? [];
    list.push(c);
    customersByPartner.set(c.partnerId, list);
  }

  const attendanceByKey = new Map<string, AttendanceRecord>();
  for (const a of attendance) attendanceByKey.set(`${a.date}|${a.agentId}`, a);

  const out: CallRecord[] = [];
  let callIdx = startIndex;
  const now = new Date();

  for (let d = 0; d < BURST_DAYS; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    date.setHours(0, 0, 0, 0);
    if (date.getDay() === 0) continue; // no Sunday operations
    const dateKey = formatDate(date);
    const dayStart = date.getTime();

    // Split the day's target across queues in proportion to rostered agents.
    const totalRostered = queues.reduce((s, q) => s + q.agentIds.length, 0) || 1;

    for (const queue of queues) {
      const intervalsByAgent = new Map<string, OnlineInterval[]>();
      for (const agentId of queue.agentIds) {
        const record = attendanceByKey.get(`${dateKey}|${agentId}`);
        if (!record) continue;
        const intervals = onlineIntervalsFor(record, dayStart);
        if (intervals.length > 0) intervalsByAgent.set(agentId, intervals);
      }
      if (intervalsByAgent.size === 0) continue;

      const pool: Customer[] = queue.partnerIds.flatMap((pid) => customersByPartner.get(pid) ?? []);
      if (pool.length === 0) continue;

      const target = Math.round((BURST_CALLS_PER_DAY * queue.agentIds.length) / totalRostered);
      const arrivals: number[] = [];
      for (let i = 0; i < target; i++) {
        const hour = pickBurstHour(rng);
        arrivals.push(dayStart + (hour * 60 + rng.int(0, 59)) * 60_000 + rng.int(0, 59) * 1000);
      }
      arrivals.sort((a, b) => a - b);

      // freeAt[agentId] = moment the agent finishes their current call + review.
      const freeAt = new Map<string, number>();
      for (const agentId of intervalsByAgent.keys()) freeAt.set(agentId, dayStart);

      for (const enteredMs of arrivals) {
        const customer = rng.pick(pool);
        const abandonAfterSec = rng.int(240, 600);

        // Agents online now and not on a call.
        let chosen: string | null = null;
        let chosenAt = Infinity;
        for (const [agentId, intervals] of intervalsByAgent) {
          if (!isOnlineAt(intervals, enteredMs)) continue;
          const free = freeAt.get(agentId) ?? dayStart;
          if (free <= enteredMs && free < chosenAt) {
            chosen = agentId;
            chosenAt = free;
          }
        }

        let connectMs: number | null = null;
        if (chosen !== null) {
          // Answered straight away — the wait is just ring time.
          connectMs = enteredMs + rng.int(4, 22) * 1000;
        } else {
          // Everyone is busy or on a break: wait for the first agent to free up.
          let earliest = Infinity;
          let earliestAgent: string | null = null;
          for (const [agentId, intervals] of intervalsByAgent) {
            const free = Math.max(freeAt.get(agentId) ?? dayStart, enteredMs);
            const available = nextOnlineAt(intervals, free);
            if (available !== null && available < earliest) {
              earliest = available;
              earliestAgent = agentId;
            }
          }
          const waitMs = earliest - enteredMs;
          if (earliestAgent !== null && waitMs <= abandonAfterSec * 1000) {
            chosen = earliestAgent;
            connectMs = earliest + rng.int(2, 10) * 1000;
          }
        }

        callIdx++;
        const id = `call-b${pad(callIdx, 6)}`;

        if (chosen === null || connectMs === null) {
          // Abandoned in queue before any agent could take it.
          const enteredDate = new Date(enteredMs);
          out.push({
            id,
            agentId: queue.agentIds[0],
            customerId: customer.id,
            partnerId: customer.partnerId,
            timestamp: formatDateTime(enteredDate),
            routedAt: formatDateTime(enteredDate),
            answeredAt: null,
            answered: false,
            durationSec: 0,
            customerWaitSec: abandonAfterSec,
            agentWaitSec: 0,
            reviewTimeSec: 0,
            callStatus: 'User Dropped',
            agentStatus: undefined,
            agentDecision: 'failed',
            auditorDecision: undefined,
            auditorDecisionLegacy: null,
            auditorReason: null,
            auditorRemarks: null,
            auditorId: null,
            auditorReviewedAt: null,
            csatRating: null,
            dropStage: 'Before connecting',
          });
          continue;
        }

        const tier = agentQualityTier(chosen);
        const durationSec = generateCallDuration(rng, tier);
        const reviewTimeSec = tier === 'weak'
          ? rng.int(70, 160)
          : tier === 'amber'
            ? rng.int(35, 90)
            : rng.int(22, 55);
        freeAt.set(chosen, connectMs + (durationSec + reviewTimeSec) * 1000);

        const waitSec = Math.round((connectMs - enteredMs) / 1000);
        const approveP = tier === 'weak' ? 0.68 : tier === 'amber' ? 0.78 : 0.88;
        const agentDecision: 'approved' | 'rejected' | 'failed' = rng.next() < approveP
          ? 'approved'
          : (rng.next() < 0.75 ? 'failed' : 'rejected');
        const agentStatus = agentDecision === 'approved'
          ? 'Approved' as const
          : (agentDecision === 'failed' ? 'Unable to Verify' as const : 'Rejected' as const);

        let auditorDecision: 'Approved' | 'Rejected' | 'Recapture' | 'In Review' | undefined;
        let auditorId: string | null = null;
        let auditorReason: string | null = null;
        let auditorRemarks: string | null = null;
        let auditorReviewedAt: string | null = null;
        let csatRating: number | null = null;

        if (agentDecision === 'approved') {
          csatRating = sampleCsat(rng, customer.partnerId, tier);
          auditorId = rng.pick(auditors).id;
          if (d <= 2 && rng.next() < 0.16) {
            auditorDecision = 'In Review';
            auditorId = null;
          } else {
            const roll = rng.next();
            const approveCut = tier === 'weak' ? 0.85 : tier === 'amber' ? 0.93 : 0.965;
            const recaptureCut = tier === 'weak' ? 0.95 : 0.99;
            auditorDecision = roll < approveCut
              ? 'Approved'
              : (roll < recaptureCut ? 'Recapture' : 'Rejected');
            auditorReviewedAt = formatDateTime(
              new Date(connectMs + (durationSec + reviewTimeSec) * 1000),
            );
            if (auditorDecision === 'Recapture' || auditorDecision === 'Rejected') {
              auditorReason = auditorDecision === 'Recapture'
                ? pickRecaptureReason(`${id}-recapture`)
                : pickReasonForDecision(`${id}-auditor-rejected`, 'rejected');
              auditorRemarks = 'Re-capture recommended with better lighting.';
            }
          }
        } else {
          auditorReason = pickReasonForDecision(
            `${id}-${agentDecision === 'failed' ? 'unable' : 'rejected'}`,
            agentDecision === 'failed' ? 'unable' : 'rejected',
          );
        }

        out.push({
          id,
          agentId: chosen,
          customerId: customer.id,
          partnerId: customer.partnerId,
          timestamp: formatDateTime(new Date(enteredMs)),
          routedAt: formatDateTime(new Date(enteredMs)),
          answeredAt: formatDateTime(new Date(connectMs)),
          answered: true,
          durationSec,
          // Both wait fields now carry the same, real queue-to-connect wait.
          customerWaitSec: waitSec,
          agentWaitSec: waitSec,
          reviewTimeSec,
          callStatus: 'Connected',
          agentStatus,
          agentDecision,
          auditorDecision,
          auditorDecisionLegacy: auditorDecision === 'Approved'
            ? 'accepted'
            : (auditorDecision === 'Recapture'
              ? 'recapture'
              : (auditorDecision === 'Rejected' ? 'rejected' : null)),
          auditorReason,
          auditorRemarks,
          auditorId,
          auditorReviewedAt,
          csatRating,
          dropStage: undefined,
        });
      }
    }
  }

  return out;
}

/**
 * Ensure each partner has a realistic pending-auditor pool for today (approved
 * by agent, auditor pending), roughly 8–15 calls per partner.
 */
export function ensureTodayAuditorPending(calls: CallRecord[]): CallRecord[] {
  const today = formatDate(new Date());
  const copy = calls.map((c) => ({ ...c }));

  for (const partner of PARTNERS) {
    const target = 8 + (Math.abs(partner.id.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0)) % 8); // 8..15
    const eligible = copy
      .filter(
        (c) =>
          c.timestamp.startsWith(today)
          && c.partnerId === partner.id
          && c.callStatus === 'Connected'
          && c.agentStatus === 'Approved',
      )
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const pendingNow = eligible.filter((c) => c.auditorDecision === 'In Review').length;
    const need = Math.max(0, target - pendingNow);
    for (let i = 0; i < need && i < eligible.length; i++) {
      const call = eligible[i];
      call.auditorDecision = 'In Review';
      call.auditorDecisionLegacy = null;
      call.auditorId = null;
      call.auditorReason = null;
      call.auditorRemarks = null;
      call.auditorReviewedAt = null;
    }
  }

  return copy;
}

function pickReasonForDecision(seed: string, decision: 'unable' | 'rejected'): string {
  const pool = getReasonsByDecision(decision);
  const hash = Math.abs(seed.split('').reduce((s, ch) => s * 31 + ch.charCodeAt(0), 11));
  return pool[hash % pool.length]?.label ?? REJECTION_REASONS[0].label;
}

function pickRecaptureReason(seed: string): string {
  const pool = REJECTION_REASONS.filter((r) => AUDITOR_RECAPTURE_REASON_IDS.has(r.id));
  const hash = Math.abs(seed.split('').reduce((s, ch) => s * 31 + ch.charCodeAt(0), 13));
  return pool[hash % pool.length]?.label ?? 'Capture quality unacceptable';
}

/** Weighted toward early stages; still covers the full journey for chart variety. */
function pickDropStage(seed: string): DropStage {
  const weights = [28, 18, 14, 10, 8, 7, 6, 5, 4]; // sum 100
  const hash = Math.abs(seed.split('').reduce((s, ch) => s * 31 + ch.charCodeAt(0), 19));
  let roll = hash % 100;
  for (let i = 0; i < DROP_STAGES.length; i++) {
    roll -= weights[i];
    if (roll < 0) return DROP_STAGES[i];
  }
  return 'Before connecting';
}

function assertCallReasonDecisionConsistency(calls: CallRecord[]): CallRecord[] {
  for (const call of calls) {
    if (!call.auditorReason) continue;
    const meta = getReasonMeta(call.auditorReason);
    if (!meta) continue;
    if (call.callStatus === 'User Dropped') {
      if (meta.decision !== 'dropped') throw new Error(`Dropped reason mismatch for ${call.id}`);
      continue;
    }
    if (call.agentStatus === 'Unable to Verify') {
      if (meta.decision !== 'unable') throw new Error(`Unable reason mismatch for ${call.id}`);
      continue;
    }
    if (call.agentStatus === 'Rejected' || call.auditorDecision === 'Rejected') {
      if (meta.decision !== 'rejected') throw new Error(`Rejected reason mismatch for ${call.id}`);
      continue;
    }
    if (call.auditorDecision === 'Recapture' && meta.decision !== 'unable') {
      throw new Error(`Recapture reason mismatch for ${call.id}`);
    }
  }
  return calls;
}

/**
 * Force visible recent mix for call-history first page:
 * - unable-to-verify (answered + failed) ~5-8%
 * - rejected ~4-6%
 * - user-dropped (unanswered) present and recent
 */
export function ensureRecentDecisionMix(calls: CallRecord[]): CallRecord[] {
  const copy = calls.map((c) => ({ ...c }));
  const recent = [...copy]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 320);
  const total = recent.length || 1;
  const targetUnable = Math.max(16, Math.round(total * 0.065));
  const targetRejected = Math.max(13, Math.round(total * 0.05));
  const targetDropped = Math.max(14, Math.round(total * 0.05));

  let unableNow = recent.filter((c) => c.callStatus === 'Connected' && c.agentStatus === 'Unable to Verify').length;
  let rejectedNow = recent.filter((c) => c.callStatus === 'Connected' && c.agentStatus === 'Rejected').length;
  let droppedNow = recent.filter((c) => c.callStatus === 'User Dropped').length;

  for (const call of recent) {
    if (unableNow < targetUnable && call.callStatus === 'Connected' && call.agentStatus === 'Approved') {
      call.agentStatus = 'Unable to Verify';
      call.agentDecision = 'failed';
      call.auditorDecision = undefined;
      call.auditorDecisionLegacy = null;
      call.auditorId = null;
      call.auditorReason = pickReasonForDecision(call.id, 'unable');
      call.auditorRemarks = null;
      call.auditorReviewedAt = null;
      unableNow++;
      continue;
    }
    if (rejectedNow < targetRejected && call.callStatus === 'Connected' && call.agentStatus === 'Approved') {
      call.agentStatus = 'Rejected';
      call.agentDecision = 'rejected';
      call.auditorDecision = undefined;
      call.auditorDecisionLegacy = null;
      call.auditorReason = pickReasonForDecision(`${call.id}-r`, 'rejected');
      call.auditorRemarks = null;
      call.auditorReviewedAt = null;
      rejectedNow++;
      continue;
    }
    if (droppedNow < targetDropped && call.callStatus === 'Connected' && call.agentStatus === 'Approved') {
      call.callStatus = 'User Dropped';
      call.answered = false;
      call.answeredAt = null;
      call.durationSec = 0;
      call.agentStatus = undefined;
      call.agentDecision = 'failed';
      call.agentWaitSec = 0;
      call.reviewTimeSec = 0;
      call.auditorDecision = undefined;
      call.auditorDecisionLegacy = null;
      call.auditorId = null;
      call.auditorReason = null;
      call.auditorRemarks = null;
      call.auditorReviewedAt = null;
      call.csatRating = null;
      call.dropStage = pickDropStage(`${call.id}-drop`);
      droppedNow++;
    }
  }

  return copy;
}

/**
 * Ensure today's non-approved mix is chart-ready:
 * each status ≥3 cases, and failures spread across peak hours.
 */
export function ensureTodayFailureChartMix(calls: CallRecord[]): CallRecord[] {
  const copy = calls.map((c) => ({ ...c }));
  const today = formatDate(new Date());
  const todayRows = copy.filter((c) => c.timestamp.startsWith(today));

  const countOf = (pred: (c: CallRecord) => boolean) => todayRows.filter(pred).length;
  const targets: Array<{ status: string; need: number; pred: (c: CallRecord) => boolean; apply: (c: CallRecord) => void }> = [
    {
      status: 'Unable to Verify',
      need: 8,
      pred: (c) => c.callStatus === 'Connected' && c.agentStatus === 'Unable to Verify',
      apply: (c) => {
        c.callStatus = 'Connected';
        c.answered = true;
        c.agentStatus = 'Unable to Verify';
        c.agentDecision = 'failed';
        c.auditorDecision = undefined;
        c.auditorDecisionLegacy = null;
        c.auditorId = null;
        c.auditorReason = pickReasonForDecision(c.id, 'unable');
        c.auditorRemarks = null;
        c.auditorReviewedAt = null;
        c.csatRating = null;
        c.dropStage = undefined;
        if (!c.answeredAt) c.answeredAt = c.routedAt;
        if (c.durationSec <= 0) c.durationSec = 120;
      },
    },
    {
      status: 'Rejected',
      need: 6,
      pred: (c) => c.callStatus === 'Connected' && c.agentStatus === 'Rejected',
      apply: (c) => {
        c.callStatus = 'Connected';
        c.answered = true;
        c.agentStatus = 'Rejected';
        c.agentDecision = 'rejected';
        c.auditorDecision = undefined;
        c.auditorDecisionLegacy = null;
        c.auditorId = null;
        c.auditorReason = pickReasonForDecision(`${c.id}-r`, 'rejected');
        c.auditorRemarks = null;
        c.auditorReviewedAt = null;
        c.csatRating = null;
        c.dropStage = undefined;
        if (!c.answeredAt) c.answeredAt = c.routedAt;
        if (c.durationSec <= 0) c.durationSec = 140;
      },
    },
    {
      status: 'Recapture',
      need: 6,
      pred: (c) => c.callStatus === 'Connected' && c.agentStatus === 'Approved' && c.auditorDecision === 'Recapture',
      apply: (c) => {
        c.callStatus = 'Connected';
        c.answered = true;
        c.agentStatus = 'Approved';
        c.agentDecision = 'approved';
        c.auditorDecision = 'Recapture';
        c.auditorDecisionLegacy = 'recapture';
        c.auditorReason = pickRecaptureReason(`${c.id}-recapture`);
        c.auditorRemarks = 'Re-capture recommended with better lighting.';
        c.dropStage = undefined;
        if (!c.answeredAt) c.answeredAt = c.routedAt;
        if (c.durationSec <= 0) c.durationSec = 180;
        if (!c.auditorId) c.auditorId = 'auditor-01';
        if (!c.auditorReviewedAt) c.auditorReviewedAt = c.answeredAt;
      },
    },
    {
      status: 'Auditor Rejected',
      need: 4,
      pred: (c) => c.callStatus === 'Connected' && c.agentStatus === 'Approved' && c.auditorDecision === 'Rejected',
      apply: (c) => {
        c.callStatus = 'Connected';
        c.answered = true;
        c.agentStatus = 'Approved';
        c.agentDecision = 'approved';
        c.auditorDecision = 'Rejected';
        c.auditorDecisionLegacy = 'rejected';
        c.auditorReason = pickReasonForDecision(`${c.id}-ar`, 'rejected');
        c.auditorRemarks = 'Mismatch observed in submitted details.';
        c.dropStage = undefined;
        if (!c.answeredAt) c.answeredAt = c.routedAt;
        if (c.durationSec <= 0) c.durationSec = 160;
        if (!c.auditorId) c.auditorId = 'auditor-01';
        if (!c.auditorReviewedAt) c.auditorReviewedAt = c.answeredAt;
      },
    },
    {
      status: 'User Dropped',
      need: 12,
      pred: (c) => c.callStatus === 'User Dropped',
      apply: (c) => {
        c.callStatus = 'User Dropped';
        c.answered = false;
        c.answeredAt = null;
        c.durationSec = 0;
        c.agentStatus = undefined;
        c.agentDecision = 'failed';
        c.agentWaitSec = 0;
        c.reviewTimeSec = 0;
        c.auditorDecision = undefined;
        c.auditorDecisionLegacy = null;
        c.auditorId = null;
        c.auditorReason = null;
        c.auditorRemarks = null;
        c.auditorReviewedAt = null;
        c.csatRating = null;
        c.dropStage = pickDropStage(`${c.id}-today-drop`);
      },
    },
  ];

  const convertible = todayRows
    .filter((c) => c.callStatus === 'Connected' && c.agentStatus === 'Approved' && c.auditorDecision === 'Approved')
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  let cursor = 0;

  for (const t of targets) {
    const have = countOf(t.pred);
    const need = Math.max(0, t.need - have);
    for (let i = 0; i < need && cursor < convertible.length; i++, cursor++) {
      t.apply(convertible[cursor]);
    }
  }

  // Spread today's failures across peak hours (10–13, 15–18 heavier).
  const peakHours = [10, 11, 12, 13, 15, 16, 17, 18];
  const offPeak = [9, 14, 19, 20];
  const failures = todayRows.filter(
    (c) =>
      c.callStatus === 'User Dropped'
      || c.agentStatus === 'Unable to Verify'
      || c.agentStatus === 'Rejected'
      || c.auditorDecision === 'Recapture'
      || c.auditorDecision === 'Rejected',
  );
  failures.forEach((c, i) => {
    const hourPool = i % 5 === 0 ? offPeak : peakHours;
    const hour = hourPool[Math.abs(c.id.split('').reduce((s, ch) => s + ch.charCodeAt(0), 0)) % hourPool.length];
    const minute = Math.abs(c.id.split('').reduce((s, ch) => s * 17 + ch.charCodeAt(0), 3)) % 60;
    const d = new Date(c.timestamp);
    d.setHours(hour, minute, d.getSeconds(), 0);
    const next = formatDateTime(d);
    c.timestamp = next;
    c.routedAt = next;
    if (c.answeredAt) {
      const ans = new Date(d.getTime() + Math.max(5, c.agentWaitSec) * 1000);
      c.answeredAt = formatDateTime(ans);
    }
  });

  // Ensure every drop stage appears at least once today when enough drops exist.
  const todayDrops = todayRows.filter((c) => c.callStatus === 'User Dropped');
  DROP_STAGES.forEach((stage, i) => {
    if (i < todayDrops.length) todayDrops[i].dropStage = stage;
  });

  return copy;
}

export function assertCallStatusModel(calls: CallRecord[]): CallRecord[] {
  for (const call of calls) {
    if (call.callStatus === 'User Dropped') {
      if (call.agentStatus || call.auditorDecision) {
        throw new Error(`Invalid dropped call model for ${call.id}`);
      }
      if (!call.dropStage) {
        throw new Error(`Missing dropStage for dropped call ${call.id}`);
      }
      continue;
    }
    if (call.dropStage) {
      throw new Error(`dropStage set on non-dropped call ${call.id}`);
    }
    if (!call.agentStatus) {
      throw new Error(`Missing agent status for connected call ${call.id}`);
    }
    if (call.agentStatus !== 'Approved' && call.auditorDecision) {
      throw new Error(`Invalid auditor decision on non-approved agent call ${call.id}`);
    }
  }
  return assertCallReasonDecisionConsistency(calls);
}

// Journey entries model every customer who STARTED VKYC on a given day —
// including those who dropped in the queue and never connected to an agent.
// This gives customer-conversion a larger denominator than call-conversion.
const JOURNEY_CONNECT_RATE: Record<PartnerId, number> = {
  PAISABAZAAR: 0.9,
  CREDILIO: 0.88,
  NIYO: 0.84,
  ZET: 0.91,
  GENERAL: 0.86,
};

const JOURNEY_CALL_CONV: Record<PartnerId, number> = {
  PAISABAZAAR: 0.91,
  CREDILIO: 0.88,
  NIYO: 0.86,
  ZET: 0.9,
  GENERAL: 0.87,
};

const JOURNEY_DAILY_ENTRIES: Record<PartnerId, number> = {
  PAISABAZAAR: 320,
  CREDILIO: 240,
  NIYO: 210,
  ZET: 180,
  GENERAL: 90,
};

export function generateJourneyEntries(rng: SeededRNG): JourneyEntry[] {
  const entries: JourneyEntry[] = [];
  const now = new Date();
  // Today (0) and yesterday (1) so conversion cards can show a delta.
  for (let d = 0; d < 2; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const dateStr = formatDate(date);
    // Slightly lower volume yesterday so today shows a positive-ish delta.
    const dayScale = d === 0 ? 1 : 0.96;

    for (const partner of PARTNERS) {
      const total = Math.round(JOURNEY_DAILY_ENTRIES[partner.id] * dayScale);
      const connectRate = JOURNEY_CONNECT_RATE[partner.id];
      const callConv = JOURNEY_CALL_CONV[partner.id];
      for (let i = 0; i < total; i++) {
        const connected = rng.next() < connectRate;
        const approved = connected && rng.next() < callConv;
        entries.push({
          id: `journey-${partner.id}-${dateStr}-${i}`,
          date: dateStr,
          partnerId: partner.id,
          connected,
          approved,
        });
      }
    }
  }
  return entries;
}

export function generateAttendance(rng: SeededRNG, agents: Agent[]): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const now = new Date();

  for (const agent of agents) {
    const tier = agentQualityTier(agent.id);
    for (let d = 0; d < 90; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      if (date.getDay() === 0) continue;

      // Strong agents hit ~7.5–8.2h online; weak agents often under 7h.
      const loginHour = tier === 'weak' ? rng.int(9, 10) : rng.int(8, 9);
      const loginMin = rng.int(0, 30);
      const logoutHour = tier === 'weak' ? rng.int(16, 17) : rng.int(17, 18);
      const logoutMin = rng.int(0, 45);
      const totalOnlineMin = Math.max(300, (logoutHour * 60 + logoutMin) - (loginHour * 60 + loginMin));
      const totalBreakMin = tier === 'weak' ? rng.int(55, 90) : tier === 'amber' ? rng.int(45, 70) : rng.int(40, 60);
      const idleMin = tier === 'weak' ? rng.int(30, 55) : rng.int(12, 35);
      const plannedMin = 8 * 60;
      const adherencePct = Math.min(100, Math.round(((totalOnlineMin - idleMin) / plannedMin) * 100));
      const lunchMin = Math.round(totalBreakMin * rng.float(0.55, 0.7));
      const shortTotal = Math.max(0, totalBreakMin - lunchMin);
      const short1 = Math.floor(shortTotal / 2);
      const short2 = shortTotal - short1;
      // Breaks are staggered in waves off the agent id (not the RNG stream, so
      // no other seeded value shifts). Without this the whole floor lunches at
      // once and capacity drops to zero for half an hour.
      const wave = breakWave(agent.id);
      const lunchStartHour = 12 + wave;
      const lunchStartMin = 5 + rng.int(-8, 10);
      const short1StartHour = 10 + (wave === 2 ? 1 : 0);
      const short1StartMin = 20 * wave + rng.int(-15, 20);
      const short2StartHour = 16 + (wave === 2 ? 1 : 0);
      const short2StartMin = 10 + 20 * wave + rng.int(-20, 15);
      const breakIntervals = [
        {
          start: clockOf(short1StartHour * 60 + short1StartMin),
          end: addMinutesClock(short1StartHour, short1StartMin, short1),
          durationMin: short1,
        },
        {
          start: clockOf(lunchStartHour * 60 + lunchStartMin),
          end: addMinutesClock(lunchStartHour, lunchStartMin, lunchMin),
          durationMin: lunchMin,
        },
        {
          start: clockOf(short2StartHour * 60 + short2StartMin),
          end: addMinutesClock(short2StartHour, short2StartMin, short2),
          durationMin: short2,
        },
      ].filter((b) => b.durationMin > 0);

      records.push({
        date: formatDate(date),
        agentId: agent.id,
        loginAt: `${pad(loginHour)}:${pad(loginMin)}`,
        logoutAt: `${pad(logoutHour)}:${pad(logoutMin)}`,
        breakIntervals,
        totalOnlineMin,
        totalBreakMin,
        idleMin,
        adherencePct,
      });
    }
  }
  return records;
}

export function generateAuditorAttendance(rng: SeededRNG, auditors: Auditor[]): AuditorAttendanceRecord[] {
  const records: AuditorAttendanceRecord[] = [];
  const now = new Date();

  for (const auditor of auditors) {
    // Deterministic tier from id — mirrors agent attendance variance.
    const tierRoll = Math.abs(auditor.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)) % 10;
    const tier = tierRoll < 6 ? 'strong' : tierRoll < 9 ? 'amber' : 'weak';

    for (let d = 0; d < 90; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      if (date.getDay() === 0) continue;

      const loginHour = tier === 'weak' ? rng.int(9, 10) : rng.int(8, 9);
      const loginMin = rng.int(0, 30);
      const logoutHour = tier === 'weak' ? rng.int(16, 17) : rng.int(17, 18);
      const logoutMin = rng.int(0, 45);
      const totalOnlineMin = Math.max(300, (logoutHour * 60 + logoutMin) - (loginHour * 60 + loginMin));
      const totalBreakMin = tier === 'weak' ? rng.int(50, 85) : tier === 'amber' ? rng.int(40, 65) : rng.int(35, 55);
      const idleMin = tier === 'weak' ? rng.int(25, 50) : rng.int(10, 30);
      const plannedMin = 8 * 60;
      const adherencePct = Math.min(100, Math.round(((totalOnlineMin - idleMin) / plannedMin) * 100));
      const lunchMin = Math.round(totalBreakMin * rng.float(0.55, 0.7));
      const shortTotal = Math.max(0, totalBreakMin - lunchMin);
      const short1 = Math.floor(shortTotal / 2);
      const short2 = shortTotal - short1;
      // Breaks are staggered in waves off the agent id (not the RNG stream, so
      // no other seeded value shifts). Without this the whole floor lunches at
      // once and capacity drops to zero for half an hour.
      const wave = breakWave(auditor.id);
      const lunchStartHour = 12 + wave;
      const lunchStartMin = 5 + rng.int(-8, 10);
      const short1StartHour = 10 + (wave === 2 ? 1 : 0);
      const short1StartMin = 20 * wave + rng.int(-15, 20);
      const short2StartHour = 16 + (wave === 2 ? 1 : 0);
      const short2StartMin = 10 + 20 * wave + rng.int(-20, 15);
      const breakIntervals = [
        {
          start: clockOf(short1StartHour * 60 + short1StartMin),
          end: addMinutesClock(short1StartHour, short1StartMin, short1),
          durationMin: short1,
        },
        {
          start: clockOf(lunchStartHour * 60 + lunchStartMin),
          end: addMinutesClock(lunchStartHour, lunchStartMin, lunchMin),
          durationMin: lunchMin,
        },
        {
          start: clockOf(short2StartHour * 60 + short2StartMin),
          end: addMinutesClock(short2StartHour, short2StartMin, short2),
          durationMin: short2,
        },
      ].filter((b) => b.durationMin > 0);

      records.push({
        date: formatDate(date),
        auditorId: auditor.id,
        loginAt: `${pad(loginHour)}:${pad(loginMin)}`,
        logoutAt: `${pad(logoutHour)}:${pad(logoutMin)}`,
        breakIntervals,
        totalOnlineMin,
        totalBreakMin,
        idleMin,
        adherencePct,
      });
    }
  }
  return records;
}

export function generateWebhookEvents(
  customer: Customer,
  agent: Agent,
  sessionId: string,
): WebhookEvent[] {
  const base = new Date();
  const events: WebhookEvent[] = [];
  const types = [
    'CREATE_USER', 'WEBLINK_GENERATED', 'CALL_SCHEDULED', 'CUSTOMER_ARRIVED',
    'LOOKING_FOR_AGENT', 'CALL_INITIATED', 'CALL_COMPLETED', 'AUDITOR_DECISION', 'DMS_PUSH',
  ] as const;

  types.forEach((event, i) => {
    const ts = new Date(base.getTime() + i * 60000);
    const payload: Record<string, unknown> = {
      transactionId: `TXN${customer.appId.slice(-10)}`,
      requestId: `REQ${sessionId.slice(-8)}`,
      sessionId,
      timeStamp: formatDateTime(ts),
    };
    if (i >= 4) {
      payload.agentId = agent.employeeId;
      payload.agentUserName = agent.name;
    }
    if (event === 'CALL_COMPLETED') payload.agentStatus = 'approved';
    if (event === 'DMS_PUSH') payload.DocumentIndex = rng.int(1, 100);

    events.push({
      event,
      transactionId: payload.transactionId as string,
      requestId: payload.requestId as string,
      agentId: payload.agentId as string | undefined,
      agentUserName: payload.agentUserName as string | undefined,
      sessionId,
      timeStamp: payload.timeStamp as string,
      payload,
    });
  });
  return events;
}

const rng = new SeededRNG(99);

export function getDemoCustomer(allCustomers: Customer[]): Customer {
  const base = allCustomers.find((c) => c.partnerId === 'ZET') ?? allCustomers[0];
  return {
    ...base,
    ...DEMO_CUSTOMER_OVERRIDES,
    productType: PARTNER_PRODUCT_CATALOGS.ZET[0],
  };
}

const REPEAT_DECISIONS: Array<'Unable to Verify' | 'Call Ended — Incomplete'> = [
  'Unable to Verify',
  'Unable to Verify',
  'Unable to Verify',
  'Call Ended — Incomplete',
];

const REPEAT_REMARKS = [
  'Video froze twice during liveness check',
  'Customer audio kept dropping on and off',
  'Lighting changed suddenly and face capture failed',
  'Customer switched apps mid-call and session reset',
];

function makePreviousAttempt(
  rng: SeededRNG,
  allAgents: Agent[],
  daysAgo: number,
): NonNullable<Customer['previousAttempt']> {
  const category = rng.pick(REJECTION_CATEGORIES.slice(1, 4));
  const previousDate = new Date();
  previousDate.setDate(previousDate.getDate() - daysAgo);
  return {
    date: formatDate(previousDate),
    decision: rng.pick(REPEAT_DECISIONS),
    reasonCategory: category.label,
    reason: rng.pick(category.reasons),
    agentRemarks: rng.next() < 0.65 ? rng.pick(REPEAT_REMARKS) : undefined,
    agentName: rng.pick(allAgents).name,
  };
}

export function buildIncomingCustomer(rng: SeededRNG, allCustomers: Customer[], allAgents: Agent[]): Customer {
  const base = { ...rng.pick(allCustomers) };
  const isRepeat = rng.next() < 0.28; // ~25–30%
  if (!isRepeat) {
    return { ...base, attemptNumber: 1, previousAttempt: undefined, previousAttempts: undefined };
  }

  // ~40% of repeats get two prior attempts.
  const twoPriors = rng.next() < 0.4;
  const latest = makePreviousAttempt(rng, allAgents, rng.int(1, 5));
  const earlier = twoPriors ? makePreviousAttempt(rng, allAgents, rng.int(6, 14)) : null;
  const previousAttempts = earlier ? [latest, earlier] : [latest];

  return {
    ...base,
    attemptNumber: previousAttempts.length + 1,
    previousAttempt: latest,
    previousAttempts,
  };
}

export function buildCallSession(_rng: SeededRNG, customer: Customer) {
  return {
    customer,
    livenessCode: String(_rng.int(100000, 999999)),
    location: {
      lat: SBM_LOWER_PAREL.lat,
      lng: SBM_LOWER_PAREL.lng,
      city: SBM_LOWER_PAREL.city,
      state: SBM_LOWER_PAREL.state,
      pincode: SBM_LOWER_PAREL.pincode,
      district: SBM_LOWER_PAREL.district,
      country: SBM_LOWER_PAREL.country,
      ip: '103.21.244.8',
      distanceCurrentKm: 4.165,
      distancePermanentKm: 4.165,
      plusCode: SBM_LOWER_PAREL.plusCode,
      area: SBM_LOWER_PAREL.area,
      accuracyMeters: SBM_LOWER_PAREL.accuracyMeters,
      address: SBM_LOWER_PAREL.address,
    },
    faceMatchAadhaar: 93.52,
    faceMatchPan: 45.63,
  };
}
