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
// Reflection opening is handled once by the collection-aware handler below.
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



// Original daily reflections inspired by themes in the book, not verbatim excerpts.
const dailyWisdomMessages = [
"Discipline is the quiet promise you keep when nobody is watching.",
"Do not let the noise of the world drown out the truth you must face.",
"Love should add meaning to your life, not require you to abandon yourself.",
"Fear may visit your mind; it does not have to make your decisions.",
"Time is not only something you spend. It is the life you are giving away.",
"Wisdom begins when you question your first reaction.",
"A boundary is a form of clarity: it tells others how respect can reach you.",
"Ambition without direction can exhaust you; purpose gives effort a destination.",
"Failure can inform your next step without defining your whole story.",
"Not every open door is your door, and not every delay is a defeat.",
"Choose peace that comes from honesty, not silence that hides the truth.",
"A meaningful life is built in ordinary moments, not only celebrated milestones.",
"The courage to begin is useful; the patience to continue is powerful.",
"Do not measure your worth by the attention of people who do not know your journey.",
"Forgiveness can release the past without pretending that nothing happened.",
"Your habits are small votes for the person you are becoming.",
"Love needs more than feeling: it needs respect, truth, and responsibility.",
"The wise person does not answer every provocation; some deserve no part of your day.",
"You can change your direction without denying how far you have travelled.",
"Comfort means little without meaning.",
"Let your principles remain steady even when public opinion changes direction.",
"Rest is not the enemy of progress; it helps you continue with intention.",
"Before you chase another achievement, ask what you want it to serve.",
"Being understood by everyone is not the price you must pay to live honestly.",
"The future is shaped by what you repeatedly practise in the present.",
"Humility is strength that does not need to announce itself.",
"Give people clarity instead of expecting them to read your silence.",
"A wise decision may be difficult today and still be kind to your future self.",
"Do not confuse a crowded schedule with a life filled with purpose.",
"You cannot control every outcome, but you can take responsibility for your next choice."
];
const today = new Date();
const dayNumber = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000);
const wisdomQuote = dailyWisdomMessages[((dayNumber % dailyWisdomMessages.length) + dailyWisdomMessages.length) % dailyWisdomMessages.length];
const wisdomQuoteElement = document.getElementById("dailyWisdomQuote");
const wisdomDateElement = document.getElementById("dailyWisdomDate");
if (wisdomQuoteElement) wisdomQuoteElement.textContent = "“" + wisdomQuote + "”";
if (wisdomDateElement) wisdomDateElement.textContent = today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

