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


// Daily Wisdom: one message per calendar date, selected consistently for all visitors.
const dailyWisdomMessages = [
  "Small choices, repeated with care, can shape a remarkable life.",
  "Protect your attention; what receives it often shapes what becomes of you.",
  "Growth begins when honesty becomes more important than appearances.",
  "You can move forward without having every answer today.",
  "A clear boundary can protect both your peace and your relationships.",
  "Do not confuse being busy with being purposeful.",
  "Let your values guide decisions that applause cannot sustain.",
  "Patience is not standing still; it is giving good work time to mature.",
  "A thoughtful pause can prevent a careless response.",
  "Your private progress matters, even when nobody notices it.",
  "Wisdom is not knowing everything; it is knowing what deserves your attention.",
  "Consistency turns modest effort into meaningful change.",
  "Make room for the kind of life you want to remember."
];
const today = new Date();
const dateKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, "0"), String(today.getDate()).padStart(2, "0")].join("-");
const dayNumber = Math.floor(new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() / 86400000);
const wisdomIndex = ((dayNumber % dailyWisdomMessages.length) + dailyWisdomMessages.length) % dailyWisdomMessages.length;
const wisdomQuote = dailyWisdomMessages[wisdomIndex];
const wisdomQuoteElement = document.getElementById("dailyWisdomQuote");
const wisdomDateElement = document.getElementById("dailyWisdomDate");
if (wisdomQuoteElement) wisdomQuoteElement.textContent = wisdomQuote;
if (wisdomDateElement) wisdomDateElement.textContent = today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

const shareWisdomButton = document.getElementById("shareWisdom");
if (shareWisdomButton) {
  shareWisdomButton.addEventListener("click", async () => {
    const shareText = 'Voiceoftaade Daily Wisdom\n“' + wisdomQuote + '”\n' + window.location.href.split("#")[0];
    if (navigator.share) {
      try { await navigator.share({ title: "Voiceoftaade Daily Wisdom", text: shareText, url: window.location.href.split("#")[0] }); }
      catch (error) { if (error.name !== "AbortError") console.error("Sharing failed:", error); }
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareText);
        shareWisdomButton.textContent = "Wisdom copied ✓";
      } catch {
        window.prompt("Copy today's wisdom:", shareText);
      }
    } else {
      window.prompt("Copy today's wisdom:", shareText);
    }
  });
}

// Saved reflections are stored only in this browser on this device.
const SAVED_REFLECTIONS_KEY = "voiceoftaade-saved-reflections-v1";
function getSavedReflections() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_REFLECTIONS_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(item => item && articles[item.id]) : [];
  } catch { return []; }
}
function storeSavedReflections(saved) {
  try {
    localStorage.setItem(SAVED_REFLECTIONS_KEY, JSON.stringify(saved));
    return true;
  } catch {
    alert("Your browser could not save this reflection. Check your device storage settings and try again.");
    return false;
  }
}
function renderSavedReflections() {
  const list = document.getElementById("savedList");
  if (!list) return;
  const saved = getSavedReflections();
  list.replaceChildren();
  if (!saved.length) {
    const empty = document.createElement("p");
    empty.className = "saved-empty";
    empty.textContent = "You haven't saved any reflections yet. Open a journal reflection and choose “Save reflection” to start your collection.";
    list.append(empty);
    return;
  }
  saved.forEach(item => {
    const article = articles[item.id];
    const card = document.createElement("article");
    card.className = "saved-card";
    const category = document.createElement("p");
    category.className = "eyebrow";
    category.textContent = article.category;
    const title = document.createElement("h3");
    title.textContent = article.title;
    const actions = document.createElement("div");
    actions.className = "saved-actions";
    const open = document.createElement("button");
    open.className = "read-more";
    open.type = "button";
    open.textContent = "Read reflection →";
    open.addEventListener("click", () => openArticle(item.id));
    const remove = document.createElement("button");
    remove.className = "read-more saved-remove";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", () => {
      storeSavedReflections(getSavedReflections().filter(entry => entry.id !== item.id));
      renderSavedReflections();
      updateSaveButton();
    });
    actions.append(open, remove);
    card.append(category, title, actions);
    list.append(card);
  });
}
let currentArticleId = null;
function updateSaveButton() {
  const button = document.getElementById("saveReflection");
  if (!button || !currentArticleId) return;
  const isSaved = getSavedReflections().some(item => item.id === currentArticleId);
  button.textContent = isSaved ? "★ Saved — remove from saved" : "☆ Save reflection";
  button.setAttribute("aria-pressed", String(isSaved));
}
function openArticle(id) {
  const article = articles[id];
  if (!article) return;
  currentArticleId = id;
  document.getElementById("dialogCategory").textContent = article.category;
  document.getElementById("dialogTitle").textContent = article.title;
  const body = document.getElementById("dialogBody");
  body.replaceChildren(...article.paragraphs.map(text => {
    const p = document.createElement("p");
    p.textContent = text;
    return p;
  }));
  updateSaveButton();
  if (!dialog.open) dialog.showModal();
}
document.querySelectorAll("[data-article]").forEach(button => {
  button.addEventListener("click", () => openArticle(button.dataset.article));
});
const saveReflectionButton = document.getElementById("saveReflection");
if (saveReflectionButton) {
  saveReflectionButton.addEventListener("click", () => {
    if (!currentArticleId) return;
    const saved = getSavedReflections();
    const existing = saved.some(item => item.id === currentArticleId);
    const next = existing
      ? saved.filter(item => item.id !== currentArticleId)
      : [...saved, { id: currentArticleId, savedAt: new Date().toISOString() }];
    if (storeSavedReflections(next)) {
      renderSavedReflections();
      updateSaveButton();
    }
  });
}
renderSavedReflections();
