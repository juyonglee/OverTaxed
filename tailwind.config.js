/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        digital: ['"Share Tech Mono"', 'monospace'],
        pixel: ['"Press Start 2P"', 'monospace'],
        sans: ['"Pretendard"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', 'sans-serif'],
      },
      colors: {
        meter: {
          dark: '#0a0d12',
          card: '#141821',
          accent: '#1e2433',
          neonGreen: '#00ff66',
          neonRed: '#ff2a55',
          neonAmber: '#ffaa00',
          ledBg: '#051208',
          ledInactive: '#0b2612',
        }
      },
      boxShadow: {
        'glow-green': '0 0 15px rgba(0, 255, 102, 0.4), 0 0 30px rgba(0, 255, 102, 0.2)',
        'glow-red': '0 0 15px rgba(255, 42, 85, 0.5), 0 0 30px rgba(255, 42, 85, 0.3)',
        'glow-amber': '0 0 15px rgba(255, 170, 0, 0.5), 0 0 30px rgba(255, 170, 0, 0.25)',
      },
      animation: {
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink': 'blink 1s step-start infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.2' },
        }
      }
    },
  },
  plugins: [],
}
