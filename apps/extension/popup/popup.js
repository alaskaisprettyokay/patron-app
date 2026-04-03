// Patron Popup — shows scrobble state + history

const statusLabels = {
  idle: "Waiting for music...",
  listening: "Listening...",
  scrobbled: "Scrobbled ✅",
  paused: "Paused ⏸",
  skipped: "Skipped ⏭",
  lookup_failed: "Artist not found",
  error: "Error",
};

const platformNames = {
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  bandcamp: "Bandcamp",
  "youtube-music": "YouTube Music",
};

function update() {
  chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
    if (!response) return;

    const { scrobble, tipCount, totalTipped, recentTips } = response;
    const app = document.getElementById("app");
    const state = scrobble?.status || "idle";

    // Update class for styling
    app.className = `status-${state}`;

    // Stats
    document.getElementById("total-tipped").textContent = `$${totalTipped}`;
    document.getElementById("tip-count").textContent = `${tipCount} scrobble${tipCount !== 1 ? "s" : ""}`;

    // Status label
    document.getElementById("status-label").textContent = statusLabels[state] || state;

    // Track info
    if (scrobble?.artist) {
      document.getElementById("track-name").textContent = scrobble.track || "—";
      document.getElementById("artist-name").textContent = scrobble.artist;
      document.getElementById("empty-state").style.display = "none";
    }

    // Progress bar
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
    } else if (state === "scrobbled") {
      progressContainer.style.display = "block";
      progressFill.className = "progress-fill complete";
      progressFill.style.width = "100%";
      document.getElementById("progress-time").textContent = "Done!";
      tipResult.style.display = "flex";
      tipResult.textContent = "💰 $0.05 tipped to artist";
    } else if (state === "paused") {
      // Keep progress bar visible but frozen
      progressContainer.style.display = "block";
      tipResult.style.display = "none";
    } else if (state === "skipped") {
      progressContainer.style.display = "block";
      progressFill.style.width = "0%";
      tipResult.style.display = "flex";
      tipResult.className = "tip-result escrowed";
      tipResult.textContent = "⏭ Skipped — no tip";
    } else {
      progressContainer.style.display = "none";
      tipResult.style.display = "none";
    }

    // History
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
            <div class="history-track">${tip.track}</div>
            <div class="history-artist">${tip.artist} · ${platformNames[tip.platform] || tip.platform}</div>
          </div>
          <div class="history-amount">$${tip.amount.toFixed(2)}</div>
        </div>
      `
        )
        .join("");
    }
  });
}

// Update every second for smooth progress
setInterval(update, 1000);
update();
