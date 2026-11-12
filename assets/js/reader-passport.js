(() => {
  "use strict";
  const section = document.getElementById("readerPassportSection");
  const host = document.getElementById("readerPassportBadges");
  const stats = document.getElementById("readerPassportStats");
  if (!section || !host || !window.supabase) return;

  const db = window.supabase.createClient(
    "https://qnnmbngxunmjerpeoxrr.supabase.co",
    "sb_publishable_S2_edmXWLvlB4P5Pyr-hDg_JLnP0F67"
  );
  const targetId = new URLSearchParams(location.search).get("id");
  const first = value => Array.isArray(value) ? value[0] : value;
  const canView = (visibility, isOwner, isSignedIn) =>
    isOwner || visibility === "public" || (visibility === "community" && isSignedIn);

  function addBadge(item) {
    const card = document.createElement("article");
    card.className = "reader-passport-badge";
    const medal = document.createElement("span");
    medal.className = "reader-passport-medal";
    medal.setAttribute("aria-hidden", "true");
    medal.textContent = item.icon;
    const copy = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = item.name;
    const detail = document.createElement("small");
    detail.textContent = item.detail;
    copy.append(name, detail);
    card.append(medal, copy);
    host.append(card);
  }

  function addStat(label, value) {
    const chip = document.createElement("span");
    chip.className = "reader-passport-stat";
    chip.textContent = label + ": " + value;
    stats.append(chip);
  }

  async function init() {
    if (!targetId) {
      section.remove();
      return;
    }
    const { data: sessionData } = await db.auth.getSession();
    const viewer = sessionData?.session?.user || null;
    const isOwner = viewer?.id === targetId;
    const isSignedIn = !!viewer;

    const { data: privacyData, error: privacyError } = await db.rpc(
      "get_reader_profile_visibility",
      { target_user_id: targetId }
    );
    if (privacyError) throw privacyError;
    const privacy = first(privacyData) || {};
    const profileVisibility = privacy.profile_visibility || "community";

    if (!canView(profileVisibility, isOwner, isSignedIn)) {
      section.remove();
      return;
    }

    const showReading = canView(privacy.reading_activity_visibility || "community", isOwner, isSignedIn);
    const showSaved = canView(privacy.saved_collections_visibility || "community", isOwner, isSignedIn);
    const showFavourites = canView(privacy.favourites_visibility || "community", isOwner, isSignedIn);

    const [activityResult, postsResult, repliesResult] = await Promise.all([
      db.rpc("get_reader_public_activity", { target_user_id: targetId }),
      db.from("community_posts")
        .select("id,communities(name,visibility,status)")
        .eq("author_id", targetId)
        .eq("status", "published")
        .limit(100),
      db.from("community_replies")
        .select("id,community_posts(communities(name,visibility,status))")
        .eq("author_id", targetId)
        .eq("status", "published")
        .limit(100)
    ]);

    const activity = first(activityResult.data) || {};
    const readingRows = showReading && Array.isArray(activity.reading_activity) ? activity.reading_activity : null;
    const savedRows = showSaved && Array.isArray(activity.saved) ? activity.saved : null;
    const favouriteRows = showFavourites && Array.isArray(activity.favourites) ? activity.favourites : null;

    const journalCount = readingRows
      ? new Set(readingRows.map(row => row.journal_id).filter(Boolean)).size
      : null;
    const collectionCount = (savedRows || favouriteRows)
      ? new Set([...(savedRows || []), ...(favouriteRows || [])].map(row => row.journal_id).filter(Boolean)).size
      : null;

    const publicPosts = (postsResult.data || []).filter(row => {
      const community = first(row.communities);
      return community?.visibility === "public" && community?.status === "active";
    }).length;
    const publicReplies = (repliesResult.data || []).filter(row => {
      const post = first(row.community_posts);
      const community = first(post?.communities);
      return community?.visibility === "public" && community?.status === "active";
    }).length;
    const contributionCount = publicPosts + publicReplies;

    const earned = [];
    if (journalCount !== null) {
      if (journalCount >= 1) earned.push({ icon: "✦", name: "First Reflection", detail: "Opened your first journal entry" });
      if (journalCount >= 5) earned.push({ icon: "✧", name: "Five Journeys", detail: "Explored five different journal entries" });
      if (journalCount >= 10) earned.push({ icon: "❖", name: "Journal Explorer", detail: "Explored ten different journal entries" });
    }
    if (collectionCount !== null && collectionCount >= 3) {
      earned.push({ icon: "▤", name: "Shelf Curator", detail: "Saved or favourited three journal entries" });
    }
    if (contributionCount >= 1) earned.push({ icon: "◉", name: "Community Voice", detail: "Published a contribution in a public community" });
    if (contributionCount >= 5) earned.push({ icon: "✎", name: "Conversation Builder", detail: "Published five contributions in public communities" });

    host.replaceChildren();
    stats.replaceChildren();
    if (journalCount !== null) addStat("Journals explored", journalCount);
    if (collectionCount !== null) addStat("Collected entries", collectionCount);
    addStat("Public contributions", contributionCount);

    if (earned.length) {
      earned.forEach(addBadge);
    } else {
      const empty = document.createElement("p");
      empty.className = "reader-passport-empty";
      empty.textContent = "No milestones earned yet. Achievements appear as this reader explores journals, curates entries and joins public conversations.";
      host.append(empty);
    }
    section.hidden = false;
  }

  init().catch(error => {
    console.warn("Reader Passport could not load:", error);
    host.textContent = "Reader achievements are temporarily unavailable. Please refresh and try again.";
    section.hidden = false;
  });
})();