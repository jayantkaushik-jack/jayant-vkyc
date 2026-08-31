import preset from '../../packages/shared/tailwind-preset.ts';

/*
 * NOTE: cashmere's optional Tailwind preset ('@cashfree-intl/cashmere/tailwind') is
 * deliberately NOT used. It puts a sparse px scale into `theme.extend.spacing`
 * (`4: var(--sds-spacing-4)` = 4px, `8` = 8px, `16` = 16px, …), which *overrides*
 * Tailwind's same-named default keys rather than adding to them. Every `p-4`,
 * `gap-4` and `space-y-4` in this app — all authored against Tailwind's default
 * rem scale where 4 = 16px — silently collapsed to 4px, while keys the preset
 * doesn't define (3, 5, 6, 14 …) kept their rem values. The result was a mix of
 * two incompatible spacing vocabularies.
 *
 * Tailwind's default scale at a 16px root already lands on the same 4px grid as
 * cashmere's --sds-spacing-* tokens, so the DS palette is declared explicitly
 * below instead. The preset's colours are `var(--sds-*)` strings, which would also
 * break the ~40 opacity modifiers this app uses (`border-primary/20`).
 */

/**
 * The shared preset ships the legacy agent palette (purple #6434D6 brand, lavender
 * canvas, Inter). Cashmere is a monochrome system: near-black brand, off-white
 * surfaces, a single blue accent. Re-point the shared preset's colour names at
 * cashmere's semantic token values so every existing `bg-primary` / `text-text` /
 * `border-border` class in this app renders in the DS palette. packages/shared is
 * left untouched, so the other apps keep the old look.
 *
 * Values are literal hex rather than `var(--sds-*)` on purpose: the app uses ~40
 * opacity modifiers (`border-primary/20`, `bg-success/5`) and Tailwind can't apply
 * an alpha channel to a var holding a hex string. The app is light-theme only
 * (`defaultTheme="light"` in main.tsx); if dark mode is ever needed these should
 * become `rgb(var(--x) / <alpha-value>)` channel triplets.
 */
