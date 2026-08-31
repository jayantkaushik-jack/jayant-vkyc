import { cn } from '../../lib/cn';

type PillVariant = 'passed' | 'failed' | 'pending' | 'weak' | 'average' | 'strong' | 'accepted' | 'rejected' | 'recapture' | 'neutral';

const variants: Record<PillVariant, string> = {
  passed: 'bg-green-50 text-success',
  failed: 'bg-red-50 text-danger',
  pending: 'bg-gray-100 text-text-muted',
  weak: 'bg-red-50 text-danger',
  average: 'bg-amber-50 text-warning',
  strong: 'bg-green-50 text-success',
  accepted: 'bg-green-50 text-success',
  rejected: 'bg-red-50 text-danger',
  recapture: 'bg-amber-50 text-warning',
  neutral: 'bg-primary-soft text-primary',
};

interface StatusPillProps {
  label: string;
  variant?: PillVariant;
  className?: string;
}

export function StatusPill({ label, variant = 'neutral', className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}

export function networkVariant(quality: string): PillVariant {
  const q = quality.toLowerCase();
  if (q === 'weak') return 'weak';
  if (q === 'average') return 'average';
  return 'strong';
}
