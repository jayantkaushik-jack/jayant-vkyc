import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { CallSession, Customer } from '@vkyc/shared/data/types';
import { demoAgent, customers, agents, buildCallSession, buildIncomingCustomer } from '@vkyc/shared/data';
import { SeededRNG } from '@vkyc/shared/data/rng';
import { useCamera, type CameraStatus } from '@vkyc/shared/lib/useCamera';
import { useSessionStatus, type SessionSummary } from '@vkyc/shared/features/session/SessionStatusContext';
import { PERSONAS, type AmberPersona } from '@agent/features/agent/call/amber/personas';

export type { SessionSummary };

/** Every incoming call in this build is one of the Amber demo personas. */
function applyPersonaToCustomer(customer: Customer, persona: AmberPersona): Customer {
  // Last comma-separated part is always the state; everything before it is
  // the city/locality — handles both "Agra, Uttar Pradesh" and
  // "Bandra West, Mumbai, Maharashtra" shaped addresses.
  const parts = persona.declaredAddress.split(',').map((s) => s.trim());
  const state = parts[parts.length - 1] ?? customer.currentAddress.state;
  const city = parts.length > 1 ? parts.slice(0, -1).join(', ') : parts[0];
  return {
    ...customer,
    name: persona.name,
    currentAddress: { ...customer.currentAddress, city, state },
    incomeEmployment: customer.incomeEmployment
      ? {
          ...customer.incomeEmployment,
          occupation: persona.declaredOccupation,
          ...(persona.declaredAnnualIncome !== undefined
            ? { annualIncome: persona.declaredAnnualIncome, monthlyIncome: Math.round(persona.declaredAnnualIncome / 12) }
            : {}),
        }
      : customer.incomeEmployment,
  };
}

interface AgentContextValue {
  agent: typeof demoAgent;
  status: ReturnType<typeof useSessionStatus>['status'];
  setStatus: ReturnType<typeof useSessionStatus>['setStatus'];
  loginAt: Date;
  breakStartedAt: number | null;
  sessionSummary: SessionSummary;
  currentCustomer: Customer | null;
  callSession: CallSession | null;
  incomingSince: number | null;
  prepareIncomingCall: () => void;
  acceptCall: () => string;
  clearCall: () => void;
  rejectCall: () => void;
  getLoggedInSec: () => number;
  getBreakSec: () => number;
  cameraStream: MediaStream | null;
  cameraStatus: CameraStatus;
  startCamera: () => Promise<MediaStream | null>;
  stopCamera: () => void;
  demoPersonaId: AmberPersona['id'];
  setDemoPersonaId: (id: AmberPersona['id']) => void;
  /** Queue table row click (round 3, item A3) — loads that persona into the Accept/Reject card immediately. */
  selectQueuedPersona: (id: AmberPersona['id']) => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);
const sessionRng = new SeededRNG(123);

export function AgentProvider({ children }: { children: ReactNode }) {
  const {
    status,
    setStatus: setSessionStatus,
    loginAt,
    breakStartedAt,
    sessionSummary,
    getLoggedInSec,
    getBreakSec,
  } = useSessionStatus();

  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [incomingSince, setIncomingSince] = useState<number | null>(null);
  const [demoPersonaId, setDemoPersonaId] = useState<AmberPersona['id']>('ramesh');
  const callSchedulerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { stream: cameraStream, status: cameraStatus, start: startCamera, stop: stopCamera } = useCamera();

  // The Device Check modal (home page) starts the camera itself for its live
  // preview, but "Go Online" is also reachable from the header status
  // dropdown and the end-of-day summary card, both of which skip that modal
  // entirely. Starting the camera here too — on every path to 'online' — is
  // the single point that guarantees the call screen has a live feed
  // regardless of which control the agent used. startCamera() is a no-op if
  // a stream is already active, so this never triggers a second permission
  // prompt or a duplicate getUserMedia call. Symmetrically, stop it on any
  // transition away from 'online' (offline or on break) — otherwise the
  // camera light stays on indefinitely once started, since nothing else in
  // the app ever calls stop() during a normal session.
  const setStatus = useCallback(
    (next: Parameters<typeof setSessionStatus>[0]) => {
      if (next === 'online') startCamera();
      else stopCamera();
      setSessionStatus(next);
    },
    [setSessionStatus, startCamera, stopCamera],
  );

  const prepareIncomingCallForPersona = useCallback((personaId: AmberPersona['id']) => {
    const rawCustomer = buildIncomingCustomer(sessionRng, customers, agents);
    const customer = applyPersonaToCustomer(rawCustomer, PERSONAS[personaId]);
    setCurrentCustomer(customer);
    setCallSession(buildCallSession(sessionRng, customer));
    setIncomingSince(Date.now());
  }, []);

  const prepareIncomingCall = useCallback(() => {
    prepareIncomingCallForPersona(demoPersonaId);
  }, [demoPersonaId, prepareIncomingCallForPersona]);

  // Queue table row click — takes an explicit id rather than relying on
  // demoPersonaId's committed state, since setDemoPersonaId + an immediate
  // prepareIncomingCall in the same handler would otherwise race against
  // React's async state update and load the previous persona.
  const selectQueuedPersona = useCallback((personaId: AmberPersona['id']) => {
    setDemoPersonaId(personaId);
    prepareIncomingCallForPersona(personaId);
  }, [prepareIncomingCallForPersona]);

  useEffect(() => {
    if (callSchedulerRef.current) {
      clearTimeout(callSchedulerRef.current);
      callSchedulerRef.current = null;
    }

    if (status !== 'online' || currentCustomer || callSession) return;

    const delay = 4000 + Math.random() * 6000;
    callSchedulerRef.current = setTimeout(() => {
      prepareIncomingCall();
      callSchedulerRef.current = null;
    }, delay);

    return () => {
      if (callSchedulerRef.current) {
        clearTimeout(callSchedulerRef.current);
        callSchedulerRef.current = null;
      }
    };
  }, [status, currentCustomer, callSession, prepareIncomingCall]);

  const acceptCall = useCallback(() => `call-live-${Date.now()}`, []);

  const clearCall = useCallback(() => {
    setCurrentCustomer(null);
    setCallSession(null);
    setIncomingSince(null);
  }, []);

  const rejectCall = useCallback(() => {
    clearCall();
  }, [clearCall]);

  return (
    <AgentContext.Provider
      value={{
        agent: demoAgent,
        status,
        setStatus,
        loginAt,
        breakStartedAt,
        sessionSummary,
        currentCustomer,
        callSession,
        incomingSince,
        prepareIncomingCall,
        acceptCall,
        clearCall,
        rejectCall,
        getLoggedInSec,
        getBreakSec,
        cameraStream,
        cameraStatus,
        startCamera,
        stopCamera,
        demoPersonaId,
        setDemoPersonaId,
        selectQueuedPersona,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgent must be used within AgentProvider');
  return ctx;
}
