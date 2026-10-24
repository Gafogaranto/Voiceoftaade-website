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
// Advance the reflection on each page visit and persist the last index across tabs and browser restarts.
const wisdomVisitKey = "voiceoftaade-last-wisdom-index-v2";
let previousWisdomIndex = -1;
try {
  const storedWisdomIndex = Number(localStorage.getItem(wisdomVisitKey));
  if (Number.isInteger(storedWisdomIndex) && storedWisdomIndex >= 0 && storedWisdomIndex < dailyWisdomMessages.length) {
    previousWisdomIndex = storedWisdomIndex;
  }
} catch (error) { console.warn("Daily wisdom rotation storage is unavailable.", error); }
let wisdomIndex = previousWisdomIndex < 0
  ? Math.floor(Math.random() * dailyWisdomMessages.length)
  : (previousWisdomIndex + 1) % dailyWisdomMessages.length;
try { localStorage.setItem(wisdomVisitKey, String(wisdomIndex)); } catch (error) {
  console.warn("Daily wisdom rotation could not be saved.", error);
  wisdomIndex = (Math.floor(Date.now() / 1000) % dailyWisdomMessages.length);
}
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
const SUPABASE_URL = "https://qnnmbngxunmjerpeoxrr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67";
const readerSupabase = window.supabase && window.supabase.createClient
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;
let readerSession = null;
let readerCollections = { saved: [], favourite: [] };
let currentArticleId = null;
let pendingProgressId = null;
let collectionWriteQueue = Promise.resolve();

