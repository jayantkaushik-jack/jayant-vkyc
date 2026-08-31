import unwrapVendorLayers from './postcss-unwrap-vendor-layers.js';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// unwrapVendorLayers MUST run before tailwindcss — it strips the bare `@layer`
// wrappers out of cashmere's prebuilt Tailwind v4 CSS, which Tailwind v3's
// plugin would otherwise reject.
export default {
  plugins: [unwrapVendorLayers(), tailwindcss, autoprefixer],
};
