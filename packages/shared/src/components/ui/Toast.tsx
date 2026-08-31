import { cn } from '../../lib/cn';

export function InlineToast({ message, className }: { message: string; className?: string }) {
  return (
    <div className={cn('px-3 py-2 bg-green-50 text-success rounded-lg text-sm border border-green-100', className)}>
      {message}
    </div>
  );
}
