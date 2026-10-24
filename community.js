(() => {
  const $ = id => document.getElementById(id);
  const client = window.supabase?.createClient("https://qnnmbngxunmjerpeoxrr.supabase.co", "sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67");
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const dateText = value => value ? new Date(value).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}) : "";
  const state = { user:null, selected:null, communities:[], joined:[], staff:false, creator:false, blockedUsers:[] };
  const status = (message, bad=false) => { const el=$("communityStatus"); if(el){el.textContent=message;el.classList.toggle("is-error",bad);} };
  const requireLogin = () => { if(!state.user){status("Please sign in from your reader account before joining or posting.");return false;} return true; };
  async function init(){
   $("year").textContent = new Date().getFullYear();
   const menu=$("menuToggle"),nav=$("mainNav");
   menu?.addEventListener("click",()=>{const open=nav.classList.toggle("open");menu.setAttribute("aria-expanded",String(open));menu.textContent=open?"×":"☰";});
   nav?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>nav.classList.remove("open")));
   if(!client){status("Community services are temporarily unavailable.",true);return;}
   const {data:{session}}=await client.auth.getSession(); state.user=session?.user??null;await loadBlockedUsers();
   client.auth.onAuthStateChange((_event,session)=>{
    state.user=session?.user??null;
    loadBlockedUsers();
    if(!state.user){state.staff=false;state.creator=false;state.blockedUsers=[];}
    renderAccount();
    refreshPermissions().then(()=>{renderAccount();loadCommunities();loadForYou();loadFollowing();loadMentions();loadNotifications();}).catch(error=>{console.error("Permission refresh failed",error);renderAccount();loadCommunities();loadForYou();loadNotifications();});
   });
   renderAccount();
   await refreshPermissions();
   renderAccount();
   $("createCommunityBtn")?.addEventListener("click",createCommunity);
   $("communityCreateForm")?.addEventListener("submit",createCommunity);
   $("postForm")?.addEventListener("submit",createPost);
   $("backToDiscover")?.addEventListener("click",()=>showWorkspace("discover"));
   const mobileMenu=$("mobileMenuToggle"),backdrop=$("mobileMenuBackdrop");
   const closeMobileMenu=()=>{document.body.classList.remove("community-mobile-menu-open");mobileMenu?.setAttribute("aria-expanded","false");};
   mobileMenu?.addEventListener("click",()=>{const open=document.body.classList.toggle("community-mobile-menu-open");mobileMenu.setAttribute("aria-expanded",String(open));});
   backdrop?.addEventListener("click",closeMobileMenu);
   $("mobileMenuOverlayClose")?.addEventListener("click",closeMobileMenu);
   document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeMobileMenu();const info=$("communityInfoPanel");if(info)info.hidden=true;}});

   $("chatJoinBtn")?.addEventListener("click",()=>state.selected&&joinCommunity(state.selected));
   $("chatRoomInfo")?.addEventListener("click",showCommunityInfo);$("closeCommunityInfo")?.addEventListener("click",()=>{$("communityInfoPanel").hidden=true;});
   $("mobileAdminNav")?.addEventListener("click",()=>showWorkspace("admin"));
   $("refreshForYou")?.addEventListener("click",loadForYou);
   $("refreshFollowing")?.addEventListener("click",loadFollowing);
   $("refreshMentions")?.addEventListener("click",loadMentions);
   $("refreshNotifications")?.addEventListener("click",loadNotifications);
   document.querySelectorAll("[data-workspace]").forEach(btn=>btn.addEventListener("click",()=>{showWorkspace(btn.dataset.workspace);document.body.classList.remove("community-mobile-menu-open");$("mobileMenuToggle")?.setAttribute("aria-expanded","false");}));
   const moderation=$("ownerModerationPanel"),mount=$("adminModerationMount");if(moderation&&mount)mount.appendChild(moderation);
   await loadCommunities();
   await loadForYou();
   await loadFollowing();
   await loadMentions();
   await loadNotifications();
  }
  async function refreshPermissions(){
   state.staff=false;state.creator=false;
   if(!state.user)return;
   const [staffResult,creatorResult]=await Promise.all([
    client.rpc("is_community_platform_staff"),client.rpc("is_community_creator")
   ]);
   if(staffResult.error)console.warn("Owner permission check failed",staffResult.error);
   if(creatorResult.error)console.warn("Creator permission check failed",creatorResult.error);
   state.staff=staffResult.data===true;
   state.creator=creatorResult.data===true;
  }
  function renderAccount(){
   const el=$("communityAccountState");
   if(el) el.innerHTML=state.user
    ? '<span class="signed-in-dot"></span> Signed in. You can join communities and participate.'
    : 'You are browsing as a visitor. <a href="account.html">Sign in or create a reader account</a> to join discussions.';
   const req=$("creatorRequestBtn"); if(req) req.hidden=true;
   const ownerPanel=$("ownerModerationPanel"); if(ownerPanel) ownerPanel.hidden=!(state.user&&state.staff);
   const adminNav=$("adminNavBtn");if(adminNav)adminNav.hidden=!(state.user&&state.staff);const mobileAdmin=$("mobileAdminNav");if(mobileAdmin)mobileAdmin.hidden=!(state.user&&state.staff);
   if(state.user)loadJoinedCommunities();else{state.joined=[];renderJoinedNav();}
   if(state.user&&state.staff){loadModeration();showAdminNav();}
   const create=$("createCommunityPanel"); if(create) create.hidden=!state.user;
   const createTitle=document.querySelector("#createCommunityPanel .eyebrow"); if(createTitle) createTitle.textContent=state.staff?"VOICEOFTAADE OWNER CONTROLS":"SUBMIT A COMMUNITY";
   const request=$("creatorRequestPanel"); if(request) request.hidden=true;
   const post=$("newPostPanel"); if(post) post.hidden=!state.user||!state.selected;
  }
  async function loadModeration(){
   const approvals=$("communityApprovalsList"),requests=$("creatorRequestsList"),reports=$("communityReportsList");
   if(!state.staff||!state.user)return;
   if(approvals)approvals.innerHTML='<p class="community-loading">Loading communities awaiting approval…</p>';
   if(requests)requests.innerHTML='<p class="community-loading">Loading creator requests…</p>';
   if(reports)reports.innerHTML='<p class="community-loading">Loading reports…</p>';
   const [communityRes,reqRes,reportRes,groupReportRes,safetyRes]=await Promise.all([
    client.from("communities").select("id,name,description,visibility,created_at").eq("status","pending").order("created_at",{ascending:true}).limit(50),
    client.from("community_creator_requests").select("id,user_id,message,status,created_at").eq("status","pending").order("created_at",{ascending:true}).limit(50),
    client.from("community_reports").select("id,community_id,reporter_id,post_id,reason,status,created_at").in("status",["open","reviewing"]).order("created_at",{ascending:false}).limit(50),
    client.from("community_group_reports").select("id,community_id,reporter_id,reason,status,created_at").in("status",["open","reviewing"]).order("created_at",{ascending:false}).limit(50),
    client.from("reader_safety_reports").select("id,reporter_id,reported_user_id,reason,status,created_at").in("status",["new","reviewing"]).order("created_at",{ascending:false}).limit(50)
   ]);
   if(approvals){
    if(communityRes.error){console.warn("Community approval queue unavailable",communityRes.error);approvals.innerHTML='<p class="community-loading">Community approvals could not be loaded. Check owner permissions.</p>';}
    else if(!communityRes.data?.length)approvals.innerHTML='<p class="community-loading">No communities awaiting approval. Newly created communities will appear here.</p>';
    else approvals.innerHTML=communityRes.data.map(c=>'<article class="moderation-item"><strong>'+escape(c.name)+'</strong><p>'+escape(c.description)+'</p><small>'+(c.visibility==="private"?"Private":"Public")+' · Submitted '+dateText(c.created_at)+'</small><div class="moderation-item-actions"><button class="approve" data-approve-community="'+c.id+'">Approve & publish</button><button data-decline-community="'+c.id+'">Decline</button></div></article>').join("");
    approvals.querySelectorAll("[data-approve-community]").forEach(b=>b.addEventListener("click",()=>reviewCommunity(b.dataset.approveCommunity,"active",b)));
    approvals.querySelectorAll("[data-decline-community]").forEach(b=>b.addEventListener("click",()=>reviewCommunity(b.dataset.declineCommunity,"declined",b)));
   }
   if(requests){
    if(reqRes.error){console.warn("Creator request moderation unavailable",reqRes.error);requests.innerHTML='<p class="community-loading">Creator requests could not be loaded. Check owner permissions.</p>';}
    else if(!reqRes.data?.length)requests.innerHTML='<p class="community-loading">No pending creator requests.</p>';
    else requests.innerHTML=reqRes.data.map(r=>'<article class="moderation-item"><strong>Creator application</strong><p>'+escape(r.message)+'</p><small>User ID: '+escape(r.user_id)+' · '+dateText(r.created_at)+'</small><div class="moderation-item-actions"><button class="approve" data-approve-creator="'+r.id+'" data-user-id="'+r.user_id+'">Approve creator</button><button data-reject-creator="'+r.id+'">Decline</button></div></article>').join("");
    requests.querySelectorAll("[data-approve-creator]").forEach(b=>b.addEventListener("click",()=>reviewCreatorRequest(b.dataset.approveCreator,b.dataset.userId,"approved",b)));
    requests.querySelectorAll("[data-reject-creator]").forEach(b=>b.addEventListener("click",()=>reviewCreatorRequest(b.dataset.rejectCreator,null,"rejected",b)));
   }
   const groupHost=$("communityGroupReportsList");
   if(groupHost){
    if(groupReportRes.error){groupHost.innerHTML='<p class="community-loading">Group reports could not be loaded.</p>';console.warn(groupReportRes.error);}
    else if(!groupReportRes.data?.length)groupHost.innerHTML='<p class="community-loading">No group reports awaiting review.</p>';
    else groupHost.innerHTML=groupReportRes.data.map(r=>'<article class="moderation-item"><strong>Community report · '+escape(r.status)+'</strong><p>'+escape(r.reason)+'</p><small>Community: '+escape(r.community_id)+' · '+dateText(r.created_at)+'</small><div class="moderation-item-actions"><button data-group-report="'+r.id+'" data-group-status="resolved">Mark resolved</button><button data-group-report="'+r.id+'" data-group-status="dismissed">Dismiss</button></div></article>').join("");
    groupHost.querySelectorAll("[data-group-report]").forEach(b=>b.addEventListener("click",async()=>{const q=await client.from("community_group_reports").update({status:b.dataset.groupStatus,reviewed_by:state.user.id}).eq("id",b.dataset.groupReport);if(q.error){status("Could not update group report: "+q.error.message,true);return;}await loadModeration();}));
   }
   const safetyHost=$("readerSafetyReportsList");
   const safetyIds=[...new Set((safetyRes.data||[]).flatMap(x=>[x.reporter_id,x.reported_user_id]).filter(Boolean))];
   const safetyProfileRes=safetyIds.length?await client.from("profiles").select("id,display_name").in("id",safetyIds) :{data:[]};
   const safetyNames=new Map((safetyProfileRes.data||[]).map(x=>[x.id,x.display_name||"Reader"]));
   if(safetyHost){
    if(safetyRes.error){safetyHost.innerHTML='<p class="community-loading">Reader reports could not be loaded. Check staff permissions.</p>';console.warn(safetyRes.error);}
    else if(!safetyRes.data?.length)safetyHost.innerHTML='<p class="community-loading">No reader account reports awaiting review.</p>';
    else safetyHost.innerHTML=safetyRes.data.map(r=>'<article class="moderation-item"><strong>Reader safety report · '+escape(r.status)+'</strong><p>'+escape(r.reason)+'</p><small>Reported reader: '+escape(safetyNames.get(r.reported_user_id)||'Reader')+' · Reporter: '+escape(safetyNames.get(r.reporter_id)||'Reader')+' · '+dateText(r.created_at)+'</small><div class="moderation-item-actions"><button data-safety-review="'+r.id+'" data-safety-status="actioned">Action taken</button><button data-safety-review="'+r.id+'" data-safety-status="dismissed">Dismiss</button></div></article>').join("");
    safetyHost.querySelectorAll("[data-safety-review]").forEach(b=>b.addEventListener("click",async()=>{const z=await client.from("reader_safety_reports").update({status:b.dataset.safetyStatus,reviewed_by:state.user.id}).eq("id",b.dataset.safetyReview);if(z.error){status("Could not update reader report. "+z.error.message,true);return;}status("Reader report updated.");await loadModeration();}));
   }
   if(reports){
    if(reportRes.error){console.warn("Reports moderation unavailable",reportRes.error);reports.innerHTML='<p class="community-loading">Reports could not be loaded. Check owner permissions.</p>';}
    else if(!reportRes.data?.length)reports.innerHTML='<p class="community-loading">No community reports yet.</p>';
    else reports.innerHTML=reportRes.data.map(r=>'<article class="moderation-item"><strong>Content report · '+escape(r.status||"submitted")+'</strong><p>'+escape(r.reason)+'</p><small>Community: '+escape(r.community_id)+' · '+dateText(r.created_at)+'</small><div class="moderation-item-actions"><button data-dismiss-report="'+r.id+'">Mark reviewed</button></div></article>').join("");
    reports.querySelectorAll("[data-dismiss-report]").forEach(b=>b.addEventListener("click",()=>dismissReport(b.dataset.dismissReport,b)));
   }
  }
  async function reviewCreatorRequest(requestId,userId,decision,button){
   if(!state.staff)return;button.disabled=true;
   const reviewedAt=new Date().toISOString();
   if(decision==="approved"){
    const roleResult=await client.from("community_platform_roles").upsert({user_id:userId,role:"approved_creator",granted_by:state.user.id},{onConflict:"user_id"});
    if(roleResult.error){status("Could not grant creator role. "+roleResult.error.message,true);button.disabled=false;return;}
   }
   const {error}=await client.from("community_creator_requests").update({status:decision==="rejected"?"declined":decision,reviewed_by:state.user.id,reviewed_at:reviewedAt}).eq("id",requestId).eq("status","pending");
   if(error){status("Could not update creator request. "+error.message,true);button.disabled=false;return;}
   const host=$("moderationStatus");if(host)host.textContent=decision==="approved"?"Creator approved. Their account can now create communities.":"Creator request declined.";
   await loadModeration();
  }
  async function reviewCommunity(communityId,decision,button){
   if(!state.staff)return;button.disabled=true;
   const {error}=await client.from("communities").update({status:decision}).eq("id",communityId).eq("status","pending");
   if(error){const host=$("moderationStatus");if(host)host.textContent="Could not update community: "+error.message;button.disabled=false;return;}
   const host=$("moderationStatus");if(host)host.textContent=decision==="active"?"Community approved and published.":"Community declined.";
   await loadModeration();await loadCommunities();
  }
  async function dismissReport(reportId,button){
   if(!state.staff)return;button.disabled=true;
   const {error}=await client.from("community_reports").update({status:"resolved",reviewed_by:state.user.id}).eq("id",reportId);
   if(error){const host=$("moderationStatus");if(host)host.textContent="Could not mark report reviewed: "+error.message;button.disabled=false;return;}
   const host=$("moderationStatus");if(host)host.textContent="Report marked reviewed.";
   await loadModeration();
  }
  async function loadForYou(){
   const host=$("forYouFeed");if(!host||!client)return;
   host.innerHTML='<p class="community-loading">Loading your feed…</p>';
   try{
    const {data:posts,error}=await client.from("community_posts").select("id,community_id,author_id,title,body,created_at,communities!inner(id,name,visibility,status)").eq("status","published").eq("communities.status","active").eq("communities.visibility","public").order("created_at",{ascending:false}).limit(40);
    if(error){console.error("For You feed failed",error);host.innerHTML='<p class="community-loading">The feed could not load: '+escape(error.message)+' <button type="button" id="retryForYou">Try again</button></p>';$("retryForYou")?.addEventListener("click",loadForYou);return;}
    if(state.blockedUsers?.length)posts.splice(0,posts.length,...posts.filter(p=>!state.blockedUsers.includes(p.author_id)));
    if(!posts?.length){host.innerHTML='<div class="chat-welcome"><span>✧</span><h3>Your public feed is getting ready</h3><p>When public community conversations are published, they will appear here.</p></div>';return;}
    const ids=posts.map(p=>p.id);
    const [reactRes,replyRes]=await Promise.all([client.from("community_reactions").select("post_id,user_id,reaction").in("post_id",ids),client.from("community_replies").select("id,post_id").in("post_id",ids).eq("status","published")]);
    const reactions=reactRes.data||[],replies=replyRes.data||[],authors=await getAuthorMeta(posts.map(p=>p.author_id));
    host.innerHTML=posts.map(p=>{
      const community=Array.isArray(p.communities)?p.communities[0]:p.communities;
      const author=authors.get(p.author_id)||{name:"Community member",owner:false};
      const badge=author.owner?'<span class="vt-verified-badge" title="Verified Voiceoftaade owner">✓</span><span class="vt-owner-mark" title="Voiceoftaade owner">✦</span>':"";
      const likes=reactions.filter(r=>r.post_id===p.id&&r.reaction==="like").length,liked=!!state.user&&reactions.some(r=>r.post_id===p.id&&r.user_id===state.user.id&&r.reaction==="like"),comments=replies.filter(r=>r.post_id===p.id).length;
      return '<article class="social-feed-item"><div class="feed-community">'+escape(community?.name||"Voiceoftaade community")+'</div><div class="feed-author"><a href="profile.html?id='+encodeURIComponent(p.author_id)+'">'+escape(author.name)+'</a>'+badge+'</div><div class="feed-meta">'+dateText(p.created_at)+'</div><h3>'+escape(p.title)+'</h3><p>'+escape(p.body)+'</p><button type="button" data-feed-like="'+p.id+'" data-community="'+p.community_id+'">'+(liked?"♥":"♡")+' Like · '+likes+'</button><button type="button" data-feed-open="'+p.community_id+'">Open conversation · '+comments+' replies</button><button type="button" data-feed-report="'+p.id+'" data-feed-community="'+p.community_id+'">Report post</button><button type="button" data-feed-report-reader="'+p.author_id+'" data-feed-post="'+p.id+'" data-feed-community="'+p.community_id+'">Report reader</button><button type="button" data-feed-block="'+p.author_id+'">Block reader</button></article>';
    }).join("");
    host.querySelectorAll("[data-feed-like]").forEach(b=>b.addEventListener("click",()=>toggleFeedLike(b.dataset.feedLike,b.dataset.community)));
    host.querySelectorAll("[data-feed-open]").forEach(b=>b.addEventListener("click",()=>openCommunity(b.dataset.feedOpen)));
    host.querySelectorAll("[data-feed-report]").forEach(b=>b.addEventListener("click",()=>reportPost({id:b.dataset.feedReport,community_id:b.dataset.feedCommunity})));\n    host.querySelectorAll("[data-feed-report-reader]").forEach(b=>b.addEventListener("click",()=>reportReader(b.dataset.feedReportReader,b.dataset.feedCommunity,b.dataset.feedPost)));
    host.querySelectorAll("[data-feed-block]").forEach(b=>b.addEventListener("click",()=>blockReader(b.dataset.feedBlock)));
   }catch(error){console.error("For You feed crashed",error);host.innerHTML='<p class="community-loading">The feed stopped unexpectedly. <button type="button" id="retryForYou">Try again</button></p>';$("retryForYou")?.addEventListener("click",loadForYou);}
  }
  async function loadFollowing(){
   const host=$("followingFeed");if(!host||!client)return;
   if(!state.user){host.innerHTML='<div class="chat-welcome"><h3>Your network starts here</h3><p><a href="account.html">Sign in</a> to follow readers and see their public conversations.</p></div>';return;}
   const f=await client.from("reader_follows").select("followed_id").eq("follower_id",state.user.id);
   if(f.error){host.textContent="Following list could not load: "+f.error.message;return;}
   const ids=(f.data||[]).map(x=>x.followed_id);
   if(!ids.length){host.innerHTML='<div class="chat-welcome"><h3>Build your reading network</h3><p>Open a reader profile from a post and choose Follow reader. Their public posts will appear here.</p></div>';return;}
   const q=await client.from("community_posts").select("id,community_id,author_id,title,body,created_at,communities!inner(id,name,visibility,status)").in("author_id",ids).eq("status","published").eq("communities.status","active").eq("communities.visibility","public").order("created_at",{ascending:false}).limit(40);
   if(q.error){host.textContent="Following feed could not load: "+q.error.message;return;}
   if(state.blockedUsers?.length)q.data.splice(0,q.data.length,...q.data.filter(p=>!state.blockedUsers.includes(p.author_id)));
   if(!q.data?.length){host.innerHTML='<p class="community-loading">The readers you follow have not posted publicly yet.</p>';return;}
   const authors=await getAuthorMeta(q.data.map(p=>p.author_id));
   host.innerHTML=q.data.map(p=>{const a=authors.get(p.author_id)||{name:"Reader",owner:false},cm=Array.isArray(p.communities)?p.communities[0]:p.communities;return '<article class="social-feed-item"><div class="feed-community">'+escape(cm?.name||"Public community")+'</div><div class="feed-author"><a href="profile.html?id='+encodeURIComponent(p.author_id)+'">'+escape(a.name)+'</a>'+(a.owner?'<span class="vt-verified-badge">✓</span>':"")+'</div><div class="feed-meta">'+dateText(p.created_at)+'</div><h3>'+escape(p.title)+'</h3><p>'+escape(p.body)+'</p><button type="button" data-follow-open="'+p.community_id+'">Open conversation</button><button type="button" data-follow-report-post="'+p.id+'" data-follow-community="'+p.community_id+'">Report post</button><button type="button" data-follow-report-reader="'+p.author_id+'" data-follow-post="'+p.id+'" data-follow-community="'+p.community_id+'">Report reader</button><button type="button" data-follow-block="'+p.author_id+'">Block reader</button></article>';}).join("");
   host.querySelectorAll("[data-follow-open]").forEach(b=>b.addEventListener("click",()=>openCommunity(b.dataset.followOpen)));
   host.querySelectorAll("[data-follow-report-post]").forEach(b=>b.addEventListener("click",()=>reportPost({id:b.dataset.followReportPost,community_id:b.dataset.followCommunity})));\n   host.querySelectorAll("[data-follow-report-reader]").forEach(b=>b.addEventListener("click",()=>reportReader(b.dataset.followReportReader,b.dataset.followCommunity,b.dataset.followPost)));\n   host.querySelectorAll("[data-follow-block]").forEach(b=>b.addEventListener("click",()=>blockReader(b.dataset.followBlock)));
   host.querySelectorAll("[data-follow-block]").forEach(b=>b.addEventListener("click",()=>blockReader(b.dataset.followBlock)));
  }
  async function loadMentions(){
   const host=$("mentionsFeed"),badge=$("mentionCount");if(!host||!client)return;
   if(!state.user){host.innerHTML='<div class="chat-welcome"><h3>Your mentions live here</h3><p><a href="account.html">Sign in</a> to see when readers mention you.</p></div>';if(badge)badge.hidden=true;return;}
   const q=await client.from("reader_mentions").select("id,mentioned_by,post_id,reply_id,created_at,read_at").eq("mentioned_user_id",state.user.id).order("created_at",{ascending:false}).limit(50);
   if(q.error){host.textContent="Mentions could not load: "+q.error.message;if(badge)badge.hidden=true;return;}
   const items=q.data||[],unread=items.filter(x=>!x.read_at).length;if(badge){badge.textContent=String(unread);badge.hidden=!unread;}
   if(!items.length){host.innerHTML='<div class="chat-welcome"><h3>No mentions yet</h3><p>Readers can mention you by typing @your-handle in a post or reply.</p></div>';return;}
   const authors=await getAuthorMeta(items.map(x=>x.mentioned_by)),pids=items.map(x=>x.post_id).filter(Boolean),rids=items.map(x=>x.reply_id).filter(Boolean);
   const [pr,rr]=await Promise.all([pids.length?client.from("community_posts").select("id,title,body,community_id").in("id",pids):Promise.resolve({data:[]}),rids.length?client.from("community_replies").select("id,body,post_id").in("id",rids):Promise.resolve({data:[]})]);
   const posts=new Map((pr.data||[]).map(x=>[x.id,x])),replies=new Map((rr.data||[]).map(x=>[x.id,x]));
   host.innerHTML=items.map(n=>{const a=authors.get(n.mentioned_by)||{name:"A reader"},src=n.post_id?posts.get(n.post_id):replies.get(n.reply_id),post=n.post_id?src:posts.get(src?.post_id);return '<article class="social-feed-item '+(!n.read_at?"notification-unread":"")+'"><div class="feed-author"><a href="profile.html?id='+encodeURIComponent(n.mentioned_by)+'">'+escape(a.name)+'</a> mentioned you</div><p>'+escape(src?.body||src?.title||"Mentioned content is unavailable.")+'</p><div class="feed-meta">'+dateText(n.created_at)+'</div><button type="button" data-mention-read="'+n.id+'" '+(n.read_at?"disabled":"")+'>'+(n.read_at?"Read":"Mark as read")+'</button>'+(post?.community_id?'<button type="button" data-mention-open="'+post.community_id+'">Open conversation</button>':"")+'</article>';}).join("");
   host.querySelectorAll("[data-mention-read]").forEach(b=>b.addEventListener("click",async()=>{const z=await client.from("reader_mentions").update({read_at:new Date().toISOString()}).eq("id",b.dataset.mentionRead);if(!z.error)loadMentions();}));
   host.querySelectorAll("[data-mention-open]").forEach(b=>b.addEventListener("click",()=>openCommunity(b.dataset.mentionOpen)));
  }
  async function createMentions(body,kind,sourceId){
   if(!state.user||!sourceId)return;const tokens=[...new Set((body.match(/@[a-z0-9][a-z0-9_.-]{1,39}/gi)||[]).map(t=>t.slice(1).toLowerCase()))];if(!tokens.length)return;
   const q=await client.from("profiles").select("id,display_name").not("display_name","is",null);if(q.error)return;
   const targets=(q.data||[]).filter(p=>tokens.includes(String(p.display_name||"").toLowerCase().normalize("NFKD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""))&&p.id!==state.user.id);
   for(const p of targets){const row={mentioned_user_id:p.id,mentioned_by:state.user.id};row[kind==="post"?"post_id":"reply_id"]=sourceId;const z=await client.from("reader_mentions").insert(row);if(z.error&&z.error.code!=="23505")console.warn("Mention save failed",z.error);}
  }
  async function toggleFeedLike(postId,communityId){
   if(!requireLogin())return;
   const existing=await client.from("community_reactions").select("post_id").eq("post_id",postId).eq("user_id",state.user.id).eq("reaction","like").maybeSingle();
   if(existing.error){status("Could not check your reaction.",true);return;}
   const result=existing.data?await client.from("community_reactions").delete().eq("post_id",postId).eq("user_id",state.user.id).eq("reaction","like"):await client.from("community_reactions").insert({post_id:postId,user_id:state.user.id,reaction:"like"});
   if(result.error){status("Could not update your like. "+result.error.message,true);return;}
   await loadForYou();await loadNotifications();
  }
  async function loadNotifications(){
   const host=$("notificationsFeed"),badge=$("notificationCount");if(!host||!client)return;
   if(!state.user){host.innerHTML='<div class="chat-welcome"><span>♧</span><h3>Your activity lives here</h3><p><a href="account.html">Sign in</a> to receive notifications about replies and likes.</p></div>';if(badge)badge.hidden=true;return;}
   const {data,error}=await client.from("community_notifications").select("id,actor_id,notification_type,community_id,post_id,reply_id,preview,read_at,created_at").eq("recipient_id",state.user.id).order("created_at",{ascending:false}).limit(50);
   if(error){console.warn("Notifications could not load",error);host.innerHTML='<p class="community-loading">Notifications could not load: '+escape(error.message)+'</p>';if(badge)badge.hidden=true;return;}
   const items=data||[],unread=items.filter(n=>!n.read_at).length;if(badge){badge.textContent=String(unread);badge.hidden=unread===0;}
   if(!items.length){host.innerHTML='<div class="chat-welcome"><span>♧</span><h3>You are all caught up</h3><p>Replies and likes on your community posts will appear here.</p></div>';return;}
   const authors=await getAuthorMeta(items.map(n=>n.actor_id));
   host.innerHTML=items.map(n=>{const person=authors.get(n.actor_id)||{name:"A reader",owner:false};const action=n.notification_type==="reply"?"replied to your post":"liked your post";return '<article class="social-feed-item '+(!n.read_at?"notification-unread":"")+'"><div class="feed-author">'+escape(person.name)+(person.owner?'<span class="vt-verified-badge" title="Verified Voiceoftaade owner">✓</span>':"")+'</div><p>'+escape(action)+'</p><p>'+escape(n.preview||"")+'</p><div class="feed-meta">'+dateText(n.created_at)+'</div><button type="button" data-notification-read="'+n.id+'" '+(n.read_at?"disabled":"")+'>'+(n.read_at?"Read":"Mark as read")+'</button>'+(n.community_id?'<button type="button" data-notification-open="'+n.community_id+'">Open conversation</button>':"")+'</article>';}).join("");
   host.querySelectorAll("[data-notification-read]").forEach(b=>b.addEventListener("click",async()=>{const {error}=await client.from("community_notifications").update({read_at:new Date().toISOString()}).eq("id",b.dataset.notificationRead).eq("recipient_id",state.user.id);if(error){status("Could not update notification.",true);return;}await loadNotifications();}));
   host.querySelectorAll("[data-notification-open]").forEach(b=>b.addEventListener("click",()=>openCommunity(b.dataset.notificationOpen)));
  }
  async function loadCommunities(){
   const list=$("communityList");
   list.innerHTML='<p class="community-loading">Finding communities…</p>';
   const {data,error}=await client.from("communities").select("id,name,slug,description,visibility,avatar_url,cover_url,rules,created_by,created_at").eq("status","active").order("created_at",{ascending:false});
   if(error){console.error(error);list.innerHTML='<p class="community-loading">Communities could not load. Please refresh and try again.</p>';return;}
   state.communities=data||[];
   if(!state.communities.length){list.innerHTML='<div class="community-empty"><span>✳</span><h3>A new space for meaningful conversation.</h3><p>Our community spaces are being prepared. Approved community creators will be able to launch the first groups here.</p></div>';return;}
   list.innerHTML=state.communities.map(c=>'<article class="community-card"><div class="community-card-top"><span class="community-type">'+(c.visibility==="private"?"Private community":"Public community")+'</span>'+(c.avatar_url?'<img class="community-mark community-mark-image" src="'+escape(c.avatar_url)+'" alt="">':'<span class="community-mark">✦</span>')+'</div><h3>'+escape(c.name)+'</h3><p>'+escape(c.description)+'</p><div class="community-card-bottom"><span>Voiceoftaade conversations</span><button type="button" class="button button-dark community-open" data-community="'+c.id+'">Open community →</button></div></article>').join("");
   list.querySelectorAll("[data-community]").forEach(btn=>btn.addEventListener("click",()=>openCommunity(btn.dataset.community)));
  }
  function showWorkspace(which){
   document.querySelectorAll(".workspace-view").forEach(v=>v.hidden=true);
   const target=which==="admin"?$("workspaceAdmin"):which==="chat"?$("workspaceChat"):which==="ai"?$("workspaceAI"):which==="forYou"?$("workspaceForYou"):which==="following"?$("workspaceFollowing"):which==="mentions"?$("workspaceMentions"):which==="notifications"?$("workspaceNotifications"):$("workspaceDiscover");
   if(target)target.hidden=false;
   const titleMap={forYou:"For You",following:"Following",mentions:"Mentions",notifications:"Notifications",discover:"Discover communities",chat:state.selected?.name||"Community chat",ai:"AI reading companion",admin:"Admin requests"};
   const mobileTitle=$("mobileWorkspaceTitle");if(mobileTitle)mobileTitle.textContent=titleMap[which]||"Voiceoftaade Community";
   document.body.classList.toggle("community-chat-open",which==="chat");
   document.querySelectorAll("[data-workspace]").forEach(b=>b.classList.toggle("active",b.dataset.workspace===which));
   if(which==="admin"&&state.staff)loadModeration();
   const mobileAdmin=$("mobileAdminNav");if(mobileAdmin)mobileAdmin.hidden=!(state.user&&state.staff);
   if(which==="forYou")loadForYou();
   if(which==="following")loadFollowing();
   if(which==="mentions")loadMentions();
   if(which==="notifications")loadNotifications();
  }
  function showAdminNav(){const panel=$("ownerModerationPanel");if(panel){panel.hidden=false;}const btn=$("adminNavBtn");if(btn)btn.onclick=()=>showWorkspace("admin");}
  async function loadBlockedUsers(){if(!state.user||!client){state.blockedUsers=[];return;}const {data,error}=await client.from("reader_blocks").select("blocked_id").eq("blocker_id",state.user.id);state.blockedUsers=error?[]:(data||[]).map(x=>x.blocked_id);}
  async function loadJoinedCommunities(){
   if(!state.user){state.joined=[];renderJoinedNav();return;}
   const {data,error}=await client.from("community_members").select("community_id,status,communities(id,name,slug,description,visibility,avatar_url,cover_url,rules,created_by,status)").eq("user_id",state.user.id).eq("status","active");
   if(error){console.warn("Joined rooms unavailable",error);return;}
   state.joined=(data||[]).map(x=>x.communities).filter(c=>c&&c.status==="active");renderJoinedNav();
  }
  function renderJoinedNav(){
   const markup=state.joined.length?state.joined.map(room=>'<button type="button" class="'+(state.selected?.id===room.id?'active':'')+'" data-room="'+room.id+'"><span class="room-nav-icon">'+escape(room.name.slice(0,1).toUpperCase())+'</span><span class="room-nav-name">'+escape(room.name)+'</span></button>').join(""):'<p class="sidebar-empty">Join a community to see its chat here.</p>';
   const nav=$("joinedCommunityNav");if(nav){nav.innerHTML=markup;nav.querySelectorAll("[data-room]").forEach(b=>b.addEventListener("click",()=>openCommunity(b.dataset.room)));}
   const mobile=$("mobileJoinedCommunityNav");if(mobile){mobile.innerHTML=state.joined.map(room=>'<button type="button" class="'+(state.selected?.id===room.id?'active':'')+'" data-room="'+room.id+'"><span class="room-nav-icon">'+escape(room.name.slice(0,1).toUpperCase())+'</span><span class="room-nav-name">'+escape(room.name)+'</span></button>').join("");mobile.querySelectorAll("[data-room]").forEach(b=>b.addEventListener("click",()=>openCommunity(b.dataset.room)));}
  }
  async function openCommunity(id){
   const community=state.communities.find(c=>c.id===id)||state.joined.find(c=>c.id===id);if(!community)return;
   state.selected=community;renderAccount();renderJoinedNav();showWorkspace("chat");const roomMark=$("workspaceChat")?.querySelector(".chat-room-mark");if(roomMark)roomMark.innerHTML=community.avatar_url?'<img src="'+escape(community.avatar_url)+'" alt="">':escape((community.name||"✦").trim().slice(0,1).toUpperCase());
   $("chatHeading").textContent=community.name;$("chatDescription").textContent=community.visibility==="private"?"Private reading room":"Community conversation";
   const {data:member}=state.user?await client.from("community_members").select("status,role").eq("community_id",id).eq("user_id",state.user.id).maybeSingle():{data:null};
   const active=member?.status==="active";
   $("newPostPanel").hidden=!active;$("chatJoinPrompt").hidden=active||!state.user;
   $("chatJoinBtn").textContent=community.visibility==="private"?"Request access":"Join community";
   await loadPosts(community);
  }
  async function joinCommunity(community){
   if(!requireLogin())return;
   const isPrivate=community.visibility==="private";
   const {error}=await client.from("community_members").insert({community_id:community.id,user_id:state.user.id,role:"member",status:isPrivate?"pending":"active"});
   if(error&&error.code!=="23505"){status(error.message.includes("row-level security")?"This community is not open for self-joining. Please contact an administrator.":"Could not join/request access. "+error.message,true);return;}
   if(isPrivate){status("Access request sent. An administrator must approve it before you can read or post.");$("chatJoinBtn").disabled=true;$("chatJoinBtn").textContent="Request sent";return;}
   status("You have joined "+community.name+".");await loadJoinedCommunities();await openCommunity(community.id);
  }
  async function getAuthorMeta(userIds){
   const ids=[...new Set((userIds||[]).filter(Boolean))],result=new Map();
   if(!ids.length)return result;
   const {data:profiles,error}=await client.rpc("get_public_reader_profiles",{target_user_ids:ids});
   if(error)console.warn("Author profiles could not be loaded",error);
   (profiles||[]).forEach(p=>result.set(p.id,{name:(p.display_name||"").trim()||"Community member",avatar:p.avatar_url||"",owner:false}));
   await Promise.all(ids.map(async id=>{
    const {data,error}=await client.rpc("is_community_platform_owner",{target_user:id});
    if(!error&&data===true){const current=result.get(id)||{name:"Taiwo Abdulgafar Adekunle",avatar:"",owner:false};current.owner=true;if(!current.name||current.name==="Community member"||current.name==="Voiceoftaade")current.name="Taiwo Abdulgafar Adekunle";result.set(id,current);}
   }));
   ids.forEach(id=>{if(!result.has(id))result.set(id,{name:"Community member",avatar:"",owner:false});});
   return result;
  }
  async function loadPosts(community){
   const feed=$("chatMessageArea");
   if(!feed||!client||!community?.id)return;
   feed.innerHTML='<p class="community-loading">Loading conversations…</p>';
   try {
   const {data:posts,error}=await client.from("community_posts").select("id,community_id,author_id,title,body,is_pinned,created_at").eq("community_id",community.id).eq("status","published").order("is_pinned",{ascending:false}).order("created_at",{ascending:false}).limit(50);
   if(error){console.error("Conversation feed query failed",error);feed.innerHTML='<div class="chat-welcome"><span>!</span><h3>Conversations could not load</h3><p>'+escape(error.message||"Check your connection and community access, then retry.")+'</p><button type="button" class="button button-gold" id="retryConversationLoad">Try again</button></div>';$("retryConversationLoad")?.addEventListener("click",()=>loadPosts(community));return;}
   if(state.blockedUsers?.length)posts.splice(0,posts.length,...posts.filter(p=>!state.blockedUsers.includes(p.author_id)));
   if(!posts?.length){feed.innerHTML='<div class="chat-welcome"><span>✧</span><h3>This room is just getting started</h3><p>Start a thoughtful conversation with the composer below.</p></div>';return;}
   const ids=posts.map(p=>p.id);
   const [reactRes,replyRes]=await Promise.all([
    client.from("community_reactions").select("post_id,user_id,reaction").in("post_id",ids),
    client.from("community_replies").select("id,post_id,author_id,body,created_at").in("post_id",ids).eq("status","published").order("created_at",{ascending:true})
   ]);
   const reactions=reactRes.data||[],replies=(replyRes.data||[]).filter(reply=>!state.blockedUsers?.includes(reply.author_id));
   const authors=await getAuthorMeta([...posts.map(p=>p.author_id),...replies.map(r=>r.author_id)]);
   feed.innerHTML=posts.map(p=>{
    const likes=reactions.filter(r=>r.post_id===p.id&&r.reaction==="like").length,liked=state.user&&reactions.some(r=>r.post_id===p.id&&r.user_id===state.user.id&&r.reaction==="like");
    const comments=replies.filter(r=>r.post_id===p.id);
    const person=authors.get(p.author_id)||{name:"Community member",avatar:"",owner:false};
    const avatar=person.avatar?'<img class="chat-avatar-image" src="'+escape(person.avatar)+'" alt="">':escape((person.name||"M").trim().slice(0,1).toUpperCase());
    const badge=person.owner?'<span class="vt-verified-badge" title="Verified Voiceoftaade owner" aria-label="Verified Voiceoftaade owner">✓</span><span class="vt-owner-mark" title="Voiceoftaade owner" aria-label="Voiceoftaade owner">✦</span>':"";
    return '<article class="chat-post" data-post-card="'+p.id+'">'+(p.is_pinned?'<span class="community-type">Pinned</span>':'')+'<div class="chat-post-head"><span class="chat-avatar">'+avatar+'</span><div><div class="chat-post-author"><a href="profile.html?id='+encodeURIComponent(p.author_id)+'">'+escape(person.name)+'</a>'+badge+'</div><div class="chat-post-date">'+dateText(p.created_at)+'</div></div></div><h3>'+escape(p.title)+'</h3><div class="chat-post-body">'+escape(p.body)+'</div><div class="chat-post-actions"><button type="button" data-like="'+p.id+'" class="'+(liked?'is-liked':'')+'">♡ Like · '+likes+'</button><button type="button" data-comment="'+p.id+'">Comment · '+comments.length+'</button><button type="button" data-share="'+p.id+'">Share ↗</button><button type="button" data-repost="'+p.id+'">Reshare</button><button type="button" data-report="'+p.id+'">Report post</button><button type="button" data-report-reader="'+p.author_id+'" data-post-id="'+p.id+'">Report reader</button><button type="button" data-block-reader="'+p.author_id+'">Block reader</button></div><div class="chat-comments" id="comments-'+p.id+'">'+comments.map(r=>{const author=authors.get(r.author_id)||{name:"Community member",avatar:"",owner:false};const initial=author.avatar?'<img class="chat-avatar-image" src="'+escape(author.avatar)+'" alt="">':escape((author.name||"M").trim().slice(0,1).toUpperCase());const authorBadge=author.owner?'<span class="vt-verified-badge" title="Verified Voiceoftaade owner" aria-label="Verified Voiceoftaade owner">✓</span><span class="vt-owner-mark" title="Voiceoftaade owner" aria-label="Voiceoftaade owner">✦</span>':"";return '<div class="chat-comment"><a class="chat-avatar-link" href="profile.html?id='+encodeURIComponent(r.author_id)+'" aria-label="View '+escape(author.name)+' profile"><span class="chat-avatar">'+initial+'</span></a><div class="chat-comment-content"><div class="chat-comment-meta"><a href="profile.html?id='+encodeURIComponent(r.author_id)+'">'+escape(author.name)+'</a>'+authorBadge+' · '+dateText(r.created_at)+'</div>'+escape(r.body)+'<div class="chat-comment-actions"><button type="button" data-report-reply="'+r.id+'" data-reply-author="'+r.author_id+'">Report reply</button><button type="button" data-block-reader="'+r.author_id+'">Block reader</button></div></div></div>';}).join("")+'</div>'+(state.user?'<form class="comment-form" data-comment-form="'+p.id+'"><label class="sr-only" for="comment-'+p.id+'">Write a comment</label><input id="comment-'+p.id+'" name="body" required maxlength="5000" placeholder="Write a comment…"><button type="submit">Reply</button></form>':'')+'</article>';
   }).join("");
   posts.forEach(p=>{
    feed.querySelector('[data-like="'+p.id+'"]')?.addEventListener("click",()=>reactTo(p,"like"));
    feed.querySelector('[data-comment="'+p.id+'"]')?.addEventListener("click",()=>document.getElementById("comment-"+p.id)?.focus());
    feed.querySelector('[data-share="'+p.id+'"]')?.addEventListener("click",()=>sharePost(p));
    feed.querySelector('[data-repost="'+p.id+'"]')?.addEventListener("click",()=>resharePost(p));
    feed.querySelector('[data-report="'+p.id+'"]')?.addEventListener("click",()=>reportPost(p));feed.querySelector('[data-report-reader="'+p.author_id+'"]')?.addEventListener("click",()=>reportReader(p.author_id,p.community_id,p.id));feed.querySelectorAll('[data-block-reader="'+p.author_id+'"]').forEach(b=>b.addEventListener("click",()=>blockReader(p.author_id)));feed.querySelectorAll('[data-report-reply]').forEach(b=>b.addEventListener("click",()=>reportReader(b.dataset.replyAuthor,p.community_id,p.id,b.dataset.reportReply)));
    feed.querySelector('[data-comment-form="'+p.id+'"]')?.addEventListener("submit",e=>submitComment(e,p));
   });
   } catch(error) {
    console.error("Conversation feed crashed",error);
    feed.innerHTML='<div class="chat-welcome"><span>!</span><h3>We could not open this conversation</h3><p>'+escape(error?.message||"Unexpected loading error.")+'</p><button type="button" class="button button-gold" id="retryConversationLoad">Try again</button></div>';
    $("retryConversationLoad")?.addEventListener("click",()=>loadPosts(community));
   }
  }
  async function submitComment(event,post){
   event.preventDefault();if(!requireLogin())return;
   const form=event.currentTarget,body=form.elements.body.value.trim();if(!body)return;
   const {error}=await client.from("community_replies").insert({post_id:post.id,author_id:state.user.id,body});
   if(error){status("Could not add comment. Join the community first.",true);return;}
   const latest=await client.from("community_replies").select("id").eq("post_id",post.id).eq("author_id",state.user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();if(!latest.error&&latest.data)await createMentions(body,"reply",latest.data.id);
   await loadPosts(state.selected);
  }
  async function sharePost(post){
   const url=location.href.split("#")[0]+"#post-"+post.id;
   try{if(navigator.share)await navigator.share({title:post.title,text:post.body,url});else if(navigator.clipboard){await navigator.clipboard.writeText(url);status("Post link copied.");}else window.prompt("Copy this post link",url);}catch(e){if(e.name!=="AbortError")status("Could not share this post.",true);}
  }
  async function resharePost(post){
   if(!requireLogin())return;
   const {data:member}=await client.from("community_members").select("status").eq("community_id",post.community_id).eq("user_id",state.user.id).maybeSingle();
   if(member?.status!=="active"){status("Join the community before resharing posts.",true);return;}
   const {error}=await client.from("community_posts").insert({community_id:post.community_id,author_id:state.user.id,title:"Reshared: "+post.title.slice(0,165),body:"Reshared from the community discussion by a reader.\n\n"+post.body});
   if(error){status("Could not reshare this post. "+error.message,true);return;}
   status("Post reshared to the room.");await loadPosts(state.selected);
  }
  async function createPost(event){
   event.preventDefault();if(!requireLogin()||!state.selected)return;
   const form=event.currentTarget,title=form.elements.title.value.trim(),body=form.elements.body.value.trim();if(!title||!body)return;
   const {error}=await client.from("community_posts").insert({community_id:state.selected.id,author_id:state.user.id,title,body});
   if(error){status("Could not publish. Make sure you have joined this community. "+error.message,true);return;}
   const latest=await client.from("community_posts").select("id").eq("community_id",state.selected.id).eq("author_id",state.user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();if(!latest.error&&latest.data)await createMentions(body,"post",latest.data.id);form.reset();status("Your discussion has been published.");await loadPosts(state.selected);
  }
  async function reactTo(post,reaction){
   if(!requireLogin())return;
   const {error}=await client.from("community_reactions").insert({post_id:post.id,user_id:state.user.id,reaction});
   if(error&&error.code==="23505"){const removed=await client.from("community_reactions").delete().eq("post_id",post.id).eq("user_id",state.user.id).eq("reaction",reaction);if(removed.error){status("Could not update reaction.",true);return;}status("Like removed.");await loadPosts(state.selected);return;}
   if(error){status("Could not add reaction. Join this community first.",true);return;}status("Like updated.");await loadPosts(state.selected);
  }
  async function reportReader(userId,communityId=null,postId=null,replyId=null){
   if(!requireLogin()||userId===state.user.id)return;
   const reason=window.prompt("Report this reader. Describe the concern (at least 5 characters):");if(!reason?.trim()||reason.trim().length<5)return;
   const {error}=await client.from("reader_safety_reports").insert({reporter_id:state.user.id,reported_user_id:userId,community_id:communityId,post_id:postId,reply_id:replyId,reason:reason.trim()});
   status(error?"Could not submit reader report. Please try again.":"Reader report sent to the Voiceoftaade moderation queue.",!!error);
  }
  async function blockReader(userId){
   if(!requireLogin()||userId===state.user.id)return;
   if(!window.confirm("Block this reader? Their posts will be hidden from your feeds where supported."))return;
   const {error}=await client.from("reader_blocks").insert({blocker_id:state.user.id,blocked_id:userId});
   status(error?(error.code==="23505"?"You have already blocked this reader.":"Could not block this reader. "+error.message):"Reader blocked.",!!error);
   await loadBlockedUsers();await loadForYou();await loadFollowing();if(state.selected)await loadPosts(state.selected);
  }
  async function showCommunityInfo(){
   const panel=$("communityInfoPanel"),host=$("communityInfoContent"),room=state.selected;if(!panel||!host||!room)return;
   panel.hidden=false;host.innerHTML='<p>Loading community details…</p>';
   const [membersRes,creatorRes,myMembership,memberCountRes]=await Promise.all([
    client.from("community_members").select("user_id,role,status").eq("community_id",room.id).eq("status","active").in("role",["owner","moderator"]).limit(30),
    client.rpc("get_public_reader_profile",{target_user_id:room.created_by}),
    state.user?client.from("community_members").select("role,status").eq("community_id",room.id).eq("user_id",state.user.id).maybeSingle():Promise.resolve({data:null}),
    client.from("community_members").select("user_id",{count:"exact",head:true}).eq("community_id",room.id).eq("status","active")
   ]);
   const members=membersRes.data||[],ids=members.map(m=>m.user_id);let profiles=[];
   if(ids.length){const q=await client.rpc("get_public_reader_profiles",{target_user_ids:ids});profiles=q.data||[];}
   const map=new Map(profiles.map(p=>[p.id,p])),membership=myMembership.data,canManage=!!state.user&&(state.staff||room.created_by===state.user.id||(["owner","moderator"].includes(membership?.role)&&membership?.status==="active"));
   const admins=members.map(m=>'<div class="info-stat"><strong>'+escape(map.get(m.user_id)?.display_name||"Reader")+'</strong><br><small>'+escape(m.role)+'</small><div class="info-actions"><button type="button" data-info-profile="'+m.user_id+'">View profile</button></div></div>').join("");
   const image=(room.cover_url?'<img src="'+escape(room.cover_url)+'" alt="" class="community-info-cover">':"")+(room.avatar_url?'<img src="'+escape(room.avatar_url)+'" alt="" class="community-info-avatar">':'<div class="info-community-mark">'+escape((room.name||"V").trim().slice(0,1).toUpperCase())+'</div>');
   const isMember=membership?.status==="active";
   host.innerHTML=image+'<h4 class="info-community-name">'+escape(room.name)+'</h4><div class="info-stat"><strong>'+(room.visibility==="private"?"🔒 Private community":"🌐 Public community")+'</strong><p>'+escape(room.description||"A Voiceoftaade reader community.")+'</p>'+(room.rules?'<p><strong>Community rules</strong><br>'+escape(room.rules)+'</p>':'')+'<small>'+(memberCountRes.count||0)+' active members</small></div><div class="info-stat"><strong>Created by</strong><br><a href="profile.html?id='+encodeURIComponent(room.created_by)+'">'+escape(creatorRes.data?.[0]?.display_name||"Community creator")+'</a></div><div class="info-stat"><strong>Admins and moderators</strong>'+(admins||'<p>No community-specific admins or moderators are listed.</p>')+'</div><div class="info-actions">'+(isMember&&room.created_by!==state.user?.id?'<button id="infoLeaveCommunity" type="button">Leave community</button>':'')+'<button id="infoReportCommunity" type="button" class="community-safety-action">Report community</button>'+(state.user&&room.created_by!==state.user.id?'<button id="infoBlockOwner" type="button">Block creator</button>':'')+(canManage?'<button id="infoEditSettings" type="button">Edit community settings</button>':'')+'</div><p id="communityInfoStatus" class="community-status" aria-live="polite"></p><div id="communitySettingsEditor" hidden></div>';
   host.querySelectorAll("[data-info-profile]").forEach(b=>b.addEventListener("click",()=>location.href="profile.html?id="+encodeURIComponent(b.dataset.infoProfile)));
   $("infoLeaveCommunity")?.addEventListener("click",async()=>{if(!state.user||!confirm("Leave this community?"))return;const z=await client.from("community_members").delete().eq("community_id",room.id).eq("user_id",state.user.id);if(z.error){status("Could not leave community. "+z.error.message,true);return;}panel.hidden=true;state.selected=null;await loadJoinedCommunities();showWorkspace("discover");});
   $("infoReportCommunity")?.addEventListener("click",async()=>{if(!requireLogin())return;const reason=prompt("Why are you reporting this community? Please include at least 5 characters.");if(!reason?.trim()||reason.trim().length<5)return;const z=await client.from("community_group_reports").insert({community_id:room.id,reporter_id:state.user.id,reason:reason.trim()});const s=$("communityInfoStatus");if(s)s.textContent=z.error?"Could not report community: "+z.error.message:"Community report sent to the Voiceoftaade moderation queue.";});
   $("infoBlockOwner")?.addEventListener("click",()=>blockReader(room.created_by));
   $("infoEditSettings")?.addEventListener("click",()=>renderCommunitySettings(room));
  }
  function renderCommunitySettings(room){
   const host=$("communitySettingsEditor");if(!host)return;
   host.hidden=false;host.innerHTML='<form id="communitySettingsForm" class="community-form"><label>Community name<input name="name" required minlength="3" maxlength="80" value="'+escape(room.name)+'"></label><label>Description<textarea name="description" required minlength="10" maxlength="1000">'+escape(room.description||"")+'</textarea></label><label>Community picture URL<input name="avatar_url" type="url" maxlength="2048" value="'+escape(room.avatar_url||"")+'" placeholder="https://…"></label><label>Cover picture URL<input name="cover_url" type="url" maxlength="2048" value="'+escape(room.cover_url||"")+'" placeholder="https://…"></label><label>Community rules<textarea name="rules" maxlength="3000" placeholder="Respect, privacy, and posting rules">'+escape(room.rules||"")+'</textarea></label><div class="info-actions"><button type="submit">Save settings</button><button type="button" id="cancelCommunitySettings">Cancel</button></div></form>';
   $("cancelCommunitySettings")?.addEventListener("click",()=>{host.hidden=true;});
   $("communitySettingsForm")?.addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('[type="submit"]');b.disabled=true;const {error}=await client.rpc("update_community_settings",{target_community:room.id,new_name:f.elements.name.value.trim(),new_description:f.elements.description.value.trim(),new_avatar_url:f.elements.avatar_url.value.trim(),new_cover_url:f.elements.cover_url.value.trim(),new_rules:f.elements.rules.value.trim()});b.disabled=false;const s=$("communityInfoStatus");if(error){if(s)s.textContent="Could not save settings: "+error.message;return;}room.name=f.elements.name.value.trim();room.description=f.elements.description.value.trim();room.avatar_url=f.elements.avatar_url.value.trim()||null;room.cover_url=f.elements.cover_url.value.trim()||null;room.rules=f.elements.rules.value.trim()||null;$("chatHeading").textContent=room.name;const mark=$("workspaceChat")?.querySelector(".chat-room-mark");if(mark)mark.innerHTML=room.avatar_url?'<img src="'+escape(room.avatar_url)+'" alt="">':escape(room.name.slice(0,1).toUpperCase());if(s)s.textContent="Community settings saved.";host.hidden=true;await loadCommunities();await loadJoinedCommunities();await showCommunityInfo();});
  }
  async function reportPost(post){
   if(!requireLogin())return;
   const reason=window.prompt("Why are you reporting this discussion? Please include enough detail for review.");if(!reason?.trim())return;
   const {error}=await client.from("community_reports").insert({community_id:post.community_id,reporter_id:state.user.id,post_id:post.id,reason:reason.trim()});
   status(error?"Could not submit report. Please try again.":"Report submitted for administrator review.",!!error);
  }
  async function requestCreator(){
   if(!requireLogin())return;
   const message=window.prompt("Tell us briefly what kind of community you would like to create (10–1,000 characters):");if(!message?.trim())return;
   const {error}=await client.from("community_creator_requests").insert({user_id:state.user.id,message:message.trim()});
   status(error?(error.code==="23505"?"You already have a request with this status.":"Could not submit request. "+error.message):"Creator request submitted. The Voiceoftaade administrator will review it.",!!error);
  }
  async function createCommunity(event){
   if(event?.preventDefault)event.preventDefault();if(!requireLogin())return;
   const form=$("communityCreateForm");const name=form.elements.name.value.trim(),description=form.elements.description.value.trim(),visibility=form.elements.visibility.value;
   const slug=name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
   const {error}=await client.from("communities").insert({name,slug,description,visibility,created_by:state.user.id,status:"pending"});
   if(error){status("Could not create community. "+error.message,true);return;}
   form.reset();status("Community submitted for owner approval. It will appear publicly only after approval.");if(state.staff)await loadModeration();await loadCommunities();
  }
  init().catch(error=>{console.error(error);status("Community services could not start. Please refresh the page.",true);});
 })();