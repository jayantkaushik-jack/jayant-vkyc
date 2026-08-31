/**
 * Round 18 (HIGH PRIORITY): replaced the original generic-LLM-prompt
 * classifier with keyword/phrase matching, since no LLM key existed for
 * this build at the time. Round 21 (§2) partially reverses that: a
 * provisioned Anthropic key means the farmer tree now classifies via a real
 * Claude Haiku call (see `classifyViaHaiku` below, hitting `/api/classify`
 * -> `api/_classify-core.ts`, server-side only). Keyword matching stays in
 * place for the SIM and premium-address trees — round 21's own prompt and
 * bucket-definition ask is written entirely in farmer-tree terms ("You are
 * classifying a farmer's spoken answer...", bucket defs "pulled from round
 * 18's cue tables — q1 through q3_alt", and its definition-of-done cites
 * round 18b's farmer-only test suite). Nothing in that handoff accounts for
 * SIM or premium-address, so extending the Haiku call to them would be
 * unrequested scope — and round 20's keyword-based catch-all cues for those
 * two trees are recent, tested, and already correct; there's no reason to
 * put them through an unproven path. `treeId` is how the two paths are
 * told apart — see `classifyAnswer` below.
 *
 * Which questions this file still owns (SIM + premium-address; farmer now
 * classifies server-side): round 20 (§1) added cues for the catch-all/
 * uncertainty buckets across all three trees, described below in
 * `BUCKET_RULES`. An unmatched bucket id simply returns no match, the same
 * safe fallback as before. Simulate mode is unaffected either way, since it
 * bypasses this function entirely.
 */

export interface ClassifyTap {
  id: string;
  label: string;
  /** Round 21: per-bucket rubric line for the Haiku classifier — unused on this file's own keyword-matching path, only threaded through to the farmer/server path below. */
  definition?: string;
}

export interface ClassifyResult {
  bucketId: string;
  confidence: number;
}

/** Returned for any real keyword match — comfortably above AmberPanel's 0.6 confidence threshold; there's no graded scoring, a cue either fires or it doesn't. */
const MATCH_CONFIDENCE = 0.95;

/**
 * One rule (a flat cue list — "any cue present" is a match) per bucket id,
 * scoped to the node it belongs to only by which `taps` list the caller
 * passes in. Farmer-tree bucket ids were removed from this table in round
 * 21, now that the farmer tree classifies via Haiku instead (see file
 * header) — what's left here is SIM and premium-address only, plus the two
 * bucket ids those trees share with the (now server-side) farmer
 * vocabulary: `other` (also a SIM b2/b3 tap) and `does_not_know` (also a
 * SIM r3 / premium addr_landmark tap) — kept, since removing them would
 * silently break those trees' still-active keyword matching.
 */
const BUCKET_RULES: Record<string, string[]> = {
  // SIM tree
  vague: ['पता नहीं', 'पक्का नहीं', 'समझ नहीं आया', 'यकीन नहीं'],
  still_vague: ['पता नहीं', 'पक्का नहीं', 'समझ नहीं आया', 'यकीन नहीं'],
  dur_cannot_recall: ['याद नहीं'],
  ret_cannot_recall: ['याद नहीं'],
  prefers_not: ['नहीं बताना चाहता', 'कहना नहीं चाहता', 'बताना नहीं चाहता'],
  // Shared: SIM r3's "does anyone know if family lived elsewhere" catch-all,
  // premium-address addr_landmark's "does not know the area" catch-all.
  does_not_know: ['पता नहीं', 'मालूम नहीं', 'नहीं पता'],
  // Premium-address tree
  not_sure: ['पता नहीं', 'यकीन नहीं', 'ठीक से पता नहीं'],
  cannot_recall: ['याद नहीं'],
  // Shared: SIM b2/b3's "OTHER" catch-all — same generic "didn't understand" phrasing works fine here even though it was originally authored for farmer q1's now-removed "other" bucket.
  other: ['समझ नहीं आया', 'क्या पूछ रहे हैं', 'पता नहीं'],
};

