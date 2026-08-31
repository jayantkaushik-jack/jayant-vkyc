import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import {
  DEMO_NEAR_EXPIRY_ELAPSED_MS,
  IN_CALL_STEPS,
  type ActivityEvent,
  type FailureKind,
  type InCallStep,
  type JourneyLanguage,
  type JourneyPhase,
  type MockApplication,
  mockApplicationFromToken,
} from './journeyConfig';
import { getAdminConfig } from '@vkyc/shared/data/sessionStore';
import type { GeoFenceResult } from '@vkyc/shared/data/types';
import { isEkycWindowLapsed, type LatLng } from '@vkyc/shared/lib/geoFence';

interface JourneyState {
  token: string;
  application: MockApplication;
  phase: JourneyPhase;
  language: JourneyLanguage;
  activity: ActivityEvent[];
  demoOpen: boolean;
  activityOpen: boolean;
  cameraSimulated: boolean;
  permissionsGranted: boolean;
  consentAt: string | null;
  precheckIndex: number;
  incallStepIndex: number;
  incallScriptIndex: number;
  reconnectResumeStep: number;
  reconnectResumeScript: number;
  csatRating: number | null;
  csatComment: string;
  reattemptMode: boolean;
  steppedAway: boolean;
  livenessCode: string;
  customerName: string;
  liveLocation: LatLng | null;
  geoFenceResult: GeoFenceResult | null;
  forceCameraQualityFail: boolean;
  forceMicFail: boolean;
  /** Demo: treat clock as outside configured service hours. */
  simulateOutsideHours: boolean;
  bookedSlotLabel: string | null;
}

type Action =
  | { type: 'SET_PHASE'; phase: JourneyPhase }
  | { type: 'SET_LANGUAGE'; language: JourneyLanguage }
  | { type: 'LOG'; label: string }
  | { type: 'TOGGLE_DEMO' }
  | { type: 'TOGGLE_ACTIVITY' }
  | { type: 'SET_CAMERA_SIMULATED'; value: boolean }
  | { type: 'SET_PERMISSIONS'; granted: boolean }
  | { type: 'SET_CONSENT_AT'; at: string }
  | { type: 'SET_PRECHECK_INDEX'; index: number }
  | { type: 'SET_INCALL_PROGRESS'; step: number; script: number }
  | { type: 'SAVE_RECONNECT'; step: number; script: number }
  | { type: 'SET_CSAT'; rating: number | null; comment?: string }
  | { type: 'SET_REATTEMPT'; value: boolean }
  | { type: 'SET_STEPPED_AWAY'; value: boolean }
  | { type: 'SET_LIVE_LOCATION'; location: LatLng | null }
  | { type: 'SET_GEO_FENCE'; result: GeoFenceResult | null }
  | { type: 'SET_FORCE_CAMERA_FAIL'; value: boolean }
  | { type: 'SET_FORCE_MIC_FAIL'; value: boolean }
  | { type: 'SET_GENERATED_AT'; generatedAtMs: number }
  | { type: 'SET_SIMULATE_OUTSIDE_HOURS'; value: boolean }
  | { type: 'SET_BOOKED_SLOT'; label: string | null }
  | { type: 'RESET'; token: string };

function initialState(token: string): JourneyState {
  return {
    token,
    application: mockApplicationFromToken(token),
    phase: 'landing',
    language: 'en',
    activity: [{ id: '0', label: 'Opened journey link', at: new Date().toISOString() }],
    demoOpen: false,
    activityOpen: false,
    cameraSimulated: false,
    permissionsGranted: false,
    consentAt: null,
    precheckIndex: 0,
    incallStepIndex: 0,
    incallScriptIndex: 0,
    reconnectResumeStep: 0,
    reconnectResumeScript: 0,
    csatRating: null,
    csatComment: '',
    reattemptMode: false,
    steppedAway: false,
    livenessCode: String(Math.floor(100000 + Math.random() * 900000)),
    customerName: 'Rahul Mehta',
    liveLocation: null,
    geoFenceResult: null,
    forceCameraQualityFail: false,
    forceMicFail: false,
    simulateOutsideHours: false,
    bookedSlotLabel: null,
  };
}

