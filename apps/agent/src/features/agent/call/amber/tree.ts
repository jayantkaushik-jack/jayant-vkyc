import type { AmberPersona } from './personas';
import { formatTenure } from './personas';
import type { Band, Signals } from './scoring';
import { computeScore } from './scoring';

/**
 * Rule-tree config, rebuilt against the corrected flowchart (2026-08-16) —
 * the prior version was built off a wrong copy of Section 7 in the source
 * docx and has been discarded. Structured as a registry so additional rule
 * trees (beyond SIM-circle-mismatch) are additive, not a rewrite.
 */

export interface Tap {
  id: string;
  label: string;
  next: string;
  /**
   * Canned transcript for this specific bucket, played back by the
   * "Simulate spoken answer" dropdown — mechanism only, real per-bucket
   * vernacular phrasing is separate content-authorship work. Falls back to
   * a generic placeholder when unset (see AmberPanel's simulate handler).
   */
  sampleTranscript?: string;
  /**
   * Round 21: the rubric line handed to the Claude Haiku classifier for this
   * bucket — what actually distinguishes it, not just its UI label (`label`
   * is written for the agent tapping a button; this is written for a model
   * deciding whether an answer satisfies it). Only populated on farmer-tree
   * taps, since round 21 §2 scopes the Haiku classifier to that tree only —
   * see classify.ts's routing comment.
   */
  definition?: string;
  /**
   * Round 26 — Hindi counterpart to `label`, additive/display-only. Only
   * populated on Farmer-tree taps (this round's scope). Never fed into the
   * classifier prompt (`api/_classify-core.ts` builds its bucket list from
   * `definition ?? label`, both English, untouched by this field) —
   * classification stays English-only input regardless of what's shown on
   * screen.
   */
  labelHi?: string;
}

export interface QuestionNode {
  id: string;
  question: string;
  readVerbatim: true;
  taps: Tap[];
  /** Round 26 — Hindi counterpart to `question`, additive/display-only. Only populated on Farmer-tree nodes. Shown bilingually alongside `question`, never swapped in place of it. */
  questionHi?: string;
}

export interface Verdict {
  id: string;
  band: Band | 'HUMAN_REVIEW';
  reasons: string[];
  victimFlag?: string;
  signals?: Signals;
  /** Independently-held values the applicant reproduced without seeing them — shown on the resolution screen. */
  hiddenReveal?: string[];
  /**
   * Case Summary screen (round 15, §8) — which shape a STEP_UP outcome is.
   * 'pending-verification': something still has to happen after the call
   * (a registry check, a second look) — shows Reason/Documents/Expertise
   * fields. 'explanation-logged': a real explanation was given and nothing
   * is left pending — shows just the logged source. Never set on
   * PROCEED/BLOCK/HUMAN_REVIEW bands; those never show structured fields.
   */
  amberFlavor?: 'pending-verification' | 'explanation-logged';
  /**
   * Only meaningful when amberFlavor is 'pending-verification' — the
   * Documents/Expertise fields the spec calls for. Hand-authored per verdict
   * rather than derived from `reasons`, since this is genuinely new
   * information (what a reviewer needs to do next), not a restatement of
   * why the case is open.
   */
  pendingVerification?: { documentsRequired: string; expertiseRequired: string };
  /**
   * Round 23: the agent's optional free-text note at the moment the
   * universal "Other / Doesn't know / Unclear" bucket terminated the case —
   * only ever set on the `human_review_unclear_bucket` verdict, kept as its
   * own field (not folded into `reasons`) so the Case Summary can render it
   * as a distinct, clearly-labeled block rather than mixed into the
   * narrative. Empty string is a valid value (note box left blank); the
   * summary renders "No note provided" for that case, not an absent field.
   */
  agentNote?: string;
}

/**
 * One answered question, in order — the question-by-question trail the
 * Case Summary screen (round 15, §8) renders directly, and the same shape
 * AmberPanel already tracked locally before that screen needed it.
 */
export interface PathEntry {
  nodeId: string;
  question: string;
  /**
   * The applicant's answer as heard (live mic or simulated) — round 15's
   * Case Summary trail needs this ("Applicant said: …") but neither the
   * original PathEntry shape nor the handoff's own description of it
   * ("question / tapLabel / corrected-flag") actually carried it. Added
   * here rather than assumed.
   */
  transcript: string;
  tapId: string;
  tapLabel: string;
  suggested: boolean;
  corrected: boolean;
  /**
   * Round 28 — only ever set on the `land_area` entry, and only when a
   * separately-extracted literal acreage figure agreed with the confirmed
   * bucket's own range (see `FARMER_ACREAGE_RANGE` below and
   * `AmberPanel.tsx`'s `advance()`, where that agreement check actually
   * runs). When absent, `deriveFarmerFacts()` falls back to the bucket's
   * fixed midpoint exactly as it always has — this field is a targeted
   * override, not a replacement for the midpoint mechanism.
   */
  extractedAcreage?: number;
}

export interface RuleTree {
  id: string;
  ruleLabel: string;
  entryNode: string;
  /** Node shown instead of entryNode when the applicant has a prior attempt on file. */
  rotatedEntryNode: string;
  nodes: Record<string, QuestionNode>;
  verdicts: Record<string, Verdict>;
}

// ---------------------------------------------------------------------------
// SIM circle does not match declared address
// ---------------------------------------------------------------------------

