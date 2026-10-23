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

  async function showDashboard(user) {
    currentUser = user;
    $("authPanel").style.display = "none";
    $("dashboard").style.display = "block";
    $("signedInEmail").textContent = user.email || "Signed in";
    const { data, error } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    if (error) {
      status("profileStatus", "You are signed in, but your profile could not be loaded. Please try refreshing.", "error");
      return;
    }
    if (!data) {
      const initialName = (user.user_metadata && user.user_metadata.display_name) || "";
      const { error: insertError } = await supabase.from("profiles").insert({ id: user.id, display_name: initialName || null });
      if (insertError && insertError.code !== "23505") status("profileStatus", "Your account works, but the profile could not be created yet.", "error");
      $("profileName").value = initialName;
    } else {
      $("profileName").value = data.display_name || "";
    }
  }
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
    else status("profileStatus", "Profile saved.", "success");
  });

  $("signOut").addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { status("profileStatus", error.message, "error"); return; }
    await showAuth();
    setMode("signin");
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
  setMode("signin");
})();