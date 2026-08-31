import { Coffee } from 'lucide-react';
import { Button } from '@agent/components/ui/Button';
import { Card } from '@agent/components/ui/Card';
import { formatDuration } from '@vkyc/shared/lib/format';
import { cn } from '@vkyc/shared/lib/cn';
import { useBreakTimer } from '@vkyc/shared/features/session/useBreakTimer';

interface OnBreakCardProps {
  breakStartedAt: number | null;
  onResume: () => void;
  layout?: 'hero' | 'default';
  className?: string;
  /** Override the default "Calls are paused…" subtitle. */
  subtitle?: string;
}

export function OnBreakCard({
  breakStartedAt,
  onResume,
  layout = 'default',
  className,
  subtitle = "Calls are paused while you're on break",
}: OnBreakCardProps) {
  const breakTimer = useBreakTimer(breakStartedAt, !!breakStartedAt);

  return (
    <Card
      className={cn(
        'w-full text-center',
        layout === 'hero' && 'min-h-[280px] flex flex-col items-center justify-center',
        className,
      )}
      padding
    >
      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-warning-subtle flex items-center justify-center">
        <Coffee className="w-7 h-7 text-warning-text" />
      </div>
      <h2 className="text-xl font-semibold mb-2">On a break</h2>
      <p className="text-3xl font-mono text-primary mb-4">{formatDuration(breakTimer)}</p>
      <p className="text-sm text-text-muted mb-6">{subtitle}</p>
      <div className="flex justify-center">
        <Button size="lg" className="min-w-[200px]" onClick={onResume}>Resume — Go Online</Button>
      </div>
    </Card>
  );
}
