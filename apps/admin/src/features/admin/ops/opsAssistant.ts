import {
  agents,
  calls,
  attendance,
  getDateRangeFromPreset,
  getEfficiencyScore,
  getAgentStats,
} from '@vkyc/shared/data';
import {
  getFleetAvgWait,
  getAgentsByStatus,
  getHighestVolumePartnerToday,
  getRejectionReasonsToday,
  getCallConversion,
  getCustomerConversion,
  getCsatByPartner,
  getTopAgentsToday,
  getQueueStateSummaryAt,
  WAIT_SLA_SEC,
  type QueueStateAt,
} from '@vkyc/shared/data/adminSelectors';
import { formatMinutes } from '@vkyc/shared/lib/format';
import { PARTNERS } from '@vkyc/shared/data/types';
import type { Agent, PartnerId } from '@vkyc/shared/data/types';
import { describeInstant, resolveTimeExpression } from '@admin/features/admin/ops/timeExpression';

const FALLBACK = "I don't have that data yet — try one of the suggested questions.";

const POLICY_MIN = Math.round(WAIT_SLA_SEC / 60);
const POLICY_LABEL = `${POLICY_MIN} minute${POLICY_MIN === 1 ? '' : 's'}`;

function agentFromText(q: string): Agent | null {
  for (const a of agents) {
    if (q.includes(a.name.toLowerCase())) return a;
  }
  for (const a of agents) {
    const first = a.name.split(' ')[0].toLowerCase();
    if (new RegExp(`\\b${first}\\b`).test(q)) return a;
  }
  return null;
}

function partnerFromText(q: string): PartnerId | null {
  for (const p of PARTNERS) {
    if (p.id === 'GENERAL') continue;
    if (q.includes(p.name.toLowerCase())) return p.id;
  }
  if (/\bdirect\b/.test(q)) return 'GENERAL';
  return null;
}

/**
 * The wait-time answer, for any instant. Reads getQueueStateSummaryAt — the same
 * reconstruction the admin queue cards and the partner snapshot read — so the
 * assistant can never quote a number the dashboard disagrees with, and "right
 * now" and "at 2pm yesterday" are answered by identical logic.
 */
function queueStateAnswer(q: string): string {
  const when = resolveTimeExpression(q);
  const partnerId = partnerFromText(q);
  let at = when.at;
  let label = when.label;
  let summary = getQueueStateSummaryAt(at, partnerId ?? undefined);

  if (summary.rows.length === 0) {
    return 'There are no queues configured for that scope.';
  }

  const scope = partnerId
    ? PARTNERS.find((p) => p.id === partnerId)?.name ?? 'that partner'
    : 'all queues';

  // Sundays and out-of-hours instants have no roster on. Rather than answering
  // with an empty floor, step back to the nearest day that was actually worked
  // at the same clock time and say so.
  let rolledBackFrom: string | null = null;
  if (summary.outsideServiceHours && when.explicit) {
    for (let back = 1; back <= 7; back++) {
      const alt = new Date(at);
      alt.setDate(alt.getDate() - back);
      const altSummary = getQueueStateSummaryAt(alt, partnerId ?? undefined);
      if (!altSummary.outsideServiceHours) {
        rolledBackFrom = label;
        at = alt;
        label = describeInstant(alt);
        summary = altSummary;
        break;
      }
    }
  }

  if (summary.outsideServiceHours) {
    return (
      `Nobody was rostered on across ${scope} ${label} — that falls outside `
      + 'service hours, so there was no queue to report.'
    );
  }

  const rollNote = rolledBackFrom
    ? `Nothing was running ${rolledBackFrom} — no shift was rostered that day. `
      + `Here is the same time on the last day that was worked.\n\n`
    : '';

  const line = (r: QueueStateAt) =>
    `• ${r.queueName} — ${r.waiting} waiting, ${r.liveCalls} live calls, `
    + `${r.agentsOnline} agents active (${r.agentsAvailable} free, ${r.agentsOnBreak} on a break). `
    + `Expected wait for a new customer ${r.noAgents ? 'unbounded — nobody online' : formatMinutes(r.expectedWaitSec)}; `
    + `average wait to that point ${formatMinutes(r.avgWaitToDateSec)}.`;

  const rows = summary.rows
    .slice()
    .sort((a, b) => b.maxWaitSec - a.maxWaitSec)
    .map(line)
    .join('\n');

  const past = when.explicit;
  const head =
    `Longest customer waiting ${label} across ${scope} ${past ? 'was' : 'is'} ${formatMinutes(summary.maxWaitSec)}`
    + `${!partnerId && summary.worstQueueName ? `, in the ${summary.worstQueueName}` : ''}`
    + ` — policy is ${POLICY_LABEL}.`;

  const worst = summary.rows.reduce<QueueStateAt | null>(
    (acc, r) => (acc === null || r.maxWaitSec > acc.maxWaitSec ? r : acc),
    null,
  );

  let why: string;
  if (worst && worst.status !== 'ok') {
    why = worst.noAgents
      ? `\n\nNo agent ${past ? 'was' : 'is'} online to serve the ${worst.queueName} — every customer in it `
        + `${past ? 'was' : 'is'} stalled.`
      : `\n\nWhy: the ${worst.queueName} ${past ? 'had' : 'has'} ${worst.waiting} customers against `
        + `${worst.agentsOnline} agents serving it, and `
        + `${worst.agentsAvailable === 0
          ? `none ${past ? 'were' : 'are'} free`
          : `only ${worst.agentsAvailable} ${worst.agentsAvailable === 1
            ? (past ? 'was' : 'is')
            : (past ? 'were' : 'are')} free`}`
        + `${worst.agentsOnBreak > 0 ? ` (${worst.agentsOnBreak} on a break)` : ''}. `
        + `At an average handle time of ${formatMinutes(worst.ahtSec)}, that backlog takes `
        + `${formatMinutes(worst.expectedWaitSec)} to clear. Agents on that queue is what moves the number.`;
  } else {
    why = `\n\nEvery queue ${past ? 'was' : 'is'} inside the ${POLICY_MIN}-minute answer policy.`;
  }

  return `${rollNote}${head}\n\n${rows}${why}`;
}

