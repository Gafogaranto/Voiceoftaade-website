/* Voiceoftaade global shell: single responsive top navigation, never a second bottom bar. */
(() => {
  "use strict";
  const ROOT = "assets/css/app-shell.css?v=20261112-unified1";
  const links = [
    ["books.html","Library",["books.html","bookshelf.html","book-details.html","free-reading.html","reader.html"]],
    ["journals.html","Journal",["journals.html","life-a-case-study.html","life-a-case-study-chapter-two.html","life-a-case-study-chapter-three.html"]],
    ["events.html","Events",["events.html"]],
    ["community.html","Community",["community.html","book-clubs.html"]],
    ["community.html#messages","Messages",["dm.html"]],
    ["store.html","Store",["store.html"]],
    ["about.html","About",["about.html","contact.html","featured.html"]]
  ];
  const path = location.pathname.split("/").pop() || "index.html";
  const activeHref = path === "dm.html" || location.hash === "#messages" ? "community.html#messages" :
    (links.find((item) => item[2].includes(path))?.[0] || "");
  const stylesheet = document.querySelector('link[data-vt-app-shell="true"]') || document.createElement("link");
  stylesheet.rel = "stylesheet"; stylesheet.href = ROOT; stylesheet.dataset.vtAppShell = "true";
  if (!stylesheet.isConnected) document.head.appendChild(stylesheet);

  let header = document.querySelector("header.site-header");
  if (!header) {
    header = document.createElement("header");
    header.className = "site-header vt-shell-header";
    const announcement = document.querySelector("body > .announcement");
    if (announcement) announcement.insertAdjacentElement("afterend", header);
    else document.body.insertBefore(header, document.body.firstChild);
  }
  let brand = header.querySelector(".brand");
  if (!brand) {
    brand = document.createElement("a"); brand.className = "brand"; brand.href = "index.html";
    brand.setAttribute("aria-label", "Voiceoftaade home");
    brand.innerHTML = '<img class="brand-logo" src="assets/voiceoftaade-logo.jpg" alt="Voiceoftaade Publications">';
    header.prepend(brand);
  }
  header.querySelectorAll(":scope > nav, :scope > .site-nav, :scope > .main-nav").forEach(node => node.remove());
  header.querySelectorAll(":scope > .menu-toggle, :scope > #accountMenuToggle, :scope > #readerMenuToggle, :scope > #mobileMenuToggle, :scope > .vt-menu-toggle, :scope > .vt-profile-link").forEach(node => node.remove());

  const toggle = document.createElement("button");
  toggle.type = "button"; toggle.className = "vt-menu-toggle";
  toggle.setAttribute("aria-label", "Open site navigation");
  toggle.setAttribute("aria-controls", "vtMainNav"); toggle.setAttribute("aria-expanded", "false");
  toggle.textContent = "☰";
  const nav = document.createElement("nav");
  nav.id = "vtMainNav"; nav.setAttribute("aria-label", "Main navigation");
  nav.innerHTML = links.map(([href,label]) => {
    const current = activeHref === href && (href !== "community.html#messages" || location.hash === "#messages" || path === "dm.html");
    return '<a class="vt-nav-link '+(href==="community.html#messages"?"vt-nav-messages":"")+'" href="'+href+'" '+(current?'aria-current="page"':"")+'>'+label+(href==="community.html#messages"?' <span class="vt-unread-badge" id="vtUnreadBadge" hidden></span>':"")+'</a>';
  }).join("");
  const profile = document.createElement("a");
  profile.className = "vt-profile-link"; profile.href = "account.html";
  profile.setAttribute("aria-label", "Open your reader profile"); profile.title = "Your profile and settings";
  profile.textContent = "V";
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("vt-nav-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close site navigation" : "Open site navigation");
    toggle.textContent = open ? "×" : "☰";
  });
  nav.addEventListener("click", event => {
    if (event.target.closest("a")) {
      nav.classList.remove("vt-nav-open"); toggle.setAttribute("aria-expanded","false");
      toggle.setAttribute("aria-label","Open site navigation"); toggle.textContent="☰";
    }
  });
  document.addEventListener("click", event => {
    if (!header.contains(event.target) && nav.classList.contains("vt-nav-open")) {
      nav.classList.remove("vt-nav-open"); toggle.setAttribute("aria-expanded","false"); toggle.textContent="☰";
    }
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      nav.classList.remove("vt-nav-open"); toggle.setAttribute("aria-expanded","false"); toggle.textContent="☰";
    }
  });
  header.append(toggle, nav, profile);
  document.querySelectorAll(".vt-app-nav").forEach(node => node.remove());
  document.body.classList.remove("has-app-nav");
  document.body.classList.add("vt-shell-ready");

  const db = window.supabase?.createClient?.(
    "https://qnnmbngxunmjerpeoxrr.supabase.co",
    "sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67"
  );
  async function syncReader(user) {
    if (!user) {
      profile.href="account.html"; profile.textContent="V"; profile.innerHTML="V";
      profile.setAttribute("aria-label","Sign in or create a reader account");
      const badge=document.getElementById("vtUnreadBadge");
      if(badge){badge.hidden=true;badge.textContent="";}
      return;
    }
    profile.href="profile.html?id="+encodeURIComponent(user.id);
    profile.setAttribute("aria-label","Open your reader profile");
    const {data: reader} = await db.from("profiles").select("display_name,avatar_url").eq("id",user.id).maybeSingle();
    if(reader?.avatar_url) profile.innerHTML='<img src="'+String(reader.avatar_url).replace(/["<>]/g,"")+'" alt="">';
    else profile.textContent=(reader?.display_name||"V").trim().slice(0,1).toUpperCase();
    const {data: convs} = await db.from("reader_conversations").select("id")
      .or("user_one.eq."+user.id+",user_two.eq."+user.id);
    if(!convs?.length)return;
    const {count} = await db.from("reader_messages").select("id",{count:"exact",head:true})
      .in("conversation_id",convs.map(row=>row.id)).neq("sender_id",user.id).is("read_at",null);
    const badge=document.getElementById("vtUnreadBadge");
    if(badge && count>0){badge.hidden=false;badge.textContent=count>99?"99+":String(count);}
  }
  if (db) {
    db.auth.getUser().then(({data})=>syncReader(data?.user||null)).catch(()=>{});
    db.auth.onAuthStateChange((_event,session)=>{syncReader(session?.user||null).catch(()=>{});});
  }
})();
