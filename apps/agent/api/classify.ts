import { classifyWithClaude, type ClassifyTap } from './_classify-core';

/**
 * Vercel serverless function (Node runtime). Local dev never hits this file
 * — see the matching middleware in vite.config.ts — this is only exercised
 * on a Vercel deploy, where ANTHROPIC_API_KEY is set as a project env var.
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
