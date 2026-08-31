import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { AgentStatus } from '../../data/types';

export interface SessionSummary {
  wentOnlineAt: Date | null;
  wentOfflineAt: Date | null;
  totalActiveSec: number;
  totalBreakSec: number;
  hasBeenOnlineToday: boolean;
}

export interface SessionStatusValue {
  status: AgentStatus;
  setStatus: (s: AgentStatus) => void;
  loginAt: Date;
  breakStartedAt: number | null;
  sessionSummary: SessionSummary;
  getLoggedInSec: () => number;
  getBreakSec: () => number;
}

const SessionStatusContext = createContext<SessionStatusValue | null>(null);

/** Shared online / on-break / offline session accounting used by agent and auditor apps. */
export function SessionStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatusRaw] = useState<AgentStatus>('offline');
  const [loginAt] = useState(() => new Date());
  const [accumulatedOnlineSec, setAccumulatedOnlineSec] = useState(0);
  const [accumulatedBreakSec, setAccumulatedBreakSec] = useState(0);
  const [breakStartedAt, setBreakStartedAt] = useState<number | null>(null);
  const breakStartedRef = useRef<number | null>(null);
  const onlineStartedRef = useRef<number | null>(null);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary>({
    wentOnlineAt: null,
    wentOfflineAt: null,
    totalActiveSec: 0,
    totalBreakSec: 0,
    hasBeenOnlineToday: false,
  });

  const setStatus = useCallback((next: AgentStatus) => {
    setStatusRaw((prev) => {
      if (prev === 'on_break' && breakStartedRef.current) {
        const elapsed = Math.floor((Date.now() - breakStartedRef.current) / 1000);
        setAccumulatedBreakSec((acc) => acc + elapsed);
        setSessionSummary((s) => ({ ...s, totalBreakSec: s.totalBreakSec + elapsed }));
        breakStartedRef.current = null;
        setBreakStartedAt(null);
      }
      if (next === 'on_break') {
        const now = Date.now();
        breakStartedRef.current = now;
        setBreakStartedAt(now);
      }
      if (prev === 'online' && next !== 'online') {
        if (onlineStartedRef.current) {
          const elapsed = Math.floor((Date.now() - onlineStartedRef.current) / 1000);
          setSessionSummary((s) => ({
            ...s,
            totalActiveSec: s.totalActiveSec + elapsed,
            wentOfflineAt: next === 'offline' ? new Date() : s.wentOfflineAt,
          }));
          onlineStartedRef.current = null;
        }
      }
      if (next === 'online' && prev !== 'online') {
        onlineStartedRef.current = Date.now();
        setSessionSummary((s) => ({
          ...s,
          wentOnlineAt: s.wentOnlineAt ?? new Date(),
          hasBeenOnlineToday: true,
          wentOfflineAt: null,
        }));
      }
      if (next === 'offline' && prev === 'online') {
        setSessionSummary((s) => ({ ...s, wentOfflineAt: new Date() }));
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (status !== 'online') return;
    const id = setInterval(() => setAccumulatedOnlineSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  const getLoggedInSec = useCallback(() => accumulatedOnlineSec, [accumulatedOnlineSec]);

  const getBreakSec = useCallback(() => {
    let total = accumulatedBreakSec;
    if (status === 'on_break' && breakStartedRef.current) {
      total += Math.floor((Date.now() - breakStartedRef.current) / 1000);
    }
    return total;
  }, [accumulatedBreakSec, status]);

  return (
    <SessionStatusContext.Provider
      value={{
        status,
        setStatus,
        loginAt,
        breakStartedAt,
        sessionSummary,
        getLoggedInSec,
        getBreakSec,
      }}
    >
      {children}
    </SessionStatusContext.Provider>
  );
}

export function useSessionStatus(): SessionStatusValue {
  const ctx = useContext(SessionStatusContext);
  if (!ctx) throw new Error('useSessionStatus must be used within SessionStatusProvider');
  return ctx;
}
