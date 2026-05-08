/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
        },
      },
      animation: {
        'fade-in':  'fadeIn 0.25s ease-in-out',
        'slide-in': 'slideIn 0.25s ease-out',
        'ping-slow':'ping 2s cubic-bezier(0,0,0.2,1) infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: 0 },                              '100%': { opacity: 1 } },
        slideIn: { '0%': { transform: 'translateY(-8px)', opacity: 0 },'100%': { transform: 'translateY(0)', opacity: 1 } },
      },
      boxShadow: {
        card:       '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        'card-lg':  '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.08)',
      },
    },
  },
  plugins: [],
};

