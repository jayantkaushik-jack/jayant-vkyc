import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@vkyc/shared/features/auth/AuthContext';
import { LoginPage } from '@vkyc/shared/features/auth/LoginPage';
import { AuditorLayout } from '@auditor/components/layout/AuditorLayout';
import { PendingCasesPage } from '@auditor/features/auditor/pages/PendingCasesPage';
import { CaseReviewPage } from '@auditor/features/auditor/pages/CaseReviewPage';
import { AuditorAnalyticsPage } from '@auditor/features/auditor/pages/AuditorAnalyticsPage';
import { AuditorProfilePage } from '@auditor/features/auditor/pages/AuditorProfilePage';
import { AuditorKnowledgePage } from '@auditor/features/auditor/pages/AuditorKnowledgePage';
import { AuditorKnowledgeDocPage } from '@auditor/features/auditor/pages/AuditorKnowledgeDocPage';

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
      <Route path="/login" element={<LoginPage defaultRedirect="/cases" />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AuditorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/cases" replace />} />
        <Route path="cases" element={<PendingCasesPage />} />
        <Route path="cases/:id" element={<CaseReviewPage />} />
        <Route path="analytics" element={<AuditorAnalyticsPage />} />
        <Route path="profile" element={<AuditorProfilePage />} />
        <Route path="knowledge" element={<AuditorKnowledgePage />} />
        <Route path="knowledge/:docId" element={<AuditorKnowledgeDocPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
