import { useMemo } from 'react';
import {
  defaultFiltersFor,
  generateReport,
  type ReportFilters,
  type ReportResult,
  type ReportType,
} from '@vkyc/shared/data/reportGenerators';
import type { PartnerId } from '@vkyc/shared/data/types';
import { usePartnerScope } from './PartnerScopeContext';

/** Force partner scope on every report filter set — partners cannot omit or widen scope. */
export function scopeReportFilters(partnerId: PartnerId, filters: ReportFilters): ReportFilters {
  return { ...filters, partnerIds: [partnerId] };
}

export function defaultPartnerReportFilters(type: ReportType, partnerId: PartnerId): ReportFilters {
  return scopeReportFilters(partnerId, defaultFiltersFor(type));
}

export function generatePartnerReport(
  type: ReportType,
  partnerId: PartnerId,
  filters: ReportFilters,
): ReportResult {
  return generateReport(type, scopeReportFilters(partnerId, filters));
}

/** Partner-app report boundary — all selector calls must go through this hook. */
export function usePartnerReportService() {
  const { partnerId } = usePartnerScope();
  return useMemo(() => ({
    partnerId,
    scopeFilters: (filters: ReportFilters) => scopeReportFilters(partnerId, filters),
    defaultFilters: (type: ReportType) => defaultPartnerReportFilters(type, partnerId),
    generateReport: (type: ReportType, filters: ReportFilters) =>
      generatePartnerReport(type, partnerId, filters),
  }), [partnerId]);
}
