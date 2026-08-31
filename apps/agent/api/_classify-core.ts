/**
 * Shared classification logic — imported by both the Vite dev middleware
 * (vite.config.ts, for `npm run dev`) and the Vercel serverless function
 * (classify.ts, for the deployed app). Runs server-side only in both cases,
 * so the Anthropic key never reaches the client bundle.
 *
 * Round 21 (§2): rewritten from a generic "return JSON with a confidence
 * number" prompt to the rubric-style prompt specced — real per-bucket
 * definitions (not just labels), and an explicit "unclear" escape hatch
 * instead of a forced, possibly-wrong guess. Only the client (classify.ts)
 * decides when this gets called at all — currently the farmer tree only,
 * see its routing comment — so "farmer" in the prompt text below is a
 * scope choice made there, not hardcoded by this function's own logic:
 * this function itself stays generic over whatever taps/definitions it's
 * given.
 *
 * No numeric confidence is requested or returned by the model any more —
 * round 21's prompt doesn't ask for one, so a fixed MATCH_CONFIDENCE
 * stands in for any real match, the same pattern the keyword-matching
 * classifier (classify.ts) already uses.
 *
 * Round 25 (§1): the escape-hatch sentinel was the literal word "unclear"
 * until this round — round 23 then gave the farmer tree's shared catch-all
 * bucket the tap id `unclear` too, so a model correctly picking that bucket
 * and a model genuinely giving up produced the exact same string. Confirmed
 * with a real live call (not guessed): both a legitimate catch-all case and
 * a truly garbled transcript returned the literal text "unclear" — the old
 * parsing (`/^unclear$/i`) treated either one as "no match," so the
 * catch-all bucket could never actually be suggested any more, only ever
 * degrade. Fixed by moving the escape hatch to `NO_MATCH_SENTINEL`, a
 * string that can never collide with a real (snake_case, lowercase) tap id.
 *
 * Round 27: a second, more serious real-world reliability bug, found the
 * same way — real live calls, not a code read. Despite the prompt's own
 * "Respond with only the bucket id" instruction, Haiku doesn't always
 * comply: sampled 8 real calls against the identical transcript/prompt and
 * got a clean bucket id back only ~2 of 8 times — the rest opened with an
 * unrequested explanatory preamble ("The applicant said \"...\" which
 * means...") that `max_tokens: 20` then truncated mid-sentence, before the
 * model ever reached the actual id. The old exact-match parsing correctly
 * treated that truncated ramble as unparseable and returned `null` — not a
 * parsing bug this time, a prompt-compliance one. Fixed with defense in
 * depth rather than betting on the model always complying: (1) the prompt
 * now explicitly forbids any preamble/restating the answer, (2)
 * `max_tokens` raised so a ramble that still happens has room to actually
 * finish and state the id rather than being cut off first, and (3) parsing
 * now searches the full raw response for a bucket id or the sentinel
 * anywhere in it (not just an exact match after trimming), so a compliant
 * model's answer keeps working exactly as before while a non-compliant
 * one's answer still parses correctly as long as the id it eventually
 * states didn't itself get cut off.
 *
 * Round 30 (§1): neither fetch below had any timeout — a stalled connection
 * (not a clean HTTP error, an actual hang) never resolved or rejected, so
 * the caller's `Promise.all` in `AmberPanel.tsx` never settled and the UI
 * sat on `flowState === 'processing'` forever, never even reaching the
 * degraded fallback. Both calls now race the real fetch against an
 * `AbortController` timeout; an abort is treated exactly like any other
 * failure (returns `null`), so every existing caller-side degraded-mode
 * handling applies unchanged — no client-side change needed for this item.
 */
const NO_MATCH_SENTINEL = 'NO_MATCH';

