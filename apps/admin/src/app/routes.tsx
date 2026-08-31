import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AdminLayout } from '@admin/components/layout/AdminLayout';
import { useAuth } from '@vkyc/shared/features/auth/AuthContext';
import { LoginPage } from '@vkyc/shared/features/auth/LoginPage';
import { AdminDashboardPage } from '@admin/features/admin/pages/AdminDashboardPage';
import { CustomersPage } from '@admin/features/admin/pages/CustomersPage';
import { PartnerAnalyticsPage } from '@admin/features/admin/pages/PartnerAnalyticsPage';
import { QualityPage } from '@admin/features/admin/pages/QualityPage';
import { ProductivityPage } from '@admin/features/admin/pages/ProductivityPage';
import { ProductivityAgentDetailPage } from '@admin/features/admin/pages/ProductivityAgentDetailPage';
import { UsersPage } from '@admin/features/admin/pages/UsersPage';
import { AgentProfilePage } from '@admin/features/admin/pages/AgentProfilePage';
import { ConfigurePage } from '@admin/features/admin/pages/ConfigurePage';
import { ReportsPage } from '@admin/features/admin/pages/ReportsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage defaultRedirect="/" />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="live-ops" element={<Navigate to="/" replace />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="partners" element={<PartnerAnalyticsPage />} />
        <Route path="quality" element={<QualityPage />} />
        <Route path="workforce" element={<Navigate to="/productivity" replace />} />
        <Route path="productivity" element={<ProductivityPage />} />
        <Route path="productivity/:agentId" element={<ProductivityAgentDetailPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<AgentProfilePage />} />
        <Route path="configure" element={<ConfigurePage />} />
        <Route path="configuration" element={<Navigate to="/configure" replace />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/generate/:reportType" element={<Navigate to="/reports" replace />} />
        <Route path="reports/generate" element={<Navigate to="/reports" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
