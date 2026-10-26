/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          accent: '#06b6d4',
          accent2: '#0891b2',
        }
      }
    },
  },
  plugins: [],
};
