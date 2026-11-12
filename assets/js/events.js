(()=>{"use strict";
const $=id=>document.getElementById(id);
const db=window.supabase?.createClient("https://qnnmbngxunmjerpeoxrr.supabase.co","sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const slug=v=>String(v).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,170);
let user=null,staff=false,events=[],rsvps=new Map();
const say=(id,msg,bad=false)=>{const el=$(id);if(el){el.textContent=msg;el.dataset.state=bad?"error":"ok";}};
const fmt=(value,tz)=>{try{return new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short",timeZone:tz||"Africa/Lagos"}).format(new Date(value));}catch(_){return new Date(value).toLocaleString();}};
const label=t=>({reading_circle:"Reading circle",author_session:"Author session",book_club:"Book club",workshop:"Workshop",launch:"Book launch",discussion:"Open discussion"}[t]||"Reader event");
const calendarLinks=ev=>{
 const start=new Date(ev.starts_at),end=ev.ends_at?new Date(ev.ends_at):new Date(start.getTime()+60*60*1000);
 const stamp=d=>d.toISOString().split(".")[0].replace(/[-:]/g,"")+"Z";
 const title=encodeURIComponent(ev.title),details=encodeURIComponent((ev.description||"")+"\nVoiceoftaade reader event"),place=encodeURIComponent(ev.location_label||(ev.format==="online"?"Online event":""));
 const google="https://calendar.google.com/calendar/render?action=TEMPLATE&text="+title+"&dates="+stamp(start)+"/"+stamp(end)+"&details="+details+"&location="+place;
 const ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Voiceoftaade//Reader Events//EN","CALSCALE:GREGORIAN","BEGIN:VEVENT","UID:"+ev.id+"@voiceoftaade","DTSTAMP:"+stamp(new Date()),"DTSTART:"+stamp(start),"DTEND:"+stamp(end),"SUMMARY:"+String(ev.title||"Voiceoftaade event").replace(/[\r\n,;]/g," "),"DESCRIPTION:"+String(ev.description||"Voiceoftaade reader event").replace(/[\r\n]/g," "),"LOCATION:"+String(ev.location_label||"Online").replace(/[\r\n,;]/g," "),"END:VEVENT","END:VCALENDAR"].join("\r\n");
 return '<div class="event-calendar-actions"><a href="'+google+'" target="_blank" rel="noopener noreferrer">Add to Google Calendar</a><a href="data:text/calendar;charset=utf-8,'+encodeURIComponent(ics)+'" download="'+slug(ev.title)+'.ics">Other calendars</a></div>';
};
function render(){
 const host=$("eventsList");if(!host)return;
 if(!events.length){host.innerHTML='<div class="events-empty"><span class="empty-icon">✳</span><h3>The next chapter is being planned.</h3><p>There are no published events on the calendar yet. Check back for reading circles, author sessions, workshops and book-club gatherings.</p><a href="community.html">Join the reader community →</a></div>';return;}
 host.innerHTML=events.map(ev=>{
  const past=new Date(ev.starts_at)<new Date(),mine=rsvps.get(ev.id)?.status==="going";
  const date=new Date(ev.starts_at);let day="";try{day=new Intl.DateTimeFormat(undefined,{day:"2-digit",month:"short"}).format(date);}catch(_){}
  const where=ev.format==="in_person"?(ev.location_label||"Venue to be announced"):"Online · access details shared with confirmed readers";
  const state=ev.status==="draft"?"Draft":ev.status==="cancelled"?"Cancelled":ev.status==="completed"?"Completed":past?"Started":"Upcoming";
  const action=!user?'<a class="event-rsvp-button" href="account.html">Sign in to RSVP</a>':past||ev.status!=="published"?"":'<button class="event-rsvp-button '+(mine?"is-going":"")+'" data-rsvp="'+ev.id+'">'+(mine?"✓ You’re going · Cancel":"Reserve my place")+'</button>';
  const calendar=(!past&&ev.status==="published")?calendarLinks(ev):"";
  return '<article class="event-card"><div class="event-date"><strong>'+esc(day)+'</strong><span>'+esc(new Intl.DateTimeFormat(undefined,{weekday:"short",timeZone:ev.timezone||"Africa/Lagos"}).format(date))+'</span></div><div class="event-card-main"><div class="event-card-meta"><span>'+esc(label(ev.event_type))+'</span><span class="event-state '+(state==="Upcoming"?"is-upcoming":"")+'">'+esc(state)+'</span></div><h3>'+esc(ev.title)+'</h3><p>'+esc(ev.description)+'</p><div class="event-details"><span>◷ '+esc(fmt(ev.starts_at,ev.timezone))+'</span><span>⌖ '+esc(where)+'</span></div><div class="event-card-actions">'+action+calendar+'</div></div></article>';
 }).join("");
 host.querySelectorAll("[data-rsvp]").forEach(btn=>btn.addEventListener("click",()=>rsvp(btn.dataset.rsvp,btn)));
}
async function rsvp(id,button){
 if(!user){location.href="account.html";return;}
 button.disabled=true;
 try{
  const existing=rsvps.get(id);
  let result;
  if(existing){result=await db.from("reading_event_rsvps").update({status:existing.status==="going"?"cancelled":"going"}).eq("id",existing.id).select("id,event_id,status").single();}
  else{result=await db.from("reading_event_rsvps").insert({event_id:id,user_id:user.id,status:"going"}).select("id,event_id,status").single();}
  if(result.error)throw result.error;
  rsvps.set(id,result.data);say("eventsStatus",result.data.status==="going"?"Your place is reserved.":"Your RSVP has been cancelled.");render();
 }catch(e){say("eventsStatus",e.message||"Your RSVP could not be saved.",true);button.disabled=false;}
}
async function load(){
 $("year").textContent=new Date().getFullYear();
 if(!db){$("eventsList").innerHTML='<div class="events-empty"><h3>Calendar unavailable</h3><p>Event services could not start. Please refresh later.</p></div>';return;}
 const auth=await db.auth.getUser();user=auth.data?.user||null;
 if(user){
  const [role,rs]=await Promise.all([
   db.rpc("is_community_platform_staff"),
   db.from("reading_event_rsvps").select("id,event_id,status").eq("user_id",user.id)
  ]);
  staff=role.data===true;
  (rs.data||[]).forEach(x=>rsvps.set(x.event_id,x));
 }
 const result=await db.from("reading_events").select("id,title,slug,description,event_type,starts_at,ends_at,timezone,format,location_label,status").order("starts_at",{ascending:true}).limit(60);
 if(result.error)throw result.error;
 events=result.data||[];
 if(staff)$("eventAdminPanel").hidden=false;
 render();
}
$("eventCreateForm")?.addEventListener("submit",async e=>{
 e.preventDefault();if(!staff||!user)return;
 const form=e.currentTarget,data=new FormData(form),title=String(data.get("title")||"").trim(),format=String(data.get("format"));
 const start=new Date(String(data.get("starts_at")||""));const end=data.get("ends_at")?new Date(String(data.get("ends_at"))):null;
 if(Number.isNaN(start.getTime())||start<=new Date()){say("eventAdminStatus","Choose a future start time.",true);return;}
 if(end&&end<=start){say("eventAdminStatus","The end time must be after the start time.",true);return;}
 if(format==="in_person"&&!String(data.get("location_label")||"").trim()){say("eventAdminStatus","Add the venue for an in-person event.",true);return;}
 const payload={title,slug:slug(title),description:String(data.get("description")||"").trim(),event_type:String(data.get("event_type")),starts_at:start.toISOString(),ends_at:end?end.toISOString():null,timezone:String(data.get("timezone")||"Africa/Lagos").trim(),format,location_label:String(data.get("location_label")||"").trim()||null,status:data.get("publish")?"published":"draft",created_by:user.id};
 const button=form.querySelector('button[type="submit"]');button.disabled=true;say("eventAdminStatus","Saving event…");
 try{const r=await db.from("reading_events").insert(payload).select("id").single();if(r.error)throw r.error;form.reset();form.querySelector('[name="timezone"]').value="Africa/Lagos";say("eventAdminStatus","Event saved.");await load();}
 catch(err){say("eventAdminStatus",err.message||"Could not save the event.",true);}
 finally{button.disabled=false;}
});
load().catch(e=>{console.error(e);say("eventsStatus",e.message||"Could not load events.",true);$("eventsList").innerHTML='<div class="events-empty"><h3>We couldn’t load the calendar.</h3><p>Please refresh the page in a moment.</p></div>';});
})();