/** Round 30 (§1): 8-10s is generous for a Haiku call under normal conditions; long enough not to false-positive on real latency, short enough that a genuine hang doesn't leave the UI stuck. */
const FETCH_TIMEOUT_MS = 9000;

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    // Covers both a genuine network failure and our own timeout abort — either way, the caller's existing "fetch failed" handling (return null) is correct.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface ClassifyTap {
  id: string;
  label: string;
  /** Round 21: what actually distinguishes this bucket, written for a model rather than an agent reading a button. Falls back to `label` if unset. */
  definition?: string;
}

export interface ClassifyResult {
  bucketId: string;
  confidence: number;
}

const MODEL = 'claude-haiku-4-5-20251001';

/** Fixed stand-in confidence for any real classifier match — the prompt no longer asks the model for a graded score, matching how the keyword classifier already reports a match. */
const MATCH_CONFIDENCE = 0.9;

export async function classifyWithClaude(
  apiKey: string,
  question: string,
  transcript: string,
  taps: ClassifyTap[],
): Promise<ClassifyResult | null> {
  const bucketList = taps.map((t) => `- ${t.id}: ${t.definition ?? t.label}`).join('\n');
  const prompt = [
    `You are classifying a farmer's spoken answer into exactly one bucket for the question: "${question}"`,
    '',
    'Buckets:',
    bucketList,
    '',
    `Applicant said: "${transcript}"`,
    '',
    `If the answer doesn't clearly satisfy any specific bucket above (e.g. names a crop but says nothing about ownership), first check whether one of the buckets above is itself a general catch-all for vague, unclear, or unidentifiable answers — its definition will say something like "doesn't clearly fit any of the other buckets." If one exists, respond with THAT bucket's id — a vague answer choosing the catch-all bucket is a real, confident classification, not a failure. Only respond "${NO_MATCH_SENTINEL}" if no such catch-all bucket is offered above, or the answer is unusable even for it (empty, garbled, or entirely unrelated to the question).`,
    '',
    `Respond with ONLY the bucket id, or ONLY "${NO_MATCH_SENTINEL}" — a single token, nothing else. Do not explain your reasoning, do not restate or translate the applicant's answer, do not add any preamble or punctuation. Your entire response must be exactly one of the bucket ids listed above, or exactly "${NO_MATCH_SENTINEL}".`,
  ].join('\n');

  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      // Round 27: was 20 — too tight. The model doesn't always comply with
      // "respond with only the id"; when it opens with an explanation
      // instead, 20 tokens cuts it off before it ever reaches the actual
      // answer. Raised so a ramble that still happens has room to finish.
      max_tokens: 60,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res || !res.ok) return null;

  const data = (await res.json()) as { content?: { text?: string }[] };
  const raw = (data.content?.[0]?.text ?? '').trim();
  if (!raw) return null;

  // The common, well-behaved case: the model followed instructions and
  // responded with only the id (stray quotes/punctuation stripped
  // defensively). Checked first since it's the cheapest and most precise.
  const cleaned = raw.replace(/^["'`.\s]+|["'`.\s]+$/g, '');
  if (cleaned.toUpperCase() === NO_MATCH_SENTINEL) return null;
  const exact = taps.find((t) => t.id.toLowerCase() === cleaned.toLowerCase());
  if (exact) return { bucketId: exact.id, confidence: MATCH_CONFIDENCE };

  // Round 27: the model doesn't always comply — confirmed with real calls
  // that it sometimes wraps the id in an explanatory sentence instead of
  // returning it bare. Fall back to searching the full response for the
  // sentinel or a bucket id as a whole-word match, so a real answer buried
  // in a preamble still resolves correctly instead of silently degrading.
  if (new RegExp(`\\b${NO_MATCH_SENTINEL}\\b`, 'i').test(raw)) return null;
  const found = taps.find((t) => new RegExp(`\\b${t.id}\\b`, 'i').test(raw));
  if (!found) return null;
  return { bucketId: found.id, confidence: MATCH_CONFIDENCE };
}

/**
 * Round 28 — a second, separate, equally narrow call: extracts the literal
 * acreage number the applicant actually stated, for `land_area` only.
 * Deliberately NOT folded into `classifyWithClaude`'s single call (see
 * `tree.ts`'s `FARMER_ACREAGE_RANGE` comment for the full reasoning) — round
 * 27 spent real effort narrowing that call's contract to one bare token;
 * asking it to also reliably return a second field would loosen exactly
 * what that fix hardened. This call has the same narrow, single-token
 * contract, just for a different piece of information, and reuses round
 * 27's defensive parsing pattern (search the full response, don't require
 * an exact match) for the same reason it mattered there — the model doesn't
 * always comply with "respond with only X" on the first try.
 *
 * Edge case decided explicitly, per the handoff's own ask not to leave it
 * implicit: when the applicant states a RANGE ("three to four acres"), this
 * returns the midpoint of that range, not either endpoint — consistent with
 * how every other acreage figure in this file is already a representative
 * midpoint, not a boundary value.
 *
 * Round 30 (§4): this reopens Handoff 28 §7's explicit hold on regional land
 * units (bigha, gaz, kanal, ...) — that hold was about not building a
 * hardcoded, state-varying conversion table, not about never handling these
 * units at all. Live testing found the model was already silently
 * converting them on its own judgment, ungoverned. Decided direction: let
 * the LLM do the conversion, but name the specific state it should reason
 * against (threaded from the persona's own `declaredAddress`) rather than
 * leaving it to guess which state's convention applies. Still no hardcoded
 * conversion table anywhere in this codebase — the conversion knowledge
 * lives entirely in the model, only the state it's told to apply is ours.
 */
const ACREAGE_NO_MATCH_SENTINEL = 'NONE';

export async function extractAcreageAcres(apiKey: string, question: string, transcript: string, state?: string): Promise<number | null> {
  const stateLine = state
    ? `The applicant is in the state of ${state}. If they state a regional land unit (e.g. bigha, gaz, kanal, or similar) rather than acres, convert it to acres using ${state}'s standard local size for that unit before answering.`
    : `If the applicant states a regional land unit (e.g. bigha, gaz, kanal, or similar) rather than acres and no state is known to convert it against, treat that as unable to produce a confident figure.`;
  const prompt = [
    `You are extracting a literal land-area figure, in acres, from a farmer's spoken answer to the question: "${question}"`,
    '',
    `Applicant said: "${transcript}"`,
    '',
    stateLine,
    '',
    `If the applicant stated one clear number of acres (or a regional unit convertible per the above), respond with just that number in acres (e.g. "4"). If the applicant stated a range (e.g. "three to four acres"), respond with the midpoint of that range (e.g. "3.5"), not either endpoint. If no single clear acreage figure can be extracted — the applicant was vague, gave no number, used a regional unit with no state to convert it against, or the answer doesn't address land area at all — respond with exactly "${ACREAGE_NO_MATCH_SENTINEL}".`,
    '',
    `Respond with ONLY the number, or ONLY "${ACREAGE_NO_MATCH_SENTINEL}" — a single token, nothing else. Do not explain your reasoning, do not restate the applicant's answer, do not add units or punctuation.`,
  ].join('\n');

  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 60,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res || !res.ok) return null;

  const data = (await res.json()) as { content?: { text?: string }[] };
  const raw = (data.content?.[0]?.text ?? '').trim();
  if (!raw) return null;

  const cleaned = raw.replace(/^["'`.\s]+|["'`.\s]+$/g, '');
  if (cleaned.toUpperCase() === ACREAGE_NO_MATCH_SENTINEL) return null;
  const exactNum = Number(cleaned);
  if (cleaned !== '' && !Number.isNaN(exactNum)) return exactNum;

  // Same defense-in-depth as classifyWithClaude — the model doesn't always
  // reply bare, so search the full response before giving up.
  if (new RegExp(`\\b${ACREAGE_NO_MATCH_SENTINEL}\\b`, 'i').test(raw)) return null;
  const match = raw.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  return Number(match[0]);
}
