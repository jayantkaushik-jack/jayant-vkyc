import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from '@vkyc/shared/features/auth/AuthContext';
import { PARTNERS } from '@vkyc/shared/data/types';
import type { Partner, PartnerId, PartnerUser } from '@vkyc/shared/data/types';
import { findSeededPartnerUserByEmail } from '@vkyc/shared/data/partnerUsers';

/**
 * Every data access in the partner app must be scoped to the logged-in partner.
 * This context resolves the partner from the authenticated email (matched against
 * the seeded partner-user directory) and exposes a fixed partnerId that selector
 * calls throughout the app pass in. No component may call an unscoped selector.
 */

interface PartnerScopeValue {
  partnerId: PartnerId;
  partner: Partner;
  user: PartnerUser;
}

const PartnerScopeContext = createContext<PartnerScopeValue | null>(null);

export function PartnerScopeProvider({ children }: { children: ReactNode }) {
  const { email } = useAuth();

  const value = useMemo<PartnerScopeValue | null>(() => {
    const user = findSeededPartnerUserByEmail(email);
    if (!user) return null;
    const partner = PARTNERS.find((p) => p.id === user.partnerId);
    if (!partner) return null;
    return { partnerId: user.partnerId, partner, user };
  }, [email]);

  if (!value) {
    // Should never happen: login validates the email against the seeded directory.
    return (
      <div className="min-h-screen flex items-center justify-center text-text-muted">
        Unable to resolve partner scope for this account.
      </div>
    );
  }

  return <PartnerScopeContext.Provider value={value}>{children}</PartnerScopeContext.Provider>;
}

export function usePartnerScope(): PartnerScopeValue {
  const ctx = useContext(PartnerScopeContext);
  if (!ctx) throw new Error('usePartnerScope must be used within PartnerScopeProvider');
  return ctx;
}
