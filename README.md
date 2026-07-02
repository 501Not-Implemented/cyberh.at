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

## Security

- `src/.well-known/security.txt` — RFC 9116 disclosure policy, clearsigned
  with the site's OpenPGP key (also served at `/security.txt`).
- `src/pgp-key.asc` — armored public key for `security@cyberh.at`
  (fingerprint `807D 0452 8CEE F382 2D22 8BB6 982C 9234 D7CC 75E4`).
- `src/.well-known/openpgpkey/` — Web Key Directory, so
  `gpg --locate-keys security@cyberh.at` resolves the key automatically.
- Pages ship a strict `Content-Security-Policy` meta tag; the inlined
  stylesheet is allowed by a hash computed at build time.

When the key is rotated or `security.txt` approaches its `Expires` date,
re-sign: `gpg -u security@cyberh.at --clearsign` the policy and re-export the
key files.

## Contact

- General: hello@cyberh.at
- Security disclosures: security@cyberh.at
