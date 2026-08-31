import { Modal as CashmereModal } from '@cashfree-intl/cashmere';
import { Button } from './Button';

/**
 * Drop-in replacement for the shared Modal, rendering cashmere's Modal underneath.
 *
 * cashmere's Modal is a compound component — Modal.Header / Modal.Content /
 * Modal.Footer — so the shared component's `title` + children + `footer` shape maps
 * onto it directly and the ~7 call sites keep their existing props.
 *
 * Two mismatches worth knowing about:
 *
 * 1. `onClose` vs `onOpenChange`. cashmere follows Radix and reports both directions;
 *    the shared API only has "closed". We forward just the close transition, which
 *    also means the built-in header close button, Esc and overlay click all land on
 *    the same `onClose` the call sites already pass.
 *
 * 2. `size`. cashmere has no size axis — the panel is a fixed `max-width: 34.25rem`
 *    (548px) coming from its own CSS module class. The shared sizes are kept because
 *    the report and call-log modals genuinely need to be wider than a confirm dialog,
 *    and are applied with Tailwind's `!` important modifier: a plain `max-w-*` utility
 *    is the same specificity as cashmere's class, so which one won would depend on
 *    stylesheet order — and cashmere's styles.css is injected when its module
 *    evaluates, so that order isn't something this app controls.
 *
 * Known dev-only console error, not ours to fix: Radix logs "`DialogContent` requires a
 * `DialogTitle`" for every modal here, even though the title renders. cashmere generates its
 * own `dialogTitleId` with `useId()` and passes it as `id` to Radix's `DialogTitle`, which
 * overrides the id Radix assigns from its own context. Radix's accessibility check then does
 * `getElementById(contextTitleId)`, misses, and warns. There is no prop that reconciles the
 * two — passing `Modal.Header` as a child hits the same override — so this can only be fixed
 * inside cashmere. The rendered markup is correct: the title is a real `<h2>` and the panel's
 * `aria-labelledby` points at it.
 */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Optional line under the title — cashmere renders this in the header. */
  subtext?: string;
}

/** `!` beats cashmere's own max-width without depending on stylesheet order. */
const SIZE_CLASS = {
  sm: '!max-w-md', // 28rem
  md: '!max-w-lg', // 32rem
  lg: '!max-w-2xl', // 42rem
} as const;

export function Modal({ open, onClose, title, children, footer, size = 'md', subtext }: ModalProps) {
  return (
    <CashmereModal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      className={SIZE_CLASS[size]}
      {...(subtext ? { subtext } : {})}
    >
      {/*
       * Explicit keys: cashmere re-maps its children internally to inject `hasFooter`,
       * and that map has no keys of its own — so passing two children here produces a
       * keyless array and a React warning. cloneElement preserves whatever key we set,
       * which silences it from this side.
       */}
      <CashmereModal.Content key="content">{children}</CashmereModal.Content>
      {footer && <CashmereModal.Footer key="footer">{footer}</CashmereModal.Footer>}
    </CashmereModal>
  );
}

/**
 * Unchanged API from the shared ModalFooter, now composing the agent-local Button so
 * the confirm action picks up cashmere's primary / negativeIntent / success colours.
 */
export function ModalFooter({
  onCancel,
  onConfirm,
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  confirmVariant = 'primary' as const,
  loading,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'destructive' | 'success';
  loading?: boolean;
}) {
  return (
    <>
      <Button variant="secondary" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button variant={confirmVariant} onClick={onConfirm} disabled={loading}>
        {confirmLabel}
      </Button>
    </>
  );
}
