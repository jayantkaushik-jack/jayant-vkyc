import { useState } from 'react';
import { cn } from '../../lib/cn';
import { getAvatarUrl, getInitials, type AvatarPerson } from '../../lib/avatar';

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

export function Avatar({ person, size = 'sm', ring = 'none', className, title }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const url = getAvatarUrl(person);

  const ringClass =
    ring === 'primary' ? 'ring-2 ring-primary ring-offset-1'
      : ring === 'gray' ? 'ring-2 ring-gray-300 ring-offset-1'
      : '';

  if (failed) {
    return (
      <div
        title={title ?? person.name}
        className={cn(
          'rounded-full bg-primary-soft text-primary font-semibold flex items-center justify-center shrink-0',
          sizes[size],
          ringClass,
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
      className={cn('rounded-full object-cover shrink-0 bg-primary-soft', sizes[size], ringClass, className)}
    />
  );
}
