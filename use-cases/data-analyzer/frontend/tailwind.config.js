export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'chat-bg': '#f9fafb',
        'chat-surface': '#ffffff',
        'user-msg': '#10b981',
        'agent-msg': '#f3f4f6',
        'border-light': '#e5e7eb',
        primary: '#6366f1',
        'primary-dark': '#4f46e5',
      },
      animation: {
        'cursor-blink': 'cursor-blink 1s infinite',
        'fade-in': 'fade-in 0.3s ease-in',
      },
      keyframes: {
        'cursor-blink': {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
