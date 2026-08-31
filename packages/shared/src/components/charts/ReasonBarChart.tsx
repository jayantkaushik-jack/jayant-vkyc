import { getReasonChartShortLabel } from '../../lib/rejectionReasons';
import type { FailureReasonBar } from '../../data/adminSelectors';

interface ReasonBarChartProps {
  rows: FailureReasonBar[];
  color: string;
  /** Fixed label gutter width in px. */
  labelWidth?: number;
  /** Uniform row height in px. */
  rowHeight?: number;
  emptyMessage?: string;
}

/**
 * Horizontal reason/drop-stage bar chart with single-line labels.
 * Replaces recharts vertical BarChart for reason breakdowns — labels never wrap.
 */
export function ReasonBarChart({
  rows,
  color,
  labelWidth = 240,
  rowHeight = 36,
  emptyMessage = 'No data for this status.',
}: ReasonBarChartProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-text-muted py-8 text-center">{emptyMessage}</p>;
  }

  const maxCount = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div className="space-y-1">
      {rows.map((row) => {
        const shortLabel = getReasonChartShortLabel(row.label);
        const barPct = Math.round((row.count / maxCount) * 100);
        return (
          <div
            key={row.label}
            className="flex items-center gap-3"
            style={{ height: rowHeight }}
          >
            <div
              className="shrink-0 text-xs text-text"
              style={{
                width: labelWidth,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={row.label}
            >
              {shortLabel}
            </div>
            <div className="flex-1 h-5 rounded overflow-hidden bg-primary-soft/40">
              <div
                className="h-full rounded transition-all"
                style={{ width: `${barPct}%`, backgroundColor: color, minWidth: row.count > 0 ? 4 : 0 }}
              />
            </div>
            <span className="shrink-0 text-xs tabular-nums text-text-muted w-[72px] text-right">
              {row.count} ({row.pct}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}
