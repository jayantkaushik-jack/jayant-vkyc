import type { Config } from 'tailwindcss';

export default {
  theme: {
    extend: {
      colors: {
        brand: {
          950: '#24004B',
        },
        primary: {
          DEFAULT: '#6434D6',
          hover: '#5527C0',
          soft: '#F3EFFB',
        },
        bg: '#F8F7FC',
        surface: '#FFFFFF',
        text: {
          DEFAULT: '#1A1523',
          muted: '#6F6A7D',
        },
        success: '#22A06B',
        danger: '#E5484D',
        warning: '#F5A623',
        border: '#EBE8F2',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(26, 21, 35, 0.04), 0 4px 12px rgba(26, 21, 35, 0.06)',
      },
    },
  },
} satisfies Partial<Config>;