function drawWisdomCard() {
  const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Canvas is unavailable.");
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, "#12314e"); gradient.addColorStop(.58, "#07172b"); gradient.addColorStop(1, "#030b15");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1080, 1350);
  ctx.strokeStyle = "rgba(217,173,79,.3)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(540, 665, 390, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(540, 665, 330, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "#d9ad4f"; ctx.lineWidth = 3; ctx.strokeRect(54, 54, 972, 1242);
  ctx.strokeStyle = "rgba(217,173,79,.55)"; ctx.lineWidth = 1; ctx.strokeRect(72, 72, 936, 1206);
  ctx.textAlign = "center"; ctx.fillStyle = "#d9ad4f"; ctx.font = "54px Georgia"; ctx.fillText("✳", 540, 160);
  ctx.fillStyle = "#f7eed9"; ctx.font = "bold 35px Arial"; ctx.fillText("VOICEOFTAADE", 540, 218);
  ctx.fillStyle = "#d9ad4f"; ctx.font = "20px Arial"; ctx.fillText("PUBLICATIONS", 540, 256);
  ctx.fillStyle = "#d9ad4f"; ctx.font = "bold 22px Arial"; ctx.fillText("DAILY WISDOM", 540, 380);
  ctx.fillStyle = "#f7f1e5"; ctx.font = "46px Georgia";
  const words = ("“" + wisdomQuote + "”").split(/\s+/); const lines = []; let line = "";
  for (const word of words) {
    const candidate = line ? line + " " + word : word;
    if (ctx.measureText(candidate).width > 820 && line) { lines.push(line); line = word; } else line = candidate;
  }
  if (line) lines.push(line);
  let y = 610 - ((lines.length - 1) * 65) / 2;
  lines.forEach(text => { ctx.fillText(text, 540, y, 850); y += 65; });
  ctx.fillStyle = "#d9ad4f"; ctx.fillRect(390, 920, 300, 3);
  ctx.fillStyle = "#d8d4ca"; ctx.font = "19px Arial"; ctx.fillText("INSPIRED BY", 540, 985);
  ctx.fillStyle = "#f7eed9"; ctx.font = "bold 22px Arial"; ctx.fillText("SERIES OF LIFE HACKS TO LIVE BY", 540, 1025);
  ctx.fillStyle = "#d8d4ca"; ctx.font = "20px Arial";
  ctx.fillText(today.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), 540, 1110);
  ctx.fillStyle = "#d9ad4f"; ctx.font = "bold 18px Arial"; ctx.fillText("READ · REFLECT · LIVE DELIBERATELY", 540, 1200);
  ctx.fillStyle = "#d8d4ca"; ctx.font = "16px Arial"; ctx.fillText("gafogaranto.github.io/Voiceoftaade-website", 540, 1240);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Image creation failed.")), "image/png"));
}
const shareWisdomButton = document.getElementById("shareWisdom");
const wisdomShareStatus = document.getElementById("wisdomShareStatus");
if (shareWisdomButton) shareWisdomButton.addEventListener("click", async () => {
  shareWisdomButton.disabled = true;
  if (wisdomShareStatus) wisdomShareStatus.textContent = "Preparing your branded wisdom card…";
  try {
    const blob = await drawWisdomCard();
    const file = new File([blob], "Voiceoftaade-Daily-Wisdom.png", { type: "image/png" });
    const shareText = "Voiceoftaade Daily Wisdom — inspired by Series of Life Hacks to Live By.\n" + window.location.href.split("#")[0];
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ title: "Voiceoftaade Daily Wisdom", text: shareText, files: [file] });
      if (wisdomShareStatus) wisdomShareStatus.textContent = "Your branded wisdom card is ready to share.";
    } else {
      const url = URL.createObjectURL(blob); const link = document.createElement("a");
      link.href = url; link.download = "Voiceoftaade-Daily-Wisdom.png"; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      if (wisdomShareStatus) wisdomShareStatus.textContent = "Your branded PNG card has been downloaded. Attach it to your post or message.";
    }
  } catch (error) {
    if (error.name !== "AbortError" && wisdomShareStatus) wisdomShareStatus.textContent = "Could not create the image. Please try again.";
    if (error.name !== "AbortError") console.error("Wisdom card creation failed:", error);
  } finally { shareWisdomButton.disabled = false; }
});

