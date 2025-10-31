/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        olive: {
          50: '#f6f7f3',
          100: '#e8eae2',
          200: '#d2d5c6',
          300: '#b4b9a3',
          400: '#969f80',
          500: '#7a8567',
          600: '#606953',
          700: '#4d5545',
          800: '#41483d',
          900: '#393d35',
        },
      },
    },
  },
  plugins: [],
}

