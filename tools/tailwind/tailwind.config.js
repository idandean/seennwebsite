// Compiles the Tailwind the site used to load from cdn.tailwindcss.com (v3.4.17 with the
// forms and typography plugins) into /css/tailwind.css. The theme below is the one
// js/script.js used to hand the CDN at runtime; keep it in sync with the site's design.
// Rebuild after adding or editing pages: `npm run build` in this folder.
module.exports = {
  content: {
    relative: true,
    files: [
      '../../*.html',
      '../../he/**/*.html',
      '../../blog/**/*.html',
      '../../alternatives/**/*.html',
      '../../js/**/*.js',
    ],
  },
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#6A2FF9',
        'background-light': '#F7F7F8',
        'background-dark': '#120B29',
        'text-light': '#18181B',
        'text-dark': '#E4E4E7',
        'card-light': '#FFFFFF',
        'card-dark': '#1A1435',
        'border-light': '#E4E4E7',
        'border-dark': '#3F3F46',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
