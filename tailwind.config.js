/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="fire-night"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Golden Horizon fire system ──────────────────────────────
        fire: {
          red: '#FF3D00',
          orange: '#FF6B00',
          amber: '#FF9100',
          gold: '#FFB300',
          yellow: '#FFD43B',
          glow: '#FFE9A8',
        },
        paper: { DEFAULT: '#FFF7ED', dim: '#FFF1E0' },
        char: { DEFAULT: '#120A06', 2: '#20120A' },
        ink: '#1A0E06',
        // Occasional aurora accents (use 1 per view max)
        accent: {
          pink: '#FF4D8D',
          violet: '#6D28D9',
          teal: '#14B8A6',
        },

        // Primary scale (orange family) — drives brand utilities app-wide.
        primary: {
          50: '#FFF4E8', 100: '#FFE7CC', 200: '#FFD09E', 300: '#FFB05C',
          400: '#FF9100', 500: '#FF6B00', 600: '#FF3D00', 700: '#D62E00',
          800: '#A82400', 900: '#7A1B00', 950: '#430E00',
        },
        orange: {
          50: '#FFF4E8', 100: '#FFE7CC', 200: '#FFD09E', 300: '#FFB05C',
          400: '#FF9100', 500: '#FF6B00', 600: '#FF3D00', 700: '#D62E00',
          800: '#A82400', 900: '#7A1B00', 950: '#430E00',
        },
        success: {
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80',
          500: '#22c55e', 600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d', 950: '#052e16',
        },
        warning: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
          500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03',
        },
        danger: {
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 300: '#fca5a5', 400: '#f87171',
          500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d', 950: '#450a0a',
        },
      },
      fontFamily: {
        display: ['"Clash Display"', '"Archivo"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.03em',
        tighter: '-0.02em',
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '20px',
        '3xl': '28px',
        '4xl': '36px',
      },
      boxShadow: {
        'soft': '0 6px 22px rgba(67, 14, 0, 0.07)',
        'medium': '0 12px 34px rgba(67, 14, 0, 0.12)',
        'strong': '0 22px 54px rgba(67, 14, 0, 0.18)',
        'glow': '0 8px 30px rgba(255, 107, 0, 0.40)',
        'glow-lg': '0 14px 48px rgba(255, 107, 0, 0.50)',
        'gold-glow': '0 10px 36px rgba(255, 179, 0, 0.45)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out both',
        'rise': 'rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        'aurora-1': 'aurora1 22s ease-in-out infinite',
        'aurora-2': 'aurora2 28s ease-in-out infinite',
        'aurora-3': 'aurora3 19s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        rise: { '0%': { transform: 'translateY(14px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        aurora1: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(6%, -5%, 0) scale(1.18)' },
        },
        aurora2: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1.05)' },
          '50%': { transform: 'translate3d(-7%, 6%, 0) scale(1.25)' },
        },
        aurora3: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1.1)' },
          '50%': { transform: 'translate3d(4%, 5%, 0) scale(0.95)' },
        },
      },
    },
  },
  plugins: [],
}
