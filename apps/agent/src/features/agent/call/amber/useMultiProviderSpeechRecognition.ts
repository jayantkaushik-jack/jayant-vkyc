import { useCallback, useEffect, useRef, useState } from 'react';
import { useSpeechRecognition, type SpeechStatus } from './useSpeechRecognition';
import { connectElevenLabs, type ElevenLabsConnection } from './elevenLabsSpeechProvider';
import { connectGcp, type GcpConnection } from './gcpSpeechProvider';
import { toElevenLabsLanguageCode } from './elevenLabsLanguage';

type ActiveProvider = 'elevenlabs' | 'gcp' | 'webspeech' | null;

/**
 * Round 30 (§3) — a new deliberate product decision, not a fix for a
 * specific observed failure: no cap existed on how long an applicant's
 * answer could run before being sent to the classifier. Lives here (the
 * shared orchestrating hook) rather than duplicated per-provider, so it
 * applies uniformly to whichever tier is actually active.
 */
const WORD_LIMIT = 150;

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/**
 * Round 24 — replaces the single Web Speech API path with a three-tier
 * fallback (§2): ElevenLabs Scribe v2 Realtime, tried first, always → GCP
 * (dead code today, no key exists yet — see gcpSpeechProvider.ts) → Web
 * Speech (`useSpeechRecognition`, completely unchanged, used here as-is).
 *
 * Preserves the exact interface `useSpeechRecognition` already had
 * (`status`, `transcript`, `interimTranscript`, `start`, `stop`, `reset`,
 * `simulate`, `supported`) — per §3's strong recommendation — so
 * `AmberPanel.tsx` and `SpeechCapture` need zero changes: they call this
 * hook the same way they called the old one, unaware of which provider is
 * actually running underneath.
 *
 * Fallback is automatic and silent (§2): a failure at any tier — before or
 * during a call — falls through to the next tier without the agent seeing
 * an error state. `simulate()` (§4) stays fully provider-independent, an
 * exact copy of the original hook's own timing, since it must keep
 * working identically regardless of which/whether any real provider is
 * reachable.
 */
