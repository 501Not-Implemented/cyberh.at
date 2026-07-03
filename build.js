/*
  Static-site build: src/ → dist/. Driven entirely by site.config.js.

  - Expands `<!-- include name key="value" -->` directives in the source pages
    with the partials in src/partials/, substituting {{key}} placeholders.
    Per-include attributes win; anything unresolved falls back to the global
    values derived from site.config.js (siteName, domain, navLinks, year, …).
  - Concatenates the css/ modules in cascade order, minifies the result and
    inlines it into each page's <head> (replacing the stylesheet link) so first
    paint needs no render-blocking CSS request.
  - Minifies head.js and script.js.
  - Generates robots.txt and sitemap.xml from the config.
  - Copies the remaining static assets verbatim.

  Languages: the first entry in config.langs is the root/default language
  (src/ → dist/). Each extra language has translated twins in src/<lang>/ that
  build to dist/<lang>/. Partials resolve per language: src/partials/<lang>/
  first, falling back to the shared src/partials/.

  Run with: npm run build
*/

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { transform } from 'esbuild';
import config from './site.config.js';

const SRC = 'src';
const DIST = 'dist';

const { langs: LANGS, defaultLang: DEFAULT_LANG, pages: PAGES } = config;

/* Cascade-significant order — must match the documented order in tokens.css.
   tokens.css (the brand seam) loads first so every later module can use the
   design tokens it defines. */
const CSS_ORDER = [
  'tokens.css',
  'base.css',
  'chrome.css',
  'layout.css',
  'components.css',
  'footer.css',
  'responsive.css',
];

/* Verbatim assets. robots.txt + sitemap.xml are generated, not copied.
   .well-known carries security.txt (RFC 9116) and the OpenPGP Web Key
   Directory; pgp-key.asc is the armored public key linked from the site. */
const STATIC_ASSETS = ['fonts', 'favicon.svg', 'og-image.png', 'llms.txt', '.nojekyll', '.well-known', 'pgp-key.asc'];

const FAVICON_SIZES = [
  [16, 'favicon-16x16.png'],
  [32, 'favicon-32x32.png'],
  [180, 'apple-touch-icon.png'],
];

const INCLUDE_RE = /<!--\s*include\s+([\w-]+)((?:\s+[\w-]+=(?:"[^"]*"|'[^']*'))*)\s*-->/g;
const ATTR_RE = /([\w-]+)=(?:"([^"]*)"|'([^']*)')/g;

const YEAR = String(new Date().getFullYear());
const TODAY = new Date().toISOString().slice(0, 10);

const langPrefix = lang => (lang === DEFAULT_LANG ? '' : `/${lang}`);

/* Rewrite root-relative links (/foo, /#foo) into the current language subtree. */
function localizeHref(href, prefix) {
  if (!prefix) return href;
  if (href.startsWith('/')) return `${prefix}${href}`;
  return href;
}

function navLinksHtml(lang) {
  const prefix = langPrefix(lang);
  return config.nav
    .map(({ href, label }) => `<li><a href="${localizeHref(href, prefix)}">${label}</a></li>`)
    .join('\n          ');
}

/* CSP hash of the inlined stylesheet, set once the CSS bundle is built. */
let styleHash = '';

/* Values available to every partial as {{key}} (per-include attrs override). */
function globalsFor(lang) {
  const prefix = langPrefix(lang);
  return {
    siteName: config.siteName,
    domain: config.domain,
    description: config.description,
    themeColor: config.themeColor,
    year: YEAR,
    lang,
    langBase: `${config.domain}${prefix}`,
    homePrefix: `${prefix}/`,
    wordmarkHeavy: config.wordmark.heavy,
    wordmarkLight: config.wordmark.light,
    navLinks: navLinksHtml(lang),
    styleHash,
    footerTagline: config.footer.tagline,
    footerCopyright: config.footer.copyright.replace(/\{\{year\}\}/g, YEAR),
  };
}

const partialCache = new Map();

async function partial(name, lang) {
  const key = `${lang}:${name}`;
  if (!partialCache.has(key)) {
    let html;
    try {
      html = await readFile(path.join(SRC, 'partials', lang, `${name}.html`), 'utf8');
    } catch {
      html = await readFile(path.join(SRC, 'partials', `${name}.html`), 'utf8');
    }
    partialCache.set(key, html.replace(/\n$/, ''));
  }
  return partialCache.get(key);
}

const CSS_LINK_TAG = '<link rel="stylesheet" href="/css/styles.css">';

async function renderPage(file, lang, css) {
  const srcFile = lang === DEFAULT_LANG ? path.join(SRC, file) : path.join(SRC, lang, file);
  const outDir = lang === DEFAULT_LANG ? DIST : path.join(DIST, lang);
  const source = await readFile(srcFile, 'utf8');
  const globals = globalsFor(lang);

  let out = '';
  let last = 0;
  for (const match of source.matchAll(INCLUDE_RE)) {
    const [directive, name, attrs] = match;
    const vars = {};
    for (const [, key, dq, sq] of attrs.matchAll(ATTR_RE)) vars[key] = dq ?? sq;

    let html = await partial(name, lang);
    /* Per-include attribute → global → empty string. */
    html = html.replace(/\{\{([\w-]+)\}\}/g, (_, key) => vars[key] ?? globals[key] ?? '');

    out += source.slice(last, match.index) + html;
    last = match.index + directive.length;
  }
  out += source.slice(last);

  /* Substitute any page-level {{globals}} that live outside includes too. */
  out = out.replace(/\{\{([\w-]+)\}\}/g, (m, key) => globals[key] ?? m);

  if (/<!--\s*include\s/.test(out)) {
    throw new Error(`${srcFile}: unresolved include directive after rendering`);
  }
  if (!out.includes(CSS_LINK_TAG)) {
    throw new Error(`${srcFile}: stylesheet link not found, cannot inline CSS`);
  }
  out = out.replace(CSS_LINK_TAG, `<style>${css}</style>`);

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, file), out);
}

