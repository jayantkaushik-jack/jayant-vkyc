import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface AuthContextValue {
  isAuthenticated: boolean;
  email: string;
  login: (email: string) => void;
  verifyOtp: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');

  const login = useCallback((em: string) => {
    setEmail(em);
  }, []);

  const verifyOtp = useCallback(() => {
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setEmail('');
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, email, login, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
