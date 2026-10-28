/* Search, topic filters, and collection filters for the Voiceoftaade digital library. */
(() => {
  const search = document.getElementById('librarySearch');
  const filter = document.getElementById('libraryFilter');
  const grid = document.getElementById('libraryGrid');
  const results = document.getElementById('libraryResults');
  if (!search || !filter || !grid || !results) return;
  const cards = [...grid.querySelectorAll('.library-card')];
  const topicButtons = [...document.querySelectorAll('[data-topic]')];
  let activeTopic = 'all';
  const normalise = value => (value || '').toLocaleLowerCase().trim();
  function update() {
    const query = normalise(search.value);
    const kind = filter.value;
    let count = 0;
    cards.forEach(card => {
      const matchesQuery = !query || normalise(card.dataset.search + ' ' + card.textContent).includes(query);
      const matchesKind = kind === 'all' || card.dataset.kind === kind ||
        (kind === 'books' && card.dataset.kind === 'preview');
      const topics = normalise(card.dataset.topic).split(/\s+/);
      const matchesTopic = activeTopic === 'all' || topics.includes(activeTopic);
      const visible = matchesQuery && matchesKind && matchesTopic;
      card.hidden = !visible;
      if (visible) count++;
    });
    let message = count === 1 ? 'Showing 1 library item.' : 'Showing ' + count + ' library items.';
    if (query || kind !== 'all' || activeTopic !== 'all') message += ' Filters are active.';
    if (!count) message = 'No items match those filters. Try another title or topic.';
    results.textContent = message;
    let empty = grid.querySelector('.library-empty');
    if (!count && !empty) {
      empty = document.createElement('p');
      empty.className = 'library-empty';
      empty.textContent = 'No matching books or resources yet. Clear a filter to explore the full collection.';
      grid.appendChild(empty);
    } else if (count && empty) empty.remove();
  }
  search.addEventListener('input', update);
  filter.addEventListener('change', update);
  topicButtons.forEach(button => button.addEventListener('click', () => {
    activeTopic = button.dataset.topic || 'all';
    topicButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    update();
  }));
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      menuToggle.textContent = open ? '×' : '☰';
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.textContent = '☰';
    }));
  }
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  update();
})();
