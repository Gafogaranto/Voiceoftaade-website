(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const client = window.supabase?.createClient(
    "https://qnnmbngxunmjerpeoxrr.supabase.co",
    "sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67"
  );
  const state = { user:null, clubs:[], selected:null, memberships:new Map(), staff:false };
  let wizardStep=1;
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
    $("createClubPanel").hidden=true;
    $("openCreateClub").hidden=!state.user;
    $("clubRequests").hidden=!state.user;
    $("platformApprovals").hidden=!state.staff;
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
        '<h3>'+esc(c.name)+'</h3><p class="club-book">'+esc(club.book_title||"Open reading circle")+(club.book_author?' · '+esc(club.book_author):"")+'</p><p>'+esc(c.description)+'</p>'+
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
    $("detailClubMeta").innerHTML='<span>'+esc(club.book_title||"Open reading circle")+(club.book_author?' · '+esc(club.book_author):"")+'</span><span>'+esc(club.genre)+'</span><span>'+esc(c.visibility==="private"?"Private":"Public")+'</span>';
    const join=$("joinClubBtn"),applicationForm=$("clubApplicationForm");
    join.hidden=false;join.disabled=false;applicationForm.hidden=true;$("clubApplications").hidden=true;
    let ownApplication=null;
    if(state.user){const ar=await client.from("book_club_applications").select("id,status").eq("community_id",id).eq("applicant_id",state.user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();ownApplication=ar.data||null;}
    if(c.status!=="active" && c.created_by===state.user?.id){
      join.hidden=true;status("This club is awaiting owner approval. It will appear publicly after review.",false,"clubDetailStatus");
    }else if(member?.status==="active"){
      join.hidden=true;status("You are a member of this reading circle.",false,"clubDetailStatus");
    }else if(ownApplication?.status==="pending"){
      join.disabled=true;join.textContent="Application pending";status("Your membership application is awaiting the organiser's review.",false,"clubDetailStatus");
    }else{
      join.textContent="Apply to join";
      status("Readers complete a short application before joining this club.",false,"clubDetailStatus");
    }
    const canParticipate=activeMember(id);
    $("createDiscussionForm").hidden=!canParticipate;
    $("createSessionForm").hidden=!(manager&&c.status==="active");
    $("createPollForm").hidden=!(manager&&c.status==="active");
    await Promise.all([loadClubSessions(id),loadDiscussions(id),loadPolls(id),loadClubApplications(id)]);
    $("clubDetail").scrollIntoView({behavior:"smooth",block:"start"});
  }

  async function joinSelectedClub(){
    if(!state.selected)return;
    if(!state.user){status("Please sign in before applying to join.",true,"clubDetailStatus");return;}
    $("clubApplicationForm").hidden=false;
    $("clubApplicationForm").scrollIntoView({behavior:"smooth",block:"center"});
  }
  async function submitClubApplication(event){
    event.preventDefault();const club=state.selected;if(!club||!state.user)return;
    const form=event.currentTarget,values=Object.fromEntries(new FormData(form).entries());
    const answers={author_familiarity:values.author_familiarity.trim(),purpose:values.purpose.trim(),contribution:values.contribution.trim(),agreed_to_rules:values.agree_rules==="on"};
    const button=form.querySelector('button[type="submit"]');button.disabled=true;
    const {error}=await client.from("book_club_applications").insert({community_id:club.community_id,applicant_id:state.user.id,answers});
    button.disabled=false;
    if(error){status(error.code==="23505"?"You already have a pending application for this club.":"Your application could not be sent: "+error.message,true,"clubDetailStatus");return;}
    form.reset();form.hidden=true;status("Your application has been sent to the club organiser for review.",false,"clubDetailStatus");await openClub(club.community_id);await loadManagedRequests();
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


  function showWizardStep(){
    document.querySelectorAll("[data-club-step]").forEach(node=>node.hidden=Number(node.dataset.clubStep)!==wizardStep);
    [...$("clubWizardProgress").children].forEach((node,index)=>node.classList.toggle("active",index+1===wizardStep));
    $("clubWizardBack").hidden=wizardStep===1;$("clubWizardNext").hidden=wizardStep===3;$("clubWizardSubmit").hidden=wizardStep!==3;
  }
  function openWizard(){wizardStep=1;showWizardStep();$("createClubPanel").hidden=false;document.body.classList.add("club-wizard-open");}
  function closeWizard(){$("createClubPanel").hidden=true;document.body.classList.remove("club-wizard-open");}
  function updateBookRequirements(){const single=$("clubType").value==="single-book";$("createClubForm").elements.book_title.required=single;$("createClubForm").elements.book_author.required=single;}
  function stepIsValid(){const section=document.querySelector('[data-club-step="'+wizardStep+'"]');for(const field of section.querySelectorAll("input,textarea,select")){if(!field.checkValidity()){field.reportValidity();return false;}}return true;}
  async function loadPendingCommunityApprovals(){
    const section=$("platformApprovals"),host=$("pendingCommunityApprovals");
    if(!state.user||!state.staff){section.hidden=true;return;}
    section.hidden=false;host.innerHTML='<p class="clubs-loading">Checking proposed spaces…</p>';
    const {data,error}=await client.from("communities")
      .select("id,name,description,visibility,status,created_by,created_at,book_clubs(book_title,book_author,genre,club_type,reading_plan)")
      .eq("status","pending").order("created_at",{ascending:true}).limit(100);
    if(error){host.innerHTML='<p class="clubs-empty">Proposals could not be loaded: '+esc(error.message)+'</p>';return;}
    if(!data?.length){host.innerHTML='<div class="clubs-empty"><strong>No proposals are awaiting review.</strong><br>New book clubs and community spaces submitted for approval will appear here.</div>';return;}
    host.innerHTML=data.map(row=>{
      const book=Array.isArray(row.book_clubs)?row.book_clubs[0]:row.book_clubs;
      const kind=book?'Book club proposal':'Community space proposal';
      return '<article class="club-request-card owner-approval-card"><div class="owner-approval-card-head"><span class="club-tag pending">Awaiting approval</span><span class="club-tag">'+(book?'Book club':'Community space')+'</span></div><h3>'+esc(row.name)+'</h3><p>'+esc(row.description||'No description provided.')+'</p>'+
        (book?'<p><strong>Reading focus:</strong> '+esc(book.club_type==='open-reading'?'Open reading circle':(book.book_title||'Book not specified')+(book.book_author?' · '+book.book_author:''))+'</p><p><strong>Genre:</strong> '+esc(book.genre||'Not specified')+'</p>'+(book.reading_plan?'<p><strong>Reading plan:</strong> '+esc(book.reading_plan)+'</p>':''):'')+
        '<p><strong>Visibility requested:</strong> '+esc(row.visibility)+'</p><p class="clubs-muted">Submitted '+esc(dateText(row.created_at))+'</p><div class="club-request-actions"><button type="button" class="clubs-button clubs-button-gold" data-review-community="'+esc(row.id)+'" data-decision="approved">Approve and publish</button><button type="button" class="clubs-button clubs-button-quiet" data-review-community="'+esc(row.id)+'" data-decision="rejected">Decline proposal</button></div></article>';
    }).join("");
  }

  async function reviewCommunityProposal(id,decision){
    const {error}=await client.rpc("review_community_creation",{p_community_id:id,p_decision:decision});
    if(error){status("The proposal could not be reviewed: "+error.message,true);return;}
    status(decision==="approved"?"Proposal approved. The space is now active and discoverable.":"Proposal declined. It will not appear to readers.");
    await Promise.all([loadPendingCommunityApprovals(),loadClubs()]);
  }

  async function loadManagedRequests(){
    const section=$("clubRequests"),host=$("managedClubRequests");if(!state.user){section.hidden=true;return;}
    section.hidden=false;host.innerHTML='<p class="clubs-loading">Checking membership requests…</p>';
    let requestsQuery=client.from("book_club_applications").select("id,community_id,applicant_id,answers,created_at,communities!inner(name,created_by)").eq("status","pending").order("created_at",{ascending:false}).limit(50);if(!state.staff)requestsQuery=requestsQuery.eq("communities.created_by",state.user.id);const {data,error}=await requestsQuery;
    if(error){host.innerHTML='<p class="clubs-empty">Membership requests could not be loaded.</p>';return;}
    if(!data?.length){host.innerHTML='<p class="clubs-empty">No pending membership applications. New requests will appear here.</p>';return;}
    host.innerHTML=data.map(row=>'<article class="club-request-card"><h4>'+esc(row.communities?.name||"Book club")+'</h4><p><strong>Author familiarity:</strong> '+esc(row.answers?.author_familiarity||"Not provided")+'</p><p><strong>Reason for joining:</strong> '+esc(row.answers?.purpose||"Not provided")+'</p><p><strong>Contribution:</strong> '+esc(row.answers?.contribution||"Not provided")+'</p><div class="club-request-actions"><button type="button" class="clubs-button clubs-button-gold" data-review-application="'+row.id+'" data-decision="approved">Approve</button><button type="button" class="clubs-button clubs-button-quiet" data-review-application="'+row.id+'" data-decision="rejected">Decline</button></div></article>').join("");
  }
  async function loadClubApplications(id){
    const section=$("clubApplications"),host=$("clubApplicationList"),club=state.clubs.find(row=>row.community_id===id);
    if(!club||!managerFor(club)){section.hidden=true;return;}
    section.hidden=false;host.innerHTML='<p class="clubs-loading">Loading applications…</p>';
    const {data,error}=await client.from("book_club_applications").select("id,applicant_id,answers,created_at").eq("community_id",id).eq("status","pending").order("created_at",{ascending:false});
    if(error){host.innerHTML='<p class="clubs-empty">Applications could not be loaded.</p>';return;}
    if(!data?.length){host.innerHTML='<p class="clubs-empty">No pending applications for this club.</p>';return;}
    host.innerHTML=data.map(row=>'<article class="club-request-card"><h4>Reader application</h4><p><strong>Author familiarity:</strong> '+esc(row.answers?.author_familiarity||"")+'</p><p><strong>Purpose:</strong> '+esc(row.answers?.purpose||"")+'</p><p><strong>Contribution:</strong> '+esc(row.answers?.contribution||"")+'</p><div class="club-request-actions"><button type="button" class="clubs-button clubs-button-gold" data-review-application="'+row.id+'" data-decision="approved">Approve</button><button type="button" class="clubs-button clubs-button-quiet" data-review-application="'+row.id+'" data-decision="rejected">Decline</button></div></article>').join("");
  }
  async function reviewApplication(id,decision){
    const {error}=await client.rpc("review_book_club_application",{p_application_id:id,p_decision:decision});
    if(error){status("The application could not be reviewed: "+error.message,true);return;}
    status(decision==="approved"?"Reader approved and added to the club.":"Application declined.");
    await loadManagedRequests();await loadMemberships();if(state.selected)await openClub(state.selected.community_id);
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
      p_reading_plan:values.reading_plan.trim(),p_club_type:values.club_type
    });
    button.disabled=false;
    if(error){status("The book club could not be submitted: "+error.message,true);return;}
    form.reset();updateBookRequirements();closeWizard();showWizardStep();status("Your book club proposal has been submitted for review. It will appear publicly after approval.");
    await loadClubs();await loadManagedRequests();
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
    $("openCreateClub").addEventListener("click",openWizard);
    $("closeCreateClub").addEventListener("click",closeWizard);
    $("createClubPanel").addEventListener("click",e=>{if(e.target===$("createClubPanel"))closeWizard();});
    $("clubWizardNext").addEventListener("click",()=>{if(stepIsValid()&&wizardStep<3){wizardStep++;showWizardStep();}});
    $("clubWizardBack").addEventListener("click",()=>{if(wizardStep>1){wizardStep--;showWizardStep();}});
    $("clubType").addEventListener("change",updateBookRequirements);
    updateBookRequirements();showWizardStep();
    $("joinClubBtn").addEventListener("click",joinSelectedClub);
    $("clubApplicationForm").addEventListener("submit",submitClubApplication);
    document.addEventListener("click",e=>{const b=e.target.closest("[data-review-application]");if(b)reviewApplication(b.dataset.reviewApplication,b.dataset.decision);const proposal=e.target.closest("[data-review-community]");if(proposal)reviewCommunityProposal(proposal.dataset.reviewCommunity,proposal.dataset.decision);});
    $("closeClubBtn").addEventListener("click",()=>{$("clubDetail").hidden=true;state.selected=null;});
    $("createSessionForm").addEventListener("submit",createSession);
    $("createDiscussionForm").addEventListener("submit",createDiscussion);
    $("createPollForm").addEventListener("submit",createPoll);
    await Promise.all([loadClubs(),loadUpcomingSessions(),loadManagedRequests(),loadPendingCommunityApprovals()]);
    if(location.hash==="#clubRequests")setTimeout(()=>$("clubRequests").scrollIntoView({behavior:"smooth",block:"start"}),150);
    client.auth.onAuthStateChange((_event,session)=>{
      state.user=session?.user||null;
      Promise.resolve().then(async()=>{
        await loadPermissions();await loadMemberships();renderAccount();await loadClubs();await loadUpcomingSessions();await loadManagedRequests();await loadPendingCommunityApprovals();
        if(state.selected)await openClub(state.selected.community_id);
      }).catch(error=>{console.error("Book club account refresh failed",error);});
    });
  }

  init().catch(error=>{console.error("Book Clubs failed to initialise",error);status("Book Clubs could not start. Please refresh the page.",true);});
})();