const simCircleNodes: Record<string, QuestionNode> = {
  q1: {
    id: 'q1',
    question: 'Have you ever lived or worked in another city?',
    readVerbatim: true,
    taps: [
      { id: 'yes_elsewhere', label: 'Yes, lived or worked elsewhere', next: 'a2_city' },
      { id: 'no_always_here', label: 'No, always lived here', next: 'b2' },
      { id: 'vague', label: 'Not sure / vague', next: 'q1_reask' },
      { id: 'no_comprehension', label: 'Did not understand', next: 'TERMINAL:no_comprehension' },
      { id: 'other', label: 'OTHER', next: 'TERMINAL:other_at_q1' },
    ],
  },
  /** "Re-ask once in plainer words" — a second vague answer forces human review rather than looping forever. */
  q1_reask: {
    id: 'q1_reask',
    question: 'Just to check in a different way — has your work or family ever taken you to live somewhere other than here?',
    readVerbatim: true,
    taps: [
      { id: 'yes_elsewhere', label: 'Yes, lived or worked elsewhere', next: 'a2_city' },
      { id: 'no_always_here', label: 'No, always lived here', next: 'b2' },
      { id: 'still_vague', label: 'Still not sure / vague', next: 'TERMINAL:human_review_still_vague' },
      { id: 'no_comprehension', label: 'Did not understand', next: 'TERMINAL:no_comprehension' },
    ],
  },

  // ---- Branch A: worked or lived elsewhere ----
  a2_city: {
    id: 'a2_city',
    question: 'Which city, and roughly how long were you there?',
    readVerbatim: true,
    taps: [
      { id: 'matches_circle', label: 'City resolves to the SIM-circle state (locality/colloquial names included)', next: 'a2_duration' },
      { id: 'other_indian_city', label: 'Only other Indian cities', next: 'r1' },
      { id: 'outside_india', label: 'Outside India', next: 'r1' },
    ],
  },
  a2_duration: {
    id: 'a2_duration',
    question: 'Roughly how long were you there?',
    readVerbatim: true,
    taps: [
      { id: 'dur_under1', label: 'Under 1 year', next: 'a3' },
      { id: 'dur_1to3', label: '1 to 3 years', next: 'a3' },
      { id: 'dur_3to5', label: '3 to 5 years', next: 'a3' },
      { id: 'dur_over5', label: 'Over 5 years', next: 'a3' },
      { id: 'dur_cannot_recall', label: 'Cannot recall', next: 'a3' },
    ],
  },
  a3: {
    id: 'a3',
    question: 'When did you come back?',
    readVerbatim: true,
    taps: [
      { id: 'ret_within3mo', label: 'Within 3 months', next: 'DYNAMIC:branchA' },
      { id: 'ret_3to12mo', label: '3 to 12 months', next: 'DYNAMIC:branchA' },
      { id: 'ret_1to2y', label: '1 to 2 years', next: 'DYNAMIC:branchA' },
      { id: 'ret_over2y', label: 'Over 2 years', next: 'DYNAMIC:branchA' },
      { id: 'still_back_and_forth', label: 'Still goes back and forth', next: 'TERMINAL:green_still_goes_back_and_forth' },
      { id: 'ret_cannot_recall', label: 'Cannot recall', next: 'TERMINAL:human_review_vague_timeline' },
    ],
  },

  // ---- Branch B: no, always lived here ----
  b2: {
    id: 'b2',
    question: 'Do you travel for work at all?',
    readVerbatim: true,
    taps: [
      { id: 'yes_regularly', label: 'Yes, regularly', next: 'b3' },
      { id: 'yes_occasionally', label: 'Yes, occasionally', next: 'b3' },
      { id: 'no_local', label: 'No, works locally', next: 'r1' },
      { id: 'other', label: 'OTHER', next: 'TERMINAL:other_at_b2' },
    ],
  },
  b3: {
    id: 'b3',
    question: 'Which places do you travel to most?',
    readVerbatim: true,
    taps: [
      { id: 'includes_circle', label: 'Includes the SIM-circle state', next: 'TERMINAL:green_leaning_travels_for_work' },
      { id: 'excludes_circle', label: 'Does not include it', next: 'r1' },
      { id: 'other', label: 'OTHER', next: 'TERMINAL:other_at_b3' },
    ],
  },

  // ---- CONVERGENCE: routine questions, none mentions a SIM ----
  r1: {
    id: 'r1',
    question: 'Did you visit a bank representative, or did someone else help you apply?',
    readVerbatim: true,
    taps: [
      { id: 'bank_or_bc', label: 'Bank branch or bank representative / BC', next: 'r2' },
      { id: 'myself', label: 'No, did it entirely myself', next: 'r2' },
      { id: 'family_friend', label: 'A family member or friend', next: 'r2' },
      { id: 'shop_cybercafe', label: 'A shop or cyber cafe', next: 'r2' },
      { id: 'someone_approached', label: 'Someone who approached me / an agent', next: 'r1b' },
      { id: 'prefers_not', label: 'Prefers not to say', next: 'TERMINAL:human_review_declined_r_q1' },
    ],
  },
  r1b: {
    id: 'r1b',
    question: 'Did that same person also arrange your mobile connection?',
    readVerbatim: true,
    taps: [
      { id: 'yes', label: 'Yes', next: 'TERMINAL:block_victim_flag' },
      { id: 'no', label: 'No', next: 'r2' },
    ],
  },
  r2: {
    id: 'r2',
    question: 'Which number should we use for alerts and statements?',
    readVerbatim: true,
    taps: [
      { id: 'this_number', label: 'This number', next: 'r3' },
      { id: 'different_number', label: 'A different number', next: 'TERMINAL:red_leaning_different_alert_number' },
      { id: 'no_preference', label: 'No preference', next: 'r3' },
    ],
  },
  r3: {
    id: 'r3',
    question: 'Has your family lived in another city?',
    readVerbatim: true,
    taps: [
      { id: 'yes_matches_circle', label: 'Yes, resolves to the SIM-circle state', next: 'TERMINAL:green_leaning_family_migration' },
      { id: 'yes_other_city', label: 'Yes, but a different city', next: 'TERMINAL:no_explanation_found' },
      { id: 'no', label: 'No', next: 'TERMINAL:no_explanation_found' },
      { id: 'does_not_know', label: 'Does not know', next: 'TERMINAL:human_review_family_unknown' },
    ],
  },
};

const simCircleVerdicts: Record<string, Verdict> = {
  no_comprehension: {
    id: 'no_comprehension',
    band: 'HUMAN_REVIEW',
    reasons: ['Applicant did not understand the question. No penalty — routed to separate review.'],
  },
  other_at_q1: {
    id: 'other_at_q1',
    band: 'HUMAN_REVIEW',
    reasons: ["Applicant's answer did not fit any bucket at Q1. Routed to separate review with the agent's free-text note."],
  },
  other_at_b2: {
    id: 'other_at_b2',
    band: 'HUMAN_REVIEW',
    reasons: ["Applicant's answer did not fit any bucket at B-Q2. Routed to separate review with the agent's free-text note."],
  },
  other_at_b3: {
    id: 'other_at_b3',
    band: 'HUMAN_REVIEW',
    reasons: ["Applicant's answer did not fit any bucket at B-Q3. Routed to separate review with the agent's free-text note."],
  },
  human_review_still_vague: {
    id: 'human_review_still_vague',
    band: 'HUMAN_REVIEW',
    reasons: ['Applicant remained vague after the question was re-asked in plainer words. Routed to separate review.'],
  },
  human_review_vague_timeline: {
    id: 'human_review_vague_timeline',
    band: 'HUMAN_REVIEW',
    reasons: ['Applicant could not recall when they returned. Timeline cannot be checked — routed to separate review.'],
  },
  human_review_declined_r_q1: {
    id: 'human_review_declined_r_q1',
    band: 'HUMAN_REVIEW',
    reasons: ['Applicant preferred not to say who helped with the application — routed to separate review.'],
  },
  human_review_family_unknown: {
    id: 'human_review_family_unknown',
    band: 'HUMAN_REVIEW',
    reasons: ['Applicant does not know whether family lived elsewhere — very common where a spouse handled everything. Routed to separate review.'],
  },
  red_leaning_different_alert_number: {
    id: 'red_leaning_different_alert_number',
    band: 'STEP_UP',
    reasons: ['The application number is not the one the applicant actually uses.'],
    signals: { explanationQuality: -0.4, corroboratingChecks: -0.3 },
    amberFlavor: 'pending-verification',
    pendingVerification: {
      documentsRequired: 'None from the applicant directly — confirm which number is actually in active use against the account record.',
      expertiseRequired: 'Standard risk review.',
    },
  },
  block_victim_flag: {
    id: 'block_victim_flag',
    band: 'BLOCK',
    reasons: [
      'Claims lifelong local residence against an out-of-state SIM circle.',
      'SIM procured by an unaffiliated third party.',
      'Same third party facilitated the account opening.',
    ],
    victimFlag: 'Possible exploited individual — route to customer-protection path, not fraud.',
    signals: { explanationQuality: -1, thirdPartyInvolvement: -1, corroboratingChecks: -0.5 },
  },
  green_leaning_travels_for_work: {
    id: 'green_leaning_travels_for_work',
    band: 'PROCEED',
    reasons: ['Travel pattern includes the SIM-circle state — truckers, salesmen and seasonal workers land here and are typically genuine.'],
    signals: { explanationQuality: 0.6, corroboratingChecks: 0.3 },
  },
  green_leaning_family_migration: {
    id: 'green_leaning_family_migration',
    band: 'PROCEED',
    reasons: ["Applicant's family history of living in the SIM-circle state offers a coherent explanation."],
    signals: { explanationQuality: 0.6, timelineArithmetic: 0.2 },
  },
  green_still_goes_back_and_forth: {
    id: 'green_still_goes_back_and_forth',
    band: 'PROCEED',
    reasons: ['Applicant still travels back and forth to the SIM-circle state — an ongoing, coherent explanation for the connection.'],
    signals: { explanationQuality: 0.5 },
  },
  no_explanation_found: {
    id: 'no_explanation_found',
    band: 'STEP_UP',
    reasons: [
      'Three ordinary openings were offered and none produced an account of the anomaly. The absence is the finding, not a confession.',
    ],
    signals: { explanationQuality: -0.3 },
    amberFlavor: 'pending-verification',
    pendingVerification: {
      documentsRequired: 'None from the applicant directly — a manual reviewer re-checks the SIM/address mismatch against carrier records.',
      expertiseRequired: 'Standard risk review.',
    },
  },
};

interface BranchAContext {
  persona: AmberPersona;
  durationTapId: string;
  returnTapId: string;
}

const DURATION_MONTHS: Record<string, number> = {
  dur_under1: 6,
  dur_1to3: 24,
  dur_3to5: 48,
  dur_over5: 72,
};

const RETURN_MONTHS_AGO: Record<string, number> = {
  ret_within3mo: 1.5,
  ret_3to12mo: 7,
  ret_1to2y: 18,
  ret_over2y: 30,
};

/**
 * A3: "stay window overlaps the SIM procurement date" -> PLAUSIBILITY check
 * -> strong green or REV. "Returned long ago, SIM is recent" -> RED on
 * arithmetic directly, no plausibility check needed for that path.
 */
