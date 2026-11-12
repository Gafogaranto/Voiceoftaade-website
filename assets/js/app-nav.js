(()=>{"use strict";
const links=[
  ["books.html","Library"],
  ["journals.html","Journal"],
  ["community.html","Community"],
  ["activity.html","Activity"],
  ["messages.html","Messages"],
  ["events.html","Events"],
  ["about.html","About"]
];
const current=location.pathname.split("/").pop()||"index.html";
let header=document.querySelector(".site-header");
if(!header){header=document.createElement("header");header.className="site-header";document.body.prepend(header);}
let brand=header.querySelector(".brand");
if(!brand){brand=document.createElement("a");brand.className="brand";brand.href="index.html";brand.setAttribute("aria-label","Voiceoftaade home");brand.innerHTML='<img class="brand-logo" src="assets/voiceoftaade-logo.jpg" alt="Voiceoftaade Publications">';header.prepend(brand);}
let nav=header.querySelector("nav.vt-primary-nav");
if(!nav){nav=header.querySelector("nav");}
if(!nav){nav=document.createElement("nav");header.append(nav);}
nav.className="vt-primary-nav";nav.setAttribute("aria-label","Primary navigation");
const active=(href)=>current===href||(href==="books.html"&&["store.html","featured.html"].includes(current))||(href==="community.html"&&["book-clubs.html"].includes(current));
nav.innerHTML=links.map(([href,label])=>'<a href="'+href+'"'+(active(href)?' aria-current="page" class="is-active"':"")+'>'+label+(href==="activity.html"?'<span class="vt-nav-badge" id="activityNavBadge" hidden></span>':"")+'</a>').join("")+
'<a class="vt-account-link" href="account.html"'+(["account.html","profile.html"].includes(current)?' aria-current="page"':"")+'><span class="vt-account-icon" aria-hidden="true">◉</span><span>My account</span></a>';
const oldToggle=header.querySelector(".menu-toggle,#menuToggle,.vt-menu-toggle");
const toggle=document.createElement("button");toggle.type="button";toggle.className="menu-toggle vt-menu-toggle";toggle.setAttribute("aria-label","Open navigation");toggle.setAttribute("aria-expanded","false");toggle.textContent="☰";
if(oldToggle)oldToggle.replaceWith(toggle);else header.append(toggle);
if(!nav.id)nav.id="vtPrimaryNav";toggle.setAttribute("aria-controls",nav.id);
const close=()=>{nav.classList.remove("open");toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-label","Open navigation");toggle.textContent="☰";};
toggle.addEventListener("click",()=>{const open=!nav.classList.contains("open");nav.classList.toggle("open",open);toggle.setAttribute("aria-expanded",String(open));toggle.setAttribute("aria-label",open?"Close navigation":"Open navigation");toggle.textContent=open?"×":"☰";});
nav.addEventListener("click",e=>{if(e.target.closest("a"))close();});
document.addEventListener("keydown",e=>{if(e.key==="Escape")close();});
document.addEventListener("click",e=>{if(!header.contains(e.target))close();});
const designLink=document.createElement("link");designLink.rel="stylesheet";designLink.href="assets/css/platform-redesign.css?v=20261112-platform1";document.head.appendChild(designLink);
const activityBadge=nav.querySelector("#activityNavBadge");
if(activityBadge&&window.supabase?.createClient){
 try{const client=window.supabase.createClient("https://qnnmbngxunmjerpeoxrr.supabase.co","sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67");client.auth.getUser().then(async({data})=>{if(!data?.user)return;const r=await client.from("reader_activity_notifications").select("id",{count:"exact",head:true}).eq("recipient_id",data.user.id).is("read_at",null);if(!r.error&&r.count>0){activityBadge.textContent=r.count>99?"99+":String(r.count);activityBadge.hidden=false;}});}catch(_){}
}
const accountLink=nav.querySelector(".vt-account-link");
if(accountLink&&window.supabase?.createClient){
 try{const client=window.supabase.createClient("https://qnnmbngxunmjerpeoxrr.supabase.co","sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67");client.auth.getUser().then(({data})=>{if(data?.user){accountLink.href="profile.html?id="+encodeURIComponent(data.user.id);accountLink.lastElementChild.textContent="My profile";}});}catch(_){}
}
document.body.classList.add("has-app-nav");
document.querySelectorAll(".vt-app-nav").forEach(el=>el.remove());
})();