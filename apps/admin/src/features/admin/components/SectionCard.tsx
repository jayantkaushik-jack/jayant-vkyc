import type { ReactNode } from 'react';
import { RotateCw } from 'lucide-react';
import { Card } from '@vkyc/shared/components/ui/Card';
import { cn } from '@vkyc/shared/lib/cn';
import { useSectionRefresh, type SectionRefresh } from '@admin/features/admin/hooks/useSectionRefresh';

interface SectionCardProps {
  title: string;
  subtitle?: string;
  /** Render-prop receives live refresh state (nonce for jitter, refreshing flag). */
  children: (refresh: SectionRefresh) => ReactNode;
  /** Extra controls rendered in the header (tabs, filters, etc.). */
  headerRight?: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function SectionCard({ title, subtitle, children, headerRight, className, bodyClassName }: SectionCardProps) {
  const refresh = useSectionRefresh();

  return (
    <Card className={cn('relative', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <h3 className="font-semibold text-sm">{title}</h3>
            <span className="text-[11px] text-text-muted">{refresh.caption}</span>
          </div>
          {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {headerRight}
          <button
            type="button"
            onClick={refresh.refresh}
            aria-label={`Refresh ${title}`}
            title="Refresh section"
            className="p-1.5 rounded-lg border border-border text-text-muted hover:bg-primary-soft hover:text-primary transition-colors"
          >
            <RotateCw size={14} className={cn(refresh.refreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className={cn('relative', bodyClassName)}>
        {children(refresh)}
        {refresh.refreshing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-surface/70 backdrop-blur-[1px]">
            <RotateCw size={20} className="animate-spin text-primary" />
          </div>
        )}
      </div>
    </Card>
  );
}
