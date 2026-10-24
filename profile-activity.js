(() => {
  const el = id => document.getElementById(id);
  const host = el("readerActivityFeed");
  if (!host || !window.supabase) return;
  const db = window.supabase.createClient("https://qnnmbngxunmjerpeoxrr.supabase.co", "sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLn0P0F67");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;',"'":"&#39;"}[ch]));
  const date = value => value ? new Date(value).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}) : "";
  async function render(){
    host.innerHTML = '<p class="saved-empty">Loading your community activity…</p>';
    const {data:{session},error:sessionError}=await db.auth.getSession();
    if(sessionError || !session?.user){
      host.innerHTML='<p class="saved-empty">Sign in to see the posts and replies connected to your reader profile.</p>';
      return;
    }
    const uid=session.user.id;
    const [postsRes,repliesRes]=await Promise.all([
      db.from("community_posts").select("id,title,body,created_at,community_id,communities(name,visibility,status)").eq("author_id",uid).eq("status","published").order("created_at",{ascending:false}).limit(30),
      db.from("community_replies").select("id,post_id,body,created_at,community_posts(title,community_id,communities(name,visibility,status))").eq("author_id",uid).eq("status","published").order("created_at",{ascending:false}).limit(30)
    ]);
    if(postsRes.error && repliesRes.error){
      host.innerHTML='<p class="saved-empty">Community activity could not load right now. Please try again later.</p>';
      console.warn("Reader activity unavailable",postsRes.error,repliesRes.error);return;
    }
    const entries=[];
    (postsRes.data||[]).forEach(p=>{
      const community=Array.isArray(p.communities)?p.communities[0]:p.communities;
      if(community?.visibility==="private")return;
      entries.push({kind:"Post",title:p.title,body:p.body,date:p.created_at,community:community?.name||"Voiceoftaade community",url:"community.html"});
    });
    (repliesRes.data||[]).forEach(r=>{
      const post=Array.isArray(r.community_posts)?r.community_posts[0]:r.community_posts;
      const community=Array.isArray(post?.communities)?post.communities[0]:post?.communities;
      if(community?.visibility==="private")return;
      entries.push({kind:"Reply",title:post?.title||"Community conversation",body:r.body,date:r.created_at,community:community?.name||"Voiceoftaade community",url:"community.html"});
    });
    entries.sort((a,b)=>new Date(b.date)-new Date(a.date));
    if(!entries.length){host.innerHTML='<p class="saved-empty">Your published community posts and replies will appear here.</p>';return;}
    host.innerHTML=entries.slice(0,40).map(item=>'<article class="saved-card" style="margin:12px 0;padding:16px;border:1px solid #dce4ec;border-radius:12px;background:#fff"><p class="eyebrow">'+esc(item.kind)+' · '+esc(item.community)+'</p><strong>'+esc(item.title)+'</strong><p style="white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.7">'+esc(item.body)+'</p><small>'+date(item.date)+'</small></article>').join("");
  }
  db.auth.onAuthStateChange(()=>{render().catch(console.error);});
  render().catch(error=>{console.error("Reader activity failed",error);host.innerHTML='<p class="saved-empty">Could not load activity. Refresh the page to try again.</p>';});
})();