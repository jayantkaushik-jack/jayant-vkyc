import { Button as CashmereButton } from '@cashfree-intl/cashmere';
import type { ButtonProps as CashmereButtonProps } from '@cashfree-intl/cashmere';

/**
 * cashmere declares ButtonColorConfig in button.types.d.ts but doesn't re-export it
 * from the package barrel, so derive it rather than reaching past the exports map.
 */
type ButtonColorConfig = NonNullable<CashmereButtonProps['colorConfig']>;

/**
 * Drop-in replacement for the shared Button, rendering cashmere's Button underneath.
 *
 * Keeps the shared component's prop names (`variant`, `size`, children) so the ~100
 * existing call sites in this app don't each need rewriting, and maps them onto
 * cashmere's axes:
 *
 *   primary     -> buttonType="primary"
 *   secondary   -> buttonType="secondary"
 *   ghost       -> buttonType="tertiary"      (cashmere has no `ghost`)
 *   destructive -> buttonType="primary" + negativeIntent
 *   destructive-secondary
 *               -> buttonType="secondary" + negativeIntent  (cashmere treats
 *                  negativeIntent as orthogonal to buttonType and ships a
 *                  `secondary-negative` compound, so an outlined red is native rather
 *                  than something call sites hand-patch with border/text overrides)
 *   success     -> buttonType="primary" + colorConfig  (cashmere has no `success`;
 *                  the KYC flow needs a green affirmative for Accept Call / Approve /
 *                  Liveness-Correct, so we override the colours with the DS's own
 *                  --sds-positive-* values rather than inventing a green)
 *
 * cashmere's Button renders `children ?? label`, so children pass straight through
 * and icon+text call sites keep working.
 */

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'destructive-secondary'
  | 'success'
  | 'ghost';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  /** Native button type — cashmere reuses `type` for its own variant axis. */
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  isLoading?: boolean;
}

const SIZE_MAP = { sm: 'small', md: 'medium', lg: 'large' } as const;

/** --sds-positive-* — the DS's green, used for the affirmative KYC actions. */
const SUCCESS_COLOR_CONFIG: ButtonColorConfig = {
  textColor: '#fffffc', // --sds-positive-text-subtle
  backgroundColor: '#009b54', // --sds-positive-bg-default
  hoverBackgroundColor: '#04ab61', // --sds-positive-bg-hover
  pressedBackgroundColor: '#008641', // --sds-positive-bg-pressed
  borderColor: '#008641', // --sds-positive-border-default
  hoverBorderColor: '#008641',
  disabledColor: '#8d8d8d', // --sds-neutral-text-disabled
  disabledBackgroundColor: '#e8e8e8', // --sds-positive-bg-disabled
};

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  fullWidth,
  isLoading,
  className,
  children,
  ...props
}: ButtonProps) {
  const buttonType =
    variant === 'secondary' || variant === 'destructive-secondary'
      ? 'secondary'
      : variant === 'ghost'
        ? 'tertiary'
        : 'primary';

  return (
    <CashmereButton
      type={type}
      buttonType={buttonType}
      size={SIZE_MAP[size]}
      negativeIntent={variant === 'destructive' || variant === 'destructive-secondary'}
      {...(variant === 'success' ? { colorConfig: SUCCESS_COLOR_CONFIG } : {})}
      {...(fullWidth ? { fullWidth: true } : {})}
      {...(isLoading ? { isLoading: true } : {})}
      {...(className ? { className } : {})}
      {...props}
    >
      {children}
    </CashmereButton>
  );
}
