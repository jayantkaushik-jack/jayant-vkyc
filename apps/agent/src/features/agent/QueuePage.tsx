import { useNavigate } from 'react-router-dom';
import { Button } from '@agent/components/ui/Button';
import { Card } from '@agent/components/ui/Card';
import { OnBreakCard } from '@agent/components/session-status/OnBreakCard';
import { SessionSummaryCard } from '@agent/components/session-status/SessionSummaryCard';
import { useState } from 'react';
import { RiskSnapshotModal } from '@agent/components/risk/RiskSnapshotModal';
import { useAgent } from '@agent/features/agent/AgentContext';
import {
  PERSONAS,
  SAMPLE_QUEUE_ROWS,
  DIMENSION_LABELS,
  DIMENSION_ORDER,
  type AmberPersona,
  type QueueRow,
  type DimensionLevel,
} from '@agent/features/agent/call/amber/personas';
import { getInitials } from '@vkyc/shared/lib/avatar';
import { cn } from '@vkyc/shared/lib/cn';
import { FUNNEL_TODAY } from '@agent/features/agent/queueStats';

/** I · D · T · P · C — same fixed order as DIMENSION_ORDER, initials for the dot-strip sub-header (round 15 rename). */
const DIMENSION_INITIALS: Record<keyof typeof DIMENSION_LABELS, string> = {
  identity: 'I',
  digitalPresence: 'D',
  telecom: 'T',
  paymentFraudBlacklists: 'P',
  coherenceRisk: 'C',
};

/**
 * Round 31 — `dim-dot--na` is now genuinely hollow (transparent + outline),
 * per the design system's own explicit rule ("no data" must look different
 * from "low", not just a duller fill of the same shape). The previous
 * `bg-text-disabled` was a solid grey dot — visually indistinguishable in
 * kind from a real level, just a different colour. Flagged as a real gap in
 * the round-31 handoff review, not invented data: fixed here as the direct
 * design-system-compliant application of a class this app already ported.
 */
const DOT_CLASS: Record<DimensionLevel, string> = {
  LOW: 'dim-dot--low',
  MEDIUM: 'dim-dot--med',
  HIGH: 'dim-dot--high',
  NOT_AVAILABLE: 'dim-dot--na',
};

const BAND_WORD: Record<QueueRow['riskSnapshot']['muleScoreBand'], string> = {
  LOW: 'Green',
  MEDIUM: 'Amber',
  HIGH: 'Red',
};

/** Round 31 — semantic chip variants (`.chip--ok/wa/da`), replacing the old ad-hoc Tailwind pill classes. */
const BAND_CHIP_CLASS: Record<QueueRow['riskSnapshot']['muleScoreBand'], string> = {
  LOW: 'chip--ok',
  MEDIUM: 'chip--wa',
  HIGH: 'chip--da',
};

function isSelectablePersonaRow(row: QueueRow): row is QueueRow & { id: AmberPersona['id'] } {
  return row.status === 'Waiting' && row.id in PERSONAS;
}

/**
 * Temporary, UI-only hide — requested to pull these off the queue while
 * their trees/data get more work, without touching `personas.ts` or any
 * backend record. Deliberately just a display filter applied where
 * `SAMPLE_QUEUE_ROWS` is consumed below, not a change to the underlying
 * `PERSONAS`/`SAMPLE_QUEUE_ROWS` data itself — remove ids from this list
 * (or delete the filter below) to bring any of them back.
 * `filler_sunita` is a synthetic filler row, not a real `AmberPersona` —
 * no `demoPersonaId` default needs adjusting for her, unlike the four ids
 * above (she was never selectable to begin with: `isSelectablePersonaRow`
 * requires `row.id in PERSONAS`, and filler rows never are).
 */
const HIDDEN_QUEUE_PERSONA_IDS: string[] = ['ramesh', 'suresh', 'lakshmi', 'meena', 'filler_sunita'];
const VISIBLE_QUEUE_ROWS = SAMPLE_QUEUE_ROWS.filter((row) => !HIDDEN_QUEUE_PERSONA_IDS.includes(row.id));

