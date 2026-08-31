import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X, Home, User, BarChart2, BookOpen, Info as InfoIcon } from 'lucide-react';
import { cn } from '@vkyc/shared/lib/cn';

/**
 * TEMPORARY local stand-in for `@cashfree-intl/cashmere`.
 *
 * That package lives on Cashfree's private Artifactory registry
 * (cashfreepayments.jfrog.io), which this machine has no credentials for, so
 * `npm install` 401s on it. This stub reproduces just the surface area the
 * app actually imports, styled on the same Tailwind tokens already wired up
 * in tailwind.config.js (bg-primary, bg-warning-subtle, etc.), so the app
 * runs and looks close to the real thing without the real dependency.
 *
 * To remove once registry auth is available: restore
 * `"@cashfree-intl/cashmere": "^5.1.29"` to apps/agent/package.json, delete
 * this file, and remove the alias in vite.config.ts + tsconfig.json.
 */

// ---- Button ----------------------------------------------------------

export interface ButtonColorConfig {
  textColor?: string;
  backgroundColor?: string;
  hoverBackgroundColor?: string;
  pressedBackgroundColor?: string;
  borderColor?: string;
  hoverBorderColor?: string;
  disabledColor?: string;
  disabledBackgroundColor?: string;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  buttonType?: 'primary' | 'secondary' | 'tertiary';
  size?: 'small' | 'medium' | 'large';
  negativeIntent?: boolean;
  colorConfig?: ButtonColorConfig;
  fullWidth?: boolean;
  isLoading?: boolean;
}

const SIZE_CLASS = { small: 'text-xs px-3 py-1.5', medium: 'text-sm px-4 py-2', large: 'text-base px-5 py-2.5' } as const;

export function Button({
  buttonType = 'primary',
  size = 'medium',
  negativeIntent,
  colorConfig,
  fullWidth,
  isLoading,
  className,
  style,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed';
  const variantClass =
    buttonType === 'secondary'
      ? cn(
          'border disabled:border-border-disabled disabled:text-text-disabled disabled:bg-transparent',
          negativeIntent ? 'border-danger text-danger hover:bg-danger-subtle' : 'border-border text-text hover:bg-surface',
        )
      : buttonType === 'tertiary'
        ? 'text-text hover:bg-surface disabled:text-text-disabled disabled:bg-transparent'
        : colorConfig
          ? '' // fully driven by the CSS variables set below — no class-based color at all
          : negativeIntent
            ? 'bg-danger text-white hover:bg-danger-hover active:bg-danger-pressed disabled:bg-bg-disabled disabled:text-text-disabled'
            : 'bg-primary text-white hover:bg-primary-hover disabled:bg-bg-disabled disabled:text-text-disabled';

  /*
   * colorConfig's hover/pressed/disabled fields used to be accepted but silently
   * dropped — an inline `style` attribute can only set the resting-state colors,
   * it can't express a `:hover`/`:active`/`:disabled` pseudo-class. Routing every
   * field through a CSS variable lets plain utility classes (which CAN take
   * pseudo-class variants) read them back, so the success-colored Accept
   * Call/Approve buttons actually get hover/pressed/disabled feedback instead of
   * looking inert.
   */
  const colorVars = colorConfig
    ? ({
        '--btn-bg': colorConfig.backgroundColor,
        '--btn-bg-hover': colorConfig.hoverBackgroundColor ?? colorConfig.backgroundColor,
        '--btn-bg-pressed': colorConfig.pressedBackgroundColor ?? colorConfig.hoverBackgroundColor ?? colorConfig.backgroundColor,
        '--btn-border': colorConfig.borderColor,
        '--btn-border-hover': colorConfig.hoverBorderColor ?? colorConfig.borderColor,
        '--btn-text': colorConfig.textColor,
        '--btn-bg-disabled': colorConfig.disabledBackgroundColor ?? colorConfig.backgroundColor,
        '--btn-text-disabled': colorConfig.disabledColor ?? colorConfig.textColor,
      } as React.CSSProperties)
    : undefined;

  return (
    <button
      className={cn(
        base,
        SIZE_CLASS[size],
        variantClass,
        colorConfig &&
          'bg-[var(--btn-bg)] text-[var(--btn-text)] border border-[var(--btn-border)] hover:bg-[var(--btn-bg-hover)] hover:border-[var(--btn-border-hover)] active:bg-[var(--btn-bg-pressed)] disabled:bg-[var(--btn-bg-disabled)] disabled:text-[var(--btn-text-disabled)] disabled:border-[var(--btn-bg-disabled)]',
        fullWidth && 'w-full',
        className,
      )}
      style={colorVars ? { ...colorVars, ...style } : style}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? 'Loading…' : children}
    </button>
  );
}

// ---- Tag ----------------------------------------------------------

type TagStatus = 'positive' | 'negative' | 'warning' | 'information' | 'intermediate';

