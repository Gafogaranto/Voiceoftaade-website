(() => {
"use strict";
const $=id=>document.getElementById(id),db=window.supabase?.createClient("https://qnnmbngxunmjerpeoxrr.supabase.co","sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67");
let user=null,active=null,channel=null,conversations=[],typingTimer=null;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const say=(m,bad=false)=>{$("dmStatus").textContent=m;$("dmStatus").style.color=bad?"#a33":"#9a742f";};
const stamp=v=>new Date(v).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
async function profile(id){const r=await db.rpc("get_public_reader_profile",{target_user_id:id});return Array.isArray(r.data)?r.data[0]:r.data;}
async function init(){
 $("year").textContent=new Date().getFullYear();
 if(!db){say("Messaging is unavailable right now.",true);return;}
 const {data:{session}}=await db.auth.getSession();user=session?.user||null;
 if(!user){$("dmSearchForm").hidden=true;$("dmSearchResults").hidden=true;$("dmComposer").hidden=true;say("Sign in to use private messages.");$("dmIncoming").innerHTML='<p class="dm-empty"><a href="account.html">Sign in to your reader account</a></p>';return;}
 await refresh();
 db.auth.onAuthStateChange((_e,s)=>{user=s?.user||null;if(user)refresh();else location.href="account.html";});
 $("dmComposer").addEventListener("submit",send);
 $("dmSearchForm").addEventListener("submit",searchReaders);
}
async function refresh(){
 const [incoming,outgoing,conv]=await Promise.all([
  db.from("reader_message_requests").select("id,sender_id,initial_message,created_at").eq("recipient_id",user.id).eq("status","pending").order("created_at",{ascending:false}),
  db.from("reader_message_requests").select("id,recipient_id,created_at").eq("sender_id",user.id).eq("status","pending").order("created_at",{ascending:false}),
  db.from("reader_conversations").select("id,user_one,user_two,created_at").or("user_one.eq."+user.id+",user_two.eq."+user.id).order("created_at",{ascending:false})
 ]);
 renderRequests(incoming.data||[],outgoing.data||[]);
 conversations=conv.data||[];
 const rows=await Promise.all(conversations.map(async c=>({c,peer:await profile(c.user_one===user.id?c.user_two:c.user_one)})));
 $("dmConversations").innerHTML=rows.length?rows.map(({c,peer})=>'<button class="dm-item '+(active?.id===c.id?"active":"")+'" data-conversation="'+c.id+'"><strong>'+esc(peer?.display_name||"Voiceoftaade reader")+'</strong><small>Open private conversation</small></button>').join(""):'<p class="dm-empty">No accepted conversations yet.</p>';
 $("dmConversations").querySelectorAll("[data-conversation]").forEach(b=>b.addEventListener("click",()=>openConversation(b.dataset.conversation)));
}
async function renderRequests(incoming,outgoing){
 const incomingRows=await Promise.all(incoming.map(async r=>({r,p:await profile(r.sender_id)})));
 $("dmIncoming").innerHTML=incomingRows.length?incomingRows.map(({r,p})=>'<article class="dm-item"><strong>'+esc(p?.display_name||"A reader")+'</strong><small>'+stamp(r.created_at)+'</small>'+(r.initial_message?'<p>'+esc(r.initial_message)+'</p>':'')+'<div class="dm-actions"><button class="primary" data-accept="'+r.id+'">Accept</button><button data-decline="'+r.id+'">Decline</button></div></article>').join(""):'<p class="dm-empty">No new requests.</p>';
 $("dmIncoming").querySelectorAll("[data-accept]").forEach(b=>b.addEventListener("click",()=>respond(b.dataset.accept,"accepted")));
 $("dmIncoming").querySelectorAll("[data-decline]").forEach(b=>b.addEventListener("click",()=>respond(b.dataset.decline,"declined")));
 const outgoingRows=await Promise.all(outgoing.map(async r=>({r,p:await profile(r.recipient_id)})));
 $("dmOutgoing").innerHTML=outgoingRows.length?outgoingRows.map(({r,p})=>'<div class="dm-item"><strong>'+esc(p?.display_name||"Reader")+'</strong><small>Awaiting acceptance · '+stamp(r.created_at)+'</small></div>').join(""):'<p class="dm-empty">No pending requests sent.</p>';
}
async function searchReaders(event){
 event.preventDefault();
 const term=$("dmSearchInput").value.trim();
 if(term.length<2){$("dmSearchResults").innerHTML='<p class="dm-empty">Enter at least two characters.</p>';return;}
 $("dmSearchResults").innerHTML='<p class="dm-empty">Searching readers…</p>';
 const {data,error}=await db.rpc("search_reader_directory",{search_term:term});
 if(error){$("dmSearchResults").innerHTML='<p class="dm-empty">'+esc(error.message)+'</p>';return;}
 $("dmSearchResults").innerHTML=(data||[]).length?(data||[]).map(p=>'<article class="dm-item"><strong>'+esc(p.display_name||"Voiceoftaade reader")+'</strong><div class="dm-actions"><a href="profile.html?id='+encodeURIComponent(p.id)+'">View profile</a><button class="primary" data-request-reader="'+p.id+'">Request message</button></div></article>').join(""):'<p class="dm-empty">No readers found. Try another name.</p>';
 $("dmSearchResults").querySelectorAll("[data-request-reader]").forEach(b=>b.addEventListener("click",async()=>{const intro=prompt("Add a short introduction (optional).");if(intro===null)return;b.disabled=true;const sent=await db.rpc("request_reader_message",{target_user_id:b.dataset.requestReader,initial_message:intro.trim()||null});b.disabled=false;if(sent.error){say(sent.error.message,true);return;}b.textContent="Request sent";b.disabled=true;say("Message request sent. You can chat after the reader accepts.");await refresh();}));
}
async function respond(id,decision){say(decision==="accepted"?"Accepting request…":"Declining request…");const r=await db.rpc("respond_reader_message_request",{request_id:id,decision});if(r.error){say(r.error.message,true);return;}say(decision==="accepted"?"Request accepted. You can now message each other.":"Request declined.");await refresh();if(decision==="accepted"&&r.data)await openConversation(r.data);}
async function openConversation(id){
 active=conversations.find(c=>c.id===id);if(!active)return;
 document.querySelector(".dm-shell")?.classList.add("has-active-chat");
 const peerId=active.user_one===user.id?active.user_two:active.user_one,peer=await profile(peerId);
 $("dmTitle").textContent=peer?.display_name||"Private conversation";$("dmPeerAvatar")&&( $("dmPeerAvatar").textContent=(peer?.display_name||"V").trim().charAt(0).toUpperCase());$("dmSubtitle").textContent="Only you and this reader can see these messages.";
 $("dmComposer").hidden=false;
 if(channel){await db.removeChannel(channel);channel=null;}
 await loadMessages();
 channel=db.channel("reader-messages-"+id,{config:{presence:{key:user.id}}}).on("postgres_changes",{event:"INSERT",schema:"public",table:"reader_messages",filter:"conversation_id=eq."+id},()=>loadMessages()).on("presence",{event:"sync"},()=>{const online=Object.keys(channel.presenceState()).some(key=>key!==user.id);$("dmSubtitle").textContent=online?"Online now · Private conversation":"Private conversation · Only you and this reader can see these messages.";}).on("broadcast",{event:"typing"},({payload})=>{if(payload?.user_id!==user.id){$("dmSubtitle").textContent="Typing…";clearTimeout(typingTimer);typingTimer=setTimeout(()=>$("dmSubtitle").textContent="Private conversation · Only you and this reader can see these messages.",2200);}}).subscribe(async(status)=>{if(status==="SUBSCRIBED"){await channel.track({user_id:user.id,online_at:new Date().toISOString()});say("Connected · private conversation");}else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")say("Live connection interrupted. Messages will refresh when reopened.",true);});
 document.querySelectorAll("[data-conversation]").forEach(b=>b.classList.toggle("active",b.dataset.conversation===id));
}
async function loadMessages(){
 if(!active)return;
 const {data,error}=await db.from("reader_messages").select("id,sender_id,body,created_at").eq("conversation_id",active.id).order("created_at",{ascending:true}).limit(200);
 if(error){say("Messages could not be loaded: "+error.message,true);return;}
 $("dmMessages").innerHTML=(data||[]).length?(data||[]).map(m=>'<article class="dm-bubble '+(m.sender_id===user.id?"mine":"")+'">'+esc(m.body)+'<small>'+stamp(m.created_at)+(m.sender_id===user.id?" · You":"")+'</small></article>').join(""):'<p class="dm-empty">This conversation is ready. Send the first message.</p>';
 $("dmMessages").scrollTop=$("dmMessages").scrollHeight;
}
async function send(event){
 event.preventDefault();if(!active)return;
 const body=$("dmBody").value.trim();if(!body)return;
 const button=$("dmComposer").querySelector("button");button.disabled=true;
 const {error}=await db.rpc("send_reader_message",{target_conversation_id:active.id,message_body:body});
 button.disabled=false;
 if(error){say(error.message,true);return;}
 $("dmBody").value="";say("Message sent.");await loadMessages();
}
$("dmBackButton")?.addEventListener("click",()=>document.querySelector(".dm-shell")?.classList.remove("has-active-chat"));
$("dmBody")?.addEventListener("input",()=>{if(channel)channel.send({type:"broadcast",event:"typing",payload:{user_id:user.id}});});
window.addEventListener("beforeunload",()=>{if(channel)db.removeChannel(channel);});
init().catch(e=>say(e.message,true));
})();