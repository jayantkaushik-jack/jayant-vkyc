export type DimensionLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'NOT_AVAILABLE';

export interface Dimension {
  level: DimensionLevel;
  /** Plain-language phrase — never a raw rule ID. Omitted when the dimension has nothing notable to say. */
  primarySignal?: string;
}

/**
 * Mule Sentinel v1's five output dimensions — a separate layer from the three
 * computation pillars. Round 15: renamed to read better to a bank reviewer
 * (`identityAuthenticity`→`identity`, `telecomIntelligence`→`telecom`,
 * `fraudCompliance`→`paymentFraudBlacklists`, `paymentBehaviour`→
 * `coherenceRisk` — confirmed with the user before renaming, since the last
 * one reads as a bigger jump than the other three). Positional order is
 * unchanged from before the rename — reordering would also change the
 * severity tie-break in rankedNonLowDimensions below, which nothing in this
 * round asked for.
 */
export interface RiskDimensions {
  identity: Dimension;
  digitalPresence: Dimension;
  telecom: Dimension;
  paymentFraudBlacklists: Dimension;
  coherenceRisk: Dimension;
}

export const DIMENSION_LABELS: Record<keyof RiskDimensions, string> = {
  identity: 'Identity',
  digitalPresence: 'Digital Presence',
  telecom: 'Telecom',
  paymentFraudBlacklists: 'Payment Fraud & Blacklists',
  coherenceRisk: 'Coherence Risk',
};

/** Fixed PRD dimension order — the tie-break for ranking-by-severity wherever that's needed. */
export const DIMENSION_ORDER: (keyof RiskDimensions)[] = [
  'identity',
  'digitalPresence',
  'telecom',
  'paymentFraudBlacklists',
  'coherenceRisk',
];

const SEVERITY_RANK: Record<DimensionLevel, number> = { HIGH: 3, MEDIUM: 2, LOW: 1, NOT_AVAILABLE: 0 };

/**
 * The v1 score/band an amber case carries *before* any question is asked —
 * this is why the case is amber at all: the automated score alone landed in
 * the ambiguous middle, not because the case is secretly guilty or innocent.
 * Genuine and mule personas both sit in MEDIUM here; the tree is what tells
 * them apart. Sample-only cases (see SAMPLE_CASES below) are LOW/HIGH
 * because they were never ambiguous — that's the point of the contrast.
 */
export interface RiskSnapshot {
  muleScore: number;
  muleScoreBand: 'LOW' | 'MEDIUM' | 'HIGH';
  dimensions: RiskDimensions;
}

/**
 * Shared ranking used by every "what's the headline risk here" line in the
 * build (call-screen Fired Signal, Accept/Reject card, queue table) — one
 * rule, not a different one per component: severity first, ties broken by
 * the fixed PRD dimension order.
 */
function allDimensionsOrdered(riskSnapshot: RiskSnapshot) {
  return DIMENSION_ORDER.map((key) => ({ key, dim: riskSnapshot.dimensions[key] }));
}

function rankedNonLowDimensions(riskSnapshot: RiskSnapshot) {
  return allDimensionsOrdered(riskSnapshot)
    .filter(({ dim }) => dim.level === 'HIGH' || dim.level === 'MEDIUM')
    .sort((a, b) => SEVERITY_RANK[b.dim.level] - SEVERITY_RANK[a.dim.level]); // stable sort keeps DIMENSION_ORDER as the tie-break
}

function topFlaggedDimension(riskSnapshot: RiskSnapshot) {
  const nonLow = rankedNonLowDimensions(riskSnapshot);
  return nonLow[0] ?? allDimensionsOrdered(riskSnapshot)[0];
}

/**
 * The call-screen "Fired Signal" line — same dimensions/primary_signal data
 * the Risk Snapshot modal already renders, ranked by severity (ties broken
 * by DIMENSION_ORDER) rather than a numeric weight, since none exists yet.
 * "+N more" counts non-LOW dimensions beyond the one shown, not
 * firedRules.length — a different taxonomy that would undercut the line's
 * own premise. Never returns blank: falls back to a boundary message when
 * nothing non-LOW carries a primary_signal to quote.
 */
