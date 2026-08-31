import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@vkyc/shared/features/auth/AuthContext';
import { LoginPage } from '@vkyc/shared/features/auth/LoginPage';
import { findSeededPartnerUserByEmail, PARTNER_DEMO_ACCOUNTS } from '@vkyc/shared/data/partnerUsers';
import { PartnerScopeProvider } from '@partner/features/partner/PartnerScopeContext';
import { PartnerLayout } from '@partner/components/layout/PartnerLayout';
import { PartnerDashboardPage } from '@partner/features/partner/pages/PartnerDashboardPage';
import { PartnerCustomersPage } from '@partner/features/partner/pages/PartnerCustomersPage';
import { PartnerReasonsPage } from '@partner/features/partner/pages/PartnerReasonsPage';
import { PartnerReportsPage } from '@partner/features/partner/pages/PartnerReportsPage';

function validatePartnerEmail(email: string): string | null {
  return findSeededPartnerUserByEmail(email)
    ? null
    : 'This email is not registered with any partner. Use a demo account below.';
}

const demoAccounts = PARTNER_DEMO_ACCOUNTS.map((a) => ({ email: a.email, label: a.partnerName }));

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
      <Route
        path="/login"
        element={
          <LoginPage
            defaultRedirect="/dashboard"
            validateEmail={validatePartnerEmail}
            demoAccounts={demoAccounts}
          />
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <PartnerScopeProvider>
              <PartnerLayout />
            </PartnerScopeProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<PartnerDashboardPage />} />
        <Route path="customers" element={<PartnerCustomersPage />} />
        <Route path="reasons" element={<PartnerReasonsPage />} />
        <Route path="reports" element={<PartnerReportsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
