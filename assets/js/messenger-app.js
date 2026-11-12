(()=>{"use strict";
const URL="https://qnnmbngxunmjerpeoxrr.supabase.co",KEY="sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67",db=window.supabase?.createClient(URL,KEY),$=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const first=v=>Array.isArray(v)?v[0]:v,stamp=v=>v?new Date(v).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"",shortDate=v=>v?new Date(v).toLocaleDateString([],{month:"short",day:"numeric"}):"",fileExt=n=>(String(n||"file").split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,8)||"bin";
let user=null,threads=[],active=null,activeRows=[],activeChannel=null,typingTimer=null,replyTarget=null,filter="all",groupMembers=[],selectedMembers=new Map(),mediaRecorder=null,recordedChunks=[],recording=false,toastTimer=null,profileCache=new Map();
const say=(message,bad=false)=>{const n=$("toast");if(!n)return;n.textContent=message;n.style.background=bad?"#8f3d37":"#173d32";n.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove("show"),2800);};
const avatar=(p,name)=>p?.avatar_url?'<img src="'+esc(p.avatar_url)+'" alt="">':esc((name||p?.display_name||"V").trim().slice(0,1).toUpperCase());
const profile=async id=>{if(profileCache.has(id))return profileCache.get(id);const r=await db.rpc("get_public_reader_profile",{target_user_id:id});const p=first(r.data)||{};profileCache.set(id,p);return p;};
const showModal=id=>$(id).hidden=false,hideModal=id=>$(id).hidden=true;
const threadKey=t=>t.type+":"+t.id;
function switchView(view){document.querySelectorAll(".rail-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));document.querySelectorAll(".sidebar-view").forEach(n=>n.hidden=true);const target=$("sidebar"+view[0].toUpperCase()+view.slice(1));if(target)target.hidden=false;closeChatInfo();if(view!=="chats"&&view!=="groups"){$("messengerApp").classList.remove("mobile-chat-open");}}
async function init(){
 if(!db){say("Messaging is unavailable. Please refresh.",true);return;}
 const {data:{session}}=await db.auth.getSession();user=session?.user||null;
 if(!user){$("loginGate").hidden=false;return;}
 $("myProfileLink").href="profile.html?id="+encodeURIComponent(user.id);
 const me=await profile(user.id);$("myProfileLink").innerHTML=avatar(me,me.display_name);
 bindUI();await loadAll();
 db.auth.onAuthStateChange((_e,s)=>{if(!s?.user)location.href="account.html";});
 const deep=new URLSearchParams(location.search).get("conversation");if(deep){const t=threads.find(x=>x.type==="direct"&&x.id===deep);if(t)openThread(t);}
}
function bindUI(){
 document.querySelectorAll(".rail-item").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.view)));
 document.querySelectorAll("[data-filter]").forEach(b=>b.addEventListener("click",()=>{filter=b.dataset.filter;document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("active",x===b));renderThreads();}));
 $("threadSearch").addEventListener("input",renderThreads);$("refreshChats").addEventListener("click",loadAll);
 ["newChatBtn","emptyNewChat"].forEach(id=>$(id).addEventListener("click",()=>{showModal("newChatModal");$("readerSearchInput").focus();}));
 ["newGroupBtn","groupsCreateBtn"].forEach(id=>$(id).addEventListener("click",()=>{selectedMembers.clear();renderSelectedMembers();showModal("groupModal");}));
 
 document.querySelectorAll("[data-close-modal]").forEach(b=>b.addEventListener("click",()=>hideModal(b.dataset.closeModal)));
 document.querySelectorAll(".modal-backdrop").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)hideModal(m.id);}));
 $("readerSearchInput").addEventListener("input",debounce(searchReaders,350));
 $("groupMemberSearch").addEventListener("input",debounce(searchGroupMembers,350));
 $("groupForm").addEventListener("submit",createGroup);
 $("messageComposer").addEventListener("submit",sendMessage);$("attachBtn").addEventListener("click",()=>$("attachmentInput").click());
 $("attachmentInput").addEventListener("change",()=>{if($("attachmentInput").files[0])sendMessage(null,$("attachmentInput").files[0]);});
 $("emojiBtn").addEventListener("click",insertEmoji);$("voiceNoteBtn").addEventListener("click",toggleVoiceNote);
 $("mobileChatBack").addEventListener("click",()=>{$("messengerApp").classList.remove("mobile-chat-open");});
 $("chatInfoBtn").addEventListener("click",openChatInfo);$("closeInfoDrawer").addEventListener("click",closeChatInfo);$("chatPeerInfo").addEventListener("click",openChatInfo);
 $("chatSearchBtn").addEventListener("click",searchInChat);$("chatMoreBtn").addEventListener("click",openChatInfo);
 $("messageList").addEventListener("click",messageAction);
 $("threadSearch").addEventListener("keydown",e=>{if(e.key==="Escape")e.target.value="";});
 $("chatMenuBtn").addEventListener("click",()=>switchView("requests"));
 $("manageMemberSearch").addEventListener("input",debounce(searchManageMembers,350));
}
function debounce(fn,ms){let t;return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),ms);};}
async function loadAll(){await Promise.all([loadThreads(),loadRequests()]);}
async function loadThreads(){
 const [directRes,memberRes]=await Promise.all([
  db.from("reader_conversations").select("id,user_one,user_two,created_at").or("user_one.eq."+user.id+",user_two.eq."+user.id).order("created_at",{ascending:false}),
  db.from("reader_chat_group_members").select("group_id,role,last_read_at,reader_chat_groups(id,name,description,avatar_url,updated_at,status)").eq("user_id",user.id)
 ]);
 if(directRes.error)say(directRes.error.message,true);
 const direct=directRes.data||[],members=(memberRes.data||[]).filter(x=>first(x.reader_chat_groups)?.status==="active");
 const directIds=direct.map(x=>x.id),groupIds=members.map(x=>x.group_id);
 const [directMessages,groupMessages,prefs]=await Promise.all([
  directIds.length?db.from("reader_messages").select("id,conversation_id,sender_id,body,created_at,read_at,message_type,attachment_name,deleted_at").in("conversation_id",directIds).order("created_at",{ascending:false}).limit(1000):Promise.resolve({data:[]}),
  groupIds.length?db.from("reader_chat_group_messages").select("id,group_id,sender_id,body,created_at,deleted_at,message_type,attachment_name").in("group_id",groupIds).order("created_at",{ascending:false}).limit(1000):Promise.resolve({data:[]}),
  db.from("reader_chat_preferences").select("*").eq("user_id",user.id)
 ]);
 const prefMap=new Map((prefs.data||[]).map(p=>[p.thread_type+":"+p.thread_id,p]));
 const latestDirect=new Map(),latestGroup=new Map(),unreadDirect=new Map(),unreadGroup=new Map();
 (directMessages.data||[]).forEach(m=>{if(!latestDirect.has(m.conversation_id))latestDirect.set(m.conversation_id,m);if(m.sender_id!==user.id&&!m.read_at)unreadDirect.set(m.conversation_id,(unreadDirect.get(m.conversation_id)||0)+1);});
 (groupMessages.data||[]).forEach(m=>{if(!latestGroup.has(m.group_id))latestGroup.set(m.group_id,m);});
 const directRows=await Promise.all(direct.map(async c=>{const peerId=c.user_one===user.id?c.user_two:c.user_one;return{type:"direct",id:c.id,created_at:c.created_at,peerId,peer:await profile(peerId),last:latestDirect.get(c.id),unread:unreadDirect.get(c.id)||0,pref:prefMap.get("direct:"+c.id)||{}};}));
 const groupRows=members.map(m=>{const g=first(m.reader_chat_groups);return{type:"group",id:g.id,group:g,role:m.role,last_read_at:m.last_read_at,last:latestGroup.get(g.id),unread:0,pref:prefMap.get("group:"+g.id)||{}};});
 groupRows.forEach(t=>{t.unread=(groupMessages.data||[]).filter(m=>m.group_id===t.id&&m.sender_id!==user.id&&(!t.last_read_at||new Date(m.created_at)>new Date(t.last_read_at))).length;});
 threads=[...directRows,...groupRows].sort((a,b)=>Number(b.pref.is_pinned)-Number(a.pref.is_pinned)||new Date(b.last?.created_at||b.created_at||0)-new Date(a.last?.created_at||a.created_at||0));
 renderThreads();renderGroupList();
}
function threadName(t){return t.type==="group"?t.group.name:(t.peer?.display_name||"Voiceoftaade reader");}
function threadAvatar(t){return t.type==="group"?'<span class="thread-avatar group">♧</span>':'<span class="thread-avatar">'+avatar(t.peer,threadName(t))+'</span>';}
function renderThreads(){
 const q=$("threadSearch").value.trim().toLowerCase();let rows=threads.filter(t=>(filter==="archived"?!!t.pref.is_archived:!t.pref.is_archived)&&(threadName(t)+" "+(t.last?.body||"")).toLowerCase().includes(q));
 if(filter==="unread")rows=rows.filter(t=>t.unread>0);if(filter==="groups")rows=rows.filter(t=>t.type==="group");if(filter==="archived")rows=threads.filter(t=>t.pref.is_archived&&(threadName(t)+" "+(t.last?.body||"")).toLowerCase().includes(q));
 $("threadListLabel").textContent=filter==="archived"?"ARCHIVED CHATS":filter==="groups"?"GROUP CHATS":"RECENT CHATS";
 $("threadList").innerHTML=rows.length?rows.map(t=>{const preview=t.last?(t.last.deleted_at?"Message deleted":(t.last.sender_id===user.id?"You: ":"")+(t.last.body||t.last.attachment_name||"Attachment")):"Start a conversation";return '<button class="thread-row '+(active&&threadKey(active)===threadKey(t)?"active":"")+'" data-thread="'+esc(t.id)+'" data-type="'+t.type+'">'+threadAvatar(t)+'<span class="thread-copy"><strong>'+esc(threadName(t))+'</strong><small>'+esc(preview)+'</small></span><span class="thread-meta"><time>'+esc(stamp(t.last?.created_at||t.created_at))+'</time>'+(t.pref.is_pinned?'<span class="thread-pin">◆</span>':"")+(t.unread?'<b class="unread-count">'+t.unread+'</b>':"")+'</span></button>';}).join(""):'<div class="empty-list">No chats here yet.</div>';
 $("threadList").querySelectorAll("[data-thread]").forEach(b=>b.addEventListener("click",()=>{const t=threads.find(x=>x.id===b.dataset.thread&&x.type===b.dataset.type);if(t)openThread(t);}));
}
function renderGroupList(){$("groupList").innerHTML=threads.filter(t=>t.type==="group").length?threads.filter(t=>t.type==="group").map(t=>'<button class="thread-row" data-group-open="'+t.id+'"><span class="thread-avatar group">♧</span><span class="thread-copy"><strong>'+esc(t.group.name)+'</strong><small>'+esc(t.group.description||"Reader group")+'</small></span></button>').join(""):'<div class="empty-list">You have not joined a reader group yet.</div>';$("groupList").querySelectorAll("[data-group-open]").forEach(b=>b.addEventListener("click",()=>{const t=threads.find(x=>x.type==="group"&&x.id===b.dataset.groupOpen);if(t)openThread(t);}));}
async function openThread(t){
 active=t;replyTarget=null;$("replyComposerPreview").hidden=true;$("messengerApp").classList.add("mobile-chat-open");$("emptyChat").hidden=true;$("activeChat").hidden=false;$("chatInfoDrawer").hidden=true;
 $("chatTitle").textContent=threadName(t);$("chatPresence").textContent=t.type==="group"?(t.group.description||"Reader group"):"Private conversation";$("chatAvatar").innerHTML=t.type==="group"?"♧":avatar(t.peer,threadName(t));
 await loadThreadMessages();await markRead();t.unread=0;await subscribeThread();renderThreads();renderInfoDrawer();
}
async function loadThreadMessages(){
 if(!active)return;const table=active.type==="direct"?"reader_messages":"reader_chat_group_messages",key=active.type==="direct"?"conversation_id":"group_id";
 const [messages,hidden]=await Promise.all([db.from(table).select("*").eq(key,active.id).order("created_at",{ascending:true}).limit(250),db.from("reader_chat_message_hides").select("direct_message_id,group_message_id").eq("user_id",user.id)]);
 if(messages.error){say(messages.error.message,true);return;}
 const hiddenIds=new Set((hidden.data||[]).map(x=>active.type==="direct"?x.direct_message_id:x.group_message_id).filter(Boolean));
 activeRows=(messages.data||[]).filter(m=>!hiddenIds.has(m.id));
 const ids=activeRows.map(m=>m.id);
 const [reactions,profiles]=await Promise.all([
  ids.length?db.from("reader_chat_reactions").select("*").eq(active.type==="direct"?"direct_message_id":"group_message_id",ids[0]).limit(0):Promise.resolve({data:[]}),
  active.type==="group"?Promise.all([...new Set(activeRows.map(m=>m.sender_id))].map(async id=>[id,await profile(id)])):Promise.resolve([])
 ]);
 const reactionRes=ids.length?await db.from("reader_chat_reactions").select("*").in(active.type==="direct"?"direct_message_id":"group_message_id",ids):{data:[]};
 const pMap=new Map(profiles);
 const signed=new Map();
 for(const m of activeRows){if(m.attachment_path){const x=await db.storage.from("reader-chat-media").createSignedUrl(m.attachment_path,3600);if(!x.error)signed.set(m.id,x.data.signedUrl);}}
 const reactionsById=new Map();(reactionRes.data||[]).forEach(r=>{const k=active.type==="direct"?r.direct_message_id:r.group_message_id;if(!reactionsById.has(k))reactionsById.set(k,[]);reactionsById.get(k).push(r);});
 const rowById=new Map(activeRows.map(m=>[m.id,m]));
 $("messageList").innerHTML=activeRows.length?activeRows.map(m=>renderMessage(m,pMap.get(m.sender_id),reactionsById.get(m.id)||[],signed.get(m.id),rowById.get(m.reply_to))).join(""):'<div class="empty-list">This conversation is ready. Send the first message.</div>';
 $("messageList").scrollTop=$("messageList").scrollHeight;
 const pinned=activeRows.find(m=>m.pinned_at&&!m.deleted_at);$("pinnedMessageBar").hidden=!pinned;if(pinned)$("pinnedMessageBar").textContent="◆ Pinned: "+(pinned.body||pinned.attachment_name||"Attachment");
}
function renderMessage(m,sender,reactions,url,parent){
 const mine=m.sender_id===user.id,deleted=!!m.deleted_at,body=deleted?"This message was deleted":m.body||"";
 let attachment="";
 if(!deleted&&url){if(m.message_type==="image")attachment='<a class="message-attachment" href="'+esc(url)+'" target="_blank" rel="noopener"><img src="'+esc(url)+'" alt="'+esc(m.attachment_name||"Shared image")+'"></a>';
 else if(m.message_type==="video")attachment='<video class="message-attachment" src="'+esc(url)+'" controls playsinline></video>';
 else if(["audio","voice"].includes(m.message_type))attachment='<audio class="message-attachment" src="'+esc(url)+'" controls></audio>';
 else attachment='<a class="message-file" href="'+esc(url)+'" target="_blank" rel="noopener">▤ '+esc(m.attachment_name||"Download attachment")+'</a>';}
 const reply=parent&&!deleted?'<div class="message-reply-quote">'+esc(parent.body||parent.attachment_name||"Attachment")+'</div>':"";
 const rx=reactions.map(r=>'<button data-reaction-message="'+m.id+'" data-emoji="'+esc(r.emoji)+'" title="React">'+esc(r.emoji)+'</button>').join("");
 const author=!mine&&active.type==="group"?'<small class="message-author">'+esc(sender?.display_name||"Reader")+'</small>':"";
 const tick=mine?(m.read_at?'<span class="read-tick">✓✓</span>':"✓"):"";
 return '<article class="message-bubble '+(mine?"mine ":"")+(deleted?"deleted":"")+'" data-message-id="'+m.id+'">'+author+reply+(attachment||"")+(body?'<div class="message-body">'+esc(body)+'</div>':"")+'<div class="message-time">'+(m.edited_at&&!deleted?"Edited · ":"")+stamp(m.created_at)+' '+tick+'</div><div class="message-reactions">'+rx+'</div><div class="message-actions"><button data-action="reply" data-id="'+m.id+'">Reply</button><button data-action="react" data-id="'+m.id+'">☺</button><button data-action="more" data-id="'+m.id+'">•••</button></div></article>';
}
async function markRead(){if(!active)return;if(active.type==="direct")await db.rpc("mark_reader_messages_read",{p_conversation_id:active.id});else await db.rpc("mark_reader_chat_group_read",{p_group_id:active.id});}
async function subscribeThread(){
 if(activeChannel){await db.removeChannel(activeChannel);activeChannel=null;}
 const table=active.type==="direct"?"reader_messages":"reader_chat_group_messages",col=active.type==="direct"?"conversation_id":"group_id";
 activeChannel=db.channel("reader-thread-"+active.type+"-"+active.id,{config:{presence:{key:user.id}}})
 .on("postgres_changes",{event:"*",schema:"public",table,filter:col+"=eq."+active.id},()=>{loadThreadMessages();markRead();loadThreads();})
 .on("presence",{event:"sync"},()=>{const states=activeChannel.presenceState();const online=Object.keys(states).some(k=>k!==user.id);if(active.type==="direct")$("chatPresence").textContent=online?"Online now":"Last seen recently";})
 .on("broadcast",{event:"typing"},({payload})=>{if(payload?.user_id!==user.id){$("chatPresence").textContent="Typing…";clearTimeout(typingTimer);typingTimer=setTimeout(()=>$("chatPresence").textContent="Private conversation",2200);}})
 .subscribe(async status=>{if(status==="SUBSCRIBED")await activeChannel.track({user_id:user.id,online_at:new Date().toISOString()});});
 $("messageInput").oninput=()=>{if(activeChannel)activeChannel.send({type:"broadcast",event:"typing",payload:{user_id:user.id}});};
}
async function sendMessage(event,file=null){
 if(event)event.preventDefault();if(!active)return;
 const body=$("messageInput").value.trim();file=file||$("attachmentInput").files[0]||null;if(!body&&!file)return;
 const btn=$("sendMessageBtn");btn.disabled=true;let path=null,type="text",name=null,mime=null,size=null;
 try{
  if(file){if(file.size>15*1024*1024)throw new Error("Attachments must be 15 MB or smaller.");mime=file.type||"application/octet-stream";name=file.name||"Voice note";size=file.size;type=file.type.startsWith("image/")?"image":file.type.startsWith("video/")?"video":file.type.startsWith("audio/")?(file.name?.includes("voice-note")?"voice":"audio"):"file";
   const folder=active.type==="direct"?"direct":"group";path=folder+"/"+active.id+"/"+user.id+"/"+crypto.randomUUID()+"."+fileExt(file.name);const up=await db.storage.from("reader-chat-media").upload(path,file,{contentType:mime,upsert:false});if(up.error)throw up.error;
  }
  const args={p_body:body,p_message_type:type,p_attachment_path:path,p_attachment_name:name||file?.name||null,p_attachment_mime:mime,p_attachment_size:size,p_reply_to:replyTarget?.id||null};
  const sent=active.type==="direct"?await db.rpc("send_reader_message_v2",{p_conversation_id:active.id,...args}):await db.rpc("send_reader_chat_group_message",{p_group_id:active.id,...args});
  if(sent.error)throw sent.error;$("messageInput").value="";$("attachmentInput").value="";replyTarget=null;$("replyComposerPreview").hidden=true;await loadThreadMessages();await loadThreads();
 }catch(e){say(e.message||"Message could not be sent.",true);}finally{btn.disabled=false;}
}
async function messageAction(e){
 const b=e.target.closest("[data-action],[data-reaction-message]");if(!b)return;
 if(b.dataset.reactionMessage){const field=active.type==="direct"?"direct_message_id":"group_message_id",payload={user_id:user.id,emoji:b.dataset.emoji,[field]:b.dataset.reactionMessage};const existing=await db.from("reader_chat_reactions").select("id").eq(field,b.dataset.reactionMessage).eq("user_id",user.id).eq("emoji",b.dataset.emoji).maybeSingle();const r=existing.data?await db.from("reader_chat_reactions").delete().eq("id",existing.data.id):await db.from("reader_chat_reactions").insert(payload);if(r.error)say(r.error.message,true);await loadThreadMessages();return;}
 const id=b.dataset.id,action=b.dataset.action,m=activeRows.find(x=>x.id===id);if(!m)return;
 if(action==="reply"){replyTarget=m;$("replyComposerPreview").hidden=false;$("replyComposerPreview").innerHTML='<span>Replying to: '+esc(m.body||m.attachment_name||"Attachment")+'</span><button type="button" id="cancelReply">×</button>';$("cancelReply").onclick=()=>{replyTarget=null;$("replyComposerPreview").hidden=true;};$("messageInput").focus();}
 if(action==="react"){const allowed=["❤️","👍","😂","😮","😢","🙏","👏","🔥","✨","💚"];const emoji=prompt("Choose a reaction: "+allowed.join(" "), "❤️");if(!emoji)return;if(!allowed.includes(emoji.trim())){say("Choose one of the listed reactions.",true);return;}const field=active.type==="direct"?"direct_message_id":"group_message_id";const r=await db.from("reader_chat_reactions").insert({user_id:user.id,emoji:emoji.trim().slice(0,8),[field]:id});if(r.error)say(r.error.message,true);await loadThreadMessages();}
 if(action==="more"){const choices=active.type==="group"?["Edit","Delete","Pin","Unpin","Hide"]:["Edit","Delete","Pin","Unpin","Hide"];const pick=prompt("Message action: "+choices.join(" / "));if(!pick)return;const key=pick.toLowerCase();if(!choices.map(x=>x.toLowerCase()).includes(key))return;
  if(key==="hide"){const field=active.type==="direct"?"direct_message_id":"group_message_id";const r=await db.from("reader_chat_message_hides").insert({user_id:user.id,[field]:id});if(r.error)say(r.error.message,true);else say("Message hidden from your view.");await loadThreadMessages();return;}
  let body=null;if(key==="edit"){body=prompt("Edit your message:",m.body);if(body===null)return;}
  const r=await db.rpc("update_reader_chat_message",{p_message_id:id,p_thread_type:active.type,p_action:key,p_body:body});if(r.error)say(r.error.message,true);else say("Message updated.");await loadThreadMessages();
 }
}
function insertEmoji(){const emojis=["😀","😂","🥰","😍","🙏","❤️","👍","👏","🔥","✨","📚","💚"];const e=prompt("Choose an emoji: "+emojis.join(" "), "😊");if(e){const n=$("messageInput");n.value+=e;n.focus();}}
async function toggleVoiceNote(){
 if(recording){mediaRecorder.stop();recording=false;$("voiceNoteBtn").textContent="🎙";$("voiceNoteBtn").title="Record voice note";return;}
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){say("Voice recording is not supported by this browser.",true);return;}
 try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});recordedChunks=[];mediaRecorder=new MediaRecorder(stream);mediaRecorder.ondataavailable=e=>{if(e.data.size)recordedChunks.push(e.data);};mediaRecorder.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());const blob=new Blob(recordedChunks,{type:mediaRecorder.mimeType||"audio/webm"});const f=new File([blob],"voice-note-"+Date.now()+".webm",{type:blob.type});await sendMessage(null,f);};mediaRecorder.start();recording=true;$("voiceNoteBtn").textContent="■";$("voiceNoteBtn").title="Stop and send voice note";say("Recording voice note…");}catch(e){say("Microphone permission was not granted.",true);}
}
async function searchReaders(){const term=$("readerSearchInput").value.trim();if(term.length<2){$("readerSearchResults").innerHTML="";return;}const r=await db.rpc("search_reader_directory",{search_term:term});if(r.error){$("readerSearchResults").textContent=r.error.message;return;}const rows=r.data||[];$("readerSearchResults").innerHTML=rows.length?rows.map(p=>'<div class="modal-reader"><span class="thread-avatar">'+avatar(p,p.display_name)+'</span><span><strong>'+esc(p.display_name||"Reader")+'</strong><small>Voiceoftaade reader</small></span><button class="primary-action" data-message-request="'+p.id+'">Message</button></div>').join(""):'<p class="empty-list">No readers found.</p>';$("readerSearchResults").querySelectorAll("[data-message-request]").forEach(b=>b.onclick=()=>sendMessageRequest(b.dataset.messageRequest,b));}
async function sendMessageRequest(id,b){b.disabled=true;const r=await db.rpc("request_reader_message",{target_user_id:id,initial_message:null});if(r.error){say(r.error.message,true);b.disabled=false;return;}b.textContent="Request sent";say("Message request sent. The reader must accept before you can chat.");await loadRequests();}
async function loadRequests(){
 const [a,b]=await Promise.all([db.from("reader_message_requests").select("id,sender_id,initial_message,created_at").eq("recipient_id",user.id).eq("status","pending").order("created_at",{ascending:false}),db.from("reader_message_requests").select("id,recipient_id,created_at").eq("sender_id",user.id).eq("status","pending").order("created_at",{ascending:false})]);
 const incoming=await Promise.all((a.data||[]).map(async r=>({r,p:await profile(r.sender_id)}))),outgoing=await Promise.all((b.data||[]).map(async r=>({r,p:await profile(r.recipient_id)})));
 $("requestBadge").hidden=!incoming.length;$("requestBadge").textContent=incoming.length;
 $("incomingRequests").innerHTML=incoming.length?incoming.map(({r,p})=>'<article class="request-card"><strong>'+esc(p.display_name||"Reader")+'</strong><p>'+esc(r.initial_message||"Would like to connect")+' · '+esc(shortDate(r.created_at))+'</p><div class="request-actions"><button data-accept="'+r.id+'">Accept</button><button data-decline="'+r.id+'">Decline</button></div></article>').join(""):'<div class="empty-list">No incoming requests.</div>';
 $("outgoingRequests").innerHTML=outgoing.length?outgoing.map(({r,p})=>'<article class="request-card"><strong>'+esc(p.display_name||"Reader")+'</strong><p>Awaiting their response · '+esc(shortDate(r.created_at))+'</p></article>').join(""):'<div class="empty-list">No sent requests.</div>';
 $("incomingRequests").querySelectorAll("[data-accept]").forEach(b=>b.onclick=()=>respondRequest(b.dataset.accept,"accepted"));$("incomingRequests").querySelectorAll("[data-decline]").forEach(b=>b.onclick=()=>respondRequest(b.dataset.decline,"declined"));
}
async function respondRequest(id,decision){const r=await db.rpc("respond_reader_message_request",{request_id:id,decision});if(r.error){say(r.error.message,true);return;}say(decision==="accepted"?"Request accepted.":"Request declined.");await loadAll();if(decision==="accepted"){const t=threads.find(x=>x.type==="direct"&&x.id===r.data);if(t)openThread(t);}}
async function searchGroupMembers(){const term=$("groupMemberSearch").value.trim();if(term.length<2){$("groupMemberResults").innerHTML="";return;}const r=await db.rpc("search_reader_directory",{search_term:term});if(r.error){$("groupMemberResults").textContent=r.error.message;return;}const rows=(r.data||[]).filter(p=>p.id!==user.id&&!selectedMembers.has(p.id));$("groupMemberResults").innerHTML=rows.map(p=>'<label class="modal-reader"><input type="checkbox" data-select-member="'+p.id+'"><span><strong>'+esc(p.display_name||"Reader")+'</strong><small>Reader</small></span></label>').join("")||'<p class="empty-list">No available readers found.</p>';$("groupMemberResults").querySelectorAll("[data-select-member]").forEach(ch=>ch.onchange=()=>{const p=rows.find(x=>x.id===ch.dataset.selectMember);if(ch.checked)selectedMembers.set(p.id,p);else selectedMembers.delete(p.id);renderSelectedMembers();});}
function renderSelectedMembers(){$("selectedGroupMembers").innerHTML=[...selectedMembers.values()].map(p=>'<button type="button" class="member-chip" data-remove-member="'+p.id+'">'+esc(p.display_name||"Reader")+' ×</button>').join("");$("selectedGroupMembers").querySelectorAll("[data-remove-member]").forEach(b=>b.onclick=()=>{selectedMembers.delete(b.dataset.removeMember);renderSelectedMembers();});}
async function createGroup(e){e.preventDefault();const name=$("groupName").value.trim();if(!name)return;$("groupStatus").textContent="Creating group…";const r=await db.rpc("create_reader_chat_group",{p_name:name,p_description:$("groupDescription").value.trim(),p_member_ids:[...selectedMembers.keys()]});if(r.error){$("groupStatus").textContent=r.error.message;return;}hideModal("groupModal");say("Group created.");await loadThreads();const t=threads.find(x=>x.type==="group"&&x.id===r.data);if(t)openThread(t);}
async function uploadChatMedia(file,path){if(file.size>15*1024*1024)throw new Error("File exceeds 15 MB.");const r=await db.storage.from("reader-chat-media").upload(path,file,{contentType:file.type||"application/octet-stream",upsert:false});if(r.error)throw r.error;return path;}
async function renderInfoDrawer(){if(!active)return;const name=threadName(active),isGroup=active.type==="group";let detail=isGroup?active.group.description||"Reader group":active.peer?.bio||"Voiceoftaade reader";$("chatInfoContent").innerHTML='<div class="info-hero"><span class="chat-avatar">'+(isGroup?"♧":avatar(active.peer,name))+'</span><h3>'+esc(name)+'</h3><p>'+esc(detail)+'</p></div><div class="info-actions"><button data-pref="is_pinned">'+(active.pref.is_pinned?"Unpin":"Pin")+'</button><button data-pref="is_favorite">'+(active.pref.is_favorite?"Unfavourite":"Favourite")+'</button><button data-pref="is_archived">Archive</button></div><div class="info-section"><h4>CHAT SETTINGS</h4><div class="info-row"><span>Mute notifications</span><button data-pref="muted_until">'+(active.pref.muted_until?"Unmute":"Mute")+'</button></div><div class="info-row"><span>Search in conversation</span><button id="drawerSearch">Search</button></div></div>'+(isGroup?'<div class="info-section"><h4>GROUP</h4><div class="info-row"><span>About</span><span>'+esc(active.group.description||"—")+'</span></div><div class="info-row"><button id="manageGroupBtn">Manage members</button></div><div class="info-row"><button id="leaveGroupBtn">Leave group</button></div></div>':'<div class="info-section"><h4>READER</h4><div class="info-row"><a href="profile.html?id='+active.peerId+'">View reader profile ↗</a></div></div>');$("chatInfoContent").querySelectorAll("[data-pref]").forEach(b=>b.onclick=()=>togglePreference(b.dataset.pref));$("drawerSearch")?.addEventListener("click",searchInChat);$("leaveGroupBtn")?.addEventListener("click",leaveGroup);$("manageGroupBtn")?.addEventListener("click",openManageGroup);}
function openChatInfo(){if(!active)return;renderInfoDrawer();$("chatInfoDrawer").hidden=false;}
function closeChatInfo(){$("chatInfoDrawer").hidden=true;}
async function togglePreference(key){if(!active)return;const p={user_id:user.id,thread_type:active.type,thread_id:active.id};if(key==="muted_until")p.muted_until=active.pref.muted_until?null:new Date(Date.now()+7*86400000).toISOString();else p[key]=!active.pref[key];const r=await db.from("reader_chat_preferences").upsert(p,{onConflict:"user_id,thread_type,thread_id"});if(r.error){say(r.error.message,true);return;}active.pref={...active.pref,...p};await loadThreads();renderInfoDrawer();say("Chat settings updated.");}
async function openManageGroup(){
 if(!active||active.type!=="group")return;
 $("manageGroupTitle").textContent=active.group.name;
 $("manageGroupDetails").innerHTML=active.role==="admin"?'<label>Group name<input id="editGroupName" maxlength="80" value="'+esc(active.group.name)+'"></label><label>Group description<textarea id="editGroupDescription" maxlength="500">'+esc(active.group.description||"")+'</textarea></label><button type="button" id="saveGroupDetails" class="primary-action">Save group details</button>':'<p>'+esc(active.group.description||"Reader group")+'</p>';
 $("manageGroupAdminTools").hidden=active.role!=="admin";
 $("saveGroupDetails")?.addEventListener("click",saveGroupDetails);
 $("manageMemberSearch").value="";$("manageMemberResults").innerHTML="";
 $("manageGroupStatus").textContent="";
 await refreshGroupMembers();showModal("manageGroupModal");
}
async function saveGroupDetails(){
 const name=$("editGroupName").value.trim(),description=$("editGroupDescription").value.trim();
 const r=await db.rpc("update_reader_chat_group",{p_group_id:active.id,p_name:name,p_description:description});
 if(r.error){$("manageGroupStatus").textContent=r.error.message;return;}
 active.group.name=name;active.group.description=description;$("chatTitle").textContent=name;$("manageGroupTitle").textContent=name;$("manageGroupStatus").textContent="Group details saved.";await loadThreads();renderInfoDrawer();
}
async function refreshGroupMembers(){
 if(!active||active.type!=="group")return;
 const r=await db.from("reader_chat_group_members").select("user_id,role,joined_at").eq("group_id",active.id).order("joined_at",{ascending:true});
 if(r.error){$("manageGroupStatus").textContent=r.error.message;return;}
 const rows=await Promise.all((r.data||[]).map(async m=>({m,p:await profile(m.user_id)})));
 $("currentGroupMembers").innerHTML=rows.length?rows.map(({m,p})=>'<div class="modal-reader"><span class="thread-avatar">'+avatar(p,p.display_name)+'</span><span><strong>'+esc(p.display_name||"Reader")+'</strong><small>'+esc(m.role==="admin"?"Group admin":"Member")+'</small></span>'+(active.role==="admin"&&m.role!=="admin"&&m.user_id!==user.id?'<button data-remove-group-member="'+m.user_id+'">Remove</button>':"")+'</div>').join(""):'<p class="empty-list">No members found.</p>';
 $("currentGroupMembers").querySelectorAll("[data-remove-group-member]").forEach(b=>b.onclick=()=>removeGroupMember(b.dataset.removeGroupMember));
}
async function searchManageMembers(){
 const term=$("manageMemberSearch").value.trim();if(term.length<2){$("manageMemberResults").innerHTML="";return;}
 const r=await db.rpc("search_reader_directory",{search_term:term});if(r.error){$("manageMemberResults").textContent=r.error.message;return;}
 const current=await db.from("reader_chat_group_members").select("user_id").eq("group_id",active.id);
 const existing=new Set((current.data||[]).map(x=>x.user_id));
 const rows=(r.data||[]).filter(p=>p.id!==user.id&&!existing.has(p.id));
 $("manageMemberResults").innerHTML=rows.length?rows.map(p=>'<div class="modal-reader"><span class="thread-avatar">'+avatar(p,p.display_name)+'</span><span><strong>'+esc(p.display_name||"Reader")+'</strong><small>Voiceoftaade reader</small></span><button data-add-group-member="'+p.id+'">Add</button></div>').join(""):'<p class="empty-list">No available readers found.</p>';
 $("manageMemberResults").querySelectorAll("[data-add-group-member]").forEach(b=>b.onclick=()=>addGroupMember(b.dataset.addGroupMember,b));
}
async function addGroupMember(id,button){
 button.disabled=true;const r=await db.rpc("add_reader_chat_group_member",{p_group_id:active.id,p_target_user_id:id});
 if(r.error){$("manageGroupStatus").textContent=r.error.message;button.disabled=false;return;}
 $("manageGroupStatus").textContent="Reader added to the group.";await refreshGroupMembers();await loadThreads();
}
async function removeGroupMember(id){
 if(!confirm("Remove this reader from the group?"))return;
 const r=await db.rpc("remove_reader_chat_group_member",{p_group_id:active.id,p_target_user_id:id});
 if(r.error){$("manageGroupStatus").textContent=r.error.message;return;}
 $("manageGroupStatus").textContent="Member removed.";await refreshGroupMembers();await loadThreads();
}
async function leaveGroup(){if(!active||active.type!=="group")return;if(!confirm("Leave this reader group?"))return;const r=await db.rpc("leave_reader_chat_group",{p_group_id:active.id});if(r.error){say(r.error.message,true);return;}active=null;$("activeChat").hidden=true;$("emptyChat").hidden=false;$("messengerApp").classList.remove("mobile-chat-open");closeChatInfo();await loadThreads();}
function searchInChat(){if(!active)return;const q=prompt("Search messages in this conversation:");if(!q)return;const matches=activeRows.filter(m=>(m.body||"").toLowerCase().includes(q.toLowerCase()));$("messageList").innerHTML=matches.length?matches.map(m=>renderMessage(m,null,[],null,null)).join(""):'<div class="empty-list">No matching messages.</div>';}
window.addEventListener("beforeunload",()=>{if(activeChannel)db.removeChannel(activeChannel);});
init().catch(e=>say(e.message||"Messenger could not start.",true));
})();