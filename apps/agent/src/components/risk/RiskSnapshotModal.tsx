import { useEffect } from 'react';
import { useAgent } from '@agent/features/agent/AgentContext';
import {
  DIMENSION_LABELS,
  type RiskSnapshot,
  type RiskDimensions,
  type Dimension,
  type DimensionLevel,
} from '@agent/features/agent/call/amber/personas';

/**
 * Mule Sentinel v1's score + five output dimensions — a Risk Snapshot, never
 * called EDD or a compliance check. Dimension-level language and
 * primary_signal phrases only; this view never renders a raw rule ID or the
 * rule catalogue.
 */

const LEVEL_LABEL: Record<DimensionLevel, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  NOT_AVAILABLE: 'Not available',
};

/** Round 31 — semantic `.chip--ok/wa/da` variants; `NOT_AVAILABLE` gets a neutral chip, not a themed one, since absence of data is deliberately not a risk level (design system §1's "absence of data is neutral" rule). */
const LEVEL_CHIP_CLASS: Record<DimensionLevel, string> = {
  LOW: 'chip--ok',
  MEDIUM: 'chip--wa',
  HIGH: 'chip--da',
  NOT_AVAILABLE: 'chip--neutral',
};

/**
 * Round 31 — restyled onto `.sig`/`.dim-dot` (design system §"signal row" —
 * shared between this modal and the pre-call dossier per the reference's
 * own comment, "so the two surfaces cannot drift apart"). Same shared
 * component, same props, still used by both `RiskSnapshotModal` and
 * `CustomerDetailsStep.tsx` — restyling here restyles both automatically.
 */
export function DimensionList({ dimensions }: { dimensions: Partial<RiskDimensions> }) {
  const entries = Object.entries(dimensions) as [keyof RiskDimensions, Dimension][];
  return (
    <div className="stack gap-2">
      {entries.map(([key, dim]) => (
        <div key={key} className={cnSig(dim.level)}>
          <span className={`dim-dot ${dotClass(dim.level)}`} style={{ marginTop: 6 }} aria-hidden="true" />
          <div className="grow">
            <span className="t-body-str">{DIMENSION_LABELS[key]}</span>
            {dim.primarySignal && (
              <p className="t-small c-muted" style={{ marginTop: 2 }}>{dim.primarySignal}</p>
            )}
          </div>
          <span className={`chip ${LEVEL_CHIP_CLASS[dim.level]}`}>{LEVEL_LABEL[dim.level]}</span>
        </div>
      ))}
    </div>
  );
}

function dotClass(level: DimensionLevel): string {
  return level === 'LOW' ? 'dim-dot--low' : level === 'MEDIUM' ? 'dim-dot--med' : level === 'HIGH' ? 'dim-dot--high' : 'dim-dot--na';
}
function cnSig(level: DimensionLevel): string {
  return level === 'MEDIUM' || level === 'HIGH' ? 'sig sig--flagged' : 'sig sig--clear';
}

const BAND_LABEL: Record<RiskSnapshot['muleScoreBand'], string> = {
  LOW: 'Green — auto-cleared',
  MEDIUM: 'Amber — needs a question',
  HIGH: 'Red — auto-declined',
};
const BAND_SUB: Record<RiskSnapshot['muleScoreBand'], string> = {
  LOW: 'Signals reconcile; no question needed.',
  MEDIUM: 'Not clear enough to approve, not bad enough to reject. The signals need an explanation from the applicant.',
  HIGH: 'Cannot be reconciled from the data available.',
};
const BAND_CHIP_CLASS: Record<RiskSnapshot['muleScoreBand'], string> = {
  LOW: 'chip--ok',
  MEDIUM: 'chip--wa',
  HIGH: 'chip--da',
};

interface RiskSnapshotViewProps {
  name: string;
  subtitle?: string;
  riskSnapshot: RiskSnapshot;
}

/**
 * Round 31 — restyled onto `.score-block`/`.scale` (the score now carries
 * its own scale explicitly, per the design handoff's own rationale: "a bare
 * number invites the question '38 out of what, and is high bad?' every
 * single time"). Flagged signals render first via `.sig--flagged`, clear
 * ones collapse behind a `.disclosure` — same real dimension data as before,
 * just ordered and labelled per the design system's own rule rather than
 * shown as one flat list.
 */
