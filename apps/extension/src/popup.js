// onda popup — receipt-style wallet + scrobble state + history
import QRCode from "qrcode";

// Keep the service worker alive while the popup is open (MV3 requirement).
// Also receives LINKED messages when a Joined event is detected on-chain.
const swPort = chrome.runtime.connect({ name: "popup" });
swPort.onMessage.addListener((msg) => {
  if (msg.type === "LINKED") {
    currentlyLinked = true;
    renderLinked(msg);
  }
});

const platformNames = {
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  bandcamp: "Bandcamp",
  "youtube-music": "YouTube Music",
};

// --- Account / Wallet UI ---

let currentlyLinked = null; // track to avoid re-rendering QR on every tick

function renderWallet() {
  chrome.runtime.sendMessage({ type: "GET_ACCOUNT_STATUS" }, (status) => {
    if (chrome.runtime.lastError || !status) {
      document.getElementById("wallet-section").innerHTML =
        `<div class="wallet-error">Extension loading...</div>`;
      return;
    }

    if (!status.isLinked) {
      // Only re-render QR if we weren't already showing it
      if (currentlyLinked !== false) {
        currentlyLinked = false;
        renderOnboarding(status.sessionAddress);
      }
    } else {
      if (currentlyLinked !== true) {
        currentlyLinked = true;
        renderLinked(status);
      }
    }
  });
}

function renderOnboarding(sessionAddress) {
  const section = document.getElementById("wallet-section");
  section.innerHTML = `
    <div class="label">Connect Wallet</div>
    <div class="onboard-text">Scan with your wallet to activate Patron</div>
    <div id="qr-container" class="qr-container"></div>
    <div class="wallet-row" style="margin-top:6px">
      <span class="wallet-label">Session</span>
      <span class="wallet-addr">${shortAddr(sessionAddress)}</span>
    </div>
    <div class="onboard-hint">Keep this open — it will update once detected</div>
  `;

  // Fetch the EIP-681 URI and render the QR code
  chrome.runtime.sendMessage({ type: "GET_JOIN_URI" }, async (uri) => {
    if (!uri || uri.error) return;
    const container = document.getElementById("qr-container");
    if (!container) return;

    const canvas = document.createElement("canvas");
    try {
      await QRCode.toCanvas(canvas, uri, {
        width: 200,
        margin: 2,
        color: { dark: "#1c1917", light: "#f5f0e8" },
      });
      container.appendChild(canvas);
    } catch (err) {
      container.textContent = uri;
    }
  });
}

function renderLinked(status) {
  const section = document.getElementById("wallet-section");
  const balanceDisplay = status.usdcBalance != null ? `$${status.usdcBalance}` : "…";
  section.innerHTML = `
    <div class="label">Account</div>
    <div class="wallet-row">
      <span class="wallet-label">Owner</span>
      <span class="wallet-addr" title="${status.ownerAddress}">${shortAddr(status.ownerAddress)}</span>
    </div>
    <div class="wallet-row">
      <span class="wallet-label">Smart Account</span>
      <span class="wallet-addr" title="${status.smartAccountAddress}">${shortAddr(status.smartAccountAddress)}</span>
    </div>
    <div class="wallet-row">
      <span class="wallet-label">Session</span>
      <span class="wallet-addr" title="${status.sessionAddress}">${shortAddr(status.sessionAddress)}</span>
    </div>
    <div class="wallet-row">
      <span class="wallet-label">Balance</span>
      <span class="wallet-addr">${balanceDisplay} USDC</span>
    </div>
    <div class="wallet-ready">Ready to auto-tip</div>
  `;
}

