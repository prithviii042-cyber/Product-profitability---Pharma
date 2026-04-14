/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'ey-yellow': '#FFE600',
        'ey-bg': '#1A1A1A',
        'ey-surface': '#2C2C2C',
        'ey-border': '#3A3A3A',
        'ey-text': '#FFFFFF',
        'ey-secondary': '#A0A0A0',
        'ey-danger': '#FF4C4C',
        'ey-success': '#00C48C',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