function reducer(state: JourneyState, action: Action): JourneyState {
  switch (action.type) {
    case 'SET_PHASE':
      if (state.phase === action.phase) return state;
      return { ...state, phase: action.phase };
    case 'SET_LANGUAGE':
      if (state.language === action.language) return state;
      return { ...state, language: action.language };
    case 'LOG':
      return {
        ...state,
        activity: [
          ...state.activity,
          { id: `${Date.now()}`, label: action.label, at: new Date().toISOString() },
        ],
      };
    case 'TOGGLE_DEMO':
      return { ...state, demoOpen: !state.demoOpen };
    case 'TOGGLE_ACTIVITY':
      return { ...state, activityOpen: !state.activityOpen };
    case 'SET_CAMERA_SIMULATED':
      if (state.cameraSimulated === action.value) return state;
      return { ...state, cameraSimulated: action.value };
    case 'SET_PERMISSIONS':
      if (state.permissionsGranted === action.granted) return state;
      return { ...state, permissionsGranted: action.granted };
    case 'SET_CONSENT_AT':
      return { ...state, consentAt: action.at };
    case 'SET_PRECHECK_INDEX':
      if (state.precheckIndex === action.index) return state;
      return { ...state, precheckIndex: action.index };
    case 'SET_INCALL_PROGRESS':
      if (state.incallStepIndex === action.step && state.incallScriptIndex === action.script) {
        return state;
      }
      return {
        ...state,
        incallStepIndex: action.step,
        incallScriptIndex: action.script,
      };
    case 'SAVE_RECONNECT':
      if (
        state.reconnectResumeStep === action.step &&
        state.reconnectResumeScript === action.script
      ) {
        return state;
      }
      return {
        ...state,
        reconnectResumeStep: action.step,
        reconnectResumeScript: action.script,
      };
    case 'SET_CSAT': {
      const comment = action.comment ?? state.csatComment;
      if (state.csatRating === action.rating && state.csatComment === comment) return state;
      return {
        ...state,
        csatRating: action.rating,
        csatComment: comment,
      };
    }
    case 'SET_REATTEMPT':
      if (state.reattemptMode === action.value) return state;
      return { ...state, reattemptMode: action.value };
    case 'SET_STEPPED_AWAY':
      if (state.steppedAway === action.value) return state;
      return { ...state, steppedAway: action.value };
    case 'SET_LIVE_LOCATION': {
      const prev = state.liveLocation;
      const next = action.location;
      if (
        prev === next ||
        (prev != null && next != null && prev.lat === next.lat && prev.lng === next.lng)
      ) {
        return state;
      }
      return { ...state, liveLocation: next };
    }
    case 'SET_GEO_FENCE': {
      if (action.result == null && state.geoFenceResult == null) return state;
      if (
        action.result != null &&
        state.geoFenceResult != null &&
        state.geoFenceResult.outcome === action.result.outcome &&
        state.geoFenceResult.message === action.result.message &&
        state.geoFenceResult.livePin === action.result.livePin
      ) {
        return state;
      }
      return { ...state, geoFenceResult: action.result };
    }
    case 'SET_SIMULATE_OUTSIDE_HOURS':
      if (state.simulateOutsideHours === action.value) return state;
      return { ...state, simulateOutsideHours: action.value };
    case 'SET_BOOKED_SLOT':
      if (state.bookedSlotLabel === action.label) return state;
      return { ...state, bookedSlotLabel: action.label };
    case 'SET_FORCE_CAMERA_FAIL':
      if (state.forceCameraQualityFail === action.value) return state;
      return { ...state, forceCameraQualityFail: action.value };
    case 'SET_FORCE_MIC_FAIL':
      if (state.forceMicFail === action.value) return state;
      return { ...state, forceMicFail: action.value };
    case 'SET_GENERATED_AT': {
      if (state.application.generatedAtMs === action.generatedAtMs) return state;
      return {
        ...state,
        application: {
          ...state.application,
          generatedAtMs: action.generatedAtMs,
          validityEndsAt: action.generatedAtMs + 72 * 60 * 60 * 1000,
        },
      };
    }
    case 'RESET':
      return initialState(action.token);
    default:
      return state;
  }
}

interface JourneyContextValue extends JourneyState {
  setPhase: (phase: JourneyPhase) => void;
  setLanguage: (language: JourneyLanguage) => void;
  logEvent: (label: string) => void;
  toggleDemo: () => void;
  toggleActivity: () => void;
  setCameraSimulated: (value: boolean) => void;
  setPermissionsGranted: (granted: boolean) => void;
  acceptConsent: () => void;
  setPrecheckIndex: (index: number) => void;
  setIncallProgress: (step: number, script: number) => void;
  setCsat: (rating: number | null, comment?: string) => void;
  triggerFailure: (kind: FailureKind) => void;
  triggerReconnect: () => void;
  resumeFromReconnect: () => void;
  triggerSteppedAway: () => void;
  dismissSteppedAway: () => void;
  setReattemptMode: (value: boolean) => void;
  restartJourney: () => void;
  applyGeoFenceResult: (result: GeoFenceResult, location: LatLng) => void;
  clearLocationCapture: () => void;
  setForceCameraQualityFail: (value: boolean) => void;
  setForceMicFail: (value: boolean) => void;
  simulateNearExpiry: () => void;
  checkEkycWindow: () => boolean;
  setSimulateOutsideHours: (value: boolean) => void;
  bookSlot: (label: string) => void;
  currentInCallStep: InCallStep;
}