export function RiskSnapshotView({ riskSnapshot }: RiskSnapshotViewProps) {
  const { muleScore, muleScoreBand, dimensions } = riskSnapshot;
  const entries = Object.entries(dimensions) as [keyof RiskDimensions, Dimension][];
  const flagged = entries.filter(([, dim]) => dim.level === 'MEDIUM' || dim.level === 'HIGH');
  const clear = entries.filter(([, dim]) => dim.level === 'LOW' || dim.level === 'NOT_AVAILABLE');

  return (
    <>
      <div className="card card--pad card--flat" style={{ background: 'rgba(255,255,255,.6)' }}>
        <div className="score-block">
          <div style={{ minWidth: 96 }}>
            <p className="t-eyebrow c-muted" style={{ marginBottom: 'var(--s-1)' }}>Mule score</p>
            <p className={`score-block__num ${muleScoreBand === 'LOW' ? 'c-ok' : muleScoreBand === 'HIGH' ? 'c-da' : 'c-wa'}`}>{muleScore}</p>
          </div>
          <div className="grow">
            <p className="t-body-str" style={{ marginBottom: 'var(--s-1)' }}>{BAND_LABEL[muleScoreBand]}</p>
            <p className="t-small c-muted" style={{ marginBottom: 'var(--s-3)' }}>{BAND_SUB[muleScoreBand]}</p>
            <div className="scale" aria-hidden="true"><span className="scale__pin" style={{ left: `${muleScore}%` }} /></div>
            <div className="scale__ends">
              <span className="t-mono c-faint">0 &middot; clear</span>
              <span className="t-mono c-faint">100 &middot; block</span>
            </div>
          </div>
        </div>
      </div>

      {flagged.length > 0 && (
        <>
          <div className="sec-head">
            <span className="dim-dot dim-dot--med" aria-hidden="true" />
            <h3 className="t-body-str">Signals flagged</h3>
          </div>
          <DimensionList dimensions={Object.fromEntries(flagged)} />
        </>
      )}

      {clear.length > 0 && (
        <details className="disclosure" style={{ marginTop: 'var(--s-4)' }}>
          <summary>
            <svg className="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
            <span className="dim-dot dim-dot--low" aria-hidden="true" />
            {clear.length} signal{clear.length === 1 ? '' : 's'} clear
          </summary>
          <div className="disclosure__body">
            <DimensionList dimensions={Object.fromEntries(clear)} />
          </div>
        </details>
      )}

      {flagged.length === 0 && clear.length === entries.length && (
        <p className="t-small" style={{ color: 'var(--ok-fg)', fontWeight: 500, marginTop: 'var(--s-4)' }}>No dimensions flagged</p>
      )}
    </>
  );
}

interface RiskSnapshotModalProps extends RiskSnapshotViewProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Round 31 — built directly on `.scrim`/`.modal` rather than the shared
 * `Modal` component: that component's own generic chrome doesn't carry the
 * avatar/name/band-chip header row or the footer-only-Close layout this
 * screen needs, and reworking `Modal` itself would ripple into every other
 * modal in the app (DeviceCheckModal, handover, etc.) — out of scope for a
 * single screen's restyle. Escape and click-on-scrim close, same contract
 * `Modal` already provided.
 *
 * Round 37 (Bug 2) — reports its own open/closed state up to `AgentContext`
 * (`isRiskSnapshotOpen`) regardless of which of the three call sites mounted
 * it. `IncomingCallOverlay` reads that flag to hide its own floating
 * incoming-call card while any instance of this modal is open — otherwise
 * that card's bright box ghosts through this modal's translucent `.scrim`.
 * Not a change to this component's own layout/sizing (`.modal`,
 * `.modal__body` are untouched) — purely a side-effect for that other
 * component's coordination.
 */
export function RiskSnapshotModal({ open, onClose, name, subtitle, riskSnapshot }: RiskSnapshotModalProps) {
  const { setRiskSnapshotOpen } = useAgent();

  useEffect(() => {
    setRiskSnapshotOpen(open);
    return () => setRiskSnapshotOpen(false);
  }, [open, setRiskSnapshotOpen]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="scrim" role="dialog" aria-modal="true" aria-labelledby="snapTitle" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <header className="modal__head">
          <span className="avatar avatar--md" aria-hidden="true">{name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}</span>
          <div className="grow">
            <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
              <h2 className="t-h2" id="snapTitle">{name}</h2>
              <span className={`chip ${BAND_CHIP_CLASS[riskSnapshot.muleScoreBand]}`}>{riskSnapshot.muleScoreBand === 'LOW' ? 'Green' : riskSnapshot.muleScoreBand === 'HIGH' ? 'Red' : 'Amber'}</span>
            </div>
            {subtitle && <p className="t-small c-muted" style={{ marginTop: 2 }}>{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" aria-label="Close risk snapshot" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="modal__body">
          <RiskSnapshotView name={name} subtitle={subtitle} riskSnapshot={riskSnapshot} />
        </div>

        <footer className="modal__foot">
          <span className="grow" />
          <button type="button" className="btn btn--secondary" onClick={onClose}>Close</button>
        </footer>
      </div>
    </div>
  );
}
