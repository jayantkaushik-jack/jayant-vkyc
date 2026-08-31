/**
 * Round 24 (§6) — verified against ElevenLabs' real API reference before
 * writing this, not assumed: Scribe v2 Realtime's `language_code` param is
 * ISO 639-1 (`hi`, `en`), not the BCP-47 tags (`hi-IN`, `en-IN`) this app's
 * existing `SPEECH_LANGUAGES` dropdown already produces via `languageToTag`
 * — so this is a plain "drop the region suffix" mapping, not a lookup
 * table that could silently miss a value.
 *
 * There is no ElevenLabs Hinglish-equivalent `language_code` for
 * speech-to-text input (unlike Reverie's `hi_en`, which the original
 * handoff speculated might carry over) — Scribe v2 handles Hindi/English
 * code-switching natively within a single stream regardless of which
 * single code is set, per ElevenLabs' own docs. A `hinglish_mode` flag does
 * exist, but it's an Agents/TTS *response-generation* setting (how an
 * agent's spoken reply is phrased), not an STT input parameter — it has no
 * bearing on transcribing what the applicant said, so it isn't used here.
 */
export function toElevenLabsLanguageCode(bcp47Tag: string): string {
  return bcp47Tag.split('-')[0];
}