const JourneyContext = createContext<JourneyContextValue | null>(null);

const FAILURE_PHASE: Record<FailureKind, JourneyPhase> = {
  vpn: 'failure_vpn',
  outside_india: 'failure_outside_india',
  ekyc_expired: 'failure_ekyc_expired',
  link_expired: 'failure_link_expired',
  blacklisted: 'failure_blacklisted',
};

export function CustomerJourneyProvider({
  token,
  demoDefaultOpen,
  children,
}: {
  token: string;
  demoDefaultOpen: boolean;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, token, (t) => ({
    ...initialState(t),
    demoOpen: demoDefaultOpen,
  }));

  const stateRef = useRef(state);
  stateRef.current = state;

  const setPhase = useCallback((phase: JourneyPhase) => {
    dispatch({ type: 'SET_PHASE', phase });
  }, []);

  const setLanguage = useCallback((language: JourneyLanguage) => {
    dispatch({ type: 'SET_LANGUAGE', language });
  }, []);

  const logEvent = useCallback((label: string) => {
    dispatch({ type: 'LOG', label });
  }, []);

  const toggleDemo = useCallback(() => {
    dispatch({ type: 'TOGGLE_DEMO' });
  }, []);

  const toggleActivity = useCallback(() => {
    dispatch({ type: 'TOGGLE_ACTIVITY' });
  }, []);

  const setCameraSimulated = useCallback((value: boolean) => {
    dispatch({ type: 'SET_CAMERA_SIMULATED', value });
  }, []);

  const setPermissionsGranted = useCallback((granted: boolean) => {
    dispatch({ type: 'SET_PERMISSIONS', granted });
  }, []);

  const acceptConsent = useCallback(() => {
    dispatch({ type: 'SET_CONSENT_AT', at: new Date().toISOString() });
    dispatch({ type: 'SET_PHASE', phase: 'permissions' });
    dispatch({ type: 'LOG', label: 'Accepted Terms & Conditions' });
  }, []);

  const setPrecheckIndex = useCallback((index: number) => {
    dispatch({ type: 'SET_PRECHECK_INDEX', index });
  }, []);

  const setIncallProgress = useCallback((step: number, script: number) => {
    dispatch({ type: 'SET_INCALL_PROGRESS', step, script });
  }, []);

  const setCsat = useCallback((rating: number | null, comment?: string) => {
    dispatch({ type: 'SET_CSAT', rating, comment });
  }, []);

  const triggerFailure = useCallback((kind: FailureKind) => {
    dispatch({ type: 'SET_PHASE', phase: FAILURE_PHASE[kind] });
    dispatch({ type: 'LOG', label: `Pre-call check failed: ${kind.replace(/_/g, ' ')}` });
  }, []);

  const triggerReconnect = useCallback(() => {
    const { incallStepIndex, incallScriptIndex } = stateRef.current;
    dispatch({ type: 'SAVE_RECONNECT', step: incallStepIndex, script: incallScriptIndex });
    dispatch({ type: 'SET_PHASE', phase: 'reconnecting' });
    dispatch({ type: 'LOG', label: 'Connection interrupted — reconnecting' });
  }, []);

  const resumeFromReconnect = useCallback(() => {
    const { reconnectResumeStep, reconnectResumeScript } = stateRef.current;
    dispatch({ type: 'SET_INCALL_PROGRESS', step: reconnectResumeStep, script: reconnectResumeScript });
    dispatch({ type: 'SET_PHASE', phase: 'incall' });
    dispatch({ type: 'LOG', label: 'Reconnected — resuming call' });
  }, []);

  const triggerSteppedAway = useCallback(() => {
    dispatch({ type: 'SET_STEPPED_AWAY', value: true });
    dispatch({ type: 'SET_PHASE', phase: 'stepped_away' });
    dispatch({ type: 'LOG', label: 'Customer stepped away notice shown' });
  }, []);

  const dismissSteppedAway = useCallback(() => {
    dispatch({ type: 'SET_STEPPED_AWAY', value: false });
    dispatch({ type: 'SET_PHASE', phase: 'incall' });
  }, []);

  const setReattemptMode = useCallback((value: boolean) => {
    dispatch({ type: 'SET_REATTEMPT', value });
  }, []);

  const restartJourney = useCallback(() => {
    dispatch({ type: 'RESET', token: stateRef.current.token });
  }, []);

  const applyGeoFenceResult = useCallback((result: GeoFenceResult, location: LatLng) => {
    const rejected = result.outcome === 'rejected';
    dispatch({ type: 'SET_LIVE_LOCATION', location });
    dispatch({ type: 'SET_GEO_FENCE', result });
    if (rejected) {
      dispatch({ type: 'LOG', label: 'CUSTOMER_RESTRICTED — geo-fence rejected at gate' });
      dispatch({ type: 'SET_PHASE', phase: 'location_rejected' });
    } else {
      dispatch({ type: 'LOG', label: `Location captured — ${result.message}` });
    }
  }, []);

  const clearLocationCapture = useCallback(() => {
    dispatch({ type: 'SET_LIVE_LOCATION', location: null });
    dispatch({ type: 'SET_GEO_FENCE', result: null });
  }, []);

  const setSimulateOutsideHours = useCallback((value: boolean) => {
    dispatch({ type: 'SET_SIMULATE_OUTSIDE_HOURS', value });
  }, []);

  const bookSlot = useCallback((label: string) => {
    dispatch({ type: 'SET_BOOKED_SLOT', label });
    dispatch({ type: 'LOG', label: `Booked slot: ${label}` });
  }, []);

  const setForceCameraQualityFail = useCallback((value: boolean) => {
    dispatch({ type: 'SET_FORCE_CAMERA_FAIL', value });
  }, []);

  const setForceMicFail = useCallback((value: boolean) => {
    dispatch({ type: 'SET_FORCE_MIC_FAIL', value });
  }, []);

  const checkEkycWindow = useCallback((): boolean => {
    const { application } = stateRef.current;
    const bufferMin = getAdminConfig().thresholds.ekycValidityBufferMin;
    if (isEkycWindowLapsed(application.generatedAtMs, Date.now(), bufferMin)) {
      dispatch({ type: 'SET_PHASE', phase: 'failure_ekyc_expired' });
      dispatch({
        type: 'LOG',
        label: 'Aadhaar verification window lapsed (71h50m buffer)',
      });
      return true;
    }
    return false;
  }, []);

  const simulateNearExpiry = useCallback(() => {
    const generatedAtMs = Date.now() - DEMO_NEAR_EXPIRY_ELAPSED_MS;
    dispatch({ type: 'SET_GENERATED_AT', generatedAtMs });
    dispatch({ type: 'LOG', label: 'Demo: simulated near-expiry (71h55m elapsed)' });
    const bufferMin = getAdminConfig().thresholds.ekycValidityBufferMin;
    if (isEkycWindowLapsed(generatedAtMs, Date.now(), bufferMin)) {
      dispatch({ type: 'SET_PHASE', phase: 'failure_ekyc_expired' });
    }
  }, []);

  // Journey entry: hard eKYC window check
  useEffect(() => {
    checkEkycWindow();
  }, [checkEkycWindow]);

  const actions = useMemo(
    () => ({
      setPhase,
      setLanguage,
      logEvent,
      toggleDemo,
      toggleActivity,
      setCameraSimulated,
      setPermissionsGranted,
      acceptConsent,
      setPrecheckIndex,
      setIncallProgress,
      setCsat,
      triggerFailure,
      triggerReconnect,
      resumeFromReconnect,
      triggerSteppedAway,
      dismissSteppedAway,
      setReattemptMode,
      restartJourney,
      applyGeoFenceResult,
      clearLocationCapture,
      setForceCameraQualityFail,
      setForceMicFail,
      simulateNearExpiry,
      checkEkycWindow,
      setSimulateOutsideHours,
      bookSlot,
    }),
    [
      setPhase,
      setLanguage,
      logEvent,
      toggleDemo,
      toggleActivity,
      setCameraSimulated,
      setPermissionsGranted,
      acceptConsent,
      setPrecheckIndex,
      setIncallProgress,
      setCsat,
      triggerFailure,
      triggerReconnect,
      resumeFromReconnect,
      triggerSteppedAway,
      dismissSteppedAway,
      setReattemptMode,
      restartJourney,
      applyGeoFenceResult,
      clearLocationCapture,
      setForceCameraQualityFail,
      setForceMicFail,
      simulateNearExpiry,
      checkEkycWindow,
      setSimulateOutsideHours,
      bookSlot,
    ],
  );

  const value = useMemo((): JourneyContextValue => {
    return {
      ...state,
      ...actions,
      currentInCallStep: IN_CALL_STEPS[Math.min(state.incallStepIndex, IN_CALL_STEPS.length - 1)],
    };
  }, [state, actions]);

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useCustomerJourney() {
  const ctx = useContext(JourneyContext);
  if (!ctx) throw new Error('useCustomerJourney must be used within CustomerJourneyProvider');
  return ctx;
}
