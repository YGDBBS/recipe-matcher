/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          500: '#F97316',
        },
        yellow: {
          400: '#FACC15',
        },
        lime: {
          500: '#84CC16',
          600: '#65A30D',
        },
        coral: {
          400: '#FB923C',
        },
      },
      keyframes: {
        gradient: {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        slideIn: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        pulseOnce: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
      },
      animation: {
        gradient: 'gradient 3s ease infinite',
        slideIn: 'slideIn 0.3s ease-out',
        pulseOnce: 'pulseOnce 0.3s ease-out',
      },
      boxShadow: {
        'orange-glow': '0 0 20px rgba(249, 115, 22, 0.3)',
        'lime-glow': '0 0 20px rgba(132, 204, 22, 0.3)',
      },
      transitionDuration: {
        '300': '300ms',
      },
    },
  },
  plugins: [],
};
