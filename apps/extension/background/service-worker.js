// Patron Service Worker — handles tip requests from content scripts

// Default to localhost for dev; configure in extension options for production
const API_BASE = "http://localhost:3000";
const TIP_AMOUNT = 0.05;

// Track the last tipped track to avoid double-tipping
let lastTipped = { artist: "", track: "", timestamp: 0 };
const TIP_COOLDOWN = 30000; // 30 seconds minimum between tips for same track

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TRACK_DETECTED") {
    handleTrackDetected(message.data, sender.tab?.id);
    sendResponse({ received: true });
  }
  if (message.type === "GET_STATUS") {
    getStatus().then(sendResponse);
    return true; // async response
  }
  return false;
});

async function handleTrackDetected({ artist, track, platform }) {
  if (!artist || !track) return;

  // Deduplicate
  const now = Date.now();
  if (
    lastTipped.artist === artist &&
    lastTipped.track === track &&
    now - lastTipped.timestamp < TIP_COOLDOWN
  ) {
    return;
  }

  console.log(`[Patron] Detected: ${artist} — ${track} (${platform})`);

  // Update current track in storage
  await chrome.storage.local.set({
    currentTrack: { artist, track, platform, timestamp: now },
  });

  try {
    // Look up artist on MusicBrainz via our API
    const lookupUrl = `${API_BASE}/api/lookup?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`;
    const res = await fetch(lookupUrl);

    if (!res.ok) {
      console.warn(`[Patron] Lookup failed: ${res.status}`);
      await updateTipStatus("lookup_failed", artist, track);
      return;
    }

    const data = await res.json();

    // Record the tip
    lastTipped = { artist, track, timestamp: now };

    // Store tip in history
    const { tipHistory = [] } = await chrome.storage.local.get("tipHistory");
    tipHistory.unshift({
      artist: data.artist?.name || artist,
      track: data.track?.title || track,
      mbid: data.artist?.mbid,
      mbidHash: data.artist?.mbidHash,
      amount: TIP_AMOUNT,
      platform,
      timestamp: now,
    });

    // Keep last 100 tips
    if (tipHistory.length > 100) tipHistory.length = 100;
    await chrome.storage.local.set({ tipHistory });

    await updateTipStatus("success", data.artist?.name || artist, data.track?.title || track);

    console.log(`[Patron] Tip recorded: $${TIP_AMOUNT} → ${data.artist?.name || artist}`);
  } catch (error) {
    console.error("[Patron] Error:", error);
    await updateTipStatus("error", artist, track);
  }
}

async function updateTipStatus(status, artist, track) {
  await chrome.storage.local.set({
    lastTipStatus: { status, artist, track, timestamp: Date.now() },
  });
}

async function getStatus() {
  const data = await chrome.storage.local.get([
    "currentTrack",
    "lastTipStatus",
    "tipHistory",
  ]);
  return {
    currentTrack: data.currentTrack || null,
    lastTipStatus: data.lastTipStatus || null,
    tipCount: (data.tipHistory || []).length,
    totalTipped: ((data.tipHistory || []).length * TIP_AMOUNT).toFixed(2),
  };
}
