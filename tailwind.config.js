/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        spider: {
          night: '#070910',
          panel: '#0d111c',
          card: '#121827',
          red: '#d42736',
          crimson: '#8f1220',
          blue: '#1b4f9c',
          cobalt: '#15305f',
          line: 'rgba(255,255,255,0.12)',
          ink: '#f8fafc',
          muted: '#9ca8bc',
          gold: '#f2b84b',
          mint: '#37d39a'
        }
      },
      boxShadow: {
        glow: '0 0 34px rgba(212, 39, 54, 0.28)',
        blueglow: '0 0 34px rgba(27, 79, 156, 0.34)',
        card: '0 22px 80px rgba(0, 0, 0, 0.34)'
      },
      backgroundImage: {
        grid:
          'linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)',
        diagonals:
          'repeating-linear-gradient(135deg, rgba(255,255,255,0.055) 0 1px, transparent 1px 18px)',
        web:
          'radial-gradient(circle at 50% 0%, rgba(212,39,54,0.18), transparent 35%), radial-gradient(circle at 85% 15%, rgba(27,79,156,0.18), transparent 33%)'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif']
      }
    }
  },
  plugins: []
};
