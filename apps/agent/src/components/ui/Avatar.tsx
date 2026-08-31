import { useState } from 'react';
import { cn } from '@vkyc/shared/lib/cn';
import { getAvatarUrl, getInitials, type AvatarPerson } from '@vkyc/shared/lib/avatar';

/**
 * Agent-local Avatar — still hand-rolled, deliberately.
 *
 * cashmere's ProfileAvatar is a *group*: an avatar circle plus name, optional email
 * and an optional Tag, with a single `type` axis (default / avatarOnly / profileOnly)
 * and no size or ring. This app needs a bare circle at four sizes, with a ring to mark
 * the signed-in agent and an initials fallback when the generated image 404s — none of
 * which ProfileAvatar exposes. ProfileAvatar is the right component for the profile
 * page header, and is used there; this stays for the inline cases.
 *
 * What the fork changes over the shared version is only the colours, which now come
 * from the DS: the ring is cashmere's near-black brand rather than the old purple, and
 * the muted ring is the neutral border token instead of `gray-300`.
 *
 * Sizes stay on the 4px grid: 28 / 36 / 48 / 64px.
 */

/**
 * cashmere's `--sds-*-bg-subtle` scale, for the generated avatar's background circle.
 *
 * DiceBear bakes the background into the SVG, so this is the one avatar colour that CSS
 * tokens can't reach — the shared helper's default list is the app's old theme ("soft
 * lavenders and purples"), which is the last purple left in this app. Passing cashmere's
 * subtle backgrounds instead is what actually removes it.
 *
 * Semantic tokens are being used decoratively here, which is a compromise: an avatar circle
 * carries no positive/warning meaning. It's the only place in the DS with soft, distinct
 * tints, and a deterministic spread across several of them is what keeps a list of people
 * visually scannable. Neutral-only would be more correct and much flatter.
 */
const AVATAR_BACKGROUNDS = [
  'e5edff', // --sds-accent-bg-subtle
  'dcffe9', // --sds-positive-bg-subtle
  'fff7e6', // --sds-warning-bg-subtle
  'f2f2f2', // --sds-neutral-bg-default-subtle
  'e8e8e8', // --sds-neutral-border-light
] as const;

interface AvatarProps {
  person: AvatarPerson;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  ring?: 'primary' | 'gray' | 'none';
  className?: string;
  title?: string;
}

const sizes = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
};

const rings = {
  primary: 'ring-2 ring-primary ring-offset-2',
  gray: 'ring-2 ring-border ring-offset-2',
  none: '',
};

export function Avatar({ person, size = 'sm', ring = 'none', className, title }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const url = getAvatarUrl(person, AVATAR_BACKGROUNDS);

  if (failed) {
    return (
      <div
        title={title ?? person.name}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-accent-subtle font-semibold text-accent',
          sizes[size],
          rings[ring],
          className,
        )}
      >
        {getInitials(person.name)}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={person.name}
      title={title ?? person.name}
      onError={() => setFailed(true)}
      className={cn(
        'shrink-0 rounded-full bg-accent-subtle object-cover',
        sizes[size],
        rings[ring],
        className,
      )}
    />
  );
}
