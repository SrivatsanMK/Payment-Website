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
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        slate: {
          // ── Dark mode overrides ──────────────────────────────────────────
          // Page backgrounds  →  pure black
          900:  '#000000',   // was #0f172a — now #000000 (pure black)
          950:  '#000000',   // was #020617 — now #000000 (pure black)
          // Card / panel / sidebar surfaces  →  #2A2A2A
          800:  '#2A2A2A',   // was #1e293b
          850:  '#2A2A2A',   // custom fine-tuned dark card
          // Slightly lighter surface (inputs, rows)
          700:  '#333333',   // was #334155
          // Borders
          600:  '#3D3D3D',   // was #475569
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 4px 30px rgba(0, 0, 0, 0.03)',
        'premium-hover': '0 10px 40px rgba(0, 0, 0, 0.08)',
        'dark-premium': '0 4px 30px rgba(0, 0, 0, 0.4)',
        'dark-premium-hover': '0 10px 40px rgba(0, 0, 0, 0.6)',
      },
    },
  },
  plugins: [],
}
