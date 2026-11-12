(() => {
  const $ = id => document.getElementById(id);
  const db = window.supabase?.createClient("https://qnnmbngxunmjerpeoxrr.supabase.co","sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67");
  const form=$("readerPrivacyForm");
  if(!db||!form)return;
  const status=(message,bad=false)=>{const el=$("privacyStatus");el.textContent=message;el.classList.toggle("error",bad);};
  async function load(){
    const {data:{session}}=await db.auth.getSession();
    if(!session?.user){form.hidden=true;status("Sign in to manage your profile privacy.",true);return;}
    const {data,error}=await db.from("reader_profile_privacy").select("*").eq("user_id",session.user.id).maybeSingle();
    if(error){status("Privacy settings could not be loaded: "+error.message,true);return;}
    const p=data||{};
    $("privacyProfile").value=p.profile_visibility||"community";
    $("privacyReading").value=p.reading_activity_visibility||"community";
    $("privacyFavourites").value=p.favourites_visibility||"community";
    $("privacySaved").value=p.saved_collections_visibility||"community";
    $("privacyMessageRequests").checked=p.allow_message_requests!==false;
  }
  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const {data:{session}}=await db.auth.getSession();if(!session?.user)return;
    const values={
      user_id:session.user.id,
      profile_visibility:$("privacyProfile").value,
      reading_activity_visibility:$("privacyReading").value,
      favourites_visibility:$("privacyFavourites").value,
      saved_collections_visibility:$("privacySaved").value,
      allow_message_requests:$("privacyMessageRequests").checked,
      updated_at:new Date().toISOString()
    };
    const {error}=await db.from("reader_profile_privacy").upsert(values,{onConflict:"user_id"});
    status(error?"Could not save privacy settings: "+error.message:"Your privacy settings have been saved.",!!error);
  });
  db.auth.onAuthStateChange(()=>{load().catch(e=>status(e.message,true));});
  load().catch(e=>status(e.message,true));
})();