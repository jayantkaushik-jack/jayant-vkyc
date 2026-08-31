import { MetricCard } from '@cashfree-intl/cashmere';
import { InfoTooltip } from './InfoTooltip';
import { cn } from '@vkyc/shared/lib/cn';

/**
 * Agent-local StatCard, rebuilt on cashmere's MetricCard.
 *
 * Same props as the shared version so call sites are unchanged, but the card chrome,
 * type scale and internal padding now come from the DS instead of a hand-rolled
 * `Card` + text classes. It also picks up the agent-local InfoTooltip, so the label's
 * ⓘ gets a 24px hit area instead of the shared component's 14px one.
 *
 * `title` and `metric` take ReactNode, so the label/tooltip pair composes directly
 * without needing MetricCard's `body` slot.
 */

interface StatCardProps {
  label: string;
  value: string | number;
  tooltip?: string;
  subtext?: string;
  className?: string;
}

export function StatCard({ label, value, tooltip, subtext, className }: StatCardProps) {
  return (
    <MetricCard
      className={cn(className)}
      title={
        <span className="flex items-center gap-1 text-xs text-text-muted">
          {label}
          {tooltip && <InfoTooltip text={tooltip} />}
        </span>
      }
      metric={<span className="text-2xl font-semibold text-text">{value}</span>}
      {...(subtext ? { subtitle: <span className="text-xs text-text-muted">{subtext}</span> } : {})}
    />
  );
}
