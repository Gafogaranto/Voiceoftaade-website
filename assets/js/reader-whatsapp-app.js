(()=>{"use strict";
const $=id=>document.getElementById(id);
const db=window.supabase?.createClient("https://qnnmbngxunmjerpeoxrr.supabase.co","sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67");
const MEDIA="reader-chat-media";
const state={user:null,tab:"chats",filter:"all",items:[],active:null,messages:[],replyTo:null,channel:null,typingTimer:null,groupCandidates:new Map(),call:null,callPeer:null,pendingCall:null,rtc:null,localStream:null,remoteStream:null,signalChannel:null,queuedIce:[],recording:null,recordChunks:[]};
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const stamp=v=>new Date(v).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});
const relative=v=>{if(!v)return"";const d=new Date(v),now=new Date(),same=d.toDateString()===now.toDateString();return same?stamp(v):d.toLocaleDateString(undefined,{month:"short",day:"numeric"});};
const say=(message,bad=false)=>{const el=$("waToast");el.textContent=message;el.style.background=bad?"#8e3030":"#243a40";el.hidden=false;clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>el.hidden=true,3000);};
const chatStatus=(message,bad=false)=>{const el=$("waChatFeedback");if(el){el.textContent=message||"";el.style.color=bad?"#b74b43":"#708087";}};
const avatar=(profile,name)=>profile?.avatar_url?'<img src="'+esc(profile.avatar_url)+'" alt="">':esc((name||profile?.display_name||"V").trim().slice(0,1).toUpperCase());
async function getProfile(id){if(!id)return null;const r=await db.rpc("get_public_reader_profile_card",{target_user_id:id});return Array.isArray(r.data)?r.data[0]:(r.data||null);}
function showModal(id,open){$(id).hidden=!open;}
function setTab(tab){
 state.tab=tab;state.active=null;state.replyTo=null;document.body.classList.remove("wa-app-chat-open");$("waApp").classList.remove("has-chat-open");
 $("waChatsView").hidden=tab!=="chats";$("waUpdatesView").hidden=tab!=="updates";$("waCommunitiesView").hidden=tab!=="communities";$("waCallsView").hidden=tab!=="calls";
 $("waEmptyState").hidden=false;$("waConversation").hidden=true;$("waInfoView").hidden=true;
 document.querySelectorAll("[data-wa-tab]").forEach(b=>b.classList.toggle("active",b.dataset.waTab===tab));
 if(tab==="updates")loadStatuses();if(tab==="communities")loadGroupGrid();if(tab==="calls")loadCalls();
}
function openChatView(){state.tab="chats";$("waChatsView").hidden=false;$("waUpdatesView").hidden=true;$("waCommunitiesView").hidden=true;$("waCallsView").hidden=true;document.querySelectorAll("[data-wa-tab]").forEach(b=>b.classList.toggle("active",b.dataset.waTab==="chats"));}
function requestThreadLabel(item){return item.type==="group"?"Group chat":"Private conversation";}
async function refreshChats(){
 if(!state.user)return;
 const uid=state.user.id;
 const [directRes,memberRes,prefRes,reqRes]=await Promise.all([
  db.from("reader_conversations").select("id,user_one,user_two,created_at").or("user_one.eq."+uid+",user_two.eq."+uid).order("created_at",{ascending:false}).limit(200),
  db.from("reader_chat_group_members").select("group_id,role,last_read_at,reader_chat_groups(id,name,description,avatar_url,created_by,created_at,status)").eq("user_id",uid),
  db.from("reader_chat_preferences").select("thread_type,thread_id,is_pinned,is_archived,is_favorite,muted_until").eq("user_id",uid),
  db.from("reader_message_requests").select("id").eq("recipient_id",uid).eq("status","pending")
 ]);
 if(directRes.error)console.warn("Direct conversations unavailable",directRes.error);
 if(memberRes.error)console.warn("Group conversations unavailable",memberRes.error);
 const direct=directRes.data||[],members=memberRes.data||[];
 const prefs=new Map((prefRes.data||[]).map(p=>[p.thread_type+":"+p.thread_id,p]));
 const directIds=direct.map(x=>x.id),groupIds=members.map(x=>x.group_id);
 let directMessages=[],groupMessages=[];
 if(directIds.length){const r=await db.from("reader_messages").select("id,conversation_id,sender_id,body,message_type,attachment_name,created_at,read_at,delivered_at,deleted_at").in("conversation_id",directIds).order("created_at",{ascending:false}).limit(1200);directMessages=r.data||[];}
 if(groupIds.length){const r=await db.from("reader_chat_group_messages").select("id,group_id,sender_id,body,message_type,attachment_name,created_at,deleted_at").in("group_id",groupIds).order("created_at",{ascending:false}).limit(1200);groupMessages=r.data||[];}
 const lastDirect=new Map(),unreadDirect=new Map();
 directMessages.forEach(m=>{if(!lastDirect.has(m.conversation_id))lastDirect.set(m.conversation_id,m);if(m.sender_id!==uid&&!m.read_at&&!m.deleted_at)unreadDirect.set(m.conversation_id,(unreadDirect.get(m.conversation_id)||0)+1);});
 const lastGroup=new Map(),unreadGroup=new Map();
 const memberRead=new Map(members.map(m=>[m.group_id,m.last_read_at]));
 groupMessages.forEach(m=>{if(!lastGroup.has(m.group_id))lastGroup.set(m.group_id,m);const last=memberRead.get(m.group_id);if(m.sender_id!==uid&&!m.deleted_at&&(!last||new Date(m.created_at)>new Date(last)))unreadGroup.set(m.group_id,(unreadGroup.get(m.group_id)||0)+1);});
 const directItems=await Promise.all(direct.map(async c=>{
   const peerId=c.user_one===uid?c.user_two:c.user_one,peer=await getProfile(peerId),last=lastDirect.get(c.id),pref=prefs.get("direct:"+c.id)||{};
   return {type:"direct",id:c.id,name:peer?.display_name||"Reader",avatar:peer?.avatar_url||null,peerId,peer,createdAt:c.created_at,last,unread:unreadDirect.get(c.id)||0,pref};
 }));
 const groups=members.map(m=>m.reader_chat_groups).filter(g=>g&&g.status==="active");
 const groupItems=await Promise.all(groups.map(async g=>{
   const m=members.find(x=>x.group_id===g.id),last=lastGroup.get(g.id),pref=prefs.get("group:"+g.id)||{},count=await db.from("reader_chat_group_members").select("user_id").eq("group_id",g.id);
   return {type:"group",id:g.id,name:g.name,description:g.description,avatar:g.avatar_url,createdBy:g.created_by,role:m?.role,lastReadAt:m?.last_read_at,last,unread:unreadGroup.get(g.id)||0,memberCount:count.data?.length||0,pref};
 }));
 state.items=[...directItems,...groupItems].filter(x=>!x.pref.is_archived);
 state.allItems=[...directItems,...groupItems];
 state.requestCount=reqRes.data?.length||0;$("waRequestCount").textContent=state.requestCount;$("waRequestCount").hidden=!state.requestCount;
 renderChatList();
}
function previewText(m,uid){
 if(!m)return "Start a conversation";
 if(m.deleted_at)return "Message deleted";
 let prefix=m.sender_id===uid?"You: ":"";
 if(m.message_type&&m.message_type!=="text")return prefix+({image:"Photo",video:"Video",audio:"Audio",voice:"Voice message",file:"Document"}[m.message_type]||"Attachment");
 return prefix+(m.body||"");
}
function renderChatList(){
 const host=$("waChatList"),term=$("waChatSearch").value.trim().toLowerCase();
 let rows=[...state.items];
 rows=rows.filter(x=>{
   const filter=state.filter;
   if(filter==="unread"&&!x.unread)return false;
   if(filter==="favorites"&&!x.pref.is_favorite)return false;
   if(filter==="groups"&&x.type!=="group")return false;
   if(filter==="archived")return !!(x.pref.is_archived);
   if(filter!=="archived"&&x.pref.is_archived)return false;
   if(term&&!((x.name||"").toLowerCase().includes(term)||previewText(x.last,state.user.id).toLowerCase().includes(term)))return false;
   return true;
 });
 rows.sort((a,b)=>Number(!!b.pref.is_pinned)-Number(!!a.pref.is_pinned)||new Date(b.last?.created_at||b.createdAt)-new Date(a.last?.created_at||a.createdAt));
 host.innerHTML=rows.length?rows.map(x=>'<button class="wa-chat-row '+(state.active?.id===x.id&&state.active?.type===x.type?"active":"")+'" data-thread-type="'+x.type+'" data-thread-id="'+x.id+'"><span class="wa-avatar">'+(x.type==="group"&&x.avatar?'<img src="'+esc(x.avatar)+'" alt="">':avatar(x.peer,x.name))+'</span><span class="wa-chat-copy"><span class="wa-chat-top"><strong>'+esc(x.name)+'</strong><time>'+esc(relative(x.last?.created_at||x.createdAt))+'</time></span><span class="wa-chat-bottom"><small class="wa-chat-preview">'+esc(previewText(x.last,state.user.id))+'</small><span class="wa-chat-meta">'+(x.pref.is_pinned?'<span class="wa-chat-tag">⌖</span>':'')+(x.pref.muted_until&&new Date(x.pref.muted_until)>new Date()?'<span class="wa-chat-tag">♩</span>':'')+(x.unread?'<span class="wa-unread">'+x.unread+'</span>':'')+'</span></span></span></button>').join(""):'<p class="wa-empty-list">'+(state.filter==="unread"?"No unread chats.":state.filter==="favorites"?"No favourite chats yet.":state.filter==="groups"?"Your group chats will appear here.":state.filter==="archived"?"No archived conversations.":"No chats yet. Search for a reader or create a group to begin.")+'</p>';
 host.querySelectorAll("[data-thread-id]").forEach(b=>b.addEventListener("click",()=>openConversation(b.dataset.threadType,b.dataset.threadId)));
}
async function openConversation(type,id){
 const item=state.allItems.find(x=>x.type===type&&x.id===id);if(!item)return;
 state.active=item;state.replyTo=null;openChatView();$("waApp").classList.add("has-chat-open");document.body.classList.add("wa-app-chat-open");
 $("waEmptyState").hidden=true;$("waConversation").hidden=false;$("waInfoView").hidden=true;
 $("waActiveName").textContent=item.name;$("waActiveAvatar").innerHTML=type==="group"&&item.avatar?'<img src="'+esc(item.avatar)+'" alt="">':avatar(item.peer,item.name);
 $("waActivePresence").textContent=type==="group"?(item.memberCount+" members · "+(item.role==="admin"?"Group admin":"Group member")):"Private conversation · Message requests were accepted";
 $("waChatMenu").hidden=true;$("waReplyBar").hidden=true;chatStatus("Loading messages…");
 await loadMessages();await markCurrentRead();await subscribeActive();
 renderChatList();
}
async function subscribeActive(){
 if(state.channel){await db.removeChannel(state.channel);state.channel=null;}
 const a=state.active;if(!a)return;
 const topic="wa-"+a.type+"-"+a.id;
 let ch=db.channel(topic,{config:{presence:{key:state.user.id}}});
 if(a.type==="direct")ch=ch.on("postgres_changes",{event:"*",schema:"public",table:"reader_messages",filter:"conversation_id=eq."+a.id},()=>{loadMessages();markCurrentRead();});
 else ch=ch.on("postgres_changes",{event:"*",schema:"public",table:"reader_chat_group_messages",filter:"group_id=eq."+a.id},()=>{loadMessages();markCurrentRead();});
 ch=ch.on("presence",{event:"sync"},()=>{const online=Object.keys(ch.presenceState()).filter(k=>k!==state.user.id).length;if(a.type==="direct")$("waActivePresence").textContent=online?"Online now":"Private conversation";});
 ch=ch.on("broadcast",{event:"typing"},({payload})=>{if(payload?.user_id!==state.user.id){$("waActivePresence").textContent="Typing…";clearTimeout(state.typingTimer);state.typingTimer=setTimeout(()=>$("waActivePresence").textContent=a.type==="group"?a.memberCount+" members":"Private conversation",1800);}});
 ch.subscribe(async status=>{if(status==="SUBSCRIBED"){await ch.track({online_at:new Date().toISOString()});chatStatus("Connected");}else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")chatStatus("Live updates interrupted. Refresh to reconnect.",true);});
 state.channel=ch;
}
async function markCurrentRead(){
 const a=state.active;if(!a)return;
 const rpc=a.type==="direct"?"mark_reader_direct_messages_read":"mark_reader_group_messages_read";
 const args=a.type==="direct"?{p_conversation_id:a.id}:{p_group_id:a.id};
 await db.rpc(rpc,args);if(a.type==="direct"){const unread=state.items.find(x=>x.type===a.type&&x.id===a.id);if(unread)unread.unread=0;}else{const unread=state.items.find(x=>x.type===a.type&&x.id===a.id);if(unread)unread.unread=0;}
}
async function loadMessages(){
 const a=state.active;if(!a)return;
 let result;
 if(a.type==="direct")result=await db.from("reader_messages").select("id,conversation_id,sender_id,body,message_type,attachment_path,attachment_name,attachment_mime,attachment_size,reply_to,edited_at,deleted_at,pinned_at,created_at,read_at,delivered_at").eq("conversation_id",a.id).order("created_at",{ascending:true}).limit(250);
 else result=await db.from("reader_chat_group_messages").select("id,group_id,sender_id,body,message_type,attachment_path,attachment_name,attachment_mime,attachment_size,reply_to,edited_at,deleted_at,pinned_at,created_at").eq("group_id",a.id).order("created_at",{ascending:true}).limit(250);
 if(result.error){chatStatus(result.error.message,true);return;}
 const rows=result.data||[],ids=rows.map(x=>x.id),hideRes=ids.length?await db.from("reader_chat_message_hides").select("direct_message_id,group_message_id").eq("user_id",state.user.id):{data:[]};
 const hidden=new Set((hideRes.data||[]).map(x=>a.type==="direct"?x.direct_message_id:x.group_message_id).filter(Boolean));
 const visible=rows.filter(x=>!hidden.has(x.id));
 const senders=[...new Set(visible.map(x=>x.sender_id))];
 const profiles=new Map();
 await Promise.all(senders.map(async id=>{profiles.set(id,await getProfile(id));}));
 const reactRes=ids.length?await db.from("reader_chat_reactions").select("direct_message_id,group_message_id,user_id,emoji").in(a.type==="direct"?"direct_message_id":"group_message_id",ids):{data:[]};
 const reactions=new Map();
 (reactRes.data||[]).forEach(r=>{const key=a.type==="direct"?r.direct_message_id:r.group_message_id;if(!reactions.has(key))reactions.set(key,[]);reactions.get(key).push(r);});
 const rowMap=new Map(visible.map(x=>[x.id,x]));
 const rendered=await Promise.all(visible.map(async m=>renderMessage(m,profiles.get(m.sender_id),reactions.get(m.id)||[],rowMap,a.type)));
 $("waMessages").innerHTML=rendered.length?rendered.join(""):'<div class="wa-date-divider">Today</div><p class="wa-empty-list">This conversation is ready. Send the first message.</p>';
 $("waMessages").scrollTop=$("waMessages").scrollHeight;
 state.messages=visible;chatStatus("");
 bindMessageActions();
}
async function renderMessage(m,sender,reactions,rowMap,type){
 const mine=m.sender_id===state.user.id;
 let media="";
 if(m.attachment_path){
  const signed=await db.storage.from(MEDIA).createSignedUrl(m.attachment_path,3600);
  const url=signed.data?.signedUrl;
  if(url){
   if(m.message_type==="image")media='<img class="wa-message-media" src="'+esc(url)+'" alt="'+esc(m.attachment_name||"Shared image")+'" loading="lazy">';
   else if(m.message_type==="video")media='<video class="wa-message-media" src="'+esc(url)+'" controls playsinline></video>';
   else if(["audio","voice"].includes(m.message_type))media='<audio class="wa-message-audio" src="'+esc(url)+'" controls preload="none"></audio>';
   else media='<a class="wa-message-file" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">▤ '+esc(m.attachment_name||"Open document")+'</a>';
  }else media='<span class="wa-message-file">Attachment is unavailable</span>';
 }
 const parent=m.reply_to?rowMap.get(m.reply_to):null;
 const reply=parent?'<div class="wa-reply-quote">'+esc((parent.body||parent.attachment_name||"Message").slice(0,130))+'</div>':"";
 const reactionMap=new Map();reactions.forEach(r=>reactionMap.set(r.emoji,(reactionMap.get(r.emoji)||0)+1));
 const reactionHtml=[...reactionMap.entries()].map(([emoji,count])=>'<button class="wa-reaction" type="button" data-react="'+m.id+'" data-emoji="'+emoji+'">'+emoji+' '+count+'</button>').join("");
 const time=stamp(m.created_at);
 const body=m.deleted_at?'<em>This message was deleted</em>':esc(m.body||"");
 const actionButtons=m.deleted_at?"":'<div class="wa-message-actions"><button type="button" data-message-action="reply" data-message-id="'+m.id+'">Reply</button><button type="button" data-message-action="react" data-message-id="'+m.id+'">React</button>'+(mine?'<button type="button" data-message-action="edit" data-message-id="'+m.id+'">Edit</button>':'')+'<button type="button" data-message-action="delete" data-message-id="'+m.id+'">Delete</button></div>';
 const ticks=mine?(m.read_at?"✓✓":m.delivered_at?"✓✓":"✓"):"";
 return '<article class="wa-message '+(mine?"mine":"")+'" data-message-card="'+m.id+'">'+(type==="group"&&!mine?'<p class="wa-message-author">'+esc(sender?.display_name||"Reader")+'</p>':"")+reply+'<div class="wa-message-body">'+body+'</div>'+media+(m.edited_at?'<small class="wa-message-edited">edited</small>':'')+(m.pinned_at?'<small class="wa-message-edited">📌 pinned</small>':'')+(reactionHtml?'<div class="wa-message-reactions">'+reactionHtml+'</div>':"")+'<div class="wa-message-meta"><span>'+esc(time)+'</span>'+(m.edited_at?'<span>edited</span>':"")+'<span class="wa-message-tick">'+ticks+'</span></div>'+actionButtons+'</article>';
}
function bindMessageActions(){
 $("waMessages").querySelectorAll("[data-message-action]").forEach(b=>b.addEventListener("click",()=>messageAction(b.dataset.messageAction,b.dataset.messageId)));
 $("waMessages").querySelectorAll("[data-react]").forEach(b=>b.addEventListener("click",()=>toggleReaction(b.dataset.react,b.dataset.emoji)));
}
async function messageAction(action,id){
 const m=state.messages.find(x=>x.id===id);if(!m)return;
 if(action==="reply"){state.replyTo=m;$("waReplyText").textContent="Replying to: "+(m.body||m.attachment_name||"attachment").slice(0,100);$("waReplyBar").hidden=false;$("waMessageBody").focus();return;}
 if(action==="react"){const emoji=prompt("Choose a reaction: ❤️ 👍 😂 😮 😢 🙏 👏 🔥 ✨ 💚");if(emoji&&["❤️","👍","😂","😮","😢","🙏","👏","🔥","✨","💚"].includes(emoji))await toggleReaction(id,emoji);return;}
 if(action==="edit"){if(m.sender_id!==state.user.id)return;const next=prompt("Edit message",m.body||"");if(next===null)return;const rpc=state.active.type==="direct"?"edit_reader_direct_message":"edit_reader_group_message";const r=await db.rpc(rpc,{p_message_id:id,p_new_body:next});if(r.error){say(r.error.message,true);return;}await loadMessages();return;}
 if(action==="delete"){
  let everyone=false;
  if(m.sender_id===state.user.id)everyone=confirm("Delete this message for everyone? Choose Cancel to remove it only from your chat.");
  const rpc=state.active.type==="direct"?"delete_reader_direct_message":"delete_reader_group_message";
  const r=await db.rpc(rpc,{p_message_id:id,p_for_everyone:everyone});
  if(r.error){say(r.error.message,true);return;}await loadMessages();await refreshChats();
 }
}
async function toggleReaction(id,emoji){
 const direct=state.active.type==="direct",column=direct?"direct_message_id":"group_message_id";
 const existing=await db.from("reader_chat_reactions").select("id").eq(column,id).eq("user_id",state.user.id).maybeSingle();
 if(existing.data){const r=await db.from("reader_chat_reactions").delete().eq("id",existing.data.id);if(r.error)say(r.error.message,true);}
 else {const payload={user_id:state.user.id,emoji};payload[column]=id;const r=await db.from("reader_chat_reactions").insert(payload);if(r.error)say(r.error.message,true);}
 await loadMessages();
}
function clearReply(){state.replyTo=null;$("waReplyBar").hidden=true;$("waReplyText").textContent="";}
async function uploadAttachment(file,forcedType){
 if(!file)return null;
 if(file.size>15728640){say("Files must be 15 MB or smaller.",true);return null;}
 const allowed=["image/jpeg","image/png","image/webp","video/mp4","audio/webm","audio/ogg","audio/mp4","audio/mpeg","application/pdf","text/plain"];
 if(!allowed.includes(file.type)){say("This file type is not supported.",true);return null;}
 const a=state.active,folder=a.type==="direct"?"direct":"group";
 const safeName=(file.name||"attachment").replace(/[^a-zA-Z0-9._-]+/g,"_").slice(0,90);
 const path=folder+"/"+a.id+"/"+state.user.id+"/"+crypto.randomUUID()+"-"+safeName;
 const uploaded=await db.storage.from(MEDIA).upload(path,file,{contentType:file.type,upsert:false});
 if(uploaded.error){say(uploaded.error.message,true);return null;}
 let type=forcedType;
 if(!type){if(file.type.startsWith("image/"))type="image";else if(file.type.startsWith("video/"))type="video";else if(file.type.startsWith("audio/"))type="audio";else type="file";}
 return {path,name:file.name||safeName,mime:file.type,size:file.size,type};
}
async function sendPayload(body,attachment,forcedType){
 const a=state.active;if(!a)return;
 const button=$("waSendButton");button.disabled=true;
 const common={p_body:body||"",p_message_type:attachment?.type||forcedType||"text",p_attachment_path:attachment?.path||null,p_attachment_name:attachment?.name||null,p_attachment_mime:attachment?.mime||null,p_attachment_size:attachment?.size||null,p_reply_to:state.replyTo?.id||null};
 const rpc=a.type==="direct"?"send_reader_message_v2":"send_reader_group_message_v2";
 const args=a.type==="direct"?Object.assign({p_conversation_id:a.id},common):Object.assign({p_group_id:a.id},common);
 const r=await db.rpc(rpc,args);button.disabled=false;
 if(r.error){say(r.error.message,true);return;}
 $("waMessageBody").value="";clearReply();$("waAttachmentMenu").hidden=true;await loadMessages();await refreshChats();
}
async function sendComposer(event){
 event.preventDefault();const text=$("waMessageBody").value.trim();if(!text)return;
 await sendPayload(text,null,"text");
}
async function sendFile(file,forcedType){const payload=await uploadAttachment(file,forcedType);if(payload)await sendPayload("",payload,forcedType);}
async function startVoiceRecording(){
 if(state.recording){state.recording.stop();return;}
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){say("Voice recording is not supported in this browser.",true);return;}
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  const mime=MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":"audio/webm";
  const recorder=new MediaRecorder(stream,{mimeType:mime});state.recordChunks=[];state.recording=recorder;
  $("waVoiceButton").classList.add("recording");$("waVoiceButton").textContent="■";
  recorder.ondataavailable=e=>{if(e.data.size)state.recordChunks.push(e.data);};
  recorder.onstop=async()=>{
   stream.getTracks().forEach(t=>t.stop());state.recording=null;$("waVoiceButton").classList.remove("recording");$("waVoiceButton").textContent="🎙";
   const blob=new Blob(state.recordChunks,{type:recorder.mimeType||"audio/webm"});state.recordChunks=[];
   if(blob.size){const file=new File([blob],"voice-note-"+Date.now()+".webm",{type:blob.type});await sendFile(file,"voice");}
  };
  recorder.start();say("Recording voice note. Tap the microphone again to send.");
 }catch(e){say("Microphone permission is needed to record a voice note.",true);}
}
async function setPreference(key,value){
 const a=state.active;if(!a)return;
 const payload={user_id:state.user.id,thread_type:a.type,thread_id:a.id,updated_at:new Date().toISOString()};payload[key]=value;
 const r=await db.from("reader_chat_preferences").upsert(payload,{onConflict:"user_id,thread_type,thread_id"});
 if(r.error){say(r.error.message,true);return;}
 a.pref=a.pref||{};a.pref[key]=value;await refreshChats();say("Chat preference updated.");
}
async function blockCurrentReader(){
 if(!state.active||state.active.type!=="direct")return;
 if(!confirm("Block this reader? You will no longer receive message requests or messages from them."))return;
 const r=await db.from("reader_blocks").insert({blocker_id:state.user.id,blocked_id:state.active.peerId});
 if(r.error&&r.error.code!=="23505"){say(r.error.message,true);return;}
 say("Reader blocked.");state.active=null;$("waApp").classList.remove("has-chat-open");$("waEmptyState").hidden=false;$("waConversation").hidden=true;await refreshChats();
}
async function reportCurrentReader(){
 if(!state.active||state.active.type!=="direct")return;
 const reason=prompt("Why are you reporting this reader? (At least five characters)");
 if(!reason||reason.trim().length<5)return;
 const r=await db.from("reader_safety_reports").insert({reporter_id:state.user.id,reported_user_id:state.active.peerId,reason:reason.trim()});
 if(r.error){say(r.error.message,true);return;}say("Report submitted to the moderation team.");
}
async function loadGroupGrid(){
 const r=await db.from("reader_chat_group_members").select("group_id,role,reader_chat_groups(id,name,description,avatar_url,created_by,status)").eq("user_id",state.user.id);
 const rows=(r.data||[]).map(x=>x.reader_chat_groups).filter(g=>g&&g.status==="active");
 $("waGroupsGrid").innerHTML=rows.length?rows.map(g=>'<article class="wa-group-card"><span class="wa-avatar">'+(g.avatar_url?'<img src="'+esc(g.avatar_url)+'" alt="">':esc(g.name.slice(0,1)))+'</span><h3>'+esc(g.name)+'</h3><p>'+esc(g.description||"Voiceoftaade reader group")+'</p><button class="wa-primary" data-open-group="'+g.id+'" type="button">Open group</button></article>').join(""):'<div class="wa-group-card"><h3>No groups yet</h3><p>Create a reader group and invite people who share your interests.</p><button class="wa-primary" id="waCreateFirstGroup" type="button">Create your first group</button></div>';
 $("waGroupsGrid").querySelectorAll("[data-open-group]").forEach(b=>b.addEventListener("click",()=>{const item=state.allItems.find(x=>x.type==="group"&&x.id===b.dataset.openGroup);if(item){setTab("chats");openConversation("group",item.id);}}));
 $("waCreateFirstGroup")?.addEventListener("click",()=>showModal("waGroupModal",true));
}
async function openNewChat(){showModal("waNewChatModal",true);$("waReaderSearch").focus();$("waReaderResults").innerHTML='<p class="wa-empty-list">Search by reader name to send a message request.</p>';}
let groupSearchTimer=null;
async function searchReaders(inputId,hostId,mode){
 const term=$(inputId).value.trim(),host=$(hostId);if(term.length<2){host.innerHTML='<p class="wa-empty-list">Enter at least two characters.</p>';return;}
 host.innerHTML='<p class="wa-empty-list">Searching readers…</p>';
 const r=await db.rpc("search_reader_directory",{search_term:term});
 if(r.error){host.innerHTML='<p class="wa-empty-list">'+esc(r.error.message)+'</p>';return;}
 const rows=(r.data||[]).filter(p=>p.id!==state.user.id);
 if(mode==="group")host.innerHTML=rows.length?rows.map(p=>'<label class="wa-member-row"><span class="wa-avatar">'+avatar(p,p.display_name)+'</span><span>'+esc(p.display_name)+'<small>Voiceoftaade reader</small></span><input type="checkbox" data-group-member="'+p.id+'"></label>').join(""):'<p class="wa-empty-list">No readers found.</p>';
 else host.innerHTML=rows.length?rows.map(p=>'<article class="wa-search-result"><span class="wa-avatar">'+avatar(p,p.display_name)+'</span><span><strong>'+esc(p.display_name)+'</strong><small>Reader profile</small></span><a class="wa-primary" href="profile.html?id='+encodeURIComponent(p.id)+'" target="_blank" rel="noopener">Profile</a><button class="wa-secondary" data-send-request="'+p.id+'" type="button">Message</button></article>').join(""):'<p class="wa-empty-list">No readers found.</p>';
 if(mode!=="group")host.querySelectorAll("[data-send-request]").forEach(b=>b.addEventListener("click",async()=>{b.disabled=true;const sent=await db.rpc("request_reader_message",{target_user_id:b.dataset.sendRequest,initial_message:null});b.disabled=false;if(sent.error){say(sent.error.message,true);return;}b.textContent="Requested";b.disabled=true;refreshChats();}));
}
async function createGroup(event){
 event.preventDefault();const name=$("waGroupName").value.trim(),description=$("waGroupDescription").value.trim();
 const ids=[...$("waGroupMemberResults").querySelectorAll("[data-group-member]:checked")].map(x=>x.dataset.groupMember);
 if(!name){$("waGroupFeedback").textContent="Enter a group name.";return;}
 const button=event.currentTarget.querySelector('button[type="submit"]');button.disabled=true;
 const r=await db.rpc("create_reader_chat_group",{p_name:name,p_description:description,p_member_ids:ids});
 button.disabled=false;
 if(r.error){$("waGroupFeedback").textContent=r.error.message;return;}
 $("waGroupForm").reset();$("waGroupMemberResults").innerHTML="";showModal("waGroupModal",false);await refreshChats();await loadGroupGrid();setTab("chats");await openConversation("group",r.data);say("Group created.");
}
async function loadRequests(){
 const [incoming,outgoing]=await Promise.all([
  db.from("reader_message_requests").select("id,sender_id,initial_message,created_at").eq("recipient_id",state.user.id).eq("status","pending").order("created_at",{ascending:false}),
  db.from("reader_message_requests").select("id,recipient_id,created_at").eq("sender_id",state.user.id).eq("status","pending").order("created_at",{ascending:false})
 ]);
 const inc=await Promise.all((incoming.data||[]).map(async r=>({r,p:await getProfile(r.sender_id)})));
 $("waIncomingRequests").innerHTML=inc.length?inc.map(({r,p})=>'<article class="wa-request-card"><strong>'+esc(p?.display_name||"Voiceoftaade reader")+'</strong><small>'+esc(relative(r.created_at))+'</small>'+(r.initial_message?'<p>'+esc(r.initial_message)+'</p>':'')+'<div class="wa-request-actions"><button class="wa-primary" type="button" data-request-decision="'+r.id+'" data-decision="accepted">Accept</button><button class="wa-secondary" type="button" data-request-decision="'+r.id+'" data-decision="declined">Decline</button></div></article>').join(""):'<p class="wa-empty-list">No incoming requests.</p>';
 const out=await Promise.all((outgoing.data||[]).map(async r=>({r,p:await getProfile(r.recipient_id)})));
 $("waOutgoingRequests").innerHTML=out.length?out.map(({r,p})=>'<article class="wa-request-card"><strong>'+esc(p?.display_name||"Reader")+'</strong><p>Waiting for acceptance · '+esc(relative(r.created_at))+'</p></article>').join(""):'<p class="wa-empty-list">No pending requests sent.</p>';
 $("waRequestModal").querySelectorAll("[data-request-decision]").forEach(b=>b.addEventListener("click",async()=>{b.disabled=true;const r=await db.rpc("respond_reader_message_request",{request_id:b.dataset.requestDecision,decision:b.dataset.decision});b.disabled=false;if(r.error){say(r.error.message,true);return;}say(b.dataset.decision==="accepted"?"Request accepted.":"Request declined.");await refreshChats();await loadRequests();if(r.data&&b.dataset.decision==="accepted"){showModal("waRequestModal",false);await openConversation("direct",r.data);}}));
}
async function loadStatuses(){
 const r=await db.from("reader_chat_statuses").select("id,user_id,caption,media_path,media_mime,visibility,created_at,expires_at").gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(100);
 const rows=r.data||[],unique=[...new Set(rows.map(x=>x.user_id))],people=new Map();
 await Promise.all(unique.map(async id=>people.set(id,await getProfile(id))));
 $("waStatusList").innerHTML=rows.length?rows.map(s=>'<button class="wa-status-row" type="button" data-status-id="'+s.id+'"><span class="wa-avatar wa-status-ring">'+avatar(people.get(s.user_id),people.get(s.user_id)?.display_name)+'</span><span><strong>'+esc(people.get(s.user_id)?.display_name||"Reader")+'</strong><small>'+esc(s.caption||"Photo update")+' · '+esc(relative(s.created_at))+'</small></span></button>').join(""):'<p class="wa-empty-list">No recent updates. Share the first one.</p>';
 $("waStatusList").querySelectorAll("[data-status-id]").forEach(b=>b.addEventListener("click",()=>viewStatus(b.dataset.statusId,rows)));
}
async function viewStatus(id,rows){
 const s=rows.find(x=>x.id===id);if(!s)return;
 await db.from("reader_chat_status_views").upsert({status_id:id,viewer_id:state.user.id},{onConflict:"status_id,viewer_id"});
 let extra="";
 if(s.media_path){const u=await db.storage.from(MEDIA).createSignedUrl(s.media_path,3600);if(u.data?.signedUrl)extra='<img class="wa-status-preview" src="'+esc(u.data.signedUrl)+'" alt="Reader update">';}
 alert((s.caption||"Reader update")+(extra?"":"")+"

This update is available for 24 hours.");
}
async function createStatus(event){
 event.preventDefault();const caption=$("waStatusText").value.trim(),file=$("waStatusFile").files[0],visibility=$("waStatusVisibility").value;
 if(!caption&&!file){$("waStatusFeedback").textContent="Write a short update or add a photo.";return;}
 let media_path=null,media_mime=null;
 if(file){if(file.size>15728640){$("waStatusFeedback").textContent="Photo must be 15 MB or smaller.";return;}const path="status/"+state.user.id+"/"+crypto.randomUUID()+"-"+file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const upload=await db.storage.from(MEDIA).upload(path,file,{contentType:file.type});if(upload.error){$("waStatusFeedback").textContent=upload.error.message;return;}media_path=path;media_mime=file.type;}
 const r=await db.from("reader_chat_statuses").insert({user_id:state.user.id,caption,media_path,media_mime,visibility,expires_at:new Date(Date.now()+24*60*60*1000).toISOString()});
 if(r.error){$("waStatusFeedback").textContent=r.error.message;return;}
 $("waStatusForm").reset();$("waStatusFeedback").textContent="Update shared.";await loadStatuses();
}
async function showChatInfo(){
 const a=state.active;if(!a)return;
 let markup="";
 if(a.type==="direct"){
  markup='<div class="wa-chat-info"><span class="wa-avatar">'+avatar(a.peer,a.name)+'</span><span><strong>'+esc(a.name)+'</strong><small>Private one-to-one conversation</small></span></div><p class="wa-app-status">Only you and this reader can see messages in this conversation.</p>';
 }else{
  const group=await db.from("reader_chat_groups").select("name,description,created_by,created_at").eq("id",a.id).single();
  const members=await db.from("reader_chat_group_members").select("user_id,role,joined_at").eq("group_id",a.id).order("joined_at",{ascending:true});
  const memberRows=await Promise.all((members.data||[]).map(async m=>({m,p:await getProfile(m.user_id)})));
  markup='<h3>'+esc(group.data?.name||a.name)+'</h3><p>'+esc(group.data?.description||"")+'</p><p class="wa-app-status">'+memberRows.length+' members</p>'+memberRows.map(({m,p})=>'<div class="wa-member-row"><span class="wa-avatar">'+avatar(p,p?.display_name)+'</span><span>'+esc(p?.display_name||"Reader")+'<small>'+esc(m.role)+'</small></span></div>').join("")+(a.role==="admin"?'<button class="wa-primary" id="waAddGroupMembers" type="button">Add members</button>':"");
 }
 $("waChatInfoBody").innerHTML=markup;showModal("waChatInfoModal",true);
 $("waAddGroupMembers")?.addEventListener("click",()=>{showModal("waChatInfoModal",false);state.addToGroup=a.id;$("waGroupTitle").textContent="Add group members";$("waGroupForm").dataset.mode="add";$("waGroupName").hidden=true;$("waGroupDescription").hidden=true;showModal("waGroupModal",true);});
}
async function loadCalls(){
 const r=await db.from("reader_chat_calls").select("id,conversation_id,caller_id,recipient_id,call_type,status,created_at,ended_at").or("caller_id.eq."+state.user.id+",recipient_id.eq."+state.user.id).order("created_at",{ascending:false}).limit(50);
 const rows=r.data||[],peerIds=[...new Set(rows.map(x=>x.caller_id===state.user.id?x.recipient_id:x.caller_id))],profiles=new Map();
 await Promise.all(peerIds.map(async id=>profiles.set(id,await getProfile(id))));
 $("waCallList").innerHTML=rows.length?rows.map(c=>{const p=profiles.get(c.caller_id===state.user.id?c.recipient_id:c.caller_id),incoming=c.recipient_id===state.user.id;return '<article class="wa-call-row"><span class="wa-avatar">'+avatar(p,p?.display_name)+'</span><span style="flex:1;min-width:0"><strong>'+esc(p?.display_name||"Reader")+'</strong><small>'+(incoming?"Incoming":"Outgoing")+' '+esc(c.call_type)+' call · '+esc(c.status)+' · '+esc(relative(c.created_at))+'</small></span><button class="wa-secondary" type="button" data-call-again="'+c.conversation_id+'">Call</button></article>';}).join(""):'<p class="wa-empty-list">No calls yet. Start an audio or video call from a private chat.</p>';
 $("waCallList").querySelectorAll("[data-call-again]").forEach(b=>b.addEventListener("click",()=>{const item=state.allItems.find(x=>x.type==="direct"&&x.id===b.dataset.callAgain);if(item){setTab("chats");openConversation("direct",item.id);setTimeout(()=>startCall("audio"),300);}}));
}
function toastCall(text){$("waCallSubtitle").textContent=text;}
async function startCall(callType){
 if(!state.active||state.active.type!=="direct"){say("Calls are currently one-to-one only.");return;}
 const r=await db.rpc("start_reader_call",{p_conversation_id:state.active.id,p_call_type:callType});
 if(r.error){say(r.error.message,true);return;}
 state.call={id:r.data,conversationId:state.active.id,peerId:state.active.peerId,type:callType,role:"caller"};
 showCallOverlay("Calling "+state.active.name+"…",false);
 await connectCall(true);
}
function showCallOverlay(title,incoming){
 $("waCallTitle").textContent=title;$("waCallOverlay").hidden=false;
 $("waAcceptCall").hidden=!incoming;$("waDeclineCall").hidden=!incoming;$("waEndCall").hidden=incoming;
 $("waCallMute").hidden=incoming;$("waCallCamera").hidden=incoming;
}
async function connectCall(initiator){
 try{
  const video=state.call.type==="video";
  state.localStream=await navigator.mediaDevices.getUserMedia({audio:true,video:video});
  $("waLocalVideo").srcObject=state.localStream;$("waLocalVideo").muted=true;
  state.rtc=new RTCPeerConnection({iceServers:[{urls:["stun:stun.l.google.com:19302","stun:stun1.l.google.com:19302"]}]});
  state.remoteStream=new MediaStream();$("waRemoteVideo").srcObject=state.remoteStream;
  state.localStream.getTracks().forEach(track=>state.rtc.addTrack(track,state.localStream));
  state.rtc.ontrack=e=>{e.streams[0].getTracks().forEach(t=>state.remoteStream.addTrack(t));$("waRemoteVideo").play().catch(()=>{});};
  state.rtc.onicecandidate=e=>{if(e.candidate)sendCallSignal("ice",e.candidate.toJSON());};
  state.rtc.onconnectionstatechange=()=>{if(state.rtc?.connectionState==="connected")toastCall("Connected · "+state.call.type+" call");if(["failed","disconnected"].includes(state.rtc?.connectionState))toastCall("Connection interrupted. You may need a stronger network or TURN relay.");};
  await subscribeCallSignals();
  if(initiator){const offer=await state.rtc.createOffer();await state.rtc.setLocalDescription(offer);await sendCallSignal("offer",offer);}
  else{
   const offers=await db.from("reader_chat_call_signals").select("payload").eq("call_id",state.call.id).eq("signal_type","offer").order("created_at",{ascending:false}).limit(1);
   if(!offers.data?.[0])throw new Error("The caller's connection request could not be found.");
   await state.rtc.setRemoteDescription(new RTCSessionDescription(offers.data[0].payload));
   const answer=await state.rtc.createAnswer();await state.rtc.setLocalDescription(answer);await sendCallSignal("answer",answer);
   for(const candidate of state.queuedIce.splice(0))await state.rtc.addIceCandidate(new RTCIceCandidate(candidate));
  }
 }catch(e){toastCall(e.message||"Microphone or camera permission is required.");if(state.call?.id)await db.rpc("end_reader_call",{p_call_id:state.call.id,p_status:"failed"});cleanupCall();}
}
async function subscribeCallSignals(){
 if(state.signalChannel){await db.removeChannel(state.signalChannel);state.signalChannel=null;}
 const ch=db.channel("wa-call-signals-"+state.call.id);
 ch.on("postgres_changes",{event:"INSERT",schema:"public",table:"reader_chat_call_signals",filter:"call_id=eq."+state.call.id},async payload=>{
  const s=payload.new;if(!s||s.sender_id===state.user.id)return;
  if(s.signal_type==="answer"&&state.call.role==="caller"){await state.rtc.setRemoteDescription(new RTCSessionDescription(s.payload));for(const c of state.queuedIce.splice(0))await state.rtc.addIceCandidate(new RTCIceCandidate(c));}
  else if(s.signal_type==="ice"){if(state.rtc.remoteDescription)await state.rtc.addIceCandidate(new RTCIceCandidate(s.payload));else state.queuedIce.push(s.payload);}
  else if(s.signal_type==="hangup"){toastCall("The other reader ended the call.");cleanupCall();}
 });
 await new Promise(resolve=>ch.subscribe(status=>{if(status==="SUBSCRIBED")resolve();if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")resolve();}));
 state.signalChannel=ch;
}
async function sendCallSignal(type,payload){
 const r=await db.from("reader_chat_call_signals").insert({call_id:state.call.id,sender_id:state.user.id,signal_type:type,payload});
 if(r.error)say(r.error.message,true);
}
async function acceptIncomingCall(){
 const c=state.pendingCall;if(!c)return;
 const r=await db.rpc("respond_reader_call",{p_call_id:c.id,p_decision:"accepted"});
 if(r.error){say(r.error.message,true);cleanupCall();return;}
 state.call={id:c.id,conversationId:c.conversation_id,peerId:c.caller_id,type:c.call_type,role:"recipient"};
 state.pendingCall=null;showCallOverlay("Connecting to reader…",false);await connectCall(false);
}
async function endCurrentCall(status){
 const call=state.call;if(!call)return;
 try{await sendCallSignal("hangup",{status:status||"ended"});await db.rpc("end_reader_call",{p_call_id:call.id,p_status:status||"ended"});}catch(_){}
 cleanupCall();loadCalls();
}
function cleanupCall(){
 if(state.rtc){state.rtc.ontrack=null;state.rtc.close();state.rtc=null;}
 if(state.localStream){state.localStream.getTracks().forEach(t=>t.stop());state.localStream=null;}
 if(state.remoteStream){state.remoteStream.getTracks().forEach(t=>t.stop());state.remoteStream=null;}
 if(state.signalChannel){db.removeChannel(state.signalChannel);state.signalChannel=null;}
 $("waLocalVideo").srcObject=null;$("waRemoteVideo").srcObject=null;$("waCallOverlay").hidden=true;
 state.call=null;state.pendingCall=null;state.queuedIce=[];
}
function handleIncomingCall(call){
 if(state.call||state.pendingCall)return;
 state.pendingCall=call;
 const peer=getProfile(call.caller_id);
 Promise.resolve(peer).then(p=>{showCallOverlay((p?.display_name||"Reader")+" is calling…",true);state.call={id:call.id,conversationId:call.conversation_id,peerId:call.caller_id,type:call.call_type,role:"recipient"};});
}
async function checkIncomingCalls(){
 const r=await db.from("reader_chat_calls").select("id,conversation_id,caller_id,recipient_id,call_type,status,created_at").eq("recipient_id",state.user.id).eq("status","ringing").order("created_at",{ascending:false}).limit(1);
 if(r.data?.[0]&&Date.now()-new Date(r.data[0].created_at).getTime()<120000)handleIncomingCall(r.data[0]);
 if(state.incomingChannel)await db.removeChannel(state.incomingChannel);
 state.incomingChannel=db.channel("wa-incoming-calls-"+state.user.id).on("postgres_changes",{event:"INSERT",schema:"public",table:"reader_chat_calls",filter:"recipient_id=eq."+state.user.id},payload=>handleIncomingCall(payload.new)).subscribe();
}
async function declineIncomingCall(){
 const c=state.pendingCall||state.call;if(!c)return;
 await db.rpc("respond_reader_call",{p_call_id:c.id,p_decision:"declined"});
 cleanupCall();loadCalls();
}
function bindEvents(){
 document.querySelectorAll("[data-wa-tab]").forEach(b=>b.addEventListener("click",()=>{setTab(b.dataset.waTab);}));
 document.querySelectorAll("[data-wa-filter]").forEach(b=>b.addEventListener("click",()=>{state.filter=b.dataset.waFilter;document.querySelectorAll("[data-wa-filter]").forEach(x=>x.classList.toggle("active",x===b));renderChatList();}));
 $("waChatSearch").addEventListener("input",renderChatList);
 $("waNewChatButton").addEventListener("click",openNewChat);
 $("waNewGroupButton").addEventListener("click",()=>{state.addToGroup=null;$("waGroupTitle").textContent="Create a group";$("waGroupName").hidden=false;$("waGroupDescription").hidden=false;$("waGroupForm").dataset.mode="create";showModal("waGroupModal",true);});
 $("waCommunityNewGroup").addEventListener("click",()=>$("waNewGroupButton").click());
 $("waGroupForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if($("waGroupForm").dataset.mode==="add"){const ids=[...$("waGroupMemberResults").querySelectorAll("[data-group-member]:checked")].map(x=>x.dataset.groupMember);for(const id of ids){const r=await db.rpc("add_reader_chat_group_member",{p_group_id:state.addToGroup,p_target_user_id:id});if(r.error){say(r.error.message,true);break;}}showModal("waGroupModal",false);await refreshChats();return;}
  await createGroup(e);
 });
 $("waGroupMemberSearch").addEventListener("input",()=>{clearTimeout(groupSearchTimer);groupSearchTimer=setTimeout(()=>searchReaders("waGroupMemberSearch","waGroupMemberResults","group"),250);});
 $("waReaderSearch").addEventListener("input",()=>{clearTimeout(groupSearchTimer);groupSearchTimer=setTimeout(()=>searchReaders("waReaderSearch","waReaderResults","direct"),250);});
 $("waRequestsButton").addEventListener("click",async()=>{await loadRequests();showModal("waRequestModal",true);});
 $("waComposer").addEventListener("submit",sendComposer);
 $("waClearReply").addEventListener("click",clearReply);
 $("waVoiceButton").addEventListener("click",startVoiceRecording);
 $("waAttachButton").addEventListener("click",()=>$("waAttachMenu").hidden=!$("waAttachMenu").hidden);
 $("waAttachMenu").querySelectorAll("[data-attach]").forEach(b=>b.addEventListener("click",()=>{$("waAttachMenu").hidden=true;$("waAttachmentInput").click();}));
 $("waAttachmentInput").addEventListener("change",async e=>{const file=e.target.files?.[0];if(file)await sendFile(file);e.target.value="";});
 $("waEmojiButton").addEventListener("click",()=>{$("waMessageBody").value+=" 🙂";$("waMessageBody").focus();});
 $("waBackToChats").addEventListener("click",()=>{$("waApp").classList.remove("has-chat-open");document.body.classList.remove("wa-app-chat-open");$("waConversation").hidden=true;$("waEmptyState").hidden=false;state.active=null;refreshChats();});
 $("waChatMenuButton").addEventListener("click",()=>{$("waChatMenu").hidden=!$("waChatMenu").hidden;});
 $("waChatMenu").querySelectorAll("[data-chat-action]").forEach(b=>b.addEventListener("click",async()=>{
  $("waChatMenu").hidden=true;const action=b.dataset.chatAction,a=state.active;if(!a)return;
  if(action==="info"){await showChatInfo();return;}
  if(action==="pin"){await setPreference("is_pinned",!a.pref.is_pinned);return;}
  if(action==="favorite"){await setPreference("is_favorite",!a.pref.is_favorite);return;}
  if(action==="mute"){await setPreference("muted_until",new Date(Date.now()+8*60*60*1000).toISOString());return;}
  if(action==="archive"){await setPreference("is_archived",true);$("waBackToChats").click();return;}
  if(action==="leave"&&a.type==="group"){if(confirm("Leave this group?")){const r=await db.rpc("leave_reader_chat_group",{p_group_id:a.id});if(r.error)say(r.error.message,true);else{$("waBackToChats").click();say("You left the group.");}}return;}
  if(action==="block")await blockCurrentReader();if(action==="report")await reportCurrentReader();
 }));
 $("waChatSearchButton").addEventListener("click",()=>{const q=prompt("Search messages in this chat");if(!q)return;const found=state.messages.find(x=>(x.body||"").toLowerCase().includes(q.toLowerCase()));if(!found){say("No matching messages in the recent chat history.");return;}document.querySelector('[data-message-card="'+found.id+'"]')?.scrollIntoView({behavior:"smooth",block:"center"});});
 $("waStatusAttach").addEventListener("click",()=>$("waStatusFile").click());
 $("waStatusForm").addEventListener("submit",createStatus);
 $("waRefreshUpdates").addEventListener("click",loadStatuses);$("waRefreshCalls").addEventListener("click",loadCalls);
 $("waChatInfoModal").querySelector("[data-modal-close]").addEventListener("click",()=>showModal("waChatInfoModal",false));
 document.querySelectorAll("[data-modal-close]").forEach(b=>b.addEventListener("click",()=>showModal(b.dataset.modalClose,false)));
 $("waAudioCallButton").addEventListener("click",()=>startCall("audio"));$("waVideoCallButton").addEventListener("click",()=>startCall("video"));
 $("waCallEnd").addEventListener("click",()=>endCurrentCall("ended"));$("waAcceptCall").addEventListener("click",acceptIncomingCall);$("waDeclineCall").addEventListener("click",declineIncomingCall);
 $("waCallMute").addEventListener("click",()=>{if(!state.localStream)return;const track=state.localStream.getAudioTracks()[0];if(track){track.enabled=!track.enabled;$("waCallMute").textContent=track.enabled?"🎙":"🔇";}});
 $("waCallCamera").addEventListener("click",()=>{if(!state.localStream)return;const track=state.localStream.getVideoTracks()[0];if(track){track.enabled=!track.enabled;$("waCallCamera").textContent=track.enabled?"▣":"◻";}});
 $("waListMenuButton").addEventListener("click",()=>{const archived=state.filter==="archived";state.filter=archived?"all":"archived";document.querySelectorAll("[data-wa-filter]").forEach(x=>x.classList.toggle("active",x.dataset.waFilter===state.filter));renderChatList();});
 $("waRailSettings").addEventListener("click",()=>location.href="account.html#profile-settings");
 document.addEventListener("keydown",e=>{if(e.key==="Escape"){document.querySelectorAll(".wa-modal-backdrop").forEach(x=>x.hidden=true);$("waAttachMenu").hidden=true;$("waChatMenu").hidden=true;}});
 $("waMessageBody").addEventListener("input",()=>{if(state.channel&&state.active)state.channel.send({type:"broadcast",event:"typing",payload:{user_id:state.user.id}});});
}
async function init(){
 if(!db){$("waLoginRequired").hidden=false;return;}
 const session=await db.auth.getSession();state.user=session.data?.session?.user||null;
 if(!state.user){$("waLoginRequired").hidden=false;return;}
 $("waApp").hidden=false;bindEvents();await refreshChats();await loadGroupGrid();checkIncomingCalls();
 const params=new URLSearchParams(location.search),conversation=params.get("conversation"),group=params.get("group");
 if(conversation)openConversation("direct",conversation);else if(group)openConversation("group",group);
 db.auth.onAuthStateChange((_event,s)=>{if(!s?.user)location.href="account.html";});
}
window.addEventListener("beforeunload",()=>{if(state.channel)db.removeChannel(state.channel);if(state.incomingChannel)db.removeChannel(state.incomingChannel);if(state.signalChannel)db.removeChannel(state.signalChannel);if(state.localStream)state.localStream.getTracks().forEach(t=>t.stop());if(state.rtc)state.rtc.close();});
init().catch(e=>{console.error(e);say("Messaging could not start: "+(e.message||"Please refresh."),true);});
})();