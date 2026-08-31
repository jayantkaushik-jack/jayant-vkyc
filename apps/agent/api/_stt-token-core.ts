/**
 * Round 24 — shared token-issuance logic, mirroring `_classify-core.ts`'s
 * split: imported by both the Vite dev middleware (`vite.config.ts`, for
 * `npm run dev`) and the Vercel serverless function (`stt-token.ts`, for the
 * deployed app). Runs server-side only in both cases, so the real
 * ElevenLabs API key never reaches the client bundle.
 *
 * ElevenLabs' own docs are explicit that a raw `xi-api-key` must never be
 * used from the browser — the recommended pattern is a backend-issued,
 * short-lived, single-use token (`POST /v1/single-use-token/{token_type}`),
 * which the browser then passes as a `token` query param when opening the
 * realtime WebSocket instead of the real key. That's exactly what this
 * function does, for the `realtime_scribe` token type (Scribe v2 Realtime
 * speech-to-text) specifically — confirmed against ElevenLabs' API
 * reference before building, not assumed.
 */

export interface SttTokenResult {
  token: string;
}

const TOKEN_TYPE = 'realtime_scribe';

export async function issueSttToken(apiKey: string): Promise<SttTokenResult | null> {
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/single-use-token/${TOKEN_TYPE}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: string };
    if (!data.token) return null;
    return { token: data.token };
  } catch {
    return null;
  }
}
