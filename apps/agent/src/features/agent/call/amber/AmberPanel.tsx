import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Quote, Search, Mic, Eye, AlertCircle, HelpCircle, ArrowRightLeft } from 'lucide-react';
import { Tag } from '@cashfree-intl/cashmere';
import { Button } from '@agent/components/ui/Button';
import { Card } from '@agent/components/ui/Card';
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
 */
function QuestionText({ node }: { node: QuestionNode }) {
  return (
    <>
      <p className={cn('text-lg font-medium', node.questionHi ? 'mb-1' : 'mb-4')}>{node.question}</p>
      {node.questionHi && (
        <p className="text-base text-text-muted mb-4" lang="hi">{node.questionHi}</p>
      )}
    </>
  );
}

/** Same bilingual pattern as `QuestionText`, for a single tap's label wherever it renders — inline-safe (used inside flex rows with icons/checkmarks) since it stays a single inline-block unit. */
function TapLabel({ tap }: { tap: Tap }) {
  return (
    <span className="inline-block align-middle">
      <span>{tap.label}</span>
      {tap.labelHi && (
        <span className="block text-text-muted text-xs mt-0.5" lang="hi">{tap.labelHi}</span>
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
    <div className="flex flex-col h-full min-h-0">
      <div className="px-5 py-2 border-b border-success-subtle bg-success-subtle text-xs text-success-strong font-medium">
        All KYC steps completed. Resolving {persona.firedRules.length} flagged signal{persona.firedRules.length === 1 ? '' : 's'}.
      </div>
      <div className="px-5 pt-4 pb-2 border-b border-warning-border bg-warning-subtle">
        <div className="flex items-center gap-2 mb-1">
          <Tag size="small" type="background" status="warning">AMBER CASE</Tag>
          <span className="text-xs text-text-muted">Question {questionCount} of 3–5</span>
        </div>
        <p className="text-xs text-text-muted mb-1">Fired rules:</p>
        <ul className="text-xs text-warning-text list-disc list-inside">
          {persona.firedRules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        {handoverLog.length > 0 && (
          <p className="text-xs text-accent mt-1">
            Handed over {handoverLog.length} time{handoverLog.length === 1 ? '' : 's'} — {handoverLog[handoverLog.length - 1]}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <Card padding>
          <p className="text-xs uppercase tracking-wide text-text-muted mb-2">Q{questionCount}</p>
          <QuestionText node={node} />

          {flowState === 'awaiting' && (
            <SpeechCapture
              speech={speech}
              langLabel={speechLangLabel}
              onLangChange={setSpeechLangLabel}
              taps={node.taps}
              onSimulateBucket={handleSimulateBucket}
            />
          )}

          {flowState !== 'awaiting' && (
            <div className="mb-4 rounded-lg bg-bg border border-border px-3 py-2.5 flex gap-2">
              <Quote size={14} className="shrink-0 mt-0.5 text-text-muted" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-muted mb-0.5">Applicant said:</p>
                <p className="text-sm italic text-text">{speech.transcript}</p>
              </div>
            </div>
          )}

          {flowState === 'processing' && (
            <div className="mb-4 bg-accent-subtle rounded-lg p-3.5 flex items-center gap-3">
              <span className="relative inline-flex items-center justify-center w-5 h-5 shrink-0">
                <span className="absolute inset-0 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                <MrHolmesBadge size={9} />
              </span>
              <div>
                <p className="text-sm font-medium text-accent">Mr. Holmes is reviewing the response…</p>
                <p className="text-xs text-text-muted">Matching the applicant's answer to a response bucket</p>
              </div>
            </div>
          )}

          {/* Round 30 (§3): the ~150-word auto-stop fired — shown instead of the normal processing/suggestion flow, feeding straight into the degraded Other/Unclear-suggested view below. */}
          {answerTooLong && (
            <div className="mb-4 rounded-lg border border-warning-border bg-warning-subtle px-3.5 py-2.5">
              <p className="text-sm font-medium text-warning-text">Answer was too long to process</p>
              <p className="text-xs text-text-muted mt-0.5">Capped at ~150 words. Confirm Other/Unclear below, or pick a bucket manually.</p>
            </div>
          )}

          {/*
           * Persistent bucket list (round 4, Section B2) — present from the
           * moment the question loads, not just once a suggestion exists.
           * Styling/interactivity changes per state; visibility doesn't.
           */}
          {flowState !== 'suggested' ? (
            <div className="space-y-2">
              {(flowState === 'awaiting' || flowState === 'transcript' || flowState === 'processing') && (
                <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1.5">Listening for one of these responses</p>
              )}
              {node.taps.map((tap) => {
                if (flowState === 'awaiting' || flowState === 'transcript' || flowState === 'processing') {
                  return (
                    <div key={tap.id} className="px-4 py-3 rounded-lg text-sm text-text-muted cursor-default">
                      <TapLabel tap={tap} />
                    </div>
                  );
                }
                // flowState === 'confirmed'
                if (tap.id === confirmedTapId) {
                  return (
                    <div
                      key={tap.id}
                      className="flex items-center gap-2 px-4 py-3 rounded-lg border border-primary bg-primary-soft text-sm font-medium"
                    >
                      <Check size={14} className="text-primary shrink-0" /> <TapLabel tap={tap} />
                    </div>
                  );
                }
                return (
                  <div key={tap.id} className="px-4 py-3 rounded-lg text-sm text-text-muted/40 opacity-40">
                    <TapLabel tap={tap} />
                  </div>
                );
              })}
            </div>
          ) : (
            /*
             * Round 16 (§9, reconciled): the tinted-panel + left-border +
             * radio-indicator treatment applies ONLY here, once a
             * suggestion exists (state D) — confirmed explicitly in the
             * round 16 reconciliation, scoped in component logic rather
             * than applied to the whole list regardless of state. States
             * A-C above keep round 4's original plain treatment.
             */
            <div className="bg-bg rounded-lg p-3.5 space-y-2">
              {/*
               * Round 30 (§2): the banner + Retake now only render here when
               * degraded mode has NO suggestion to offer at all (no `unclear`
               * tap on this node — SIM/premium-address only in practice).
               * When a suggestion exists (a real classifier match, or the
               * Option-B Other/Unclear default), its own card below carries
               * the messaging and the Retake action instead — one element
               * doing the job, not two competing ones.
               */}
              {degraded && !suggestedTapId && (
                <>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-text-muted mb-1.5">
                    <MrHolmesBadge /> Mr. Holmes couldn't narrow this down — select manually
                  </p>
                  {/*
                   * Round 19: equal-weight alternative to manual selection,
                   * not buried — the agent has two legitimate choices here
                   * (give the applicant another chance, or pick manually),
                   * not one primary path and a fallback. Round 23: uncapped
                   * — always available, any number of times.
                   */}
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="inline-flex items-center gap-1.5 mb-1.5 px-3 py-1.5 rounded-full border border-border text-sm font-medium text-text hover:bg-surface"
                  >
                    <Mic size={13} /> Retake — listen again
                  </button>
                </>
              )}
              {node.taps.map((tap) => {
                if (tap.id === suggestedTapId) {
                  return (
                    <div
                      key={tap.id}
                      ref={suggestedCardRef}
                      className={cn(
                        'rounded-lg border-l-[3px] px-4 py-3',
                        degraded ? 'border-text-muted bg-surface' : 'border-primary bg-primary-soft',
                      )}
                    >
                      {/*
                       * Round 30 (§2): distinct copy when this is the
                       * degraded Option-B default rather than a real
                       * classification, so the agent isn't misled into
                       * thinking the model actually recognized the answer.
                       */}
                      <p className={cn('flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide mb-1', degraded ? 'text-text-muted' : 'text-primary')}>
                        <MrHolmesBadge size={10} /> {degraded ? "Mr. Holmes couldn't narrow this down" : 'Mr. Holmes suggests'}
                      </p>
                      <p className="text-sm font-medium mb-3"><TapLabel tap={tap} /></p>
                      {degraded && (
                        <p className="text-xs text-text-muted mb-3">Confirm Other/Unclear if that fits, or pick a bucket below.</p>
                      )}
                      <div className="flex items-center gap-3">
                        <Button size="sm" onClick={handleConfirm}>Confirm</Button>
                        {/*
                         * Round 19: quiet, secondary — Confirm is the
                         * expected default path, Retake here is the
                         * exception (the agent noticing the match doesn't
                         * reflect what was actually said), so this
                         * shouldn't compete visually with Confirm. Round 23:
                         * uncapped — always available, any number of times.
                         */}
                        <button type="button" onClick={handleRetake} className="text-xs text-text-muted underline">
                          Not what they said? Retake
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <button
                    key={tap.id}
                    type="button"
                    onClick={() => handleCorrect(tap.id)}
                    className="w-full flex items-center gap-2.5 text-left px-4 py-3 rounded-lg border-l-[3px] border-border bg-surface text-sm hover:border-warning-border hover:bg-warning-subtle/30"
                  >
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-border shrink-0" aria-hidden />
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
            <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
              <p className="text-xs text-text-muted">
                Routing to separate review. Optionally add a note for the reviewer before submitting.
              </p>
              <textarea
                value={unclearNote}
                onChange={(e) => setUnclearNote(e.target.value)}
                placeholder="Free-text note (low friction — this must never be harder than picking a near-miss bucket)"
                className="w-full px-3 py-2 rounded-lg border border-border text-sm h-16 resize-none"
              />
              <Button size="sm" variant="secondary" onClick={submitUnclearNote}>Confirm and Route to Separate Review</Button>
            </div>
          )}

          {flowState === 'suggested' && !nodeHasOwnOtherTap && !unclearPending && (
            <div className="mt-4 pt-3 border-t border-border/60">
              {!showOtherInput ? (
                <button
                  type="button"
                  className="text-xs text-text-muted underline"
                  onClick={() => setShowOtherInput(true)}
                >
                  Other / does not fit any bucket
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={otherNote}
                    onChange={(e) => setOtherNote(e.target.value)}
                    placeholder="Free-text note (low friction — this must never be harder than picking a near-miss bucket)"
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm h-16 resize-none"
                  />
                  <Button size="sm" variant="secondary" onClick={handleOtherSubmit}>Route to separate review</Button>
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
        </Card>

        {path.length > 0 && (
          <Card padding className="bg-surface/60">
            <p className="text-xs uppercase tracking-wide text-text-muted mb-2">Transcript so far</p>
            <ul className="space-y-1 text-sm">
              {path.map((p, i) => (
                <li key={i} className="flex justify-between gap-2 text-text-muted">
                  <span>{p.question}</span>
                  <span className={cn('font-medium', p.corrected ? 'text-warning' : 'text-text')}>
                    {p.tapLabel}
                    {p.corrected && ' (corrected)'}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <PersistentControls
        coachedFlag={coachedFlag}
        dataErrorFlag={dataErrorFlag}
        showWhyScript={showWhyScript}
        showHandover={showHandover}
        handoverAgentName={handoverAgentName}
        handoverNote={handoverNote}
        onToggleCoached={() => toggleAction('coached')}
        onToggleDataError={() => toggleAction('data_error')}
        onToggleWhyScript={() => setShowWhyScript((s) => !s)}
        onHandoverRequest={() => setShowHandover(true)}
        onHandoverCancel={() => setShowHandover(false)}
        onHandoverAgentNameChange={setHandoverAgentName}
        onHandoverNoteChange={setHandoverNote}
        onHandoverSubmit={handleHandoverSubmit}
      />
    </div>
  );
}

function PersistentControls({
  coachedFlag,
  dataErrorFlag,
  showWhyScript,
  showHandover,
  handoverAgentName,
  handoverNote,
  onToggleCoached,
  onToggleDataError,
  onToggleWhyScript,
  onHandoverRequest,
  onHandoverCancel,
  onHandoverAgentNameChange,
  onHandoverNoteChange,
  onHandoverSubmit,
}: {
  coachedFlag: boolean;
  dataErrorFlag: boolean;
  showWhyScript: boolean;
  showHandover: boolean;
  handoverAgentName: string;
  handoverNote: string;
  onToggleCoached: () => void;
  onToggleDataError: () => void;
  onToggleWhyScript: () => void;
  onHandoverRequest: () => void;
  onHandoverCancel: () => void;
  onHandoverAgentNameChange: (v: string) => void;
  onHandoverNoteChange: (v: string) => void;
  onHandoverSubmit: () => void;
}) {
  return (
    <div className="border-t border-border px-5 py-3 bg-surface">
      {/*
       * Round 15 (§6): the biggest real-estate fix — a single-row, low-height
       * pill toolbar instead of round 9's full-width card + 2x2 grid. Same
       * four actions, far less vertical space; no card wrapper or eyebrow
       * padding block, just a small inline label before the pills.
       */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted shrink-0">Quick flags</span>
        <button
          type="button"
          onClick={onToggleCoached}
          className={cn(
            'inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs',
            coachedFlag ? 'bg-warning-subtle border-warning-border text-warning-text font-medium' : 'border-border text-text-muted hover:bg-bg',
          )}
        >
          <Eye size={13} /> Coached
        </button>
        <button
          type="button"
          onClick={onToggleDataError}
          className={cn(
            'inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs',
            dataErrorFlag ? 'bg-warning-subtle border-warning-border text-warning-text font-medium' : 'border-border text-text-muted hover:bg-bg',
          )}
        >
          <AlertCircle size={13} /> Data error
        </button>
        <button
          type="button"
          onClick={onToggleWhyScript}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-border text-text-muted text-xs hover:bg-bg"
        >
          <HelpCircle size={13} /> "Why asking?" script
        </button>
        <button
          type="button"
          onClick={onHandoverRequest}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-border text-text-muted text-xs hover:bg-bg"
        >
          <ArrowRightLeft size={13} /> Handover
        </button>
      </div>
      {showWhyScript && (
        <div className="mt-2 text-xs text-text-muted bg-surface border border-border rounded-lg p-3 space-y-1">
          <p>"These are standard verification questions we are required to ask to confirm we are speaking with you in real time."</p>
          <p className="italic">If pressed on how we know something: "I don't, that's why I'm asking."</p>
        </div>
      )}
      {showHandover && (
        <div className="mt-2 text-xs bg-surface border border-border rounded-lg p-3 space-y-2">
          <p className="text-text-muted">Language mismatch or shift change — progress and audit trail survive the handover.</p>
          <input
            value={handoverAgentName}
            onChange={(e) => onHandoverAgentNameChange(e.target.value)}
            placeholder="Receiving agent's name"
            className="w-full px-3 py-2 rounded-lg border border-border text-sm"
          />
          <input
            value={handoverNote}
            onChange={(e) => onHandoverNoteChange(e.target.value)}
            placeholder="Reason (optional)"
            className="w-full px-3 py-2 rounded-lg border border-border text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={onHandoverCancel}>Cancel</Button>
            <Button size="sm" onClick={onHandoverSubmit} disabled={!handoverAgentName.trim()}>Confirm handover</Button>
          </div>
        </div>
      )}
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
    <div className="mt-4 pt-3 border-t border-border/60">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 text-xs text-text-muted underline"
      >
        Unable to resolve / Abort call <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-danger bg-danger-subtle/40 p-3 space-y-3">
          {escalationPending ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-danger">{escalationPending.label}</p>
              <p className="text-xs text-text-muted">{escalationPending.routingNote}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={onEscalationCancel}>Cancel</Button>
                <Button size="sm" variant="destructive" onClick={onEscalationConfirm}>Confirm</Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1.5">Retry-safe — stays on this question</p>
                <div className="flex flex-wrap gap-1.5">
                  {retrySafe.map((reason) => (
                    <button
                      key={reason.id}
                      type="button"
                      onClick={() => onReasonTap(reason.id)}
                      className="text-xs px-2.5 py-1.5 rounded-full border border-border text-text-muted hover:bg-surface text-left"
                    >
                      {reason.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1.5">Escalation — routes to Review</p>
                <div className="flex flex-wrap gap-1.5">
                  {escalation.map((reason) => (
                    <button
                      key={reason.id}
                      type="button"
                      onClick={() => onReasonTap(reason.id)}
                      className="text-xs px-2.5 py-1.5 rounded-full border border-danger text-danger hover:bg-danger-subtle text-left"
                    >
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
      <div className="mb-4 text-xs text-text-muted bg-surface border border-dashed border-border rounded-lg px-3 py-2">
        Speech-to-text needs Chrome — not supported in this browser. Tap a bucket manually below.
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-border bg-surface/60 px-3 py-3">
      {/*
       * Round 16 (§9, reconciled): back to a compact, inline-left pill —
       * round 15's full-width-above version was too large next to the two
       * selects. The reconciliation is explicit that this is a
       * non-negotiable requirement regardless of layout, not optional
       * polish: an explicit min-width, since "auto-width, reflows based on
       * neighboring content" is exactly how the original round 9 bug
       * happened.
       */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={speech.status === 'listening' ? speech.stop : speech.start}
          className={cn(
            'min-w-[180px] h-10 shrink-0 flex items-center justify-center gap-1.5 px-4 rounded-full font-semibold text-xs text-white transition-colors whitespace-nowrap',
            speech.status === 'listening' ? 'bg-danger hover:bg-danger-hover active:bg-danger-pressed' : 'bg-accent hover:bg-accent-hover active:bg-accent-pressed',
          )}
        >
          <Mic size={14} />
          {speech.status === 'listening' ? 'Stop listening' : 'Listen for applicant answer'}
        </button>
        <select
          value={langLabel}
          disabled={speech.status === 'listening'}
          onChange={(e) => onLangChange(e.target.value)}
          className="h-10 text-xs px-3 rounded-full border border-border bg-surface text-text-muted disabled:opacity-60"
          title="Language the mic will listen in — set this to whatever you'll actually speak"
        >
          {SPEECH_LANGUAGES.map((l) => (
            <option key={l.label} value={l.label}>{l.label}</option>
          ))}
        </select>
        <select
          value=""
          disabled={speech.status === 'listening'}
          onChange={(e) => {
            const tap = taps.find((t) => t.id === e.target.value);
            if (tap) onSimulateBucket(tap);
          }}
          title="Stage-reliability fallback — skips the live mic and network speech recognition entirely"
          className="h-10 text-xs px-3 rounded-full border border-border bg-surface text-text-muted disabled:opacity-50"
        >
          {/*
           * Round 16 (§9, reconciled): display label only. Internal
           * naming (onSimulateBucket, handleSimulateBucket, simulatedTapId
           * etc.) deliberately stays tied to what this control actually
           * does — bypasses live classification and resolves straight to
           * the picked bucket — rather than being renamed to match, so a
           * future engineer reading the code isn't misled by copy aimed at
           * the agent.
           */}
          <option value="" disabled>Manually choose bucket ▾</option>
          {taps.map((tap) => (
            <option key={tap.id} value={tap.id}>{tap.labelHi ? `${tap.label} — ${tap.labelHi}` : tap.label}</option>
          ))}
        </select>
        {speech.status === 'listening' && (
          <span className="text-xs text-text-muted italic">Listening…</span>
        )}
        {speech.status === 'denied' && <span className="text-xs text-danger">Microphone access denied</span>}
        {speech.status === 'error' && <span className="text-xs text-danger">Speech recognition error — try again</span>}
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
       * grows during a listening session, never blanks.
       */}
      {(speech.transcript || speech.interimTranscript) && (
        <p className="text-sm mt-2">
          <span className="text-text">{speech.transcript}</span>
          {speech.interimTranscript && (
            <span className="text-text-muted italic"> {speech.interimTranscript}</span>
          )}
        </p>
      )}
    </div>
  );
}

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
  const bandColor =
    verdict.band === 'PROCEED'
      ? 'bg-success-subtle border-success-subtle text-success-strong'
      : verdict.band === 'BLOCK'
        ? 'bg-danger-subtle border-danger text-danger'
        : isReview
          ? 'bg-bg border-border text-text-muted'
          : 'bg-warning-subtle border-warning-border text-warning';

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full">
      <Card padding>
        <div className={cn('rounded-lg border px-4 py-3 mb-4', bandColor)}>
          <p className="text-xs uppercase tracking-wide opacity-80 mb-1">Resolved</p>
          <p className="text-2xl font-semibold">{band}</p>
          {score !== null && <p className="text-xs opacity-70 mt-1">Composite score: {score.toFixed(2)}</p>}
        </div>

        <p className="text-xs uppercase tracking-wide text-text-muted mb-2">Reasons</p>
        <ul className="list-disc list-inside space-y-1 text-sm mb-4">
          {verdict.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>

        {verdict.victimFlag && (
          <div className="rounded-lg border border-accent bg-accent-subtle text-accent px-4 py-3 text-sm mb-4">
            {verdict.victimFlag}
          </div>
        )}

        {isReview && (
          <div className="rounded-lg border border-border bg-surface/60 px-4 py-3 text-sm mb-4">
            <p className="font-medium mb-1">This case exits the call unresolved — no negative score, but not no scrutiny.</p>
            <p className="text-text-muted">
              Escalated for separate review (rigorous EDD or further documents). That review must be at least as
              rigorous as the automated path here, or "I don't understand" becomes the cheapest way through.
            </p>
          </div>
        )}

        {verdict.hiddenReveal && verdict.hiddenReveal.length > 0 && (
          <div className="rounded-lg border border-border bg-surface/60 px-4 py-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-text-muted mb-1">Hidden signal (revealed now)</p>
            {verdict.hiddenReveal.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border/60">
          <Button onClick={onContinue}>
            End Session
          </Button>
        </div>
      </Card>
    </div>
  );
}
