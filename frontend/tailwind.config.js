/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070b14', // Deepest background
          900: '#0b1329', // Elevated surface
          800: '#111d3e', // Card background
          700: '#1b2c59', // Border and secondary surface
          600: '#273f7d', // Active/hover state
        },
        brand: {
          primary: '#2563eb',
          accent: '#3b82f6',
          glow: '#60a5fa',
          cyan: '#38bdf8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
