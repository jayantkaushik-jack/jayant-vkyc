import { Toast } from '@cashfree-intl/cashmere';
import { cn } from '@vkyc/shared/lib/cn';

/**
 * Agent-local InlineToast on cashmere's Toast.
 *
 * Same single-prop API as the shared version, but this is a real visual change rather
 * than a token swap: the shared component was a pale `bg-green-50` strip with green
 * text, where cashmere's success toast is a solid `--sds-positive-bg-active` (#008641)
 * panel with inverse text. The DS's toast is the louder of the two by design — it's
 * meant to read as a transient confirmation, which is exactly how this is used (it
 * appears for a moment after a successful PAN capture).
 *
 * `icon={false}` because cashmere uses that flag for the dismiss control, and these
 * toasts are driven by the call site's own `showToast` timer rather than dismissed by
 * hand. cashmere's Toast is not fixed-positioned, so it still lays out inline.
 */

export function InlineToast({ message, className }: { message: string; className?: string }) {
  return (
    <Toast type="desktop" state="success" icon={false} className={cn(className)}>
      {message}
    </Toast>
  );
}
