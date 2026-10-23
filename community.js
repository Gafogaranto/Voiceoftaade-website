(() => {
 const $ = id => document.getElementById(id);
 $("year").textContent = new Date().getFullYear();
 const menu = $("menuToggle"), nav = $("mainNav");
 menu.addEventListener("click", () => { const open = nav.classList.toggle("open"); menu.setAttribute("aria-expanded", String(open)); menu.setAttribute("aria-label", open ? "Close navigation" : "Open navigation"); menu.textContent = open ? "×" : "☰"; });
 nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => { nav.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); menu.textContent = "☰"; }));
 const feed = $("communityFeed"), status = $("communityFeedStatus");
 const client = window.supabase?.createClient("https://qnnmbngxunmjerpeoxrr.supabase.co", "sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67");
 const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 async function load() {
  if (!client) { feed.innerHTML = '<p class="feed-state">The update feed is temporarily unavailable. Please visit our social channels below.</p>'; return; }
  const { data, error } = await client.from("community_announcements").select("id,title,body,category,source_platform,source_url,published_at").eq("published", true).order("published_at", { ascending: false }).limit(30);
  if (error) { console.error(error); feed.innerHTML = '<p class="feed-state">We could not load updates right now. Please check our social channels below.</p>'; return; }
  if (!data?.length) { feed.innerHTML = '<div class="feed-empty"><span>✳</span><h3>The next update is on its way.</h3><p>New publications, reflections, and announcements will appear here. Join a channel below to stay connected.</p></div>'; return; }
  feed.replaceChildren();
  data.forEach(item => {
   const card = document.createElement("article"); card.className = "feed-card";
   const tag = document.createElement("span"); tag.className = "feed-tag"; tag.textContent = item.category;
   const date = document.createElement("time"); date.className = "feed-date"; date.dateTime = item.published_at; date.textContent = new Date(item.published_at).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"});
   const title = document.createElement("h3"); title.textContent = item.title;
   const body = document.createElement("p"); body.textContent = item.body;
   const meta = document.createElement("div"); meta.className = "feed-card-meta"; const source = document.createElement("span"); source.textContent = "Shared by " + item.source_platform; meta.append(source,date);
   card.append(tag,title,body,meta);
   if (item.source_url && /^https?:\/\//i.test(item.source_url)) { const link = document.createElement("a"); link.className = "text-link"; link.href = item.source_url; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = "View original post ↗"; card.append(link); }
   feed.append(card);
  });
 }
 load();
})();