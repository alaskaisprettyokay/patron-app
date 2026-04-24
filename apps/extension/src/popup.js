// onda popup — now-playing + recent waves + wallet onboarding, new design
import QRCode from "qrcode";

const WEB_URL = process.env.PATRON_WEB_URL;

// Dashboard link
const dashLink = document.getElementById("dashboard-link");
if (dashLink) dashLink.href = `${WEB_URL}/dashboard`;

// Keep the service worker alive while the popup is open (MV3 requirement).
// Also receives LINKED messages when a Joined event is detected on-chain.
const swPort = chrome.runtime.connect({ name: "popup" });
swPort.onMessage.addListener((msg) => {
  if (msg.type === "LINKED") {
    // Force renderWallet's transition block to run (it only runs when
    // currentlyLinked !== true, so don't pre-set it to true here).
    renderWallet();
  }
});

const PLATFORM_NAMES = {
  spotify: "spotify",
  soundcloud: "soundcloud",
  bandcamp: "bandcamp",
  "youtube-music": "yt music",
  subcult: "subcult",
};

function shortAddr(addr) {
  if (!addr) return "—";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function platformLabel(platform) {
  return PLATFORM_NAMES[platform] || platform || "somewhere";
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ── Live bars (animated when listening) ─────────────────────────

const BARS_EL = document.getElementById("live-bars");
const BAR_COUNT = 28;
for (let i = 0; i < BAR_COUNT; i++) {
  const b = document.createElement("div");
  b.className = "onda-popup__bar";
  b.style.height = "3px";
  BARS_EL.appendChild(b);
}
const BAR_NODES = Array.from(BARS_EL.children);
let barTick = 0;
let barsActive = false;

function animateBars() {
  if (!barsActive) return;
  barTick += 1;
  for (let i = 0; i < BAR_NODES.length; i++) {
    const h = 4 + Math.abs(Math.sin((barTick + i * 0.7) * 0.3)) * 12;
    BAR_NODES[i].style.height = `${Math.max(3, h)}px`;
  }
  requestAnimationFrame(animateBars);
}

function setBars(active) {
  if (active && !barsActive) {
    barsActive = true;
    requestAnimationFrame(animateBars);
  } else if (!active && barsActive) {
    barsActive = false;
    for (const n of BAR_NODES) n.style.height = "3px";
  }
}

// ── Account / Wallet UI ─────────────────────────────────────────

let currentlyLinked = null; // track to avoid re-rendering QR on every tick

function renderWallet() {
  chrome.runtime.sendMessage({ type: "GET_ACCOUNT_STATUS" }, (status) => {
    if (chrome.runtime.lastError || !status) return;

    if (!status.isLinked) {
      if (currentlyLinked !== false) {
        currentlyLinked = false;
        renderOnboarding(status.sessionAddress);
      }
    } else {
      // Enforce visible state every tick — idempotent and guards against
      // any path where currentlyLinked gets out of sync with the DOM.
      document.getElementById("wallet-section").style.display = "none";
      document.getElementById("np-section").style.display = "block";
      currentlyLinked = true;
      const bal = document.getElementById("header-balance");
      if (bal) bal.textContent = status.usdcBalance != null ? `$${status.usdcBalance}` : "—";
    }
  });
}

function renderOnboarding(sessionAddress) {
  const section = document.getElementById("wallet-section");
  const np = document.getElementById("np-section");
  section.style.display = "block";
  np.style.display = "none";

  section.innerHTML = `
    <div class="onda-popup__onboard-title">connect a wallet</div>
    <div class="onda-popup__onboard-sub">sign in to start sending waves to artists.</div>
    <button class="onda-popup__wallet-btn" id="connect-browser-btn">connect browser wallet</button>
    <div class="onda-popup__onboard-divider">or scan qr</div>
    <div id="qr-container" class="onda-popup__qr"></div>
    <div class="onda-popup__onboard-session">
      <span>session</span>
      <span>${shortAddr(sessionAddress)}</span>
    </div>
    <div class="onda-popup__onboard-hint">keep this open — it updates when detected</div>
  `;

  chrome.runtime.sendMessage({ type: "GET_JOIN_URI" }, async (uri) => {
    if (!uri || uri.error) return;
    const btn = document.getElementById("connect-browser-btn");
    if (btn) btn.addEventListener("click", () => chrome.tabs.create({ url: uri }));

    const container = document.getElementById("qr-container");
    if (!container) return;
    const canvas = document.createElement("canvas");
    try {
      await QRCode.toCanvas(canvas, uri, {
        width: 180,
        margin: 2,
        color: { dark: "#0D0D0D", light: "#ECE6DB" },
      });
      container.appendChild(canvas);
    } catch {
      container.textContent = uri;
    }
  });
}

// ── Artist connect (MusicBrainz platform links) ─────────────────

const PLATFORM_LABEL_MAP = {
  spotify: "spotify",
  bandcamp: "bandcamp",
  soundcloud: "soundcloud",
  youtube: "yt music",
  website: "website",
};

let connectState = {
  artist: null, // lowercased artist name currently in the panel
  open: false,
  status: "idle", // idle | loading | ready | empty | error
  data: null, // { mbid, urls }
};

// Direct MusicBrainz lookup — same shape the /lib/musicbrainz helpers use
// on the dashboard, inlined so the extension doesn't depend on our web API.
const MB_BASE = "https://musicbrainz.org/ws/2";

function mbUrlsFromRelations(relations) {
  const urls = {};
  for (const rel of relations || []) {
    const resource = rel?.url?.resource || "";
    if (resource.includes("bandcamp.com")) urls.bandcamp = resource;
    else if (resource.includes("soundcloud.com")) urls.soundcloud = resource;
    else if (resource.includes("spotify.com")) urls.spotify = resource;
    else if (resource.includes("youtube.com") || resource.includes("youtu.be"))
      urls.youtube = resource;
    else if (rel?.type === "official homepage") urls.website = resource;
  }
  return urls;
}

async function fetchArtistLinks(name) {
  const q = encodeURIComponent(`artist:"${name}"`);
  const searchRes = await fetch(`${MB_BASE}/artist/?query=${q}&fmt=json&limit=1`);
  if (!searchRes.ok) throw new Error(`MB search ${searchRes.status}`);
  const searchJson = await searchRes.json();
  const top = (searchJson.artists || [])[0];
  if (!top) return { found: false };

  const detailsRes = await fetch(`${MB_BASE}/artist/${top.id}?inc=url-rels&fmt=json`);
  if (!detailsRes.ok) throw new Error(`MB details ${detailsRes.status}`);
  const details = await detailsRes.json();
  const urls = mbUrlsFromRelations(details.relations);
  return { found: true, mbid: top.id, urls };
}

function renderConnectPanel() {
  const panel = document.getElementById("np-connect-panel");
  const toggle = document.getElementById("np-connect-btn");
  if (!panel || !toggle) return;

  if (!connectState.open) {
    panel.style.display = "none";
    toggle.textContent = "connect →";
    return;
  }

  toggle.textContent = "hide ↑";
  panel.style.display = "flex";

  if (connectState.status === "loading") {
    panel.innerHTML = `<span class="onda-popup__connect-status">looking up…</span>`;
    return;
  }
  if (connectState.status === "error") {
    panel.innerHTML = `<span class="onda-popup__connect-status">couldn't reach musicbrainz</span>`;
    return;
  }
  if (connectState.status === "empty") {
    panel.innerHTML = `<span class="onda-popup__connect-status">no public links on musicbrainz</span>`;
    return;
  }
  if (connectState.status === "ready" && connectState.data) {
    const { urls = {}, mbid } = connectState.data;
    const pills = Object.entries(urls).map(([key, href]) => {
      const label = PLATFORM_LABEL_MAP[key] || key;
      return `<a class="onda-popup__connect-pill" href="${href}" target="_blank" rel="noopener">${label}</a>`;
    });
    const mbidLink = mbid
      ? `<a class="onda-popup__connect-mbid" href="https://musicbrainz.org/artist/${mbid}" target="_blank" rel="noopener">MB ↗</a>`
      : "";
    panel.innerHTML = pills.join("") + mbidLink;
  }
}

async function openConnect(artistName) {
  connectState.artist = artistName.toLowerCase();
  connectState.open = true;

  // Already loaded for this artist? Just show.
  if (connectState.data) {
    renderConnectPanel();
    return;
  }

  connectState.status = "loading";
  renderConnectPanel();
  try {
    const result = await fetchArtistLinks(artistName);
    if (!result.found || !result.urls || Object.keys(result.urls).length === 0) {
      connectState.status = "empty";
      connectState.data = { mbid: result.mbid, urls: {} };
    } else {
      connectState.status = "ready";
      connectState.data = { mbid: result.mbid, urls: result.urls };
    }
  } catch {
    connectState.status = "error";
  }
  renderConnectPanel();
}

function closeConnect() {
  connectState.open = false;
  renderConnectPanel();
}

function resetConnect() {
  connectState = { artist: null, open: false, status: "idle", data: null };
  renderConnectPanel();
}

function syncConnectForArtist(currentArtistName) {
  if (!currentArtistName) {
    if (connectState.artist) resetConnect();
    return;
  }
  const key = currentArtistName.toLowerCase();
  if (connectState.artist && connectState.artist !== key) {
    // artist changed — drop any cached data and close
    resetConnect();
  }
}

// Wire toggle button
const connectBtn = document.getElementById("np-connect-btn");
if (connectBtn) {
  connectBtn.addEventListener("click", () => {
    const artistNameEl = document.getElementById("artist-name");
    const name = artistNameEl ? artistNameEl.textContent.trim() : "";
    if (!name) return;
    if (connectState.open) closeConnect();
    else openConnect(name);
  });
}

// ── Scrobble / now-playing UI ───────────────────────────────────

function update() {
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
    if (!response) return;

    const { scrobble, totalGiven, recentGifts } = response;
    const state = scrobble?.status || "idle";

    // Header "sent this week"
    const given = document.getElementById("header-given");
    if (given) given.textContent = `$${totalGiven || "0.00"} sent this week`;

    const eyebrow = document.getElementById("np-eyebrow");
    const npRow = document.getElementById("np-row");
    const npEmpty = document.getElementById("np-empty");
    const trackEl = document.getElementById("track-name");
    const artistEl = document.getElementById("artist-name");
    const tipProgress = document.getElementById("tip-progress");
    const tipFill = document.getElementById("tip-fill");
    const tipLabel = document.getElementById("tip-label");
    const tipCountdown = document.getElementById("tip-countdown");
    const giftResult = document.getElementById("gift-result");
    const liveDot = document.getElementById("live-dot");

    // Default state reset
    tipFill.classList.remove("complete", "failed");
    giftResult.classList.remove("failed");
    giftResult.style.display = "none";

    if (scrobble?.artist) {
      npRow.style.display = "flex";
      npEmpty.style.display = "none";
      trackEl.textContent = scrobble.track || "--";
      artistEl.textContent = scrobble.artist;
      eyebrow.textContent = `listening · ${platformLabel(scrobble.platform)}`;
      syncConnectForArtist(scrobble.artist);
    } else {
      npRow.style.display = "none";
      npEmpty.style.display = "block";
      eyebrow.textContent = "idle";
      syncConnectForArtist(null);
      setBars(false);
      tipProgress.style.display = "none";
      liveDot.style.animationPlayState = "paused";
      renderRecent(recentGifts);
      return;
    }

    if (state === "listening") {
      setBars(true);
      tipProgress.style.display = "block";
      tipFill.style.width = `${scrobble.percent || 0}%`;
      const thresholdS = Math.round((scrobble.threshold || 0) / 1000);
      const elapsedS = Math.round(((scrobble.percent || 0) / 100) * thresholdS);
      const remaining = Math.max(0, thresholdS - elapsedS);
      tipLabel.textContent = "wave sends in";
      tipCountdown.textContent = `${remaining}s`;
      liveDot.style.animationPlayState = "running";
    } else if (state === "gifted") {
      setBars(false);
      tipProgress.style.display = "block";
      tipFill.classList.add("complete");
      tipFill.style.width = "100%";
      tipLabel.textContent = "wave sent";
      tipCountdown.textContent = `$${(scrobble.amount || 0.01).toFixed(2)}`;
      giftResult.style.display = "block";
      if (scrobble.txHash) {
        giftResult.innerHTML = `<a href="https://testnet.arcscan.app/tx/${scrobble.txHash}" target="_blank">sent to ${scrobble.artist}</a>`;
      } else {
        giftResult.textContent = `sent to ${scrobble.artist}`;
      }
      renderWallet(); // refresh balance
    } else if (state === "scrobbled") {
      setBars(false);
      tipProgress.style.display = "block";
      tipFill.classList.add("complete");
      tipFill.style.width = "100%";
      tipLabel.textContent = "sending…";
      tipCountdown.textContent = "";
    } else if (state === "gift_failed") {
      setBars(false);
      tipProgress.style.display = "block";
      tipFill.classList.add("failed");
      tipFill.style.width = "100%";
      tipLabel.textContent = "couldn't send";
      tipCountdown.textContent = "";
      giftResult.style.display = "block";
      giftResult.classList.add("failed");
      giftResult.textContent = scrobble.giftError || "try again next track";
    } else if (state === "paused") {
      setBars(false);
      tipProgress.style.display = "block";
      tipFill.style.width = "0%";
      tipLabel.textContent = "paused";
      tipCountdown.textContent = "";
      liveDot.style.animationPlayState = "paused";
    } else if (state === "skipped") {
      setBars(false);
      tipProgress.style.display = "block";
      tipFill.style.width = "0%";
      tipLabel.textContent = "skipped";
      tipCountdown.textContent = "";
    } else {
      setBars(false);
      tipProgress.style.display = "none";
    }

    renderRecent(recentGifts);
  });
}

