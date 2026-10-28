/* Voiceoftaade Publications: keep the entire website in light mode. */
(() => {
  const root = document.documentElement;
  root.setAttribute('data-theme', 'light');
  root.style.colorScheme = 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#fffaf4');
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-dropdown-trigger').forEach(trigger => {
      trigger.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        const dropdown = trigger.closest('.nav-dropdown');
        const expanded = dropdown.classList.toggle('open');
        trigger.setAttribute('aria-expanded', String(expanded));
      });
    });
    document.addEventListener('click', event => {
      document.querySelectorAll('.nav-dropdown.open').forEach(dropdown => {
        if (!dropdown.contains(event.target)) {
          dropdown.classList.remove('open');
          const trigger = dropdown.querySelector('.nav-dropdown-trigger');
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
        }
      });
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        document.querySelectorAll('.nav-dropdown.open').forEach(dropdown => {
          dropdown.classList.remove('open');
          const trigger = dropdown.querySelector('.nav-dropdown-trigger');
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
        });
      }
    });
  });
})();