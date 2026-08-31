import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AgentLayout } from '@agent/components/layout/AgentLayout';
import { useAuth } from '@vkyc/shared/features/auth/AuthContext';
import { LoginPage } from '@agent/features/auth/LoginPage';
import { AgentHomePage } from '@agent/features/agent/AgentHomePage';
import { QueuePage } from '@agent/features/agent/QueuePage';
import { CallRoomPage } from '@agent/features/agent/CallRoomPage';
import { PerformancePage } from '@agent/features/agent/PerformancePage';
import { ProfilePage } from '@agent/features/agent/ProfilePage';
import { KnowledgePage } from '@agent/features/agent/KnowledgePage';
import { KnowledgeDocPage } from '@agent/features/agent/KnowledgeDocPage';

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
      <Route path="/login" element={<LoginPage defaultRedirect="/agent" />} />
      <Route
        path="/agent"
        element={
          <ProtectedRoute>
            <AgentLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AgentHomePage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="knowledge/:docId" element={<KnowledgeDocPage />} />
        <Route path="queue" element={<QueuePage />} />
        <Route path="call/:id" element={<CallRoomPage />} />
        <Route path="performance" element={<PerformancePage />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