const SAVED_REFLECTIONS_KEY = "voiceoftaade-saved-reflections-v2";
const FAVOURITE_REFLECTIONS_KEY = "voiceoftaade-favourite-reflections-v1";
function readCollection(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === "string" && articles[id]))] : [];
  } catch (error) { console.error("Collection read failed:", error); return []; }
}
function writeCollection(key, values) {
  try { localStorage.setItem(key, JSON.stringify([...new Set(values)])); return true; }
  catch (error) {
    console.error("Collection save failed:", error);
    alert("Your browser blocked local saving. Open the published site in Chrome, not a private/incognito tab, and try again.");
    return false;
  }
}
let currentArticleId = null;
function updateReflectionButtons() {
  if (!currentArticleId) return;
  const saveButton = document.getElementById("saveReflection");
  const favouriteButton = document.getElementById("favouriteReflection");
  const saved = readCollection(SAVED_REFLECTIONS_KEY).includes(currentArticleId);
  const favourite = readCollection(FAVOURITE_REFLECTIONS_KEY).includes(currentArticleId);
  if (saveButton) { saveButton.textContent = saved ? "✓ Saved — remove" : "＋ Save reflection"; saveButton.setAttribute("aria-pressed", String(saved)); }
  if (favouriteButton) { favouriteButton.textContent = favourite ? "♥ Remove favourite" : "♡ Add to favourites"; favouriteButton.setAttribute("aria-pressed", String(favourite)); }
}
function openArticle(id) {
  const article = articles[id]; if (!article) return;
  currentArticleId = id;
  document.getElementById("dialogCategory").textContent = article.category;
  document.getElementById("dialogTitle").textContent = article.title;
  const body = document.getElementById("dialogBody");
  body.replaceChildren(...article.paragraphs.map(text => { const p = document.createElement("p"); p.textContent = text; return p; }));
  updateReflectionButtons();
  if (!dialog.open) dialog.showModal();
}
document.querySelectorAll("[data-article]").forEach(button => button.addEventListener("click", () => openArticle(button.dataset.article)));
const saveReflectionButton = document.getElementById("saveReflection");
if (saveReflectionButton) saveReflectionButton.addEventListener("click", () => {
  if (!currentArticleId) return;
  const saved = readCollection(SAVED_REFLECTIONS_KEY);
  const next = saved.includes(currentArticleId) ? saved.filter(id => id !== currentArticleId) : [...saved, currentArticleId];
  if (writeCollection(SAVED_REFLECTIONS_KEY, next)) { renderCollections(); updateReflectionButtons(); }
});
const favouriteReflectionButton = document.getElementById("favouriteReflection");
if (favouriteReflectionButton) favouriteReflectionButton.addEventListener("click", () => {
  if (!currentArticleId) return;
  const favourites = readCollection(FAVOURITE_REFLECTIONS_KEY);
  const next = favourites.includes(currentArticleId) ? favourites.filter(id => id !== currentArticleId) : [...favourites, currentArticleId];
  if (writeCollection(FAVOURITE_REFLECTIONS_KEY, next)) { renderCollections(); updateReflectionButtons(); }
});
function renderCollectionInto(containerId, key, emptyText) {
  const list = document.getElementById(containerId); if (!list) return;
  list.replaceChildren(); const ids = readCollection(key);
  if (!ids.length) { const empty = document.createElement("p"); empty.className = "saved-empty"; empty.textContent = emptyText; list.append(empty); return; }
  ids.forEach(id => {
    const article = articles[id]; const card = document.createElement("article"); card.className = "saved-card";
    const category = document.createElement("p"); category.className = "eyebrow"; category.textContent = article.category;
    const title = document.createElement("h3"); title.textContent = article.title;
    const actions = document.createElement("div"); actions.className = "saved-actions";
    const open = document.createElement("button"); open.className = "read-more"; open.type = "button"; open.textContent = "Read reflection →"; open.addEventListener("click", () => openArticle(id));
    const remove = document.createElement("button"); remove.className = "read-more saved-remove"; remove.type = "button";
    remove.textContent = key === SAVED_REFLECTIONS_KEY ? "Remove saved" : "Remove favourite";
    remove.addEventListener("click", () => { writeCollection(key, readCollection(key).filter(item => item !== id)); renderCollections(); updateReflectionButtons(); });
    actions.append(open, remove); card.append(category, title, actions); list.append(card);
  });
}
function renderCollections() {
  renderCollectionInto("savedList", SAVED_REFLECTIONS_KEY, "No saved reflections yet. Open a journal article and tap “Save reflection”.");
  renderCollectionInto("favouriteList", FAVOURITE_REFLECTIONS_KEY, "No favourites yet. Open a journal article and tap “Add to favourites”.");
}
function setActiveCollection(which) {
  const isSaved = which === "saved";
  const savedButton = document.getElementById("showSaved");
  const favouritesButton = document.getElementById("showFavourites");
  if (savedButton) { savedButton.classList.toggle("active", isSaved); savedButton.setAttribute("aria-selected", String(isSaved)); }
  if (favouritesButton) { favouritesButton.classList.toggle("active", !isSaved); favouritesButton.setAttribute("aria-selected", String(!isSaved)); }
  const target = document.getElementById(isSaved ? "savedReflections" : "favouriteReflections");
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}
const showSavedButton = document.getElementById("showSaved");
const showFavouritesButton = document.getElementById("showFavourites");
if (showSavedButton) showSavedButton.addEventListener("click", () => setActiveCollection("saved"));
if (showFavouritesButton) showFavouritesButton.addEventListener("click", () => setActiveCollection("favourites"));
renderCollections();
