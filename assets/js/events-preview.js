(() => {
 "use strict";
 const host=document.getElementById("homeUpcomingEvents");
 if(!host||!window.supabase?.createClient)return;
 const db=window.supabase.createClient("https://qnnmbngxunmjerpeoxrr.supabase.co","sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67");
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const fmt=v=>new Date(v).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
 async function load(){
  const {data,error}=await db.from("book_club_sessions").select("id,title,chapter_label,details,starts_at,book_clubs!inner(communities!inner(name))").eq("status","scheduled").gte("starts_at",new Date().toISOString()).order("starts_at",{ascending:true}).limit(3);
  if(error){host.innerHTML='<p class="home-event-empty">Reading sessions are temporarily unavailable. Visit the events page for the full calendar.</p>';return;}
  if(!data?.length){host.innerHTML='<p class="home-event-empty">No sessions have been scheduled yet. The calendar will update when a book-club organiser publishes the next date.</p>';return;}
  host.innerHTML=data.map(row=>{const club=Array.isArray(row.book_clubs?.communities)?row.book_clubs.communities[0]:row.book_clubs?.communities;return '<article class="home-event-card"><small>'+esc(fmt(row.starts_at))+'</small><h3>'+esc(row.title)+'</h3><p>'+esc(club?.name||"Voiceoftaade Book Club")+(row.chapter_label?" · "+esc(row.chapter_label):"")+'</p><a href="events.html">View event details ↗</a></article>'}).join("");
 }
 load().catch(()=>{host.innerHTML='<p class="home-event-empty">The upcoming reading calendar could not be loaded at this time.</p>';});
})();