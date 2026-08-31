import type { PartnerId } from './types';
import type { NonApprovedCaseRow, NonApprovedStatus } from './adminSelectors';
import { DROP_STAGES } from './types';
import { REJECTION_CATEGORIES, REJECTION_REASONS } from '../lib/rejectionReasons';

/** Table filter criteria — all table narrowing flows through filterCases(). */
export interface NonApprovedCaseCriteria {
  search: string;
  statuses: NonApprovedStatus[];
  reasonCategories: string[];
  reasons: string[];
  agentIds: string[];
  partnerIds: PartnerId[];
  dateFrom: string;
  dateTo: string;
  /** When true, table date overrides the page-level default range. */
  customDateRange: boolean;
}

export const DEFAULT_NON_APPROVED_CRITERIA: NonApprovedCaseCriteria = {
  search: '',
  statuses: [],
  reasonCategories: [],
  reasons: [],
  agentIds: [],
  partnerIds: [],
  dateFrom: '',
  dateTo: '',
  customDateRange: false,
};

export const NON_APPROVED_STATUS_FILTER_OPTIONS: { id: NonApprovedStatus; label: string }[] = [
  { id: 'User Dropped', label: 'User Dropped' },
  { id: 'Unable to Verify', label: 'Unable to Verify' },
  { id: 'Rejected', label: 'Agent Rejected' },
  { id: 'Recapture', label: 'Auditor Recapture' },
  { id: 'Auditor Rejected', label: 'Auditor Rejected' },
];

export const REASON_CATEGORY_OPTIONS = [
  'Technical',
  'Photo Related',
  'Customer Related',
  'Document Related',
  'Suspicious Customer',
  'Agent Induced',
  'Connection/Drop',
];

export interface FilterCasesOptions {
  /** Resolve agent display text for search (partner app passes masked name). */
  getAgentDisplayName?: (row: NonApprovedCaseRow) => string;
  /** Page-level date defaults when customDateRange is false. */
  pageDateFrom?: string;
  pageDateTo?: string;
}

function displayedReason(row: NonApprovedCaseRow): string {
  return row.status === 'User Dropped' ? (row.call.dropStage ?? row.reason) : row.reason;
}

/**
 * Single filtering path for the non-approved cases table.
 * Search matches Customer Name · App ID · Agent (displayed) · Reason text.
 */
export function filterCases(
  cases: NonApprovedCaseRow[],
  criteria: NonApprovedCaseCriteria,
  options: FilterCasesOptions = {},
): NonApprovedCaseRow[] {
  const {
    getAgentDisplayName = (r) => r.agentName,
    pageDateFrom = '',
    pageDateTo = '',
  } = options;

  const dateFrom = criteria.customDateRange ? criteria.dateFrom : (criteria.dateFrom || pageDateFrom);
  const dateTo = criteria.customDateRange ? criteria.dateTo : (criteria.dateTo || pageDateTo);

  let rows = [...cases];

  if (criteria.statuses.length > 0) {
    const set = new Set(criteria.statuses);
    rows = rows.filter((r) => set.has(r.status));
  }

  if (criteria.reasonCategories.length > 0) {
    const set = new Set(criteria.reasonCategories.map((c) => c.toLowerCase()));
    rows = rows.filter((r) => set.has(r.reasonCategory.toLowerCase()));
  }

  if (criteria.reasons.length > 0) {
    const set = new Set(criteria.reasons.map((r) => r.toLowerCase()));
    rows = rows.filter((r) => set.has(displayedReason(r).toLowerCase()) || set.has(r.reason.toLowerCase()));
  }

  if (criteria.agentIds.length > 0) {
    const set = new Set(criteria.agentIds);
    rows = rows.filter((r) => set.has(r.agentId));
  }

  if (criteria.partnerIds.length > 0) {
    const set = new Set(criteria.partnerIds);
    rows = rows.filter((r) => set.has(r.partnerId));
  }

  if (dateFrom) {
    rows = rows.filter((r) => r.timestamp >= `${dateFrom}T00:00:00`);
  }
  if (dateTo) {
    rows = rows.filter((r) => r.timestamp <= `${dateTo}T23:59:59`);
  }

  const q = criteria.search.trim().toLowerCase();
  if (q) {
    rows = rows.filter((r) => {
      const agent = getAgentDisplayName(r).toLowerCase();
      const reason = displayedReason(r).toLowerCase();
      return (
        r.customerName.toLowerCase().includes(q)
        || r.appId.toLowerCase().includes(q)
        || agent.includes(q)
        || reason.includes(q)
        || r.reason.toLowerCase().includes(q)
      );
    });
  }

  return rows;
}

export function countActiveCriteria(criteria: NonApprovedCaseCriteria, pageDateFrom?: string, pageDateTo?: string): number {
  const dateActive = criteria.customDateRange
    || (criteria.dateFrom && criteria.dateFrom !== pageDateFrom)
    || (criteria.dateTo && criteria.dateTo !== pageDateTo);
  return [
    criteria.statuses.length > 0,
    criteria.reasonCategories.length > 0,
    criteria.reasons.length > 0,
    criteria.agentIds.length > 0,
    criteria.partnerIds.length > 0,
    dateActive,
  ].filter(Boolean).length;
}

/** Sub-reason options narrowed by selected categories. */
export function getReasonOptionsForCategories(categories: string[]): string[] {
  if (categories.length === 0) return [];
  const set = new Set(categories.map((c) => c.toLowerCase()));
  const out: string[] = [];
  if (set.has('connection/drop')) {
    out.push('Customer disconnected before call completion', ...DROP_STAGES);
  }
  for (const cat of REJECTION_CATEGORIES) {
    if (set.has(cat.label.toLowerCase())) {
      out.push(...cat.reasons);
    }
  }
  // Include any taxonomy reasons whose category label matches
  for (const r of REJECTION_REASONS) {
    if (set.has(r.category.toLowerCase()) && !out.includes(r.label)) {
      out.push(r.label);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}