export function resolveBranchA(ctx: BranchAContext): Verdict {
  const { persona, durationTapId, returnTapId } = ctx;

  if (durationTapId === 'dur_cannot_recall') {
    return {
      id: 'human_review_vague_duration',
      band: 'HUMAN_REVIEW',
      reasons: ['Applicant could not recall how long they stayed — routed to separate review.'],
    };
  }

  const stayMonths = DURATION_MONTHS[durationTapId] ?? 24;
  const monthsSinceReturn = RETURN_MONTHS_AGO[returnTapId] ?? 7;
  const tenure = persona.hidden.simTenureMonths ?? 0;
  const tenureLabel = formatTenure(tenure);
  const expectedTenure = stayMonths + monthsSinceReturn;
  const overlaps = Math.abs(tenure - expectedTenure) <= Math.max(4, stayMonths * 0.3);

  if (overlaps) {
    // PLAUSIBILITY CHECK: does the stated stay fit the age band?
    if (persona.age <= 23 && durationTapId === 'dur_over5') {
      return {
        id: 'human_review_plausibility',
        band: 'HUMAN_REVIEW',
        reasons: ['Age band does not plausibly fit a stay of over 5 years away, even though the arithmetic overlaps — routed to separate review.'],
      };
    }
    return {
      id: 'strong_green_branch_a',
      band: 'PROCEED',
      reasons: [
        `Out-of-circle SIM explained by stated migration. Timeline consistent with observed SIM tenure of ${tenureLabel}.`,
      ],
      signals: { explanationQuality: 1, timelineArithmetic: 1 },
      hiddenReveal: [`SIM circle: ${persona.hidden.simCircle ?? 'unknown'}`, `SIM tenure: ${tenureLabel}`],
    };
  }

  if (tenure < monthsSinceReturn - 3) {
    return {
      id: 'red_arithmetic_branch_a',
      band: 'BLOCK',
      reasons: [
        `Returned roughly ${Math.round(monthsSinceReturn)} months ago, but the SIM was procured only ${tenureLabel} ago — nobody buys a connection in a city while already living elsewhere.`,
      ],
      signals: { explanationQuality: -1, timelineArithmetic: -1 },
    };
  }

  return {
    id: 'human_review_arithmetic_vague',
    band: 'HUMAN_REVIEW',
    reasons: [`Stated timeline does not clearly overlap or clearly contradict the observed SIM tenure of ${tenureLabel} — routed to separate review.`],
  };
}

// ---------------------------------------------------------------------------
// Farmer income/occupation mismatch — Bandhan-flagged scenario. Chosen for
// GFF relatability: the anomaly (₹12L on a farm) is visible in the declared
// data itself, so the audience needs no setup, unlike the SIM case.
//
// Rebuilt (2026-08-25, round 12) against the locked Path A spec — sourced
// ₹/acre crop-value bands (not a single yield-per-acre constant), a real
// low-high band comparison instead of a >=50%-of-declared threshold, and the
// "was this a normal year" softening now has an actual path to fire (it
// previously had no live trigger: a failing calc skipped straight to
// q3_alt, bypassing the year question entirely). VAHAN (vehicle registry) is
// a backend lookup that cannot complete on a live call, so equipment
// ownership never resolves live any more — the old DYNAMIC:farmerVahan path
// that could reach a live "strong_green" off a registry match was a bug and
// is removed entirely; "Yes, owns" now always lands on at least
// step_up_equipment_pending. Path B (seasonal/multi-crop), Path C
// (livestock/poultry/fish/shrimp) and Path D (tenant/lessor/labourer) are
// direction-locked but not built as real question sequences yet — q1 routes
// straight to a human-review verdict for each rather than half-building
// flows that aren't ready (Path D routes to human review even once its
// question sequences are ready, per its own locked decision).
// ---------------------------------------------------------------------------

/**
 * Minimal shape a routing resolver needs — prior tap IDs, plus each tap's
 * transcript (round 18: needed to sniff for sugarcane specifically, now
 * that q1 is back to 3 buckets — see FARMER_CROP_TAP_CATEGORY below).
 */
export interface RoutingContext {
  persona: AmberPersona;
  path: { tapId: string; transcript?: string; extractedAcreage?: number }[];
}

type FarmerCropCategory = 'food_grain' | 'cash_crop' | 'cash_crop_sugarcane' | 'horticulture';
type FarmerIrrigation = 'irrigated' | 'partly_irrigated' | 'rainfed';

/**
 * Sourced ₹/acre/year bands (Farmer_Tree_PathA_Crop_Value_Ranges.md) — a
 * low-high band, not a single midpoint, compared directly against declared
 * income. Sugarcane gets its own row instead of the general cash-crop row
 * whenever it's specifically named (q1 splits it into its own bucket below)
 * — its economics (irrigation-locked, high per-acre value) are too
 * different from cotton/spices to share one blended range. Sugarcane isn't
 * grown commercially rain-fed or partly-irrigated, so those two cells fall
 * back to the general cash-crop band rather than being left undefined.
 */
const FARMER_CROP_VALUE_BAND: Record<FarmerCropCategory, Record<FarmerIrrigation, [number, number]>> = {
  food_grain: { irrigated: [25_000, 60_000], partly_irrigated: [15_000, 35_000], rainfed: [8_000, 22_000] },
  cash_crop: { irrigated: [35_000, 150_000], partly_irrigated: [25_000, 80_000], rainfed: [12_000, 35_000] },
  cash_crop_sugarcane: { irrigated: [80_000, 160_000], partly_irrigated: [25_000, 80_000], rainfed: [12_000, 35_000] },
  horticulture: { irrigated: [80_000, 450_000], partly_irrigated: [50_000, 200_000], rainfed: [30_000, 120_000] },
};

/** Representative acreage per land_area bucket — a bucket midpoint, since the tap captures a range, not the exact number spoken. */
const FARMER_ACREAGE_MIDPOINT: Record<string, number> = {
  land_under2: 1,
  land_2to5: 3.5,
  land_5to10: 7.5,
  land_10to20: 15,
  land_over20: 25,
};

/**
 * Round 28 — a bucket midpoint is a coarse approximation, wide enough on a
 * bucket spanning a 3x range (e.g. "2 to 5 acres") to flip a genuinely
 * plausible declared income into a false mismatch when the true acreage
 * sits near an edge — confirmed as a real, reproducible bug on Ramesh
 * Yadav's locked case (3.5-acre midpoint falsely mismatches his declared
 * ₹2.3L; his actual spoken 4 acres correctly reconciles).
 *
 * Fix: a second, separate, equally narrow LLM call (`extractAcreageAcres`
 * in `api/_classify-core.ts`) extracts the literal acreage the applicant
 * stated from the same transcript the bucket classifier already read. This
 * range table is how `AmberPanel.tsx`'s `advance()` checks whether that
 * extracted number actually agrees with the bucket the classifier already
 * chose, before trusting it over the midpoint:
 *
 * - Bucket call can't confidently place the answer at all → already routes
 *   to `unclear` upstream of any of this; the extraction call never runs.
 * - Bucket matches, but extraction returns no confident single figure
 *   (a genuinely vague amount, e.g. "somewhere between four and five, not
 *   much more") → not a failure, just the normal case whenever no clean
 *   figure was stated. Falls back to the bucket midpoint, exactly as today.
 * - Both return an answer, but the extracted number falls OUTSIDE the
 *   bucket's own range (e.g. bucket says `land_under2`, extraction says 40
 *   — almost certainly an STT/self-correction artifact on this specific
 *   utterance, not the classifier being careless) → don't trust the
 *   outlier; fall back to the midpoint and log the disagreement for review.
 * - Both agree (the number falls inside the bucket's range) → use the
 *   literal number instead of the midpoint. This was Ramesh Yadav's actual
 *   case: bucket `land_2to5`, extracted 4, 4 is inside [2, 5].
 *
 * Deliberately a second call rather than widening `classifyWithClaude`'s
 * own contract to return a number too — round 27 spent real effort
 * narrowing that call to one bare token after finding Haiku doesn't always
 * comply with "respond with only X"; asking it to also reliably carry a
 * second field would loosen exactly what that fix hardened. Two
 * single-token-contract calls are each as easy to get right as the
 * existing one already is; one call with two responsibilities would not be.
 */
export const FARMER_ACREAGE_RANGE: Record<string, [number, number]> = {
  land_under2: [0, 2],
  land_2to5: [2, 5],
  land_5to10: [5, 10],
  land_10to20: [10, 20],
  land_over20: [20, Infinity],
};

