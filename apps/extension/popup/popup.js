// Patron Popup — receipt-style wallet + scrobble state + history
// Now supports session key setup flow

const platformNames = {
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  bandcamp: "Bandcamp",
  "youtube-music": "YouTube Music",
};

// --- Wallet UI ---

function renderWallet() {
  const section = document.getElementById("wallet-section");

  chrome.runtime.sendMessage({ type: "GET_WALLET_INFO" }, (info) => {
    if (chrome.runtime.lastError || !info) {
      section.innerHTML = `<div class="wallet-error">Extension loading...</div>`;
      return;
    }

    if (!info.setupComplete) {
      renderSetupFlow(section, info);
      return;
    }

    if (info.error) {
      section.innerHTML = `
        <div class="wallet-row">
          <span class="wallet-label">Account</span>
          <span class="wallet-addr">${shortAddr(info.address)}</span>
        </div>
        <div class="wallet-error">Network error</div>
      `;
      return;
    }

    renderActiveWallet(section, info);
  });
}

function renderSetupFlow(section, info) {
  if (!info.sessionAddress) {
    // No session key yet — generate one
    section.innerHTML = `
      <div class="label">Setup</div>
      <button id="gen-session-btn" class="wallet-btn">Generate session key</button>
    `;
    document.getElementById("gen-session-btn")?.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "INIT_SESSION_KEY" }, () => renderWallet());
    });
    return;
  }

  // Session key exists, need user to authorize it from their main wallet
  section.innerHTML = `
    <div class="label">Setup</div>
    <div style="font-size: 10px; color: #78716c; margin-bottom: 8px;">
      Connect your wallet to authorize this extension.
    </div>
    <div class="wallet-row">
      <span class="wallet-label">Session key</span>
      <span class="wallet-addr" id="session-addr" title="${info.sessionAddress}">${shortAddr(info.sessionAddress)}</span>
    </div>
    <div style="margin-top: 10px;">
      <div class="fund-label">Your wallet address</div>
      <input type="text" id="owner-input" placeholder="0x..." style="
        width: 100%; font-family: inherit; font-size: 10px; padding: 6px;
        border: 1px solid #c4bcb0; background: #ebe4d8; color: #1c1917;
        box-sizing: border-box;
      ">
    </div>
    <div style="margin-top: 6px;">
      <div class="fund-label">PatronAccount address</div>
      <input type="text" id="account-input" placeholder="0x..." style="
        width: 100%; font-family: inherit; font-size: 10px; padding: 6px;
        border: 1px solid #c4bcb0; background: #ebe4d8; color: #1c1917;
        box-sizing: border-box;
      ">
    </div>
    <div style="font-size: 9px; color: #a8a29e; margin-top: 6px; line-height: 1.5;">
      1. Deploy a PatronAccount (or use factory)<br>
      2. Call <strong>authorizeSession</strong> with the session key above<br>
      3. Enter your addresses and connect
    </div>
    <button id="connect-btn" class="wallet-btn">Connect</button>
    <div id="setup-error" class="wallet-error" style="margin-top: 4px;"></div>
  `;

  document.getElementById("session-addr")?.addEventListener("click", () => {
    navigator.clipboard.writeText(info.sessionAddress);
  });

  document.getElementById("connect-btn")?.addEventListener("click", () => {
    const accountAddr = document.getElementById("account-input").value.trim();
    const ownerAddr = document.getElementById("owner-input").value.trim();
    const errorEl = document.getElementById("setup-error");
    const btn = document.getElementById("connect-btn");

    if (!accountAddr || !ownerAddr) {
      errorEl.textContent = "Both addresses required";
      return;
    }
    if (!accountAddr.startsWith("0x") || !ownerAddr.startsWith("0x")) {
      errorEl.textContent = "Invalid address format";
      return;
    }

    btn.textContent = "Verifying...";
    btn.disabled = true;
    errorEl.textContent = "";

    chrome.runtime.sendMessage(
      { type: "COMPLETE_SETUP", data: { accountAddress: accountAddr, ownerAddress: ownerAddr } },
      (result) => {
        if (result?.error) {
          errorEl.textContent = result.error;
          btn.textContent = "Connect";
          btn.disabled = false;
        } else {
          renderWallet();
        }
      }
    );
  });
}

function renderActiveWallet(section, info) {
  const funded = parseFloat(info.escrowBalance) > 0;
  const sessionActive = info.session?.active && !info.session?.expired;
  const budgetLow = parseFloat(info.session?.remainingBudget || "0") < 0.10;

  section.innerHTML = `
    <div class="label">Account</div>
    <div class="wallet-row">
      <span class="wallet-label">PatronAccount</span>
      <span class="wallet-addr" id="wallet-addr" title="${info.address}">${shortAddr(info.address)}</span>
    </div>
    <div class="wallet-row">
      <span class="wallet-label">Tip balance</span>
      <span class="wallet-val ${funded ? 'funded' : 'empty'}">$${info.escrowBalance}</span>
    </div>
    <div class="wallet-row">
      <span class="wallet-label">Session</span>
      <span class="wallet-val" style="color: ${sessionActive ? '#2ed573' : '#b84a32'};">
        ${sessionActive ? 'Active' : (info.session?.expired ? 'Expired' : 'Revoked')}
      </span>
    </div>
    ${sessionActive ? `
      <div class="wallet-row">
        <span class="wallet-label">Budget left today</span>
        <span class="wallet-val ${budgetLow ? 'empty' : ''}" >$${info.session.remainingBudget}</span>
      </div>
    ` : ''}
    ${!funded ? `
      <div class="wallet-fund">
        <div class="fund-label">Deposit USDC via your main wallet</div>
        <div class="fund-addr" id="fund-addr">${info.address}</div>
        <button id="copy-addr-btn" class="wallet-btn-sm">Copy account address</button>
      </div>
    ` : ''}
    ${funded && sessionActive ? `
      <div class="wallet-ready">Ready to auto-tip</div>
    ` : ''}
    ${!sessionActive ? `
      <div style="font-size: 9px; color: #a8a29e; margin-top: 6px;">
        Re-authorize session key from your main wallet to resume tipping.
      </div>
      <button id="reset-btn" class="wallet-btn-sm">Reset and re-setup</button>
    ` : ''}
  `;

  document.getElementById("copy-addr-btn")?.addEventListener("click", () => {
    navigator.clipboard.writeText(info.address);
    document.getElementById("copy-addr-btn").textContent = "Copied";
    setTimeout(() => {
      const btn = document.getElementById("copy-addr-btn");
      if (btn) btn.textContent = "Copy account address";
    }, 2000);
  });

  document.getElementById("wallet-addr")?.addEventListener("click", () => {
    navigator.clipboard.writeText(info.address);
  });

  document.getElementById("reset-btn")?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "RESET_WALLET" }, () => renderWallet());
  });
}

function shortAddr(addr) {
  if (!addr) return "\u2014";
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
      document.getElementById("track-name").textContent = scrobble.track || "\u2014";
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
      tipResult.textContent = "Skipped \u2014 no tip";
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
            <div class="artist">${tip.track} \u00B7 ${platformNames[tip.platform] || tip.platform}</div>
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