const TAG_CLASS: Record<TagStatus, string> = {
  positive: 'bg-success-subtle text-success-strong border-success-subtle',
  negative: 'bg-danger-subtle text-danger border-danger',
  warning: 'bg-warning-subtle text-warning-text border-warning-border',
  information: 'bg-accent-subtle text-accent border-accent/30',
  intermediate: 'bg-bg text-text-muted border-border',
};

export function Tag({
  status = 'information',
  showIcon: _showIcon,
  size: _size,
  type: _type,
  className,
  children,
}: {
  status?: TagStatus;
  showIcon?: boolean;
  size?: 'small' | 'medium';
  type?: 'background' | 'outline';
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span className={cn('inline-flex items-center h-6 px-2 rounded text-xs font-medium border', TAG_CLASS[status], className)}>
      {children}
    </span>
  );
}

// ---- Tooltip ----------------------------------------------------------

export function Tooltip({
  label,
  children,
}: {
  label: string;
  position?: string;
  maxWidth?: number;
  children: ReactNode;
}) {
  return <span title={label}>{children}</span>;
}

// ---- Modal ----------------------------------------------------------

interface ModalRootProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtext?: string;
  className?: string;
  children: ReactNode;
}

function ModalRoot({ open, onOpenChange, title, subtext, className, children }: ModalRootProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className={cn('relative bg-surface rounded-xl shadow-card w-full max-w-lg max-h-[85vh] flex flex-col', className)}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-text">{title}</h2>
            {subtext && <p className="text-sm text-text-muted mt-0.5">{subtext}</p>}
          </div>
          <button type="button" onClick={() => onOpenChange(false)} className="text-text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalContent({ children }: { children: ReactNode }) {
  return <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>;
}

function ModalFooterSlot({ children }: { children: ReactNode }) {
  return <div className="px-5 py-3 border-t border-border flex justify-end gap-2">{children}</div>;
}

export const Modal = Object.assign(ModalRoot, { Content: ModalContent, Footer: ModalFooterSlot });

// ---- MetricCard ----------------------------------------------------------

export function MetricCard({
  title,
  metric,
  subtitle,
  className,
}: {
  title: ReactNode;
  metric: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-surface shadow-card p-4', className)}>
      <div className="mb-1">{title}</div>
      <div>{metric}</div>
      {subtitle && <div className="mt-1">{subtitle}</div>}
    </div>
  );
}

// ---- Toast ----------------------------------------------------------

export function Toast({
  state = 'success',
  className,
  children,
}: {
  type?: 'desktop';
  state?: 'success' | 'error';
  icon?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-lg px-4 py-2 text-sm font-medium',
        state === 'success' ? 'bg-success text-white' : 'bg-danger text-white',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---- Icon ----------------------------------------------------------

const ICON_MAP: Record<string, typeof Home> = {
  home: Home,
  user: User,
  bargraph: BarChart2,
  bookopentext: BookOpen,
};

export function Icon({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const Cmp = ICON_MAP[name] ?? InfoIcon;
  const px = size === 'lg' ? 20 : size === 'sm' ? 14 : 16;
  return <Cmp size={px} aria-hidden />;
}

// ---- LeftNavbar ----------------------------------------------------------

export interface LeftNavbarNavItem {
  type: 'link';
  id: string;
  label: string;
  href: string;
  current: boolean;
  icon: ReactNode;
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export interface LeftNavbarNavSection {
  id: string;
  items: LeftNavbarNavItem[];
}

function LeftNavbarRoot({ className, children }: { className?: string; children: ReactNode }) {
  return <aside className={cn('bg-primary text-white flex flex-col h-screen', className)}>{children}</aside>;
}

function LeftNavbarHeader({ icon }: { icon: ReactNode }) {
  return <div className="px-6 py-5">{icon}</div>;
}

function LeftNavbarNav({ sections }: { sections: LeftNavbarNavSection[] }) {
  return (
    <nav className="flex-1 px-3 space-y-1">
      {sections.flatMap((s) =>
        s.items.map((item) => (
          <a
            key={item.id}
            href={item.href}
            onClick={item.onClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm',
              item.current ? 'bg-white/15 font-semibold' : 'text-white/80 hover:bg-white/10',
            )}
          >
            {item.icon}
            {item.label}
          </a>
        )),
      )}
    </nav>
  );
}

export const LeftNavbar = Object.assign(LeftNavbarRoot, { Header: LeftNavbarHeader, Nav: LeftNavbarNav });

// ---- Logo ----------------------------------------------------------

export function Logo({ type: _type }: { type?: 'light' | 'dark' }) {
  return <span className="text-white font-semibold text-lg tracking-tight">Cashfree</span>;
}

// ---- Theme plumbing ----------------------------------------------------------

export function ThemeProvider({ children }: { defaultTheme?: string; children: ReactNode }) {
  return <>{children}</>;
}

export function GlobalStyle() {
  return null;
}
