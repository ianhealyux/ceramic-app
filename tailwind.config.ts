import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ceramic: {
          50: '#faf8f5',
          100: '#f0ebe3',
          200: '#e0d5c6',
          300: '#cdb9a3',
          400: '#b89a7e',
          500: '#a88163',
          600: '#9b7057',
          700: '#815b49',
          800: '#6a4b3f',
          900: '#573f35',
        },
      },
    },
  },
  plugins: [],
};

export default config;
