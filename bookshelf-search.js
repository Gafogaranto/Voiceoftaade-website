/* Accessible client-side search for the Voiceoftaade bookshelf. */
(() => {
  const input = document.getElementById('bookshelfSearch');
  const clear = document.getElementById('clearBookshelfSearch');
  const display = document.getElementById('bookshelfDisplay');
  const status = document.getElementById('bookshelfResults');
  if (!input || !clear || !display || !status) return;
  const cards = Array.from(display.querySelectorAll('.shelf-card'));
  const update = () => {
    const query = input.value.trim().toLocaleLowerCase();
    let shown = 0;
    cards.forEach(card => {
      const match = !query || card.textContent.toLocaleLowerCase().includes(query);
      card.hidden = !match;
      if (match) shown++;
    });
    status.textContent = query
      ? (shown ? `Showing ${shown} of ${cards.length} matching titles or projects.` : 'No titles match that search. Try a broader word.')
      : 'Showing all titles and reading projects.';
    clear.disabled = !input.value;
  };
  input.addEventListener('input', update);
  clear.addEventListener('click', () => { input.value = ''; update(); input.focus(); });
  update();
})();