(()=>{"use strict";
const home="index.html",current=location.pathname.split("/").pop()||home;
const icon=(paths)=>'<svg class="vt-nav-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+paths+'</svg>';
const icons={
 home:icon('<path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/>'),
 library:icon('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"/><path d="M8 7h8M8 10h8"/>'),
 social:icon('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
 events:icon('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="m9 15 2 2 4-4"/>'),
 about:icon('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
 profile:icon('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
 back:icon('<path d="m15 18-6-6 6-6"/><path d="M9 12h12"/>'),
 chevron:icon('<path d="m7 10 5 5 5-5"/>')
};
const socialPages=["community.html","activity.html","messages.html","book-clubs.html"];
const libraryPages=["books.html","store.html","featured.html","bookshelf.html","book-details.html","reader.html","free-reading.html","journals.html"];
const active=(name)=>name==="home"?current===home:name==="library"?libraryPages.includes(current):name==="social"?socialPages.includes(current):name==="events"?current==="events.html":name==="about"?current==="about.html":false;
let header=document.querySelector(".site-header");
if(!header){header=document.createElement("header");header.className="site-header";document.body.prepend(header);}
let brand=header.querySelector(".brand");
if(!brand){brand=document.createElement("a");brand.className="brand";brand.href=home;brand.setAttribute("aria-label","Voiceoftaade home");brand.innerHTML='<img class="brand-logo" src="assets/voiceoftaade-logo.jpg" alt="Voiceoftaade Publications">';}
else brand.href=home;
let nav=header.querySelector("nav.vt-primary-nav")||header.querySelector("nav");
if(!nav){nav=document.createElement("nav");}
nav.className="vt-primary-nav";nav.id="vtPrimaryNav";nav.setAttribute("aria-label","Primary navigation");
nav.innerHTML=
'<a class="vt-nav-link '+(active("home")?"is-active":"")+'" href="index.html"'+(active("home")?' aria-current="page"':"")+'>'+icons.home+'<span>Home</span></a>'+
'<a class="vt-nav-link '+(active("library")?"is-active":"")+'" href="books.html"'+(active("library")?' aria-current="page"':"")+'>'+icons.library+'<span>Library</span></a>'+
'<div class="vt-social-menu '+(active("social")?"is-active":"")+'"><button type="button" class="vt-social-trigger" id="vtSocialTrigger" aria-expanded="false" aria-controls="vtSocialSubnav">'+icons.social+'<span>Social</span>'+icons.chevron+'</button><div class="vt-social-subnav" id="vtSocialSubnav" hidden>'+
'<a href="community.html"'+(current==="community.html"?' aria-current="page"':"")+'>'+icon('<path d="M4 5h16v12H8l-4 3z"/><path d="M8 9h8M8 13h5"/>')+'<span>Community</span></a>'+
'<a href="activity.html"'+(current==="activity.html"?' aria-current="page"':"")+'>'+icon('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>')+'<span>Activity</span><span class="vt-nav-badge" id="activityNavBadge" hidden></span></a>'+
'<a href="messages.html"'+(current==="messages.html"?' aria-current="page"':"")+'>'+icon('<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-4.7a9 9 0 0 1-.9-4.3A8.5 8.5 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8z"/>')+'<span>Messages</span></a>'+
'<a href="book-clubs.html"'+(current==="book-clubs.html"?' aria-current="page"':"")+'>'+icon('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z"/><path d="M8 7h8M8 11h8M8 15h5"/>')+'<span>Book clubs</span></a>'+
'<a href="book-clubs.html#clubRequests"'+(current==="book-clubs.html"&&location.hash==="#clubRequests"?' aria-current="page"':"")+'>'+icon('<path d="M4 6h16M4 12h10M4 18h7"/><path d="m16 16 2 2 4-4"/>')+'<span>Membership requests</span></a>'+
'<a id="vtOwnerApprovalLink" href="book-clubs.html#platformApprovals" hidden>'+icon('<path d="M8 3h8l3 3v15H5V3z"/><path d="M8 12h8M8 16h5M8 8h4"/><path d="m15 15 2 2 4-4"/>')+'<span>Owner approvals</span></a>'+
'</div></div>'+
'<a class="vt-nav-link '+(active("events")?"is-active":"")+'" href="events.html"'+(active("events")?' aria-current="page"':"")+'>'+icons.events+'<span>Events</span></a>'+
'<a class="vt-nav-link '+(active("about")?"is-active":"")+'" href="about.html"'+(active("about")?' aria-current="page"':"")+'>'+icons.about+'<span>About</span></a>'+
'<a class="vt-nav-link vt-profile-link" href="profile.html"'+(["profile.html","profile-settings.html","account.html"].includes(current)?' aria-current="page"':"")+'>'+icons.profile+'<span>My profile</span></a>';
let back=header.querySelector(".vt-back-button");
if(!back){back=document.createElement("button");back.type="button";back.className="vt-back-button";back.innerHTML=icons.back+'<span>Back</span>';back.setAttribute("aria-label","Go to the previous page or homepage");}
back.hidden=current===home;
back.addEventListener("click",()=>{
 let ref=null;try{if(document.referrer){const u=new URL(document.referrer);if(u.origin===location.origin&&u.href!==location.href)ref=u.href;}}catch(_){}
 if(ref&&history.length>1)history.back();else location.href=home;
});
const oldToggle=header.querySelector(".menu-toggle,#menuToggle,.vt-menu-toggle");
const toggle=document.createElement("button");toggle.type="button";toggle.className="menu-toggle vt-menu-toggle";toggle.setAttribute("aria-label","Open navigation");toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-controls",nav.id);toggle.innerHTML=icon('<path d="M4 7h16M4 12h16M4 17h16"/>');
if(oldToggle)oldToggle.replaceWith(toggle);
const children=[brand,back,nav,toggle];header.replaceChildren(...children);
const closeNav=()=>{nav.classList.remove("open");toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-label","Open navigation");toggle.textContent="☰";};
toggle.addEventListener("click",()=>{const open=!nav.classList.contains("open");nav.classList.toggle("open",open);toggle.setAttribute("aria-expanded",String(open));toggle.setAttribute("aria-label",open?"Close navigation":"Open navigation");toggle.textContent=open?"×":"☰";});
const socialButton=nav.querySelector("#vtSocialTrigger"),socialPanel=nav.querySelector("#vtSocialSubnav");
const closeSocial=()=>{socialPanel.hidden=true;socialButton.setAttribute("aria-expanded","false");socialButton.closest(".vt-social-menu").classList.remove("menu-open");};
socialButton.addEventListener("click",()=>{const open=socialPanel.hidden;socialPanel.hidden=!open;socialButton.setAttribute("aria-expanded",String(open));socialButton.closest(".vt-social-menu").classList.toggle("menu-open",open);});
nav.addEventListener("click",e=>{if(e.target.closest("a")){closeSocial();closeNav();}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeSocial();closeNav();}});
document.addEventListener("click",e=>{if(!header.contains(e.target)){closeSocial();closeNav();}});
const fallback=document.createElement("style");fallback.id="vtNavFallbackStyles";fallback.textContent='.site-header{position:sticky!important;top:0;z-index:1200;display:flex!important;align-items:center;gap:12px;min-height:70px;padding:8px 16px!important;background:#fffbf5!important;border-bottom:1px solid #e7e1d6}.site-header .brand{display:flex;align-items:center;flex:0 0 auto}.site-header .brand-logo{width:54px!important;height:50px!important;object-fit:contain}.site-header nav.vt-primary-nav{display:flex!important;align-items:center;justify-content:flex-end;gap:18px;margin-left:auto}.site-header nav.vt-primary-nav a,.site-header nav.vt-primary-nav button{display:inline-flex;align-items:center;gap:7px;color:#41564d;text-decoration:none;background:transparent;border:0;font:600 .82rem/1.2 sans-serif}.vt-nav-icon{display:block;width:18px;height:18px;flex:0 0 18px}.site-header .vt-back-button{display:inline-flex;align-items:center;gap:5px;border:0;background:transparent;color:#68756e}.site-header .vt-menu-toggle{display:none;align-items:center;justify-content:center;width:44px;height:44px;margin-left:auto;border:1px solid #dfd3c5;border-radius:12px;background:#fffdf9;color:#183a32}.vt-social-menu{position:relative}.vt-social-subnav{position:absolute;top:100%;left:0;z-index:1300;display:grid;min-width:210px;padding:9px;background:#fffdf9;border:1px solid #e7e1d6;border-radius:14px;box-shadow:0 12px 32px #183a3220}.vt-social-subnav[hidden],#vtOwnerApprovalLink[hidden]{display:none!important}@media(max-width:900px){.site-header .vt-menu-toggle{display:inline-flex!important}.site-header nav.vt-primary-nav{display:none!important;position:absolute;top:100%;left:0;right:0;z-index:1201;flex-direction:column;align-items:stretch;gap:4px;padding:12px 16px!important;background:#fffbf5!important;box-shadow:0 18px 35px #183a3220}.site-header nav.vt-primary-nav.open{display:flex!important}.site-header nav.vt-primary-nav a,.site-header nav.vt-primary-nav button{justify-content:flex-start;min-height:44px;padding:9px 12px}.vt-social-subnav{position:static;box-shadow:none;margin-left:18px}}';document.head.appendChild(fallback);
  const css=document.createElement("link");css.rel="stylesheet";css.href="assets/css/social-navigation.css?v=20261112-nav2";document.head.appendChild(css);
const platform=document.createElement("link");platform.rel="stylesheet";platform.href="assets/css/platform-redesign.css?v=20261112-platform2";document.head.appendChild(platform);
if(window.supabase?.createClient){
 try{
  const client=window.supabase.createClient("https://qnnmbngxunmjerpeoxrr.supabase.co","sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67");
  client.auth.getUser().then(async({data})=>{
   if(data?.user){const link=nav.querySelector(".vt-profile-link");link.href="profile.html?id="+encodeURIComponent(data.user.id);
    const ownerLink=nav.querySelector("#vtOwnerApprovalLink");const staffCheck=await client.rpc("is_community_platform_staff");if(ownerLink&&!staffCheck.error&&staffCheck.data===true)ownerLink.hidden=false;
    const badge=nav.querySelector("#activityNavBadge");const r=await client.from("reader_activity_notifications").select("id",{count:"exact",head:true}).eq("recipient_id",data.user.id).is("read_at",null);
    if(badge&&!r.error&&r.count>0){badge.textContent=r.count>99?"99+":String(r.count);badge.hidden=false;}
   }
  });
 }catch(_){}
}
document.body.classList.add("has-app-nav");document.querySelectorAll(".vt-app-nav").forEach(el=>el.remove());
})();