function localCollection(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === "string" && articles[id]))] : [];
  } catch (error) { console.error("Local collection read failed:", error); return []; }
}
function collectionType(key) { return key === SAVED_REFLECTIONS_KEY ? "saved" : "favourite"; }
function readCollection(key) {
  const type = collectionType(key);
  return readerSession ? readerCollections[type].slice() : localCollection(key);
}
function renderCollections() {
  renderCollectionInto("savedList", SAVED_REFLECTIONS_KEY, "No saved reflections yet. Open a journal article and tap “Save reflection”.");
  renderCollectionInto("favouriteList", FAVOURITE_REFLECTIONS_KEY, "No favourites yet. Open a journal article and tap “Add to favourites”.");
}
async function refreshReaderCollections() {
  if (!readerSupabase || !readerSession) return;
  const { data, error } = await readerSupabase.from("reader_journal_collections")
    .select("journal_id,collection_type,created_at")
    .eq("user_id", readerSession.user.id)
    .order("created_at", { ascending: false });
  if (error) { console.error("Could not load reader collections:", error); return; }
  readerCollections = { saved: [], favourite: [] };
  (data || []).forEach(row => {
    if (articles[row.journal_id] && readerCollections[row.collection_type] && !readerCollections[row.collection_type].includes(row.journal_id)) {
      readerCollections[row.collection_type].push(row.journal_id);
    }
  });
  renderCollections();
  updateReflectionButtons();
}
async function migrateLocalCollections() {
  if (!readerSupabase || !readerSession) return;
  const oldItems = [
    ...localCollection(SAVED_REFLECTIONS_KEY).map(journal_id => ({ journal_id, collection_type: "saved" })),
    ...localCollection(FAVOURITE_REFLECTIONS_KEY).map(journal_id => ({ journal_id, collection_type: "favourite" }))
  ];
  if (oldItems.length) {
    const rows = oldItems.map(item => ({ user_id: readerSession.user.id, ...item }));
    const { error } = await readerSupabase.from("reader_journal_collections").upsert(rows, { onConflict: "user_id,journal_id,collection_type", ignoreDuplicates: true });
    if (error) console.error("Local collection migration could not complete:", error);
  }
  await refreshReaderCollections();
}
async function toggleCollection(key, id) {
  const type = collectionType(key);
  if (!articles[id]) return;
  if (readerSupabase && readerSession) {
    const exists = readerCollections[type].includes(id);
    const result = exists
      ? await readerSupabase.from("reader_journal_collections").delete().eq("user_id", readerSession.user.id).eq("journal_id", id).eq("collection_type", type)
      : await readerSupabase.from("reader_journal_collections").upsert({ user_id: readerSession.user.id, journal_id: id, collection_type: type }, { onConflict: "user_id,journal_id,collection_type", ignoreDuplicates: true });
    if (result.error) { alert("We could not update your collection. Please check your connection and try again."); console.error(result.error); return; }
    await refreshReaderCollections();
    return;
  }
  const current = localCollection(key);
  const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id];
  try {
    localStorage.setItem(key, JSON.stringify([...new Set(next)]));
    renderCollections(); updateReflectionButtons();
  } catch (error) {
    console.error("Collection save failed:", error);
    alert("Your browser could not save this collection. Please check browser storage settings and try again.");
  }
}
function updateReflectionButtons() {
  if (!currentArticleId) return;
  const saveButton = document.getElementById("saveReflection");
  const favouriteButton = document.getElementById("favouriteReflection");
  const saved = readCollection(SAVED_REFLECTIONS_KEY).includes(currentArticleId);
  const favourite = readCollection(FAVOURITE_REFLECTIONS_KEY).includes(currentArticleId);
  if (saveButton) { saveButton.textContent = saved ? "✓ Saved — remove" : "＋ Save reflection"; saveButton.setAttribute("aria-pressed", String(saved)); }
  if (favouriteButton) { favouriteButton.textContent = favourite ? "♥ Remove favourite" : "♡ Add to favourites"; favouriteButton.setAttribute("aria-pressed", String(favourite)); }
}
let progressSaveTimer = null;
function trackReadingProgress(id, percent = 5) {
  if (!articles[id]) return;
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  if (!readerSupabase || !readerSession) { pendingProgressId = id; return; }
  const row = { user_id: readerSession.user.id, journal_id: id, progress_percent: safePercent, last_read_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  readerSupabase.from("reader_reading_progress").upsert(row, { onConflict: "user_id,journal_id" })
    .then(({ error }) => {
      if (error) console.error("Reading progress could not be saved:", error);
      else window.dispatchEvent(new CustomEvent("voiceoftaade:progress-saved", { detail: { journalId: id, progressPercent: safePercent } }));
    });
}
function measureJournalProgress() {
  if (!dialog || !currentArticleId) return;
  const maxScroll = dialog.scrollHeight - dialog.clientHeight;
  const percent = maxScroll <= 0 ? 100 : Math.round((dialog.scrollTop / maxScroll) * 100);
  clearTimeout(progressSaveTimer);
  progressSaveTimer = setTimeout(() => trackReadingProgress(currentArticleId, percent), 450);
}
dialog.addEventListener("scroll", measureJournalProgress, { passive: true });
dialog.addEventListener("close", () => {
  if (currentArticleId) measureJournalProgress();
});
function openArticle(id) {
  const article = articles[id]; if (!article) return;
  currentArticleId = id;
  document.getElementById("dialogCategory").textContent = article.category;
  document.getElementById("dialogTitle").textContent = article.title;
  const body = document.getElementById("dialogBody");
  body.replaceChildren(...article.paragraphs.map(text => { const p = document.createElement("p"); p.textContent = text; return p; }));
  updateReflectionButtons();
  trackReadingProgress(id);
  if (!dialog.open) dialog.showModal();
}
document.querySelectorAll("[data-article]").forEach(button => button.addEventListener("click", () => openArticle(button.dataset.article)));

function createJournalShareBlob() {
  const article = articles[currentArticleId];
  if (!article) throw new Error("Open a journal first.");
  const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Image canvas unavailable.");
  ctx.fillStyle = "#f5f0e5"; ctx.fillRect(0,0,1080,1350);
  const grad = ctx.createLinearGradient(0,0,1080,1350);
  grad.addColorStop(0,"#fffdf7"); grad.addColorStop(1,"#e8dfce");
  ctx.fillStyle=grad;ctx.fillRect(38,38,1004,1274);
  ctx.strokeStyle="#b58a3a";ctx.lineWidth=3;ctx.strokeRect(58,58,964,1234);
  ctx.strokeStyle="rgba(181,138,58,.35)";ctx.lineWidth=1;ctx.strokeRect(76,76,928,1198);
  ctx.textAlign="center";ctx.fillStyle="#b58a3a";ctx.font="28px Georgia";ctx.fillText("✦",540,145);
  ctx.fillStyle="#07172b";ctx.font="bold 34px Arial";ctx.fillText("VOICEOFTAADE",540,205);
  ctx.fillStyle="#8e6b2d";ctx.font="18px Arial";ctx.fillText("PUBLICATIONS  ·  DAILY JOURNAL",540,242);
  ctx.fillStyle="#8e6b2d";ctx.font="bold 19px Arial";ctx.fillText((article.category||"REFLECTION").toUpperCase(),540,325);
  ctx.fillStyle="#07172b";ctx.font="bold 42px Georgia";
  const wrap=(text,maxWidth,font)=>{ctx.font=font;const words=text.split(/\s+/),lines=[];let line="";for(const word of words){const test=line?line+" "+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word;}else line=test;}if(line)lines.push(line);return lines;};
  const titleLines=wrap(article.title,820,"bold 42px Georgia");let y=400;
  titleLines.forEach(line=>{ctx.fillText(line,540,y);y+=54;});
  ctx.fillStyle="#b58a3a";ctx.fillRect(445,y+18,190,3);y+=92;
  const quote=(article.paragraphs[0]||"").length>190?(article.paragraphs[0].slice(0,187).trim()+"…"):article.paragraphs[0]||"A moment to read, reflect, and live deliberately.";
  ctx.fillStyle="#28384a";ctx.font="29px Georgia";
  const quoteLines=wrap("“"+quote+"”",790,"29px Georgia").slice(0,8);
  quoteLines.forEach(line=>{ctx.fillText(line,540,y);y+=43;});
  ctx.fillStyle="#8e6b2d";ctx.fillRect(420,1085,240,2);
  ctx.fillStyle="#07172b";ctx.font="bold 20px Arial";ctx.fillText("READ · REFLECT · LIVE DELIBERATELY",540,1140);
  ctx.fillStyle="#4e5967";ctx.font="18px Arial";ctx.fillText("gafogaranto.github.io/Voiceoftaade-website/",540,1190);
  ctx.fillStyle="#8e6b2d";ctx.font="16px Arial";ctx.fillText("VOICEOFTAADE JOURNAL",540,1235);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Could not render journal image.")),"image/png"));
}
async function handleJournalImage(share) {
  const status=document.getElementById("journalShareStatus");
  const button=document.getElementById(share?"shareJournalImage":"downloadJournalImage");
  if(!currentArticleId)return;
  button.disabled=true;if(status)status.textContent="Preparing your elegant journal image…";
  try {
    const blob=await createJournalShareBlob();
    const file=new File([blob],"Voiceoftaade-Journal.png",{type:"image/png"});
    if(share&&navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
      await navigator.share({title:articles[currentArticleId].title,text:"Read more at https://gafogaranto.github.io/Voiceoftaade-website/",files:[file]});
      if(status)status.textContent="Journal image shared successfully.";
    } else {
      const url=URL.createObjectURL(blob),link=document.createElement("a");
      link.href=url;link.download="Voiceoftaade-Journal.png";document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),5000);
      if(status)status.textContent=share?"Your browser cannot share image files directly, so the image was downloaded. Share it from your Downloads folder.":"Your journal image has been downloaded and includes the Voiceoftaade website address.";
    }
  } catch(error) {
    if(error.name==="AbortError"){if(status)status.textContent="Sharing cancelled. You can still download the image.";}
    else {console.error(error);if(status)status.textContent="The image could not be created. Please try again.";}
  } finally {button.disabled=false;}
}
document.getElementById("downloadJournalImage")?.addEventListener("click",()=>handleJournalImage(false));
document.getElementById("shareJournalImage")?.addEventListener("click",()=>handleJournalImage(true));

