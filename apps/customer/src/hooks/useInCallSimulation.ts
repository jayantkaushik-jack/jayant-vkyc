import { useEffect, useRef } from 'react';
import { useCustomerJourney } from '@customer/features/customer/CustomerJourneyContext';

/** Scripted in-call sequence — auto-advances with natural pauses. */
const SCRIPT: { step: number; pauseMs: number; log?: string }[] = [
  { step: 0, pauseMs: 4500, log: 'Agent greeting & language confirmation' },
  { step: 0, pauseMs: 3500, log: 'Consent re-confirmation' },
  { step: 0, pauseMs: 5000, log: 'Liveness question: occupation' },
  { step: 0, pauseMs: 5000, log: 'Liveness question: income' },
  { step: 0, pauseMs: 7000, log: '6-digit code read aloud' },
  { step: 1, pauseMs: 4500, log: 'Location verification' },
  { step: 2, pauseMs: 6500, log: 'Face capture completed' },
  { step: 3, pauseMs: 3000, log: 'Aadhaar verified' },
  { step: 4, pauseMs: 6500, log: 'PAN card captured' },
  { step: 5, pauseMs: 6500, log: 'Signature captured' },
  { step: 5, pauseMs: 4500, log: 'Closing script — call complete' },
];

export function useInCallSimulation(active: boolean) {
  const {
    incallScriptIndex,
    setIncallProgress,
    setPhase,
    logEvent,
    reconnectResumeScript,
    phase,
  } = useCustomerJourney();
  const running = useRef(false);
  const scriptIdx = useRef(incallScriptIndex);

  useEffect(() => {
    scriptIdx.current = incallScriptIndex;
  }, [incallScriptIndex]);

  useEffect(() => {
    if (!active || phase === 'reconnecting' || phase === 'stepped_away') {
      running.current = false;
      return;
    }

    if (running.current) return;
    running.current = true;

    let cancelled = false;
    let idx = scriptIdx.current;

    const run = async () => {
      while (idx < SCRIPT.length && !cancelled) {
        const item = SCRIPT[idx];
        await new Promise((r) => setTimeout(r, item.pauseMs));
        if (cancelled) break;
        if (item.log) logEvent(item.log);
        idx += 1;
        setIncallProgress(item.step, idx);
      }
      if (!cancelled && idx >= SCRIPT.length) {
        logEvent('Call ended by bank official');
        setPhase('feedback');
      }
      running.current = false;
    };

    void run();

    return () => {
      cancelled = true;
      running.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- context actions are stable; phase/active/resume drive the loop
  }, [active, phase, reconnectResumeScript]);
}

export const SCRIPT_LENGTH = SCRIPT.length;

export type ScriptOverlay =
  | 'greeting'
  | 'consent'
  | 'question'
  | 'code'
  | 'location'
  | 'face'
  | 'aadhaar'
  | 'pan'
  | 'signature'
  | 'closing'
  | null;

export function overlayForScriptIndex(scriptIndex: number): ScriptOverlay {
  if (scriptIndex <= 0) return 'greeting';
  if (scriptIndex === 1) return 'consent';
  if (scriptIndex === 2 || scriptIndex === 3) return 'question';
  if (scriptIndex === 4) return 'code';
  if (scriptIndex === 5) return 'location';
  if (scriptIndex === 6) return 'face';
  if (scriptIndex === 7) return 'aadhaar';
  if (scriptIndex === 8) return 'pan';
  if (scriptIndex === 9) return 'signature';
  if (scriptIndex >= 10) return 'closing';
  return null;
}