export function getFiredSignalLine(riskSnapshot: RiskSnapshot): string {
  const nonLow = rankedNonLowDimensions(riskSnapshot);
  const withSignal = nonLow.filter(({ dim }) => dim.primarySignal);

  if (withSignal.length === 0) {
    const top = topFlaggedDimension(riskSnapshot);
    return `Flagged: ${DIMENSION_LABELS[top.key]} — near band boundary`;
  }

  const top = withSignal[0];
  const moreCount = nonLow.length - 1;
  const levelLabel = top.dim.level === 'HIGH' ? 'High Risk' : 'Medium Risk';
  return `Fired: ${top.dim.primarySignal} · ${DIMENSION_LABELS[top.key]} · ${levelLabel}${moreCount > 0 ? ` +${moreCount} more` : ''}`;
}

export interface FiredSignalParts {
  reason: string;
  dimensionLabel: string;
  level: DimensionLevel;
  /** Non-LOW dimensions flagged beyond the one shown — same count getFiredSignalLine's "+N more" already used. */
  moreCount: number;
}

/**
 * Structured version of getFiredSignalLine (round 15, §5) — the redesigned
 * Customer Details callout renders the free-text reason and the
 * dimension/tier/"+N more" as separate chips rather than one joined
 * string, so this returns the same ranked data un-joined. Same fallback
 * rule: null only when there's truly nothing non-LOW to show (the "near
 * band boundary" case), which the caller renders its own way.
 */
export function getFiredSignalParts(riskSnapshot: RiskSnapshot): FiredSignalParts | null {
  const nonLow = rankedNonLowDimensions(riskSnapshot);
  const withSignal = nonLow.filter(({ dim }) => dim.primarySignal);
  if (withSignal.length === 0) return null;

  const top = withSignal[0];
  return {
    reason: top.dim.primarySignal ?? '',
    dimensionLabel: DIMENSION_LABELS[top.key],
    level: top.dim.level,
    moreCount: nonLow.length - 1,
  };
}

/**
 * Accept/Reject card's compact risk line (round 3, item A1) — same ranking
 * as getFiredSignalLine, split into an always-present score+dimension line
 * and a conditional "Fired: <primary_signal>" line, omitted entirely for
 * aggregate-only amber cases rather than rendered as "Fired: —".
 */
export function getRiskSummaryLines(riskSnapshot: RiskSnapshot): { scoreLine: string; firedLine: string | null } {
  const top = topFlaggedDimension(riskSnapshot);
  const levelLabel = top.dim.level === 'HIGH' ? 'High' : top.dim.level === 'MEDIUM' ? 'Medium' : 'Low';
  return {
    scoreLine: `Score ${riskSnapshot.muleScore} · Flagged: ${DIMENSION_LABELS[top.key]} (${levelLabel})`,
    firedLine: top.dim.primarySignal ? `Fired: ${top.dim.primarySignal}` : null,
  };
}

export interface AmberPersona {
  id: 'ramesh' | 'suresh' | 'rameshyadav' | 'meenadevi' | 'bhagwansingh' | 'dilipchaudhary' | 'lakshmi' | 'meena';
  name: string;
  age: number;
  declaredAddress: string;
  declaredOccupation: string;
  /** Shown on the applicant's own form — used to seed the customer record. */
  declaredAnnualIncome?: number;
  /** Never shown to the applicant. Revealed on the agent panel only at resolution. */
  hidden: {
    simCircle?: string;
    simTenureMonths?: number;
    simProcuredLabel?: string;
  };
  firedRules: string[];
  /** Which rule tree in RULE_TREES drives this persona's resolution. */
  primaryTreeId: string;
  riskSnapshot: RiskSnapshot;
  onboardingChannel: 'Self-Serve App' | 'Assisted — BC Agent';
  /**
   * Only meaningful (and only ever rendered) when onboardingChannel is
   * 'Assisted — BC Agent'. Format: BC-<2-letter state code>-<4-digit zone
   * code>-<4-digit sequential agent ID>, state prefix tied to the
   * applicant's own declared address so it reads as regionally authentic
   * rather than a random string.
   */
  bcSourcingCode?: string;
}

