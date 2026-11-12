(()=>{"use strict";
const $=id=>document.getElementById(id),db=window.supabase?.createClient("https://qnnmbngxunmjerpeoxrr.supabase.co","sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67"),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])),first=v=>Array.isArray(v)?v[0]:v,date=v=>v?new Date(v).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"}):"—";let uid=new URLSearchParams(location.search).get("id");
let user=null,following=false,profileData=null;
const journalNames={"chapter-0":"Perspective","chapter-1":"Stillness","chapter-2":"Discipline","chapter-3":"Wisdom Over Noise","chapter-4":"Time","chapter-5":"Love Without Losing Yourself","chapter-6":"Marriage","chapter-7":"Boundaries","chapter-8":"Loyalty","chapter-9":"Forgiveness","chapter-10":"Laziness and Spiritual Disconnection","chapter-11":"Fear","chapter-12":"Dream","chapter-13":"Failure","chapter-14":"Humility","chapter-15":"Likes and Validation","chapter-16":"Faking and Authenticity","chapter-17":"The Soft Life","chapter-18":"The Hustle","chapter-19":"Mental Peace"};
function feedback(s){$("profileFeedback").textContent=s;}
function tab(name){document.querySelectorAll("[data-profile-tab]").forEach(b=>b.classList.toggle("active",b.dataset.profileTab===name));document.querySelectorAll("[data-profile-panel]").forEach(p=>{p.hidden=p.dataset.profilePanel!==name;p.classList.toggle("active",!p.hidden);});}
document.querySelectorAll("[data-profile-tab]").forEach(b=>b.addEventListener("click",()=>tab(b.dataset.profileTab)));
$("profileMenuButton").addEventListener("click",()=>{const m=$("profileMenu");m.hidden=!m.hidden;$("profileMenuButton").setAttribute("aria-expanded",String(!m.hidden));});
const followDialog=$("followListDialog"),followListItems=$("followListItems");
$("followersLink").addEventListener("click",()=>openFollowList("followers"));
$("followingLink").addEventListener("click",()=>openFollowList("following"));
$("closeFollowList").addEventListener("click",()=>followDialog.close());
followDialog.addEventListener("click",e=>{if(e.target===followDialog)followDialog.close();});
document.addEventListener("click",e=>{if(!e.target.closest(".profile-menu-wrap")){$("profileMenu").hidden=true;$("profileMenuButton").setAttribute("aria-expanded","false");}});
async function init(){
 $("year").textContent=new Date().getFullYear();
 if(!db){$("profileName").textContent="Reader profile unavailable";return;}
 const session=await db.auth.getSession();user=session.data?.session?.user||null;
 if(!uid)uid=user?.id||null;
 if(!uid){$("profileName").textContent="Sign in to view your reader profile";feedback("Sign in to open your profile, or use a reader profile link.");return;}
 const [pr,card,visibility]=await Promise.all([db.rpc("get_public_reader_profile",{target_user_id:uid}),db.rpc("get_public_reader_profile_card",{target_user_id:uid}),db.rpc("get_reader_profile_visibility",{target_user_id:uid})]);
 profileData={...(first(pr.data)||{}),...(first(card.data)||{})};
 if(pr.error||!profileData.id){$("profileName").textContent="Profile not found";feedback("This reader profile is unavailable or private.");return;}
 const p=profileData,privacy=first(visibility.data)||{};const ownerCheck=await db.rpc("is_community_platform_owner",{target_user:uid});if(ownerCheck.data===true){document.body.classList.add("voiceoftaade-founder");$("founderBadge").hidden=false;}
 if(privacy.profile_visibility==="private"&&user?.id!==uid){$("profileName").textContent="This profile is private";feedback("This reader has chosen to keep their profile private.");return;}
 $("profileName").textContent=p.display_name||"Voiceoftaade reader";
 const handle=String(p.display_name||"reader").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
 $("profileHandle").textContent="@"+(handle||"reader");
 $("profileBio").textContent=p.bio||"A reader in the Voiceoftaade community.";
 $("profileAvatar").innerHTML=p.avatar_url?'<img src="'+esc(p.avatar_url)+'" alt="">':esc((p.display_name||"V").slice(0,1).toUpperCase());
 if(p.cover_url){try{const u=new URL(p.cover_url,location.origin);if(["https:","http:"].includes(u.protocol))$("profileCover").style.backgroundImage='linear-gradient(90deg,#092e25aa,#092e2522),url("'+u.href+'")';}catch(_){}}
 $("aboutBio").textContent=p.bio||"This reader has not added an introduction yet.";
 $("aboutLocation").textContent=p.location||"Not shared";
 $("aboutInterests").textContent=p.reading_interests||"Not shared";
 $("aboutSince").textContent=date(p.created_at);
 $("aboutProfession").textContent=p.profession||"Not shared";$("aboutEducation").textContent=p.education||"Not shared";$("aboutCity").textContent=p.city||"Not shared";$("aboutCountry").textContent=p.country||"Not shared";$("aboutGenres").textContent=p.favourite_genres||"Not shared";$("aboutCurrentlyReading").textContent=p.currently_reading||"Not shared";$("aboutQuote").textContent=p.favourite_quote||"Not shared";
 if(p.website_url){let u=p.website_url;if(!/^https?:\/\//i.test(u))u="https://"+u;const a=document.createElement("a");a.href=u;a.target="_blank";a.rel="noopener noreferrer";a.textContent=p.website_url;$("aboutWebsite").replaceChildren(a);}else $("aboutWebsite").textContent="Not shared";
 const [counts,posts,replies,activity,bookItems,readerRecs]=await Promise.all([
  db.rpc("get_reader_follow_counts",{target_user_id:uid}),
  db.from("reader_feed_posts").select("id,title,body,visibility,created_at").eq("author_id",uid).order("created_at",{ascending:false}).limit(40),
  db.from("reader_feed_comments").select("id,body,created_at,reader_feed_posts(title,visibility,author_id)").eq("author_id",uid).order("created_at",{ascending:false}).limit(40),
  db.rpc("get_reader_public_activity",{target_user_id:uid}),
  db.from("reader_profile_books").select("*").eq("user_id",uid).order("created_at",{ascending:false}),
  db.from("reader_profile_recommendations").select("*").eq("user_id",uid).order("created_at",{ascending:false})
 ]);
 const pubPosts=(posts.data||[]).filter(x=>x.visibility==="public"||user?.id===uid).map(x=>({id:x.id,kind:"Post",text:(x.title?x.title+"\n":"")+x.body,created_at:x.created_at,community:"Voiceoftaade Reading Room"}));
 const pubReplies=(replies.data||[]).filter(x=>{const p=first(x.reader_feed_posts);return p&&(p.visibility==="public"||user?.id===uid);}).map(x=>({id:x.id,kind:"Comment",text:x.body,created_at:x.created_at,community:"Reader conversation"}));
 const contributions=[...pubPosts,...pubReplies].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 $("followersCount").textContent=counts.data?.[0]?.followers||0;$("followingCount").textContent=counts.data?.[0]?.following||0;$("postsCount").textContent=pubPosts.length;$("postCountLabel").textContent=pubPosts.length+" posts";
 $("profilePosts").innerHTML=contributions.length?contributions.map(x=>'<article class="profile-post"><div class="post-meta"><span class="post-kind">'+esc(x.kind)+'</span><span>'+esc(x.community||"Public conversation")+'</span><time>'+esc(date(x.created_at))+'</time></div><p>'+esc(x.text)+'</p></article>').join(""):'<div class="profile-empty-card"><span>✦</span><h3>No posts yet</h3><p>When this reader publishes in the Reading Room, their writing will appear here.</p></div>';
 const a=first(activity.data)||{};
 const renderCollection=(id,rows)=>{$(id).innerHTML=Array.isArray(rows)&&rows.length?rows.slice(0,16).map(x=>'<div class="collection-row"><span>▤</span><strong>'+esc(journalNames[x.journal_id]||x.journal_id||"Reading entry")+'</strong><small>'+esc(date(x.created_at||x.last_read_at))+'</small></div>').join(""):'<p class="profile-empty">Nothing shared here yet.</p>';};
 renderCollection("publicFavourites",privacy.favourites_visibility==="private"&&user?.id!==uid?null:a.favourites);
 renderCollection("publicSaved",privacy.saved_collections_visibility==="private"&&user?.id!==uid?null:a.saved);
 const bookRows=bookItems.data||[],favouriteBooksVisible=privacy.favourite_books_visibility!=="private"||user?.id===uid,recommendationsVisible=privacy.recommendations_visibility!=="private"||user?.id===uid;
 const renderBooks=(id,rows)=>{$(id).innerHTML=Array.isArray(rows)&&rows.length?rows.slice(0,20).map(x=>'<div class="collection-row"><span>▤</span><div><strong>'+esc(x.book_title)+'</strong><small>'+esc(x.book_author||"")+'</small>'+(x.note?'<p>'+esc(x.note)+'</p>':"")+(x.book_url?'<a href="'+esc(x.book_url)+'" target="_blank" rel="noopener noreferrer">View book</a>':"")+'</div></div>').join(""):'<p class="profile-empty">Nothing shared here yet.</p>';};
 renderBooks("publicFavouriteBooks",favouriteBooksVisible?bookRows.filter(x=>x.item_type==="favourite"):null);
 renderBooks("publicBookRecommendations",recommendationsVisible?bookRows.filter(x=>x.item_type==="recommendation"):null);
 const readerRows=readerRecs.data||[],readerCards=await Promise.all(readerRows.map(async x=>{const r=await db.rpc("get_public_reader_profile_card",{target_user_id:x.recommended_user_id});const p=first(r.data);return {...x,profile:p};}));
 $("publicReaderRecommendations").innerHTML=readerCards.length?readerCards.filter(x=>x.profile?.id).map(x=>'<div class="collection-row"><span>♧</span><div><strong><a href="profile.html?id='+encodeURIComponent(x.profile.id)+'">'+esc(x.profile.display_name||"Reader")+'</a></strong>'+(x.note?'<p>'+esc(x.note)+'</p>':"")+'</div></div>').join(""):'<p class="profile-empty">No reader recommendations shared yet.</p>';
 const reading=privacy.reading_activity_visibility==="private"&&user?.id!==uid?null:a.reading_activity;
 renderCollection("publicReadingActivity",Array.isArray(reading)?reading.map(x=>({...x,created_at:x.last_read_at, journal_id:x.journal_id+" · "+Math.round(Number(x.progress_percent)||0)+"% read"})):null);
 const milestones=[];const journals=new Set((reading||[]).map(x=>x.journal_id));if(journals.size>=1)milestones.push("First reflection");if(journals.size>=5)milestones.push("Five journeys");if(contributions.length>=1)milestones.push("Community voice");if(contributions.length>=5)milestones.push("Conversation builder");
 $("readerMilestones").innerHTML=milestones.length?milestones.map(x=>'<span class="milestone-pill">✦ '+esc(x)+'</span>').join(""):'<p class="profile-empty">Milestones will appear as this reader participates.</p>';
 bindProfileActions(privacy);
}
async function openFollowList(direction){
  const title=direction==="followers"?"Followers":"Following";
  $("followListTitle").textContent=title;
  followListItems.innerHTML='<p class="profile-empty">Loading readers…</p>';
  if(!followDialog.open)followDialog.showModal();
  const {data,error}=await db.rpc("get_public_reader_follow_list",{target_user_id:uid,list_type:direction});
  if(error){followListItems.innerHTML='<p class="profile-empty">This list could not be loaded. '+esc(error.message)+'</p>';return;}
  const rows=Array.isArray(data)?data:[];
  if(!rows.length){followListItems.innerHTML='<div class="profile-empty-card"><span>♧</span><h3>No '+title.toLowerCase()+' to show</h3><p>Reader connections will appear here when available.</p></div>';return;}
  followListItems.innerHTML=rows.map(reader=>{
    const initial=esc((reader.display_name||"V").trim().slice(0,1).toUpperCase());
    const avatar=reader.avatar_url?'<img src="'+esc(reader.avatar_url)+'" alt="">':initial;
    return '<a class="follow-list-reader" href="profile.html?id='+encodeURIComponent(reader.id)+'"><span class="follow-list-avatar">'+avatar+'</span><span class="follow-list-reader-copy"><strong>'+esc(reader.display_name||"Voiceoftaade reader")+'</strong><small>View reader profile</small></span><span class="follow-list-arrow" aria-hidden="true">↗</span></a>';
  }).join("");
}
async function bindProfileActions(privacy){
 const own=user?.id===uid;
 if(own){$("editProfileMenu").hidden=false;$("settingsMenu").hidden=false;}
 else{
  $("reportProfileButton").hidden=false;$("blockProfileButton").hidden=false;
  if(user&&privacy.allow_message_requests!==false){$("messageRequestButton").hidden=false;$("messageRequestButton").onclick=requestMessage;}
 }
 if(!own){
  $("followButton").hidden=false;
  if(user){const f=await db.from("reader_follows").select("follower_id").eq("follower_id",user.id).eq("followed_id",uid).maybeSingle();following=!!f.data;$("followButton").textContent=following?"Following":"Follow";$("followButton").onclick=toggleFollow;}
  else{$("followButton").textContent="Sign in to follow";$("followButton").onclick=()=>location.href="account.html";}
 }
 $("shareProfileButton").onclick=shareProfile;
 $("reportProfileButton").onclick=reportProfile;
 $("blockProfileButton").onclick=blockProfile;
}
async function requestMessage(){if(!user){location.href="account.html";return;}const r=await db.rpc("request_reader_message",{target_user_id:uid,initial_message:null});if(r.error){feedback(r.error.message);return;}feedback("Message request sent. You can chat when this reader accepts.");$("messageRequestButton").disabled=true;$("messageRequestButton").textContent="Request sent";}
async function toggleFollow(){if(!user){location.href="account.html";return;}const r=following?await db.from("reader_follows").delete().eq("follower_id",user.id).eq("followed_id",uid):await db.from("reader_follows").insert({follower_id:user.id,followed_id:uid});if(r.error){feedback(r.error.message);return;}following=!following;$("followButton").textContent=following?"Following":"Follow";$("followersCount").textContent=Math.max(0,Number($("followersCount").textContent)+(following?1:-1));}
async function shareProfile(){const url=location.href;try{if(navigator.share)await navigator.share({title:$("profileName").textContent,url});else{await navigator.clipboard.writeText(url);feedback("Profile link copied.");}}catch(e){if(e.name!=="AbortError")feedback("Could not share this profile.");}}
async function reportProfile(){if(!user){location.href="account.html";return;}const reason=prompt("Why are you reporting this reader?");if(!reason||reason.trim().length<5)return;const r=await db.from("reader_safety_reports").insert({reporter_id:user.id,reported_user_id:uid,reason:reason.trim()});feedback(r.error?r.error.message:"Report sent to the Voiceoftaade moderation team.");}
async function blockProfile(){if(!user){location.href="account.html";return;}if(!confirm("Block this reader? Their posts will be hidden from supported community feeds."))return;const r=await db.from("reader_blocks").insert({blocker_id:user.id,blocked_id:uid});feedback(r.error?r.error.message:"Reader blocked.");}
init().catch(e=>{console.error(e);$("profileName").textContent="Could not load profile";feedback(e.message);});
})();