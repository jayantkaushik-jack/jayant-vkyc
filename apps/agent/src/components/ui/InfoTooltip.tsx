import { Info } from 'lucide-react';
import { Tooltip } from '@cashfree-intl/cashmere';

/**
 * Agent-local fork of the shared InfoTooltip, rebuilt on cashmere's Tooltip.
 *
 * Two fixes over the shared version, which is left in place for the other apps:
 *
 * 1. Hit area. The shared one rendered a bare `<Info size={14} />` inside a button
 *    with no padding, giving a 14px-tall target — the single biggest source of
 *    undersized controls in this app (it appears beside most metric labels). WCAG
 *    2.2 (2.5.8) wants 24px minimum; cashmere's own small control is 32px. The glyph
 *    stays 14px so the visual weight beside a label is unchanged, but the button now
 *    has a 24px box with the overflow absorbed by a negative margin, so adding the
 *    hit area doesn't shift the label it sits next to.
 *
 * 2. Hover/focus and positioning are cashmere's, rather than a hand-rolled
 *    `useState` + absolutely-positioned span that couldn't flip near a viewport edge.
 *    `position="auto"` lets the DS pick a side.
 */

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  return (
    <Tooltip label={text} position="auto" maxWidth={224}>
      <button
        type="button"
        aria-label="More information"
        // 24px hit box, -5px margin so the 14px glyph still optically sits on the
        // label's baseline gap rather than pushing it apart.
        className="inline-flex h-6 w-6 -my-[5px] -mx-[5px] items-center justify-center rounded text-text-muted transition-colors hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <Info size={14} aria-hidden />
      </button>
    </Tooltip>
  );
}
