(() => {
  const $ = id => document.getElementById(id);
  const client = window.supabase?.createClient("https://qnnmbngxunmjerpeoxrr.supabase.co", "sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67");
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const dateText = value => value ? new Date(value).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}) : "";
  const state = { user:null, selected:null, communities:[], staff:false, creator:false };
  const status = (message, bad=false) => { const el=$("communityStatus"); if(el){el.textContent=message;el.classList.toggle("is-error",bad);} };
  const requireLogin = () => { if(!state.user){status("Please sign in from your reader account before joining or posting.");return false;} return true; };
  async function init(){
   $("year").textContent = new Date().getFullYear();
   const menu=$("menuToggle"),nav=$("mainNav");
   menu?.addEventListener("click",()=>{const open=nav.classList.toggle("open");menu.setAttribute("aria-expanded",String(open));menu.textContent=open?"×":"☰";});
   nav?.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>nav.classList.remove("open")));
   if(!client){status("Community services are temporarily unavailable.",true);return;}
   const {data:{session}}=await client.auth.getSession(); state.user=session?.user??null;
   client.auth.onAuthStateChange((_event,session)=>{state.user=session?.user??null;renderAccount();loadCommunities();});
   renderAccount();
   if(state.user){
    const [{data:staff},{data:creator}] = await Promise.all([
     client.rpc("is_community_platform_staff"), client.rpc("is_community_creator")
    ]);
    state.staff=!!staff;state.creator=!!creator;
   }
   $("creatorRequestBtn")?.addEventListener("click",requestCreator);
   $("createCommunityBtn")?.addEventListener("click",createCommunity);
   $("communityCreateForm")?.addEventListener("submit",createCommunity);
   $("postForm")?.addEventListener("submit",createPost);
   await loadCommunities();
  }
  function renderAccount(){
   const el=$("communityAccountState");
   if(el) el.innerHTML=state.user
    ? '<span class="signed-in-dot"></span> Signed in. You can join communities and participate.'
    : 'You are browsing as a visitor. <a href="account.html">Sign in or create a reader account</a> to join discussions.';
   const req=$("creatorRequestBtn"); if(req) req.hidden=!state.user||state.creator||state.staff;
   const create=$("createCommunityPanel"); if(create) create.hidden=!(state.user&&state.creator);
   const request=$("creatorRequestPanel"); if(request) request.hidden=!state.user||state.creator||state.staff;
   const post=$("newPostPanel"); if(post) post.hidden=!state.user||!state.selected;
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
  async function openCommunity(id){
   const community=state.communities.find(c=>c.id===id);if(!community)return;
   state.selected=community;renderAccount();
   $("discussionHeading").textContent=community.name;
   $("discussionDescription").textContent=community.description;
   $("discussionPanel").hidden=false;
   $("discussionPanel").scrollIntoView({behavior:"smooth",block:"start"});
   const join=$("joinCommunityBtn");join.hidden=!state.user;join.textContent=community.visibility==="private"?"Request access":"Join community";
   const {data:member}=state.user?await client.from("community_members").select("status,role").eq("community_id",id).eq("user_id",state.user.id).maybeSingle():{data:null};
   if(member?.status==="active"){join.hidden=true;$("newPostPanel").hidden=false;} else {$("newPostPanel").hidden=true;join.hidden=!state.user;join.disabled=false;}
   join.onclick=()=>joinCommunity(community);
   await loadPosts(community);
  }
  async function joinCommunity(community){
   if(!requireLogin())return;
   const isPrivate=community.visibility==="private";
   const {error}=await client.from("community_members").insert({community_id:community.id,user_id:state.user.id,role:"member",status:isPrivate?"pending":"active"});
   if(error&&error.code!=="23505"){status(error.message.includes("row-level security")?"This community is not open for self-joining. Please contact an administrator.":"Could not join/request access. "+error.message,true);return;}
   if(isPrivate){status("Access request sent. An administrator must approve it before you can read or post.");$("joinCommunityBtn").disabled=true;$("joinCommunityBtn").textContent="Request sent";return;}
   status("You have joined "+community.name+".");await openCommunity(community.id);
  }
  async function loadPosts(community){
   const feed=$("discussionFeed");feed.innerHTML='<p class="community-loading">Loading conversations…</p>';
   const {data:posts,error}=await client.from("community_posts").select("id,community_id,author_id,title,body,is_pinned,created_at").eq("community_id",community.id).eq("status","published").order("is_pinned",{ascending:false}).order("created_at",{ascending:false}).limit(50);
   if(error){console.error(error);feed.innerHTML='<p class="community-loading">Posts are not available. If this is a private community, you may need membership approval.</p>';return;}
   if(!posts?.length){feed.innerHTML='<div class="community-empty"><h3>Start a thoughtful conversation.</h3><p>There are no discussions here yet.</p></div>';return;}
   feed.innerHTML=posts.map(p=>'<article class="discussion-card">'+(p.is_pinned?'<span class="community-type">Pinned discussion</span>':'')+'<h3>'+escape(p.title)+'</h3><p class="discussion-meta">'+"Community member"+' · '+dateText(p.created_at)+'</p><p class="discussion-body">'+escape(p.body).replace(/\n/g,"<br>")+'</p><div class="discussion-actions"><button type="button" class="text-button" data-reply="'+p.id+'">Reply</button><button type="button" class="text-button" data-report="'+p.id+'">Report</button></div><div id="replies-'+p.id+'" class="reply-list"></div></article>').join("");
   for(const p of posts){loadReplies(p);feed.querySelector('[data-reply="'+p.id+'"]')?.addEventListener("click",()=>replyTo(p));feed.querySelector('[data-report="'+p.id+'"]')?.addEventListener("click",()=>reportPost(p));feed.querySelectorAll('[data-react="'+p.id+'"]').forEach(btn=>btn.addEventListener("click",()=>reactTo(p,btn.dataset.reaction)));}
  }
  async function loadReplies(post){
   const host=$("replies-"+post.id);const {data}=await client.from("community_replies").select("body,created_at,author_id").eq("post_id",post.id).eq("status","published").order("created_at",{ascending:true}).limit(30);
   if(!host||!data?.length)return;
   host.innerHTML=data.map(r=>'<p class="reply-item"><strong>'+"Reader"+'</strong> <span>'+dateText(r.created_at)+'</span><br>'+escape(r.body).replace(/\n/g,"<br>")+'</p>').join("");
  }
  async function createPost(event){
   event.preventDefault();if(!requireLogin()||!state.selected)return;
   const form=event.currentTarget;const title=form.elements.title.value.trim(),body=form.elements.body.value.trim();
   if(!title||!body)return;
   const {error}=await client.from("community_posts").insert({community_id:state.selected.id,author_id:state.user.id,title,body});
   if(error){status("Could not publish. Make sure you have joined this community. "+error.message,true);return;}
   form.reset();status("Your discussion has been published.");await loadPosts(state.selected);
  }
  async function replyTo(post){
   if(!requireLogin())return;
   const body=window.prompt("Write a thoughtful reply (up to 5,000 characters):");if(!body?.trim())return;
   const {error}=await client.from("community_replies").insert({post_id:post.id,author_id:state.user.id,body:body.trim()});
   if(error){status("Could not add reply. You may need to join the community first.",true);return;}
   status("Reply added.");await loadReplies(post);
  }
  async function reactTo(post,reaction){
   if(!requireLogin())return;
   const {error}=await client.from("community_reactions").insert({post_id:post.id,user_id:state.user.id,reaction});
   if(error&&error.code==="23505"){const removed=await client.from("community_reactions").delete().eq("post_id",post.id).eq("user_id",state.user.id).eq("reaction",reaction);status(removed.error?"Could not update reaction.":"Reaction removed.",!!removed.error);return;}
   status(error?"Could not add reaction. Join this community first.":"Reaction added.",!!error);
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
   if(event?.preventDefault)event.preventDefault();if(!requireLogin()||!state.creator)return;
   const form=$("communityCreateForm");const name=form.elements.name.value.trim(),description=form.elements.description.value.trim(),visibility=form.elements.visibility.value;
   const slug=name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
   const {error}=await client.from("communities").insert({name,slug,description,visibility,created_by:state.user.id});
   if(error){status("Could not create community. "+error.message,true);return;}
   form.reset();status("Community created.");await loadCommunities();
  }
  init().catch(error=>{console.error(error);status("Community services could not start. Please refresh the page.",true);});
 })();