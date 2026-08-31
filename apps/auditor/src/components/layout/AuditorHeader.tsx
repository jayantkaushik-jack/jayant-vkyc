import { CashfreeLogo } from '@vkyc/shared/components/layout/CashfreeLogo';
import { SessionStatusHeaderCluster } from '@vkyc/shared/components/session-status/SessionStatusHeaderCluster';
import { useSessionStatus } from '@vkyc/shared/features/session/SessionStatusContext';
import { SEED_AUDITOR } from '@vkyc/shared/data/auditorStore';

export function AuditorHeader() {
  const { status, setStatus, getLoggedInSec, getBreakSec } = useSessionStatus();
  const firstName = SEED_AUDITOR.name.split(' ')[0];

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-border">
      <div className="flex items-center justify-between h-14 px-6">
        <div className="flex items-center gap-4">
          <CashfreeLogo />
          <span className="text-sm font-semibold text-text">Hi, {firstName}</span>
          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-primary-soft text-primary">
            Auditor
          </span>
        </div>
        <SessionStatusHeaderCluster
          person={{ id: SEED_AUDITOR.id, name: SEED_AUDITOR.name }}
          status={status}
          setStatus={setStatus}
          getLoggedInSec={getLoggedInSec}
          getBreakSec={getBreakSec}
        />
      </div>
    </header>
  );
}