/**
 * Chrome's Hindi speech recognition doesn't reliably produce nuqta-marked
 * consonants (ज़/ग़/ख़/फ़/क़, used for Persian/Urdu-origin loanwords like
 * ज़मीन "land" or ज़रूरत "need") — the live transcript that surfaced this
 * came back as plain "जमीन", not "ज़मीन". Every cue in this file that uses
 * a nuqta letter would silently never match real speech without this: both
 * the transcript and the cue table are normalized (nuqta stripped) before
 * comparing, so ज़/ज are treated as the same letter either way.
 */
const NUQTA = '़';
function normalizeHindi(text: string): string {
  return text.replace(new RegExp(NUQTA, 'g'), '');
}

function ruleMatches(cues: string[], transcript: string): boolean {
  const t = normalizeHindi(transcript);
  return cues.some((cue) => t.includes(normalizeHindi(cue)));
}

/**
 * Round 21 (§2): the farmer tree's real classifier — a server-side Claude
 * Haiku call, since the key never reaches the client bundle (see
 * `api/_classify-core.ts`'s header). Failure of any kind (no key
 * configured, network error, malformed response) falls back to `null` —
 * the same degraded/manual-selection UX any other classification miss
 * already produces, not a crash.
 */
async function classifyViaHaiku(question: string, transcript: string, taps: ClassifyTap[]): Promise<ClassifyResult | null> {
  try {
    const res = await fetch('/api/classify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question, transcript, taps }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { bucketId: string | null; confidence: number };
    if (!data.bucketId) return null;
    return { bucketId: data.bucketId, confidence: data.confidence };
  } catch {
    return null;
  }
}

/**
 * Round 28 — the acreage-extraction sibling to `classifyViaHaiku`: a
 * separate, equally narrow server-side Haiku call (`/api/extract-acreage` ->
 * `api/_classify-core.ts`'s `extractAcreageAcres`) that pulls a literal
 * acres figure out of the `land_area` transcript specifically. Only ever
 * called for that one node — see `AmberPanel.tsx`'s call site. Same failure
 * contract as `classifyViaHaiku`: any failure (no key, network error,
 * malformed response) returns `null`, which the caller already treats as
 * "no confident figure, fall back to the bucket midpoint" — not a crash.
 *
 * Round 30 (§4) — optional `state`, the applicant's declared state (from
 * `persona.declaredAddress`), threaded through so the server-side prompt can
 * name which state's regional land-unit conventions (bigha, gaz, kanal, ...)
 * to reason against instead of guessing. Omitting it just means the prompt
 * has no state to convert against — same "no confident figure" fallback as
 * today for that case, not a new failure mode.
 */
export async function extractAcreage(question: string, transcript: string, state?: string): Promise<number | null> {
  try {
    const res = await fetch('/api/extract-acreage', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question, transcript, state }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { acres: number | null };
    return data.acres ?? null;
  } catch {
    return null;
  }
}

/**
 * `treeId` (round 21): decides which classifier actually runs — see the
 * file header for why this is scoped to the farmer tree specifically.
 * Optional and defaults to the keyword path, so every pre-round-21 call
 * site (and the SIM/premium-address trees, which never pass a matching id)
 * keeps behaving exactly as before.
 */
export async function classifyAnswer(
  question: string,
  transcript: string,
  taps: ClassifyTap[],
  treeId?: string,
): Promise<ClassifyResult | null> {
  if (!transcript.trim()) return null;

  if (treeId === 'farmer_income_mismatch') {
    return classifyViaHaiku(question, transcript, taps);
  }

  for (const tap of taps) {
    const cues = BUCKET_RULES[tap.id];
    if (cues && ruleMatches(cues, transcript)) {
      return { bucketId: tap.id, confidence: MATCH_CONFIDENCE };
    }
  }
  return null;
}
