(() => {
 "use strict";
 const host=document.getElementById("homeEventPreview");
 if(!host||!window.supabase?.createClient)return;
 const db=window.supabase.createClient("https://qnnmbngxunmjerpeoxrr.supabase.co","sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67");
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const types={reading_circle:"Reading circle",author_session:"Author session",book_club:"Book club",workshop:"Workshop",launch:"Book launch",discussion:"Open discussion"};
 const fmt=(date,tz)=>new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:tz||"Africa/Lagos"}).format(new Date(date));
 async function load(){
  const {data,error}=await db.from("reading_events").select("id,title,description,event_type,starts_at,timezone,status").eq("status","published").gte("starts_at",new Date().toISOString()).order("starts_at",{ascending:true}).limit(3);
  if(error){host.innerHTML='<p class="home-event-feature-empty">The events preview is temporarily unavailable. Visit the full events calendar for updates.</p>';return;}
  if(!data?.length){host.innerHTML='<p class="home-event-feature-empty">No upcoming events have been published yet. The calendar will show a reading circle, author session or workshop as soon as the Voiceoftaade team schedules one.</p>';return;}
  host.innerHTML=data.map(event=>'<article class="home-event-feature-card"><span class="event-meta">'+esc(types[event.event_type]||"Reader event")+' · '+esc(fmt(event.starts_at,event.timezone))+'</span><h3>'+esc(event.title)+'</h3><p>'+esc(event.description||"A Voiceoftaade reader gathering.")+'</p><a href="events.html">View details & RSVP ↗</a></article>').join("");
 }
 load().catch(()=>{host.innerHTML='<p class="home-event-feature-empty">Upcoming events could not be loaded. Please visit the full calendar.</p>';});
})();