/**
 * Round 31 — restyled onto the design system's Template B (stat strip →
 * section header with count chip → table → legend) per reference screen 04.
 * Two real, disclosed departures from the reference, both confirmed with the
 * user rather than guessed:
 *
 * 1. **No rule codes/`.src-tag` badges.** The reference shows `MS-204`/`BANK`
 *    provenance tags next to descriptive rule text. Grepped the whole app:
 *    no such convention exists anywhere, and `rulesFiredCount` is a bare
 *    number with no per-rule text attached — there is nothing real to tag.
 *    The Rules column shows the same "N rule(s) fired" summary the app
 *    already had, just restyled, with no invented rule names or codes.
 * 2. **The table is no longer a click-to-expand disclosure.** The reference
 *    shows "Waiting for you" as an always-visible table (Template B has no
 *    collapsed state for it), and `SAMPLE_QUEUE_ROWS` is a small fixed list
 *    that already matches the reference's own "6 in view" chip exactly —
 *    there's nothing to hide. The row-click-to-open-Risk-Snapshot behavior
 *    (`RiskSnapshotModal`) for non-selectable rows is unchanged.
 */
function TodaysQueue({
  demoPersonaId,
  onSelectPersona,
}: {
  demoPersonaId: AmberPersona['id'];
  onSelectPersona: (id: AmberPersona['id']) => void;
}) {
  const [openRow, setOpenRow] = useState<QueueRow | null>(null);
  const [breatheHidden, setBreatheHidden] = useState(false);
  /** Which row is armed to be the next incoming call — the same testing concept `demoPersonaId` already drove before this restyle, just now also carried through as the `.q-next-rail` highlight and the right rail's "Next in queue" name. */
  const nextRow = VISIBLE_QUEUE_ROWS.find((r) => r.id === demoPersonaId) ?? VISIBLE_QUEUE_ROWS.find((r) => r.status === 'Waiting');

  return (
    <>
      <section aria-labelledby="funnelHead" style={{ marginBottom: 'var(--s-6)' }}>
        <div className="row gap-3" style={{ marginBottom: 'var(--s-3)' }}>
          <h2 className="t-h2" id="funnelHead">Today&rsquo;s queue</h2>
          <span className="t-small c-muted" style={{ marginLeft: 'auto' }}>
            Auto-decided {(((FUNNEL_TODAY.green + FUNNEL_TODAY.red) / FUNNEL_TODAY.scored) * 100).toFixed(0)}%
            &middot; routed to you {((FUNNEL_TODAY.amber / FUNNEL_TODAY.scored) * 100).toFixed(0)}%
          </span>
        </div>

        <div className="stat-strip">
          <div className="stat-tile">
            <p className="stat-tile__label">Scored today</p>
            <p className="stat-tile__num">{FUNNEL_TODAY.scored.toLocaleString()}</p>
            <p className="stat-tile__sub">Applicants through onboarding</p>
            <div className="stat-tile__bar"><i style={{ width: '100%', background: 'var(--n-300)' }} /></div>
          </div>

          <div className="stat-tile">
            <span className="stat-tile__arrow" aria-hidden="true">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </span>
            <p className="stat-tile__label"><span className="dim-dot dim-dot--low" aria-hidden="true" /> Green &middot; auto-cleared</p>
            <p className="stat-tile__num">{FUNNEL_TODAY.green.toLocaleString()}</p>
            <p className="stat-tile__sub">No agent contact needed</p>
            <div className="stat-tile__bar"><i style={{ width: `${(FUNNEL_TODAY.green / FUNNEL_TODAY.scored) * 100}%`, background: 'var(--ok-fg)' }} /></div>
          </div>

          <div className="stat-tile">
            <span className="stat-tile__arrow" aria-hidden="true">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </span>
            <p className="stat-tile__label"><span className="dim-dot dim-dot--high" aria-hidden="true" /> Red &middot; auto-rejected</p>
            <p className="stat-tile__num">{FUNNEL_TODAY.red.toLocaleString()}</p>
            <p className="stat-tile__sub">Hard stop at the gate</p>
            <div className="stat-tile__bar"><i style={{ width: `${(FUNNEL_TODAY.red / FUNNEL_TODAY.scored) * 100}%`, background: 'var(--da-fg)' }} /></div>
          </div>

          <div className="stat-tile stat-tile--you">
            <span className="stat-tile__arrow" aria-hidden="true">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
            </span>
            <p className="stat-tile__label"><span className="dim-dot dim-dot--med" aria-hidden="true" /> Amber &middot; yours to resolve</p>
            <p className="stat-tile__num">{FUNNEL_TODAY.amber.toLocaleString()}</p>
            <p className="stat-tile__sub">Needs a question, not a verdict</p>
            <div className="stat-tile__bar"><i style={{ width: `${(FUNNEL_TODAY.amber / FUNNEL_TODAY.scored) * 100}%`, background: 'var(--wa-fg)' }} /></div>
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 264px', gap: 'var(--s-4)', alignItems: 'start' }}>
        <section aria-labelledby="queueHead">
          <div className="row gap-3" style={{ marginBottom: 'var(--s-3)' }}>
            <h3 className="t-body-str" id="queueHead">Waiting for you</h3>
            <span className="chip chip--wa">{VISIBLE_QUEUE_ROWS.length} in view &middot; {FUNNEL_TODAY.amber} total</span>
            <span className="t-small c-muted" style={{ marginLeft: 'auto' }}>Sorted by longest waiting</span>
          </div>

          <div className="qtable-wrap">
            <table className="qtable">
              <caption className="sr-only">Amber cases assigned to you, longest waiting first</caption>
              <thead>
                <tr>
                  <th scope="col" style={{ width: '23%' }}>Customer</th>
                  <th scope="col" style={{ width: 76 }}>Band</th>
                  <th scope="col" style={{ width: 64 }}>Score</th>
                  <th scope="col" style={{ width: 118 }}>
                    Risk
                    <span className="dim-head" style={{ marginTop: 3 }} aria-hidden="true">
                      {DIMENSION_ORDER.map((key) => (
                        <span key={key} title={DIMENSION_LABELS[key]}>{DIMENSION_INITIALS[key]}</span>
                      ))}
                    </span>
                  </th>
                  <th scope="col">Rules fired</th>
                  <th scope="col" style={{ width: 86, textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {VISIBLE_QUEUE_ROWS.map((row) => {
                  const selectable = isSelectablePersonaRow(row);
                  const isNext = selectable && row.id === nextRow?.id;
                  return (
                    <tr
                      key={row.id}
                      tabIndex={0}
                      className={isNext ? 'is-next q-next-rail' : undefined}
                      style={{ cursor: 'pointer' }}
                      onClick={() => (selectable ? onSelectPersona(row.id) : setOpenRow(row))}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter' && e.key !== ' ') return;
                        e.preventDefault();
                        if (selectable) onSelectPersona(row.id); else setOpenRow(row);
                      }}
                    >
                      <td>
                        <div className="q-name">
                          <span className="avatar avatar--sm" aria-hidden="true">{getInitials(row.name)}</span>
                          <span className="t-body-str">{row.name}</span>
                        </div>
                      </td>
                      <td><span className={cn('chip', BAND_CHIP_CLASS[row.riskSnapshot.muleScoreBand])}>{BAND_WORD[row.riskSnapshot.muleScoreBand]}</span></td>
                      <td><span className="q-score">{row.riskSnapshot.muleScore}</span></td>
                      <td>
                        <span
                          className="dim-row"
                          role="img"
                          aria-label={DIMENSION_ORDER.map((key) => `${DIMENSION_LABELS[key]} ${row.riskSnapshot.dimensions[key].level.toLowerCase()}`).join(', ')}
                        >
                          {DIMENSION_ORDER.map((key) => (
                            <i key={key} className={cn('dim-dot', DOT_CLASS[row.riskSnapshot.dimensions[key].level])} />
                          ))}
                        </span>
                      </td>
                      <td>
                        <div className="rule-line">
                          <span className="rule-line__txt">
                            {row.rulesFiredCount > 0 ? `${row.rulesFiredCount} rule${row.rulesFiredCount === 1 ? '' : 's'} fired` : 'No rules fired'}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="chip chip--neutral">{row.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="stack gap-2" style={{ marginTop: 'var(--s-3)' }}>
            <p className="t-small c-faint" style={{ display: 'flex', gap: 'var(--s-4)', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="t-eyebrow" style={{ color: 'var(--n-400)' }}>Risk profile</span>
              {DIMENSION_ORDER.map((key) => (
                <span key={key}><b className="t-mono" style={{ color: 'var(--n-600)' }}>{DIMENSION_INITIALS[key]}</b>&nbsp; {DIMENSION_LABELS[key]}</span>
              ))}
            </p>
          </div>
        </section>

        <aside className="stack gap-4">
          <div className="card card--pad glass">
            <div className="row gap-2" style={{ marginBottom: 'var(--s-3)' }}>
              <span className="pulse" aria-hidden="true"><i /></span>
              <span className="t-body-str">You&rsquo;re online</span>
            </div>
            <p className="t-small c-muted" style={{ marginBottom: 'var(--s-4)' }}>
              The next amber case will ring here automatically. You don&rsquo;t need to pick one.
            </p>
            <div className="stack gap-2">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="t-small c-muted">Resolved this shift</span>
                <span className="t-mono t-body-str">0</span>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="t-small c-muted">Avg. handling time</span>
                <span className="t-mono t-body-str">&mdash;</span>
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="t-small c-muted">Next in queue</span>
                <span className="t-small t-body-str">{nextRow?.name ?? '—'}</span>
              </div>
            </div>
          </div>

          {!breatheHidden && (
            <div className="card card--pad glass">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--s-3)' }}>
                <span className="t-eyebrow c-muted">Between calls</span>
                <button type="button" className="link-btn" aria-label="Hide breathing exercise" onClick={() => setBreatheHidden(true)}>Hide</button>
              </div>
              <div className="breathe" aria-hidden="true">
                <span className="breath-label-in" style={{ position: 'absolute' }}>breathe in</span>
                <span className="breath-label-out" style={{ position: 'absolute' }}>breathe out</span>
              </div>
              <p className="t-small c-faint" style={{ textAlign: 'center', marginTop: 'var(--s-3)' }}>
                Optional. Four seconds in, six out.
              </p>
            </div>
          )}
        </aside>
      </div>

      {openRow && (
        <RiskSnapshotModal
          open
          onClose={() => setOpenRow(null)}
          name={openRow.name}
          riskSnapshot={openRow.riskSnapshot}
        />
      )}
    </>
  );
}

export function QueuePage() {
  const navigate = useNavigate();
  const {
    status,
    setStatus,
    breakStartedAt,
    sessionSummary,
    getBreakSec,
    demoPersonaId,
    selectQueuedPersona,
  } = useAgent();

  const handleResume = () => {
    setStatus('online');
  };

  if (status === 'on_break') {
    return (
      <div className="p-6 min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <OnBreakCard
          breakStartedAt={breakStartedAt}
          onResume={handleResume}
          className="max-w-md"
        />
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div className="p-6 min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        {sessionSummary.hasBeenOnlineToday ? (
          <SessionSummaryCard
            wentOnlineAt={sessionSummary.wentOnlineAt}
            totalActiveSec={sessionSummary.totalActiveSec}
            totalBreakSec={getBreakSec()}
            wentOfflineAt={sessionSummary.wentOfflineAt}
            onGoOnline={() => setStatus('online')}
            className="max-w-md"
          />
        ) : (
          <Card className="max-w-md w-full text-center" padding>
            <h2 className="text-xl font-semibold mb-2">You&apos;re offline</h2>
            <p className="text-sm text-text-muted mb-6">Go online from Home to start taking calls.</p>
            <Button onClick={() => navigate('/agent')}>Back to Home</Button>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div>
      {/*
       * Round 37 (Bug 1) — this used to also render its own separate,
       * non-fixed copy of the incoming-call card here, specifically because
       * `IncomingCallOverlay` (mounted globally in `AgentLayout`) bailed out
       * on this exact route to avoid a double-render. On a long queue that
       * meant the card had no fixed/sticky positioning of its own and was
       * pushed below the fold along with the risk-dimension legend row
       * beneath the table. `IncomingCallOverlay`'s bailout is gone; it's now
       * the single render path for every route, so it's not duplicated here.
       */}
      <TodaysQueue demoPersonaId={demoPersonaId} onSelectPersona={selectQueuedPersona} />
    </div>
  );
}
