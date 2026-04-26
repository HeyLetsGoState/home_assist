/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          50: '#1a1a2e',
          100: '#16213e',
          200: '#0f3460',
        },
        accent: {
          DEFAULT: '#e94560',
          blue: '#4facfe',
          green: '#43e97b',
          orange: '#fa8231',
          yellow: '#f7b731',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
