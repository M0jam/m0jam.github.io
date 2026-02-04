/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          400: 'rgb(var(--color-primary-400) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700) / <alpha-value>)',
        },
        glow: 'rgb(var(--color-glow) / <alpha-value>)',
        brand: {
          discord: '#5865F2',
          steam: '#171a21',
          'steam-hover': '#2a475e',
          twitch: '#9146FF',
          'twitch-hover': '#772ce8',
          gog: '#5d2d88',
          gogHover: '#4a246d',
          epic: '#333333'
        }
      },
    },
  },
  plugins: [],
}
