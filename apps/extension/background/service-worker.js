// onda service worker — handles scrobble + gift flow

importScripts("wallet.bundle.js");

const API_BASE = "http://localhost:3000";
const GIFT_AMOUNT = 0.01;

// Current scrobble state
let scrobbleState = {
  status: "idle",
  artist: null,
  track: null,
  platform: null,
  percent: 0,
  threshold: 10000,
};

// Initialize wallet on startup
OndaWallet.initWallet().then((info) => {
  console.log(`[onda] Wallet ready: ${info.address}${info.isNew ? " (new)" : ""}`);
});

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
      updateBadge("·", "#6c63ff");
      break;

    case "SCROBBLE_PROGRESS":
      scrobbleState = {
        ...scrobbleState,
        status: "listening",
        percent: data.percent,
        artist: data.artist,
        track: data.track,
      };
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
      setTimeout(() => {
        if (scrobbleState.status === "skipped") {
          scrobbleState = { ...scrobbleState, status: "idle" };
          updateBadge("", "#333");
        }
      }, 2000);
      break;

    case "TRACK_DETECTED":
      handleScrobbleComplete(data);
      break;

    case "GET_STATUS":
      getFullStatus().then(sendResponse);
      return true;

    case "GET_WALLET_INFO":
      OndaWallet.getWalletInfo().then(sendResponse);
      return true;

    case "INIT_WALLET":
      OndaWallet.initWallet().then(sendResponse);
      return true;

    case "APPROVE_AND_DEPOSIT":
      OndaWallet.approveAndDeposit()
        .then((result) => sendResponse({ success: true, ...result }))
        .catch((err) => sendResponse({ error: err.message }));
      return true;
  }

  chrome.storage.local.set({ scrobbleState });
  sendResponse({ received: true });
  return false;
});

async function handleScrobbleComplete({ artist, track, platform }) {
  console.log(`[onda] Scrobbled: ${artist} — ${track} (${platform})`);

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
    // Look up artist on MusicBrainz
    const lookupUrl = `${API_BASE}/api/lookup?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`;
    const res = await fetch(lookupUrl);

    if (!res.ok) {
      console.warn(`[onda] Lookup failed: ${res.status}`);
      scrobbleState = { ...scrobbleState, status: "lookup_failed" };
      chrome.storage.local.set({ scrobbleState });
      return;
    }

    const data = await res.json();

    if (data.artist?.mbidHash) {
      // Send gift on-chain
      try {
        const giftResult = await OndaWallet.sendTip(data.artist.mbidHash);
        console.log(`[onda] On-chain gift tx: ${giftResult.txHash}`);
        scrobbleState = { ...scrobbleState, status: "gifted", txHash: giftResult.txHash };

        // Notify dashboard so gift appears in feed
        fetch(`${API_BASE}/api/gift`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            artist: data.artist.name || artist,
            track: data.track?.title || track,
            platform,
            txHash: giftResult.txHash,
          }),
        }).catch(() => {}); // best-effort, don't block
      } catch (err) {
        console.warn(`[onda] Gift failed: ${err.message}`);
        scrobbleState = { ...scrobbleState, status: "gift_failed", giftError: err.message };
      }
      chrome.storage.local.set({ scrobbleState });
    }

    // Store in history
    const { giftHistory = [] } = await chrome.storage.local.get(["giftHistory"]);

    giftHistory.unshift({
      artist: data.artist?.name || artist,
      track: data.track?.title || track,
      mbid: data.artist?.mbid,
      mbidHash: data.artist?.mbidHash,
      amount: GIFT_AMOUNT,
      platform,
      timestamp: Date.now(),
      txHash: scrobbleState.txHash || null,
    });

    if (giftHistory.length > 100) giftHistory.length = 100;
    await chrome.storage.local.set({ giftHistory });

    console.log(`[onda] Sent $${GIFT_AMOUNT} to ${data.artist?.name || artist}`);
  } catch (error) {
    console.error("[onda] Error:", error);
    scrobbleState = { ...scrobbleState, status: "error" };
    chrome.storage.local.set({ scrobbleState });
  }
}

function updateBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

async function getFullStatus() {
  const data = await chrome.storage.local.get(["scrobbleState", "giftHistory"]);
  const gifts = data.giftHistory || [];
  const uniqueArtists = new Set(gifts.map((g) => g.artist)).size;
  return {
    scrobble: data.scrobbleState || scrobbleState,
    giftCount: gifts.length,
    totalGiven: (gifts.length * GIFT_AMOUNT).toFixed(2),
    uniqueArtists,
    recentGifts: gifts.slice(0, 10),
  };
}
