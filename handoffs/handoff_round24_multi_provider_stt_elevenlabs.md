# Handoff 24 — Multi-provider speech-to-text: ElevenLabs primary, GCP + Web Speech as fallbacks

**Status:** locked on architecture/priority; a few implementation specifics are explicitly left to
Code's judgment (flagged below) rather than guessed here. Continues from round 23.
**Scope:** this is infrastructure shared by all three rule trees (SIM, Farmer, Premium Address) —
unlike rounds 22/23, this is NOT Farmer-tree-scoped, since speech capture is a single shared hook
(`useSpeechRecognition`) consumed identically by all of `AmberPanel.tsx` regardless of which tree
is active.

## 1. Why — validated before building, not guessed

Reverie was the original candidate (bridging doc), but the user pivoted to ElevenLabs mid-session.
Two rounds of testing were run (outside this repo, via standalone Python scripts using gTTS-
generated Hindi audio against ElevenLabs' real `POST /v1/speech-to-text` REST endpoint,
`model_id: scribe_v2`) before committing:

- **Pure Hindi baseline** (Ramesh Yadav's wheat/land line, `tree.ts`'s own `sampleTranscript`):
  transcribed near-perfectly — only variance was "ज़मीन" → "जमीन" (nuqta dropped), a normalization
  quirk this codebase already has a name for and already handles (`normalizeHindi()` in
  `classify.ts`, confirmed in the audit — nuqta-stripping is pre-existing, expected behavior, not
  a new problem).
