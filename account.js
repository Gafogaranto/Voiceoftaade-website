/* Voiceoftaade reader accounts — Supabase Auth */
(() => {
  "use strict";
  const SUPABASE_URL = "https://qnnmbngxunmjerpeoxrr.supabase.co";
  // Publishable/anon keys are intended for browser use; database access is protected by RLS.
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67";
  const ACCOUNT_URL = "https://gafogaranto.github.io/Voiceoftaade-website/account.html";
  const rememberBox = document.getElementById("rememberMe");
  try { rememberBox.checked = localStorage.getItem("vt_remember_me") !== "false"; } catch (_) {}
  const authStorage = {
    getItem(key) { try { return (rememberBox?.checked ? localStorage : sessionStorage).getItem(key); } catch (_) { return null; } },
    setItem(key, value) { try { const target = rememberBox?.checked ? localStorage : sessionStorage; const other = rememberBox?.checked ? sessionStorage : localStorage; target.setItem(key, value); other.removeItem(key); } catch (error) { console.warn("Session storage is unavailable", error); } },
    removeItem(key) { try { localStorage.removeItem(key); sessionStorage.removeItem(key); } catch (_) {} }
  };
  rememberBox?.addEventListener("change", () => { try { localStorage.setItem("vt_remember_me", String(rememberBox.checked)); } catch (_) {} });
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: authStorage }
  });
  const $ = (id) => document.getElementById(id);
  let mode = "signin";
  let currentUser = null;
  let savedProfile = { display_name: "", bio: "", location: "", website_url: "", reading_interests: "" };

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
  const passwordToggle = $("togglePassword");
  passwordToggle?.addEventListener("click", () => {
    const password = $("password");
    const reveal = password.type === "password";
    password.type = reveal ? "text" : "password";
    passwordToggle.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
    passwordToggle.setAttribute("title", reveal ? "Hide password" : "Show password");
    passwordToggle.setAttribute("aria-pressed", String(reveal));
    passwordToggle.innerHTML = reveal
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"></path><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"></path><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7a10.7 10.7 0 0 0 4-.8"></path></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    password.focus({preventScroll:true});
  });
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
    const { data, error } = await supabase.from("profiles").select("display_name,avatar_url,cover_url,bio,location,website_url,reading_interests").eq("id", user.id).maybeSingle();
    if (error) {
      status("profileStatus", "You are signed in, but your profile could not be loaded. Please refresh.", "error");
      return;
    }
    const initialName = (user.user_metadata && user.user_metadata.display_name) || "";
    if (!data) {
      const { error: insertError } = await supabase.from("profiles").insert({ id: user.id, display_name: initialName || null });
      if (insertError && insertError.code !== "23505") status("profileStatus", "Your account works, but the profile could not be created yet.", "error");
      savedProfile = { display_name: initialName, bio: "", location: "", website_url: "", reading_interests: "" };
      populateProfileEditor(savedProfile);
      renderProfileDetails(savedProfile);
      $("profileForm").hidden = true;
      $("profileName").value = initialName;
      updateProfileLabels(initialName, user.email);
      applyProfilePhotos("", "");
    } else {
      savedProfile = {
        display_name: data.display_name || initialName,
        bio: data.bio || "",
        location: data.location || "",
        website_url: data.website_url || "",
        reading_interests: data.reading_interests || ""
      };
      populateProfileEditor(savedProfile);
      renderProfileDetails(savedProfile);
      $("profileForm").hidden = true;
      updateProfileLabels(data.display_name || initialName, user.email);
      applyProfilePhotos(data.avatar_url || "", data.cover_url || "");
    }
    await migrateDeviceCollections(user);
    await renderCloudProgress();
  }

  function populateProfileEditor(profile) {
    $("profileName").value = profile.display_name || "";
    $("profileBio").value = profile.bio || "";
    $("profileLocation").value = profile.location || "";
    $("profileWebsite").value = profile.website_url || "";
    $("profileInterests").value = profile.reading_interests || "";
  }
  function setProfilePreview(id, value, emptyText) {
    const node = $(id);
    const text = (value || "").trim();
    node.textContent = text || emptyText;
    node.classList.toggle("profile-detail-empty", !text);
  }
  function renderProfileDetails(profile) {
    setProfilePreview("profileBioPreview", profile.bio, "Add a short introduction");
    setProfilePreview("profileLocationPreview", profile.location, "Not added");
    setProfilePreview("profileInterestsPreview", profile.reading_interests, "Not added");
    const website = $("profileWebsitePreview");
    website.replaceChildren();
    const url = (profile.website_url || "").trim();
    if (url) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = url;
      website.appendChild(link);
      website.classList.remove("profile-detail-empty");
    } else {
      website.textContent = "Not added";
      website.classList.add("profile-detail-empty");
    }
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
    const form = $("profileForm");
    form.hidden = false;
    populateProfileEditor(savedProfile);
    $("profileAbout").scrollIntoView({ behavior: "smooth", block: "center" });
    $("profileName").focus({ preventScroll: true });
  });
  $("cancelProfileEdit").addEventListener("click", () => {
    populateProfileEditor(savedProfile);
    $("profileForm").hidden = true;
    status("profileStatus", "");
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
    const profile = {
      display_name: $("profileName").value.trim(),
      bio: $("profileBio").value.trim(),
      location: $("profileLocation").value.trim(),
      website_url: $("profileWebsite").value.trim(),
      reading_interests: $("profileInterests").value.trim()
    };
    if (profile.website_url && !/^https?:\/\//i.test(profile.website_url)) {
      status("profileStatus", "Please enter a website address starting with https:// or http://.", "error");
      return;
    }
    status("profileStatus", "Saving profile…");
    const { error } = await supabase.from("profiles").upsert(
      { id: currentUser.id, ...profile },
      { onConflict: "id" }
    );
    if (error) status("profileStatus", "Could not save profile: " + error.message, "error");
    else {
      savedProfile = profile;
      renderProfileDetails(savedProfile);
      updateProfileLabels(profile.display_name, currentUser.email);
      $("profileForm").hidden = true;
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
        const open=document.createElement("button");open.type="button";open.textContent="Read journal →";open.addEventListener("click",()=>location.href="journals.html?openJournal="+encodeURIComponent(row.journal_id)+"#journal");
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
    rows.forEach(row=>{
      const percent=Math.max(0,Math.min(100,Math.round(Number(row.progress_percent)||0)));
      const card=document.createElement("article");card.className="saved-card progress-card";
      const heading=document.createElement("div");heading.className="progress-card-heading";
      const h=document.createElement("h3");h.textContent=JOURNALS[row.journal_id][0];
      const badge=document.createElement("span");badge.className="progress-percent";badge.textContent=percent+"%";heading.append(h,badge);
      const track=document.createElement("div");track.className="reading-progress-track";track.setAttribute("role","progressbar");track.setAttribute("aria-label","Reading progress for "+JOURNALS[row.journal_id][0]);track.setAttribute("aria-valuemin","0");track.setAttribute("aria-valuemax","100");track.setAttribute("aria-valuenow",String(percent));
      const fill=document.createElement("span");fill.className="reading-progress-fill";fill.style.width=percent+"%";track.append(fill);
      const p=document.createElement("p");p.className="progress-last-read";p.textContent="Last opened "+(row.last_read_at?new Date(row.last_read_at).toLocaleDateString():"recently");
      const open=document.createElement("button");open.type="button";open.className="continue-reading-button";open.innerHTML='<span class="continue-reading-icon" aria-hidden="true">▶</span><span>Continue reading</span><span class="continue-reading-arrow" aria-hidden="true">↗</span>';open.addEventListener("click",()=>location.href="journals.html?openJournal="+encodeURIComponent(row.journal_id)+"#journal");
      card.append(heading,track,p,open);target.append(card);
    });
  }

  setMode("signin");
})();