// onda popup — receipt-style wallet + scrobble state + history

const platformNames = {
  spotify: "spotify",
  soundcloud: "soundcloud",
  bandcamp: "bandcamp",
  "youtube-music": "youtube music",
  subcult: "subcult",
};

// --- Wallet UI ---

function renderWallet() {
  const section = document.getElementById("wallet-section");

  chrome.runtime.sendMessage({ type: "GET_WALLET_INFO" }, (info) => {
    if (chrome.runtime.lastError || !info) {
      section.innerHTML = `<div class="wallet-error">loading...</div>`;
      return;
    }

    if (info.error) {
      section.innerHTML = `
        <div class="wallet-row">
          <span class="wallet-label">account</span>
          <span class="wallet-addr">${shortAddr(info.address)}</span>
        </div>
        <div class="wallet-error">can't reach the network right now</div>
      `;
      return;
    }

    const funded = parseFloat(info.escrowBalance) > 0;
    const hasUsdc = parseFloat(info.usdcBalance) > 0;

    section.innerHTML = `
      <div class="label">account</div>
      <div class="wallet-row">
        <span class="wallet-label">address</span>
        <span class="wallet-addr" id="wallet-addr" title="${info.address}">${shortAddr(info.address)}</span>
      </div>
      <div class="wallet-row">
        <span class="wallet-label">balance</span>
        <span class="wallet-val">$${info.usdcBalance}</span>
      </div>
      <div class="wallet-row">
        <span class="wallet-label">gift balance</span>
        <span class="wallet-val ${funded ? 'funded' : 'empty'}">$${info.escrowBalance}</span>
      </div>
      ${!funded && hasUsdc ? `
        <button id="deposit-btn" class="wallet-btn">deposit $${info.usdcBalance}</button>
      ` : ""}
      ${!funded && !hasUsdc ? `
        <div class="wallet-fund">
          <div class="fund-label">send USDC (Arc) to:</div>
          <div class="fund-addr" id="fund-addr">${info.address}</div>
          <button id="copy-addr-btn" class="wallet-btn-sm">copy address</button>
        </div>
      ` : ""}
      ${funded ? `
        <div class="wallet-ready">ready to send gifts</div>
      ` : ""}
    `;

    // Copy address
    document.getElementById("copy-addr-btn")?.addEventListener("click", () => {
      navigator.clipboard.writeText(info.address);
      document.getElementById("copy-addr-btn").textContent = "copied";
      setTimeout(() => {
        const btn = document.getElementById("copy-addr-btn");
        if (btn) btn.textContent = "copy address";
      }, 2000);
    });

    // Copy on click wallet addr
    document.getElementById("wallet-addr")?.addEventListener("click", () => {
      navigator.clipboard.writeText(info.address);
    });

    // Deposit button
    document.getElementById("deposit-btn")?.addEventListener("click", () => {
      const btn = document.getElementById("deposit-btn");
      btn.textContent = "approving + depositing...";
      btn.disabled = true;
      chrome.runtime.sendMessage({ type: "APPROVE_AND_DEPOSIT" }, (result) => {
        if (result?.error) {
          btn.textContent = `something went wrong`;
          btn.disabled = false;
        } else {
          renderWallet();
        }
      });
    });
  });
}

function shortAddr(addr) {
  if (!addr) return "--";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

// --- Scrobble UI ---

function update() {
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
    if (!response) return;

    const { scrobble, giftCount, totalGiven, recentGifts } = response;
    const state = scrobble?.status || "idle";

    document.getElementById("total-given").textContent = `$${totalGiven}`;
    document.getElementById("gift-count").textContent = `${giftCount}`;

    if (scrobble?.artist) {
      document.getElementById("artist-name").textContent = scrobble.artist;
      document.getElementById("track-name").textContent = scrobble.track || "--";
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
      progressFill.style.background = "#c27a3f";
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

    // History — receipt items
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
            ${gift.txHash ? `<a href="https://testnet.arcscan.app/tx/${gift.txHash}" target="_blank">$${gift.amount.toFixed(2)}</a>` : '$' + gift.amount.toFixed(2)}
          </div>
        </div>
      `
        )
        .join("");
    }
  });
}

// Update every second
setInterval(update, 1000);
setInterval(renderWallet, 10000);
update();
renderWallet();
