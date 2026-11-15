const fs = require('node:fs');
const path = require('node:path');

const sitemap = fs.readFileSync(path.join(__dirname, 'sitemap.xml'), 'utf8');
const publicPages = [...sitemap.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(([, loc]) => {
  const pathname = new URL(loc.trim()).pathname;
  return '.' + pathname + (pathname.endsWith('/') ? 'index.html' : '');
});

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    ...publicPages,
    "./interested.html",
    "./account/index.html",
    "./zh/account/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
