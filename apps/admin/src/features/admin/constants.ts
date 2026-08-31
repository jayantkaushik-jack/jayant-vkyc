import type { PartnerId } from '@vkyc/shared/data/types';

export const ADMIN_NAME = 'Priya Nair';

export const PARTNER_CHART_COLORS: Record<PartnerId, string> = {
  PAISABAZAAR: '#6434D6',
  CREDILIO: '#22A06B',
  NIYO: '#F5A623',
  ZET: '#E5484D',
  GENERAL: '#6F6A7D',
};

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/customers', label: 'Customers' },
  { to: '/partners', label: 'Partner Analytics' },
  { to: '/quality', label: 'Rejection & Failure Reasons' },
  { to: '/productivity', label: 'Productivity' },
  { to: '/users', label: 'Users' },
  { to: '/configure', label: 'Configuration' },
  { to: '/reports', label: 'Reports' },
] as const;
