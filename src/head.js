/*
  Render-blocking bootstrap, loaded synchronously in <head> on every page so the
  classes/attributes below are set before first paint (no flash of wrong theme).
*/

/* Flag JS availability so CSS can serve no-JS fallbacks */
document.documentElement.classList.remove('no-js');
document.documentElement.classList.add('js');

/* Resolve theme before first paint: stored choice, else OS preference */
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var theme = (stored === 'light' || stored === 'dark')
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {}
})();
