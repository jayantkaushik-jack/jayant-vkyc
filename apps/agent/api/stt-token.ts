import { issueSttToken } from './_stt-token-core.js';

/**
 * Vercel serverless function (Node runtime). Local dev never hits this file
 * — see the matching middleware in vite.config.ts — this is only exercised
 * on a Vercel deploy, where ELEVENLABS_API_KEY is set as a project env var.
 */
export default async function handler(
  req: { method?: string },
  res: {
    status: (code: number) => { json: (body: unknown) => void };
  },
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ELEVENLABS_API_KEY is not configured on this deployment' });
    return;
  }

  const result = await issueSttToken(apiKey);
  if (!result) {
    res.status(502).json({ error: 'ElevenLabs token issuance failed' });
    return;
  }
  res.status(200).json(result);
}
