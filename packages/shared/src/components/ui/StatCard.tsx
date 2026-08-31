import { Card } from './Card';
import { InfoTooltip } from './InfoTooltip';
import { cn } from '../../lib/cn';

interface StatCardProps {
  label: string;
  value: string | number;
  tooltip?: string;
  subtext?: string;
  className?: string;
}

export function StatCard({ label, value, tooltip, subtext, className }: StatCardProps) {
  return (
    <Card className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center text-text-muted text-xs">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <div className="text-2xl font-semibold text-text">{value}</div>
      {subtext && <div className="text-xs text-text-muted">{subtext}</div>}
    </Card>
  );
}