/**
 * Large-holding thresholds for the sales-scale check (q4_sales → q5_equipment), acres.
 * Sourced range is "10-12" for cash crop and "3-4" for horticulture; food
 * grain is excluded from this check entirely (see doc). Both use the LOW
 * end of their sourced range with an inclusive (>=) comparison — a
 * deliberate reading, not an oversight: Meena Devi's declared 4 acres sits
 * exactly at the horticulture range's top edge and must trigger the flag as
 * scripted, which only an inclusive low-end threshold guarantees.
 */
const FARMER_LARGE_HOLDING_THRESHOLD: Partial<Record<FarmerCropCategory, number>> = {
  cash_crop: 10,
  cash_crop_sugarcane: 10,
  horticulture: 3,
};

const FARMER_INFORMAL_SALES_TAPS = new Set(['local_mandi', 'trader_collects']);

/**
 * "Was this a normal year" softening shifts the low end of the band down —
 * the source docs specify the direction (down, low end only, never raises
 * the band for a too-high read) but not a magnitude anywhere. 30% ish a
 * Code judgment call, not a sourced figure — flagged explicitly since
 * nothing else in this file is presented as more solid than it actually is.
 */
const FARMER_BAD_YEAR_LOW_END_SOFTENING = 0.3;

/**
 * Round 18: q1 is back to the spec's original 3 buckets — the round-12
 * `cash_crop_sugarcane_own` 4th bucket (added specifically so the arithmetic
 * could tell sugarcane apart from cotton/spices) is gone, since the
 * round-18b test suite expects Dilip Chaudhary's sugarcane answer to
 * resolve to plain `cash_crop_own`, matching the source spec exactly.
 * Sugarcane detection moves to the transcript itself (see
 * deriveFarmerFacts) — a cleaner fix that wasn't available in round 12,
 * before PathEntry carried each tap's transcript.
 */
const FARMER_CROP_TAP_CATEGORY: Record<string, FarmerCropCategory> = {
  food_grain_own: 'food_grain',
  cash_crop_own: 'cash_crop',
  horticulture_own: 'horticulture',
};

/** Sugarcane isn't its own q1 bucket, so this is read from the applicant's actual words instead. */
const FARMER_SUGARCANE_CUES = ['गन्ना', 'गन्ने'];

const FARMER_IRRIGATION_TAPS: Record<string, true> = { irrigated: true, partly_irrigated: true, rainfed: true };
const FARMER_SALES_TAPS: Record<string, true> = {
  local_mandi: true, mill_or_company: true, contract_farming: true, fpo_cooperative: true, trader_collects: true, exports: true, retail_myself: true,
};

function findFarmerTap(path: { tapId: string }[], candidates: Record<string, unknown>): string | undefined {
  return [...path].reverse().find((p) => p.tapId in candidates)?.tapId;
}

interface FarmerFacts {
  cropCategory: FarmerCropCategory;
  irrigation: FarmerIrrigation;
  acreage: number;
  salesTapId: string | undefined;
}

/** Re-derives the facts every farmer-tree resolver needs from the path so far — cheaper and less error-prone than threading mutable state through each node. */
function deriveFarmerFacts(ctx: RoutingContext): FarmerFacts {
  const cropTapId = findFarmerTap(ctx.path, FARMER_CROP_TAP_CATEGORY) ?? 'food_grain_own';
  const irrigationTapId = (findFarmerTap(ctx.path, FARMER_IRRIGATION_TAPS) ?? 'rainfed') as FarmerIrrigation;
  const acreageTapId = findFarmerTap(ctx.path, FARMER_ACREAGE_MIDPOINT) ?? 'land_under2';
  const salesTapId = findFarmerTap(ctx.path, FARMER_SALES_TAPS);

  let cropCategory = FARMER_CROP_TAP_CATEGORY[cropTapId];
  if (cropCategory === 'cash_crop') {
    const q1Entry = [...ctx.path].reverse().find((p) => p.tapId === 'cash_crop_own');
    if (q1Entry?.transcript && FARMER_SUGARCANE_CUES.some((cue) => q1Entry.transcript!.includes(cue))) {
      cropCategory = 'cash_crop_sugarcane';
    }
  }

  /**
   * Round 28: `AmberPanel.tsx`'s `advance()` already ran the
   * literal-vs-bucket agreement check at commit time — `extractedAcreage`
   * only ever appears on the land_area entry when that check passed. So
   * this is a plain "use it if present" read, not a second validation —
   * validating twice would just duplicate `FARMER_ACREAGE_RANGE` logic
   * that already ran once, closer to where the agent's actual confirmed
   * tap id (not just the suggested one) is known.
   */
  const acreageEntry = [...ctx.path].reverse().find((p) => p.tapId === acreageTapId);
  const acreage = acreageEntry?.extractedAcreage ?? FARMER_ACREAGE_MIDPOINT[acreageTapId];

  return {
    cropCategory,
    irrigation: irrigationTapId,
    acreage,
    salesTapId,
  };
}

function farmerBand(facts: FarmerFacts): [number, number] {
  return FARMER_CROP_VALUE_BAND[facts.cropCategory][facts.irrigation];
}

/**
 * land_water's silent backend check — acreage x the sourced crop/irrigation
 * ₹/acre band, compared as a low-high range against the declared income
 * already on file (not re-asked here). Reconciling routes to
 * year_clean_path (informational, calc already passed); failing routes to
 * year_recheck FIRST, not straight to q3_alt — the fix that gives the
 * bad-year softening below an actual path to matter.
 */
export function resolveFarmerCalc(ctx: RoutingContext): string {
  const facts = deriveFarmerFacts(ctx);
  const [low, high] = farmerBand(facts);
  const declared = ctx.persona.declaredAnnualIncome ?? 1_200_000;
  const plausibleLow = low * facts.acreage;
  const plausibleHigh = high * facts.acreage;
  return declared >= plausibleLow && declared <= plausibleHigh ? 'year_clean_path' : 'year_recheck';
}

/**
 * year_recheck's "Worse" branch — re-runs the same comparison with the low
 * end of the band shifted down. Only ever softens a too-LOW declared
 * income; a too-high mismatch (as in every locked persona that reaches this
 * node) is never excused by a bad year, so for them this re-run is a
 * genuine no-op — they fall through to q3_alt exactly as if no softening
 * existed, just via the correct node.
 */
export function resolveFarmerCalcSoftened(ctx: RoutingContext): string {
  const facts = deriveFarmerFacts(ctx);
  const [low, high] = farmerBand(facts);
  const declared = ctx.persona.declaredAnnualIncome ?? 1_200_000;
  const softenedLow = low * (1 - FARMER_BAD_YEAR_LOW_END_SOFTENING) * facts.acreage;
  const plausibleHigh = high * facts.acreage;
  return declared >= softenedLow && declared <= plausibleHigh ? 'TERMINAL:step_up_bad_year_explained' : 'q3_alt';
}

/**
 * q5_equipment's silent resolution — combines two independent facts:
 * whether equipment ownership was claimed (this tap) and whether the
 * sales-scale check would flag (large holding + informal-only channel,
 * from q4_sales). Re-derived here rather than carried forward as mutable
 * state, since both facts are fully recoverable from the path so far.
 * Cannot resolve live-Green when equipment is owned — VAHAN is a backend
 * registry lookup, not something that completes while the applicant is
 * still on the call (see file header) — so "owns" always lands on at least
 * step_up_equipment_pending, upgraded only by the bank's risk/review team
 * afterward, outside VKYC.
 */
export function resolveFarmerEquipment(ctx: RoutingContext): string {
  const facts = deriveFarmerFacts(ctx);
  const ownsEquipment = ctx.path[ctx.path.length - 1]?.tapId === 'owns';
  const threshold = FARMER_LARGE_HOLDING_THRESHOLD[facts.cropCategory];
  const salesFlag =
    threshold !== undefined && facts.acreage >= threshold && FARMER_INFORMAL_SALES_TAPS.has(facts.salesTapId ?? '');

  if (ownsEquipment && salesFlag) return 'TERMINAL:step_up_both_flags';
  if (ownsEquipment) return 'TERMINAL:step_up_equipment_pending';
  if (salesFlag) return 'TERMINAL:step_up_sales_scale';
  return 'TERMINAL:green_farmer_reconciled';
}

