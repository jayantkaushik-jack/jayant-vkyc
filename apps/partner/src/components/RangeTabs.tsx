import { cn } from '@vkyc/shared/lib/cn';

export type RangePreset = 'today' | '7d' | '30d' | '90d';

const OPTIONS: { id: RangePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
];

export function RangeTabs({ value, onChange }: { value: RangePreset; onChange: (v: RangePreset) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
            value === o.id ? 'bg-primary text-white' : 'text-text-muted hover:text-text',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
