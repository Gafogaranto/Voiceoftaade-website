/* Voiceoftaade Publications: keep the entire website in light mode. */
(() => {
  const root = document.documentElement;
  root.setAttribute('data-theme', 'light');
  root.style.colorScheme = 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#fffaf4');
})();
