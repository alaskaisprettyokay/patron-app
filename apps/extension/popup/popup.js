// Patron Popup — receipt-style wallet + scrobble state + history

const platformNames = {
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  bandcamp: "Bandcamp",
  "youtube-music": "YouTube Music",
  subcult: "Subcult",
};

// --- Wallet UI ---

function renderWallet() {
  const section = document.getElementById("wallet-section");

  chrome.runtime.sendMessage({ type: "GET_WALLET_INFO" }, (info) => {
    if (chrome.runtime.lastError || !info) {
      section.innerHTML = `<div class="wallet-error">Extension loading...</div>`;
      return;
    }

    if (info.error) {
      section.innerHTML = `
        <div class="wallet-row">
          <span class="wallet-label">Wallet</span>
          <span class="wallet-addr">${shortAddr(info.address)}</span>
        </div>
        <div class="wallet-error">Network error</div>
      `;
      return;
    }

    const funded = parseFloat(info.escrowBalance) > 0;
    const hasUsdc = parseFloat(info.usdcBalance) > 0;

    section.innerHTML = `
      <div class="label">Wallet</div>
      <div class="wallet-row">
        <span class="wallet-label">Address</span>
        <span class="wallet-addr" id="wallet-addr" title="${info.address}">${shortAddr(info.address)}</span>
      </div>
      <div class="wallet-row">
        <span class="wallet-label">USDC</span>
        <span class="wallet-val">$${info.usdcBalance}</span>
      </div>
      <div class="wallet-row">
        <span class="wallet-label">Tip balance</span>
        <span class="wallet-val ${funded ? 'funded' : 'empty'}">$${info.escrowBalance}</span>
      </div>
      ${!funded && hasUsdc ? `
        <button id="deposit-btn" class="wallet-btn">Deposit $${info.usdcBalance}</button>
      ` : ""}
      ${!funded && !hasUsdc ? `
        <div class="wallet-fund">
          <div class="fund-label">Send USDC (Arc Testnet) to:</div>
          <div class="fund-addr" id="fund-addr">${info.address}</div>
          <button id="copy-addr-btn" class="wallet-btn-sm">Copy address</button>
        </div>
      ` : ""}
      ${funded ? `
        <div class="wallet-ready">Ready to auto-tip</div>
      ` : ""}
    `;

    // Copy address
    document.getElementById("copy-addr-btn")?.addEventListener("click", () => {
      navigator.clipboard.writeText(info.address);
      document.getElementById("copy-addr-btn").textContent = "Copied";
      setTimeout(() => {
        const btn = document.getElementById("copy-addr-btn");
        if (btn) btn.textContent = "Copy address";
      }, 2000);
    });

    // Copy on click wallet addr
    document.getElementById("wallet-addr")?.addEventListener("click", () => {
      navigator.clipboard.writeText(info.address);
    });

    // Deposit button
    document.getElementById("deposit-btn")?.addEventListener("click", () => {
      const btn = document.getElementById("deposit-btn");
      btn.textContent = "Approving + depositing...";
      btn.disabled = true;
      chrome.runtime.sendMessage({ type: "APPROVE_AND_DEPOSIT" }, (result) => {
        if (result?.error) {
          btn.textContent = `Error: ${result.error}`;
          btn.disabled = false;
        } else {
          renderWallet();
        }
      });
    });
  });
}

function shortAddr(addr) {
  if (!addr) return "—";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

// --- Scrobble UI ---

function update() {
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
    if (!response) return;

    const { scrobble, tipCount, totalTipped, recentTips } = response;
    const state = scrobble?.status || "idle";

    document.getElementById("total-tipped").textContent = `$${totalTipped}`;
    document.getElementById("tip-count").textContent = `${tipCount}`;

    if (scrobble?.artist) {
      document.getElementById("track-name").textContent = scrobble.track || "—";
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
    const tipResult = document.getElementById("tip-result");

    if (state === "listening") {
      progressContainer.style.display = "block";
      tipResult.style.display = "none";
      progressFill.className = "progress-fill listening";
      progressFill.style.width = `${scrobble.percent || 0}%`;
      const elapsed = Math.round((scrobble.percent / 100) * (scrobble.threshold / 1000));
      document.getElementById("progress-time").textContent = `${elapsed}s`;
      document.getElementById("progress-target").textContent = `${scrobble.threshold / 1000}s`;
    } else if (state === "tipped") {
      progressContainer.style.display = "block";
      progressFill.className = "progress-fill complete";
      progressFill.style.width = "100%";
      document.getElementById("progress-time").textContent = "Done";
      tipResult.style.display = "block";
      tipResult.className = "tip-result paid";
      if (scrobble.txHash) {
        tipResult.innerHTML = `<a href="https://testnet.arcscan.app/tx/${scrobble.txHash}" target="_blank">$0.01 tipped on-chain</a>`;
      } else {
        tipResult.textContent = "$0.01 tipped on-chain";
      }
      renderWallet();
    } else if (state === "scrobbled") {
      progressContainer.style.display = "block";
      progressFill.className = "progress-fill complete";
      progressFill.style.width = "100%";
      document.getElementById("progress-time").textContent = "Tipping...";
      tipResult.style.display = "none";
    } else if (state === "tip_failed") {
      progressContainer.style.display = "block";
      progressFill.className = "progress-fill";
      progressFill.style.width = "100%";
      progressFill.style.background = "#b84a32";
      tipResult.style.display = "block";
      tipResult.className = "tip-result";
      tipResult.textContent = scrobble.tipError || "Tip failed";
    } else if (state === "paused") {
      progressContainer.style.display = "block";
      tipResult.style.display = "none";
    } else if (state === "skipped") {
      progressContainer.style.display = "block";
      progressFill.style.width = "0%";
      tipResult.style.display = "block";
      tipResult.className = "tip-result escrowed";
      tipResult.textContent = "Skipped — no tip";
    } else {
      progressContainer.style.display = "none";
      tipResult.style.display = "none";
    }

    // History — receipt items
    const historySection = document.getElementById("history-section");
    const historyList = document.getElementById("history-list");
    if (recentTips && recentTips.length > 0) {
      historySection.style.display = "block";
      historyList.innerHTML = recentTips
        .slice(0, 5)
        .map(
          (tip) => `
        <div class="history-item">
          <div>
            <div class="track">${tip.artist}</div>
            <div class="artist">${tip.track} · ${platformNames[tip.platform] || tip.platform}</div>
          </div>
          <div class="amount">
            ${tip.txHash ? `<a href="https://testnet.arcscan.app/tx/${tip.txHash}" target="_blank">$${tip.amount.toFixed(2)}</a>` : '$' + tip.amount.toFixed(2)}
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
