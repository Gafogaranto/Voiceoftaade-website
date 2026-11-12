(()=>{"use strict";
const db=window.supabase?.createClient("https://qnnmbngxunmjerpeoxrr.supabase.co","sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67"),$=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const initials=n=>(String(n||"V").trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase()||"V");
const ago=v=>{const m=Math.floor((Date.now()-new Date(v).getTime())/60000);return m<1?"Just now":m<60?m+"m ago":m<1440?Math.floor(m/60)+"h ago":new Date(v).toLocaleDateString([],{month:"short",day:"numeric"});};
let user=null,filter="for-you",offset=0,limit=12,hasMore=true,loading=false,profiles=new Map(),liked=new Set(),cache=[],selectedBlob=null,selectedName="",previewUrl=null,sourceImage=null,editState={rotation:0,flip:false,brightness:100,contrast:100,saturation:100,ratio:"original"};
const avatar=p=>'<span class="reader-avatar">'+(p?.avatar_url?'<img src="'+esc(p.avatar_url)+'" alt="">':esc(initials(p?.display_name)))+'</span>';
function say(s,bad=false){$("postFeedback").textContent=s;$("postFeedback").style.color=bad?"#a34d42":"#315f4e";}
function safeRichHtml(html){
 const doc=new DOMParser().parseFromString("<div>"+String(html||"")+"</div>","text/html"),root=doc.body.firstElementChild;
 const allowed=new Set(["P","DIV","BR","STRONG","B","EM","I","H2","H3","UL","OL","LI","BLOCKQUOTE","A"]);
 const clean=node=>{[...node.childNodes].forEach(child=>{if(child.nodeType===Node.COMMENT_NODE){child.remove();return;}if(child.nodeType!==Node.ELEMENT_NODE)return;if(!allowed.has(child.tagName)){clean(child);child.replaceWith(...child.childNodes);return;}const rawHref=child.tagName==="A"?(child.getAttribute("href")||""):"";[...child.attributes].forEach(a=>child.removeAttribute(a.name));if(child.tagName==="A"){const safe=rawHref.startsWith("https://")||rawHref.startsWith("http://")||rawHref.startsWith("mailto:");if(safe){child.setAttribute("href",rawHref);child.setAttribute("target","_blank");child.setAttribute("rel","noopener noreferrer");}}clean(child);});};
 clean(root);return root.innerHTML;
}
function plainText(html){const d=new DOMParser().parseFromString(String(html||""),"text/html");d.body.querySelectorAll("br").forEach(n=>n.replaceWith(d.createTextNode("\n")));d.body.querySelectorAll("p,div,h2,h3,li,blockquote").forEach(n=>n.append(d.createTextNode("\n")));return(d.body.textContent||"").replace(/\u00a0/g," ").replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();}
function editorHtml(){return safeRichHtml($("postEditor").innerHTML);}
function countText(){const n=plainText($("postEditor").innerHTML).length;$("postCount").textContent=n.toLocaleString()+" / 12,000";return n;}
async function getProfiles(ids){const missing=[...new Set(ids)].filter(id=>id&&!profiles.has(id));if(missing.length){const results=await Promise.all(missing.map(id=>db.rpc("get_public_reader_profile_card",{target_user_id:id})));results.forEach(r=>{const p=Array.isArray(r.data)?r.data[0]:r.data;if(p?.id)profiles.set(p.id,p);});}return profiles;}
async function signedImage(path){if(!path)return null;const r=await db.storage.from("reader-feed-images").createSignedUrl(path,3600);return r.error?null:r.data?.signedUrl||null;}
function card(p){
 const a=profiles.get(p.author_id)||{},n=p.like_count||0,c=p.comment_count||0,on=liked.has(p.id),type=p.post_type||"note",label=type==="article"?"ARTICLE":type==="image"?"IMAGE":"NOTE";
 const content=p.content_html?safeRichHtml(p.content_html):esc(p.body||"").replace(/\n/g,"<br>");
 const media=p.image_url?'<figure class="feed-post-media"><img src="'+esc(p.image_url)+'" alt="'+esc(p.caption||p.title||"Reader image")+'" loading="lazy">'+(p.caption?'<figcaption>'+esc(p.caption)+'</figcaption>':"")+'</figure>':"";
 return '<article class="feed-post-card" id="post-'+p.id+'"><div class="post-author">'+avatar(a)+'<div class="post-author-info"><a href="profile.html?id='+encodeURIComponent(p.author_id)+'">'+esc(a.display_name||"Voiceoftaade reader")+'</a><span>'+ago(p.created_at)+'</span></div><span class="post-kind">'+label+'</span><span class="post-audience">'+(p.visibility==="followers"?"Followers":"Public")+'</span></div>'+(p.title?'<h3 class="post-title">'+esc(p.title)+'</h3>':"")+(content?'<div class="post-body">'+content+'</div>':"")+media+'<div class="post-actions"><button class="post-action '+(on?"is-liked":"")+'" data-action="like" data-id="'+p.id+'">'+(on?"♥":"♡")+' '+n+' Like</button><button class="post-action" data-action="comments" data-id="'+p.id+'">◯ '+c+' Comments</button><button class="post-action" data-action="share" data-id="'+p.id+'">↗ Share</button></div><section class="post-comments" id="comments-'+p.id+'" hidden><div class="comment-list" id="comment-list-'+p.id+'"></div><form class="comment-form" data-post="'+p.id+'"><input name="comment" maxlength="3000" placeholder="Write a thoughtful reply…" required><button type="submit">Reply</button></form></section></article>';
}
async function enrich(rows){
 if(!rows.length)return rows;await getProfiles(rows.map(x=>x.author_id));const ids=rows.map(x=>x.id),[l,c,m]=await Promise.all([db.from("reader_feed_likes").select("post_id").in("post_id",ids),db.from("reader_feed_comments").select("post_id").in("post_id",ids),user?db.from("reader_feed_likes").select("post_id").eq("user_id",user.id).in("post_id",ids):Promise.resolve({data:[]})]);
 const lc={},cc={};(l.data||[]).forEach(x=>lc[x.post_id]=(lc[x.post_id]||0)+1);(c.data||[]).forEach(x=>cc[x.post_id]=(cc[x.post_id]||0)+1);(m.data||[]).forEach(x=>liked.add(x.post_id));
 return Promise.all(rows.map(async p=>({...p,like_count:lc[p.id]||0,comment_count:cc[p.id]||0,image_url:p.image_path?await signedImage(p.image_path):null})));
}
async function load(reset=false){
 if(loading)return;loading=true;if(reset){offset=0;hasMore=true;cache=[];$("feedPosts").innerHTML='<p class="feed-loading">Gathering reader voices…</p>';}
 $("feedHeading").textContent=filter==="following"?"Following":filter==="latest"?"Latest":"For you";
 let q=db.from("reader_feed_posts").select("*").order("created_at",{ascending:false}).range(offset,offset+limit-1);
 if(filter==="following"){if(!user){$("feedPosts").innerHTML='<p class="feed-empty">Sign in to build your following feed.</p>';loading=false;return;}const f=await db.from("reader_follows").select("followed_id").eq("follower_id",user.id),ids=(f.data||[]).map(x=>x.followed_id);if(!ids.length){$("feedPosts").innerHTML='<p class="feed-empty">Follow readers to build this feed. Explore For you in the meantime.</p>';loading=false;return;}q=q.in("author_id",ids);}
 const r=await q;if(r.error){$("feedPosts").innerHTML='<p class="feed-empty">Could not load posts: '+esc(r.error.message)+'</p>';loading=false;return;}
 const rows=await enrich(r.data||[]);if(filter==="for-you")rows.sort((a,b)=>(b.like_count+b.comment_count)-(a.like_count+a.comment_count)||new Date(b.created_at)-new Date(a.created_at));cache.push(...rows);hasMore=rows.length===limit;offset+=rows.length;if(reset)$("feedPosts").innerHTML="";
 if(!rows.length&&reset)$("feedPosts").innerHTML='<p class="feed-empty">No posts yet. Be the first to publish something thoughtful.</p>';else $("feedPosts").insertAdjacentHTML("beforeend",rows.map(card).join(""));
 $("loadMorePosts").hidden=!hasMore;loading=false;
}
async function comments(id){
 const box=$("comments-"+id),list=$("comment-list-"+id);box.hidden=false;list.innerHTML='<span class="feed-muted">Loading replies…</span>';
 const r=await db.from("reader_feed_comments").select("*").eq("post_id",id).order("created_at").limit(30);if(r.error){list.textContent=r.error.message;return;}await getProfiles((r.data||[]).map(x=>x.author_id));
 list.innerHTML=(r.data||[]).map(c=>{const p=profiles.get(c.author_id)||{};return '<div class="feed-comment">'+avatar(p)+'<div><strong>'+esc(p.display_name||"Reader")+'</strong><p>'+esc(c.body)+'</p></div></div>';}).join("")||'<span class="feed-muted">No replies yet. Start the conversation.</span>';
}
async function suggestions(){$("suggestedReaders").innerHTML='<span class="feed-muted">Open a writer’s profile from any post to follow their work and see more in your Following feed.</span>';}
function setPostType(){
 const type=$("postType").value,isImage=type==="image",isArticle=type==="article";
 $("richEditorWrap").hidden=isImage;$("postTitle").hidden=isImage;if(isImage)$("postTitle").value="";$("postTitle").placeholder=isArticle?"Article headline":"Title (optional for a note)";
 $("editorTypeHint").textContent=isImage?"Share an image with an optional caption.":isArticle?"A longer piece with headings and subheadings.":"A quick thought or reflection.";
 $("publishPost").textContent=isImage?"Publish image":isArticle?"Publish article":"Publish note";
 if(isImage&&!selectedBlob){$("postImageInput").click();}
}
function resetEdits(){editState={rotation:0,flip:false,brightness:100,contrast:100,saturation:100,ratio:"original"};}
function updateEditorPreview(){
 if(!sourceImage)return;const img=$("imageEditorPreview");img.style.filter="brightness("+editState.brightness+"%) contrast("+editState.contrast+"%) saturate("+editState.saturation+"%)";img.style.transform="rotate("+editState.rotation+"deg) scaleX("+(editState.flip?-1:1)+")";
 const ratios={"original":null,"1:1":"1 / 1","4:5":"4 / 5","16:9":"16 / 9"};$("imageEditorPreviewWrap").style.aspectRatio=ratios[editState.ratio]||"auto";
 $("brightnessValue").textContent=editState.brightness+"%";$("contrastValue").textContent=editState.contrast+"%";$("saturationValue").textContent=editState.saturation+"%";
}
function openImageEditor(){if(!sourceImage)return;$("imageEditorModal").hidden=false;updateEditorPreview();document.body.classList.add("image-editor-open");}
function closeImageEditor(){$("imageEditorModal").hidden=true;document.body.classList.remove("image-editor-open");}
async function renderEditedImage(){
 if(!sourceImage)return null;const img=sourceImage,rot=((editState.rotation%360)+360)%360,ow=rot%180?img.naturalHeight:img.naturalWidth,oh=rot%180?img.naturalWidth:img.naturalHeight;
 let cw=ow,ch=oh;if(editState.ratio!=="original"){const [rw,rh]=editState.ratio.split(":").map(Number),ratio=rw/rh;if(cw/ch>ratio)cw=ch*ratio;else ch=cw/ratio;}
 const scale=Math.min(1,1600/Math.max(cw,ch)),outW=Math.max(1,Math.round(cw*scale)),outH=Math.max(1,Math.round(ch*scale));
 const canvas=document.createElement("canvas");canvas.width=outW;canvas.height=outH;const ctx=canvas.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,outW,outH);ctx.translate(outW/2,outH/2);ctx.scale(scale,scale);ctx.rotate(rot*Math.PI/180);ctx.scale(editState.flip?-1:1,1);ctx.filter="brightness("+editState.brightness+"%) contrast("+editState.contrast+"%) saturate("+editState.saturation+"%)";ctx.drawImage(img,-img.naturalWidth/2,-img.naturalHeight/2);
 return new Promise(resolve=>canvas.toBlob(b=>resolve(b),"image/webp",.88));
}
function showImagePreview(blob,name){
 if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(blob);selectedBlob=blob;selectedName=name||"Edited image.webp";
 $("imagePreview").src=previewUrl;$("imagePreviewName").textContent=selectedName;$("imagePreviewCard").hidden=false;
}
$("postType").addEventListener("change",setPostType);
$("postEditor").addEventListener("input",countText);
$("postEditor").addEventListener("paste",e=>{e.preventDefault();const t=(e.clipboardData||window.clipboardData).getData("text/plain");document.execCommand("insertText",false,t);});
document.querySelectorAll("[data-format]").forEach(b=>b.addEventListener("click",()=>{$("postEditor").focus();const f=b.dataset.format;if(f==="bold"||f==="italic")document.execCommand(f,false,null);else if(f==="h2"||f==="h3"||f==="p")document.execCommand("formatBlock",false,f);else if(f==="ul")document.execCommand("insertUnorderedList",false,null);else if(f==="ol")document.execCommand("insertOrderedList",false,null);else if(f==="quote")document.execCommand("formatBlock",false,"blockquote");countText();}));
$("postImageInput").addEventListener("change",e=>{
 const file=e.target.files?.[0];if(!file)return;if(!["image/jpeg","image/png","image/webp"].includes(file.type)){say("Choose a JPG, PNG or WebP image only.",true);e.target.value="";return;}if(file.size>8*1024*1024){say("This image is larger than 8 MB. Choose a smaller image.",true);e.target.value="";return;}
 selectedBlob=null;$("imagePreviewCard").hidden=true;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;
 const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{sourceImage=img;selectedName=file.name;resetEdits();openImageEditor();};img.onerror=()=>say("This image could not be opened.",true);img.src=reader.result;};reader.readAsDataURL(file);
});
["imageBrightness","imageContrast","imageSaturation"].forEach(id=>$(id).addEventListener("input",()=>{editState[id==="imageBrightness"?"brightness":id==="imageContrast"?"contrast":"saturation"]=Number($(id).value);updateEditorPreview();}));
$("imageCropRatio").addEventListener("change",()=>{editState.ratio=$("imageCropRatio").value;updateEditorPreview();});
$("rotateImageButton").addEventListener("click",()=>{editState.rotation=(editState.rotation+90)%360;updateEditorPreview();});
$("flipImageButton").addEventListener("click",()=>{editState.flip=!editState.flip;updateEditorPreview();});
$("resetImageEdits").addEventListener("click",()=>{resetEdits();$("imageCropRatio").value="original";$("imageBrightness").value=$("imageContrast").value=$("imageSaturation").value=100;updateEditorPreview();});
$("closeImageEditor").addEventListener("click",closeImageEditor);$("cancelImageEdits").addEventListener("click",closeImageEditor);$("imageEditorModal").addEventListener("click",e=>{if(e.target.hasAttribute("data-close-image-editor"))closeImageEditor();});
$("applyImageEdits").addEventListener("click",async()=>{const b=$("applyImageEdits");b.disabled=true;b.textContent="Applying…";try{const blob=await renderEditedImage();if(!blob)throw new Error("Image editing failed.");showImagePreview(blob,selectedName.replace(/\.[^.]+$/,"")+".webp");closeImageEditor();say("Image ready to publish.");}catch(e){say(e.message||"Could not edit image.",true);}b.disabled=false;b.textContent="Apply edits";});
$("editImageButton").addEventListener("click",openImageEditor);
$("removeImageButton").addEventListener("click",()=>{selectedBlob=null;sourceImage=null;$("imagePreviewCard").hidden=true;$("postImageInput").value="";$("postCaption").value="";if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;});
$("postForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!user){location.href="account.html";return;}
 const type=$("postType").value,title=$("postTitle").value.trim(),html=type==="image"?"":editorHtml(),body=plainText(html),caption=$("postCaption").value.trim();
 if(type==="image"&&!selectedBlob){say("Add an image before publishing.",true);return;}
 if(type==="article"&&(!title||!body)){say("An article needs a headline and some writing.",true);return;}
 if(type==="note"&&!body&&!selectedBlob){say("Write a note or add an image first.",true);return;}
 if(body.length>12000){say("Your post is over the 12,000 character limit.",true);return;}
 const button=$("publishPost");button.disabled=true;button.textContent="Publishing…";say("Preparing your post…");let imagePath=null;
 try{
  if(selectedBlob){imagePath=user.id+"/"+crypto.randomUUID()+".webp";const up=await db.storage.from("reader-feed-images").upload(imagePath,selectedBlob,{contentType:"image/webp",cacheControl:"3600",upsert:false});if(up.error)throw up.error;}
  const payload={author_id:user.id,title:title||null,body:body||"",visibility:$("postVisibility").value,post_type:type,caption:caption||null,content_html:html||null,image_path:imagePath};
  const r=await db.from("reader_feed_posts").insert(payload).select("id").single();if(r.error)throw r.error;
  $("postEditor").innerHTML="";$("postTitle").value="";$("postCaption").value="";$("postImageInput").value="";$("imagePreviewCard").hidden=true;selectedBlob=null;sourceImage=null;if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;resetEdits();countText();$("postType").value="note";setPostType();say("Your "+(type==="image"?"image":type)+" is published.");
  filter="for-you";document.querySelectorAll("[data-feed-filter]").forEach(b=>b.classList.toggle("active",b.dataset.feedFilter===filter));await load(true);
 }catch(err){if(imagePath)await db.storage.from("reader-feed-images").remove([imagePath]);say(err.message||"Your post could not be published.",true);}
 button.disabled=false;if($("postType").value===type)button.textContent=type==="image"?"Publish image":type==="article"?"Publish article":"Publish note";else setPostType();
});
document.querySelectorAll("[data-feed-filter]").forEach(b=>b.addEventListener("click",()=>{filter=b.dataset.feedFilter;document.querySelectorAll("[data-feed-filter]").forEach(x=>x.classList.toggle("active",x===b));load(true);}));
$("refreshFeed").addEventListener("click",()=>load(true));$("loadMorePosts").addEventListener("click",()=>load());
$("feedPosts").addEventListener("click",async e=>{
 const b=e.target.closest("[data-action]");if(!b)return;const id=b.dataset.id,act=b.dataset.action;
 if(act==="like"){if(!user){location.href="account.html";return;}b.disabled=true;const was=liked.has(id),r=was?await db.from("reader_feed_likes").delete().eq("post_id",id).eq("user_id",user.id):await db.from("reader_feed_likes").insert({post_id:id,user_id:user.id});b.disabled=false;if(r.error){say(r.error.message,true);return;}was?liked.delete(id):liked.add(id);const p=cache.find(x=>x.id===id);if(p)p.like_count=Math.max(0,p.like_count+(was?-1:1));b.classList.toggle("is-liked",!was);b.innerHTML=(was?"♡":"♥")+" "+(p?.like_count||0)+" Like";}
 else if(act==="comments")await comments(id);
 else if(act==="share"){const url=location.origin+location.pathname+"#post-"+id;try{if(navigator.share)await navigator.share({title:"Voiceoftaade reader post",url});else{await navigator.clipboard.writeText(url);say("Post link copied.");}}catch(x){if(x.name!=="AbortError")say("Could not share this post.",true);}}
});
$("feedPosts").addEventListener("submit",async e=>{
 const f=e.target.closest(".comment-form");if(!f)return;e.preventDefault();if(!user){location.href="account.html";return;}const body=f.elements.comment.value.trim();if(!body)return;const b=f.querySelector("button");b.disabled=true;const r=await db.from("reader_feed_comments").insert({post_id:f.dataset.post,author_id:user.id,body});b.disabled=false;if(r.error){say(r.error.message,true);return;}f.reset();await comments(f.dataset.post);const p=cache.find(x=>x.id===f.dataset.post);if(p)p.comment_count++;const trigger=document.querySelector('[data-action="comments"][data-id="'+f.dataset.post+'"]');if(trigger)trigger.textContent="◯ "+p.comment_count+" Comments";
});
$("suggestedReaders").addEventListener("click",async e=>{const b=e.target.closest("[data-follow]");if(!b)return;if(!user){location.href="account.html";return;}b.disabled=true;const r=await db.from("reader_follows").insert({follower_id:user.id,followed_id:b.dataset.follow});if(r.error){say(r.error.message,true);b.disabled=false;return;}b.textContent="Following";});
(async()=>{
 $("year").textContent=new Date().getFullYear();if(!db){$("feedPosts").textContent="Unable to connect to the reading room.";return;}
 const s=await db.auth.getUser();user=s.data?.user||null;
 if(user){const p=await db.from("profiles").select("display_name,avatar_url").eq("id",user.id).maybeSingle();$("composerGreeting").textContent="Welcome back, "+(p.data?.display_name||"reader");$("composerAvatar").innerHTML=p.data?.avatar_url?'<img src="'+esc(p.data.avatar_url)+'" alt="">':esc(initials(p.data?.display_name));}
 else{$("composerGreeting").textContent="Join the conversation";$("postFeedback").textContent="Sign in to publish, like and comment.";}
 setPostType();await Promise.all([load(true),suggestions()]);
 db.channel("reader-feed-live").on("postgres_changes",{event:"INSERT",schema:"public",table:"reader_feed_posts"},()=>{if(filter!=="following")load(true);}).subscribe();
})();
})();