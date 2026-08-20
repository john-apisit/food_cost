/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef3e2',
          100: '#fde7c5',
          200: '#fbcf8b',
          300: '#f9b751',
          400: '#f79f17',
          500: '#e68900',
          600: '#c77400',
          700: '#a85f00',
          800: '#894a00',
          900: '#6a3500',
        },
      },
      fontFamily: {
        sans: [
          'IBM Plex Sans Thai',
          'Noto Sans Thai',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