function agentProductivity(agent: Agent): string {
  const range = getDateRangeFromPreset('today');
  const eff = getEfficiencyScore(calls, agent.id, range, attendance);
  if (eff.score === null) {
    return `${agent.name} has no calls recorded today, so there's no productivity score yet.`;
  }
  const stats = getAgentStats(calls, agent.id, range, undefined, attendance);
  return (
    `${agent.name} has an efficiency score of ${eff.score}/100 today across ${stats.callsTaken} calls `
    + `(${stats.approved} approved, ${stats.rejected} rejected, ${stats.failed} failed). `
    + `Avg call time ${Math.round(stats.avgCallTimeSec / 60)}m ${stats.avgCallTimeSec % 60}s, `
    + `approval rate ${stats.approvalRate}%.`
  );
}

interface Intent {
  test: (q: string) => boolean;
  answer: (q: string) => string;
}

const INTENTS: Intent[] = [
  // Agent productivity (named) — highest priority when a name + intent word appear.
  {
    test: (q) =>
      (/productiv|efficien|performance/.test(q) || /how is|how's/.test(q)) && agentFromText(q) !== null,
    answer: (q) => agentProductivity(agentFromText(q)!),
  },
  // Live queue state — why is the wait high right now. Must precede the
  // historical average-wait intent below.
  {
    test: (q) =>
      /queue|backlog/.test(q)
      || (/wait/.test(q)
        && (/why|high|long|right now|now|current|live|explain|breach|sla|max|longest/.test(q)
          || resolveTimeExpression(q).explicit)),
    answer: (q) => queueStateAnswer(q),
  },
  // Average wait time today (historical).
  {
    test: (q) => /wait/.test(q),
    answer: (q) => {
      const partnerId = partnerFromText(q);
      const wait = getFleetAvgWait(getDateRangeFromPreset('today'), partnerId ?? undefined);
      const scope = partnerId
        ? PARTNERS.find((p) => p.id === partnerId)?.name ?? 'that partner'
        : 'all partners';
      return (
        `The average customer wait time today is about ${wait} seconds across ${scope}. `
        + 'Ask "why is the wait time high right now?" for the live queue position.'
      );
    },
  },
  // Agents currently available.
  {
    test: (q) => /avail/.test(q) || (/how many/.test(q) && /agent/.test(q)),
    answer: () => {
      const summary = getAgentsByStatus();
      const available = summary.groups.find((g) => g.status === 'available')?.count ?? 0;
      const inCall = summary.groups.find((g) => g.status === 'in_call')?.count ?? 0;
      return (
        `${available} agents are currently available (idle and ready). `
        + `${inCall} are in a call, out of ${summary.present} present today.`
      );
    },
  },
  // Common rejection reasons today.
  {
    test: (q) => /reject/.test(q),
    answer: () => {
      const reasons = getRejectionReasonsToday().slice(0, 3);
      if (reasons.length === 0) return 'No rejection reasons have been logged today yet.';
      const list = reasons.map((r) => `${r.reason} (${r.count})`).join(', ');
      return `The most common rejection reasons today are: ${list}.`;
    },
  },
  // Customer conversion rate (check before generic "conversion").
  {
    test: (q) => /customer conversion/.test(q) || (/conversion/.test(q) && /customer/.test(q)),
    answer: () => {
      const c = getCustomerConversion();
      const sign = c.delta >= 0 ? '+' : '';
      return (
        `Today's customer conversion rate is ${c.rate}% — of customers who started VKYC, `
        + `that share was approved (${sign}${c.delta}pp vs yesterday).`
      );
    },
  },
  // Call conversion rate.
  {
    test: (q) => /call conversion/.test(q) || /conversion/.test(q),
    answer: () => {
      const c = getCallConversion();
      const sign = c.delta >= 0 ? '+' : '';
      return `Today's call conversion rate is ${c.rate}% of answered calls approved (${sign}${c.delta}pp vs yesterday).`;
    },
  },
  // Highest call volume partner.
  {
    test: (q) => /volume/.test(q) || (/highest|most|top/.test(q) && /(call|partner)/.test(q)),
    answer: () => {
      const top = getHighestVolumePartnerToday();
      if (!top) return 'No call volume recorded today yet.';
      return `${top.partnerName} has the highest call volume today with ${top.totalCalls.toLocaleString()} calls.`;
    },
  },
  // CSAT — lowest / satisfaction.
  {
    test: (q) => /csat|satisfaction|rating/.test(q),
    answer: (q) => {
      const csat = getCsatByPartner();
      const rated = csat.partners.filter((p) => p.count > 0);
      if (rated.length === 0) return 'No CSAT responses have been recorded today yet.';
      if (/lowest|worst|poor/.test(q)) {
        const lowest = rated.reduce((min, p) => (p.avg < min.avg ? p : min));
        return `${lowest.partnerName} has the lowest CSAT today at ${lowest.avg.toFixed(1)}/5 (${lowest.count} responses).`;
      }
      return `Overall CSAT today is ${csat.avg.toFixed(1)}/5 across ${csat.count.toLocaleString()} responses.`;
    },
  },
  // Productivity without a name → point to today's top agent.
  {
    test: (q) => /productiv|efficien|top agent|best agent/.test(q),
    answer: () => {
      const top = getTopAgentsToday(1)[0];
      if (!top) return 'No agent productivity is available for today yet.';
      return agentProductivity(top.agent);
    },
  },
  // Bare agent name.
  {
    test: (q) => agentFromText(q) !== null,
    answer: (q) => agentProductivity(agentFromText(q)!),
  },
];

export function answerOpsQuestion(question: string): string {
  const q = question.trim().toLowerCase();
  if (!q) return FALLBACK;
  for (const intent of INTENTS) {
    if (intent.test(q)) return intent.answer(q);
  }
  return FALLBACK;
}

export function getSuggestedQuestions(): string[] {
  const top = getTopAgentsToday(1)[0];
  const topName = top ? top.agent.name.split(' ')[0] : 'the top agent';
  return [
    'Why is the wait time high right now?',
    'What was the wait time in the Niyo queue at 12:30 today?',
    `What is the productivity of ${topName} today?`,
    'What is the average wait time today for customers?',
    'How many agents are currently available?',
    'Which partner has the highest call volume today?',
    'What are the common rejection reasons today?',
    "What is today's customer conversion rate?",
    'Which partner has the lowest CSAT?',
  ];
}
