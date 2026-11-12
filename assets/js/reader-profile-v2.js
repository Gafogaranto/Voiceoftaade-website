(()=>{"use strict";
const $=id=>document.getElementById(id);
const db=window.supabase?.createClient("https://qnnmbngxunmjerpeoxrr.supabase.co","sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67");
const uid=new URLSearchParams(location.search).get("id");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateText=v=>v?new Date(v).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}):"";
let user=null,profile=null,following=false;
function feedback(message,bad){const el=$("profileFeedback");if(el){el.textContent=message||"";el.style.color=bad?"#b74b43":"#0d786b";}}
function avatarMarkup(url,name){return url?'<img src="'+esc(url)+'" alt="">':esc((name||"V").trim().slice(0,1).toUpperCase());}
function showMenu(open){$("profileMenu").hidden=!open;$("profileMenuButton").setAttribute("aria-expanded",String(open));}
function renderStats(followers,followingCount,posts){$("followersCount").textContent=followers;$("followingCount").textContent=followingCount;$("postsCount").textContent=posts;$("sidebarFollowers").textContent=followers;$("sidebarFollowing").textContent=followingCount;$("sidebarPosts").textContent=posts;}
async function loadProfilePosts(){
 const host=$("profilePosts");
 const [posts,replies]=await Promise.all([
  db.from("community_posts").select("id,title,body,created_at,communities(name,visibility,status)").eq("author_id",uid).eq("status","published").order("created_at",{ascending:false}).limit(20),
  db.from("community_replies").select("id,body,created_at,post_id,community_posts(title,community_id,communities(name,visibility,status))").eq("author_id",uid).eq("status","published").order("created_at",{ascending:false}).limit(20)
 ]);
 const postRows=(posts.data||[]).filter(x=>{const c=Array.isArray(x.communities)?x.communities[0]:x.communities;return c?.visibility==="public"&&c?.status==="active"}).map(x=>({kind:"Post",title:x.title,body:x.body,date:x.created_at,community:(Array.isArray(x.communities)?x.communities[0]:x.communities)?.name}));
 const replyRows=(replies.data||[]).filter(x=>{const p=Array.isArray(x.community_posts)?x.community_posts[0]:x.community_posts,c=Array.isArray(p?.communities)?p.communities[0]:p?.communities;return c?.visibility==="public"&&c?.status==="active"}).map(x=>{const p=Array.isArray(x.community_posts)?x.community_posts[0]:x.community_posts,c=Array.isArray(p?.communities)?p.communities[0]:p?.communities;return{kind:"Comment",title:p?.title||"Community conversation",body:x.body,date:x.created_at,community:c?.name};});
 const rows=[...postRows,...replyRows].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,12);
 host.innerHTML=rows.length?rows.map(x=>'<article class="fb-post"><div class="fb-post-head"><span class="fb-post-avatar">'+avatarMarkup(profile.avatar_url,profile.display_name)+'</span><span><span class="fb-post-author">'+esc(profile.display_name)+'</span><small class="fb-post-date">'+esc(x.kind)+' · '+esc(dateText(x.date))+'</small></span></div>'+(x.title?'<h3>'+esc(x.title)+'</h3>':'')+'<div class="fb-post-body">'+esc(x.body)+'</div>'+(x.community?'<span class="fb-post-community">'+esc(x.community)+'</span>':'')+'</article>').join(""):'<p class="fb-empty">No public posts yet. When this reader shares something in an open community, it will appear here.</p>';
 return rows.length;
}
async function toggleFollow(){
 if(!user){location.href="account.html";return;}
 const button=$("followButton");button.disabled=true;
 const result=following?await db.from("reader_follows").delete().eq("follower_id",user.id).eq("followed_id",uid):await db.from("reader_follows").insert({follower_id:user.id,followed_id:uid});
 button.disabled=false;
 if(result.error){feedback(result.error.message,true);return;}
 following=!following;button.textContent=following?"✓ Following":"＋ Follow";
 const count=Number($("followersCount").textContent)+(following?1:-1);
 $("followersCount").textContent=Math.max(0,count);$("sidebarFollowers").textContent=Math.max(0,count);
}
async function messageReader(){
 if(!user){location.href="account.html";return;}
 const button=$("messageButton");button.disabled=true;
 const conv=await db.from("reader_conversations").select("id").or("and(user_one.eq."+user.id+",user_two.eq."+uid+"),and(user_one.eq."+uid+",user_two.eq."+user.id+")").maybeSingle();
 button.disabled=false;
 if(conv.data?.id){location.href="community.html?conversation="+encodeURIComponent(conv.data.id);return;}
 const request=await db.rpc("request_reader_message",{target_user_id:uid,initial_message:null});
 if(request.error){feedback(request.error.message,true);return;}
 feedback("Message request sent. This reader can accept it from Message requests.",false);
 button.textContent="Request sent";button.disabled=true;
}
async function blockReader(){
 if(!user||user.id===uid)return;
 if(!confirm("Block this reader? Their content will be hidden from your reader experience where supported."))return;
 const r=await db.from("reader_blocks").insert({blocker_id:user.id,blocked_id:uid});
 if(r.error&&r.error.code!=="23505"){feedback(r.error.message,true);return;}
 feedback("Reader blocked.",false);showMenu(false);
}
async function reportReader(){
 if(!user||user.id===uid)return;
 const reason=prompt("Tell us why you are reporting this profile (at least 5 characters).");
 if(!reason||reason.trim().length<5)return;
 const r=await db.from("reader_safety_reports").insert({reporter_id:user.id,reported_user_id:uid,reason:reason.trim()});
 if(r.error){feedback(r.error.message,true);return;}
 feedback("Your report has been submitted for review.",false);showMenu(false);
}
async function init(){
 if(!db||!uid){$("profileLoading").textContent="This reader profile link is unavailable.";return;}
 const sess=await db.auth.getSession();user=sess.data?.session?.user||null;
 const result=await db.rpc("get_public_reader_profile_card",{target_user_id:uid});
 profile=Array.isArray(result.data)?result.data[0]:result.data;
 if(result.error||!profile){$("profileLoading").textContent="This reader profile is private or unavailable.";return;}
 $("profileLoading").hidden=true;$("profileContent").hidden=false;
 $("profileName").textContent=profile.display_name||"Voiceoftaade reader";
 $("profileSubtitle").textContent="Voiceoftaade reader";
 $("profileAvatar").innerHTML=avatarMarkup(profile.avatar_url,profile.display_name);
 if(profile.cover_url){try{const cover=new URL(profile.cover_url,location.origin);if(["http:","https:"].includes(cover.protocol))$("profileCover").style.backgroundImage='linear-gradient(0deg,#102b2b55,transparent 60%),url("'+cover.href+'")';}catch(_){}}
 $("profileBio").textContent=profile.bio||"A reader in the Voiceoftaade community.";
 $("aboutBio").textContent=profile.bio||"No introduction has been added.";
 const joined=dateText(profile.created_at);$("memberSince").textContent=joined?"Member since "+joined:"";$("aboutSince").textContent=joined?"Joined Voiceoftaade on "+joined:"";
 const [counts,privacy]=await Promise.all([db.rpc("get_reader_follow_counts",{target_user_id:uid}),db.rpc("get_reader_profile_visibility",{target_user_id:uid})]);
 const row=Array.isArray(counts.data)?counts.data[0]:counts.data;
 let postsCount=await loadProfilePosts();
 const followers=Number(row?.followers)||0,followingCount=Number(row?.following)||0;
 renderStats(followers,followingCount,postsCount);
 if(user?.id===uid){
  $("editProfileButton").hidden=false;$("menuEditProfile").hidden=false;$("menuSettings").hidden=false;$("menuPrivacy").hidden=false;$("menuMessages").hidden=false;
  $("editProfileButton").addEventListener("click",()=>location.href="account.html#profile-settings");
 } else {
  $("followButton").hidden=false;$("messageButton").hidden=false;$("menuBlock").hidden=!user;$("menuReport").hidden=!user;
  if(user){
   const f=await db.from("reader_follows").select("follower_id").eq("follower_id",user.id).eq("followed_id",uid).maybeSingle();
   following=!!f.data;$("followButton").textContent=following?"✓ Following":"＋ Follow";
   if(privacy.data?.allow_message_requests===false){
    $("messageButton").disabled=true;$("messageButton").textContent="Messages unavailable";
   }
   $("menuBlock").addEventListener("click",blockReader);$("menuReport").addEventListener("click",reportReader);
  }else{$("followButton").textContent="Sign in to follow";$("messageButton").textContent="Sign in to message";}
  $("followButton").addEventListener("click",toggleFollow);$("messageButton").addEventListener("click",messageReader);
 }
 $("profileMenuButton").addEventListener("click",()=>showMenu($("profileMenu").hidden));
 document.addEventListener("click",e=>{if(!e.target.closest(".fb-menu-wrap"))showMenu(false);});
 document.addEventListener("keydown",e=>{if(e.key==="Escape")showMenu(false);});
 document.querySelectorAll("[data-profile-tab]").forEach(button=>button.addEventListener("click",()=>{
  const tab=button.dataset.profileTab;
  document.querySelectorAll("[data-profile-tab]").forEach(x=>x.classList.toggle("active",x===button));
  $("profilePostsTab").hidden=tab!=="posts";$("profileAboutTab").hidden=tab!=="about";
 }));
}
init().catch(e=>{$("profileLoading").textContent="We could not open this profile. Please refresh and try again.";console.error(e);});
})();