const FARMER_Q3ALT_CATEGORY_LABEL: Record<string, string> = {
  household_total: 'declared figure is a household total, not farming income alone',
  rental_income: 'rental income from land leased out',
  side_business: 'a side business alongside farming',
  dairy_alongside: 'dairy or livestock alongside farming',
  sold_asset: 'sale of an asset this year',
  family_elsewhere: 'a family member working elsewhere sends money home',
};

/** q3_alt's named-category taps — personalizes the logged reason with which source was actually named, rather than one generic "other income" string. */
export function resolveFarmerIncomeExplained(ctx: RoutingContext): Verdict {
  const lastTapId = ctx.path[ctx.path.length - 1]?.tapId;
  const categoryLabel = FARMER_Q3ALT_CATEGORY_LABEL[lastTapId ?? ''] ?? 'another declared income source';
  return {
    id: 'step_up_income_explained',
    band: 'STEP_UP',
    reasons: [`Farming income alone does not reconcile with the declared figure — other source logged: ${categoryLabel}.`],
    signals: { explanationQuality: 0.3 },
    amberFlavor: 'explanation-logged',
  };
}

const farmerNodes: Record<string, QuestionNode> = {
  q1: {
    id: 'q1',
    question: 'What do you grow, and is this land your own?',
    questionHi: 'आप क्या उगाते हैं, और क्या यह ज़मीन आपकी अपनी है?',
    readVerbatim: true,
    taps: [
      { id: 'food_grain_own', label: 'Food grain (wheat, rice, pulses) + Own it', labelHi: 'अनाज (गेहूं, चावल, दाल) + अपनी ज़मीन', next: 'land_area', sampleTranscript: 'मैं गेहूं उगाता हूं। यह मेरी अपनी ज़मीन है, लगभग चार एकड़।', definition: "the crop is a food grain (wheat, rice, or pulses). Ownership is assumed by default the moment a real food-grain crop is named — match this bucket even if the applicant never explicitly says they own the land. Only route elsewhere (tenancy_or_labour) if the applicant's own words actually indicate they don't own it — leasing land, working as labour for someone else." },
      { id: 'cash_crop_own', label: 'Cash crop (cotton, sugarcane, spices) + Own it', labelHi: 'नकदी फसल (कपास, गन्ना, मसाले) + अपनी ज़मीन', next: 'land_area', sampleTranscript: 'मैं कपास उगाता हूं। यह मेरी अपनी ज़मीन है, लगभग तीन एकड़।', definition: "the crop is a cash crop (cotton, sugarcane, or spices). Ownership is assumed by default the moment a real cash crop is named — match this bucket even if the applicant never explicitly says they own the land. Only route elsewhere (tenancy_or_labour) if the applicant's own words actually indicate they don't own it — leasing land, working as labour for someone else." },
      { id: 'horticulture_own', label: 'Horticulture (grapes, pomegranate, mango, vegetables) + Own it', labelHi: 'बागवानी (अंगूर, अनार, आम, सब्ज़ियां) + अपनी ज़मीन', next: 'land_area', sampleTranscript: 'मैं अंगूर उगाती हूं। यह मेरी अपनी ज़मीन है, लगभग चार एकड़।', definition: "the crop is horticulture (grapes, pomegranate, mango, or vegetables). Ownership is assumed by default the moment a real horticulture crop is named — match this bucket even if the applicant never explicitly says they own the land. Only route elsewhere (tenancy_or_labour) if the applicant's own words actually indicate they don't own it — leasing land, working as labour for someone else." },
      { id: 'seasonal', label: 'Different crops in different seasons', labelHi: 'हर मौसम में अलग-अलग फसल', next: 'TERMINAL:human_review_farmer_seasonal', sampleTranscript: 'हर मौसम में अलग फसल उगाता हूं — खरीफ में कुछ और, रबी में कुछ और।', definition: "the applicant explicitly describes a seasonal ROTATION — growing different crops at different times of year (words like season, kharif, rabi, summer/winter, or an explicit 'in X we grow Y, in Z we grow W' pattern). Simply naming two or more crops in the same breath, with no seasonal/timing language at all, is NOT this bucket — if those crops are all the same category (e.g. multiple food grains), match that category's own bucket instead; this is specifically about a stated rotation across time, not the number of crops mentioned." },
      { id: 'livestock_or_aquaculture', label: 'Livestock/dairy, poultry, fish or shrimp farming', labelHi: 'पशुपालन/डेयरी, मुर्गी पालन, मछली या झींगा पालन', next: 'TERMINAL:human_review_farmer_livestock', sampleTranscript: 'मैं मवेशी पालता हूं, दूध बेचता हूं।', definition: "the applicant's primary activity is livestock/dairy, poultry, or fish/shrimp farming, not crop cultivation" },
      { id: 'tenancy_or_labour', label: 'Works as farm labour, or leases land in/out', labelHi: 'खेत मज़दूरी करते हैं, या ज़मीन किराए पर लेते/देते हैं', next: 'TERMINAL:human_review_farmer_tenancy', sampleTranscript: 'मैं दूसरों की ज़मीन पर मज़दूरी करता हूं।', definition: "the applicant works as farm labour on someone else's land, or leases land in or out, rather than owning and cultivating their own land" },
      { id: 'unclear', label: "Other / Doesn't know / Unclear", labelHi: 'अन्य / पता नहीं / स्पष्ट नहीं', next: 'TERMINAL:human_review_unclear_bucket', definition: "the answer doesn't clearly fit any of the other buckets here — e.g. no identifiable crop at all, or the applicant didn't understand the question. Naming a real food-grain/cash-crop/horticulture crop with no ownership statement is NOT unclear on that basis alone — ownership is assumed by default, so that answer fits the matching crop bucket instead." },
    ],
  },
  land_area: {
    id: 'land_area',
    question: 'How much land do you farm, roughly?',
    questionHi: 'आप लगभग कितनी ज़मीन पर खेती करते हैं?',
    readVerbatim: true,
    taps: [
      { id: 'land_under2', label: 'Under 2 acres', labelHi: '2 एकड़ से कम', next: 'land_water', sampleTranscript: 'लगभग दो एकड़।', definition: 'the stated land area is roughly under 2 acres' },
      { id: 'land_2to5', label: '2 to 5 acres', labelHi: '2 से 5 एकड़', next: 'land_water', sampleTranscript: 'लगभग चार एकड़।', definition: 'the stated land area is roughly 2 to 5 acres' },
      { id: 'land_5to10', label: '5 to 10 acres', labelHi: '5 से 10 एकड़', next: 'land_water', sampleTranscript: 'लगभग सात एकड़।', definition: 'the stated land area is roughly 5 to 10 acres' },
      { id: 'land_10to20', label: '10 to 20 acres', labelHi: '10 से 20 एकड़', next: 'land_water', sampleTranscript: 'लगभग पंद्रह एकड़।', definition: 'the stated land area is roughly 10 to 20 acres' },
      { id: 'land_over20', label: 'Over 20 acres', labelHi: '20 एकड़ से ज़्यादा', next: 'land_water', sampleTranscript: 'बीस एकड़ से ज़्यादा।', definition: 'the stated land area is roughly over 20 acres' },
      { id: 'unclear', label: "Other / Doesn't know / Unclear", labelHi: 'अन्य / पता नहीं / स्पष्ट नहीं', next: 'TERMINAL:human_review_unclear_bucket', sampleTranscript: 'मुझे ठीक-ठीक पता नहीं है।', definition: "the applicant doesn't know or can't state the land area" },
    ],
  },
  land_water: {
    id: 'land_water',
    question: 'Is your land irrigated, or does it depend on rainfall?',
    questionHi: 'क्या आपकी ज़मीन में सिंचाई की सुविधा है, या यह बारिश पर निर्भर है?',
    readVerbatim: true,
    taps: [
      { id: 'irrigated', label: 'Irrigated — borewell, canal, or drip', labelHi: 'सिंचित — बोरवेल, नहर, या ड्रिप', next: 'ROUTE:farmerCalc', sampleTranscript: 'इसमें पूरी सिंचाई की सुविधा है, हमारे पास एक ट्यूबवेल है।', definition: 'the land has full irrigation — borewell, canal, or drip irrigation' },
      { id: 'partly_irrigated', label: 'Partly irrigated', labelHi: 'आंशिक रूप से सिंचित', next: 'ROUTE:farmerCalc', sampleTranscript: 'कुछ हिस्से में सिंचाई है, बाकी बारिश पर निर्भर है।', definition: 'part of the land is irrigated, the rest depends on rainfall' },
      { id: 'rainfed', label: 'Rain-fed', labelHi: 'बारिश पर निर्भर', next: 'ROUTE:farmerCalc', sampleTranscript: 'यह बारिश पर निर्भर करती है, हमारे पास सिंचाई की सुविधा नहीं है।', definition: 'the land depends entirely on rainfall — no irrigation facility at all' },
      { id: 'unclear', label: "Other / Doesn't know / Unclear", labelHi: 'अन्य / पता नहीं / स्पष्ट नहीं', next: 'TERMINAL:human_review_unclear_bucket', definition: "the answer doesn't clearly fit any of the other buckets here, or the applicant doesn't know / can't say" },
    ],
  },
  year_clean_path: {
    id: 'year_clean_path',
    question: 'Would you say last year was normal for your farming, or better or worse than usual?',
    questionHi: 'क्या आप कहेंगे कि पिछला साल आपकी खेती के लिए सामान्य था, या हमेशा से बेहतर या खराब था?',
    readVerbatim: true,
    taps: [
      { id: 'normal', label: 'Normal', labelHi: 'सामान्य', next: 'q4_sales', sampleTranscript: 'बिल्कुल सामान्य था, कोई खास समस्या नहीं हुई।', definition: "last year's farming was normal / typical, no major problem" },
      { id: 'better', label: 'Better than usual', labelHi: 'हमेशा से बेहतर', next: 'q4_sales', sampleTranscript: 'अच्छा रहा, उम्मीद से बेहतर।', definition: "last year's farming was better than usual" },
      { id: 'worse', label: 'Worse (drought, flood, pest)', labelHi: 'खराब (सूखा, बाढ़, कीट)', next: 'q4_sales', sampleTranscript: 'थोड़ा खराब रहा, लेकिन ठीक-ठाक निकल गया।', definition: "last year's farming was worse than usual — drought, flood, or pest damage" },
      { id: 'varies', label: 'Varies a lot year to year', labelHi: 'हर साल अलग-अलग रहता है', next: 'q4_sales', sampleTranscript: 'यह हर साल बदलता रहता है।', definition: "farming outcome varies a lot from year to year, no single 'normal' pattern" },
      { id: 'unclear', label: "Other / Doesn't know / Unclear", labelHi: 'अन्य / पता नहीं / स्पष्ट नहीं', next: 'TERMINAL:human_review_unclear_bucket', definition: "the answer doesn't clearly fit any of the other buckets here, or the applicant doesn't know / can't say" },
    ],
  },
  year_recheck: {
    id: 'year_recheck',
    question: 'Was last year normal for your farming, or was it better or worse than usual — drought, flood, pest?',
    questionHi: 'क्या पिछला साल आपकी खेती के लिए सामान्य था, या हमेशा से बेहतर या खराब था — सूखा, बाढ़, कीट?',
    readVerbatim: true,
    taps: [
      { id: 'normal', label: 'Normal', labelHi: 'सामान्य', next: 'q3_alt', sampleTranscript: 'नहीं, साल सामान्य ही था।', definition: "last year's farming was normal / typical, no major problem" },
      { id: 'better', label: 'Better than usual', labelHi: 'हमेशा से बेहतर', next: 'q3_alt', sampleTranscript: 'नहीं, साल अच्छा ही था।', definition: "last year's farming was better than usual" },
      { id: 'worse', label: 'Worse (drought, flood, pest)', labelHi: 'खराब (सूखा, बाढ़, कीट)', next: 'ROUTE:farmerCalcSoftened', sampleTranscript: 'नहीं, सूखा पड़ गया था, फसल खराब हुई।', definition: "last year's farming was worse than usual — drought, flood, or pest damage" },
      { id: 'varies', label: 'Varies a lot year to year', labelHi: 'हर साल अलग-अलग रहता है', next: 'q3_alt', sampleTranscript: 'यह हर साल ऐसा ही रहता है।', definition: "farming outcome varies a lot from year to year, no single 'normal' pattern" },
      { id: 'unclear', label: "Other / Doesn't know / Unclear", labelHi: 'अन्य / पता नहीं / स्पष्ट नहीं', next: 'TERMINAL:human_review_unclear_bucket', definition: "the answer doesn't clearly fit any of the other buckets here, or the applicant doesn't know / can't say" },
    ],
  },
  q4_sales: {
    id: 'q4_sales',
    question: 'Where do you usually sell what you grow?',
    questionHi: 'आप जो उगाते हैं, उसे आम तौर पर कहां बेचते हैं?',
    readVerbatim: true,
    taps: [
      { id: 'local_mandi', label: 'Local mandi', labelHi: 'स्थानीय मंडी', next: 'q5_equipment', sampleTranscript: 'मैं स्थानीय मंडी में बेचता हूं।', definition: 'sells at the local mandi (wholesale market)' },
      { id: 'trader_collects', label: 'A trader collects from the village', labelHi: 'व्यापारी गांव से लेकर जाता है', next: 'q5_equipment', sampleTranscript: 'एक स्थानीय व्यापारी गांव से आकर ले जाता है।', definition: 'a trader/middleman collects the produce from the village' },
      { id: 'mill_or_company', label: 'Directly to a mill, dairy or company', labelHi: 'सीधे मिल, डेयरी या कंपनी को', next: 'q5_equipment', sampleTranscript: 'सीधे मिल या कंपनी को बेचता हूं।', definition: 'sells directly to a mill, dairy, or company' },
      { id: 'contract_farming', label: 'Contract farming with a named buyer', labelHi: 'तय खरीदार के साथ ठेके पर खेती', next: 'q5_equipment', sampleTranscript: 'एक तय खरीदार के साथ ठेके पर खेती करता हूं।', definition: 'contract farming with a specific named buyer' },
      { id: 'fpo_cooperative', label: 'FPO or cooperative', labelHi: 'एफपीओ या सहकारी समिति', next: 'q5_equipment', sampleTranscript: 'मैं स्थानीय एफपीओ को बेचता हूं, वे यहां किसानों से सीधे खरीद लेते हैं।', definition: 'sells through an FPO (farmer producer organization) or cooperative' },
      { id: 'exports', label: 'Exports', labelHi: 'निर्यात', next: 'q5_equipment', sampleTranscript: 'निर्यात के लिए बेचता हूं।', definition: 'sells for export' },
      { id: 'retail_myself', label: 'Sells retail myself', labelHi: 'खुद खुदरा बेचता/बेचती हूं', next: 'q5_equipment', sampleTranscript: 'मैं खुद खुदरा बेचता हूं।', definition: 'sells retail directly, by themselves' },
      { id: 'unclear', label: "Other / Doesn't know / Unclear", labelHi: 'अन्य / पता नहीं / स्पष्ट नहीं', next: 'TERMINAL:human_review_unclear_bucket', definition: "the answer doesn't clearly fit any of the other buckets here, or the applicant doesn't know / can't say" },
    ],
  },
  q5_equipment: {
    id: 'q5_equipment',
    question: 'Do you own a tractor or any other farm equipment?',
    questionHi: 'क्या आपके पास ट्रैक्टर या कोई अन्य कृषि उपकरण है?',
    readVerbatim: true,
    taps: [
      { id: 'owns', label: 'Yes, owns', labelHi: 'हां, अपना है', next: 'ROUTE:farmerEquipment', sampleTranscript: 'हां, मेरे पास अपना ट्रैक्टर है।', definition: 'owns a tractor or other farm equipment themselves' },
      { id: 'rents', label: 'Rents when needed', labelHi: 'ज़रूरत पड़ने पर किराए पर लेते हैं', next: 'ROUTE:farmerEquipment', sampleTranscript: 'नहीं, ज़रूरत पड़ने पर मैं पड़ोसी से किराए पर लेता हूं।', definition: 'rents equipment from someone else when needed — does not own' },
      { id: 'shares', label: 'Shares with family or neighbours', labelHi: 'परिवार या पड़ोसियों के साथ बांटते हैं', next: 'ROUTE:farmerEquipment', sampleTranscript: 'परिवार या पड़ोसियों के साथ बांट लेते हैं।', definition: 'shares equipment with family or neighbours — does not own outright' },
      { id: 'custom_hiring', label: 'Uses custom-hiring services', labelHi: 'कस्टम हायरिंग सेवा इस्तेमाल करते हैं', next: 'ROUTE:farmerEquipment', sampleTranscript: 'कस्टम हायरिंग सेवा का इस्तेमाल करता हूं।', definition: 'uses a custom-hiring service for equipment — does not own' },
      { id: 'not_needed', label: 'Not needed at this scale', labelHi: 'इस स्तर पर ज़रूरत नहीं', next: 'ROUTE:farmerEquipment', sampleTranscript: 'इस स्तर पर ज़रूरत नहीं है।', definition: "doesn't have or need equipment at their scale — a bare negative with no specific alternative mechanism named (not rent, not share, not custom-hiring)" },
      { id: 'unclear', label: "Other / Doesn't know / Unclear", labelHi: 'अन्य / पता नहीं / स्पष्ट नहीं', next: 'TERMINAL:human_review_unclear_bucket', definition: "the answer doesn't clearly fit any of the other buckets here, or the applicant doesn't know / can't say" },
    ],
  },
  q3_alt: {
    id: 'q3_alt',
    /**
     * Round 26: reworded from the original "That figure looks higher than
     * we would expect for this land..." — that opening only makes sense if
     * the applicant can see a number in front of them (they can't), and it
     * read as a checklist naming every detection category out loud. This
     * version anchors to "you'd mentioned earlier" instead of an invisible
     * figure, and shortens each category to one or two words.
     */
    question: "You'd mentioned your yearly income earlier — that seems a bit more than we'd expect for this land. Is there anything else coming in — another job, pension, remittance, government scheme, or rental?",
    questionHi: 'आपने पहले अपनी सालाना आय बताई थी — यह इस ज़मीन के हिसाब से जितनी उम्मीद थी, उससे थोड़ी ज़्यादा लग रही है। क्या और भी कुछ आय आती है — कोई और नौकरी, पेंशन, विदेश/बाहर से भेजा पैसा, सरकारी योजना, या किराया?',
    readVerbatim: true,
    taps: [
      { id: 'household_total', label: 'Household total', labelHi: 'पूरे परिवार की कुल आय', next: 'DYNAMIC:farmerIncomeExplained', sampleTranscript: 'यह पूरे परिवार की आय है, सिर्फ मेरी खेती की नहीं।', definition: "the declared income figure is a household total, not the applicant's farming income alone" },
      { id: 'rental_income', label: 'Rental from land leased out', labelHi: 'किराए पर दी गई ज़मीन से आय', next: 'DYNAMIC:farmerIncomeExplained', sampleTranscript: 'ज़मीन किराए पर दी है, वहां से भी आय आती है।', definition: 'the household has rental income from land leased out, in addition to farming' },
      { id: 'side_business', label: 'Side business', labelHi: 'साथ में छोटा व्यापार', next: 'DYNAMIC:farmerIncomeExplained', sampleTranscript: 'खेती के साथ एक छोटा व्यापार भी है।', definition: 'the household has a side business in addition to farming' },
      { id: 'dairy_alongside', label: 'Dairy alongside', labelHi: 'साथ में डेयरी', next: 'DYNAMIC:farmerIncomeExplained', sampleTranscript: 'खेती के साथ डेयरी भी करते हैं।', definition: 'the household does dairy alongside farming' },
      { id: 'sold_asset', label: 'Sold an asset', labelHi: 'कोई संपत्ति बेची', next: 'DYNAMIC:farmerIncomeExplained', sampleTranscript: 'इस साल कुछ ज़मीन या संपत्ति बेची थी।', definition: 'the household sold an asset (land or property) this year — a one-time income source' },
      { id: 'family_elsewhere', label: 'Family member elsewhere (remittance)', labelHi: 'परिवार का सदस्य बाहर काम करता है (पैसे भेजता है)', next: 'DYNAMIC:farmerIncomeExplained', sampleTranscript: 'हां, मेरा बेटा पुणे में काम करता है और हर महीने घर पैसे भेजता है।', definition: 'a family member works elsewhere and sends money home (remittance)' },
      { id: 'farming_alone', label: 'No, that is my farming income alone', labelHi: 'नहीं, यह सिर्फ मेरी खेती की आय है', next: 'TERMINAL:red_farmer_cannot_reconcile', sampleTranscript: 'नहीं, यह सब मेरी खेती से ही है। और कुछ नहीं है।', definition: 'no other income source — the declared figure is genuinely farming income alone' },
      { id: 'unclear', label: "Other / Doesn't know / Unclear", labelHi: 'अन्य / पता नहीं / स्पष्ट नहीं', next: 'TERMINAL:human_review_unclear_bucket', definition: "the answer doesn't clearly fit any of the other buckets here, or the applicant doesn't know / can't say" },
    ],
  },
};

