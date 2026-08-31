import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckSquare, ChevronDown, Square } from 'lucide-react';
import { cn } from '../../lib/cn';
import { PARTNERS } from '../../data/types';
import type { PartnerId } from '../../data/types';

interface PartnerMultiSelectProps {
  value: PartnerId[];
  onChange: (next: PartnerId[]) => void;
  className?: string;
}

const ALL_IDS = PARTNERS.map((p) => p.id);

export function PartnerMultiSelect({ value, onChange, className }: PartnerMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const selectedSet = useMemo(() => new Set(value), [value]);
  const allSelected = value.length === PARTNERS.length;
  const someSelected = value.length > 0 && !allSelected;

  const toggleAll = () => onChange(allSelected ? [] : ALL_IDS);
  const toggleOne = (id: PartnerId) => {
    if (selectedSet.has(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  const label = allSelected
    ? 'All partners'
    : value.length === 0
      ? 'No partners'
      : `${value.length} partner${value.length > 1 ? 's' : ''}`;

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:bg-primary-soft hover:text-primary transition-colors"
      >
        <span>{label}</span>
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[220px] bg-surface border border-border rounded-lg shadow-card p-2 space-y-1">
          <button
            type="button"
            onClick={toggleAll}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-primary-soft text-xs"
          >
            {allSelected ? <CheckSquare size={14} className="text-primary" /> : <Square size={14} className="text-text-muted" />}
            <span className="font-medium">All</span>
          </button>

          <div className="h-px bg-border my-1" />

          {PARTNERS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggleOne(p.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-primary-soft text-xs"
            >
              {selectedSet.has(p.id) ? <CheckSquare size={14} className="text-primary" /> : <Square size={14} className="text-text-muted" />}
              {p.name}
            </button>
          ))}

          {someSelected && (
            <div className="pt-1 mt-1 border-t border-border text-[10px] text-text-muted">
              Showing {value.length} selected partner{value.length > 1 ? 's' : ''}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
