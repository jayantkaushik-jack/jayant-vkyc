import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, GlobalStyle } from '@cashfree-intl/cashmere';
import { AuthProvider } from '@vkyc/shared/features/auth/AuthContext';
import { SessionStatusProvider } from '@vkyc/shared/features/session/SessionStatusContext';
import { AgentProvider } from '@agent/features/agent/AgentContext';
import { AppRoutes } from '@agent/app/routes';
import './index.css';
import './styles/cf-design-system.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light">
      <GlobalStyle />
      <BrowserRouter>
        <AuthProvider>
          <SessionStatusProvider>
            <AgentProvider>
              <AppRoutes />
            </AgentProvider>
          </SessionStatusProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
