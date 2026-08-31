export const METRIC_TOOLTIPS = {
  efficiency:
    'Weighted score: Answer rate 30%, Online time 25%, Wait 15%, Call time 15%, Review 15%',
  accuracy:
    'Accuracy = % of agent decisions upheld by auditor (1 − overturn rate).',
  callsTaken: 'Total number of VKYC calls handled in the selected period.',
  approved: 'Calls where you approved the customer verification.',
  rejected: 'Calls where you rejected the customer verification.',
  approvalRate: 'Percentage of calls approved out of total calls taken.',
  avgCallTime: 'Average duration of completed calls.',
  callDropRate:
    '% of calls routed to you that went unanswered and were rerouted after 2 minutes',
  avgWait:
    'Average time a customer waited after being routed to you before you answered',
  avgReview:
    'Average time from ending the call to submitting your decision',
} as const;

export const EFFICIENCY_CONFIG = {
  rerouteCapSec: 120,
  callTimeBandSec: { min: 150, max: 270 },
  callTimeZeroSec: { below: 60, above: 600 },
  reviewFloorSec: 30,
  reviewZeroSec: 180,
  onlineTargetHrs: 7.5,
  weights: { answer: 0.30, wait: 0.15, callTime: 0.15, review: 0.15, online: 0.25 },
} as const;

export const CALL_STEPS = [
  { id: 'liveliness', label: 'Check Liveliness', icon: 'activity' },
  { id: 'location', label: 'Check Location', icon: 'map-pin' },
  { id: 'face', label: 'Capture Face', icon: 'scan-face' },
  { id: 'aadhaar', label: 'Check Aadhaar', icon: 'id-card' },
  { id: 'pan', label: 'Check PAN', icon: 'credit-card' },
  { id: 'sign', label: 'Capture Sign', icon: 'pen-line' },
  { id: 'report', label: 'Report', icon: 'clipboard-check' },
] as const;

export type StepId = (typeof CALL_STEPS)[number]['id'];

export type StepStatus = 'pending' | 'active' | 'passed' | 'failed';
