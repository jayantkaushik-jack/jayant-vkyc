import { CashfreeLogo } from '@vkyc/shared/components/layout/CashfreeLogo';
import { Avatar } from '@vkyc/shared/components/ui/Avatar';
import { usePartnerScope } from '@partner/features/partner/PartnerScopeContext';

export function PartnerHeader() {
  const { partner, user } = usePartnerScope();
  const firstName = user.name.split(' ')[0];
  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-border">
      <div className="flex items-center justify-between h-14 px-6">
        <div className="flex items-center gap-4">
          <CashfreeLogo />
          <span className="text-sm font-semibold text-text">Hi, {firstName}</span>
          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-primary-soft text-primary">
            {partner.name}
          </span>
        </div>
        <Avatar person={{ id: user.id, name: user.name }} size="xs" ring="primary" title={user.name} />
      </div>
    </header>
  );
}
