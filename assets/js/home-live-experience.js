/* Accessible rotating reflection for the Voiceoftaade homepage. */
(function () {
  "use strict";
  const root = document.querySelector(".vt-live-thought");
  if (!root) return;
  const category = document.getElementById("vtLiveCategory");
  const thought = document.getElementById("vtLiveThought");
  const next = document.getElementById("vtLiveNext");
  const progress = document.getElementById("vtLiveProgress");
  if (!category || !thought || !next || !progress) return;

  const reflections = [
    { category: "A MOMENT FOR CLARITY", thought: "What deserves more of your attention today?" },
    { category: "A MOMENT FOR GROWTH", thought: "Which small lesson could change the way you approach tomorrow?" },
    { category: "A MOMENT FOR CONNECTION", thought: "How can one conversation become more thoughtful and kind?" },
    { category: "A MOMENT FOR PURPOSE", thought: "Which choice would bring your actions closer to your values?" },
    { category: "A MOMENT FOR PERSPECTIVE", thought: "What might you understand differently if you paused before judging?" }
  ];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let index = 0;
  let timer = null;
  const delay = 9000;

  function restartProgress() {
    root.classList.remove("is-changing");
    progress.style.animation = "none";
    void progress.offsetWidth;
    progress.style.animation = "";
    if (!reducedMotion.matches && !document.hidden) root.classList.add("is-changing");
  }

  function showNext() {
    index = (index + 1) % reflections.length;
    category.textContent = reflections[index].category;
    thought.textContent = reflections[index].thought;
    thought.style.animation = "none";
    void thought.offsetWidth;
    thought.style.animation = "";
    restartProgress();
  }

  function stop() {
    if (timer) window.clearInterval(timer);
    timer = null;
    root.classList.remove("is-changing");
  }

  function start() {
    stop();
    if (!reducedMotion.matches && !document.hidden) {
      restartProgress();
      timer = window.setInterval(showNext, delay);
    }
  }

  next.addEventListener("click", function () {
    showNext();
    start();
  });
  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", start);
  root.addEventListener("focusin", stop);
  root.addEventListener("focusout", function (event) {
    if (!root.contains(event.relatedTarget)) start();
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else start();
  });
  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", start);
  }
  start();
})();
