/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brown-800': '#8b4513',
        'brown-700': '#a0522d',
        'brown-900': '#5c4033',
        'cream-50': '#f5f0e6',
        'cream-100': '#e8e0d0',
        'cream-200': '#d4c4a8',
      },
      fontFamily: {
        sans: ['"Microsoft YaHei"', '"SimSun"', 'serif'],
      },
    },
  },
  plugins: [],
}
