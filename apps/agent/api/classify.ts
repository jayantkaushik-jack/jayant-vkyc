import { classifyWithClaude, type ClassifyTap } from './_classify-core.js';

/**
 * Vercel serverless function (Node runtime). Local dev never hits this file
 * — see the matching middleware in vite.config.ts — this is only exercised
 * on a Vercel deploy, where ANTHROPIC_API_KEY is set as a project env var.
 *
 * First real-world deploy (round 39) found a genuine crash here —
 * `FUNCTION_INVOCATION_FAILED` on every call, confirmed live: a clear
 * "rice, own land" transcript degraded straight to Unclear instead of
 * matching `food_grain_own`, and a direct `fetch('/api/classify')` from
 * the deployed page returned the same crash. Root cause: `package.json`
 * declares `"type": "module"` (real Node ESM), but this file's own import
 * of `./_classify-core` had no extension — fine under Vite's dev-only
 * resolution (which is all this code path had ever run under before this
 * round), not fine under Node's native ESM resolver, which requires an
 * explicit extension on relative imports. `extract-acreage.ts` and
 * `stt-token.ts` had the identical bug, fixed the same way.
 */
export default async function handler(
  req: { method?: string; body?: unknown },
  res: {
    status: (code: number) => { json: (body: unknown) => void };
  },
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on this deployment' });
    return;
  }

  const body = (req.body ?? {}) as { question?: string; transcript?: string; taps?: ClassifyTap[] };
  const { question, transcript, taps } = body;
  if (!question || !transcript || !Array.isArray(taps)) {
    res.status(400).json({ error: 'Missing question, transcript, or taps' });
    return;
  }

  const result = await classifyWithClaude(apiKey, question, transcript, taps);
  res.status(200).json(result ?? { bucketId: null, confidence: 0 });
}