/**
 * Round 23: `human_review_farmer_other` and `human_review_no_acreage` are
 * gone — both q1's `other` and land_area's `does_not_know` taps were
 * renamed to the shared `unclear` id and now route to
 * `TERMINAL:human_review_unclear_bucket` instead. That verdict isn't a
 * table entry here (unlike every other verdict in this file): its `reasons`
 * and `agentNote` vary per node/per call (which question terminated, what
 * the agent typed), so it's constructed inline in AmberPanel.tsx's
 * `submitUnclearNote()` — same pattern the older `human_review_other`
 * (the free-floating "Other" panel, still used by SIM/premium-address)
 * already used for the same reason.
 */
const farmerVerdicts: Record<string, Verdict> = {
  human_review_farmer_seasonal: {
    id: 'human_review_farmer_seasonal',
    band: 'HUMAN_REVIEW',
    reasons: ['Multi-season, different-crop-per-season farming — direction for this path is locked but the question sequence and arithmetic are not yet built. Routed to separate review.'],
  },
  human_review_farmer_livestock: {
    id: 'human_review_farmer_livestock',
    band: 'HUMAN_REVIEW',
    reasons: ['Livestock, poultry, fish or shrimp income needs its own per-animal/per-bird/per-pond arithmetic, structurally different from the land-acreage calc this tree runs — not yet built. Routed to separate review.'],
  },
  human_review_farmer_tenancy: {
    id: 'human_review_farmer_tenancy',
    band: 'HUMAN_REVIEW',
    reasons: ['Agricultural labourer, tenant, or non-cultivating landowner — none of these relationships produce an arithmetic-verifiable income the way owner-cultivation does. Routed to separate review, no arithmetic attempted, per locked decision.'],
  },
  green_farmer_reconciled: {
    id: 'green_farmer_reconciled',
    band: 'PROCEED',
    reasons: ['Crop, acreage and irrigation reconcile with the declared income, the sales channel raises no scale concern, and no equipment ownership is left to verify.'],
    signals: { explanationQuality: 0.6, timelineArithmetic: 0.5 },
  },
  step_up_equipment_pending: {
    id: 'step_up_equipment_pending',
    band: 'STEP_UP',
    reasons: ['Income reconciles, but the applicant claims tractor/equipment ownership. Vahan (vehicle registry) is a backend lookup and cannot confirm this live — pending, upgrades only through the bank\'s risk/review team after the call.'],
    signals: { explanationQuality: 0.2 },
    amberFlavor: 'pending-verification',
    pendingVerification: {
      documentsRequired: 'None from the applicant directly — vehicle registration check runs against the government registry (VAHAN) on the declared owner\'s name.',
      expertiseRequired: 'Standard risk review — no specialist escalation needed.',
    },
  },
  step_up_sales_scale: {
    id: 'step_up_sales_scale',
    band: 'STEP_UP',
    reasons: ['Income reconciles, but a large holding selling only through an informal, unverifiable channel (local mandi or a village trader) is worth a second look — not proof of anything on its own.'],
    signals: { explanationQuality: 0.2 },
    amberFlavor: 'pending-verification',
    pendingVerification: {
      documentsRequired: 'None from the applicant directly — sales-channel scale is cross-checked against records already available to the review team.',
      expertiseRequired: 'Standard risk review — no specialist escalation needed.',
    },
  },
  step_up_both_flags: {
    id: 'step_up_both_flags',
    band: 'STEP_UP',
    reasons: [
      'Income reconciles, but a large holding sells only through an informal channel — worth a second look.',
      'Applicant also claims tractor/equipment ownership, pending Vahan (vehicle registry) verification after the call.',
    ],
    signals: { explanationQuality: 0.1 },
    amberFlavor: 'pending-verification',
    pendingVerification: {
      documentsRequired: 'None from the applicant directly — vehicle registration check runs against the government registry (VAHAN) on the declared owner\'s name.',
      expertiseRequired: 'Standard risk review — no specialist escalation needed; both items resolve from data already available to the review team.',
    },
  },
  step_up_bad_year_explained: {
    id: 'step_up_bad_year_explained',
    band: 'STEP_UP',
    reasons: ['Farming income only reconciles with the declared figure after accounting for a stated bad year (drought, flood, or pest) — logged as a bad-year-adjusted read, not a clean-pass reconciliation.'],
    signals: { explanationQuality: 0.1 },
    amberFlavor: 'explanation-logged',
  },
  red_farmer_cannot_reconcile: {
    id: 'red_farmer_cannot_reconcile',
    band: 'BLOCK',
    reasons: ['The declared income cannot be produced by the crop, acreage and irrigation pattern described, even accounting for a bad year, and no other income source was offered when asked directly.'],
    signals: { explanationQuality: -1, timelineArithmetic: -1 },
  },
};

