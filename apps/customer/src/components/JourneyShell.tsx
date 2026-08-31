import { useCallback, useRef, type ReactNode } from 'react';
import { CashfreeLogo } from '@vkyc/shared/components/layout/CashfreeLogo';
import { PhoneFrame } from '@customer/components/PhoneFrame';
import { ActivityStrip } from '@customer/components/ActivityStrip';
import { DemoPanel } from '@customer/components/DemoPanel';
import { useCustomerJourney } from '@customer/features/customer/CustomerJourneyContext';

export function JourneyShell({ children }: { children: ReactNode }) {
  const { toggleDemo, phase } = useCustomerJourney();
  const isSmtReturn = phase === 'partner_return';
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleLogoTap = useCallback(() => {
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 600);
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      toggleDemo();
    }
  }, [toggleDemo]);

  return (
    <div className="min-h-screen bg-bg md:flex md:items-center md:justify-center md:gap-6 md:p-6">
      <PhoneFrame>
        {!isSmtReturn && (
          <>
            <header className="shrink-0 border-b border-border bg-surface px-4 py-3">
              <button type="button" onClick={handleLogoTap} className="flex w-full items-center justify-between">
                <CashfreeLogo />
                <span className="text-sm font-semibold text-text">Video KYC</span>
              </button>
            </header>
            <div className="shrink-0 bg-primary-soft px-4 py-1.5 text-center text-[11px] font-medium text-primary">
              Please do not refresh or close the tab
            </div>
          </>
        )}
        <main className={`relative flex-1 overflow-y-auto overflow-x-hidden ${isSmtReturn ? 'flex flex-col' : ''}`}>
          {children}
        </main>
        {!isSmtReturn && (
          <footer className="shrink-0 border-t border-border px-4 py-2 text-center text-[10px] text-text-muted">
            Powered by Cashfree Payments
          </footer>
        )}
      </PhoneFrame>
      <DemoPanel />
      <ActivityStrip />
    </div>
  );
}
