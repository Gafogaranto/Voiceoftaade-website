(() => {
  const $ = id => document.getElementById(id);
  $("year").textContent = new Date().getFullYear();
  const menu = $("menuToggle"), nav = $("mainNav");
  menu.addEventListener("click", () => { const open = nav.classList.toggle("open"); menu.setAttribute("aria-expanded", String(open)); menu.setAttribute("aria-label", open ? "Close navigation" : "Open navigation"); menu.textContent = open ? "×" : "☰"; });
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => { nav.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); menu.textContent = "☰"; }));
  const form = $("contactForm"), status = $("contactStatus"), submit = $("contactSubmit");
  const client = window.supabase?.createClient("https://qnnmbngxunmjerpeoxrr.supabase.co", "sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67");
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if ($("contactCompany").value.trim()) { status.textContent = "Thanks — your message has been received."; return; }
    if (!client) { status.textContent = "The message service is temporarily unavailable. Please email voiceoftaade@gmail.com."; return; }
    const payload = { name: $("contactName").value.trim(), email: $("contactEmail").value.trim(), subject: $("contactSubject").value.trim(), message: $("contactMessage").value.trim() };
    if (payload.message.length < 10) { status.textContent = "Please add a little more detail (at least 10 characters)."; return; }
    submit.disabled = true; submit.textContent = "Sending…"; status.textContent = "";
    try {
      const { data, error } = await client.functions.invoke("submit-contact-message", { body: { ...payload, company: $("contactCompany").value.trim() } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      form.reset();
      status.textContent = data?.emailNotification
        ? "Message sent successfully. A copy has been delivered to the Voiceoftaade inbox. Thank you for contacting us."
        : "Message received and saved securely. Email alerts are not configured yet, but your message is in the private Voiceoftaade inbox.";
    } catch (error) {
      console.error("Contact submission failed", error);
      status.textContent = "We couldn't send your message just now. Please try again or email voiceoftaade@gmail.com.";
    } finally { submit.disabled = false; submit.innerHTML = 'Send message <span>↗</span>'; }
  });
})();