import { PARTNERS } from './types';
import type { Customer, PartnerId } from './types';

/** Per-partner product type catalogs — prefixes must match partner codes (PBZ, CRL, NYO, ZET, SMT). */
export const PARTNER_PRODUCT_CATALOGS: Record<PartnerId, readonly string[]> = {
  PAISABAZAAR: ['PBZ_SC_CC', 'PBZ_PL_FD', 'PBZ_HL_RS', 'PBZ_SA_TX'],
  CREDILIO: ['CRL_SC_FD', 'CRL_KC_RS', 'CRL_PL_CC', 'CRL_GL_FD'],
  NIYO: ['NYO_SC_TX', 'NYO_GL_CC', 'NYO_SA_FD', 'NYO_PL_RS'],
  ZET: ['ZET_SC_FD', 'ZET_KC_RS', 'ZET_PL_CC', 'ZET_HL_FD'],
  GENERAL: ['SMT_CIP', 'SMT_SA_FD', 'SMT_CC_RS', 'SMT_PL_TX'],
};

export function getPartnerCode(partnerId: PartnerId): string {
  return PARTNERS.find((p) => p.id === partnerId)?.code ?? partnerId;
}

export function getProductTypesForPartner(partnerId: PartnerId): string[] {
  return [...PARTNER_PRODUCT_CATALOGS[partnerId]];
}

/** Union of all partner catalogs — used for admin product filters. */
export function getAllProductTypes(): string[] {
  return PARTNERS.flatMap((p) => PARTNER_PRODUCT_CATALOGS[p.id]).sort((a, b) => a.localeCompare(b));
}

/** Cosmetic Customer ID shown in detail drawers: SBM_<PARTNERCODE>_6_<seq>. */
export function formatSbmCustomerId(customer: Pick<Customer, 'id' | 'partnerId'>): string {
  return `SBM_${getPartnerCode(customer.partnerId)}_6_${customer.id.replace('cust-', '')}`;
}
