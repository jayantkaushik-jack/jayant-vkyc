interface GoOnlineCardProps {
  onGoOnline: () => void;
  /** Subtitle below the GO ONLINE button. */
  subtitle?: string;
}

export function GoOnlineCard({
  onGoOnline,
  subtitle = 'Ready to take VKYC calls?',
}: GoOnlineCardProps) {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-card p-8 flex flex-col items-center justify-center min-h-[280px]">
      <button
        type="button"
        onClick={onGoOnline}
        className="relative w-40 h-40 flex items-center justify-center mb-4 rounded-full transition-transform hover:scale-105 hover:bg-success-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30 pointer-events-none breathing-ring" />
        <div className="absolute inset-4 rounded-full border border-primary/20 pointer-events-none pulse-ring" />
        <span className="relative text-xs font-semibold tracking-wide text-success">
          GO ONLINE
        </span>
      </button>
      <p className="text-sm text-text-muted">{subtitle}</p>
    </div>
  );
}
