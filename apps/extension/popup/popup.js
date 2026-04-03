// Patron Popup Script

async function updatePopup() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_STATUS" });
    if (!response) return;

    const { currentTrack, lastTipStatus, tipCount, totalTipped } = response;

    // Update stats
    document.getElementById("totalTipped").textContent = `$${totalTipped}`;
    document.getElementById("tipCount").textContent = tipCount;

    // Update status dot
    const dot = document.getElementById("statusDot");
    dot.className = currentTrack ? "status-dot" : "status-dot inactive";

    // Update content
    const content = document.getElementById("content");

    if (currentTrack) {
      let statusHtml = "";
      if (lastTipStatus) {
        const statusClass =
          lastTipStatus.status === "success"
            ? "success"
            : lastTipStatus.status === "error"
            ? "error"
            : "pending";
        const statusText =
          lastTipStatus.status === "success"
            ? "Tip sent $0.05"
            : lastTipStatus.status === "lookup_failed"
            ? "Artist not found"
            : "Error sending tip";
        const icon =
          lastTipStatus.status === "success" ? "\u2713" : lastTipStatus.status === "error" ? "\u2717" : "\u2022";
        statusHtml = `<div class="tip-status ${statusClass}">${icon} ${statusText}</div>`;
      }

      content.innerHTML = `
        <div class="current-track">
          <div class="track-label">Now Playing on ${currentTrack.platform}</div>
          <div class="track-name">${escapeHtml(currentTrack.track)}</div>
          <div class="artist-name">${escapeHtml(currentTrack.artist)}</div>
          ${statusHtml}
        </div>
      `;
    }
  } catch (error) {
    console.error("[Patron Popup] Error:", error);
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Update on load and every 3 seconds
updatePopup();
setInterval(updatePopup, 3000);
