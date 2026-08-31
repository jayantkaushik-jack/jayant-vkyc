import { Modal } from '@agent/components/ui/Modal';
import { StatusPill, type PillVariant } from '@agent/components/ui/StatusPill';
import { cn } from '@vkyc/shared/lib/cn';
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

/** Solid traffic-light chips per dimension row — deliberately stronger than the app's usual soft pills, so a flagged row reads at a glance. */
const LEVEL_SOLID: Record<DimensionLevel, string> = {
  LOW: 'bg-success text-white',
  MEDIUM: 'bg-warning text-white',
  HIGH: 'bg-danger text-white',
  NOT_AVAILABLE: 'bg-text-disabled text-white',
};

function DimensionChip({ level }: { level: DimensionLevel }) {
  return (
    <span className={cn('inline-flex px-2.5 py-1 rounded-md text-xs font-semibold shrink-0', LEVEL_SOLID[level])}>
      {LEVEL_LABEL[level]}
    </span>
  );
}

/**
 * Always-show-all-5-dimensions list, shared by the Risk Snapshot modal and
 * (round 22) the Customer Details callout — one row per dimension, LOW
 * dimensions included with no subtitle line, `primarySignal` shown as a
 * subtitle only when present.
 */
export function DimensionList({ dimensions }: { dimensions: RiskDimensions }) {
  const entries = Object.entries(dimensions) as [keyof RiskDimensions, Dimension][];
  return (
    <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
      {entries.map(([key, dim]) => (
        <div key={key} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-surface">
          <div className="min-w-0">
            <p className="text-sm font-medium">{DIMENSION_LABELS[key]}</p>
            {dim.primarySignal && (
              <p className="text-xs text-text-muted mt-0.5">{dim.primarySignal}</p>
            )}
          </div>
          <DimensionChip level={dim.level} />
        </div>
      ))}
    </div>
  );
}

const BAND_VARIANT: Record<RiskSnapshot['muleScoreBand'], PillVariant> = {
  LOW: 'passed',
  MEDIUM: 'average',
  HIGH: 'failed',
};

const BAND_LABEL: Record<RiskSnapshot['muleScoreBand'], string> = {
  LOW: 'Green — auto-cleared',
  MEDIUM: 'Amber — needs a question',
  HIGH: 'Red — auto-declined',
};

interface RiskSnapshotViewProps {
  name: string;
  subtitle?: string;
  riskSnapshot: RiskSnapshot;
}

export function RiskSnapshotView({ name, subtitle, riskSnapshot }: RiskSnapshotViewProps) {
  const { muleScore, muleScoreBand, dimensions } = riskSnapshot;
  const entries = Object.entries(dimensions) as [keyof RiskDimensions, Dimension][];
  const flagged = entries
    .filter(([, dim]) => dim.level === 'MEDIUM' || dim.level === 'HIGH')
    .map(([key]) => DIMENSION_LABELS[key]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{name}</p>
          {subtitle && <p className="text-sm text-text-muted">{subtitle}</p>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold">{muleScore}</p>
          <StatusPill label={BAND_LABEL[muleScoreBand]} variant={BAND_VARIANT[muleScoreBand]} />
        </div>
      </div>

      <p className="text-sm">
        {flagged.length > 0 ? (
          <>
            <span className="font-semibold text-warning">Flagged: </span>
            <span className="text-text">{flagged.join(', ')}</span>
          </>
        ) : (
          <span className="text-success font-medium">No dimensions flagged</span>
        )}
      </p>

      <DimensionList dimensions={dimensions} />
    </div>
  );
}

interface RiskSnapshotModalProps extends RiskSnapshotViewProps {
  open: boolean;
  onClose: () => void;
}

export function RiskSnapshotModal({ open, onClose, name, subtitle, riskSnapshot }: RiskSnapshotModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Risk Snapshot" size="md">
      <RiskSnapshotView name={name} subtitle={subtitle} riskSnapshot={riskSnapshot} />
    </Modal>
  );
}