/**
 * View-only sample cases for the Risk Snapshot contrast — auto-decided by
 * v1 alone, never reach an agent, carry no question tree. Exist purely so
 * an Amber case's "genuinely mixed" dimensions have a Green and a Red case
 * to be contrasted against on the same screen.
 */
export interface SampleCase {
  id: string;
  name: string;
  declaredOccupation: string;
  declaredAddress: string;
  riskSnapshot: RiskSnapshot;
}

export const SAMPLE_CASES: SampleCase[] = [
  {
    id: 'sample_green',
    name: 'Anita Rao',
    declaredOccupation: 'Software Engineer',
    declaredAddress: 'Koramangala, Bengaluru, Karnataka',
    riskSnapshot: {
      muleScore: 14,
      muleScoreBand: 'LOW',
      dimensions: {
        identity: { level: 'LOW' },
        digitalPresence: { level: 'LOW' },
        telecom: { level: 'LOW' },
        paymentFraudBlacklists: { level: 'LOW' },
        coherenceRisk: { level: 'LOW', primarySignal: '12 months of on-time utility payments on file' },
      },
    },
  },
  {
    id: 'sample_red',
    name: 'Deepak Malhotra',
    declaredOccupation: 'Import-Export Consultant',
    declaredAddress: 'Karol Bagh, Delhi',
    riskSnapshot: {
      muleScore: 91,
      muleScoreBand: 'HIGH',
      dimensions: {
        identity: { level: 'HIGH', primarySignal: 'Submitted document flagged on a prior application' },
        digitalPresence: { level: 'HIGH', primarySignal: 'Same device linked to several other recent onboarding attempts' },
        telecom: { level: 'HIGH', primarySignal: 'Mobile connection procured two days before this application' },
        paymentFraudBlacklists: { level: 'HIGH', primarySignal: 'Declared occupation and income diverge sharply, with no explanation offered' },
        coherenceRisk: { level: 'MEDIUM' },
      },
    },
  },
];