export function useMultiProviderSpeechRecognition(lang: string) {
  const webSpeech = useSpeechRecognition(lang);

  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  /** Round 30 (§3) — set when `start()`'s ~150-word auto-stop fires, distinct from an ordinary agent-initiated stop. Cleared on the next `start()`/`simulate()`. */
  const [cutoffForLength, setCutoffForLength] = useState(false);

  const activeProviderRef = useRef<ActiveProvider>(null);
  const connectionRef = useRef<ElevenLabsConnection | GcpConnection | null>(null);
  const generationRef = useRef(0);
  /** Web Speech's own status/transcript are mirrored up only while it's the active tier — see `startWebSpeechTier`. */
  const mirrorWebSpeechRef = useRef(false);

  const appendCommitted = useCallback((text: string) => {
    if (!text) return;
    setTranscript((t) => `${t} ${text}`.trim());
    setInterimTranscript('');
  }, []);

  const startWebSpeechTier = useCallback(() => {
    activeProviderRef.current = 'webspeech';
    mirrorWebSpeechRef.current = true;
    webSpeech.start();
  }, [webSpeech]);

  /**
   * Tries each remaining tier in priority order starting at `fromTier`,
   * stopping at the first one that connects. Shared by the initial
   * `start()` call and by a mid-call ElevenLabs failure (§2's "falls
   * through... without the agent needing to do anything") — the only
   * difference is the entry tier, since a mid-call fallback has already
   * spent the ElevenLabs attempt.
   */
  const attemptFromTier = useCallback(
    async (fromTier: 'elevenlabs' | 'gcp' | 'webspeech', myGeneration: number) => {
      const elCode = toElevenLabsLanguageCode(lang);

      if (fromTier === 'elevenlabs') {
        const conn = await connectElevenLabs({
          languageCode: elCode,
          onPartialTranscript: (text) => {
            if (generationRef.current !== myGeneration) return;
            setInterimTranscript(text);
          },
          onCommittedTranscript: (text) => {
            if (generationRef.current !== myGeneration) return;
            appendCommitted(text);
          },
          onMidCallFailure: () => {
            if (generationRef.current !== myGeneration) return;
            // Same silent-fallback behavior as an initial connect failure — resume from the next tier, transcript so far is untouched.
            void attemptFromTier('gcp', myGeneration);
          },
        });
        if (generationRef.current !== myGeneration) {
          conn?.close();
          return;
        }
        if (conn) {
          activeProviderRef.current = 'elevenlabs';
          connectionRef.current = conn;
          setStatus('listening');
          return;
        }
        // Fall through silently.
      }

      if (fromTier === 'elevenlabs' || fromTier === 'gcp') {
        const conn = await connectGcp({
          languageCode: elCode,
          onPartialTranscript: (text) => {
            if (generationRef.current !== myGeneration) return;
            setInterimTranscript(text);
          },
          onCommittedTranscript: (text) => {
            if (generationRef.current !== myGeneration) return;
            appendCommitted(text);
          },
          onMidCallFailure: () => {
            if (generationRef.current !== myGeneration) return;
            void attemptFromTier('webspeech', myGeneration);
          },
        });
        if (generationRef.current !== myGeneration) {
          conn?.close();
          return;
        }
        if (conn) {
          activeProviderRef.current = 'gcp';
          connectionRef.current = conn;
          setStatus('listening');
          return;
        }
        // Fall through silently — this is the live path today, since connectGcp always resolves null (§8: no key configured yet).
      }

      // Last resort — always succeeds or reports its own unsupported/denied/error state, exactly as it did before this round.
      startWebSpeechTier();
    },
    [lang, appendCommitted, startWebSpeechTier],
  );

  const start = useCallback(() => {
    generationRef.current += 1;
    const myGeneration = generationRef.current;
    activeProviderRef.current = null;
    connectionRef.current = null;
    mirrorWebSpeechRef.current = false;
    setStatus('listening');
    setTranscript('');
    setInterimTranscript('');
    setCutoffForLength(false);
    void attemptFromTier('elevenlabs', myGeneration);
  }, [attemptFromTier]);

  const stop = useCallback(() => {
    generationRef.current += 1; // invalidates any in-flight connect attempt or pending mid-call fallback
    const provider = activeProviderRef.current;
    if (provider === 'webspeech') {
      webSpeech.stop();
      return;
    }
    if (provider === 'elevenlabs' || provider === 'gcp') {
      connectionRef.current?.close();
      connectionRef.current = null;
      setInterimTranscript('');
      setStatus('idle');
    }
  }, [webSpeech]);

  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    webSpeech.reset();
  }, [webSpeech]);

  /**
   * §4 — must keep working identically regardless of provider state.
   * Tears down any live connection defensively (AmberPanel only ever calls
   * this from the pre-listen 'awaiting' state, so in practice there's
   * nothing to tear down), then reproduces the exact listening→idle timing
   * `useSpeechRecognition.simulate()` already used, independent of any of
   * the three real providers.
   */
  const simulate = useCallback((text: string) => {
    generationRef.current += 1;
    connectionRef.current?.close();
    connectionRef.current = null;
    activeProviderRef.current = null;
    mirrorWebSpeechRef.current = false;
    setInterimTranscript('');
    setTranscript('');
    setStatus('listening');
    setCutoffForLength(false);
    window.setTimeout(() => {
      setTranscript(text);
      setStatus('idle');
    }, 900);
  }, []);

  // Read Web Speech's own live state directly whenever it's the active tier — plain reads on every render, not mirrored through an effect, so there's no lag when a tier switch flips `mirrorWebSpeechRef` mid-render-cycle.
  const effectiveStatus = mirrorWebSpeechRef.current ? webSpeech.status : status;
  const effectiveTranscript = mirrorWebSpeechRef.current ? webSpeech.transcript : transcript;
  const effectiveInterim = mirrorWebSpeechRef.current ? webSpeech.interimTranscript : interimTranscript;

  /**
   * Round 30 (§3) — auto-stop once the finalized transcript crosses
   * ~150 words, for whichever tier is currently active. Deliberately counts
   * only the committed transcript, not `interimTranscript`: an interim
   * result can still be revised or retracted before it finalizes, so this
   * cutoff waits for the current utterance segment to finish committing
   * rather than firing mid-word/mid-sentence — a reasonable choice per the
   * handoff's own open question, and simpler to reason about than tracking
   * a moving, not-yet-final word count.
   */
  useEffect(() => {
    if (effectiveStatus !== 'listening') return;
    if (wordCount(effectiveTranscript) < WORD_LIMIT) return;
    setCutoffForLength(true);
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveStatus, effectiveTranscript]);

  return {
    status: effectiveStatus,
    transcript: effectiveTranscript,
    interimTranscript: effectiveInterim,
    start,
    stop,
    reset,
    simulate,
    cutoffForLength,
    supported: true,
  };
}
