/*
  Deferred page behaviour, shared by every page. Each concern lives in its own
  init function and degrades gracefully when its markup is absent, so pages only
  "light up" the features they actually include. (The before-first-paint
  bootstrap — js/theme classes — is in head.js.)
*/

/* Theme toggle button; follows the OS unless the visitor chose explicitly */
function initThemeToggle() {
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
  const systemTheme = () => (themeMedia.matches ? 'dark' : 'light');

  const applyTheme = theme => {
    root.setAttribute('data-theme', theme);
    if (themeToggle) {
      themeToggle.setAttribute(
        'aria-label',
        theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
      );
    }
  };

  applyTheme(root.getAttribute('data-theme') || systemTheme());

  themeMedia.addEventListener('change', () => {
    let stored = null;
    try {
      stored = localStorage.getItem('theme');
    } catch (e) {}
    if (stored !== 'light' && stored !== 'dark') applyTheme(systemTheme());
  });

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next =
        (root.getAttribute('data-theme') || systemTheme()) === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        localStorage.setItem('theme', next);
      } catch (e) {}
    });
  }
}

/* Section-rail progress fill and the back-to-top button, both scroll-driven */
function initScrollProgress() {
  const sectionRail = document.getElementById('sectionRail');
  const railFill = sectionRail?.querySelector('.rail-fill');
  const backToTop = document.getElementById('backToTop');

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    if (railFill) railFill.style.setProperty('--rail-progress', ratio.toFixed(4));
    const pastHero = window.scrollY > window.innerHeight * 0.6;
    if (sectionRail) sectionRail.classList.toggle('visible', pastHero);
    if (backToTop) backToTop.classList.toggle('visible', window.scrollY > window.innerHeight * 1.2);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  if (backToTop) {
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
}

/* Sync active state across the top-nav links and the vertical rail links. Both
   '#id' and '/#id' hrefs are matched, so shared nav links work from any page. */
function initScrollSpy() {
  const sectionLinkMap = new Map();
  document.querySelectorAll('.nav-links a[href*="#"], .rail-link[href*="#"]').forEach(a => {
    const id = (a.getAttribute('href') || '').split('#')[1];
    if (!id) return;
    const section = document.getElementById(id);
    if (!section) return;
    if (!sectionLinkMap.has(section)) sectionLinkMap.set(section, []);
    sectionLinkMap.get(section).push(a);
  });
  if (!sectionLinkMap.size) return;

  const spy = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        sectionLinkMap.forEach(links => links.forEach(l => l.classList.remove('active')));
        sectionLinkMap.get(entry.target)?.forEach(l => l.classList.add('active'));
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );
  sectionLinkMap.forEach((links, section) => spy.observe(section));
}

/* The top nav is otherwise CSS-only: a checkbox-hack hamburger drives the
   mobile menu, so there's no nav script. */

/* Fade cards in as they scroll into view. Only elements that start below the
   fold are animated — anything already on screen at load stays fully visible,
   so it never blinks out and fades back in. */
function initScrollReveal() {
  const fadeTargets = document.querySelectorAll(
    '.step-card, .info-block, .stat-card, .faq-item'
  );

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  const viewportH = window.innerHeight;
  fadeTargets.forEach(el => {
    const rect = el.getBoundingClientRect();
    const alreadyVisible = rect.top < viewportH && rect.bottom > 0;
    if (alreadyVisible) return;
    el.classList.add('fade-in');
    observer.observe(el);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initScrollProgress();
  initScrollSpy();
  initScrollReveal();
});