export const PERSONAS: Record<AmberPersona['id'], AmberPersona> = {
  ramesh: {
    id: 'ramesh',
    name: 'Ramesh Kumar',
    age: 28,
    declaredAddress: 'Agra, Uttar Pradesh',
    declaredOccupation: 'Hotel worker',
    hidden: {
      simCircle: 'Maharashtra',
      simTenureMonths: 50,
      simProcuredLabel: '4 years 2 months ago',
    },
    firedRules: ['SIM circle does not match declared address'],
    primaryTreeId: 'sim_circle_mismatch',
    riskSnapshot: {
      muleScore: 35,
      muleScoreBand: 'MEDIUM',
      dimensions: {
        identity: { level: 'LOW' },
        digitalPresence: { level: 'LOW' },
        telecom: { level: 'MEDIUM', primarySignal: 'SIM circle does not match declared address' },
        paymentFraudBlacklists: { level: 'LOW' },
        coherenceRisk: { level: 'NOT_AVAILABLE' },
      },
    },
    onboardingChannel: 'Assisted — BC Agent',
    bcSourcingCode: 'BC-UP-0412-8834',
  },
  suresh: {
    id: 'suresh',
    name: 'Suresh Yadav',
    age: 24,
    declaredAddress: 'Agra, Uttar Pradesh',
    declaredOccupation: 'Shop assistant',
    hidden: {
      simCircle: 'Maharashtra',
      simTenureMonths: 0.4,
      simProcuredLabel: '12 days ago',
    },
    firedRules: [
      'SIM circle does not match declared address',
      'No EPFO record despite declared employment',
    ],
    primaryTreeId: 'sim_circle_mismatch',
    riskSnapshot: {
      muleScore: 58,
      muleScoreBand: 'MEDIUM',
      dimensions: {
        identity: { level: 'MEDIUM', primarySignal: 'No EPFO record despite declared employment' },
        digitalPresence: { level: 'LOW' },
        telecom: { level: 'HIGH', primarySignal: 'SIM circle does not match declared address, procured 12 days ago' },
        paymentFraudBlacklists: { level: 'MEDIUM' },
        coherenceRisk: { level: 'NOT_AVAILABLE' },
      },
    },
    onboardingChannel: 'Self-Serve App',
  },
  rameshyadav: {
    id: 'rameshyadav',
    name: 'Ramesh Yadav',
    age: 42,
    declaredAddress: 'Meerut, Uttar Pradesh',
    declaredOccupation: 'Farmer',
    declaredAnnualIncome: 230000,
    hidden: {},
    firedRules: [
      'No EPFO record found',
      'Declared income significantly exceeds the pincode benchmark for this occupation (Farmer, ₹2.3L)',
    ],
    primaryTreeId: 'farmer_income_mismatch',
    riskSnapshot: {
      muleScore: 38,
      muleScoreBand: 'MEDIUM',
      dimensions: {
        identity: { level: 'MEDIUM', primarySignal: 'No EPFO record found' },
        digitalPresence: { level: 'LOW' },
        telecom: { level: 'LOW' },
        paymentFraudBlacklists: { level: 'LOW' },
        coherenceRisk: { level: 'MEDIUM', primarySignal: 'Declared income significantly exceeds the pincode benchmark for this occupation (Farmer, ₹2.3L)' },
      },
    },
    onboardingChannel: 'Assisted — BC Agent',
    bcSourcingCode: 'BC-UP-0421-1102',
  },
  meenadevi: {
    id: 'meenadevi',
    name: 'Meena Devi',
    age: 34,
    declaredAddress: 'Nashik, Maharashtra',
    declaredOccupation: 'Farmer',
    declaredAnnualIncome: 600000,
    hidden: {},
    firedRules: [
      'No EPFO record found',
      'Declared income is in the extreme upper percentile bracket for Farmers occupation (Farmer, ₹6.0L)',
    ],
    primaryTreeId: 'farmer_income_mismatch',
    riskSnapshot: {
      muleScore: 44,
      muleScoreBand: 'MEDIUM',
      dimensions: {
        identity: { level: 'MEDIUM', primarySignal: 'No EPFO record found' },
        digitalPresence: { level: 'LOW' },
        telecom: { level: 'LOW' },
        paymentFraudBlacklists: { level: 'LOW' },
        coherenceRisk: { level: 'HIGH', primarySignal: 'Declared income is in the extreme upper percentile bracket for Farmers occupation (Farmer, ₹6.0L)' },
      },
    },
    onboardingChannel: 'Self-Serve App',
  },
  bhagwansingh: {
    id: 'bhagwansingh',
    name: 'Bhagwan Singh',
    age: 39,
    declaredAddress: 'Yavatmal, Maharashtra',
    declaredOccupation: 'Farmer',
    declaredAnnualIncome: 350000,
    hidden: {},
    firedRules: [
      'No EPFO record found',
      'Declared income significantly exceeds the pincode benchmark for this occupation (Farmer, ₹3.5L)',
    ],
    primaryTreeId: 'farmer_income_mismatch',
    riskSnapshot: {
      muleScore: 55,
      muleScoreBand: 'MEDIUM',
      dimensions: {
        identity: { level: 'MEDIUM', primarySignal: 'No EPFO record found' },
        digitalPresence: { level: 'LOW' },
        telecom: { level: 'LOW' },
        paymentFraudBlacklists: { level: 'LOW' },
        coherenceRisk: { level: 'MEDIUM', primarySignal: 'Declared income significantly exceeds the pincode benchmark for this occupation (Farmer, ₹3.5L)' },
      },
    },
    onboardingChannel: 'Assisted — BC Agent',
    bcSourcingCode: 'BC-MH-0512-2290',
  },
  dilipchaudhary: {
    id: 'dilipchaudhary',
    name: 'Dilip Chaudhary',
    age: 47,
    declaredAddress: 'Muzaffarnagar, Uttar Pradesh',
    declaredOccupation: 'Farmer',
    declaredAnnualIncome: 1200000,
    hidden: {},
    firedRules: [
      'No EPFO record found',
      'Declared income is in the extreme upper percentile bracket for Farmers occupation (Farmer, ₹12.0L)',
    ],
    primaryTreeId: 'farmer_income_mismatch',
    riskSnapshot: {
      muleScore: 62,
      muleScoreBand: 'MEDIUM',
      dimensions: {
        identity: { level: 'MEDIUM', primarySignal: 'No EPFO record found' },
        digitalPresence: { level: 'MEDIUM' },
        telecom: { level: 'LOW' },
        paymentFraudBlacklists: { level: 'LOW' },
        coherenceRisk: { level: 'HIGH', primarySignal: 'Declared income is in the extreme upper percentile bracket for Farmers occupation (Farmer, ₹12.0L)' },
      },
    },
    onboardingChannel: 'Assisted — BC Agent',
    bcSourcingCode: 'BC-UP-0447-7712',
  },
  lakshmi: {
    id: 'lakshmi',
    name: 'Lakshmi Bai',
    age: 38,
    declaredAddress: 'Bandra West, Mumbai, Maharashtra',
    declaredOccupation: 'Domestic worker',
    hidden: {},
    firedRules: [
      'Declared address inconsistent with declared income/occupation',
      'Address affluence does not match applicant profile',
    ],
    primaryTreeId: 'premium_address_risk',
    riskSnapshot: {
      muleScore: 33,
      muleScoreBand: 'MEDIUM',
      dimensions: {
        identity: { level: 'LOW' },
        digitalPresence: { level: 'LOW' },
        telecom: { level: 'LOW' },
        paymentFraudBlacklists: { level: 'MEDIUM', primarySignal: 'Declared address inconsistent with declared income/occupation' },
        coherenceRisk: { level: 'NOT_AVAILABLE' },
      },
    },
    onboardingChannel: 'Assisted — BC Agent',
    bcSourcingCode: 'BC-MH-0256-6120',
  },
  meena: {
    id: 'meena',
    name: 'Meena Devi',
    age: 29,
    declaredAddress: 'Andheri East, Mumbai, Maharashtra',
    declaredOccupation: 'Homemaker',
    hidden: {},
    firedRules: [
      'Declared address inconsistent with declared income/occupation',
      'Address affluence does not match applicant profile',
    ],
    primaryTreeId: 'premium_address_risk',
    riskSnapshot: {
      muleScore: 65,
      muleScoreBand: 'MEDIUM',
      dimensions: {
        identity: { level: 'LOW' },
        digitalPresence: { level: 'MEDIUM' },
        telecom: { level: 'LOW' },
        paymentFraudBlacklists: { level: 'HIGH', primarySignal: 'Address affluence does not match applicant profile' },
        coherenceRisk: { level: 'NOT_AVAILABLE' },
      },
    },
    onboardingChannel: 'Self-Serve App',
  },
};

