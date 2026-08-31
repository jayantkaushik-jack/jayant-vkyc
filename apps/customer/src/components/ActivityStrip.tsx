import { ChevronDown, ChevronUp } from 'lucide-react';
import { useCustomerJourney } from '@customer/features/customer/CustomerJourneyContext';

export function ActivityStrip() {
  const { activity, activityOpen, toggleActivity } = useCustomerJourney();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:left-auto md:right-4 md:bottom-4 md:w-80">
      <button
        type="button"
        onClick={toggleActivity}
        className="flex w-full items-center justify-between rounded-t-lg border border-b-0 border-dashed border-warning bg-surface px-3 py-1.5 text-left text-[11px] font-medium text-warning md:rounded-lg md:border-b"
      >
        <span>Activity log (demo)</span>
        {activityOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
      {activityOpen && (
        <div className="max-h-40 overflow-y-auto border border-dashed border-warning bg-surface px-3 py-2 text-[11px] md:rounded-b-lg">
          <ul className="space-y-1">
            {activity.map((ev) => (
              <li key={ev.id} className="flex gap-2 text-text-muted">
                <span className="shrink-0 text-[10px] tabular-nums">
                  {new Date(ev.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="text-text">{ev.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
