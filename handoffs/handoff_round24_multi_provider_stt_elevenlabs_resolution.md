# Round 24 — Multi-Provider STT (ElevenLabs Primary) — Resolution (Code)

Built as specced, plus the two things the handoff explicitly deferred to Code rather than
prescribing (§5, §6) were researched, proposed to the user, and confirmed before building —
not guessed. The real human-voice test (§1) was run against the actual live endpoint and caught
two real protocol bugs that a docs-only implementation would have shipped silently broken.

## What changed

**Backend — new token-issuance endpoint**, mirroring `api/classify.ts`'s exact dev/deployed split:
- `apps/agent/api/_stt-token-core.ts` — `issueSttToken(apiKey)`, calls ElevenLabs'
  `POST /v1/single-use-token/realtime_scribe` server-side, returns `{ token }` or `null` on any
  failure.
- `apps/agent/api/stt-token.ts` — Vercel serverless function wrapping it, same shape as
  `api/classify.ts`.
- `vite.config.ts` — new `sttTokenDevMiddleware`, registered at `/api/stt-token`, same pattern as
  the existing `amberClassifyDevMiddleware`.
- `.env.example` — added `ELEVENLABS_API_KEY` with the same "server-side only" comment as
  `ANTHROPIC_API_KEY`. Never touched or wrote the real key myself — you added it to `.env` directly.

**Frontend — three-tier provider abstraction**, all new files under
`apps/agent/src/features/agent/call/amber/`:
- `elevenLabsLanguage.ts` — `toElevenLabsLanguageCode()`: strips the BCP-47 region suffix
  (`hi-IN`→`hi`, `en-IN`→`en`). No Hinglish-specific code exists for STT input — verified against
  ElevenLabs' docs; Scribe v2 handles code-switching natively within whichever single code is set.
- `elevenLabsSpeechProvider.ts` — `connectElevenLabs()`: fetches a token from our own backend,
  opens the mic (`getUserMedia`), connects the realtime WebSocket
  (`wss://api.elevenlabs.io/v1/speech-to-text/realtime`), streams 16kHz mono PCM16 via
  `ScriptProcessorNode`, routed through a zero-gain node so the applicant never hears their own
  mic echoed back. Resolves `null` on any failure before a live session starts (the "automatic,
  silent fallback" signal); resolves a `close()` handle once connected.
- `gcpSpeechProvider.ts` — `connectGcp()`: always resolves `null` today. Per §8, GCP is blocked on
  Cashfree IT's SSL-inspecting proxy — this is the interface slot only, nothing to test against yet.
- `useMultiProviderSpeechRecognition.ts` — the orchestrating hook. Preserves
  `useSpeechRecognition`'s exact return shape (§3's strong recommendation), so **`AmberPanel.tsx`
  needed only a 2-line change** (the import and the hook call itself — `SpeechCapture`'s prop type
  updated to match). Tries ElevenLabs → GCP → Web Speech in order on `start()`; a mid-call
  ElevenLabs failure re-enters the same tier-walk from GCP without resetting the transcript already
  captured. `simulate()` is a verbatim copy of the original hook's 900ms listening→idle timing,
  fully independent of all three providers, per §4's non-negotiable requirement.

## §5 / §6 — resolved by research + user confirmation, not guessed

Before writing any code, I verified both open items against ElevenLabs' real API reference (not
secondary summaries) and proposed concrete answers, which you confirmed:
- **Token endpoint shape (§5):** ElevenLabs' `POST /v1/single-use-token/{token_type}` (token type
  `realtime_scribe`) is a purpose-built match for the classify.ts pattern — confirmed and built as
  proposed.
