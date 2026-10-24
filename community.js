(() => {
  const $ = id => document.getElementById(id);
  const client = window.supabase?.createClient("https://qnnmbngxunmjerpeoxrr.supabase.co", "sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67");
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const dateText = value => value ? new Date(value).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}) : "";
  const state = { user:null, selected:null, communities:[], joined:[], staff:false, creator:false };
  const status = (message, bad=false) => { const el=$("communityStatus"); if(el){el.textContent=message;el.classList.toggle("is-error",bad);} };
  const requireLogin = () => { if(!state.user){status("Please sign in from your reader account before joining or posting.");return false;} return true; };
  async function init(){
   $("year").textContent = new Date().getFullYear();
   const menu=$("menuToggle"),nav=$("mainNav");
   menu?.addEventListener("click",()=>{const open=nav.classList.toggle("open");menu.setAttribute("aria-expanded",String(open));menu.textContent=open?"×":"☰";});
   nav?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>nav.classList.remove("open")));
   if(!client){status("Community services are temporarily unavailable.",true);return;}
   const {data:{session}}=await client.auth.getSession(); state.user=session?.user??null;
   client.auth.onAuthStateChange((_event,session)=>{
    state.user=session?.user??null;
    if(!state.user){state.staff=false;state.creator=false;}
    renderAccount();
    refreshPermissions().then(()=>{renderAccount();loadCommunities();}).catch(error=>{console.error("Permission refresh failed",error);renderAccount();loadCommunities();});
   });
   renderAccount();
   await refreshPermissions();
   renderAccount();
   $("createCommunityBtn")?.addEventListener("click",createCommunity);
   $("communityCreateForm")?.addEventListener("submit",createCommunity);
   $("postForm")?.addEventListener("submit",createPost);
   $("backToDiscover")?.addEventListener("click",()=>showWorkspace("discover"));
   $("chatJoinBtn")?.addEventListener("click",()=>state.selected&&joinCommunity(state.selected));
   $("chatRoomInfo")?.addEventListener("click",()=>state.selected&&window.alert(state.selected.description));
   document.querySelectorAll("[data-workspace]").forEach(btn=>btn.addEventListener("click",()=>showWorkspace(btn.dataset.workspace)));
   const moderation=$("ownerModerationPanel"),mount=$("adminModerationMount");if(moderation&&mount)mount.appendChild(moderation);
   await loadCommunities();
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
   const adminNav=$("adminNavBtn");if(adminNav)adminNav.hidden=!(state.user&&state.staff);
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
   const [communityRes,reqRes,reportRes]=await Promise.all([
    client.from("communities").select("id,name,description,visibility,created_at").eq("status","pending").order("created_at",{ascending:true}).limit(50),
    client.from("community_creator_requests").select("id,user_id,message,status,created_at").eq("status","pending").order("created_at",{ascending:true}).limit(50),
    client.from("community_reports").select("id,community_id,reporter_id,post_id,reason,status,created_at").in("status",["open","reviewing"]).order("created_at",{ascending:false}).limit(50)
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
  async function loadCommunities(){
   const list=$("communityList");
   list.innerHTML='<p class="community-loading">Finding communities…</p>';
   const {data,error}=await client.from("communities").select("id,name,slug,description,visibility,created_at").eq("status","active").order("created_at",{ascending:false});
   if(error){console.error(error);list.innerHTML='<p class="community-loading">Communities could not load. Please refresh and try again.</p>';return;}
   state.communities=data||[];
   if(!state.communities.length){list.innerHTML='<div class="community-empty"><span>✳</span><h3>A new space for meaningful conversation.</h3><p>Our community spaces are being prepared. Approved community creators will be able to launch the first groups here.</p></div>';return;}
   list.innerHTML=state.communities.map(c=>'<article class="community-card"><div class="community-card-top"><span class="community-type">'+(c.visibility==="private"?"Private community":"Public community")+'</span><span class="community-mark">✦</span></div><h3>'+escape(c.name)+'</h3><p>'+escape(c.description)+'</p><div class="community-card-bottom"><span>Voiceoftaade conversations</span><button type="button" class="button button-dark community-open" data-community="'+c.id+'">Open community →</button></div></article>').join("");
   list.querySelectorAll("[data-community]").forEach(btn=>btn.addEventListener("click",()=>openCommunity(btn.dataset.community)));
  }
  function showWorkspace(which){
   document.querySelectorAll(".workspace-view").forEach(v=>v.hidden=true);
   const target=which==="admin"?$("workspaceAdmin"):which==="chat"?$("workspaceChat"):which==="ai"?$("workspaceAI"):$("workspaceDiscover");
   if(target)target.hidden=false;
   document.querySelectorAll("[data-workspace]").forEach(b=>b.classList.toggle("active",b.dataset.workspace===which));
   if(which==="admin"&&state.staff)loadModeration();
  }
  function showAdminNav(){const panel=$("ownerModerationPanel");if(panel){panel.hidden=false;}const btn=$("adminNavBtn");if(btn)btn.onclick=()=>showWorkspace("admin");}
  async function loadJoinedCommunities(){
   if(!state.user){state.joined=[];renderJoinedNav();return;}
   const {data,error}=await client.from("community_members").select("community_id,status,communities(id,name,slug,description,visibility,status)").eq("user_id",state.user.id).eq("status","active");
   if(error){console.warn("Joined rooms unavailable",error);return;}
   state.joined=(data||[]).map(x=>x.communities).filter(c=>c&&c.status==="active");renderJoinedNav();
  }
  function renderJoinedNav(){
   const nav=$("joinedCommunityNav");if(!nav)return;
   if(!state.joined.length){nav.innerHTML='<p class="sidebar-empty">Join a community to see its chat here.</p>';return;}
   nav.innerHTML=state.joined.map(c=>'<button type="button" class="'+(state.selected?.id===c.id?'active':'')+'" data-room="'+c.id+'"><span class="room-nav-icon">'+escape(c.name.slice(0,1).toUpperCase())+'</span><span class="room-nav-name">'+escape(c.name)+'</span></button>').join("");
   nav.querySelectorAll("[data-room]").forEach(b=>b.addEventListener("click",()=>openCommunity(b.dataset.room)));
  }
  async function openCommunity(id){
   const community=state.communities.find(c=>c.id===id)||state.joined.find(c=>c.id===id);if(!community)return;
   state.selected=community;renderAccount();renderJoinedNav();showWorkspace("chat");
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
  async function loadPosts(community){
   const feed=$("chatMessageArea");feed.innerHTML='<p class="community-loading">Loading conversations…</p>';
   const {data:posts,error}=await client.from("community_posts").select("id,community_id,author_id,title,body,is_pinned,created_at").eq("community_id",community.id).eq("status","published").order("is_pinned",{ascending:false}).order("created_at",{ascending:false}).limit(50);
   if(error){console.error(error);feed.innerHTML='<p class="community-loading">Messages are not available. Join or request access to this room.</p>';return;}
   if(!posts?.length){feed.innerHTML='<div class="chat-welcome"><span>✧</span><h3>This room is just getting started</h3><p>Start a thoughtful conversation with the composer below.</p></div>';return;}
   const ids=posts.map(p=>p.id);
   const [reactRes,replyRes]=await Promise.all([
    client.from("community_reactions").select("post_id,user_id,reaction").in("post_id",ids),
    client.from("community_replies").select("id,post_id,author_id,body,created_at").in("post_id",ids).eq("status","published").order("created_at",{ascending:true})
   ]);
   const reactions=reactRes.data||[],replies=replyRes.data||[];
   feed.innerHTML=posts.map(p=>{
    const likes=reactions.filter(r=>r.post_id===p.id&&r.reaction==="like").length,liked=state.user&&reactions.some(r=>r.post_id===p.id&&r.user_id===state.user.id&&r.reaction==="like");
    const comments=replies.filter(r=>r.post_id===p.id);
    return '<article class="chat-post" data-post-card="'+p.id+'">'+(p.is_pinned?'<span class="community-type">Pinned</span>':'')+'<div class="chat-post-head"><span class="chat-avatar">'+escape((p.author_id||"R").slice(0,1).toUpperCase())+'</span><div><div class="chat-post-author">Reader</div><div class="chat-post-date">'+dateText(p.created_at)+'</div></div></div><h3>'+escape(p.title)+'</h3><div class="chat-post-body">'+escape(p.body)+'</div><div class="chat-post-actions"><button type="button" data-like="'+p.id+'" class="'+(liked?'is-liked':'')+'">♡ Like · '+likes+'</button><button type="button" data-comment="'+p.id+'">Comment · '+comments.length+'</button><button type="button" data-share="'+p.id+'">Share ↗</button><button type="button" data-repost="'+p.id+'">Reshare</button><button type="button" data-report="'+p.id+'">Report</button></div><div class="chat-comments" id="comments-'+p.id+'">'+comments.map(r=>'<div class="chat-comment"><span class="chat-avatar">R</span><div class="chat-comment-content"><div class="chat-comment-meta">Reader · '+dateText(r.created_at)+'</div>'+escape(r.body)+'</div></div>').join("")+'</div>'+(state.user?'<form class="comment-form" data-comment-form="'+p.id+'"><label class="sr-only" for="comment-'+p.id+'">Write a comment</label><input id="comment-'+p.id+'" name="body" required maxlength="5000" placeholder="Write a comment…"><button type="submit">Reply</button></form>':'')+'</article>';
   }).join("");
   posts.forEach(p=>{
    feed.querySelector('[data-like="'+p.id+'"]')?.addEventListener("click",()=>reactTo(p,"like"));
    feed.querySelector('[data-comment="'+p.id+'"]')?.addEventListener("click",()=>document.getElementById("comment-"+p.id)?.focus());
    feed.querySelector('[data-share="'+p.id+'"]')?.addEventListener("click",()=>sharePost(p));
    feed.querySelector('[data-repost="'+p.id+'"]')?.addEventListener("click",()=>resharePost(p));
    feed.querySelector('[data-report="'+p.id+'"]')?.addEventListener("click",()=>reportPost(p));
    feed.querySelector('[data-comment-form="'+p.id+'"]')?.addEventListener("submit",e=>submitComment(e,p));
   });
  }
  async function submitComment(event,post){
   event.preventDefault();if(!requireLogin())return;
   const form=event.currentTarget,body=form.elements.body.value.trim();if(!body)return;
   const {error}=await client.from("community_replies").insert({post_id:post.id,author_id:state.user.id,body});
   if(error){status("Could not add comment. Join the community first.",true);return;}
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
   form.reset();status("Your discussion has been published.");await loadPosts(state.selected);
  }
  async function reactTo(post,reaction){
   if(!requireLogin())return;
   const {error}=await client.from("community_reactions").insert({post_id:post.id,user_id:state.user.id,reaction});
   if(error&&error.code==="23505"){const removed=await client.from("community_reactions").delete().eq("post_id",post.id).eq("user_id",state.user.id).eq("reaction",reaction);if(removed.error){status("Could not update reaction.",true);return;}status("Like removed.");await loadPosts(state.selected);return;}
   if(error){status("Could not add reaction. Join this community first.",true);return;}status("Like updated.");await loadPosts(state.selected);
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