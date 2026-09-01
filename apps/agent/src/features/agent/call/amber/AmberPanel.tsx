import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, Mic, Eye, AlertCircle, HelpCircle, ArrowRightLeft } from 'lucide-react';
import { cn } from '@vkyc/shared/lib/cn';
import type { AmberPersona } from './personas';
import {
  getTree,
  getNode,
  getVerdict,
  resolveBranchA,
  resolveFarmerCalc,
  resolveFarmerCalcSoftened,
  resolveFarmerEquipment,
  resolveFarmerIncomeExplained,
  FARMER_ACREAGE_RANGE,
  type Verdict,
  type Tap,
  type QuestionNode,
  type PathEntry,
} from './tree';
import { computeScore, BAND_LABEL } from './scoring';
import { languageToTag } from './useSpeechRecognition';
import { useMultiProviderSpeechRecognition } from './useMultiProviderSpeechRecognition';
import { classifyAnswer, extractAcreage } from './classify';

/** Below this, the classifier's suggestion is discarded — degraded mode: no pre-selection, agent taps unaided. */
const CONFIDENCE_THRESHOLD = 0.6;

/**
 * The agent picks what language they'll actually speak in — this used to be
 * derived from the customer's randomized declared language, which caused
 * Web Speech to mishear English/Hindi speech as Telugu (or whatever the
 * random draw was) and transcribe it phonetically into the wrong script.
 */
const SPEECH_LANGUAGES = [
  { label: 'English', tag: languageToTag('English') },
  { label: 'Hindi', tag: languageToTag('Hindi') },
];

/**
 * Round 2 rebuild — sourced from the Amber Resolution Layer doc's Section 11
 * corner-case table, not invented. Retry-safe reasons stay on this question
 * (no verdict, no penalty); escalation reasons end the tree and route to
 * Review, each behind a one-line routing confirmation before it commits.
 * Round 1's "technical failure / no common language, retry-safe" pairing is
 * gone — round 2's connection-handling framing supersedes it.
 */
type AbortReasonKind = 'retry_ask_repeat' | 'retry_unclear' | 'escalation';

interface AbortReason {
  id: string;
  label: string;
  kind: AbortReasonKind;
  /** Escalation only — shown as a one-line confirmation before the reason commits. */
  routingNote?: string;
}

const ABORT_REASONS: AbortReason[] = [
  { id: 'ask_repeat', label: 'Applicant asks to repeat', kind: 'retry_ask_repeat' },
  { id: 'rambles_unclear', label: 'Applicant rambles / unclear', kind: 'retry_unclear' },
  {
    id: 'distressed_hostile',
    label: 'Applicant distressed or hostile',
    kind: 'escalation',
    routingNote: 'Routing to Review — no penalty to applicant',
  },
  {
    id: 'language_barrier',
    label: "Language the agent can't handle",
    kind: 'escalation',
    routingNote: 'Routing to a language-matched agent or Review',
  },
  {
    id: 'connection_unrecoverable',
    label: 'Connection unrecoverable',
    kind: 'escalation',
    routingNote: 'Routing to Review with partial evidence attached',
  },
  {
    id: 'stt_model_failing',
    label: 'Speech-to-text / model repeatedly failing',
    kind: 'escalation',
    routingNote: 'Routing to Review',
  },
];

/**
 * Mr. Holmes is the name for the AI classifier itself (the same pattern as
 * Intercom's "Fin" or Salesforce's "Einstein") — same backend classifier
 * across all three trees, so the persona isn't tree-specific. Reuses the
 * exact magnifying-glass icon the Progress panel already uses for the
 * Amber Resolution stage, just in its own small circular badge.
 */
function MrHolmesBadge({ size = 11 }: { size?: number }) {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-soft text-primary shrink-0">
      <Search size={size} />
    </span>
  );
}

/**
 * Round 26 — bilingual display, always both visible (confirmed with the
 * user, not a dropdown-driven toggle): the question's Hindi counterpart
 * rendered directly under the English, when the node has one. Only
 * Farmer-tree nodes populate `questionHi` today; SIM/premium-address nodes
 * render exactly as before (no second line).
 *
 * Round 31 — restyled onto the design system's `.qtext`/`.t-question`/
 * `.t-question-hi` classes (cf-design-system.css §"B — the question"): the
 * left brand rule binds the two languages into one visual block per the
 * design handoff's own rule ("a translated line can never read as a
 * separate question"). Content/logic unchanged — same conditional, same
 * fields read.
 */
function QuestionText({ node }: { node: QuestionNode }) {
  return (
    <div className="qtext">
      <h2 className="t-question">{node.question}</h2>
      {node.questionHi && (
        <p className="t-question-hi qtext__hi" lang="hi">{node.questionHi}</p>
      )}
    </div>
  );
}

/**
 * Round 31 — restyled onto `.bucket__en`/`.bucket__hi` (always two stacked
 * `display:block` lines per the design system, never inline) instead of the
 * old ad-hoc Tailwind pair. Same bilingual pattern as `QuestionText`, for a
 * single tap's label wherever it renders.
 */
function TapLabel({ tap }: { tap: Tap }) {
  return (
    <span>
      <span className="bucket__en">{tap.label}</span>
      {tap.labelHi && (
        <span className="bucket__hi" lang="hi">{tap.labelHi}</span>
      )}
    </span>
  );
}

interface AmberPanelProps {
  persona: AmberPersona;
  /** Applicant has a prior attempt on file — question set rotates rather than repeating. */
  hasPriorAttempt?: boolean;
  /**
   * Fires once the tree reaches a terminal outcome. Does not advance the
   * call. Carries the full question-by-question trail alongside the verdict
   * — the Case Summary screen (round 15, §8) needs both, and this is the
   * only place that ever has the complete path in hand.
   */
  onVerdict: (verdict: Verdict, score: number | null, path: PathEntry[]) => void;
  /** Fires when the agent dismisses the resolution screen — safe to advance now. */
  onContinue: () => void;
  onLog: (event: string, detail?: string) => void;
}

/**
 * States 2 (question served) through 4 (resolved). State 1 (queue badge)
 * lives on IncomingCallCard.
 *
 * The suggestion is real: a Claude classification call runs against the
 * finalized speech transcript (see classify.ts) and only pre-selects a
 * bucket above CONFIDENCE_THRESHOLD. Below that, or on any failure, no
 * bucket is pre-selected — the degraded mode from the brief — and the
 * agent taps unaided. The confirm/correct interaction itself is unchanged
 * either way.
 */
/**
 * Five explicit states for the answer -> bucket-confirmation flow (Section
 * 8): awaiting an answer, transcript captured, processing (Mr. Holmes),
 * a bucket suggested and awaiting confirmation (or the degraded no-
 * suggestion variant), and confirmed. Each fully replaces the previous in
 * the question card — no partial overlap.
 */
type FlowState = 'awaiting' | 'transcript' | 'processing' | 'suggested' | 'confirmed';

