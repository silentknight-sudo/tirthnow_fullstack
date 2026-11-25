import type { Config } from 'tailwindcss';

/** Brand tokens from ADR-0018 (same as the website and app). */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#1C3C6B', 600: '#27508A', 900: '#0C1A30' },
        saffron: { DEFAULT: '#E07A2E', deep: '#C9692A', soft: '#E9A15F' },
        paper: { DEFAULT: '#F7F6F1', 2: '#EDEAE0' },
        ink: '#14233D',
        muted: '#5E6B80',
        line: 'rgba(28, 60, 107, 0.14)',
        sos: '#B3261E',
        ok: '#3F7A3F',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: { card: '0 4px 14px rgba(28, 60, 107, 0.08)' },
    },
  },
  plugins: [],
};

export default config;
