/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'PingFang SC', 'HarmonyOS Sans SC',
          'Microsoft YaHei', 'Noto Sans SC', 'Segoe UI', 'Roboto', 'sans-serif',
        ],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(51, 65, 105, 0.10)',
        'glass-lg': '0 16px 48px rgba(51, 65, 105, 0.16)',
        glow: '0 8px 24px rgba(99, 102, 241, 0.35)',
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease both',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
