import { cn } from '../../lib/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface rounded-xl border border-border shadow-card',
        padding && 'p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}