// ---------------------------------------------------------------------------
// Premium-address risk — Bandhan-flagged scenario. Rural/modest applicant
// declaring a premium urban address. Leads with the branch that clears
// people (employer-provided housing), which is the strongest inclusion
// story of any tree here.
// ---------------------------------------------------------------------------

const premiumAddressNodes: Record<string, QuestionNode> = {
  q1_addr: {
    id: 'q1_addr',
    question: 'Is this address where you currently live, or an address for correspondence?',
    readVerbatim: true,
    taps: [
      { id: 'i_live_there', label: 'I live there', next: 'addr_tenure' },
      { id: 'correspondence_only', label: 'Correspondence only, I live elsewhere', next: 'addr_whose' },
      { id: 'both_move_between', label: 'Both, I move between them', next: 'addr_tenure' },
      { id: 'not_sure', label: 'Not sure', next: 'TERMINAL:human_review_addr_unclear' },
    ],
  },
  addr_tenure: {
    id: 'addr_tenure',
    question: 'How long have you been living there?',
    readVerbatim: true,
    taps: [
      { id: 'under6mo', label: 'Under 6 months', next: 'addr_work' },
      { id: '6to12mo', label: '6 to 12 months', next: 'addr_work' },
      { id: '1to3y', label: '1 to 3 years', next: 'addr_work' },
      { id: 'over3y', label: 'Over 3 years', next: 'addr_work' },
      { id: 'cannot_recall', label: 'Cannot recall', next: 'TERMINAL:human_review_addr_unclear' },
    ],
  },
  addr_work: {
    id: 'addr_work',
    question: 'What do you do for work here?',
    readVerbatim: true,
    taps: [
      { id: 'same_as_declared', label: 'Same work as declared', next: 'addr_living' },
      { id: 'different_work', label: 'Different work', next: 'addr_living' },
      { id: 'staying_with_family', label: 'Staying with family, not working', next: 'addr_living' },
      { id: 'studying', label: 'Studying', next: 'addr_living' },
    ],
  },
  addr_living: {
    id: 'addr_living',
    question: 'Do you stay alone, or with family or others?',
    readVerbatim: true,
    taps: [
      { id: 'alone', label: 'Alone', next: 'addr_landmark' },
      { id: 'with_family', label: 'With family', next: 'TERMINAL:green_addr_family' },
      { id: 'shared', label: 'Shared accommodation', next: 'TERMINAL:strong_green_addr_shared_or_employer' },
      { id: 'employer_provided', label: 'Employer-provided', next: 'TERMINAL:strong_green_addr_shared_or_employer' },
    ],
  },
  addr_landmark: {
    id: 'addr_landmark',
    question: 'Which station or landmark is nearest to you?',
    readVerbatim: true,
    taps: [
      { id: 'answers_readily', label: 'Answers readily and correctly', next: 'TERMINAL:green_leaning_addr_landmark' },
      { id: 'hesitates', label: 'Hesitates, or gets it wrong', next: 'TERMINAL:red_leaning_addr_landmark' },
      { id: 'does_not_know', label: 'Does not know the area', next: 'TERMINAL:red_leaning_addr_landmark' },
    ],
  },
  addr_whose: {
    id: 'addr_whose',
    question: 'Whose address is this one, then?',
    readVerbatim: true,
    taps: [
      { id: 'family_member', label: 'A family member', next: 'TERMINAL:green_addr_family' },
      { id: 'employer', label: 'Employer', next: 'TERMINAL:green_addr_family' },
      { id: 'friend', label: 'A friend', next: 'TERMINAL:human_review_addr_unclear' },
      { id: 'someone_who_helped', label: 'Someone who helped me apply', next: 'TERMINAL:block_addr_victim_flag' },
      { id: 'not_sure', label: 'Not sure', next: 'TERMINAL:human_review_addr_unclear' },
    ],
  },
};

