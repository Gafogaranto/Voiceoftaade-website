const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
menuToggle.addEventListener("click", () => {
  const open = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  menuToggle.textContent = open ? "×" : "☰";
});
mainNav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
  mainNav.classList.remove("open");
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.textContent = "☰";
}));
document.getElementById("year").textContent = new Date().getFullYear();

const articles = {
  discipline: {
    category: "MINDSET",
    title: "Discipline is the quiet architecture of a meaningful life",
    paragraphs: [
      "Motivation is useful, but it is a visitor. It arrives with energy and can leave without warning. Discipline is the structure we build for the days when inspiration is nowhere to be found.",
      "A meaningful life rarely comes from one dramatic decision. More often, it is shaped by small choices repeated with care: keeping a promise to yourself, returning to a difficult task, and learning to distinguish what feels good now from what will serve you later.",
      "Discipline does not mean treating yourself harshly. It means giving your future self a fair chance. Start with one promise small enough to keep, then let consistency do its quiet work."
    ]
  },
  boundaries: {
    category: "RELATIONSHIPS",
    title: "Boundaries are not walls; they are instructions",
    paragraphs: [
      "A boundary is not a punishment or a declaration that you do not care. It is a clear statement about what you can accept, what you cannot carry, and what mutual respect should look like.",
      "Without boundaries, generosity can become resentment. We may keep saying yes while quietly wishing someone would notice our exhaustion. Clarity is kinder than silent frustration, even when the conversation feels uncomfortable.",
      "A healthy boundary cannot control another person's response. It can, however, help you choose your own response with honesty and consistency. Respect is not proved by having no limits; it is often proved by how limits are treated."
    ]
  },
  audience: {
    category: "MODERN LIFE",
    title: "Your life is bigger than the audience watching it",
    paragraphs: [
      "The internet can make every experience feel like a performance. A moment happens, and almost immediately we wonder how it will look to other people. Yet some of life's most important work happens beyond the reach of a camera.",
      "There is value in sharing achievements, documenting memories, and finding community online. The trouble begins when visibility becomes the measure of value and private progress starts to feel like failure.",
      "Let some victories remain yours alone. Read the book, practise the skill, repair the relationship, and make the difficult decision even when there is no audience to applaud. A life does not become real when it is posted."
    ]
  }
};
const dialog = document.getElementById("articleDialog");
document.querySelectorAll("[data-article]").forEach(button => {
  button.addEventListener("click", () => {
    const article = articles[button.dataset.article];
    if (!article) return;
    document.getElementById("dialogCategory").textContent = article.category;
    document.getElementById("dialogTitle").textContent = article.title;
    const body = document.getElementById("dialogBody");
    body.replaceChildren(...article.paragraphs.map(text => {
      const p = document.createElement("p");
      p.textContent = text;
      return p;
    }));
    dialog.showModal();
  });
});
document.getElementById("dialogClose").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});

let activeFilter = "All";
const searchInput = document.getElementById("articleSearch");
const cards = [...document.querySelectorAll(".article-card")];
function filterArticles() {
  const query = searchInput.value.trim().toLowerCase();
  let visible = 0;
  cards.forEach(card => {
    const matchCategory = activeFilter === "All" || card.dataset.category === activeFilter;
    const matchText = card.textContent.toLowerCase().includes(query);
    card.hidden = !(matchCategory && matchText);
    if (!card.hidden) visible++;
  });
  document.getElementById("noResults").hidden = visible !== 0;
}
document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach(item => item.classList.toggle("active", item === button));
    filterArticles();
  });
});
searchInput.addEventListener("input", filterArticles);
