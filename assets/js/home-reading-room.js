/* Homepage interactions: SDG glass dialog and accessible social-link rotation. */
(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* Move the long SDG explanations out of the cards and into one page-level dialog. */
  const sdgGrid = document.querySelector(".vt-sdg-grid");
  const sdgDialog = document.getElementById("sdgDialog");
  const sdgDialogTitle = document.getElementById("sdgDialogTitle");
  const sdgDialogKicker = document.getElementById("sdgDialogKicker");
  const sdgDialogBody = document.getElementById("sdgDialogBody");
  const sdgDialogClose = document.getElementById("sdgDialogClose");
  let lastSdgTrigger = null;

  if (sdgGrid && sdgDialog && sdgDialogTitle && sdgDialogKicker && sdgDialogBody) {
    sdgGrid.addEventListener("click", function (event) {
      const summary = event.target.closest(".vt-sdg-details summary");
      if (!summary) return;
      event.preventDefault();

      const card = summary.closest(".vt-sdg-card");
      const details = summary.closest(".vt-sdg-details");
      const source = details && details.querySelector(".vt-sdg-more");
      const heading = card && card.querySelector("h3");
      const category = card && card.querySelector("small");
      if (!source || !heading) return;

      lastSdgTrigger = summary;
      sdgDialogTitle.textContent = heading.textContent.trim();
      sdgDialogKicker.textContent = category ? category.textContent.trim() : "SUSTAINABLE DEVELOPMENT GOAL";
      sdgDialogBody.replaceChildren(source.cloneNode(true));
      sdgDialog.showModal();
    });

    if (sdgDialogClose) {
      sdgDialogClose.addEventListener("click", function () {
        sdgDialog.close();
      });
    }

    sdgDialog.addEventListener("click", function (event) {
      if (event.target === sdgDialog) sdgDialog.close();
    });

    sdgDialog.addEventListener("close", function () {
      sdgDialogBody.replaceChildren();
      if (lastSdgTrigger && document.contains(lastSdgTrigger)) lastSdgTrigger.focus();
    });
  }

  /* Social links exchange positions every five seconds, pausing for interaction. */
  const socialGrid = document.querySelector(".contact-links");
  if (!socialGrid) return;
  const socialLinks = Array.from(socialGrid.querySelectorAll("[data-social-rotate]"));
  if (socialLinks.length < 2 || reducedMotion.matches) return;

  let timer = null;
  const interval = 5000;

  function shufflePositions() {
    if (document.hidden || socialGrid.matches(":hover") || socialGrid.contains(document.activeElement)) return;
    const before = new Map(socialLinks.map(link => [link, link.getBoundingClientRect()]));
    const shuffled = socialLinks.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    shuffled.forEach(link => socialGrid.appendChild(link));
    shuffled.forEach(link => {
      const first = before.get(link);
      const last = link.getBoundingClientRect();
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      if (!dx && !dy) return;
      link.classList.add("is-reordering");
      const animation = link.animate(
        [{ transform: "translate(" + dx + "px," + dy + "px)" }, { transform: "translate(0,0)" }],
        { duration: 720, easing: "cubic-bezier(.2,.8,.2,1)" }
      );
      animation.onfinish = () => link.classList.remove("is-reordering");
    });
  }

  function stop() {
    if (timer) window.clearInterval(timer);
    timer = null;
  }
  function start() {
    stop();
    if (!document.hidden && !reducedMotion.matches) timer = window.setInterval(shufflePositions, interval);
  }

  socialGrid.addEventListener("mouseenter", stop);
  socialGrid.addEventListener("mouseleave", start);
  socialGrid.addEventListener("focusin", stop);
  socialGrid.addEventListener("focusout", event => {
    if (!socialGrid.contains(event.relatedTarget)) start();
  });
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
  if (typeof reducedMotion.addEventListener === "function") reducedMotion.addEventListener("change", start);
  start();
})();