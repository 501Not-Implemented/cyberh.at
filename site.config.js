/*
  site.config.js — the single source of truth for everything project-specific.
  Edit this file plus src/css/tokens.css to reskin; the rest is the engine.
*/

export default {
  /* ─── Identity ─────────────────────────────────────────────────────── */
  siteName: 'Cyber Hat',
  wordmark: { heavy: 'Cyber', light: 'Hat' },
  domain: 'https://cyberh.at',
  description:
    'Cyber Hat is a holding company backing specialised teams building the future of security.',
  themeColor: '#0a0f1c',

  /* ─── Languages ────────────────────────────────────────────────────── */
  langs: ['en'],
  defaultLang: 'en',

  /* ─── Pages ────────────────────────────────────────────────────────── */
  pages: ['index.html'],

  /* ─── Navigation ───────────────────────────────────────────────────── */
  nav: [
    { href: '/#approach', label: 'Approach' },
    { href: '/#focus', label: 'Focus' },
    { href: '/#contact', label: 'Contact' },
  ],

  /* ─── Footer ───────────────────────────────────────────────────────── */
  footer: {
    tagline: 'A holding company for the long term.',
    copyright: '© {{year}} Cyber Hat. All rights reserved.',
  },
};
