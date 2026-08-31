export type ProductivityMetricId =
  | 'totalCalls'
  | 'efficiency'
  | 'accuracy'
  | 'approvalRate'
  | 'callDropRate'
  | 'csat'
  | 'avgWaitSec'
  | 'avgCallSec'
  | 'avgReviewSec'
  | 'aht'
  | 'avgBreakMin'
  | 'avgHoursOnline'
  | 'occupancy';

export interface ProductivityMetricDef {
  id: ProductivityMetricId;
  label: string;
  direction: 'high' | 'low';
  tooltip: string;
  format: (v: number | null | undefined) => string;
}

const fmtNum = (v: number | null | undefined) => (v ?? 0).toLocaleString();
const fmt1 = (v: number | null | undefined) => `${(v ?? 0).toFixed(1)}`;
const fmtPct = (v: number | null | undefined) => `${(v ?? 0).toFixed(1)}%`;

export const PRODUCTIVITY_METRICS: ProductivityMetricDef[] = [
  { id: 'totalCalls', label: 'Total Calls', direction: 'high', tooltip: 'Total calls handled in the selected period.', format: fmtNum },
  { id: 'efficiency', label: 'Efficiency (0-100)', direction: 'high', tooltip: 'Composite efficiency score for handling speed and quality.', format: fmt1 },
  {
    id: 'accuracy',
    label: 'Accuracy',
    direction: 'high',
    tooltip: 'Share of audited approvals upheld by auditors - rejections and recaptures both count as overturns.',
    format: fmtPct,
  },
  { id: 'approvalRate', label: 'Approval Rate', direction: 'high', tooltip: 'Share of connected calls the agent approved.', format: fmtPct },
  { id: 'callDropRate', label: 'Call Drop Rate', direction: 'low', tooltip: 'Share of routed calls that dropped before completion.', format: fmtPct },
  { id: 'csat', label: 'CSAT', direction: 'high', tooltip: 'Average post-call customer satisfaction score.', format: fmt1 },
  { id: 'avgWaitSec', label: 'Avg Wait Time', direction: 'low', tooltip: 'Average wait before agent connected.', format: (v) => `${Math.round(v ?? 0)}s` },
  { id: 'avgCallSec', label: 'Avg Call Time', direction: 'low', tooltip: 'Average connected call duration.', format: (v) => `${Math.round(v ?? 0)}s` },
  { id: 'avgReviewSec', label: 'Avg Review Time', direction: 'low', tooltip: 'Average post-call review duration.', format: (v) => `${Math.round(v ?? 0)}s` },
  {
    id: 'aht',
    label: 'AHT',
    direction: 'low',
    tooltip: 'Average Handling Time = average call time + average review time per verification.',
    format: (v) => {
      const s = Math.round(v ?? 0);
      return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
    },
  },
  { id: 'avgBreakMin', label: 'Avg Break Time', direction: 'low', tooltip: 'Average break minutes per workday.', format: (v) => `${(v ?? 0).toFixed(1)}m` },
  { id: 'avgHoursOnline', label: 'Avg Hours Online', direction: 'high', tooltip: 'Average online hours per day.', format: (v) => `${(v ?? 0).toFixed(1)}h` },
  {
    id: 'occupancy',
    label: 'Occupancy',
    direction: 'high',
    tooltip: 'Handling time (on-call + post-call review) divided by online time. Sustained >90% indicates overload risk.',
    format: fmtPct,
  },
];

