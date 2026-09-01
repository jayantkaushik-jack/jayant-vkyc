import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CALL_STEPS } from '@vkyc/shared/lib/constants';
import type { StepStatus } from '@vkyc/shared/lib/constants';
import type { CaptureMode } from '@vkyc/shared/lib/demoAssets';
import { cropPanPhotoFromCard, cropImageToGuide } from '@vkyc/shared/lib/captureUtils';
import type { SelectedRejectionReasons } from '@vkyc/shared/lib/rejectionReasons';
import type { CallSession, Auditor, Customer, LivenessAnswer, PanOcrData } from '@vkyc/shared/data/types';
import { auditors } from '@vkyc/shared/data';
import type { AmberPersona } from '@agent/features/agent/call/amber/personas';
import type { Verdict, PathEntry } from '@agent/features/agent/call/amber/tree';

export type { LivenessAnswer, PanOcrData };

export interface PreCheckState {
  videoVisible: boolean;
  audible: boolean;
}

export interface LivenessQuestionState {
  question: string;
  answer: string;
  asked: boolean;
  askedAt?: string;
  result: 'correct' | 'wrong' | null;
  isCode?: boolean;
}

function generateLivenessCode(): string {
  return String(100000 + Math.floor(Math.random() * 900000));
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

type PoolItem = { question: string; answer: (c: Customer) => string };

const LIVENESS_POOL: PoolItem[] = [
  {
    question: 'What is your occupation?',
    answer: (c) => c.incomeEmployment?.occupation ?? 'Software Engineer',
  },
  {
    question: 'What is your annual income?',
    answer: (c) => {
      const n = c.incomeEmployment?.annualIncome;
      return n != null ? `₹${n.toLocaleString('en-IN')}` : '₹8,50,000';
    },
  },
  {
    question: 'What is your date of birth?',
    answer: (c) => c.dob,
  },
  {
    question: 'In which city do you currently reside?',
    answer: (c) => c.currentAddress.city,
  },
  {
    question: "What is your father's name?",
    answer: (c) => c.fatherName,
  },
  {
    question: 'What is your full name as per Aadhaar?',
    answer: (c) => c.asPerAadhaar?.name ?? c.name,
  },
  {
    question: 'What is your registered mobile number?',
    answer: (c) => c.phone,
  },
  {
    question: 'What product are you applying for?',
    answer: (c) => c.productType,
  },
];

const CODE_QUESTION = 'Read the 6-digit text seen on your screen';

/** Build 3 liveness questions: 2 from pool + always the 6-digit code, order seeded per call. */
export function createShuffledLivenessQuestions(
  seedKey: string,
  code: string,
  customer: Customer,
): LivenessQuestionState[] {
  const rand = mulberry32(hashSeed(seedKey + code));
  const pool = [...LIVENESS_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = pool.slice(0, 2).map((p) => ({
    question: p.question,
    answer: p.answer(customer),
    asked: false,
    result: null as 'correct' | 'wrong' | null,
  }));
  const codeQ: LivenessQuestionState = {
    question: CODE_QUESTION,
    answer: code.replace(/\s/g, ''),
    asked: false,
    result: null,
    isCode: true,
  };
  const all = [...picked, codeQ];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

function createInitialLiveness(customer: Customer, seedKey: string) {
  const code = generateLivenessCode();
  return { code, questions: createShuffledLivenessQuestions(seedKey, code, customer) };
}

/** @deprecated Prefer createShuffledLivenessQuestions — kept for callers that only need a code. */
export function createDefaultLivenessQuestions(code: string): LivenessQuestionState[] {
  return [
    { question: 'What is your occupation?', answer: 'Software Engineer', asked: false, result: null },
    { question: 'What is your annual income?', answer: '₹8,50,000', asked: false, result: null },
    {
      question: CODE_QUESTION,
      answer: code.replace(/\s/g, ''),
      asked: false,
      result: null,
      isCode: true,
    },
  ];
}

export interface ActivityLogEntry {
  event: string;
  timestamp: string;
  detail?: string;
}

export interface ChatMessage {
  id: string;
  from: 'agent' | 'customer';
  text: string;
  at: string;
}

export interface StepResults {
  preCheck: PreCheckState | null;
  liveliness: boolean | null;
  location: boolean | null;
  face: boolean | null;
  aadhaar: boolean | null;
  pan: boolean | null;
  sign: boolean | null;
}

interface CallFlowContextValue {
  session: CallSession;
  assignedAuditor: Auditor;
  livenessCode: string;
  started: boolean;
  activeStep: number;
  liveStep: number;
  reviewMode: boolean;
  stepStatuses: StepStatus[];
  results: StepResults;
  preCheck: PreCheckState | null;
  livenessQuestions: LivenessQuestionState[];
  livenessAnswers: LivenessAnswer[];
  activityLog: ActivityLogEntry[];
  chatMessages: ChatMessage[];
  sessionEnded: boolean;
  capturedFace: string | null;
  capturedPan: string | null;
  capturedSignature: string | null;
  pendingFace: string | null;
  pendingPan: string | null;
  pendingSign: string | null;
  panPhotoCrop: string | null;
  panOcr: PanOcrData;
  panEditedFields: string[];
  panConfirmed: boolean;
  panFaceMatch: boolean | null;
  aadhaarFaceMatch: boolean | null;
  agentRemarks: string;
  stepRemarks: Record<string, string>;
  decision: 'approved' | 'rejected' | 'unable' | 'incomplete' | null;
  rejectionReasons: SelectedRejectionReasons;
  callStartedAt: number;
  callDurationSec: number;
  finalDurationSec: number | null;
  showConfirmation: boolean;
  captureNonce: number;
  startWorkflow: (preCheck: PreCheckState) => void;
  advanceStep: (index: number, passed: boolean, resultKey: keyof StepResults) => void;
  updateStepResult: (index: number, passed: boolean, resultKey: keyof StepResults) => void;
  goToStep: (index: number) => void;
  returnToLive: () => void;
  submitVideoCapture: (image: string) => void;
  requestCapture: () => void;
  toggleCameraFlip: () => void;
  retakeFaceCapture: () => void;
  retakePanCapture: () => void;
  retakeSignCapture: () => void;
  confirmFaceCapture: () => void;
  confirmPanCapture: () => Promise<void>;
  confirmSignCapture: () => void;
  endCustomerSession: () => void;
  setPanOcr: (data: PanOcrData) => void;
  setPanEditedFields: (fields: string[]) => void;
  setPanConfirmed: (v: boolean) => void;
  setPanFaceMatch: (v: boolean | null) => void;
  setAadhaarFaceMatch: (v: boolean | null) => void;
  setLivenessQuestions: (questions: LivenessQuestionState[]) => void;
  setLivenessAnswers: (answers: LivenessAnswer[]) => void;
  logActivity: (event: string, detail?: string) => void;
  sendChatMessage: (text: string) => void;
  setAgentRemarks: (v: string) => void;
  setStepRemark: (stepId: string, v: string) => void;
  setRejectionReasons: (v: SelectedRejectionReasons) => void;
  submitDecision: (decision: 'approved' | 'rejected' | 'unable', reasons?: SelectedRejectionReasons) => void;
  endCallIncomplete: (reasons?: SelectedRejectionReasons) => void;
  /**
   * The single current-stage value for the whole call screen — Progress
   * panel highlighting, the video feed overlay, and any other stage-gated
   * UI must all read this one value via exact equality, never a separate
   * local flag.
   *
   * Rounds 6-8: the applicant completes the entire VKYC sequence, including
   * signing, before an agent ever joins an amber case — so there is no real
   * CALL_STEPS id this can ever resolve to while isAmberCase is true (which
   * is always, in this build). 'resolve_signal' while the amber gate is
   * open, 'done' once it resolves (nothing is "current" anymore — the case
   * is ending). Kept distinct from 'pre' (before the pre-check) for clarity.
   */
  currentStage: 'pre' | 'resolve_signal' | 'done';
  getCaptureMode: () => CaptureMode | null;
  shouldShowLivenessCodeOverlay: boolean;
  /** Every call in this build is one of the two Amber demo personas. */
  isAmberCase: boolean;
  amberPersonaId: AmberPersona['id'];
  amberResolved: boolean;
  amberVerdict: Verdict | null;
  /** The question-by-question trail behind amberVerdict — Case Summary's zone 5 (round 15, §8). */
  amberPath: PathEntry[];
  recordAmberVerdict: (verdict: Verdict, score: number | null, path: PathEntry[]) => void;
  /**
   * The agent's job starts and ends at Amber Resolution (rounds 6-8) — this
   * marks the amber gate resolved and immediately submits a decision mapped
   * from the verdict's band, since there are no compliance steps or Report
   * left to hand off to. PROCEED/STEP_UP -> approved, BLOCK -> rejected,
   * HUMAN_REVIEW -> unable.
   */
  finalizeAmberCase: () => void;
}

const CallFlowContext = createContext<CallFlowContextValue | null>(null);

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const CUSTOMER_CHAT_REPLIES = [
  'Okay, please wait a moment.',
  'Sure, I can see that.',
  'Yes, holding it up now.',
  'Sorry, let me adjust.',
  'Done — can you see it clearly?',
];

export function CallFlowProvider({
  session,
  amberPersonaId,
  children,
}: {
  session: CallSession;
  amberPersonaId: AmberPersona['id'];
  children: ReactNode;
}) {
  const assignedAuditor = useMemo(
    () => auditors[hashId(session.customer.id) % auditors.length],
    [session.customer.id],
  );

  const [livenessBundle] = useState(() =>
    createInitialLiveness(session.customer, session.customer.id + String(Date.now())),
  );
  const livenessCode = livenessBundle.code;

  const [callStartedAt] = useState(() => Date.now());
  const [started, setStarted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [liveStep, setLiveStep] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>(CALL_STEPS.map(() => 'pending'));
  const [results, setResults] = useState<StepResults>({
    preCheck: null,
    liveliness: null,
    location: null,
    face: null,
    aadhaar: null,
    pan: null,
    sign: null,
  });
  const [preCheck, setPreCheck] = useState<PreCheckState | null>(null);
  const [livenessQuestions, setLivenessQuestionsState] = useState<LivenessQuestionState[]>(
    livenessBundle.questions,
  );
  const [livenessAnswers, setLivenessAnswers] = useState<LivenessAnswer[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [capturedFace, setCapturedFace] = useState<string | null>(null);
  const [capturedPan, setCapturedPan] = useState<string | null>(null);
  const [capturedSignature, setCapturedSignature] = useState<string | null>(null);
  const [pendingFace, setPendingFace] = useState<string | null>(null);
  const [pendingPan, setPendingPan] = useState<string | null>(null);
  const [pendingSign, setPendingSign] = useState<string | null>(null);
  const [panPhotoCrop, setPanPhotoCrop] = useState<string | null>(null);
  const [panOcr, setPanOcrState] = useState<PanOcrData>({
    panNumber: session.customer.panNumber,
    name: session.customer.name,
    fatherName: session.customer.fatherName,
    dob: session.customer.dob,
  });
  const [panEditedFields, setPanEditedFieldsState] = useState<string[]>([]);
  const [panConfirmed, setPanConfirmedState] = useState(false);
  const [panFaceMatch, setPanFaceMatchState] = useState<boolean | null>(null);
  const [aadhaarFaceMatch, setAadhaarFaceMatchState] = useState<boolean | null>(null);
  const [agentRemarks, setAgentRemarks] = useState('');
  const [stepRemarks, setStepRemarks] = useState<Record<string, string>>({});
  const [decision, setDecision] = useState<'approved' | 'rejected' | 'unable' | 'incomplete' | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<SelectedRejectionReasons>({
    selections: [],
    remarks: '',
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [finalDurationSec, setFinalDurationSec] = useState<number | null>(null);
  const [captureNonce, setCaptureNonce] = useState(0);
  const [amberResolved, setAmberResolved] = useState(false);
  const [amberVerdict, setAmberVerdict] = useState<Verdict | null>(null);
  const [amberPath, setAmberPath] = useState<PathEntry[]>([]);
  /** Every call in this build is one of the two Amber demo personas. */
  const isAmberCase = true;

  /**
   * Recording a verdict and clearing the gate are deliberately separate.
   * The resolution screen (state 4) has to stay visible until the agent
   * reads it and continues — clearing the gate the instant a verdict
   * computes would unmount the panel before anyone sees it.
   */
  const recordAmberVerdict = useCallback((verdict: Verdict, _score: number | null, path: PathEntry[]) => {
    setAmberVerdict(verdict);
    setAmberPath(path);
  }, []);

  const callDurationSec = finalDurationSec ?? Math.floor((Date.now() - callStartedAt) / 1000);

  useEffect(() => {
    setPendingFace(null);
    setPendingPan(null);
    setPendingSign(null);
  }, [activeStep]);

  const logActivity = useCallback((event: string, detail?: string) => {
    setActivityLog((log) => [
      ...log,
      { event, timestamp: new Date().toISOString(), detail },
    ]);
  }, []);

  const sendChatMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const at = new Date().toISOString();
    setChatMessages((msgs) => [
      ...msgs,
      { id: `a-${Date.now()}`, from: 'agent', text: trimmed, at },
    ]);
    logActivity('Chat message sent', trimmed);
    const reply = CUSTOMER_CHAT_REPLIES[hashId(trimmed + at) % CUSTOMER_CHAT_REPLIES.length];
    window.setTimeout(() => {
      const replyAt = new Date().toISOString();
      setChatMessages((msgs) => [
        ...msgs,
        { id: `c-${Date.now()}`, from: 'customer', text: reply, at: replyAt },
      ]);
      logActivity('Chat message received', reply);
    }, 900);
  }, [logActivity]);

  /**
   * Every call in this build is an amber case (see isAmberCase below). Per
   * rounds 6-8, the applicant completes the entire VKYC sequence, including
   * signing, before an agent ever joins — so all six prior steps
   * (liveliness, location, face, aadhaar, pan, sign) are pre-marked passed
   * on load, not just the first five. Amber Resolution is the only stage
   * that starts active. There is no live step for the agent to resume at —
   * the display and any live step content would otherwise contradict each
   * other.
   */
  const startWorkflow = useCallback((checks: PreCheckState) => {
    setPreCheck(checks);
    setResults((r) => ({
      ...r,
      preCheck: checks,
      liveliness: true,
      location: true,
      face: true,
      aadhaar: true,
      pan: true,
      sign: true,
    }));
    setStarted(true);
    setStepStatuses(() => {
      const next = CALL_STEPS.map(() => 'pending' as StepStatus);
      next[0] = 'passed';
      next[1] = 'passed';
      next[2] = 'passed';
      next[3] = 'passed';
      next[4] = 'passed';
      next[5] = 'passed';
      return next;
    });
    setActiveStep(5);
    setLiveStep(5);
    logActivity('Workflow started', 'Entire VKYC sequence already completed by the applicant — Amber Resolution is the only live stage');
  }, [logActivity]);

  const advanceStep = useCallback((index: number, passed: boolean, resultKey: keyof StepResults) => {
    if (reviewMode) return;
    setReviewMode(false);
    setStepStatuses((s) => {
      const next = [...s];
      next[index] = passed ? 'passed' : 'failed';
      if (index < CALL_STEPS.length - 1) next[index + 1] = 'active';
      return next;
    });
    setResults((r) => ({ ...r, [resultKey]: passed }));
    if (index < CALL_STEPS.length - 1) {
      setActiveStep(index + 1);
      setLiveStep(index + 1);
    }
    setPendingFace(null);
    setPendingPan(null);
    setPendingSign(null);
  }, [reviewMode]);

  const updateStepResult = useCallback((index: number, passed: boolean, resultKey: keyof StepResults) => {
    setStepStatuses((s) => {
      const next = [...s];
      next[index] = passed ? 'passed' : 'failed';
      return next;
    });
    setResults((r) => ({ ...r, [resultKey]: passed }));
  }, []);

  const returnToLive = useCallback(() => {
    setReviewMode(false);
    setActiveStep(liveStep);
    setPendingFace(null);
    setPendingPan(null);
    setPendingSign(null);
  }, [liveStep]);

  const goToStep = useCallback((index: number) => {
    setStepStatuses((s) => {
      if (s[index] !== 'passed' && s[index] !== 'failed') return s;
      setReviewMode(true);
      setActiveStep(index);
      return s;
    });
  }, []);

  const submitVideoCapture = useCallback((image: string) => {
    if (!started || sessionEnded) return;
    const stepId = CALL_STEPS[activeStep].id;
    if (stepId === 'face') setPendingFace(image);
    else if (stepId === 'pan') setPendingPan(image);
    else if (stepId === 'sign') setPendingSign(image);
  }, [started, activeStep, sessionEnded]);

  const requestCapture = useCallback(() => {
    if (sessionEnded) return;
    setCaptureNonce((n) => n + 1);
  }, [sessionEnded]);

  const toggleCameraFlip = useCallback(() => {
    // Demo-only control — intentionally no-op
  }, []);

  const retakeFaceCapture = useCallback(() => {
    if (sessionEnded) return;
    setCapturedFace(null);
    setPendingFace(null);
  }, [sessionEnded]);

  const retakePanCapture = useCallback(() => {
    if (sessionEnded) return;
    setCapturedPan(null);
    setPanPhotoCrop(null);
    setPanConfirmedState(false);
    setPendingPan(null);
  }, [sessionEnded]);

  const retakeSignCapture = useCallback(() => {
    if (sessionEnded) return;
    setCapturedSignature(null);
    setPendingSign(null);
  }, [sessionEnded]);

  const confirmFaceCapture = useCallback(() => {
    if (sessionEnded || !pendingFace) return;
    setCapturedFace(pendingFace);
    setPendingFace(null);
  }, [pendingFace, sessionEnded]);

  const confirmPanCapture = useCallback(async () => {
    if (sessionEnded || !pendingPan) return;
    const cropped = await cropImageToGuide(pendingPan, 'pan');
    setCapturedPan(cropped);
    const photo = await cropPanPhotoFromCard(cropped);
    setPanPhotoCrop(photo);
    setPendingPan(null);
  }, [pendingPan, sessionEnded]);

  const confirmSignCapture = useCallback(async () => {
    if (sessionEnded || !pendingSign) return;
    const cropped = await cropImageToGuide(pendingSign, 'sign');
    setCapturedSignature(cropped);
    setPendingSign(null);
  }, [pendingSign, sessionEnded]);

  const endCustomerSession = useCallback(() => {
    setSessionEnded(true);
    setFinalDurationSec((prev) => prev ?? Math.floor((Date.now() - callStartedAt) / 1000));
    logActivity('Customer session ended', 'Call disconnected — duration locked');
  }, [callStartedAt, logActivity]);

  const setPanOcr = useCallback((data: PanOcrData) => {
    if (sessionEnded) return;
    setPanOcrState(data);
  }, [sessionEnded]);

  const setPanEditedFields = useCallback((fields: string[]) => {
    if (sessionEnded) return;
    setPanEditedFieldsState(fields);
  }, [sessionEnded]);

  const setPanConfirmed = useCallback((v: boolean) => {
    if (sessionEnded) return;
    setPanConfirmedState(v);
  }, [sessionEnded]);

  const setPanFaceMatch = useCallback((v: boolean | null) => {
    if (sessionEnded) return;
    setPanFaceMatchState(v);
  }, [sessionEnded]);

  const setAadhaarFaceMatch = useCallback((v: boolean | null) => {
    if (sessionEnded) return;
    setAadhaarFaceMatchState(v);
  }, [sessionEnded]);

  const setLivenessQuestions = useCallback((questions: LivenessQuestionState[]) => {
    if (sessionEnded) return;
    setLivenessQuestionsState(questions);
  }, [sessionEnded]);

  const submitDecision = useCallback((
    d: 'approved' | 'rejected' | 'unable',
    reasons?: SelectedRejectionReasons,
  ) => {
    if (!sessionEnded) {
      setSessionEnded(true);
      logActivity('Customer session ended', 'Ended with agent decision');
    }
    setFinalDurationSec((prev) => prev ?? Math.floor((Date.now() - callStartedAt) / 1000));
    setDecision(d);
    if (reasons) setRejectionReasons(reasons);
    setShowConfirmation(true);
  }, [callStartedAt, sessionEnded, logActivity]);

  const endCallIncomplete = useCallback((reasons?: SelectedRejectionReasons) => {
    if (!sessionEnded) {
      setSessionEnded(true);
      logActivity('Customer session ended', 'Call ended incomplete');
    }
    setFinalDurationSec((prev) => prev ?? Math.floor((Date.now() - callStartedAt) / 1000));
    setDecision('incomplete');
    if (reasons) setRejectionReasons(reasons);
    setShowConfirmation(true);
  }, [callStartedAt, sessionEnded, logActivity]);

  const setStepRemark = useCallback((stepId: string, v: string) => {
    setStepRemarks((prev) => ({ ...prev, [stepId]: v }));
  }, []);

  const finalizeAmberCase = useCallback(() => {
    setAmberResolved(true);
    const band = amberVerdict?.band;
    const mappedDecision: 'approved' | 'rejected' | 'unable' =
      band === 'BLOCK' ? 'rejected' : band === 'HUMAN_REVIEW' ? 'unable' : 'approved';
    submitDecision(mappedDecision);
  }, [amberVerdict, submitDecision]);

  /**
   * Round 36 — the "Amber Resolution" progress-rail pill was reading
   * `amberResolved` (only set true when the agent clicks "End Session" on
   * `ResolutionCard`, at which point `submitDecision` also moves the whole
   * screen to Case Summary and the rail unmounts anyway) instead of
   * `amberVerdict` (set the moment a verdict is actually recorded, which is
   * the same instant `AmberPanel` starts rendering `ResolutionCard`). The
   * pill therefore never had a real chance to render green — fixed by
   * keying "done" off `amberVerdict !== null`. `amberResolved` itself is
   * untouched and still gates `StepWorkspace`'s render switch exactly as
   * before (see `recordAmberVerdict`'s own comment above for why those two
   * have to stay separate).
   */
  const currentStage = useMemo((): 'pre' | 'resolve_signal' | 'done' => {
    if (!started) return 'pre';
    if (isAmberCase && !amberVerdict) return 'resolve_signal';
    return 'done';
  }, [started, isAmberCase, amberVerdict]);

  /**
   * Rounds 6-8: the applicant completes the entire VKYC sequence, including
   * signing, before an agent ever joins — so there is no state in which a
   * capture guide box (face/pan/sign) should ever appear on the video feed.
   * Always null, structurally: currentStage never equals a real StepId
   * while isAmberCase is true, which is always, in this build.
   */
  const getCaptureMode = useCallback((): CaptureMode | null => null, []);

  const shouldShowLivenessCodeOverlay = useMemo(() => {
    if (!started || CALL_STEPS[activeStep].id !== 'liveliness') return false;
    const codeQuestion = livenessQuestions.find((q) => q.isCode);
    return !!codeQuestion?.asked && codeQuestion.result === null;
  }, [started, activeStep, livenessQuestions]);

  return (
    <CallFlowContext.Provider
      value={{
        session,
        assignedAuditor,
        livenessCode,
        started,
        activeStep,
        liveStep,
        reviewMode,
        stepStatuses,
        results,
        preCheck,
        livenessQuestions,
        livenessAnswers,
        activityLog,
        chatMessages,
        sessionEnded,
        capturedFace,
        capturedPan,
        capturedSignature,
        pendingFace,
        pendingPan,
        pendingSign,
        panPhotoCrop,
        panOcr,
        panEditedFields,
        panConfirmed,
        panFaceMatch,
        aadhaarFaceMatch,
        agentRemarks,
        stepRemarks,
        decision,
        rejectionReasons,
        callStartedAt,
        callDurationSec,
        finalDurationSec,
        showConfirmation,
        captureNonce,
        startWorkflow,
        advanceStep,
        updateStepResult,
        goToStep,
        returnToLive,
        submitVideoCapture,
        requestCapture,
        toggleCameraFlip,
        retakeFaceCapture,
        retakePanCapture,
        retakeSignCapture,
        confirmFaceCapture,
        confirmPanCapture,
        confirmSignCapture,
        endCustomerSession,
        setPanOcr,
        setPanEditedFields,
        setPanConfirmed,
        setPanFaceMatch,
        setAadhaarFaceMatch,
        setLivenessQuestions,
        setLivenessAnswers,
        logActivity,
        sendChatMessage,
        setAgentRemarks,
        setStepRemark,
        setRejectionReasons,
        submitDecision,
        endCallIncomplete,
        currentStage,
        getCaptureMode,
        shouldShowLivenessCodeOverlay,
        isAmberCase,
        amberPersonaId,
        amberResolved,
        amberVerdict,
        amberPath,
        recordAmberVerdict,
        finalizeAmberCase,
      }}
    >
      {children}
    </CallFlowContext.Provider>
  );
}

export function useCallFlow() {
  const ctx = useContext(CallFlowContext);
  if (!ctx) throw new Error('useCallFlow must be used within CallFlowProvider');
  return ctx;
}
