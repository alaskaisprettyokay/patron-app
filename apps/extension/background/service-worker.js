// Patron Service Worker — handles scrobble + tip flow

importScripts("wallet.bundle.js");

const API_BASE = "http://localhost:3000";
const TIP_AMOUNT = 0.01;

// Current scrobble state
let scrobbleState = {
  status: "idle",
  artist: null,
  track: null,
  platform: null,
  percent: 0,
  threshold: 10000,
};

// Initialize session key on startup
PatronWallet.initSessionKey().then((info) => {
  console.log(`[Patron] Session key ready: ${info.sessionAddress}${info.isNew ? " (new)" : ""}`);
});

// Listen for messages from content scripts and popup
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
      PatronWallet.getWalletInfo().then(sendResponse);
      return true;

    case "INIT_SESSION_KEY":
      PatronWallet.initSessionKey().then(sendResponse);
      return true;

    case "COMPLETE_SETUP":
      PatronWallet.completeSetup(data.accountAddress, data.ownerAddress)
        .then((result) => sendResponse({ success: true, ...result }))
        .catch((err) => sendResponse({ error: err.message }));
      return true;

    case "PREDICT_ACCOUNT":
      PatronWallet.predictAccountAddress(data.ownerAddress)
        .then((address) => sendResponse({ address }))
        .catch((err) => sendResponse({ error: err.message }));
      return true;

    case "RESET_WALLET":
      PatronWallet.resetWallet().then(sendResponse);
      return true;

    // Deprecated: kept for bridge compatibility during migration
    case "INIT_WALLET":
      PatronWallet.initSessionKey().then(sendResponse);
      return true;

    case "APPROVE_AND_DEPOSIT":
      PatronWallet.approveAndDeposit()
        .then((result) => sendResponse({ success: true, ...result }))
        .catch((err) => sendResponse({ error: err.message }));
      return true;
  }

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
    // Look up artist on MusicBrainz
    const lookupUrl = `${API_BASE}/api/lookup?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`;
    const res = await fetch(lookupUrl);

    if (!res.ok) {
      console.warn(`[Patron] Lookup failed: ${res.status}`);
      scrobbleState = { ...scrobbleState, status: "lookup_failed" };
      chrome.storage.local.set({ scrobbleState });
      return;
    }

    const data = await res.json();

    if (data.artist?.mbidHash) {
      // Send tip via session key → PatronAccount → Escrow
      try {
        const tipResult = await PatronWallet.sendTip(data.artist.mbidHash);
        console.log(`[Patron] On-chain tip tx: ${tipResult.txHash}`);
        scrobbleState = { ...scrobbleState, status: "tipped", txHash: tipResult.txHash };

        // Notify dashboard so tip appears in feed
        fetch(`${API_BASE}/api/tip`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            artist: data.artist.name || artist,
            track: data.track?.title || track,
            platform,
            txHash: tipResult.txHash,
          }),
        }).catch(() => {}); // best-effort, don't block
      } catch (err) {
        console.warn(`[Patron] Tip failed: ${err.message}`);
        scrobbleState = { ...scrobbleState, status: "tip_failed", tipError: err.message };
      }
      chrome.storage.local.set({ scrobbleState });
    }

    // Store in history
    const { tipHistory = [] } = await chrome.storage.local.get(["tipHistory"]);

    tipHistory.unshift({
      artist: data.artist?.name || artist,
      track: data.track?.title || track,
      mbid: data.artist?.mbid,
      mbidHash: data.artist?.mbidHash,
      amount: TIP_AMOUNT,
      platform,
      timestamp: Date.now(),
      txHash: scrobbleState.txHash || null,
    });

    if (tipHistory.length > 100) tipHistory.length = 100;
    await chrome.storage.local.set({ tipHistory });

    console.log(`[Patron] Tip recorded: $${TIP_AMOUNT} → ${data.artist?.name || artist}`);
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
  const data = await chrome.storage.local.get(["scrobbleState", "tipHistory"]);
  const tips = data.tipHistory || [];
  const uniqueArtists = new Set(tips.map((t) => t.artist)).size;
  return {
    scrobble: data.scrobbleState || scrobbleState,
    tipCount: tips.length,
    totalTipped: (tips.length * TIP_AMOUNT).toFixed(2),
    uniqueArtists,
    recentTips: tips.slice(0, 10),
  };
}
