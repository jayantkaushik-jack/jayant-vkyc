import { Info } from 'lucide-react';
import { useState } from 'react';

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-flex ml-1">
      <button
        type="button"
        className="text-text-muted hover:text-primary transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        aria-label="More information"
      >
        <Info size={14} />
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-3 py-2 text-xs font-normal text-text bg-surface border border-border rounded-lg shadow-card z-50">
          {text}
        </span>
      )}
    </span>
  );
}