export function formatTenure(months: number): string {
  if (months < 1) return `${Math.round(months * 30)} days`;
  const years = Math.floor(months / 12);
  const rem = Math.round(months % 12);
  if (years === 0) return `${rem} month${rem === 1 ? '' : 's'}`;
  if (rem === 0) return `${years} year${years === 1 ? '' : 's'}`;
  return `${years} year${years === 1 ? '' : 's'} ${rem} month${rem === 1 ? '' : 's'}`;
}

/**
 * "Today's Queue" sample list — the same score+dimensions dataset already
 * built for the Risk Snapshot modal, presented as rows instead of a single
 * card. Not a real 10,000-row queue (see FunnelTicker) — 10-15 illustrative
 * rows is enough to show the mix. Mixes the real amber personas (still
 * "Waiting" — they're what the agent actually works), the two view-only
 * Risk Snapshot samples, and a handful of synthetic-only filler rows for a
 * realistic-looking spread.
 */
export interface QueueRow {
  id: string;
  name: string;
  status: 'Waiting' | 'Resolved';
  rulesFiredCount: number;
  riskSnapshot: RiskSnapshot;
  /** Which rule tree the case will run — omitted for the view-only sample/filler rows, which carry no real tree. */
  scenario?: string;
}

/** Display label for a persona's primaryTreeId, for the queue table's Scenario column. */
export const SCENARIO_LABELS: Record<string, string> = {
  sim_circle_mismatch: 'SIM Circle Mismatch',
  farmer_income_mismatch: 'Farmer Income Mismatch',
  premium_address_risk: 'Premium Address Risk',
};

