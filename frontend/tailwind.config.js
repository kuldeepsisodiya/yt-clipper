/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#101114',
        'surface-subtle': '#14161A',
        card: '#191B20',
        elevated: '#202329',
        border: 'rgba(255, 255, 255, 0.07)',
        'border-hover': 'rgba(255, 255, 255, 0.14)',
        'primary-text': '#F4F3F1',
        'secondary-text': '#9699A2',
        accent: {
          coral: '#FF795F',
          lavender: '#A99AEF',
          DEFAULT: '#FF795F',
        },
        status: {
          success: '#75D6A0',
          warning: '#E9BD75',
          error: '#F07878',
        }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glass-subtle': '0 4px 24px -1px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        'glass-elevated': '0 12px 40px -4px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        'coral-glow': '0 0 20px -3px rgba(255, 121, 95, 0.35)',
        'lavender-glow': '0 0 20px -3px rgba(169, 154, 239, 0.3)',
      },
      transitionTimingFunction: {
        'ease-spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      }
    },
  },
  plugins: [],
}
