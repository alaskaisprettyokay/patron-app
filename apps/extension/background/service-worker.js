// Patron Service Worker — handles scrobble + tip flow

const API_BASE = "http://localhost:3000";
const TIP_AMOUNT = 0.05;

// Current scrobble state
let scrobbleState = {
  status: "idle", // idle | listening | scrobbled | paused | skipped
  artist: null,
  track: null,
  platform: null,
  percent: 0,
  threshold: 10000,
};

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, data } = message;

  switch (type) {
    case "SCROBBLE_START":
      scrobbleState = {
        status: "listening",
        artist: data.artist,
        track: data.track,
        platform: data.platform,
        percent: 0,
        threshold: data.threshold,
      };
      updateBadge("🎵", "#6c63ff");
      break;

    case "SCROBBLE_PROGRESS":
      scrobbleState = {
        ...scrobbleState,
        status: "listening",
        percent: data.percent,
        artist: data.artist,
        track: data.track,
      };
      // Update badge with progress
      const pct = data.percent;
      if (pct < 33) updateBadge("·", "#666");
      else if (pct < 66) updateBadge("··", "#999");
      else updateBadge("···", "#6c63ff");
      break;

    case "SCROBBLE_PAUSED":
      scrobbleState = { ...scrobbleState, status: "paused" };
      updateBadge("⏸", "#ffd93d");
      break;

    case "SCROBBLE_SKIPPED":
      scrobbleState = { ...scrobbleState, status: "skipped", percent: 0 };
      updateBadge("⏭", "#ff6b6b");
      // Clear skip indicator after 2s
      setTimeout(() => {
        if (scrobbleState.status === "skipped") {
          scrobbleState = { ...scrobbleState, status: "idle" };
          updateBadge("", "#333");
        }
      }, 2000);
      break;

    case "TRACK_DETECTED":
      // Scrobble complete — fire the tip!
      handleScrobbleComplete(data);
      break;

    case "GET_STATUS":
      getFullStatus().then(sendResponse);
      return true; // async response
  }

  // Store state for popup
  chrome.storage.local.set({ scrobbleState });
  sendResponse({ received: true });
  return false;
});

async function handleScrobbleComplete({ artist, track, platform }) {
  console.log(`[Patron] Scrobbled: ${artist} — ${track} (${platform})`);

  scrobbleState = {
    status: "scrobbled",
    artist,
    track,
    platform,
    percent: 100,
    threshold: scrobbleState.threshold,
  };
  updateBadge("✓", "#2ed573");
  chrome.storage.local.set({ scrobbleState });

  try {
    // Look up artist on MusicBrainz via our API
    const lookupUrl = `${API_BASE}/api/lookup?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`;
    const res = await fetch(lookupUrl);

    if (!res.ok) {
      console.warn(`[Patron] Lookup failed: ${res.status}`);
      scrobbleState = { ...scrobbleState, status: "lookup_failed" };
      chrome.storage.local.set({ scrobbleState });
      return;
    }

    const data = await res.json();

    // Store scrobble + tip in history
    const { tipHistory = [], scrobbleHistory = [] } = await chrome.storage.local.get([
      "tipHistory",
      "scrobbleHistory",
    ]);

    const scrobbleEntry = {
      artist: data.artist?.name || artist,
      track: data.track?.title || track,
      mbid: data.artist?.mbid,
      mbidHash: data.artist?.mbidHash,
      amount: TIP_AMOUNT,
      platform,
      timestamp: Date.now(),
    };

    // Add to both histories
    tipHistory.unshift(scrobbleEntry);
    scrobbleHistory.unshift(scrobbleEntry);

    // Keep last 100
    if (tipHistory.length > 100) tipHistory.length = 100;
    if (scrobbleHistory.length > 200) scrobbleHistory.length = 200;

    await chrome.storage.local.set({ tipHistory, scrobbleHistory });

    console.log(
      `[Patron] Tip recorded: $${TIP_AMOUNT} → ${data.artist?.name || artist} (MBID: ${data.artist?.mbid || "unknown"})`
    );
  } catch (error) {
    console.error("[Patron] Error:", error);
    scrobbleState = { ...scrobbleState, status: "error" };
    chrome.storage.local.set({ scrobbleState });
  }
}

function updateBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

async function getFullStatus() {
  const data = await chrome.storage.local.get([
    "scrobbleState",
    "tipHistory",
    "scrobbleHistory",
  ]);
  const tips = data.tipHistory || [];
  return {
    scrobble: data.scrobbleState || scrobbleState,
    tipCount: tips.length,
    totalTipped: (tips.length * TIP_AMOUNT).toFixed(2),
    recentTips: tips.slice(0, 10),
    recentScrobbles: (data.scrobbleHistory || []).slice(0, 20),
  };
}