const FILLER_ROWS: QueueRow[] = [
  {
    id: 'filler_priya',
    name: 'Priya Nair',
    status: 'Resolved',
    rulesFiredCount: 0,
    riskSnapshot: {
      muleScore: 9,
      muleScoreBand: 'LOW',
      dimensions: {
        identity: { level: 'LOW' },
        digitalPresence: { level: 'LOW' },
        telecom: { level: 'LOW' },
        paymentFraudBlacklists: { level: 'LOW' },
        coherenceRisk: { level: 'LOW' },
      },
    },
  },
  {
    id: 'filler_arjun',
    name: 'Arjun Mehta',
    status: 'Resolved',
    rulesFiredCount: 1,
    riskSnapshot: {
      muleScore: 21,
      muleScoreBand: 'LOW',
      dimensions: {
        identity: { level: 'LOW' },
        digitalPresence: { level: 'MEDIUM' },
        telecom: { level: 'LOW' },
        paymentFraudBlacklists: { level: 'LOW' },
        coherenceRisk: { level: 'NOT_AVAILABLE' },
      },
    },
  },
  {
    id: 'filler_sunita',
    name: 'Sunita Reddy',
    status: 'Waiting',
    rulesFiredCount: 3,
    riskSnapshot: {
      muleScore: 48,
      muleScoreBand: 'MEDIUM',
      dimensions: {
        identity: { level: 'MEDIUM' },
        digitalPresence: { level: 'LOW' },
        telecom: { level: 'MEDIUM' },
        paymentFraudBlacklists: { level: 'LOW' },
        coherenceRisk: { level: 'NOT_AVAILABLE' },
      },
    },
  },
  {
    id: 'filler_farhan',
    name: 'Farhan Sheikh',
    status: 'Resolved',
    rulesFiredCount: 5,
    riskSnapshot: {
      muleScore: 84,
      muleScoreBand: 'HIGH',
      dimensions: {
        identity: { level: 'HIGH' },
        digitalPresence: { level: 'MEDIUM' },
        telecom: { level: 'HIGH' },
        paymentFraudBlacklists: { level: 'HIGH' },
        coherenceRisk: { level: 'NOT_AVAILABLE' },
      },
    },
  },
];

export const SAMPLE_QUEUE_ROWS: QueueRow[] = [
  ...Object.values(PERSONAS).map((p): QueueRow => ({
    id: p.id,
    name: p.name,
    status: 'Waiting',
    rulesFiredCount: p.firedRules.length,
    riskSnapshot: p.riskSnapshot,
    scenario: SCENARIO_LABELS[p.primaryTreeId],
  })),
  ...SAMPLE_CASES.map((c): QueueRow => ({
    id: c.id,
    name: c.name,
    status: 'Resolved',
    rulesFiredCount: c.riskSnapshot.muleScoreBand === 'LOW' ? 0 : 5,
    riskSnapshot: c.riskSnapshot,
  })),
  ...FILLER_ROWS,
];
