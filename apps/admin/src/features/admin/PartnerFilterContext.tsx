import { createContext, useContext, type ReactNode } from 'react';
import type { PartnerId } from '@vkyc/shared/data/types';

/** Global dashboard partner filter. 'ALL' = no filter (aggregate). */
export type PartnerFilterValue = PartnerId | 'ALL';

const PartnerFilterContext = createContext<PartnerFilterValue>('ALL');

export function PartnerFilterProvider({
  value,
  children,
}: {
  value: PartnerFilterValue;
  children: ReactNode;
}) {
  return <PartnerFilterContext.Provider value={value}>{children}</PartnerFilterContext.Provider>;
}

/** Read the selected partner. Returns 'ALL' when unfiltered. */
export function usePartnerFilter(): PartnerFilterValue {
  return useContext(PartnerFilterContext);
}

/** Convenience: the selected PartnerId, or undefined when 'ALL'. */
export function usePartnerId(): PartnerId | undefined {
  const v = useContext(PartnerFilterContext);
  return v === 'ALL' ? undefined : v;
}
