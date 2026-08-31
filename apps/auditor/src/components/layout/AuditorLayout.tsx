import { Outlet } from 'react-router-dom';
import { AuditorHeader } from '@auditor/components/layout/AuditorHeader';
import { AuditorSidebar } from '@auditor/components/layout/AuditorSidebar';
import { DesktopOverlay } from '@vkyc/shared/components/layout/DesktopOverlay';

export function AuditorLayout() {
  return (
    <div className="min-h-screen grid-paper">
      <DesktopOverlay />
      <AuditorHeader />
      <AuditorSidebar />
      <main className="pl-[232px]">
        <Outlet />
      </main>
    </div>
  );
}
