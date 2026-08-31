import { Outlet } from 'react-router-dom';
import { AdminHeader } from '@admin/components/layout/AdminHeader';
import { AdminSidebar, useAdminSidebarOffset } from '@admin/components/layout/AdminSidebar';
import { DesktopOverlay } from '@vkyc/shared/components/layout/DesktopOverlay';
import { cn } from '@vkyc/shared/lib/cn';
import { OpsAssistantProvider } from '@admin/features/admin/ops/OpsAssistantContext';
import { OpsAssistant } from '@admin/features/admin/ops/OpsAssistantPanel';

export function AdminLayout() {
  const offset = useAdminSidebarOffset();
  return (
    <OpsAssistantProvider>
      <div className="min-h-screen grid-paper">
        <DesktopOverlay />
        <AdminHeader />
        <AdminSidebar />
        <main className={cn(offset)}>
          <Outlet />
        </main>
        <OpsAssistant />
      </div>
    </OpsAssistantProvider>
  );
}