export function AmberPanel({ persona, hasPriorAttempt, onVerdict, onContinue, onLog }: AmberPanelProps) {
  const tree = useMemo(() => getTree(persona.primaryTreeId), [persona.primaryTreeId]);
  const [speechLangLabel, setSpeechLangLabel] = useState(SPEECH_LANGUAGES[0].label);
  const speechLang = useMemo(
    () => SPEECH_LANGUAGES.find((l) => l.label === speechLangLabel)?.tag ?? SPEECH_LANGUAGES[0].tag,
    [speechLangLabel],
  );
  const speech = useMultiProviderSpeechRecognition(speechLang);
  const [nodeId, setNodeId] = useState(() => (hasPriorAttempt ? tree.rotatedEntryNode : tree.entryNode));
  const [path, setPath] = useState<PathEntry[]>([]);
  const [flowState, setFlowState] = useState<FlowState>('awaiting');
  const [suggestedTapId, setSuggestedTapId] = useState<string | null>(null);
  const [simulatedTapId, setSimulatedTapId] = useState<string | null>(null);
  const [degraded, setDegraded] = useState(false);
  /** Round 30 (§3) — set when the ~150-word STT auto-stop fires on this question; distinct from an ordinary low-confidence degrade so the UI can show "Answer was too long to process" specifically. */
  const [answerTooLong, setAnswerTooLong] = useState(false);
  const [confirmedTapId, setConfirmedTapId] = useState<string | null>(null);
  const [otherNote, setOtherNote] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [dataErrorFlag, setDataErrorFlag] = useState(false);
  const [coachedFlag, setCoachedFlag] = useState(false);
  const [showWhyScript, setShowWhyScript] = useState(false);
  const [abortOpen, setAbortOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [escalationPending, setEscalationPending] = useState<AbortReason | null>(null);
  const [aborted, setAborted] = useState(false);
  const [showHandover, setShowHandover] = useState(false);
  const [handoverAgentName, setHandoverAgentName] = useState('');
  const [handoverNote, setHandoverNote] = useState('');
  const [handoverLog, setHandoverLog] = useState<string[]>([]);
  /**
   * Round 19 introduced this as a one-per-question cap; round 23 removes
   * the cap entirely (Retake is now always available, any number of times)
   * but keeps the state and its `[nodeId]`-keyed reset as inert plumbing —
   * nothing reads it to gate the button any more, but leaving the reset
   * wiring in place avoids touching anything else that effect resets
   * alongside it (`abortOpen`, `escalationPending`).
   */
  const [, setRetakeUsed] = useState(false);
  /**
   * Round 23: the universal "Other / Doesn't know / Unclear" bucket, now
   * inline in every farmer-tree node's taps. Confirming it goes through the
   * normal commit path (same as any other tap — see `advance()`), but
   * instead of resolving straight to a verdict, it pauses here so the agent
   * can attach an optional free-text note before the case actually
   * terminates. `path` already includes the just-confirmed entry for this
   * question by the time this is set (see `advance()`).
   */
  const [unclearPending, setUnclearPending] = useState<{ question: string; path: PathEntry[] } | null>(null);
  const [unclearNote, setUnclearNote] = useState('');
  const generationRef = useRef(0);
  /**
   * Round 28 — the literal acreage figure extracted from land_area's
   * transcript, if any. A ref rather than state since nothing renders off
   * it directly — it's read once in `advance()` when the land_area tap
   * actually commits, then reset for the next question. Doesn't need to
   * survive a retake either: `reAskCurrentQuestion()`'s generation bump
   * already invalidates any in-flight extraction call the same way it does
   * the bucket classification.
   */
  const extractedAcreageRef = useRef<number | null>(null);
  const suggestedCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasPriorAttempt) {
      onLog('PRE-check: previous attempt found', 'Question set rotated — never serve the same questions twice');
    }
    // Only ever fires once per call: nodeId/onLog identity changes shouldn't re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const node = getNode(tree, nodeId);
  /**
   * Round 23: while `unclearPending` is set, `path` already includes the
   * entry for the question currently on screen (see `advance()`'s early
   * return) — so the usual "+1 for the not-yet-recorded current question"
   * would overcount by one and show e.g. "Question 2" while Q1's note box
   * is still open.
   */
  const questionCount = unclearPending ? Math.max(path.length, 1) : Math.max(path.length + (node ? 1 : 0), 1);
  /**
   * Round 23: every farmer-tree node now carries its own inline "Other /
   * Doesn't know / Unclear" tap (id `unclear`) — the free-floating "Other"
   * panel below is SIM/premium-address-only plumbing now, kept only because
   * those two trees are explicitly out of scope this round and some of
   * their nodes (SIM's a2_city; premium's addr_work, addr_living) have no
   * catch-all tap at all otherwise. This check already suppresses it for
   * every farmer node once `unclear` is present, without touching that
   * shared component's behavior for the other two trees.
   */
  const nodeHasOwnOtherTap = node?.taps.some((t) => t.id === 'other' || t.id === 'unclear') ?? false;

  useEffect(() => {
    generationRef.current += 1;
    speech.stop();
    speech.reset();
    setFlowState('awaiting');
    setSuggestedTapId(null);
    setSimulatedTapId(null);
    setDegraded(false);
    setAnswerTooLong(false);
    setConfirmedTapId(null);
    setRetryCount(0);
    setAbortOpen(false);
    setEscalationPending(null);
    setRetakeUsed(false);
    setUnclearPending(null);
    setUnclearNote('');
    extractedAcreageRef.current = null;
    // Fresh question — stop listening, clear the last transcript, and drop
    // any suggestion/counter: they belong to the previous question's answer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  // State A -> B: a finalized transcript (live mic or simulated) arrives.
  useEffect(() => {
    if (speech.status !== 'idle' || !node || flowState !== 'awaiting') return;
    const transcriptText = speech.transcript.trim();
    if (!transcriptText) return;
    onLog('Speech captured (applicant audio)', transcriptText);

    /**
     * Round 30 (§3) — the ~150-word auto-stop fired on this answer. Skip
     * the normal transcript -> processing -> classify path entirely (don't
     * send a possibly rambling/truncated-by-length transcript to the
     * classifier at all) and fall straight into the same degraded
     * Other/Unclear-suggested flow as item 2, distinguished in the UI by
     * `answerTooLong`.
     */
    if (speech.cutoffForLength) {
      onLog('Answer exceeded ~150 words — auto-stopped', transcriptText);
      setAnswerTooLong(true);
      const unclearTap = node.taps.find((t) => t.id === 'unclear');
      setSuggestedTapId(unclearTap ? unclearTap.id : null);
      setDegraded(true);
      setFlowState('suggested');
      return;
    }

    setFlowState('transcript');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.status]);

  // State B -> C: hold the transcript-only view briefly before processing starts.
  useEffect(() => {
    if (flowState !== 'transcript') return;
    const myGeneration = generationRef.current;
    const id = window.setTimeout(() => {
      if (generationRef.current !== myGeneration) return;
      setFlowState('processing');
    }, 500);
    return () => window.clearTimeout(id);
  }, [flowState]);

  // State C -> D: classify (live path) or resolve directly to the operator-
  // picked bucket (simulate path — bypasses classifyAnswer entirely, so it
  // always resolves cleanly regardless of API key status).
  useEffect(() => {
    if (flowState !== 'processing' || !node) return;
    const myGeneration = generationRef.current;
    const transcriptText = speech.transcript.trim();
    const holmesMinHold = new Promise<void>((resolve) => window.setTimeout(resolve, 1800));

    if (simulatedTapId) {
      holmesMinHold.then(() => {
        if (generationRef.current !== myGeneration) return;
        setSuggestedTapId(simulatedTapId);
        setDegraded(false);
        setFlowState('suggested');
        onLog('Bucket suggested (simulated)', simulatedTapId);
      });
      return;
    }

    /**
     * Round 28 — fired alongside the bucket classification, not gating it:
     * a second, separate, equally narrow call that pulls a literal acreage
     * figure out of land_area's own transcript. Only relevant for that one
     * farmer-tree node (see FARMER_ACREAGE_RANGE in tree.ts for the full
     * reasoning). Result lands in a ref, not state — nothing renders off
     * it, `advance()` reads it once the tap actually commits. Doesn't
     * block the Mr. Holmes suggestion UI at all; if it resolves after the
     * agent has already moved on, the generation check below drops it.
     *
     * Round 30 (§4) — now also threads the applicant's declared state
     * (parsed from `persona.declaredAddress`) through, so the extraction
     * prompt can reason about regional land-unit conversions (bigha, gaz,
     * kanal, ...) against the right state's convention instead of guessing.
     */
    if (node.id === 'land_area' && tree.id === 'farmer_income_mismatch') {
      const applicantState = persona.declaredAddress.split(',').pop()?.trim();
      extractAcreage(node.question, transcriptText, applicantState).then((acres) => {
        if (generationRef.current !== myGeneration) return;
        extractedAcreageRef.current = acres;
      });
    }

    Promise.all([classifyAnswer(node.question, transcriptText, node.taps, tree.id), holmesMinHold]).then(([result]) => {
      if (generationRef.current !== myGeneration) return;
      if (result && result.confidence >= CONFIDENCE_THRESHOLD) {
        setSuggestedTapId(result.bucketId);
        setDegraded(false);
        onLog('Bucket suggested by classifier', `${result.bucketId} (confidence ${result.confidence.toFixed(2)})`);
      } else {
        /**
         * Round 30 (§2) — Decided direction (Option B): default the
         * suggestion to this node's Other/Unclear catch-all tap, if it has
         * one, rendered through the same suggested-card Confirm/Retake UI
         * as a real suggestion (distinguished by `degraded` copy) rather
         * than pre-selecting nothing. Requiring a Confirm keeps a human in
         * the loop instead of silently swallowing a case the agent could
         * plainly see the classifier missed. In practice this only ever
         * finds a tap on the farmer tree — SIM/premium-address catch-all
         * buckets use different literal ids (`vague`, `other`,
         * `does_not_know`, ...), so those two trees fall back to `null`
         * exactly as before, unchanged.
         */
        const unclearTap = node.taps.find((t) => t.id === 'unclear');
        setSuggestedTapId(unclearTap ? unclearTap.id : null);
        setDegraded(true);
        onLog(
          'Classifier confidence too low — degraded mode',
          result
            ? `Confidence ${result.confidence.toFixed(2)}, below the ${CONFIDENCE_THRESHOLD} threshold. ${unclearTap ? 'Suggesting Other/Unclear for confirmation.' : 'Agent taps unaided.'}`
            : `Classification unavailable. ${unclearTap ? 'Suggesting Other/Unclear for confirmation.' : 'Agent taps unaided.'}`,
        );
      }
      setFlowState('suggested');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowState]);

  /**
   * Round 20 (§3): the suggested bucket (a real match, or — per §1 — the
   * catch-all bucket standing in for "unclear") can land below the fold,
   * especially further down node.taps lists. Scroll it into view the
   * instant it renders, so the agent's attention lands on it regardless of
   * position. Round 30 (§2): now also fires for the degraded Option-B
   * default suggestion card (any `suggestedTapId`, not just a confident
   * one) — only the plain no-suggestion degraded list (no `unclear` tap on
   * this node) has no single element to scroll to.
   */
  useEffect(() => {
    if (flowState === 'suggested' && suggestedTapId && suggestedCardRef.current) {
      suggestedCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [flowState, degraded, suggestedTapId]);

  function resolveTerminalWithPath(target: string, nextPath: PathEntry[]): Verdict {
    if (target === 'DYNAMIC:branchA') {
      const durationTapId = [...nextPath].reverse().find((p) => p.tapId.startsWith('dur_'))?.tapId ?? 'dur_1to3';
      const returnTapId = [...nextPath].reverse().find((p) => p.tapId.startsWith('ret_'))?.tapId ?? '';
      return resolveBranchA({ persona, durationTapId, returnTapId });
    }
    if (target === 'DYNAMIC:farmerIncomeExplained') {
      return resolveFarmerIncomeExplained({ persona, path: nextPath });
    }
    const id = target.slice('TERMINAL:'.length);
    return getVerdict(tree, id) ?? { id, band: 'HUMAN_REVIEW', reasons: ['Unrecognised outcome — routed to separate review.'] };
  }

  /**
   * ROUTE: targets resolve to another target string (a plain node id, or
   * itself a TERMINAL:/DYNAMIC: string) rather than terminating directly —
   * for routing decisions that need real arithmetic across several prior
   * taps (see resolveFarmerCalc) rather than a static per-branch table.
   */
  function resolveRouteWithPath(target: string, nextPath: PathEntry[]): string {
    if (target === 'ROUTE:farmerCalc') return resolveFarmerCalc({ persona, path: nextPath });
    if (target === 'ROUTE:farmerCalcSoftened') return resolveFarmerCalcSoftened({ persona, path: nextPath });
    if (target === 'ROUTE:farmerEquipment') return resolveFarmerEquipment({ persona, path: nextPath });
    return 'TERMINAL:human_review_route_error';
  }

  function advance(tapId: string, tapLabel: string, corrected: boolean, tapNext: string) {
    if (!node) return;

    /**
     * Round 28 — the agreement check runs here, against the tap id the
     * agent actually confirmed (which can differ from `suggestedTapId` if
     * they corrected it), not at extraction time — this is the earliest
     * point that's known. A validated figure gets attached to the entry;
     * an unvalidated or disagreeing one doesn't, so `deriveFarmerFacts()`
     * downstream never has to re-check the range itself.
     */
    let extractedAcreage: number | undefined;
    if (node.id === 'land_area' && extractedAcreageRef.current !== null) {
      const candidate = extractedAcreageRef.current;
      const range = FARMER_ACREAGE_RANGE[tapId];
      if (range && candidate >= range[0] && candidate <= range[1]) {
        extractedAcreage = candidate;
        onLog('Literal acreage used', `Extracted ${candidate} acres — agrees with confirmed bucket "${tapId}" (${range[0]}–${range[1] === Infinity ? '20+' : range[1]}). Using this instead of the bucket midpoint.`);
      } else if (range) {
        onLog(
          'Acreage disagreement — flagged for review',
          `Extracted ${candidate} acres does not fall within confirmed bucket "${tapId}"'s range (${range[0]}–${range[1] === Infinity ? '20+' : range[1]}) — falling back to the bucket midpoint. Possible STT or self-correction artifact on this answer, not necessarily a bad bucket match.`,
        );
      }
    }

    const entry: PathEntry = {
      nodeId: node.id,
      question: node.question,
      transcript: speech.transcript.trim(),
      tapId,
      tapLabel,
      suggested: suggestedTapId === tapId,
      corrected,
      ...(extractedAcreage !== undefined ? { extractedAcreage } : {}),
    };
    const nextPath = [...path, entry];
    setPath(nextPath);
    onLog(
      corrected ? 'Bucket corrected by agent' : 'Bucket confirmed by agent',
      `${node.question} -> ${tapLabel}`,
    );

    const nextTarget = tapNext.startsWith('ROUTE:') ? resolveRouteWithPath(tapNext, nextPath) : tapNext;

    /**
     * Round 23: the universal unclear bucket doesn't resolve to a verdict
     * immediately like every other TERMINAL: target — it pauses here so the
     * agent can attach an optional free-text note first (§3 of the
     * handoff). `path` already carries this question's entry (appended
     * above), so the trail gap the handoff calls out is closed regardless
     * of whether a note gets typed. See `submitUnclearNote()` for where the
     * verdict actually gets built and `onVerdict` fires.
     */
    if (nextTarget === 'TERMINAL:human_review_unclear_bucket') {
      setUnclearPending({ question: node.question, path: nextPath });
      return;
    }

    if (nextTarget.startsWith('TERMINAL:') || nextTarget.startsWith('DYNAMIC:')) {
      const v = resolveTerminalWithPath(nextTarget, nextPath);
      setVerdict(v);
      setConfirmedTapId(null);
      onLog('Amber case resolved', `${v.band}${v.victimFlag ? ' + victim flag' : ''}`);
      const score = computeScore(v.signals ?? {});
      onVerdict(v, score, nextPath);
      return;
    }

    setNodeId(nextTarget);
    setConfirmedTapId(null);
    setShowOtherInput(false);
    onLog('Question served', getNode(tree, nextTarget)?.question);
  }

  // State D -> E -> next question/resolution: hold the confirmed summary
  // briefly before actually advancing, so State E is visible rather than
  // skipped straight through.
  function commitTap(tap: Tap, corrected: boolean) {
    setConfirmedTapId(tap.id);
    setFlowState('confirmed');
    const myGeneration = generationRef.current;
    window.setTimeout(() => {
      if (generationRef.current !== myGeneration) return;
      advance(tap.id, tap.label, corrected, tap.next);
    }, 700);
  }

  function handleConfirm() {
    if (!node || !suggestedTapId) return;
    const tap = node.taps.find((t) => t.id === suggestedTapId);
    if (!tap) return;
    commitTap(tap, false);
  }

  function handleCorrect(tapId: string) {
    if (!node) return;
    const tap = node.taps.find((t) => t.id === tapId);
    if (!tap) return;
    commitTap(tap, tapId !== suggestedTapId);
  }

  function handleSimulateBucket(tap: Tap) {
    if (flowState !== 'awaiting') return;
    setSimulatedTapId(tap.id);
    speech.simulate(tap.sampleTranscript ?? `Sample answer for ${tap.label}`);
  }

  function handleOtherSubmit() {
    onLog('Answer routed via OTHER', otherNote || '(no note provided)');
    const v: Verdict = {
      id: 'human_review_other',
      band: 'HUMAN_REVIEW',
      reasons: [`Applicant's answer did not fit any bucket. Agent note: "${otherNote || 'none provided'}". Routed to separate review.`],
    };
    setVerdict(v);
    onVerdict(v, null, path);
  }

  /**
   * Round 23: fires once the agent submits (with or without a note) after
   * tapping the universal "Other / Doesn't know / Unclear" bucket — see the
   * interception in `advance()`. Always terminates to
   * `human_review_unclear_bucket`, no path forward, on any farmer node. The
   * note is kept on its own `agentNote` field rather than folded into
   * `reasons`, per §4b of the handoff — it must render as its own labeled
   * block in the Case Summary and only for this specific verdict.
   */
  function submitUnclearNote() {
    if (!unclearPending) return;
    onLog('Answer routed via Unclear bucket', unclearNote.trim() || '(no note provided)');
    const v: Verdict = {
      id: 'human_review_unclear_bucket',
      band: 'HUMAN_REVIEW',
      reasons: [`Applicant's answer to "${unclearPending.question}" did not clearly fit any bucket — routed to separate review.`],
      agentNote: unclearNote,
    };
    setVerdict(v);
    onVerdict(v, null, unclearPending.path);
  }

  // Re-ask on this same question — clears the in-flight answer and the
  // abort accordion, but leaves path/verdict untouched.
  function reAskCurrentQuestion() {
    generationRef.current += 1;
    speech.stop();
    speech.reset();
    setFlowState('awaiting');
    setSuggestedTapId(null);
    setSimulatedTapId(null);
    setDegraded(false);
    setAnswerTooLong(false);
    setAbortOpen(false);
    extractedAcreageRef.current = null;
  }

  /**
   * Round 19: discard the current transcript/result and give the applicant
   * another chance at the same question — immediate, no confirmation
   * dialog (this is a live call). Round 23 removes the one-per-question cap
   * this used to spend — Retake is now a stateless action, usable any
   * number of times on the same question.
   */
  function handleRetake() {
    onLog('Retake used', `${node?.question ?? 'current question'} — discarding attempt, listening again`);
    reAskCurrentQuestion();
  }

  function escalate(reason: AbortReason, detail: string) {
    setAborted(true);
    setAbortOpen(false);
    setEscalationPending(null);
    const v: Verdict = {
      id: 'aborted_escalation',
      band: 'HUMAN_REVIEW',
      reasons: [`${reason.label}. ${detail}`],
    };
    onLog('Amber resolution aborted by agent', `${reason.label} — escalation`);
    setVerdict(v);
    onVerdict(v, null, path);
  }

  function handleAbortReasonTap(reasonId: string) {
    const reason = ABORT_REASONS.find((r) => r.id === reasonId);
    if (!reason) return;

    if (reason.kind === 'retry_ask_repeat') {
      onLog('Applicant asked to repeat', 'Re-asking — retry-safe, no flag');
      reAskCurrentQuestion();
      return;
    }

    if (reason.kind === 'retry_unclear') {
      const nextCount = retryCount + 1;
      setRetryCount(nextCount);
      if (nextCount >= 2) {
        escalate(reason, 'Auto-escalated after a second unclear attempt on this question — no penalty to applicant.');
        return;
      }
      onLog('Applicant unclear — re-asking (1 of 2)', 'A second unclear attempt on this question will auto-escalate to Review');
      reAskCurrentQuestion();
      return;
    }

    // Escalation reasons need a one-line routing confirmation before they commit.
    setEscalationPending(reason);
  }

  function toggleAction(action: 'coached' | 'data_error') {
    if (action === 'coached') {
      setCoachedFlag((f) => !f);
      onLog(coachedFlag ? 'Coaching flag cleared' : 'Applicant appears coached', 'Eyes off-camera, whispering, or long pauses observed');
    }
    if (action === 'data_error') {
      setDataErrorFlag((f) => !f);
      onLog(dataErrorFlag ? 'Data-error flag cleared' : 'Flagged as possible data error', 'Signal may be a porting artifact or bad vendor data');
    }
  }

  function handleHandoverSubmit() {
    if (!handoverAgentName.trim()) return;
    const detail = `To: ${handoverAgentName.trim()}${handoverNote.trim() ? ` — ${handoverNote.trim()}` : ''}`;
    onLog('Handover — case reassigned', detail);
    setHandoverLog((log) => [...log, detail]);
    setShowHandover(false);
    setHandoverAgentName('');
    setHandoverNote('');
    // Deliberately no state reset: path, verdict and flags all survive the handover.
  }

  if (aborted && verdict) {
    return <ResolutionCard verdict={verdict} score={null} onContinue={onContinue} />;
  }

  if (verdict) {
    const score = computeScore(verdict.signals ?? {});
    return <ResolutionCard verdict={verdict} score={score} onContinue={onContinue} />;
  }

  if (!node) return null;

  return (
    <div className="flex flex-col h-full min-h-0" style={{ padding: 'var(--s-4)', gap: 'var(--s-4)' }}>
      {/*
       * Round 31 — Zone A, one context line (design handoff Template F /
       * cf-design-system.css's `.amberbar`), replacing the old two-stacked-
       * banner header. The reference's own comment calls this exact
       * pre-round-31 pattern out by name: "the fired-rules banner repeated
       * at full height on every single question." Content unchanged — same
       * `persona.firedRules`, same quick-flag/handover actions, same
       * question-count math — just consolidated into one strip instead of
       * two, with the quick actions moved in from the old bottom toolbar
       * (PersistentControls) per the reference's own "utilities, not
       * primary actions, so they live in the header strip" rule.
       */}
      <div className="amberbar">
        <span className="chip chip--wa">Amber case</span>
        <span className="t-body-str">Question {questionCount} of 3–5</span>
        <span className="qprogress" aria-label={`Question ${questionCount} of up to 5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <i key={n} className={n < questionCount ? 'is-done' : n === questionCount ? 'is-now' : undefined} />
          ))}
        </span>

        <details style={{ marginLeft: 'auto' }}>
          <summary className="tool-btn" style={{ listStyle: 'none' }}>
            <span className="dim-dot dim-dot--med" aria-hidden="true" />
            {persona.firedRules.length} signal{persona.firedRules.length === 1 ? '' : 's'} being resolved
          </summary>
          <ul style={{ marginTop: 'var(--s-2)', paddingLeft: 'var(--s-4)' }} className="t-small c-muted">
            {persona.firedRules.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </details>

        <span className="row gap-2">
          <button type="button" className="tool-btn" title="Log that the applicant is being coached" onClick={() => toggleAction('coached')}>
            <Eye size={13} /> {coachedFlag ? 'Coached ✓' : 'Coached'}
          </button>
          <button type="button" className="tool-btn" title="Log a data error on the applicant record" onClick={() => toggleAction('data_error')}>
            <AlertCircle size={13} /> {dataErrorFlag ? 'Data error ✓' : 'Data error'}
          </button>
          <button type="button" className="tool-btn" title='Script for "why are you asking me this?"' onClick={() => setShowWhyScript((s) => !s)}>
            <HelpCircle size={13} /> Why asking?
          </button>
          <button type="button" className="tool-btn" title="Hand this call to another agent" onClick={() => setShowHandover(true)}>
            <ArrowRightLeft size={13} /> Handover
          </button>
        </span>

        {handoverLog.length > 0 && (
          <p className="t-small" style={{ color: 'var(--cf-brand-deep)', width: '100%' }}>
            Handed over {handoverLog.length} time{handoverLog.length === 1 ? '' : 's'} — {handoverLog[handoverLog.length - 1]}
          </p>
        )}
      </div>

      {showWhyScript && (
        <div className="card card--pad t-small c-muted" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-1)' }}>
          <p>"These are standard verification questions we are required to ask to confirm we are speaking with you in real time."</p>
          <p style={{ fontStyle: 'italic' }}>If pressed on how we know something: "I don't, that's why I'm asking."</p>
        </div>
      )}
      {showHandover && (
        <div className="card card--pad t-small" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
          <p className="c-muted">Language mismatch or shift change — progress and audit trail survive the handover.</p>
          <input
            className="field__input"
            value={handoverAgentName}
            onChange={(e) => setHandoverAgentName(e.target.value)}
            placeholder="Receiving agent's name"
          />
          <input
            className="field__input"
            value={handoverNote}
            onChange={(e) => setHandoverNote(e.target.value)}
            placeholder="Reason (optional)"
          />
          <div className="row gap-2">
            <button type="button" className="btn btn--secondary" onClick={() => setShowHandover(false)}>Cancel</button>
            <button type="button" className="btn btn--primary" disabled={!handoverAgentName.trim()} onClick={handleHandoverSubmit}>Confirm handover</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <section className="card card--pad" aria-labelledby="qHead">
          <p className="t-eyebrow c-muted" style={{ marginBottom: 'var(--s-3)' }}>Question {questionCount}</p>
          <div style={{ marginBottom: 'var(--s-4)' }}>
            <QuestionText node={node} />
          </div>

          {flowState === 'awaiting' && (
            <SpeechCapture
              speech={speech}
              langLabel={speechLangLabel}
              onLangChange={setSpeechLangLabel}
              taps={node.taps}
              onSimulateBucket={handleSimulateBucket}
            />
          )}

          {/*
           * Round 31 — restyled onto `.quote` (design system §"B/C"): shown
           * once listening stops and a finalized transcript exists, exactly
           * as before (same `flowState !== 'awaiting'` condition) — carries
           * through 'transcript', 'processing', 'suggested' and 'confirmed'
           * unchanged.
           */}
          {flowState !== 'awaiting' && (
            <div className="quote" style={{ marginBottom: 'var(--s-3)' }}>
              <p className="t-eyebrow c-muted" style={{ marginBottom: 4 }}>Applicant said</p>
              <p className="t-body-lg" style={{ fontStyle: 'italic' }}>{speech.transcript}</p>
            </div>
          )}

          {flowState === 'processing' && (
            <div className="machine machine--thinking" style={{ marginBottom: 'var(--s-4)' }}>
              <div className="row gap-3">
                <span className="spinner c-brand" aria-hidden="true" />
                <div className="grow">
                  <p className="t-body-str c-brand">Mr. Holmes is reviewing the response…</p>
                  <p className="t-small c-muted">Matching the applicant's answer to a response bucket</p>
                </div>
              </div>
            </div>
          )}

          {/* Round 30 (§3): the ~150-word auto-stop fired — shown instead of the normal processing/suggestion flow, feeding straight into the degraded Other/Unclear-suggested view below. */}
          {answerTooLong && (
            <div className="card card--warn card--pad" style={{ marginBottom: 'var(--s-4)' }}>
              <p className="t-body-str" style={{ color: 'var(--wa-fg)' }}>Answer was too long to process</p>
              <p className="t-small c-muted" style={{ marginTop: 2 }}>Capped at ~150 words. Confirm Other/Unclear below, or pick a bucket manually.</p>
            </div>
          )}

          {/*
           * Persistent bucket list (round 4, Section B2) — present from the
           * moment the question loads, not just once a suggestion exists.
           * Round 31: restyled onto `.bucketlist`/`.bucket`/`.bucket--catchall`
           * (the catch-all's dashed border is exactly the design system's own
           * "this is a fallback, not a category" language — a direct visual
           * match for the Option-B Other/Unclear default from Handoff 30).
           * Styling/interactivity changes per state; visibility, membership
           * and every handler are unchanged.
           */}
          <div className="row gap-2" style={{ marginBottom: 'var(--s-3)' }}>
            <span className="t-eyebrow c-muted">
              {flowState === 'awaiting' || flowState === 'transcript' || flowState === 'processing'
                ? 'Listening for one of these'
                : flowState === 'confirmed'
                  ? 'Answer recorded'
                  : degraded ? "Mr. Holmes couldn't narrow this down" : 'Mr. Holmes suggests — or choose a different answer'}
            </span>
            <span className="chip chip--neutral chip--mono">{node.taps.length}</span>
          </div>

          {flowState !== 'suggested' ? (
            <div className="bucketlist" style={{ marginBottom: 'var(--s-4)' }}>
              {node.taps.map((tap) => {
                if (flowState === 'awaiting' || flowState === 'transcript' || flowState === 'processing') {
                  return (
                    <div key={tap.id} className={cn('bucket', tap.id === 'unclear' && 'bucket--catchall')} style={{ cursor: 'default', color: 'var(--n-500)' }}>
                      <span className="bucket__radio" aria-hidden="true" />
                      <TapLabel tap={tap} />
                    </div>
                  );
                }
                // flowState === 'confirmed'
                if (tap.id === confirmedTapId) {
                  return (
                    <div key={tap.id} className="bucket" role="radio" aria-checked="true"
                      style={{ borderColor: 'var(--ok-br)', background: 'var(--ok-bg)' }}>
                      <span className="bucket__radio" aria-hidden="true"
                        style={{ borderColor: 'var(--ok-fg)', background: 'var(--ok-fg)', display: 'grid', placeItems: 'center' }}>
                        <Check size={10} color="#fff" strokeWidth={4} />
                      </span>
                      <TapLabel tap={tap} />
                    </div>
                  );
                }
                return (
                  <div key={tap.id} className={cn('bucket', tap.id === 'unclear' && 'bucket--catchall')} style={{ cursor: 'default', opacity: 0.38 }}>
                    <span className="bucket__radio" aria-hidden="true" />
                    <TapLabel tap={tap} />
                  </div>
                );
              })}
            </div>
          ) : (
            /*
             * Round 16 (§9, reconciled): the suggestion is lifted OUT of the
             * list into its own card — round 31's design handoff calls this
             * the same load-bearing decision independently (§8: "if the
             * suggested option is highlighted inside the list, the list
             * changes meaning mid-flow"). Confirmed this already matched;
             * restyled the lifted card onto a plain `.card` (per reference
             * screen 12) instead of a tinted/bordered div, and the remaining
             * options onto `.bucket` so correcting is still one click.
             */
            <div style={{ marginBottom: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
              {/*
               * Round 30 (§2): the banner + Retake only render standalone
               * when degraded mode has NO suggestion to offer at all (no
               * `unclear` tap on this node — SIM/premium-address only in
               * practice). When a suggestion exists, its own card below
               * carries the messaging and the Retake action instead.
               */}
              {degraded && !suggestedTapId && (
                <div>
                  <p className="t-body-str c-muted" style={{ marginBottom: 'var(--s-2)' }}>Mr. Holmes couldn't narrow this down — select manually</p>
                  <button type="button" className="btn btn--secondary btn--sm" onClick={handleRetake}>
                    <Mic size={14} /> Retake — listen again
                  </button>
                </div>
              )}
              {node.taps.map((tap) => {
                if (tap.id === suggestedTapId) {
                  return (
                    <div key={tap.id} ref={suggestedCardRef} className="card card--pad" style={degraded ? undefined : { background: 'var(--cf-brand-050)', borderColor: 'var(--cf-brand-100)' }}>
                      <div className="row gap-2" style={{ marginBottom: 'var(--s-2)' }}>
                        <MrHolmesBadge size={15} />
                        <span className="t-eyebrow" style={{ color: degraded ? 'var(--n-600)' : 'var(--cf-brand)' }}>
                          {degraded ? "Mr. Holmes couldn't narrow this down" : 'Mr. Holmes suggests'}
                        </span>
                      </div>
                      <p className="bucket__en" style={{ fontSize: 16 }}><TapLabel tap={tap} /></p>
                      {degraded && (
                        <p className="t-small c-muted" style={{ marginTop: 'var(--s-2)' }}>Confirm Other/Unclear if that fits, or pick a bucket below.</p>
                      )}
                      <div className="row gap-3" style={{ marginTop: 'var(--s-4)' }}>
                        <button type="button" className="btn btn--primary btn--sheen" onClick={handleConfirm}>Confirm</button>
                        {/*
                         * Round 19: quiet, secondary — Confirm is the
                         * expected default path, Retake here is the
                         * exception. Round 23: uncapped — always available,
                         * any number of times.
                         */}
                        <button type="button" className="link-btn" onClick={handleRetake}>Not what they said? Retake</button>
                      </div>
                    </div>
                  );
                }
                return (
                  <button
                    key={tap.id}
                    type="button"
                    className={cn('bucket', tap.id === 'unclear' && 'bucket--catchall')}
                    role="radio"
                    aria-checked="false"
                    onClick={() => handleCorrect(tap.id)}
                  >
                    <span className="bucket__radio" aria-hidden="true" />
                    <TapLabel tap={tap} />
                  </button>
                );
              })}
            </div>
          )}

          {/*
           * Round 23 §3: the universal unclear bucket's optional note step.
           * The bucket tile itself was already confirmed via the normal
           * commit path (see `advance()`) — this doesn't gate or replace
           * that; it's an additional step attached to the terminal action,
           * shown once the case has already committed to terminating.
           */}
          {unclearPending && (
            <div style={{ marginTop: 'var(--s-4)', paddingTop: 'var(--s-3)', borderTop: '1px solid var(--n-100)', display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
              <p className="t-small c-muted">
                Routing to separate review. Optionally add a note for the reviewer before submitting.
              </p>
              <textarea
                value={unclearNote}
                onChange={(e) => setUnclearNote(e.target.value)}
                placeholder="Free-text note (low friction — this must never be harder than picking a near-miss bucket)"
                className="field__input"
                style={{ height: 64, resize: 'none' }}
              />
              <button type="button" className="btn btn--secondary" onClick={submitUnclearNote}>Confirm and Route to Separate Review</button>
            </div>
          )}

          {flowState === 'suggested' && !nodeHasOwnOtherTap && !unclearPending && (
            <div style={{ marginTop: 'var(--s-4)', paddingTop: 'var(--s-3)', borderTop: '1px solid var(--n-100)' }}>
              {!showOtherInput ? (
                <button type="button" className="link-btn" onClick={() => setShowOtherInput(true)}>
                  Other / does not fit any bucket
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
                  <textarea
                    value={otherNote}
                    onChange={(e) => setOtherNote(e.target.value)}
                    placeholder="Free-text note (low friction — this must never be harder than picking a near-miss bucket)"
                    className="field__input"
                    style={{ height: 64, resize: 'none' }}
                  />
                  <button type="button" className="btn btn--secondary" onClick={handleOtherSubmit}>Route to separate review</button>
                </div>
              )}
            </div>
          )}

          {!unclearPending && (
            <AbortAccordion
              open={abortOpen}
              onToggle={() => setAbortOpen((o) => !o)}
              escalationPending={escalationPending}
              onReasonTap={handleAbortReasonTap}
              onEscalationCancel={() => setEscalationPending(null)}
              onEscalationConfirm={() => {
                if (escalationPending) escalate(escalationPending, escalationPending.routingNote ?? 'Routing to Review');
              }}
            />
          )}
        </section>

        {/*
         * Zone D — the trail. Round 31: restyled onto `.trail-row` (the
         * design system's mid-call trail entry — reference screen 13; the
         * richer `.trail-item` with its own quoted "Applicant said" line is
         * reserved for Case Summary specifically, per the round-31 handoff's
         * own §0). Present from the start (empty state with a promise), same
         * as before — content and `path` untouched.
         */}
        <section className="card card--pad" aria-labelledby="trailHead">
          <div className="row gap-2" style={{ marginBottom: 'var(--s-2)' }}>
            <h3 className="t-body-str" id="trailHead">Answer trail</h3>
            <span className="chip chip--neutral chip--mono" style={{ marginLeft: 'auto' }}>{path.length} of 3–5</span>
          </div>
          {path.length === 0 ? (
            <p className="t-small c-faint">
              Every question, the answer heard, and the option you confirmed will be
              recorded here and attached to the case.
            </p>
          ) : (
            <div>
              {path.map((p, i) => (
                <div key={i} className="trail-row">
                  <span className="t-small c-muted">{p.question}</span>
                  <span className={cn('t-small t-body-str', p.corrected && 'c-wa')}>
                    {p.tapLabel}
                    {p.corrected && ' (corrected)'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * Section 9 rebuild: inline collapsed accordion at the bottom of the
 * question card (not a modal) — a red-gray tint and a horizontal rule
 * separate it from the resolution flow above so it never competes with the
 * primary confirm-a-bucket action.
 */
function AbortAccordion({
  open,
  onToggle,
  escalationPending,
  onReasonTap,
  onEscalationConfirm,
  onEscalationCancel,
}: {
  open: boolean;
  onToggle: () => void;
  escalationPending: AbortReason | null;
  onReasonTap: (reasonId: string) => void;
  onEscalationConfirm: () => void;
  onEscalationCancel: () => void;
}) {
  const retrySafe = ABORT_REASONS.filter((r) => r.kind !== 'escalation');
  const escalation = ABORT_REASONS.filter((r) => r.kind === 'escalation');

  return (
    <div style={{ marginTop: 'var(--s-4)', paddingTop: 'var(--s-3)', borderTop: '1px solid var(--n-100)' }}>
      <button type="button" onClick={onToggle} className="link-btn" style={{ color: 'var(--n-600)' }}>
        Unable to resolve · abort call
        <ChevronDown size={14} style={{ transition: 'transform var(--t-micro)', transform: open ? 'rotate(180deg)' : undefined }} />
      </button>
      {open && (
        <div className="card card--pad" style={{ marginTop: 'var(--s-2)', borderColor: 'var(--da-br)', background: 'color-mix(in srgb, var(--da-bg) 45%, white)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
          {escalationPending ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
              <p className="t-body-str" style={{ color: 'var(--da-fg)' }}>{escalationPending.label}</p>
              <p className="t-small c-muted">{escalationPending.routingNote}</p>
              <div className="row gap-2">
                <button type="button" className="btn btn--secondary" onClick={onEscalationCancel}>Cancel</button>
                <button type="button" className="btn btn--danger" onClick={onEscalationConfirm}>Confirm</button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <p className="t-eyebrow c-muted" style={{ marginBottom: 'var(--s-2)' }}>Retry-safe — stays on this question</p>
                <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                  {retrySafe.map((reason) => (
                    <button key={reason.id} type="button" onClick={() => onReasonTap(reason.id)} className="chip chip--neutral" style={{ cursor: 'pointer', border: '1px solid var(--n-200)' }}>
                      {reason.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="t-eyebrow c-muted" style={{ marginBottom: 'var(--s-2)' }}>Escalation — routes to Review</p>
                <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
                  {escalation.map((reason) => (
                    <button key={reason.id} type="button" onClick={() => onReasonTap(reason.id)} className="chip chip--da" style={{ cursor: 'pointer' }}>
                      {reason.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Build step 2: real transcription, no classification yet (that's step 3).
 * The applicant's audio has no real channel in this browser prototype, so
 * the demo captures it off the local microphone standing in for that leg —
 * the agent still taps a bucket manually based on what they hear or read.
 */
function SpeechCapture({
  speech,
  langLabel,
  onLangChange,
  taps,
  onSimulateBucket,
}: {
  speech: ReturnType<typeof useMultiProviderSpeechRecognition>;
  langLabel: string;
  onLangChange: (label: string) => void;
  taps: Tap[];
  onSimulateBucket: (tap: Tap) => void;
}) {
  if (speech.status === 'unsupported') {
    return (
      <div className="card card--flat card--pad t-small c-muted" style={{ borderStyle: 'dashed', marginBottom: 'var(--s-4)' }}>
        Speech-to-text needs Chrome — not supported in this browser. Tap a bucket manually below.
      </div>
    );
  }

  const listening = speech.status === 'listening';

  return (
    <div className={cn('machine', listening && 'machine--listening')} style={{ marginBottom: 'var(--s-4)' }}>
      {/*
       * Round 16 (§9, reconciled) / Round 31: restyled onto `.mic-btn`/
       * `.select`. The manual-bucket dropdown's underlying mechanism
       * (`onSimulateBucket` -> `speech.simulate()`, bypassing live
       * classification entirely) and its disabled-while-listening gating are
       * both unchanged — this is a real stage-reliability fallback, not the
       * reference's own "click a bucket directly" affordance, so it keeps
       * its select-dropdown shape rather than being reworked to match.
       */}
      <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={listening ? speech.stop : speech.start}
          className={cn('mic-btn', listening && 'mic-btn--stop')}
        >
          {listening ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2.2" /></svg>
          ) : (
            <Mic size={17} />
          )}
          {listening ? 'Stop listening' : 'Listen for applicant answer'}
        </button>
        <select
          value={langLabel}
          disabled={listening}
          onChange={(e) => onLangChange(e.target.value)}
          className="select"
          title="Language the mic will listen in — set this to whatever you'll actually speak"
        >
          {SPEECH_LANGUAGES.map((l) => (
            <option key={l.label} value={l.label}>{l.label}</option>
          ))}
        </select>
        <select
          value=""
          disabled={listening}
          onChange={(e) => {
            const tap = taps.find((t) => t.id === e.target.value);
            if (tap) onSimulateBucket(tap);
          }}
          title="Stage-reliability fallback — skips the live mic and network speech recognition entirely"
          className="select"
        >
          <option value="" disabled>Manually choose bucket ▾</option>
          {taps.map((tap) => (
            <option key={tap.id} value={tap.id}>{tap.labelHi ? `${tap.label} — ${tap.labelHi}` : tap.label}</option>
          ))}
        </select>
        {listening && (
          <span className="wave" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></span>
        )}
        {listening && <span className="t-body-str" style={{ color: 'var(--da-fg)' }} role="status">Listening…</span>}
        {speech.status === 'denied' && <span className="t-small" style={{ color: 'var(--da-fg)' }}>Microphone access denied</span>}
        {speech.status === 'error' && <span className="t-small" style={{ color: 'var(--da-fg)' }}>Speech recognition error — try again</span>}
      </div>
      {/*
       * Round 17 (bug 2): during active listening, this was the only live
       * feedback the agent saw — the "Applicant said" quote box only
       * renders once flowState leaves 'awaiting', which doesn't happen
       * until listening actually stops. Showing interimTranscript alone
       * blanked the display every time a phrase finalized (correct Web
       * Speech API behavior — a result leaves the "interim" set the
       * instant it's finalized) and the next phrase's interim result
       * hadn't arrived yet. Fix: show the accumulated final transcript
       * plus whatever's currently in progress, so the text only ever
       * grows during a listening session, never blanks. Round 31: restyled
       * onto `.transcript`/`.transcript__committed`/`.transcript__interim`
       * with a blinking caret while interim text is still coming in.
       */}
      {(speech.transcript || speech.interimTranscript) && (
        <div className="transcript" style={{ marginTop: 'var(--s-3)' }} aria-live="polite">
          <span className="transcript__committed">{speech.transcript}</span>
          {speech.interimTranscript && (
            <>
              <span className="transcript__interim"> {speech.interimTranscript}</span>
              <span className="transcript__caret" aria-hidden="true" />
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Round 36 — restyled onto `cf-design-system.css` (`.card`/`.chip`-family
 * tokens), matching the rest of the Amber flow. Band tint reuses the exact
 * `--ok-*`/`--wa-*`/`--da-*` tokens the queue table's and Risk Snapshot
 * modal's chips already read, applied inline (the same pattern already used
 * for this file's other tinted cards — e.g. the suggested-bucket card,
 * `AbortAccordion`'s red-tinted panel) rather than adding new `.card--ok`/
 * `.card--da` classes for a single call site. Copy, verdict/band logic,
 * `victimFlag`, `hiddenReveal`, and the `isReview` branch are unchanged.
 */
function ResolutionCard({
  verdict,
  score,
  onContinue,
}: {
  verdict: Verdict;
  score: number | null;
  onContinue: () => void;
}) {
  const isReview = verdict.band === 'HUMAN_REVIEW';
  const band = verdict.band === 'HUMAN_REVIEW' ? 'SEPARATE REVIEW REQUIRED' : BAND_LABEL[verdict.band];
  const bandTint =
    verdict.band === 'PROCEED'
      ? { background: 'var(--ok-bg)', borderColor: 'var(--ok-br)', color: 'var(--ok-fg)' }
      : verdict.band === 'BLOCK'
        ? { background: 'var(--da-bg)', borderColor: 'var(--da-br)', color: 'var(--da-fg)' }
        : isReview
          ? { background: 'var(--n-50)', borderColor: 'var(--n-200)', color: 'var(--n-600)' }
          : { background: 'var(--wa-bg)', borderColor: 'var(--wa-br)', color: 'var(--wa-fg)' };

  return (
    <div className="flex flex-col h-full min-h-0" style={{ padding: 'var(--s-4)', overflowY: 'auto' }}>
      <section className="card card--pad">
        <div className="card card--pad" style={{ ...bandTint, marginBottom: 'var(--s-4)' }}>
          <p className="t-eyebrow" style={{ opacity: 0.8, marginBottom: 'var(--s-1)' }}>Resolved</p>
          <p className="t-h1">{band}</p>
          {score !== null && <p className="t-small" style={{ opacity: 0.7, marginTop: 'var(--s-1)' }}>Composite score: {score.toFixed(2)}</p>}
        </div>

        <p className="t-eyebrow c-muted" style={{ marginBottom: 'var(--s-2)' }}>Reasons</p>
        <ul className="t-small" style={{ listStyleType: 'disc', listStylePosition: 'inside', margin: 0, marginBottom: 'var(--s-4)' }}>
          {verdict.reasons.map((r, i) => (
            <li key={i} style={{ marginBottom: i < verdict.reasons.length - 1 ? 'var(--s-1)' : 0 }}>{r}</li>
          ))}
        </ul>

        {verdict.victimFlag && (
          <div className="card card--pad t-small" style={{ background: 'var(--cf-brand-050)', borderColor: 'var(--cf-brand-100)', color: 'var(--cf-brand-deep)', marginBottom: 'var(--s-4)' }}>
            {verdict.victimFlag}
          </div>
        )}

        {isReview && (
          <div className="card card--pad card--flat t-small" style={{ marginBottom: 'var(--s-4)' }}>
            <p className="t-body-str" style={{ marginBottom: 'var(--s-1)' }}>This case exits the call unresolved — no negative score, but not no scrutiny.</p>
            <p className="c-muted">
              Escalated for separate review (rigorous EDD or further documents). That review must be at least as
              rigorous as the automated path here, or "I don't understand" becomes the cheapest way through.
            </p>
          </div>
        )}

        {verdict.hiddenReveal && verdict.hiddenReveal.length > 0 && (
          <div className="card card--pad card--flat t-small">
            <p className="t-eyebrow c-muted" style={{ marginBottom: 'var(--s-1)' }}>Hidden signal (revealed now)</p>
            {verdict.hiddenReveal.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}

        <div style={{ marginTop: 'var(--s-4)', paddingTop: 'var(--s-4)', borderTop: '1px solid var(--n-100)' }}>
          <button type="button" className="btn btn--primary btn--lg btn--sheen" onClick={onContinue}>
            End Session
          </button>
        </div>
      </section>
    </div>
  );
}
