/* Voiceoftaade reader accounts — Supabase Auth */
(() => {
  "use strict";
  const SUPABASE_URL = "https://qnnmbngxunmjerpeoxrr.supabase.co";
  // Publishable/anon keys are intended for browser use; database access is protected by RLS.
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67";
  const ACCOUNT_URL = "https://gafogaranto.github.io/Voiceoftaade-website/account.html";
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const $ = (id) => document.getElementById(id);
  let mode = "signin";
  let currentUser = null;

  $("year").textContent = new Date().getFullYear();
  function status(id, message, kind = "") {
    const el = $(id); el.textContent = message; el.className = "account-status" + (kind ? " " + kind : "");
  }
  function setMode(next) {
    mode = next;
    const signup = mode === "signup";
    $("signInTab").classList.toggle("active", !signup);
    $("signUpTab").classList.toggle("active", signup);
    $("signInTab").setAttribute("aria-selected", String(!signup));
    $("signUpTab").setAttribute("aria-selected", String(signup));
    $("nameField").hidden = !signup;
    $("displayName").required = signup;
    $("password").autocomplete = signup ? "new-password" : "current-password";
    $("submitAuth").innerHTML = signup ? "Create free account <span>→</span>" : "Sign in <span>→</span>";
    $("forgotPassword").hidden = signup;
    $("formNote").textContent = signup
      ? "Use an email address you can access. If email confirmation is enabled, check your inbox to verify your account."
      : "Your account is for reader features. Public articles remain available without signing in.";
    status("authStatus", "");
  }
  $("signInTab").addEventListener("click", () => setMode("signin"));
  $("signUpTab").addEventListener("click", () => setMode("signup"));

  const defaultAvatar = $("profileAvatar").src;
  function updateProfileLabels(name, email) {
    const display = name || "Voiceoftaade Reader";
    $("profileDisplayName").textContent = display;
    $("profileEmail").textContent = email || "Reader profile";
  }
  function applyProfilePhotos(avatarUrl, coverUrl) {
    $("profileAvatar").src = avatarUrl || defaultAvatar;
    $("profileCover").dataset.coverUrl = coverUrl || "";
    $("profileCover").style.backgroundImage = coverUrl
      ? "linear-gradient(0deg,rgba(3,10,18,.65),transparent 65%),url('" + coverUrl.replace(/'/g, "%27") + "')"
      : "";
  }
  async function showDashboard(user) {
    currentUser = user;
    $("authPanel").style.display = "none";
    $("dashboard").style.display = "block";
    const { data, error } = await supabase.from("profiles").select("display_name,avatar_url,cover_url").eq("id", user.id).maybeSingle();
    if (error) {
      status("profileStatus", "You are signed in, but your profile could not be loaded. Please refresh.", "error");
      return;
    }
    const initialName = (user.user_metadata && user.user_metadata.display_name) || "";
    if (!data) {
      const { error: insertError } = await supabase.from("profiles").insert({ id: user.id, display_name: initialName || null });
      if (insertError && insertError.code !== "23505") status("profileStatus", "Your account works, but the profile could not be created yet.", "error");
      $("profileName").value = initialName;
      updateProfileLabels(initialName, user.email);
      applyProfilePhotos("", "");
    } else {
      $("profileName").value = data.display_name || initialName;
      updateProfileLabels(data.display_name || initialName, user.email);
      applyProfilePhotos(data.avatar_url || "", data.cover_url || "");
    }
    await migrateDeviceCollections(user);
    await renderCloudProgress();
  }

  async function uploadProfileImage(file, kind) {
    if (!currentUser || !file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      status("profileStatus", "Please choose a JPG, PNG or WebP image.", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      status("profileStatus", "Please choose an image smaller than 2 MB.", "error");
      return;
    }
    status("profileStatus", "Uploading " + (kind === "avatar" ? "profile picture" : "cover photo") + "…");
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = currentUser.id + "/" + kind + "-" + Date.now() + "." + extension;
    const { error: uploadError } = await supabase.storage.from("reader-avatars").upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type
    });
    if (uploadError) {
      status("profileStatus", "Upload failed: " + uploadError.message, "error");
      return;
    }
    const { data: urlData } = supabase.storage.from("reader-avatars").getPublicUrl(path);
    const field = kind === "avatar" ? "avatar_url" : "cover_url";
    const { error: saveError } = await supabase.from("profiles").upsert(
      { id: currentUser.id, [field]: urlData.publicUrl },
      { onConflict: "id" }
    );
    if (saveError) {
      status("profileStatus", "Image uploaded, but its profile link could not be saved: " + saveError.message, "error");
      return;
    }
    if (kind === "avatar") applyProfilePhotos(urlData.publicUrl, $("profileCover").dataset.coverUrl || "");
    else {
      $("profileCover").dataset.coverUrl = urlData.publicUrl;
      applyProfilePhotos($("profileAvatar").src === defaultAvatar ? "" : $("profileAvatar").src, urlData.publicUrl);
    }
    status("profileStatus", (kind === "avatar" ? "Profile picture" : "Cover photo") + " updated.", "success");
  }
  $("avatarUpload").addEventListener("change", (event) => uploadProfileImage(event.target.files[0], "avatar"));
  $("coverUpload").addEventListener("change", (event) => uploadProfileImage(event.target.files[0], "cover"));
  $("editProfileButton").addEventListener("click", () => {
    $("profileAbout").scrollIntoView({ behavior: "smooth", block: "center" });
    $("profileName").focus();
  });

  async function showAuth() {
    currentUser = null;
    $("dashboard").style.display = "none";
    $("authPanel").style.display = "block";
  }

  $("authForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = $("email").value.trim();
    const password = $("password").value;
    $("submitAuth").disabled = true;
    status("authStatus", mode === "signup" ? "Creating your account…" : "Signing you in…");
    try {
      if (mode === "signup") {
        const displayName = $("displayName").value.trim();
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: ACCOUNT_URL
          }
        });
        if (error) throw error;
        if (data.session && data.user) {
          await showDashboard(data.user);
          status("authStatus", "Account created successfully.", "success");
        } else {
          status("authStatus", "Almost there. Check your email for a confirmation link, then return to this page to sign in.", "success");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await showDashboard(data.user);
      }
    } catch (error) {
      status("authStatus", error.message || "We could not complete that request. Please try again.", "error");
    } finally {
      $("submitAuth").disabled = false;
    }
  });

  $("forgotPassword").addEventListener("click", async () => {
    const email = $("email").value.trim();
    if (!email) { status("authStatus", "Enter your email address first, then choose Forgot your password.", "error"); $("email").focus(); return; }
    status("authStatus", "Requesting a password reset…");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: ACCOUNT_URL });
    if (error) status("authStatus", error.message, "error");
    else status("authStatus", "If an account exists for that email, a password-reset link will arrive shortly.", "success");
  });

  $("profileForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser) return;
    const display_name = $("profileName").value.trim();
    status("profileStatus", "Saving profile…");
    const { error } = await supabase.from("profiles").upsert(
      { id: currentUser.id, display_name },
      { onConflict: "id" }
    );
    if (error) status("profileStatus", "Could not save profile: " + error.message, "error");
    else {
      updateProfileLabels(display_name, currentUser.email);
      status("profileStatus", "Profile saved.", "success");
    }
  });

  $("signOut").addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { status("profileStatus", error.message, "error"); return; }
    await showAuth();
    status("authStatus", "You have signed out.", "success");
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (session && session.user && !currentUser) {
      // Defer database work to avoid doing it inside the auth event callback.
      setTimeout(() => { if (!currentUser) showDashboard(session.user); }, 0);
    } else if (!session && currentUser) {
      showAuth();
    }
  });

  supabase.auth.getSession().then(({ data, error }) => {
    if (error) status("authStatus", error.message, "error");
    if (data.session && data.session.user) showDashboard(data.session.user);
  });
  const JOURNALS = {"chapter-0":["Perspective"],"chapter-1":["Stillness"],"chapter-2":["Discipline"],"chapter-3":["Wisdom Over Noise"],"chapter-4":["Time"],"chapter-5":["Love Without Losing Yourself"],"chapter-6":["Marriage"],"chapter-7":["Boundaries"],"chapter-8":["Loyalty"],"chapter-9":["Forgiveness"],"chapter-10":["Laziness and Spiritual Disconnection"],"chapter-11":["Fear"],"chapter-12":["Dream"],"chapter-13":["Failure"],"chapter-14":["Humility"],"chapter-15":["Likes and Validation"],"chapter-16":["Faking and Authenticity"],"chapter-17":["The Soft Life"],"chapter-18":["The Hustle"],"chapter-19":["Mental Peace"],"discipline":["Discipline is the quiet architecture of a meaningful life"],"boundaries":["Boundaries are not walls; they are instructions"],"audience":["Your life is bigger than the audience watching it"]};
  const LEGACY_KEYS={saved:"voiceoftaade-saved-reflections-v2",favourite:"voiceoftaade-favourite-reflections-v1"};
  async function renderCloudCollections(){
    if(!currentUser)return;
    const {data,error}=await supabase.from("reader_journal_collections").select("journal_id,collection_type,created_at").eq("user_id",currentUser.id).order("created_at",{ascending:false});
    if(error){console.error(error);status("profileStatus","Saved journals could not be loaded. Please refresh.","error");return;}
    for(const type of ["saved","favourite"]){
      const list=$(type==="saved"?"profileSavedList":"profileFavouriteList");if(!list)continue;list.replaceChildren();
      const rows=(data||[]).filter(x=>x.collection_type===type&&JOURNALS[x.journal_id]);
      if(!rows.length){const p=document.createElement("p");p.className="saved-empty";p.textContent=type==="saved"?"No saved journals yet.":"No favourite journals yet.";list.append(p);continue;}
      rows.forEach(row=>{
        const card=document.createElement("article");card.className="saved-card";
        const h=document.createElement("h3");h.textContent=JOURNALS[row.journal_id][0]+" — Daily Journal";
        const actions=document.createElement("div");actions.className="saved-actions";
        const open=document.createElement("button");open.type="button";open.textContent="Read journal →";open.addEventListener("click",()=>location.href="./?openJournal="+encodeURIComponent(row.journal_id)+"#journal");
        const remove=document.createElement("button");remove.type="button";remove.textContent=type==="saved"?"Remove saved":"Remove favourite";
        remove.addEventListener("click",async()=>{remove.disabled=true;const out=await supabase.from("reader_journal_collections").delete().eq("user_id",currentUser.id).eq("journal_id",row.journal_id).eq("collection_type",type);if(out.error){status("profileStatus","Could not remove this journal. Try again.","error");remove.disabled=false;}else await renderCloudCollections();});
        actions.append(open,remove);card.append(h,actions);list.append(card);
      });
    }
  }
  async function migrateDeviceCollections(user){
    const rows=[];
    for(const [type,key] of Object.entries(LEGACY_KEYS)){try{const ids=JSON.parse(localStorage.getItem(key)||"[]");if(Array.isArray(ids))ids.filter(id=>typeof id==="string"&&JOURNALS[id]).forEach(journal_id=>rows.push({user_id:user.id,journal_id,collection_type:type}));}catch(e){console.warn(e);}}
    if(rows.length){const {error}=await supabase.from("reader_journal_collections").upsert(rows,{onConflict:"user_id,journal_id,collection_type",ignoreDuplicates:true});if(error){console.error(error);status("profileStatus","Some saved items remain on this device because syncing failed. They have not been removed.","error");}else Object.values(LEGACY_KEYS).forEach(key=>{try{localStorage.removeItem(key);}catch(_){}});}
    await renderCloudCollections();
  }
  async function renderCloudProgress(){
    if(!currentUser)return;const target=$("readingProgressList");if(!target)return;
    const {data,error}=await supabase.from("reader_reading_progress").select("journal_id,progress_percent,last_read_at").eq("user_id",currentUser.id).order("updated_at",{ascending:false}).limit(50);
    if(error){console.error(error);return;}target.replaceChildren();const rows=(data||[]).filter(row=>JOURNALS[row.journal_id]);
    if(!rows.length){const p=document.createElement("p");p.className="saved-empty";p.textContent="Your reading history will appear here as you open journals.";target.append(p);return;}
    rows.forEach(row=>{const card=document.createElement("article");card.className="saved-card";const h=document.createElement("h3");h.textContent=JOURNALS[row.journal_id][0];const p=document.createElement("p");p.textContent=Math.round(Number(row.progress_percent))+"% read · Last opened "+new Date(row.last_read_at).toLocaleDateString();const open=document.createElement("button");open.type="button";open.textContent="Continue reading →";open.addEventListener("click",()=>location.href="./?openJournal="+encodeURIComponent(row.journal_id)+"#journal");card.append(h,p,open);target.append(card);});
  }

  setMode("signin");
})();