import { cn } from '@vkyc/shared/lib/cn';

/**
 * Agent-local Card — a neutral panel built on cashmere's token values.
 *
 * cashmere has no generic "box with children" primitive: `CardSection` is
 * data-shaped (it takes a `sections` array of dataLabels / table / data+render, not
 * children) and `DataCard` / `MetricCard` are for labelled metrics. Where a surface
 * is genuinely just a container, a panel on the DS tokens is the honest mapping —
 * so this keeps the shared Card's API while sourcing its surface, border, radius
 * and shadow from cashmere:
 *
 *   bg-surface    -> --sds-neutral-bg-default-default (#fffffc)
 *   border-border -> --sds-neutral-border-light       (#e8e8e8)
 *   shadow-card   -> --sds-shadow-base
 *   rounded-xl    -> 12px, the --sds-radius-400 step
 *   p-5           -> 20px, --sds-spacing-20
 *
 * Prefer DataCard / MetricCard when the content is a labelled metric; reach for this
 * only for genuine containers.
 */

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface shadow-card',
        padding && 'p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}
