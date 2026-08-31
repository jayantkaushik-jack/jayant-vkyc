/**
 * Round 24 — ElevenLabs Scribe v2 Realtime provider: the primary
 * speech-to-text tier (§2). Isolated in its own module, independent of
 * `useSpeechRecognition.ts` (the Web Speech fallback, untouched) and of
 * `simulate()` (which must stay provider-independent per §4) — the
 * orchestrating hook (`useMultiProviderSpeechRecognition.ts`) is the only
 * thing that knows all three tiers exist.
 *
 * Protocol details below (WebSocket URL/query params, `token`-param auth,
 * message shapes) were verified against ElevenLabs' own API reference AND
 * a real live connection (a standalone script streaming a real recorded
 * voice memo through this exact endpoint, round 24's "real human-voice
 * test") before finalizing this file — that live test caught two real
 * mistakes a docs-only read had gotten wrong: the discriminator key on
 * every message (client AND server) is `message_type`, not `type`, and the
 * client's audio field is `audio_base_64`, not `audio_chunk`. Both are
 * fixed here; get either wrong and every chunk is silently rejected as "not
 * a valid protocol message" with no transcript ever arriving — worth
 * flagging since it's exactly the kind of bug that would have shipped
 * looking plausible without that live test.
 *
 * `connectElevenLabs()` resolves `null` on ANY failure to reach a live
 * `session_started` — no token, no mic permission, connection refused, or
 * an early error — which is exactly the "automatic and silent" fallback
 * signal §2 asks for: the caller falls through to the next tier without
 * the agent seeing anything.
 */

const REALTIME_WS_URL = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';
const MODEL_ID = 'scribe_v2_realtime';
const SAMPLE_RATE = 16000;
/** How long to wait for a `session_started` message before giving up and falling back — the connection itself, not the whole call, needs to fail fast. */
const CONNECT_TIMEOUT_MS = 4000;

export interface ElevenLabsConnectOptions {
  /** ISO 639-1 — already converted by the caller via `toElevenLabsLanguageCode`. */
  languageCode: string;
  onPartialTranscript: (text: string) => void;
  onCommittedTranscript: (text: string) => void;
  /**
   * Fires only for a failure AFTER a live session was already established
   * (mid-call drop, server-side error). Before that point, a failure just
   * makes `connectElevenLabs()` resolve `null` — there's no "mid-call" to
   * signal yet.
   */
  onMidCallFailure: (reason: string) => void;
}

export interface ElevenLabsConnection {
  close: () => void;
}

function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Fetches a short-lived single-use token from our own backend (never the
 * raw ElevenLabs key — see `api/_stt-token-core.ts`), opens the mic, and
 * connects the realtime WebSocket. Resolves the live connection once
 * `session_started` arrives; resolves `null` on any failure along the way.
 */
export async function connectElevenLabs(opts: ElevenLabsConnectOptions): Promise<ElevenLabsConnection | null> {
  let token: string;
  try {
    const res = await fetch('/api/stt-token', { method: 'POST' });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string };
    if (!data.token) return null;
    token = data.token;
  } catch {
    return null;
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    return null;
  }

  const url =
    `${REALTIME_WS_URL}?model_id=${MODEL_ID}` +
    `&language_code=${encodeURIComponent(opts.languageCode)}` +
    `&audio_format=pcm_16000&commit_strategy=vad&token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(url);

  let audioCtx: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | null = null;
  let silentGain: GainNode | null = null;
  let sessionStarted = false;
  let settled = false;

  function teardownAudio() {
    processor?.disconnect();
    source?.disconnect();
    silentGain?.disconnect();
    void audioCtx?.close().catch(() => undefined);
    stream.getTracks().forEach((t) => t.stop());
  }

  /**
   * A plain `ws.close()` right after the agent stops listening drops
   * whatever the model hadn't committed yet — confirmed live: the server
   * only flushes a final `committed_transcript` for the tail of an
   * utterance once it sees a chunk with `commit: true`. So this sends one
   * last (silent, if no real audio is pending) chunk with that flag, gives
   * the server a brief window to respond, then actually closes.
   */
  function closeAll() {
    if (ws.readyState === WebSocket.OPEN) {
      const rate = audioCtx?.sampleRate ?? SAMPLE_RATE;
      const silence = new Int16Array(Math.round(rate * 0.2));
      try {
        ws.send(
          JSON.stringify({
            message_type: 'input_audio_chunk',
            audio_base_64: arrayBufferToBase64(silence.buffer),
            sample_rate: rate,
            commit: true,
          }),
        );
      } catch {
        // Best-effort — the socket may already be closing.
      }
    }
    teardownAudio();
    window.setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
    }, 400);
  }

  return new Promise((resolve) => {
    const connectTimeout = window.setTimeout(() => {
      if (!sessionStarted && !settled) {
        settled = true;
        closeAll();
        resolve(null);
      }
    }, CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      /**
       * Chrome-only assumption, consistent with this app's existing
       * Web Speech gate ("needs Chrome") — `AudioContext({ sampleRate })`
       * is honored reliably there. `ScriptProcessorNode` is deprecated in
       * favor of AudioWorklet but still universally supported and far
       * simpler to inline here without a separate worklet build step.
       * Routed through a zero-gain node rather than straight to
       * `destination` so the applicant's own mic audio is never echoed
       * back to them.
       */
      audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      source = audioCtx.createMediaStreamSource(stream);
      processor = audioCtx.createScriptProcessor(4096, 1, 1);
      silentGain = audioCtx.createGain();
      silentGain.gain.value = 0;
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(audioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const pcm = floatTo16BitPCM(e.inputBuffer.getChannelData(0));
        ws.send(
          JSON.stringify({
            message_type: 'input_audio_chunk',
            audio_base_64: arrayBufferToBase64(pcm),
            sample_rate: audioCtx!.sampleRate,
            commit: false,
          }),
        );
      };
    };

    ws.onmessage = (ev) => {
      let msg: { message_type?: string; text?: string; error?: string };
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      const kind = msg.message_type;

      if (kind === 'session_started') {
        sessionStarted = true;
        window.clearTimeout(connectTimeout);
        if (!settled) {
          settled = true;
          resolve({ close: closeAll });
        }
        return;
      }
      if (kind === 'partial_transcript') {
        opts.onPartialTranscript(msg.text ?? '');
        return;
      }
      if (kind === 'committed_transcript' || kind === 'committed_transcript_with_timestamps') {
        opts.onCommittedTranscript(msg.text ?? '');
        return;
      }
      // Every other kind (`error`, `auth_error`, `quota_exceeded`, `rate_limited`, `input_error`, ...) is a real error condition — none of them carry a transcript.
      if (kind && msg.error) {
        if (sessionStarted) opts.onMidCallFailure(msg.error);
        // A pre-session error is handled by onclose/the connect timeout below — nothing to do here.
      }
    };

    ws.onclose = () => {
      if (!settled) {
        settled = true;
        window.clearTimeout(connectTimeout);
        teardownAudio();
        resolve(null);
        return;
      }
      if (sessionStarted) {
        teardownAudio();
        opts.onMidCallFailure('ElevenLabs connection closed unexpectedly');
      }
    };
  });
}
