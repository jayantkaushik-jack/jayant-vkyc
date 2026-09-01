import { extractAcreageAcres } from './_classify-core.js';

/**
 * Vercel serverless function (Node runtime). Local dev never hits this file
 * — see the matching middleware in vite.config.ts — this is only exercised
 * on a Vercel deploy, where ANTHROPIC_API_KEY is set as a project env var.
 * Round 28 — same key, same model, separate narrow-contract endpoint from
 * /api/classify (see _classify-core.ts's extractAcreageAcres for why this
 * is a second call rather than folded into the existing one).
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

  const body = (req.body ?? {}) as { question?: string; transcript?: string; state?: string };
  const { question, transcript, state } = body;
  if (!question || !transcript) {
    res.status(400).json({ error: 'Missing question or transcript' });
    return;
  }

  const acres = await extractAcreageAcres(apiKey, question, transcript, state);
  res.status(200).json({ acres });
}