- **Language codes (§6):** ISO 639-1, not BCP-47 — `hi`/`en`, no combined Hinglish code for STT
  input (the `hinglish_mode` flag that exists is an Agents/TTS response-generation setting, not an
  STT input parameter — doesn't apply here). Documented in `elevenLabsLanguage.ts`.

## §1 — the real human-voice test, run against the live endpoint

You provided a real recorded voice memo (`eleven_labs_manual_audio_testing.m4a`, ~12.6s, Hindi with
code-switched place names). Converted to 16-bit PCM WAV locally with macOS's built-in `afconvert`
(no upload, no third-party tool). Ran a standalone `npx tsx` script (same established pattern as
round 18b/21's classifier verification) against the **real** ElevenLabs realtime endpoint — not a
mock, not TTS audio.

**This caught two real bugs before they could ship**, both from relying on a secondary summary of
ElevenLabs' protocol rather than the live wire format:
1. **The discriminator key on every message (client and server) is `message_type`, not `type`.**
   My first run connected fine and got a real `session_started`, but every subsequent message used
   `message_type` — my code's `msg.type` check never matched anything, so `session_started` was
   read as an unrecognized message and no audio streaming ever started.
2. **The client's audio field is `audio_base_64`, not `audio_chunk`.** Fixed #1 and reran — audio
   streamed, but every chunk came back `{"message_type":"input_error","error":"Message must be a
   valid protocol message"}`. Re-fetched the actual API reference directly (not a search summary)
   and found the real field name.

With both fixed, the real transcription worked correctly: a full, coherent Hindi sentence
transcribed accurately, including the code-switched place name "पुणे" (Pune) preserved correctly in
Devanagari — mirroring round 24's own earlier TTS-only finding, now confirmed with genuine human
speech. Full transcript captured:

> मैं ना बहुत बातों नहीं हूँ। मैं सब कुछ करता हूँ। कभी पुणे जाता हूँ, कभी श्रीलंका जाता हूँ, कभी
> हरिद्वार जाता हूँ। मैं बहुत घूमता हूँ। कभी...

Both fixes were applied to the production file (`elevenLabsSpeechProvider.ts`), not just the test
script — the file's own header comment now documents this explicitly so a future reader understands
why these specific field names matter.

**Also verified live:** the exact `closeAll()` mechanism `stop()` relies on — sending one trailing
silent chunk with `commit: true` after the agent stops listening, to flush the model's final
segment before actually closing the socket. Re-ran the script mirroring this exact pattern (real
audio chunks with `commit: false` throughout, one silent `commit: true` chunk at the end) and
confirmed the server responds with a final `committed_transcript` right after receiving it, then
closes cleanly.

## Disclosed gaps — not independently verified

- **Mid-call ElevenLabs failure → automatic fallback:** the client-side logic
  (`onMidCallFailure` → re-entering `attemptFromTier('gcp', ...)`) is straightforward to reason
  about but wasn't exercised live — that needs deliberately killing an already-live connection
  mid-stream, which isn't practical to simulate cleanly here. The initial-connect fallback (no
  key, connection refused, etc.) **was** verified live in-browser (see below).
- **Multi-segment commit behavior:** the test recording never had a long enough pause to trigger
  more than one VAD auto-commit, so `committed_transcript` messages were only ever observed once
  per connection. `useMultiProviderSpeechRecognition` assumes each `committed_transcript` is a new,
  non-overlapping segment to append (the standard design for every other streaming ASR API) — this
  is an inference from the single-segment behavior actually observed, not confirmed against a real
  multi-segment call.
- **The actual in-app mic → WebSocket audio path** (as opposed to the standalone script's direct
  Node WebSocket connection) has not been exercised inside the browser itself — this sandbox's
  Browser pane has microphone access blocked, the same limitation every prior round's live-speech
  work has carried. The standalone script validates the same protocol and the same production code
  path (`elevenLabsSpeechProvider.ts`'s exact message shapes and close sequence), just not through
  an actual `getUserMedia()` capture in a real browser tab.
- **GCP tier:** per §8, not built beyond the interface slot — `connectGcp()` always returns `null`.

## Testing

- `npx tsc --noEmit -p tsconfig.json`: clean across all touched/new `src/` files.
- `api/*.ts` and `vite.config.ts` are outside this project's `tsconfig.json` (`include: ["src"]`
  only) and always have been — confirmed this is pre-existing by running the same ad-hoc check
  against the already-existing `classify.ts`/`_classify-core.ts`, which show identical
  `process.env`-typing gaps. Not something this round introduced or could fix without touching the
  project's own tooling config, which wasn't asked for.
- Started a temporary Vite instance on a scratch port (never touched your own dev server on :4000)
  to confirm `vite.config.ts` loads cleanly and `/api/stt-token` responds correctly with and without
  a key configured, and that the pre-existing `/api/classify` endpoint has no regression.
- **Live in your actual running dev server** (which auto-restarted on its own once `vite.config.ts`
  changed — Vite watches its own config file): accepted a SIM-tree call, tapped "Listen for
  applicant answer" — confirmed via `read_network_requests` that `/api/stt-token` was actually
  called and returned the real, correct 500 (no key was in that server's env at the time), then
  watched it fall through the GCP stub and land on Web Speech exactly as before this round
  ("Microphone access denied" — sandboxed mic, same as every prior round). `simulate()` and normal
  tap-confirm both still work identically, confirmed on the SIM tree specifically (not just Farmer)
  since this round is cross-tree infrastructure, not Farmer-scoped.
- **Real ElevenLabs endpoint, real human voice** (§1, detailed above): ran three times as the two
  protocol bugs were found and fixed, then once more to validate the exact production `closeAll()`
  sequence. All runs used the real endpoint, the real token-issuance flow, and your real recorded
  audio — no mocks anywhere in this pass.

## Housekeeping

Temporarily installed `ws` (`npm install --no-save ws`) to run the standalone verification
script — confirmed `package.json`/`package-lock.json` show no trace of it (the pre-existing
`package.json` diff removing `@cashfree-intl/cashmere` predates this round and is unrelated). The
verification script itself was a local scratch file, deleted after use — not part of this commit.
