import { Outlet } from 'react-router-dom';
import { DesktopOverlay } from '@vkyc/shared/components/layout/DesktopOverlay';
import { PartnerHeader } from '@partner/components/layout/PartnerHeader';
import { PartnerSidebar } from '@partner/components/layout/PartnerSidebar';

export function PartnerLayout() {
  return (
    <div className="min-h-screen grid-paper">
      <DesktopOverlay />
      <PartnerHeader />
      <PartnerSidebar />
      <main className="pl-[232px]">
        <Outlet />
      </main>
    </div>
  );
}
