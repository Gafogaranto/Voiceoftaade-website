(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const client = window.supabase?.createClient(
    "https://qnnmbngxunmjerpeoxrr.supabase.co",
    "sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67"
  );
  const state = { user:null, clubs:[], selected:null, memberships:new Map(), staff:false };
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const dateText = value => value ? new Date(value).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"}) : "";
  const status = (message,bad=false,target="bookClubsStatus") => {
    const node=$(target); if(!node)return;
    node.textContent=message; node.classList.toggle("error",!!bad);
  };
  const communityOf = club => Array.isArray(club.communities) ? club.communities[0] : club.communities;
  const membershipFor = id => state.memberships.get(id) || null;
  const activeMember = id => membershipFor(id)?.status === "active";
  const managerFor = club => {
    const community=communityOf(club), membership=membershipFor(club.community_id);
    return !!state.user && (community?.created_by===state.user.id || ["owner","moderator"].includes(membership?.role) || state.staff);
  };

  async function loadMemberships(){
    state.memberships.clear();
    if(!state.user)return;
    const {data,error}=await client.from("community_members")
      .select("community_id,status,role").eq("user_id",state.user.id);
    if(error){console.warn("Book club memberships unavailable",error);return;}
    (data||[]).forEach(row=>state.memberships.set(row.community_id,row));
  }

  async function loadPermissions(){
    state.staff=false;
    if(!state.user)return;
    const {data,error}=await client.rpc("is_community_platform_staff");
    if(!error)state.staff=data===true;
  }

  function renderAccount(){
    const node=$("clubAccountState");
    if(node)node.innerHTML=state.user
      ? "Signed in. You can join reading circles and participate in their discussions."
      : 'Browsing as a visitor. <a href="account.html">Sign in or create a reader account</a> to join or propose a club.';
    $("createClubPanel").hidden=!state.user;
  }

  async function loadClubs(){
    const host=$("clubList");
    host.innerHTML='<p class="clubs-loading">Finding reading circles…</p>';
    const {data,error}=await client.from("book_clubs")
      .select("community_id,book_title,book_author,genre,reading_plan,created_at,communities!inner(id,name,slug,description,visibility,status,created_by)")
      .order("created_at",{ascending:false}).limit(60);
    if(error){
      console.error("Book clubs could not load",error);
      host.innerHTML='<p class="clubs-empty">Book clubs could not load. Please refresh the page and try again.</p>';
      return;
    }
    state.clubs=(data||[]).filter(row=>communityOf(row));
    renderClubs();
  }

  function renderClubs(){
    const host=$("clubList");
    if(!state.clubs.length){
      host.innerHTML='<div class="clubs-empty"><strong>No book clubs have launched yet.</strong><br>Be the first to propose a reading circle. New clubs are reviewed before they become discoverable.</div>';
      return;
    }
    host.innerHTML=state.clubs.map(club=>{
      const c=communityOf(club), own=c.created_by===state.user?.id, pending=c.status!=="active";
      const access=c.visibility==="private"?"Private club":"Public club";
      return '<article class="club-card"><span class="club-tag">'+esc(access)+'</span>'+(pending&&own?' <span class="club-tag pending">Awaiting review</span>':'')+
        '<h3>'+esc(c.name)+'</h3><p class="club-book">'+esc(club.book_title)+' · '+esc(club.book_author)+'</p><p>'+esc(c.description)+'</p>'+
        '<div class="club-card-bottom"><span class="clubs-muted">'+esc(club.genre)+'</span><button class="clubs-button clubs-button-quiet" type="button" data-open-club="'+esc(club.community_id)+'">View club</button></div></article>';
    }).join("");
    host.querySelectorAll("[data-open-club]").forEach(button=>button.addEventListener("click",()=>openClub(button.dataset.openClub)));
  }

  async function loadUpcomingSessions(){
    const host=$("upcomingSessions");
    const now=new Date().toISOString();
    const {data,error}=await client.from("book_club_sessions")
      .select("id,community_id,title,chapter_label,details,starts_at,ends_at,book_clubs!inner(communities!inner(name))")
      .eq("status","scheduled").gte("starts_at",now).order("starts_at",{ascending:true}).limit(12);
    if(error){
      console.warn("Upcoming book club sessions unavailable",error);
      host.innerHTML='<p class="clubs-empty">Upcoming sessions are temporarily unavailable.</p>';return;
    }
    if(!data?.length){
      host.innerHTML='<p class="clubs-empty">No upcoming sessions are scheduled yet. Once a club organiser schedules a reading session, it will appear here.</p>';return;
    }
    host.innerHTML=data.map(row=>{
      const club=Array.isArray(row.book_clubs?.communities)?row.book_clubs.communities[0]:row.book_clubs?.communities;
      return '<article class="session-card"><span class="club-tag">Reading session</span><h4>'+esc(row.title)+'</h4><small>'+esc(club?.name||"Book club")+' · '+esc(dateText(row.starts_at))+'</small>'+
        (row.chapter_label?'<p><strong>Reading:</strong> '+esc(row.chapter_label)+'</p>':'')+(row.details?'<p>'+esc(row.details)+'</p>':'')+'</article>';
    }).join("");
  }

  async function openClub(id){
    const club=state.clubs.find(row=>row.community_id===id);
    if(!club)return;
    state.selected=club;
    const c=communityOf(club), member=membershipFor(id), manager=managerFor(club);
    $("clubDetail").hidden=false;
    $("detailClubName").textContent=c.name;
    $("detailClubDescription").textContent=c.description;
    $("detailClubMeta").innerHTML='<span>'+esc(club.book_title)+' · '+esc(club.book_author)+'</span><span>'+esc(club.genre)+'</span><span>'+esc(c.visibility==="private"?"Private":"Public")+'</span>';
    const join=$("joinClubBtn");
    join.hidden=false;join.disabled=false;
    if(c.status!=="active" && c.created_by===state.user?.id){
      join.hidden=true;status("This club is awaiting owner approval. It will become visible to other readers once approved.",false,"clubDetailStatus");
    }else if(member?.status==="active"){
      join.hidden=true;status("You are a member of this reading circle.",false,"clubDetailStatus");
    }else if(member?.status==="pending"){
      join.disabled=true;join.textContent="Request pending";status("Your request to join this private club is awaiting approval.",false,"clubDetailStatus");
    }else{
      join.textContent=c.visibility==="private"?"Request to join":"Join book club";
      status(c.visibility==="private"?"Membership requires organiser approval.":"Join this club to take part in chapter discussions and polls.",false,"clubDetailStatus");
    }
    const canParticipate=activeMember(id);
    $("createDiscussionForm").hidden=!canParticipate;
    $("createSessionForm").hidden=!(manager&&c.status==="active");
    $("createPollForm").hidden=!(manager&&c.status==="active");
    await Promise.all([loadClubSessions(id),loadDiscussions(id),loadPolls(id)]);
    $("clubDetail").scrollIntoView({behavior:"smooth",block:"start"});
  }

  async function joinSelectedClub(){
    const club=state.selected;if(!club)return;
    if(!state.user){status("Please sign in from your reader account before joining.",true,"clubDetailStatus");return;}
    const c=communityOf(club);
    const privateClub=c.visibility==="private";
    const {error}=await client.from("community_members").insert({
      community_id:club.community_id,user_id:state.user.id,role:"member",status:privateClub?"pending":"active"
    });
    if(error){
      if(error.code==="23505"){status("A membership or access request already exists for this club.",false,"clubDetailStatus");}
      else status("Could not join this club: "+error.message,true,"clubDetailStatus");
      return;
    }
    await loadMemberships();
    renderAccount();
    if(privateClub){status("Your request has been sent. The club organiser must approve it.",false,"clubDetailStatus");}
    else{status("You have joined the reading circle. You can now join discussions and vote in polls.",false,"clubDetailStatus");}
    await openClub(club.community_id);
    await loadUpcomingSessions();
  }

  async function loadClubSessions(id){
    const host=$("clubSessions");
    const {data,error}=await client.from("book_club_sessions").select("id,title,chapter_label,details,starts_at,ends_at,status")
      .eq("community_id",id).eq("status","scheduled").order("starts_at",{ascending:true}).limit(20);
    if(error){host.innerHTML='<p class="clubs-empty">Sessions could not be loaded.</p>';return;}
    if(!data?.length){host.innerHTML='<p class="clubs-empty">No sessions scheduled yet.</p>';return;}
    host.innerHTML=data.map(row=>'<article class="session-card"><h4>'+esc(row.title)+'</h4><small>'+esc(dateText(row.starts_at))+(row.ends_at?' – '+esc(dateText(row.ends_at)):'')+'</small>'+
      (row.chapter_label?'<p><strong>Reading:</strong> '+esc(row.chapter_label)+'</p>':'')+(row.details?'<p>'+esc(row.details)+'</p>':'')+'</article>').join("");
  }

  async function loadDiscussions(id){
    const host=$("clubDiscussions");
    const {data,error}=await client.from("community_posts")
      .select("id,title,body,author_id,created_at").eq("community_id",id).eq("status","published")
      .order("is_pinned",{ascending:false}).order("created_at",{ascending:false}).limit(30);
    if(error){host.innerHTML='<p class="clubs-empty">Chapter discussions could not be loaded.</p>';return;}
    if(!data?.length){host.innerHTML='<p class="clubs-empty">No chapter discussions yet. Members can start the first conversation.</p>';return;}
    const ids=data.map(row=>row.id);
    const replyResult=await client.from("community_replies").select("id,post_id,body,created_at")
      .in("post_id",ids).eq("status","published").order("created_at",{ascending:true});
    const replies=replyResult.error?[]:(replyResult.data||[]);
    host.innerHTML=data.map(post=>{
      const children=replies.filter(reply=>reply.post_id===post.id);
      return '<article class="discussion-card"><small>'+esc(dateText(post.created_at))+'</small><h4>'+esc(post.title)+'</h4><p>'+esc(post.body)+'</p>'+
        '<div class="discussion-replies">'+(children.length?children.map(reply=>'<div class="discussion-reply">'+esc(reply.body)+'</div>').join(""):'<small>No replies yet.</small>')+'</div>'+
        (activeMember(id)?'<form class="reply-form" data-reply-form="'+esc(post.id)+'"><input name="body" required maxlength="5000" placeholder="Add a thoughtful reply"><button type="submit">Reply</button></form>':'')+'</article>';
    }).join("");
    host.querySelectorAll("[data-reply-form]").forEach(form=>form.addEventListener("submit",event=>replyToDiscussion(event,form)));
  }

  async function replyToDiscussion(event,form){
    event.preventDefault();
    if(!state.user||!state.selected)return;
    const body=form.elements.body.value.trim();if(!body)return;
    const {error}=await client.from("community_replies").insert({
      post_id:form.dataset.replyForm,author_id:state.user.id,body
    });
    if(error){status("Your reply could not be posted: "+error.message,true,"clubDetailStatus");return;}
    form.reset();await loadDiscussions(state.selected.community_id);
  }

  async function loadPolls(id){
    const host=$("clubPolls");
    const {data,error}=await client.from("book_club_polls").select("id,question,opens_at,closes_at,status,created_at")
      .eq("community_id",id).order("created_at",{ascending:false}).limit(20);
    if(error){host.innerHTML='<p class="clubs-empty">Club polls could not be loaded.</p>';return;}
    if(!data?.length){host.innerHTML='<p class="clubs-empty">No polls yet. Club organisers can publish a poll for members.</p>';return;}
    const pollIds=data.map(row=>row.id);
    const [optionsResult,votesResult]=await Promise.all([
      client.from("book_club_poll_options").select("id,poll_id,option_text,position,vote_count")
        .in("poll_id",pollIds).order("position",{ascending:true}),
      state.user
        ? client.from("book_club_poll_votes").select("poll_id").eq("user_id",state.user.id).in("poll_id",pollIds)
        : Promise.resolve({data:[],error:null})
    ]);
    const options=optionsResult.error?[]:(optionsResult.data||[]);
    const votedPolls=new Set((votesResult.data||[]).map(row=>row.poll_id));
    host.innerHTML=data.map(poll=>{
      const pollOptions=options.filter(option=>option.poll_id===poll.id);
      const hasVoted=votedPolls.has(poll.id);
      const closed=poll.status!=="open"||(poll.closes_at&&new Date(poll.closes_at)<=new Date())||new Date(poll.opens_at)>new Date();
      const canVote=activeMember(id)&&!hasVoted&&!closed;
      const total=pollOptions.reduce((sum,option)=>sum+Number(option.vote_count||0),0);
      const voteForm=canVote?'<form class="poll-vote-form" data-vote-poll="'+esc(poll.id)+'">'+pollOptions.map(option=>'<label class="poll-option"><input type="radio" name="option_id" value="'+esc(option.id)+'" required> '+esc(option.option_text)+'</label>').join("")+'<button class="clubs-button clubs-button-gold" type="submit">Cast vote</button></form>':'';
      const resultMarkup=pollOptions.map(option=>{
        const count=Number(option.vote_count||0),pct=total?Math.round(count/total*100):0;
        return '<div class="poll-result"><span>'+esc(option.option_text)+'</span><span>'+count+' · '+pct+'%</span><div class="poll-bar"><span style="width:'+pct+'%"></span></div></div>';
      }).join("");
      return '<article class="poll-card"><span class="club-tag">'+(closed?'Closed poll':'Club poll')+'</span><h4>'+esc(poll.question)+'</h4>'+
        (poll.closes_at?'<small>Closes '+esc(dateText(poll.closes_at))+'</small>':'')+voteForm+
        (hasVoted?'<p class="clubs-muted">Your vote has been recorded.</p>':'')+
        '<div class="poll-results">'+resultMarkup+'</div></article>';
    }).join("");
    host.querySelectorAll("[data-vote-poll]").forEach(form=>form.addEventListener("submit",event=>castPollVote(event,form)));
  }

  async function castPollVote(event,form){
    event.preventDefault();
    if(!state.user||!state.selected)return;
    const optionId=new FormData(form).get("option_id");
    if(!optionId)return;
    const {error}=await client.from("book_club_poll_votes").insert({
      poll_id:form.dataset.votePoll,option_id:optionId,user_id:state.user.id
    });
    if(error){
      status(error.code==="23505"?"You have already voted in this poll.":"Your vote could not be recorded: "+error.message,true,"clubDetailStatus");
      await loadPolls(state.selected.community_id);return;
    }
    status("Your vote has been counted.",false,"clubDetailStatus");
    await loadPolls(state.selected.community_id);
  }

  async function createClub(event){
    event.preventDefault();
    if(!state.user){status("Sign in before proposing a book club.",true);return;}
    const form=event.currentTarget,values=Object.fromEntries(new FormData(form).entries());
    const slug=values.name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    const button=form.querySelector("button[type=submit]");button.disabled=true;
    const {data,error}=await client.rpc("create_book_club_request",{
      p_name:values.name.trim(),p_slug:slug,p_description:values.description.trim(),p_visibility:values.visibility,
      p_book_title:values.book_title.trim(),p_book_author:values.book_author.trim(),p_genre:values.genre.trim(),
      p_reading_plan:values.reading_plan.trim()
    });
    button.disabled=false;
    if(error){status("The book club could not be submitted: "+error.message,true);return;}
    form.reset();status("Your book club proposal has been submitted for review. It will appear publicly after approval.");
    await loadClubs();
    if(data)await openClub(data);
  }

  async function createSession(event){
    event.preventDefault();
    const club=state.selected;if(!club||!managerFor(club))return;
    const form=event.currentTarget,values=Object.fromEntries(new FormData(form).entries());
    const starts=new Date(values.starts_at),ends=values.ends_at?new Date(values.ends_at):null;
    if(Number.isNaN(starts.getTime())||(ends&&ends<=starts)){status("Please choose a valid end time after the start time.",true,"clubDetailStatus");return;}
    const {error}=await client.from("book_club_sessions").insert({
      community_id:club.community_id,title:values.title.trim(),chapter_label:values.chapter_label.trim(),
      details:values.details.trim(),starts_at:starts.toISOString(),ends_at:ends?ends.toISOString():null,created_by:state.user.id
    });
    if(error){status("The session could not be scheduled: "+error.message,true,"clubDetailStatus");return;}
    form.reset();status("Reading session scheduled.",false,"clubDetailStatus");
    await loadClubSessions(club.community_id);await loadUpcomingSessions();
  }

  async function createDiscussion(event){
    event.preventDefault();
    const club=state.selected;if(!club||!activeMember(club.community_id)||!state.user)return;
    const form=event.currentTarget,values=Object.fromEntries(new FormData(form).entries());
    const {error}=await client.from("community_posts").insert({
      community_id:club.community_id,author_id:state.user.id,title:values.title.trim(),body:values.body.trim()
    });
    if(error){status("The discussion could not be posted: "+error.message,true,"clubDetailStatus");return;}
    form.reset();status("Your chapter discussion has been published.",false,"clubDetailStatus");
    await loadDiscussions(club.community_id);
  }

  async function createPoll(event){
    event.preventDefault();
    const club=state.selected;if(!club||!managerFor(club)||!state.user)return;
    const form=event.currentTarget,values=Object.fromEntries(new FormData(form).entries());
    const options=[...new Set(values.options.split(/\r?\n/).map(value=>value.trim()).filter(Boolean))];
    if(options.length<2||options.length>6){status("A poll needs between two and six distinct options.",true,"clubDetailStatus");return;}
    const closes=values.closes_at?new Date(values.closes_at):null;
    if(closes&&closes<=new Date()){status("Choose a future poll closing time.",true,"clubDetailStatus");return;}
    const {data,error}=await client.from("book_club_polls").insert({
      community_id:club.community_id,question:values.question.trim(),closes_at:closes?closes.toISOString():null,created_by:state.user.id
    }).select("id").single();
    if(error){status("The poll could not be created: "+error.message,true,"clubDetailStatus");return;}
    const optionRows=options.map((option,position)=>({poll_id:data.id,option_text:option,position}));
    const optionResult=await client.from("book_club_poll_options").insert(optionRows);
    if(optionResult.error){
      await client.from("book_club_polls").delete().eq("id",data.id);
      status("Poll options could not be saved: "+optionResult.error.message,true,"clubDetailStatus");return;
    }
    form.reset();status("Your club poll is now open.",false,"clubDetailStatus");await loadPolls(club.community_id);
  }

  async function init(){
    $("year").textContent=new Date().getFullYear();
    $("menuToggle")?.addEventListener("click",()=>{
      const nav=$("mainNav"),open=nav.classList.toggle("open");
      $("menuToggle").setAttribute("aria-expanded",String(open));$("menuToggle").textContent=open?"×":"☰";
    });
    if(!client){status("Book club services are temporarily unavailable.",true);return;}
    const {data:{session}}=await client.auth.getSession();
    state.user=session?.user||null;
    await loadPermissions();await loadMemberships();renderAccount();
    $("createClubForm").addEventListener("submit",createClub);
    $("joinClubBtn").addEventListener("click",joinSelectedClub);
    $("closeClubBtn").addEventListener("click",()=>{$("clubDetail").hidden=true;state.selected=null;});
    $("createSessionForm").addEventListener("submit",createSession);
    $("createDiscussionForm").addEventListener("submit",createDiscussion);
    $("createPollForm").addEventListener("submit",createPoll);
    await Promise.all([loadClubs(),loadUpcomingSessions()]);
    client.auth.onAuthStateChange((_event,session)=>{
      state.user=session?.user||null;
      Promise.resolve().then(async()=>{
        await loadPermissions();await loadMemberships();renderAccount();await loadClubs();await loadUpcomingSessions();
        if(state.selected)await openClub(state.selected.community_id);
      }).catch(error=>{console.error("Book club account refresh failed",error);});
    });
  }

  init().catch(error=>{console.error("Book Clubs failed to initialise",error);status("Book Clubs could not start. Please refresh the page.",true);});
})();