- **Code-switched proper noun** (Bhagwan Singh's remittance line, "...पुणे में काम करता है..."):
  transcribed perfectly, word-for-word, "Pune" preserved correctly in Devanagari.

Both tests used clean single-take TTS audio, not real human speech — genuinely weaker evidence
than a live recording (accent, pacing, background noise, phone-call mic quality all untested).
**Confirm with Code that a real human-voice test (a recorded voice memo through the same REST
endpoint) happens during the actual build/QA pass** — this was deliberately deferred rather than
skipped; don't treat the TTS-only result as the final word on quality.

## 2. The real decision: three providers, not a swap

**This is not "replace Web Speech API with ElevenLabs."** The locked architecture is a genuine
multi-provider abstraction with an explicit priority order:

1. **ElevenLabs Scribe v2 Realtime** (WebSocket, `wss://api.elevenlabs.io/v1/speech-to-text/realtime`) — tried first, always.
2. **Google Cloud Speech-to-Text** — tried second, but **only once a GCP key actually exists**.
   Per the bridging doc, this is currently blocked (Cashfree IT's corporate SSL-inspecting proxy,
   unresolved as of this handoff) — so this tier is dead code / unreachable until that unblocks.
   Build the abstraction so this slot exists and is easy to wire in later, but there is nothing to
   implement against today beyond the interface shape.
3. **Web Speech API** (`useSpeechRecognition.ts`, Chrome's built-in `SpeechRecognition`) — the
   existing, already-working mechanism. This becomes the final fallback, not the primary, but
   **stays in the codebase unchanged and fully functional** — do not delete or degrade it.

**Fallback trigger: automatic and silent.** If ElevenLabs fails to connect, errors mid-call, or
its token issuance fails, the app falls through to the next available provider (GCP if
configured, else Web Speech) without the agent needing to do anything — no visible error state,
no manual switch required. This matches the existing philosophy behind `simulate()` (§4 below):
don't let infrastructure be a single point of failure on a live call.

## 3. Provider abstraction — preserve the existing hook's exact interface

`AmberPanel.tsx` and `SpeechCapture` currently consume `useSpeechRecognition(lang)` expecting
exactly this shape (confirmed in code, `useSpeechRecognition.ts`):

```
{ status: SpeechStatus, transcript: string, interimTranscript: string,
  start: () => void, stop: () => void, reset: () => void,
  simulate: (text: string) => void, supported: boolean }
```

where `SpeechStatus = 'idle' | 'listening' | 'unsupported' | 'denied' | 'error'`.

**Strong recommendation, not a hard requirement:** design the new multi-provider hook (e.g.
`useMultiProviderSpeechRecognition` or similar naming — Code's call) to return this exact same
shape, internally trying ElevenLabs → GCP → Web Speech and routing `start`/`stop`/`transcript`
etc. through whichever provider is currently active. If this shape is preserved, **`AmberPanel.tsx`
and `SpeechCapture` require zero changes** — they just keep calling `speech.start()`,
`speech.transcript`, etc. exactly as today, unaware of which provider is actually running
underneath. This is the cleanest path and avoids touching two files that already work correctly.
If Code finds a reason this shape doesn't fit ElevenLabs' streaming model well, flag it back
rather than silently changing the interface and rewriting the consuming components.

## 4. `simulate()` — must keep working identically, non-negotiable

Confirmed explicit instruction: whatever the new architecture looks like, `simulate()` (the
stage-reliability fallback — canned transcript playback with the same `listening` → `idle` timing
lifecycle as a real recognizer, so the classification effect watching for that transition fires
identically) **must keep working exactly as it does today**, regardless of which provider is
active or whether any of them are reachable. This is not something the new provider abstraction
gets to simplify or touch. If the new hook wraps three real providers, `simulate()` should still
be a pure, provider-independent code path — same as today's implementation being deliberately
decoupled from the real recognizer object.

## 5. Backend token endpoint — shape left to Code, constraint is fixed

**The constraint (non-negotiable):** ElevenLabs' own documentation is explicit that a raw API key
must never reach browser-side code — anyone opening dev tools could steal it. The recommended
pattern is a backend-issued short-lived, single-use token, with the browser connecting to the
realtime WebSocket using that token (`token` query param) instead of the real `xi-api-key`.

**The shape (explicitly NOT prescribed here — ask Code, per user instruction):** round 21 already
solved an analogous problem for the Haiku classifier — `api/classify.ts` / `api/_classify-core.ts`,
with a Vite dev-middleware path locally and a Vercel serverless function path when deployed, key
living server-side only (`ANTHROPIC_API_KEY`). This handoff does **not** mandate reusing that exact
pattern for ElevenLabs — the user explicitly said "let the code decide, what's the apt thing to do,
he can ask me while we provide handoff to code." **Code should propose the token-endpoint shape
(mirroring `api/classify.ts`'s dev/deployed split, or something else if there's a better fit) and
confirm with the user before building it**, rather than the user or this handoff dictating it
unilaterally. The one fixed constraint is: `ELEVENLABS_API_KEY` (or whatever it's named) must live
server-side only, exactly like `ANTHROPIC_API_KEY` does today — never in the client bundle.

## 6. Language/dropdown — existing mechanism, don't break it

`AmberPanel.tsx`'s `SPEECH_LANGUAGES` (2 options: English → `en-IN`, Hindi → `hi-IN`) and the
`speechLangLabel`/`speechLang` state (lines 140-145) currently feed a BCP-47 tag straight into
`useSpeechRecognition(lang)`. Whatever the new hook's ElevenLabs path does with this tag (ElevenLabs
uses its own language codes — `hi`, `en`, or `hi_en` for Hinglish, not BCP-47 — confirmed in
Reverie's docs pattern, likely similar for ElevenLabs, **Code should verify ElevenLabs' actual
accepted `language_code` values** rather than assuming a 1:1 mapping exists), the dropdown itself,
its 2 options, and the agent-facing UI stay unchanged. This is a mapping-layer concern inside the
new hook, not a UI change.

## 7. Explicit non-changes

- SIM Circle Mismatch, Premium Address Risk, Farmer tree question/routing logic (`tree.ts`):
  completely untouched — this handoff is purely about the audio-capture layer beneath all three,
  not the classification or routing logic built on round 21's Haiku work.
- Round 21's Haiku classifier (`classify.ts`, `api/classify.ts`): untouched — a different
  pipeline (text transcript → bucket classification) from this one (audio → text transcript).
  This handoff produces the transcript that round 21's classifier then consumes; it doesn't change
  how that classifier works.
- Rounds 22/23 (persona data, universal unclear bucket, Case Summary, Retake): untouched, unrelated
  layer.
- `useSpeechRecognition.ts` itself: not deleted, not modified in its own logic — it becomes one of
  three providers behind the new abstraction, but its own Web Speech API implementation stays as-is.

## 8. Open items — confirm with the user before/while building, don't guess

- **Backend token-endpoint shape** (§5) — explicitly deferred to a Code↔user conversation, not
  decided here.
- **ElevenLabs' actual `language_code` values and whether a Hinglish-equivalent mode exists** (§6)
  — verify against ElevenLabs' real docs rather than assuming Reverie's `hi_en` pattern carries
  over; if no direct equivalent exists, decide what `hi-IN`/`en-IN` from the existing dropdown
  should map to.
- **Real human-voice test** (§1) — flagged as deferred, not skipped; confirm this happens before
  treating STT quality as fully validated for the live GFF demo.
- **GCP tier's actual wiring** — per the bridging doc, blocked on Cashfree IT (SSL proxy issue,
  unresolved). Build the abstraction slot; do not attempt real GCP integration work until a key
  exists — there's nothing to test against yet.
