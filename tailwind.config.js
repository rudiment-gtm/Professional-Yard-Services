/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          darkest: '#060f08',
          darker: '#0a1a0e',
          dark: '#0e2415',
          card: '#122a18',
          cardHover: '#17341f',
          border: '#1e4228',
          borderLight: '#285737',
          primary: '#2d7d46',
          primaryHover: '#359453',
          light: '#5cb56a',
          lighter: '#8dd49a',
          text: '#e4f0e8',
          muted: '#8db898',
          gold: '#d4a017',
          goldLight: '#f0bc2e',
        },
        service: {
          mowing: '#FDD835',
          fertilizer: '#4CAF50',
          pestControl: '#FF6F00',
          sprinklers: '#1E88E5',
          fullService: '#9C27B0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.4)',
        panel: '0 0 40px rgba(0,0,0,0.6)',
        glow: '0 0 20px rgba(45, 125, 70, 0.3)',
      },
    },
  },
  plugins: [],
};
