/* Voiceoftaade premium UX enhancements: progressive, accessible, dependency-free. */
(() => {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const progress = document.createElement('div');
  progress.className = 'page-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  const topButton = document.createElement('button');
  topButton.className = 'back-to-top';
  topButton.type = 'button';
  topButton.setAttribute('aria-label', 'Back to top');
  topButton.title = 'Back to top';
  topButton.innerHTML = '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 7-7 7 7M12 5v14"/></svg>';
  document.body.appendChild(topButton);
  topButton.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  let scheduled = false;
  const updateScrollUI = () => {
    const root = document.documentElement;
    const max = root.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progress.style.width = (ratio * 100) + '%';
    topButton.classList.toggle('is-visible', window.scrollY > 480);
    scheduled = false;
  };
  window.addEventListener('scroll', () => {
    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(updateScrollUI);
    }
  }, { passive: true });
  window.addEventListener('resize', updateScrollUI, { passive: true });
  updateScrollUI();

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const candidates = document.querySelectorAll('main > section, main > article, .article-card, .book-card, .journal-card, .feature-card, .community-card, .product-card, .value-card');
    candidates.forEach((el) => {
      if (!el.classList.contains('reveal-on-scroll')) el.classList.add('reveal-on-scroll');
    });
    if (candidates.length) {
      document.documentElement.classList.add('reveal-ready');
      const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -35px 0px' });
      candidates.forEach((el) => observer.observe(el));
    }
  }
})();