function shortAddr(addr) {
  if (!addr) return "—";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

// --- Scrobble UI ---

function update() {
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
    if (!response) return;

    const { scrobble, totalGiven, recentGifts } = response;
    const state = scrobble?.status || "idle";

    document.getElementById("total-given").textContent = `$${totalGiven}`;

    if (scrobble?.artist) {
      document.getElementById("track-name").textContent = scrobble.track || "--";
      document.getElementById("artist-name").textContent = scrobble.artist;
      document.getElementById("empty-state").style.display = "none";

      const badge = document.getElementById("platform-badge");
      if (scrobble.platform) {
        badge.style.display = "inline-block";
        badge.textContent = platformNames[scrobble.platform] || scrobble.platform;
        badge.className = "platform-badge";
      }
    }

    const progressContainer = document.getElementById("progress-container");
    const progressFill = document.getElementById("progress-fill");
    const giftResult = document.getElementById("gift-result");
    const giftDetail = document.getElementById("gift-detail");

    if (state === "listening") {
      progressContainer.style.display = "block";
      giftResult.style.display = "none";
      giftDetail.style.display = "none";
      progressFill.className = "progress-fill listening";
      progressFill.style.width = `${scrobble.percent || 0}%`;
      const elapsed = Math.round((scrobble.percent / 100) * (scrobble.threshold / 1000));
      document.getElementById("progress-time").textContent = `${elapsed}s`;
      document.getElementById("progress-target").textContent = `${scrobble.threshold / 1000}s`;
    } else if (state === "gifted") {
      progressContainer.style.display = "block";
      progressFill.className = "progress-fill complete";
      progressFill.style.width = "100%";
      document.getElementById("progress-time").textContent = "";
      giftResult.style.display = "block";
      giftResult.className = "gift-result sent";
      if (scrobble.txHash) {
        giftResult.innerHTML = `<a href="https://testnet.arcscan.app/tx/${scrobble.txHash}" target="_blank">sent $0.01 to ${scrobble.artist || "artist"}</a>`;
      } else {
        giftResult.textContent = `sent $0.01 to ${scrobble.artist || "artist"}`;
      }
      giftDetail.style.display = "none";
      renderWallet();
    } else if (state === "scrobbled") {
      progressContainer.style.display = "block";
      progressFill.className = "progress-fill complete";
      progressFill.style.width = "100%";
      document.getElementById("progress-time").textContent = "sending...";
      giftResult.style.display = "none";
      giftDetail.style.display = "none";
    } else if (state === "gift_failed") {
      progressContainer.style.display = "block";
      progressFill.className = "progress-fill";
      progressFill.style.width = "100%";
      progressFill.style.background = "#c4813a";
      giftResult.style.display = "block";
      giftResult.className = "gift-result";
      giftResult.textContent = scrobble.giftError || "couldn't send this one";
      giftDetail.style.display = "none";
    } else if (state === "paused") {
      progressContainer.style.display = "block";
      giftResult.style.display = "none";
      giftDetail.style.display = "none";
    } else if (state === "skipped") {
      progressContainer.style.display = "block";
      progressFill.style.width = "0%";
      giftResult.style.display = "block";
      giftResult.className = "gift-result escrowed";
      giftResult.textContent = "skipped";
      giftDetail.style.display = "none";
    } else {
      progressContainer.style.display = "none";
      giftResult.style.display = "none";
      giftDetail.style.display = "none";
    }

    // History
    const historySection = document.getElementById("history-section");
    const historyList = document.getElementById("history-list");
    if (recentGifts && recentGifts.length > 0) {
      historySection.style.display = "block";
      historyList.innerHTML = recentGifts
        .slice(0, 5)
        .map(
          (gift) => `
        <div class="history-item">
          <div>
            <div class="h-artist">${gift.artist}</div>
            <div class="h-track">${gift.track} · ${platformNames[gift.platform] || gift.platform}</div>
          </div>
          <div class="amount">
            ${gift.txHash
              ? `<a href="https://testnet.arcscan.app/tx/${gift.txHash}" target="_blank">$${gift.amount.toFixed(2)}</a>`
              : "$" + gift.amount.toFixed(2)}
          </div>
        </div>
      `
        )
        .join("");
    }
  });
}

// Poll account status every second (catches the moment join tx is detected)
setInterval(renderWallet, 1000);
setInterval(update, 1000);
update();
renderWallet();
