import type { AuditorDecisionRecord, AuditorReviewDecision } from './auditorStore';
import { getReasonMeta } from '../lib/rejectionReasons';
import { REASON_CATEGORY_OPTIONS, getReasonOptionsForCategories } from './nonApprovedCaseFilters';

export interface AuditorDecisionCriteria {
  search: string;
  decisions: AuditorReviewDecision[];
  reasonCategories: string[];
  reasons: string[];
  dateFrom: string;
  dateTo: string;
  customDateRange: boolean;
}

export const DEFAULT_DECISION_CRITERIA: AuditorDecisionCriteria = {
  search: '',
  decisions: [],
  reasonCategories: [],
  reasons: [],
  dateFrom: '',
  dateTo: '',
  customDateRange: false,
};

export const DECISION_FILTER_OPTIONS: { id: AuditorReviewDecision; label: string }[] = [
  { id: 'Approved', label: 'Approved' },
  { id: 'Recapture', label: 'Recapture' },
  { id: 'Rejected', label: 'Rejected' },
];

function extractReasonLabels(reason: string | null): string[] {
  if (!reason) return [];
  return reason.split(';').map((part) => {
    const colon = part.indexOf(':');
    return colon > 0 ? part.slice(colon + 1).trim() : part.trim();
  }).filter(Boolean);
}

function extractReasonCategories(reason: string | null): string[] {
  if (!reason) return [];
  const cats = new Set<string>();
  for (const part of reason.split(';')) {
    const trimmed = part.trim();
    const colon = trimmed.indexOf(':');
    if (colon > 0) {
      cats.add(trimmed.slice(0, colon).trim());
    }
    const label = colon > 0 ? trimmed.slice(colon + 1).trim() : trimmed;
    const meta = getReasonMeta(label);
    if (meta) cats.add(meta.category);
  }
  return Array.from(cats);
}

export interface FilterDecisionsOptions {
  pageDateFrom?: string;
  pageDateTo?: string;
}

/** Single filtering path for the Recent Decisions table. */
export function filterDecisions(
  records: AuditorDecisionRecord[],
  criteria: AuditorDecisionCriteria,
  options: FilterDecisionsOptions = {},
): AuditorDecisionRecord[] {
  const { pageDateFrom = '', pageDateTo = '' } = options;
  const dateFrom = criteria.customDateRange ? criteria.dateFrom : (criteria.dateFrom || pageDateFrom);
  const dateTo = criteria.customDateRange ? criteria.dateTo : (criteria.dateTo || pageDateTo);

  let rows = [...records];

  if (criteria.decisions.length > 0) {
    const set = new Set(criteria.decisions);
    rows = rows.filter((r) => set.has(r.decision));
  }

  if (criteria.reasonCategories.length > 0) {
    const set = new Set(criteria.reasonCategories.map((c) => c.toLowerCase()));
    rows = rows.filter((r) => extractReasonCategories(r.reason).some((c) => set.has(c.toLowerCase())));
  }

  if (criteria.reasons.length > 0) {
    const set = new Set(criteria.reasons.map((r) => r.toLowerCase()));
    rows = rows.filter((r) => {
      const labels = extractReasonLabels(r.reason);
      return labels.some((l) => set.has(l.toLowerCase())) || (r.reason && set.has(r.reason.toLowerCase()));
    });
  }

  if (dateFrom) {
    rows = rows.filter((r) => r.decidedAt >= `${dateFrom}T00:00:00`);
  }
  if (dateTo) {
    rows = rows.filter((r) => r.decidedAt <= `${dateTo}T23:59:59`);
  }

  const q = criteria.search.trim().toLowerCase();
  if (q) {
    rows = rows.filter((r) => {
      const reason = (r.reason ?? '').toLowerCase();
      return (
        r.customer.name.toLowerCase().includes(q)
        || r.customer.appId.toLowerCase().includes(q)
        || r.agent.name.toLowerCase().includes(q)
        || reason.includes(q)
      );
    });
  }

  return rows;
}

export function countDecisionCriteria(
  criteria: AuditorDecisionCriteria,
  pageDateFrom?: string,
  pageDateTo?: string,
): number {
  const dateActive = criteria.customDateRange
    || (criteria.dateFrom && criteria.dateFrom !== pageDateFrom)
    || (criteria.dateTo && criteria.dateTo !== pageDateTo);
  return [
    criteria.decisions.length > 0,
    criteria.reasonCategories.length > 0,
    criteria.reasons.length > 0,
    dateActive,
  ].filter(Boolean).length;
}

export { REASON_CATEGORY_OPTIONS, getReasonOptionsForCategories };
