import { SeededRNG } from './rng';
import {
  generateAgents,
  generateAuditors,
  generateCalls,
  generateCustomers,
  generateAttendance,
  generateAuditorAttendance,
  generateJourneyEntries,
  generateQueueBurstCalls,
  isInBurstWindow,
  ensureTodayAuditorPending,
  ensureRecentDecisionMix,
  ensureTodayFailureChartMix,
  assertCallStatusModel,
} from './generate';

const rng = new SeededRNG(42);

export const agents = generateAgents(rng);
export const auditors = generateAuditors(rng);
export const customers = generateCustomers(rng, 500);

const baseCalls = ensureTodayFailureChartMix(
  ensureRecentDecisionMix(ensureTodayAuditorPending(generateCalls(rng, agents, customers, auditors))),
);

export const attendance = generateAttendance(rng, agents);
export const auditorAttendance = generateAuditorAttendance(rng, auditors);
export const journeyEntries = generateJourneyEntries(rng);

/**
 * The trailing week is re-simulated as a real queue (see generateQueueBurstCalls)
 * so that waits, abandons and call concurrency are consequences of the roster
 * rather than independent draws. This is what makes the live and point-in-time
 * queue views reconstructable from stored records alone.
 *
 * It runs on its own RNG stream and is appended after every other dataset has
 * been drawn, so no existing seeded value shifts.
 */
const burstCalls = generateQueueBurstCalls(
  new SeededRNG(7),
  agents,
  customers,
  auditors,
  attendance,
  baseCalls.length,
);

// Independently-drawn calls inside the simulated window are discarded: mixing
// them in would put agents on two calls at once and break the reconstruction.
export const calls = assertCallStatusModel(
  [...baseCalls.filter((c) => !isInBurstWindow(c.timestamp)), ...burstCalls]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
);

export const demoAgent = agents[0];
