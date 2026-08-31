import { useEffect, useRef } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { IN_CALL_STEPS } from '@customer/features/customer/journeyConfig';

export function InCallStepper({ activeIndex }: { activeIndex: number }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [activeIndex]);

  return (
    <div ref={scrollRef} className="flex items-center gap-0 overflow-x-auto px-2 py-2 scroll-smooth">
      {IN_CALL_STEPS.map((step, i) => {
        const done = i < activeIndex;
        const current = i === activeIndex;
        return (
          <span key={step} className="flex shrink-0 items-center">
            <span
              ref={current ? activeRef : undefined}
              className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${
                done ? 'bg-success text-white' : current ? 'bg-primary text-white' : 'bg-black/40 text-white/70'
              }`}
            >
              {done && <Check size={8} className="mr-0.5 inline" />}
              {step}
            </span>
            {i < IN_CALL_STEPS.length - 1 && (
              <ChevronRight
                size={12}
                className={`mx-0.5 shrink-0 ${done ? 'text-primary' : 'text-white/40'}`}
                aria-hidden
              />
            )}
          </span>
        );
      })}
    </div>
  );
}
