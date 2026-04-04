// onda service worker — handles scrobble + gift signing flow

import { initSession, getAccountStatus, getJoinUri, checkForJoin, watchForJoin, signTip, getSmartAccountBalance } from "./wallet.js";

const API_BASE = process.env.PATRON_WEB_URL || "http://localhost:3000";
const GIFT_AMOUNT = 10000; // 0.01 USDC in 6 decimals // 0.01 USDC in 6 decimals

// Current scrobble state
let scrobbleState = {
  status: "idle",
  artist: null,
  track: null,
  platform: null,
  percent: 0,
  threshold: 10000,
};

// Initialise session key on startup
initSession().then(({ sessionAddress, isNew }) => {
  console.log(`[onda] Session key ready: ${sessionAddress}${isNew ? " (new)" : ""}`);
});

// Keep the service worker alive while the popup holds a port open.
// While connected, watch for a Joined event and notify the popup when found.
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "popup") return;

  let unwatch = null;

  getAccountStatus().then(async (status) => {
    if (status.isLinked) return; // already linked, no need to watch

    // Start watching for a new Joined event
    unwatch = await watchForJoin(({ ownerAddress, smartAccountAddress }) => {
      port.postMessage({ type: "LINKED", ownerAddress, smartAccountAddress });
    });
  });

  port.onDisconnect.addListener(() => {
    if (unwatch) unwatch();
  });
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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

    case "GET_ACCOUNT_STATUS":
      // Also does a quick on-chain check if not yet linked
      getAccountStatus().then(async (status) => {
        if (!status.isLinked && status.sessionAddress) {
          const found = await checkForJoin();
          if (found) {
            const usdcBalance = await getSmartAccountBalance();
            sendResponse({ ...status, ...found, isLinked: true, usdcBalance });
            return;
          }
        }
        if (status.isLinked) {
          const usdcBalance = await getSmartAccountBalance();
          sendResponse({ ...status, usdcBalance });
          return;
        }
        sendResponse(status);
      });
      return true;

    case "GET_JOIN_URI":
      getJoinUri()
        .then(sendResponse)
        .catch((err) => sendResponse({ error: err.message }));
      return true;

    case "ONDA_VERIFY_SOUNDCLOUD":
      handleSoundCloudVerify(data)
        .then(sendResponse)
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

    const lookupData = await res.json();

    if (lookupData.artist?.mbidHash) {
      try {
        // Sign the gift with session key — web app relays on-chain
        const giftPayload = await signTip(lookupData.artist.mbidHash, GIFT_AMOUNT);

        const giftRes = await fetch(`${API_BASE}/api/relay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(giftPayload),
        });

        if (!giftRes.ok) {
          const err = await giftRes.json().catch(() => ({}));
          throw new Error(err.error || `Relay error ${giftRes.status}`);
        }

        const giftResult = await giftRes.json();
        console.log(`[onda] Gift submitted:`, giftResult);
        scrobbleState = {
          ...scrobbleState,
          status: "gifted",
          txHash: giftResult.txHash || null,
        };
      } catch (err) {
        console.warn(`[onda] Gift failed: ${err.message}`);
        scrobbleState = { ...scrobbleState, status: "gift_failed", giftError: err.message };
      }
      chrome.storage.local.set({ scrobbleState });
    }

    const artistName = lookupData.artist?.name || artist;
    const trackName = lookupData.track?.title || track;
    const txHash = scrobbleState.txHash || null;

    // Store in local history (shown in extension popup)
    const { giftHistory = [] } = await chrome.storage.local.get(["giftHistory"]);
    giftHistory.unshift({
      artist: artistName,
      track: trackName,
      mbid: lookupData.artist?.mbid,
      mbidHash: lookupData.artist?.mbidHash,
      amount: GIFT_AMOUNT / 1e6,
      platform,
      timestamp: Date.now(),
      txHash,
    });
    if (giftHistory.length > 100) giftHistory.length = 100;
    await chrome.storage.local.set({ giftHistory });

    // Also record in web app's persistent gift store (feeds artist pages + dashboard)
    fetch(`${API_BASE}/api/gift`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artist: artistName, track: trackName, platform, txHash }),
    }).catch(() => {/* best-effort */});
  } catch (error) {
    console.error("[onda] Error:", error);
    scrobbleState = { ...scrobbleState, status: "error" };
    chrome.storage.local.set({ scrobbleState });
  }
}

async function handleSoundCloudVerify({ url, code, mbid }) {
  // Find an existing SoundCloud tab on the artist's profile, or open one
  const tabs = await chrome.tabs.query({ url: "https://soundcloud.com/*" });
  let tab = tabs.find((t) => t.url && normalizeScUrl(t.url) === normalizeScUrl(url));

  if (!tab) {
    // Open the profile in a new tab
    tab = await chrome.tabs.create({ url, active: false });
    // Wait for it to load
    await new Promise((resolve) => {
      function listener(tabId, info) {
        if (tabId === tab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      }
      chrome.tabs.onUpdated.addListener(listener);
    });
    // Give the SPA a moment to render the bio
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Ask the content script on that tab to read the bio
  const result = await chrome.tabs.sendMessage(tab.id, {
    type: "ONDA_CHECK_SC_BIO",
    code,
  });

  // Close the tab if we opened it
  if (!tabs.find((t) => t.id === tab.id)) {
    chrome.tabs.remove(tab.id).catch(() => {});
  }

  if (result.found) {
    // Call the web app to mark verified
    const verifyRes = await fetch(`${API_BASE}/api/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mbid, code, verified: true }),
    });
    const verifyData = await verifyRes.json();
    return { verified: true, ...verifyData };
  }

  return { verified: false, bio: result.bio, url: result.url };
}

function normalizeScUrl(url) {
  return url.toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
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
    totalGiven: gifts.reduce((sum, g) => sum + (g.amount || 0), 0).toFixed(2),
    uniqueArtists,
    recentGifts: gifts.slice(0, 10),
  };
}
