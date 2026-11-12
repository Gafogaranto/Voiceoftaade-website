(() => {
"use strict";
const $ = id => document.getElementById(id);
const supabase = window.supabase?.createClient(
 "https://qnnmbngxunmjerpeoxrr.supabase.co",
 "sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67"
);
const PASSPORT_KEY="voiceoftaade-reader-passport-v1";
const parts=[
 {name:"Foundations of a Good Life",chapters:["The Power of Perspective","Stillness Is Strength","Discipline: The Silent Architect","Choose Wisdom Over Noise","Time Is the Real Currency"]},
 {name:"Matters of the Heart",chapters:["Love Without Losing Yourself","What They Do Not Tell You About Marriage","Boundaries Are a Gift","When Loyalty Becomes a Burden","Forgiveness Is Not Approval"]},
 {name:"Mindset and Motivation",chapters:["You Are Not Lazy; You Are Spiritually Disconnected","Fear Is a Liar","You Only Fail When You Stop","Stay Humble, Stay Hungry","Let the Dream Terrify You"]},
 {name:"Social Truth & Modern Struggles",chapters:["Do Not Be Led by Likes","Everyone Is Faking Something","Soft Life, Hard Core","Hustle Is Not a Personality","Protect Your Mental Peace"]},
 {name:"Spiritual & Personal Depth",chapters:["God Does Not Rush Greatness","Delay Is Not Denial","Be the Light, Even in the Dark","Walk Alone If You Must","Prayer Is Power"]}
];
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const dateTime=value=>new Date(value).toLocaleString(undefined,{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
const getDone=()=>{try{const value=JSON.parse(localStorage.getItem(PASSPORT_KEY)||"[]");return new Set(Array.isArray(value)?value.filter(x=>typeof x==="string"):[])}catch(_){return new Set()}};
let done=getDone();
function renderPassport(){
 const host=$("passportParts");let total=0,completed=0;
 host.innerHTML=parts.map((part,index)=>{
  const count=part.chapters.filter((_,i)=>done.has(index+"-"+i)).length;
  total+=part.chapters.length;completed+=count;
  return '<section class="passport-part"><h3>'+esc(part.name)+'</h3><p>'+count+' of '+part.chapters.length+' completed</p><div class="passport-chapters">'+part.chapters.map((chapter,i)=>{const key=index+"-"+i,checked=done.has(key);return '<label class="passport-chapter"><input type="checkbox" data-chapter="'+key+'" '+(checked?"checked":"")+'><span>'+esc(chapter)+'</span></label>'}).join("")+'</div></section>';
 }).join("");
 const percent=Math.round(completed/total*100);
 $("passportCount").textContent=completed+" of "+total+" chapters completed";
 $("passportMeterFill").style.width=percent+"%";
 $("passportMeter").setAttribute("aria-valuenow",String(percent));
 const earned=parts.map((part,index)=>part.chapters.every((_,i)=>done.has(index+"-"+i)));
 $("passportPerks").innerHTML=parts.map((part,index)=>'<div class="passport-perk '+(earned[index]?"is-earned":"")+'"><strong>'+(earned[index]?"✦ Earned":"○ In progress")+'</strong><small>'+esc(part.name)+'</small></div>').join("");
 host.querySelectorAll("[data-chapter]").forEach(input=>input.addEventListener("change",()=>{
  if(input.checked)done.add(input.dataset.chapter);else done.delete(input.dataset.chapter);
  try{localStorage.setItem(PASSPORT_KEY,JSON.stringify([...done]));}catch(_){}
  renderPassport();
 }));
}
function icsEscape(value){return String(value??"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");}
function icsDate(value){return new Date(value).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");}
function downloadCalendar(event){
 const start=icsDate(event.starts_at),end=icsDate(event.ends_at||new Date(new Date(event.starts_at).getTime()+60*60*1000));
 const details=[event.details,event.chapter_label?"Reading: "+event.chapter_label:"",event.club_name?"Book club: "+event.club_name:""].filter(Boolean).join("\n");
 const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Voiceoftaade//Reader Events//EN","CALSCALE:GREGORIAN","BEGIN:VEVENT","UID:"+event.id+"@voiceoftaade","DTSTAMP:"+icsDate(new Date()),"DTSTART:"+start,"DTEND:"+end,"SUMMARY:"+icsEscape(event.title),"DESCRIPTION:"+icsEscape(details),"END:VEVENT","END:VCALENDAR"];
 const blob=new Blob([lines.join("\r\n")],{type:"text/calendar;charset=utf-8"});
 const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="voiceoftaade-"+event.id+".ics";document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
}
async function loadEvents(){
 const host=$("eventsGrid");
 if(!supabase){host.innerHTML='<p class="event-empty">The reading calendar is unavailable at the moment.</p>';return;}
 const now=new Date().toISOString();
 const {data,error}=await supabase.from("book_club_sessions")
  .select("id,community_id,title,chapter_label,details,starts_at,ends_at,book_clubs!inner(book_title,book_author,communities!inner(name))")
  .eq("status","scheduled").gte("starts_at",now).order("starts_at",{ascending:true}).limit(30);
 if(error){console.warn("Reading events could not load:",error);host.innerHTML='<p class="event-empty">We could not load the live reading calendar. Please try again later.</p>';return;}
 $("upcomingCount").textContent=String((data||[]).length);
 if(!data?.length){host.innerHTML='<article class="event-empty"><strong>No reading sessions have been scheduled yet.</strong><br>Book-club organisers can schedule sessions from their club workspace. Once a date is published, it will appear here. <a href="book-clubs.html">Explore the reading circles ↗</a></article>';return;}
 const events=data.map(row=>{const club=Array.isArray(row.book_clubs?.communities)?row.book_clubs.communities[0]:row.book_clubs?.communities;return {...row,club_name:club?.name||"Voiceoftaade Book Club",book_title:row.book_clubs?.book_title||""}});
 host.innerHTML=events.map(e=>'<article class="event-card"><div class="event-date">◷ '+esc(dateTime(e.starts_at))+'</div><h3>'+esc(e.title)+'</h3><small>'+esc(e.club_name)+(e.book_title?" · "+esc(e.book_title):"")+'</small>'+(e.chapter_label?'<p><strong>Reading:</strong> '+esc(e.chapter_label)+'</p>':"")+(e.details?'<p>'+esc(e.details)+'</p>':"")+'<button class="events-button" type="button" data-calendar="'+esc(e.id)+'">Add to calendar ↗</button></article>').join("");
 const byId=new Map(events.map(e=>[e.id,e]));
 host.querySelectorAll("[data-calendar]").forEach(button=>button.addEventListener("click",()=>downloadCalendar(byId.get(button.dataset.calendar))));
}
$("year").textContent=new Date().getFullYear();
renderPassport();
loadEvents().catch(error=>{console.error(error);$("eventsGrid").innerHTML='<p class="event-empty">The reading calendar could not be loaded.</p>';});
})();