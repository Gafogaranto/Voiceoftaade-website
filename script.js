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
const previousWisdom = sessionStorage.getItem("voiceoftaade-last-wisdom");
let wisdomIndex = Math.floor(Math.random() * dailyWisdomMessages.length);
if (dailyWisdomMessages.length > 1 && String(wisdomIndex) === previousWisdom) wisdomIndex = (wisdomIndex + 1) % dailyWisdomMessages.length;
sessionStorage.setItem("voiceoftaade-last-wisdom", String(wisdomIndex));
const wisdomQuote = dailyWisdomMessages[wisdomIndex];
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
  if (wisdomShareStatus) wisdomShareStatus.textContent = "Creating your Voiceoftaade wisdom image…";
  try {
    const blob = await drawWisdomCard();
    const file = new File([blob], "Voiceoftaade-Daily-Wisdom.png", { type: "image/png" });
    const shareText = "Voiceoftaade Daily Wisdom | Series of Life Hacks to Live By";
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ title: "Voiceoftaade Daily Wisdom", text: shareText, files: [file] });
        if (wisdomShareStatus) wisdomShareStatus.textContent = "Shared. Your branded image includes Voiceoftaade attribution.";
      } catch (shareError) {
        if (shareError.name === "AbortError") {
          if (wisdomShareStatus) wisdomShareStatus.textContent = "Sharing cancelled. You can still download the image below.";
        } else { throw shareError; }
      }
    } else {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl; link.download = "Voiceoftaade-Daily-Wisdom.png";
      link.style.display = "none"; document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
      if (wisdomShareStatus) wisdomShareStatus.textContent = "Your branded wisdom image has been downloaded. Share the PNG from your Downloads folder.";
    }
  } catch (error) {
    console.error("Voiceoftaade share card failed:", error);
    if (wisdomShareStatus) wisdomShareStatus.textContent = "The image could not be created in this browser. Refresh the page and try again.";
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

const chapterJournalData = [["Foundations of a Good Life","Perspective","Look beyond your first interpretation. Facts matter, but the story you attach to them deserves examination.","Separate facts from assumptions and choose a response that reflects your values."],["Foundations of a Good Life","Stillness","Stillness creates room to notice what constant noise conceals. A pause can help you recognise a feeling and choose a wiser response.","Take five quiet minutes. What thought keeps returning, and what useful action might it be asking of you?"],["Foundations of a Good Life","Discipline","Discipline is a promise made practical through repetition. It is not punishment; it is structure that helps your future self benefit from today's choices.","Choose one small commitment and keep it today, even if imperfectly."],["Foundations of a Good Life","Wisdom Over Noise","Not every loud opinion deserves authority over your life. Wisdom checks context, considers consequences, and knows when silence is wiser than reaction.","Before reacting to advice, ask whether it is informed, fair, and relevant to your situation."],["Foundations of a Good Life","Time","Time is part of the life you are building. Your routine reveals what receives your attention, by choice or by default.","Reduce one avoidable distraction and protect time for something meaningful."],["Matters of the Heart","Love Without Losing Yourself","Love should make room for your values, voice, friendships, and growth. Caring for someone need not mean abandoning your identity.","Name one need you hesitate to express. How can you communicate it kindly and clearly?"],["Matters of the Heart","Marriage","Partnership grows through everyday responsibility: listening, sharing burdens, repairing misunderstandings, and choosing honesty over avoidance.","Reflect on one habit that builds trust and one that could weaken it."],["Matters of the Heart","Boundaries","Boundaries are clear instructions for mutual respect, not tools for punishment. They help generosity remain sincere rather than turning into resentment.","Write one respectful sentence that communicates a limit you need to maintain."],["Matters of the Heart","Loyalty","Loyalty includes reliability, discretion, and truth. Blind agreement is not always care; honest guidance can protect a relationship better than silence.","Choose one action that demonstrates reliability today."],["Matters of the Heart","Forgiveness","Forgiveness can loosen resentment without pretending harm did not happen. Rebuilding trust and deciding what access someone should have are separate choices.","Consider what moving forward requires: a conversation, a boundary, support, or more time."],["Mindset and Motivation","Laziness and Spiritual Disconnection","When purpose feels distant, investigate the delay instead of insulting yourself. Fatigue, fear, uncertainty, and lack of structure need different responses.","Start one neglected task with a small step and notice what made beginning easier."],["Mindset and Motivation","Fear","Fear may warn you about uncertainty, but it does not have to make every decision. Courage can mean preparing carefully and taking one considered step.","Name a concern, examine the evidence, and identify a practical next step."],["Mindset and Motivation","Dream","A dream offers direction; a plan gives it somewhere to go. Ambition becomes useful when translated into actions you can practise and review.","Write one goal and the next action you can complete this week."],["Mindset and Motivation","Failure","Failure is information about an attempt, not a verdict on your identity. A setback may reveal a skill to learn or a strategy to revise.","Record one lesson from a disappointment and one adjustment for next time."],["Mindset and Motivation","Humility","Humility keeps confidence teachable. It lets you stand by sound convictions while remaining open to evidence and willing to correct mistakes.","Ask one sincere question today before trying to prove your point."],["Social Truth & Modern Struggles","Likes and Validation","Attention can be enjoyable, but it is an unstable measure of meaning. Private progress still matters when nobody notices it.","Would this action still feel worthwhile if nobody applauded or responded?"],["Social Truth & Modern Struggles","Faking and Authenticity","Maintaining appearances can consume the energy genuine growth requires. Authenticity is not oversharing; it means not constantly betraying your values.","Notice one area where you feel pressure to perform. What would a more honest choice look like?"],["Social Truth & Modern Struggles","The Soft Life","Comfort, rest, and joy matter, but comfort alone cannot supply purpose. Choose worthwhile effort and release needless struggle.","Which difficulty helps you grow, and which could be eased with a clearer boundary?"],["Social Truth & Modern Struggles","The Hustle","Hard work matters when it serves a meaningful direction. Constant activity can become exhaustion without progress if priorities are unclear.","Choose the task most connected to your priority and give it focused attention."],["Social Truth & Modern Struggles","Mental Peace","Peace is not the absence of responsibility. It can grow from honest conversations, realistic plans, healthy limits, and accepting what you cannot control.","Name one concern taking too much attention. Decide whether to address it, set a limit, or let it wait."]];
const journalVariants = [
 (title, body, prompt) => body + " Today's practice: " + prompt,
 (title, body, prompt) => "Consider " + title.toLowerCase() + " from a fresh angle. " + body + " Ask yourself: " + prompt,
 (title, body, prompt) => "The lesson is not meant to remain an idea. " + body + " Put it into practice today: " + prompt
];
function buildDailyChapterJournals() {
 const grid=document.getElementById("articleGrid"); if(!grid)return;
 const now=new Date(), day=Math.floor(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/86400000);
 grid.replaceChildren();
 chapterJournalData.forEach((item,index)=>{
  const [part,title,body,prompt]=item, id="chapter-"+index, variant=(day+index)%journalVariants.length;
  articles[id]={category:part.toUpperCase(),title:title+" — Daily Journal",paragraphs:[journalVariants[variant](title,body,prompt),"Reflection: where does this idea meet your life today? A small, deliberate change is a meaningful beginning.","VOICEOFTAADE JOURNAL PROMPT: "+prompt]};
  const card=document.createElement("article");card.className="article-card";card.dataset.category=part;
  const art=document.createElement("div");art.className="article-art "+(index%3===0?"art-olive":index%3===1?"art-clay":"art-blue");
  const n=document.createElement("span");n.textContent=String(index+1).padStart(2,"0");
  const artTitle=document.createElement("b");artTitle.textContent=title.toUpperCase();art.append(n,artTitle);
  const meta=document.createElement("div");meta.className="article-meta";
  const cat=document.createElement("span");cat.textContent=part.toUpperCase();
  const label=document.createElement("span");label.textContent="DAILY JOURNAL";meta.append(cat,label);
  const h=document.createElement("h3");h.textContent=title;
  const p=document.createElement("p");p.textContent=body;
  const button=document.createElement("button");button.className="read-more";button.type="button";button.textContent="Read today's journal →";button.addEventListener("click",()=>openArticle(id));
  card.append(art,meta,h,p,button);grid.append(card);
 });
 cards.splice(0,cards.length,...grid.querySelectorAll(".article-card"));filterArticles();
}
buildDailyChapterJournals();
renderCollections();
