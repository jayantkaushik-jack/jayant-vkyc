import { useCallback, useEffect, useRef, useState } from 'react';

export type SpeechStatus = 'idle' | 'listening' | 'unsupported' | 'denied' | 'error';

/** Bank-declared language string (from Customer.language) -> BCP-47 tag. */
export function languageToTag(language: string): string {
  const map: Record<string, string> = {
    Hindi: 'hi-IN',
    English: 'en-IN',
    Tamil: 'ta-IN',
    Telugu: 'te-IN',
  };
  return map[language] ?? 'en-IN';
}

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/**
 * Real Web Speech API transcription (brief build step 2) — Chrome only,
 * no backend, no API key. Classification of the transcript into a bucket
 * is build step 3 and happens outside this hook; this only captures text.
 */
export function useSpeechRecognition(lang: string) {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const supported = getSpeechRecognitionCtor() !== null;

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setStatus('unsupported');
      return;
    }
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let final = '';
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) final += text;
        else interim += text;
      }
      if (final) setTranscript((t) => `${t} ${final}`.trim());
      setInterimTranscript(interim);
    };
    rec.onerror = (e) => {
      setStatus(e.error === 'not-allowed' ? 'denied' : 'error');
    };
    rec.onend = () => {
      setStatus((s) => (s === 'listening' ? 'idle' : s));
    };

    recognitionRef.current = rec;
    setTranscript('');
    setInterimTranscript('');
    setStatus('listening');
    rec.start();
  }, [lang]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  /**
   * Stage-reliability fallback — live speech recognition depends on the
   * venue network (Chrome sends the audio to Google's servers), a real risk
   * for the one live stage run. This mirrors the real recognizer's status
   * lifecycle (listening -> idle with a transcript) rather than setting the
   * transcript directly, so the classification effect watching for that
   * transition fires exactly as it would for a live answer.
   */
  const simulate = useCallback((text: string) => {
    recognitionRef.current?.stop();
    setInterimTranscript('');
    setTranscript('');
    setStatus('listening');
    window.setTimeout(() => {
      setTranscript(text);
      setStatus('idle');
    }, 900);
  }, []);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return { status, transcript, interimTranscript, start, stop, reset, simulate, supported };
}
