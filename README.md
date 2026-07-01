# Cyber Hat

The corporate site for **Cyber Hat** (cyberh.at). A fast, fully static,
single-page site built on a small custom generator.

## Develop

```bash
npm install
npm run dev     # build + serve at http://localhost:8000
```

`npm run build` outputs a static `dist/` you can host anywhere.

## Where things live

- **`site.config.js`** — site name, domain, navigation, footer.
- **`src/css/tokens.css`** — the brand palette (cyan-on-midnight) and fonts.
- **`src/index.html`** — page content.
- The build pipeline, theming, partials, and SEO plumbing (generated
  `robots.txt` + `sitemap.xml`) come from the shared static-site starter.

## Contact

- General: hello@cyberh.at
- Security disclosures: security@cyberh.at