async function buildCss() {
  const parts = await Promise.all(
    CSS_ORDER.map(f => readFile(path.join(SRC, 'css', f), 'utf8'))
  );
  const { code } = await transform(parts.join('\n'), { loader: 'css', minify: true });
  return code;
}

async function buildJs(file) {
  const source = await readFile(path.join(SRC, file), 'utf8');
  const { code } = await transform(source, { loader: 'js', minify: true });
  await writeFile(path.join(DIST, file), code);
}

/* robots.txt + sitemap.xml, generated from config so the domain lives in one
   place. Sitemap lists every page × language; the home page ranks highest. */
async function buildSeoFiles() {
  await writeFile(
    path.join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${config.domain}/sitemap.xml\n`
  );

  const urls = LANGS.flatMap(lang =>
    PAGES.map(file => {
      const prefix = langPrefix(lang);
      const isHome = file === 'index.html';
      const loc = `${config.domain}${prefix}/${isHome ? '' : file}`;
      const priority = isHome ? '1.0' : '0.7';
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    })
  );

  await writeFile(
    path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
  );
}

async function buildFavicons() {
  const svg = await readFile(path.join(SRC, 'favicon.svg'));
  await Promise.all(
    FAVICON_SIZES.map(([size, name]) => {
      const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: size },
        background: 'rgba(0,0,0,0)',
      });
      return writeFile(path.join(DIST, name), resvg.render().asPng());
    })
  );
}

async function copyStatic() {
  await Promise.all(
    STATIC_ASSETS.map(asset =>
      cp(path.join(SRC, asset), path.join(DIST, asset), { recursive: true })
    )
  );
  /* RFC 9116 also allows /security.txt at the root; GitHub Pages can't
     redirect, so serve the same signed file from both locations. */
  await cp(path.join(SRC, '.well-known', 'security.txt'), path.join(DIST, 'security.txt'));
}

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
const css = await buildCss();
styleHash = createHash('sha256').update(css).digest('base64');
await Promise.all([
  ...LANGS.flatMap(lang => PAGES.map(file => renderPage(file, lang, css))),
  buildJs('head.js'),
  buildJs('script.js'),
  buildSeoFiles(),
  buildFavicons(),
  copyStatic(),
]);
console.log(`Built ${PAGES.length * LANGS.length} page(s) [${LANGS.join(', ')}] → ${DIST}/`);
