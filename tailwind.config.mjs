/** @type {import('tailwindcss').Config} */
import typography from '@tailwindcss/typography';

export default {
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'warm-bg': '#FDFBF7',
        'warm-text': '#4A4A4A',
        'warm-accent': '#CFA7A7',
        'warm-sage': '#9CAF9C',
        'night-bg': '#1A1C23',
        'night-text': '#E5E5E5',
        'night-surface': '#252830',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Lato"', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'slide-up': 'slideUp 0.8s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [typography],
};
