import { Link } from 'react-router-dom';

interface OnlineStatusStripProps {
  /** Route to navigate when the user clicks "View queue". */
  queueHref: string;
  /** Label for the queue link. */
  queueLabel?: string;
  message?: string;
}

export function OnlineStatusStrip({
  queueHref,
  queueLabel = 'View queue',
  message = "You're online",
}: OnlineStatusStripProps) {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-card px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
        <span className="text-sm font-medium text-text">{message}</span>
      </div>
      <Link to={queueHref} className="text-sm text-primary hover:underline font-medium">
        {queueLabel} →
      </Link>
    </div>
  );
}