export default {
  presets: [preset],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/shared/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // --sds-brand-*: near-black, the DS primary action colour
        brand: { 950: '#1b1b1b' },
        primary: {
          DEFAULT: '#1b1b1b', // --sds-brand-bg-default
          hover: '#323232', // --sds-brand-bg-hover
          soft: '#e5edff', // --sds-accent-bg-subtle — soft states read as accent, not grey-on-grey
        },
        bg: '#f2f2f2', // --sds-neutral-bg-default-subtle (canvas)
        surface: '#fffffc', // --sds-neutral-bg-default-default (cards)
        text: {
          DEFAULT: '#1b1b1b', // --sds-neutral-text-primary
          muted: '#767676', // --sds-neutral-text-muted
          // "Not started" / inert indicators (round 8 token migration) — distinct
          // from muted: this is cashmere's actual disabled-content tone, not just
          // secondary text.
          disabled: '#8d8d8d', // --sds-neutral-text-disabled
        },
        success: {
          DEFAULT: '#009b54', // --sds-positive-bg-default
          hover: '#04ab61', // --sds-positive-bg-hover
          pressed: '#008641', // --sds-positive-bg-pressed
          subtle: '#dcffe9', // --sds-positive-bg-subtle-default (== --sds-positive-border-subtle)
          strong: '#007030', // --sds-positive-text-default / --sds-positive-border-strong
        },
        danger: {
          DEFAULT: '#b80000', // --sds-negative-bg-default / --sds-negative-text-default / --sds-negative-border-subtle
          hover: '#fa0000', // --sds-negative-bg-hover
          pressed: '#940000', // --sds-negative-bg-pressed
          subtle: '#ffe0e0', // --sds-negative-bg-subtle-default
        },
        warning: {
          DEFAULT: '#d89204', // --sds-warning-bg-default
          hover: '#fbb016', // --sds-warning-bg-hover
          pressed: '#694702', // --sds-warning-bg-pressed (== --sds-warning-border-strong)
          // For inline caution panels: cashmere has no inline-message component, so the
          // few places that need one build a custom panel from these.
          subtle: '#fff7e6', // --sds-warning-bg-subtle
          border: '#a06d03', // --sds-warning-border-subtle
          text: '#a06d03', // --sds-warning-text-default
        },
        border: '#e8e8e8', // --sds-neutral-border-light
        // Extra neutral-border tiers, read directly from the real package's
        // semantics.css now that file access exists (previously only -light was
        // sourced). -disabled and -muted share a hex (#d1d1d1) in the real tokens
        // but are kept as separate names since they mean different things at a
        // call site (an inert control vs. a de-emphasised divider).
        'border-strong': '#5f5f5f', // --sds-neutral-border-strong
        'border-muted': '#d1d1d1', // --sds-neutral-border-muted
        'border-disabled': '#d1d1d1', // --sds-neutral-border-disabled
        // Background for a disabled control's fill (buttons, inputs) — every
        // family's own *-bg-disabled resolves to this same neutral value in the
        // real tokens, so one flat name covers all of them.
        'bg-disabled': '#e8e8e8', // --sds-neutral-bg-default-disabled
        // Not in the shared preset — cashmere's accent, for links/info/selected states.
        // Also stands in for cashmere's Info category (--sds-info-*), which shares
        // these exact values — there is no separate "info" family in the real tokens,
        // and no purple family either, so the two spots in this app that used raw
        // purple for an informational callout (handover note, victim-flag reveal) are
        // re-mapped here rather than left on an invented color.
        accent: {
          DEFAULT: '#094eff', // --sds-accent-bg-default / --sds-info-bg-default
          hover: '#3870ff', // --sds-accent-bg-hover
          pressed: '#003bd1', // --sds-accent-bg-pressed
          subtle: '#e5edff', // --sds-accent-bg-subtle / --sds-info-bg-subtle
        },
        // Single focus-ring color across the whole app, matching the DS's own
        // --sds-focus-infocus-* — it intentionally does NOT vary with a control's
        // own color (a button's ring isn't tinted to match a green/red button)
        // so keyboard users always recognise the same focus indicator everywhere.
        focus: {
          DEFAULT: '#094eff', // --sds-focus-infocus-default
          error: '#b80000', // --sds-focus-infocus-error — for invalid/error inputs
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'], // --sds-family-web-font
      },
      spacing: {
        /*
         * Width of the cashmere LeftNavbar in this app. cashmere's own root is
         * `width: min(100%, 22.375rem)` — up to 358px, far more than a four-item nav
         * needs — so AgentSidebar pins it with `!w-sidebar`. Anything that has to line up
         * with the content column beside it (the fixed incoming-call overlay) uses the
         * same token, so the width lives in exactly one place.
         */
        sidebar: '16rem', // 256px
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(21, 21, 21, 0.08), 0 1px 2px 0 rgba(21, 21, 21, 0.04)', // --sds-shadow-base
        // Real elevation tiers, read from the package directly. These deliberately
        // override Tailwind's own sm/md/lg/xl defaults (not just add alongside them)
        // so every existing `shadow-lg` etc. in the app self-corrects to the DS's
        // actual values instead of Tailwind's unrelated defaults — e.g. the in-call
        // overlay menu's `shadow-lg` no longer accidentally uses a shadow that was
        // never part of this design system.
        sm: '0 1px 2px 0 rgba(21, 21, 21, 0.06)', // --sds-shadow-sm
        md: '0 4px 8px 0 rgba(21, 21, 21, 0.08), 0 2px 4px 0 rgba(21, 21, 21, 0.06)', // --sds-shadow-md
        lg: '0 12px 24px 0 rgba(21, 21, 21, 0.1), 0 4px 8px 0 rgba(21, 21, 21, 0.06)', // --sds-shadow-lg
        xl: '0 24px 48px 0 rgba(21, 21, 21, 0.12), 0 8px 16px 0 rgba(21, 21, 21, 0.08)', // --sds-shadow-xl
      },
    },
  },
};
