import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { formatDuration, formatTime } from '../../lib/format';
import { cn } from '../../lib/cn';

interface SessionSummaryCardProps {
  wentOnlineAt: Date | null;
  totalActiveSec: number;
  totalBreakSec: number;
  wentOfflineAt: Date | null;
  onGoOnline: () => void;
  layout?: 'hero' | 'default';
  className?: string;
}

export function SessionSummaryCard({
  wentOnlineAt,
  totalActiveSec,
  totalBreakSec,
  wentOfflineAt,
  onGoOnline,
  layout = 'default',
  className,
}: SessionSummaryCardProps) {
  return (
    <Card
      className={cn(
        'w-full',
        layout === 'hero' && 'min-h-[280px] flex flex-col justify-center',
        className,
      )}
      padding
    >
      <div className="flex items-center gap-2 mb-5">
        <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
        <h2 className="text-xl font-semibold">You&apos;re offline</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm mb-6">
        <div>
          <p className="text-text-muted mb-1">Went online at</p>
          <p className="font-semibold">{wentOnlineAt ? formatTime(wentOnlineAt) : '—'}</p>
        </div>
        <div>
          <p className="text-text-muted mb-1">Total active time</p>
          <p className="font-semibold">{formatDuration(totalActiveSec)}</p>
        </div>
        <div>
          <p className="text-text-muted mb-1">Total break time</p>
          <p className="font-semibold">{formatDuration(totalBreakSec)}</p>
        </div>
        <div>
          <p className="text-text-muted mb-1">Went offline at</p>
          <p className="font-semibold">{wentOfflineAt ? formatTime(wentOfflineAt) : '—'}</p>
        </div>
      </div>
      <div className="flex justify-center">
        <Button size="lg" className="min-w-[180px]" onClick={onGoOnline}>Go Online</Button>
      </div>
    </Card>
  );
}
