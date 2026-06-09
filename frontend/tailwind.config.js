/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neuro: '#5EEBFF',
        success: '#7CFFB2',
        warning: '#FFC857',
        danger: '#FF5A6A',
        blacksite: '#0A0D10',
        surface: '#11161C',
        'surface-raised': '#161D25',
      },
      boxShadow: {
        'focus': '0 0 0 2px rgba(94, 235, 255, 0.25)',
      },
    },
  },
  plugins: [],
}