const saveReflectionButton = document.getElementById("saveReflection");
if (saveReflectionButton) saveReflectionButton.addEventListener("click", () => {
  if (currentArticleId) toggleCollection(SAVED_REFLECTIONS_KEY, currentArticleId);
});
const favouriteReflectionButton = document.getElementById("favouriteReflection");
if (favouriteReflectionButton) favouriteReflectionButton.addEventListener("click", () => {
  if (currentArticleId) toggleCollection(FAVOURITE_REFLECTIONS_KEY, currentArticleId);
});
function renderCollectionInto(containerId, key, emptyText) {
  const list = document.getElementById(containerId); if (!list) return;
  list.replaceChildren();
  const ids = readCollection(key);
  if (!ids.length) { const empty = document.createElement("p"); empty.className = "saved-empty"; empty.textContent = emptyText; list.append(empty); return; }
  ids.forEach(id => {
    const article = articles[id]; if (!article) return;
    const card = document.createElement("article"); card.className = "saved-card";
    const category = document.createElement("p"); category.className = "eyebrow"; category.textContent = article.category;
    const title = document.createElement("h3"); title.textContent = article.title;
    const actions = document.createElement("div"); actions.className = "saved-actions";
    const open = document.createElement("button"); open.className = "read-more"; open.type = "button"; open.textContent = "Read reflection →"; open.addEventListener("click", () => openArticle(id));
    const remove = document.createElement("button"); remove.className = "read-more saved-remove"; remove.type = "button";
    remove.textContent = key === SAVED_REFLECTIONS_KEY ? "Remove saved" : "Remove favourite";
    remove.addEventListener("click", () => toggleCollection(key, id));
    actions.append(open, remove); card.append(category, title, actions); list.append(card);
  });
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
if (readerSupabase) {
  readerSupabase.auth.getSession().then(async ({ data, error }) => {
    if (error) { console.error("Reader session check failed:", error); return; }
    readerSession = data.session || null;
    if (readerSession) {
      await migrateLocalCollections();
      if (pendingProgressId) { const pending = pendingProgressId; pendingProgressId = null; trackReadingProgress(pending); }
    } else renderCollections();
  });
  readerSupabase.auth.onAuthStateChange((event, session) => {
    readerSession = session || null;
    if (session) setTimeout(async () => {
      await migrateLocalCollections();
      if (pendingProgressId) { const pending = pendingProgressId; pendingProgressId = null; trackReadingProgress(pending); }
    }, 0);
    else { readerCollections = { saved: [], favourite: [] }; pendingProgressId = null; renderCollections(); updateReflectionButtons(); }
  });
}
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

// Reopen the exact saved/favourite journal selected from the reader profile.
(() => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("openJournal");
  if (!id) return;
  window.setTimeout(() => {
    if (articles[id]) {
      const journalSection = document.getElementById("journal");
      if (journalSection) journalSection.scrollIntoView({ behavior: "smooth", block: "start" });
      openArticle(id);
    }
    params.delete("openJournal");
    const query = params.toString();
    history.replaceState({}, "", window.location.pathname + (query ? "?" + query : "") + window.location.hash);
  }, 0);
})();


// One short signature reveal per browser tab session; accessible and lightweight.
(() => {
  const intro = document.getElementById("brandIntro");
  if (!intro) return;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let alreadySeen = false;
  try { alreadySeen = sessionStorage.getItem("voiceoftaade-intro-seen") === "yes"; } catch (_) {}
  if (alreadySeen || reduceMotion) {
    intro.classList.add("intro-finished");
    intro.setAttribute("aria-hidden", "true");
    return;
  }
  try { sessionStorage.setItem("voiceoftaade-intro-seen", "yes"); } catch (_) {}
  window.setTimeout(() => {
    intro.classList.add("intro-finished");
    intro.setAttribute("aria-hidden", "true");
  }, 5600);
  window.setTimeout(() => intro.remove(), 5000);
})();
