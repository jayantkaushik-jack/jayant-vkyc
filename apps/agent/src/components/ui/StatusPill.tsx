import { Tag } from '@cashfree-intl/cashmere';
import { cn } from '@vkyc/shared/lib/cn';

/**
 * Agent-local StatusPill on cashmere's Tag.
 *
 * The shared component has ten variants; cashmere's Tag has five semantic statuses.
 * That's a deliberate narrowing on the DS's part — the ten were three separate
 * vocabularies (check results, signal strength, agent decisions) that happened to be
 * spelled as one union — so they collapse onto the five without losing meaning:
 *
 *   passed | strong | accepted   -> positive      (--sds-positive-*)
 *   failed | weak | rejected     -> negative      (--sds-negative-*)
 *   average | recapture          -> warning       (--sds-warning-*)
 *   pending                      -> intermediate  (neutral grey — this is what the
 *                                                  old `bg-gray-100` was going for)
 *   neutral                      -> information   (--sds-info-*)
 *
 * The distinction that *is* lost: nothing visually separates "failed" from "weak
 * signal" any more, where before they were both red but from different scales. The
 * label always carries the actual meaning, so this reads fine in place.
 *
 * `showIcon={false}`: Tag defaults to a leading status icon. These pills sit in dense
 * table cells and inline beside labels, where the icons crowd the text — the label is
 * already explicit. Flip this to allow icons if the DS-native look is preferred.
 */

export type PillVariant =
  | 'passed'
  | 'failed'
  | 'pending'
  | 'weak'
  | 'average'
  | 'strong'
  | 'accepted'
  | 'rejected'
  | 'recapture'
  | 'neutral';

type TagStatus = 'positive' | 'negative' | 'warning' | 'information' | 'intermediate';

const STATUS_MAP: Record<PillVariant, TagStatus> = {
  passed: 'positive',
  strong: 'positive',
  accepted: 'positive',
  failed: 'negative',
  weak: 'negative',
  rejected: 'negative',
  average: 'warning',
  recapture: 'warning',
  pending: 'intermediate',
  neutral: 'information',
};

interface StatusPillProps {
  label: string;
  variant?: PillVariant;
  className?: string;
}

export function StatusPill({ label, variant = 'neutral', className }: StatusPillProps) {
  return (
    <Tag
      size="small"
      type="background"
      status={STATUS_MAP[variant]}
      showIcon={false}
      className={cn('inline-flex', className)}
    >
      {label}
    </Tag>
  );
}

/** Unchanged from the shared helper — maps a network quality string to a variant. */
export function networkVariant(quality: string): PillVariant {
  const q = quality.toLowerCase();
  if (q === 'weak') return 'weak';
  if (q === 'average') return 'average';
  return 'strong';
}
