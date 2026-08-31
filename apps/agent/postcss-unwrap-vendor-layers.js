/**
 * Cashmere's prebuilt CSS (lib/styles.css / lib/styles/globals.css, pulled in as a
 * side-effect of importing from '@cashfree-intl/cashmere') is Tailwind v4 output and
 * contains `@layer utilities { ... }` blocks with no matching `@tailwind utilities;`
 * directive in the same file. Tailwind v3's PostCSS plugin treats that as an error.
 * Since Vite loads postcss.config.js once per project (not per file), we can't skip
 * Tailwind via config-load-time context — this hoists `@layer` contents out of their
 * wrapper for vendor files specifically, before the tailwindcss plugin ever sees them.
 */
const VENDOR_MARKER = '@cashfree-intl/cashmere';

export default function unwrapVendorLayers() {
  return {
    postcssPlugin: 'unwrap-vendor-layers',
    Once(root) {
      const file = root.source?.input?.file || '';
      if (!file.includes(VENDOR_MARKER)) return;
      root.walkAtRules('layer', (atRule) => {
        atRule.replaceWith(atRule.nodes || []);
      });
    },
  };
}
unwrapVendorLayers.postcss = true;