function renderRecent(recentGifts) {
  const list = document.getElementById("recent-list");
  const empty = document.getElementById("recent-empty");
  if (!recentGifts || recentGifts.length === 0) {
    list.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  list.innerHTML = recentGifts
    .slice(0, 5)
    .map((g) => {
      const amtEl = g.txHash
        ? `<a class="mono onda-popup__recent-amt" href="https://testnet.arcscan.app/tx/${g.txHash}" target="_blank">+$${(g.amount || 0.01).toFixed(2)}</a>`
        : `<span class="mono onda-popup__recent-amt">+$${(g.amount || 0.01).toFixed(2)}</span>`;
      return `
        <div class="onda-popup__recent-row">
          <div class="onda-popup__recent-meta">
            <div class="onda-popup__recent-track">${escapeHtml(g.track || "")}</div>
            <div class="onda-popup__recent-artist">${escapeHtml(g.artist || "")} · ${platformLabel(g.platform)}</div>
          </div>
          <span class="mono onda-popup__recent-time">${timeAgo(g.timestamp)}</span>
          ${amtEl}
        </div>
      `;
    })
    .join("");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Footer buttons ──────────────────────────────────────────────

document.getElementById("btn-tip-extra").addEventListener("click", () => {
  chrome.tabs.create({ url: `${WEB_URL}/dashboard` });
});

let paused = false;
const btnPause = document.getElementById("btn-pause");
btnPause.addEventListener("click", () => {
  // Best-effort: service worker may or may not handle this yet.
  paused = !paused;
  btnPause.classList.toggle("active", paused);
  btnPause.textContent = paused ? "resume" : "pause";
  chrome.runtime.sendMessage({ type: "PAUSE_TOGGLE", paused });
});

document.getElementById("btn-settings").addEventListener("click", () => {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    chrome.tabs.create({ url: `${WEB_URL}/dashboard` });
  }
});

// Poll account status + scrobble state every second.
setInterval(renderWallet, 1000);
setInterval(update, 1000);
update();
renderWallet();