const premiumAddressVerdicts: Record<string, Verdict> = {
  human_review_addr_unclear: {
    id: 'human_review_addr_unclear',
    band: 'HUMAN_REVIEW',
    reasons: ['Applicant could not clarify the address relationship — routed to separate review.'],
  },
  green_addr_family: {
    id: 'green_addr_family',
    band: 'PROCEED',
    reasons: ['Using a family member\'s or employer\'s city address for correspondence is completely ordinary.'],
    signals: { explanationQuality: 0.6, corroboratingChecks: 0.3 },
  },
  strong_green_addr_shared_or_employer: {
    id: 'strong_green_addr_shared_or_employer',
    band: 'PROCEED',
    reasons: ['Domestic staff, drivers, security staff and hospitality workers genuinely live at premium addresses on modest incomes — the single most common innocent explanation, and one a naive rules engine would have rejected.'],
    signals: { explanationQuality: 1, corroboratingChecks: 0.6 },
  },
  green_leaning_addr_landmark: {
    id: 'green_leaning_addr_landmark',
    band: 'PROCEED',
    reasons: ['Applicant knows the neighbourhood readily and correctly — consistent with genuinely living there.'],
    signals: { explanationQuality: 0.5 },
  },
  red_leaning_addr_landmark: {
    id: 'red_leaning_addr_landmark',
    band: 'STEP_UP',
    reasons: ['Claims to live there alone but hesitates on, or does not know, a routine local landmark — consistent with an address read off a document rather than lived experience.'],
    signals: { explanationQuality: -0.5 },
    amberFlavor: 'pending-verification',
    pendingVerification: {
      documentsRequired: 'None from the applicant directly — a field or utility-bill check confirms genuine residence at the declared address.',
      expertiseRequired: 'Standard risk review.',
    },
  },
  block_addr_victim_flag: {
    id: 'block_addr_victim_flag',
    band: 'BLOCK',
    reasons: [
      'The address belongs to the person who arranged the application, not the applicant.',
      'Statements and the card would go to that third party, not to the applicant.',
    ],
    victimFlag: 'Possible exploited individual — route to customer-protection path, not fraud.',
    signals: { explanationQuality: -1, thirdPartyInvolvement: -1 },
  },
};

export const RULE_TREES: Record<string, RuleTree> = {
  sim_circle_mismatch: {
    id: 'sim_circle_mismatch',
    ruleLabel: 'SIM circle does not match declared address',
    entryNode: 'q1',
    rotatedEntryNode: 'q1_reask',
    nodes: simCircleNodes,
    verdicts: simCircleVerdicts,
  },
  farmer_income_mismatch: {
    id: 'farmer_income_mismatch',
    ruleLabel: 'Declared income inconsistent with declared occupation (Farmer)',
    entryNode: 'q1',
    rotatedEntryNode: 'q1',
    nodes: farmerNodes,
    verdicts: farmerVerdicts,
  },
  premium_address_risk: {
    id: 'premium_address_risk',
    ruleLabel: 'Declared address inconsistent with declared income/occupation',
    entryNode: 'q1_addr',
    rotatedEntryNode: 'q1_addr',
    nodes: premiumAddressNodes,
    verdicts: premiumAddressVerdicts,
  },
};

export function getTree(treeId: string): RuleTree {
  const tree = RULE_TREES[treeId];
  if (!tree) throw new Error(`Unknown rule tree: ${treeId}`);
  return tree;
}

export function getNode(tree: RuleTree, id: string): QuestionNode | undefined {
  return tree.nodes[id];
}

export function getVerdict(tree: RuleTree, id: string): Verdict | undefined {
  return tree.verdicts[id];
}

export { computeScore };
