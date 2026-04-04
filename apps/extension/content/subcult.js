// onda content script — Subcult (app.subcult.music)
// Uses hybrid approach: listens for first-party postMessage events,
// falls back to DOM scraping if events not available

(function () {
  const SCROBBLE_THRESHOLD = 10000;
  const POLL_INTERVAL = 1000;

  let currentTrack = null;
  let listenStart = null;
  let scrobbled = false;
  let usingPostMessage = false;

  // --- First-party integration: listen for Subcult player events ---
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.type !== "ONDA_TRACK") return;

    usingPostMessage = true;
    const { artist, track, mbid, playing } = event.data;
    const key = artist && track ? `${artist}::${track}` : null;

    if (key !== currentTrack) {
      if (currentTrack && !scrobbled) {
        chrome.runtime.sendMessage({
          type: "SCROBBLE_SKIPPED",
          data: { platform: "subcult" },
        });
      }
      currentTrack = key;
      listenStart = null;
      scrobbled = false;
    }

    if (!playing) {
      if (listenStart) {
        chrome.runtime.sendMessage({
          type: "SCROBBLE_PAUSED",
          data: { platform: "subcult" },
        });
      }
      listenStart = null;
      return;
    }

    if (playing && key && !listenStart && !scrobbled) {
      listenStart = Date.now();
      chrome.runtime.sendMessage({
        type: "SCROBBLE_START",
        data: { artist, track, platform: "subcult", threshold: SCROBBLE_THRESHOLD, mbid },
      });
    }
  });

  // Progress ticker for postMessage mode
  setInterval(() => {
    if (!usingPostMessage || !listenStart || scrobbled) return;

    const elapsed = Date.now() - listenStart;
    chrome.runtime.sendMessage({
      type: "SCROBBLE_PROGRESS",
      data: {
        platform: "subcult",
        elapsed,
        threshold: SCROBBLE_THRESHOLD,
        percent: Math.min(100, Math.round((elapsed / SCROBBLE_THRESHOLD) * 100)),
      },
    });

    if (elapsed >= SCROBBLE_THRESHOLD) {
      scrobbled = true;
      // Extract current info from last known state
      const [artist, track] = (currentTrack || "::").split("::");
      chrome.runtime.sendMessage({
        type: "TRACK_DETECTED",
        data: { artist, track, platform: "subcult" },
      });
    }
  }, POLL_INTERVAL);

  // --- Fallback: DOM scraping ---
  function getTrackInfo() {
    let artist = null;
    let track = null;

    // Player bar: track-info component renders track title + artist name
    // Look for the fixed bottom player bar
    const playerBar = document.querySelector('[class*="fixed"][class*="bottom-0"]');
    if (playerBar) {
      // Track title is typically a link or span with the track name
      const links = playerBar.querySelectorAll("a, span");
      for (const el of links) {
        const text = el.textContent?.trim();
        if (!text || text.length < 2) continue;
        // Heuristic: first meaningful text is track, second is artist
        if (!track) {
          track = text;
        } else if (!artist && text !== track) {
          artist = text;
          break;
        }
      }
    }

    // Fallback: document title — Subcult sets "Track — Artist | Subcult"
    if (!track || !artist) {
      const title = document.title;
      const match = title.match(/^(.+?)\s[—–-]\s(.+?)(?:\s*\|.*)?$/);
      if (match) {
        track = match[1].trim();
        artist = match[2].trim();
      }
    }

    return { artist, track };
  }

  function isPlaying() {
    // Check for audio element
    const audio = document.querySelector("audio");
    if (audio) {
      return !audio.paused && !audio.ended && audio.currentTime > 0;
    }
    // Check for play/pause button state
    const pauseBtn = document.querySelector('[aria-label="Pause"]');
    if (pauseBtn) return true;
    return false;
  }

  function detectAndScrobble() {
    // Skip DOM scraping if postMessage is active
    if (usingPostMessage) return;

    const { artist, track } = getTrackInfo();
    const playing = isPlaying();
    const key = artist && track ? `${artist}::${track}` : null;

    if (key !== currentTrack) {
      if (currentTrack && !scrobbled) {
        chrome.runtime.sendMessage({
          type: "SCROBBLE_SKIPPED",
          data: { platform: "subcult" },
        });
      }
      currentTrack = key;
      listenStart = playing && key ? Date.now() : null;
      scrobbled = false;

      if (key && playing) {
        chrome.runtime.sendMessage({
          type: "SCROBBLE_START",
          data: { artist, track, platform: "subcult", threshold: SCROBBLE_THRESHOLD },
        });
      }
    }

    if (!playing) {
      if (listenStart) {
        chrome.runtime.sendMessage({
          type: "SCROBBLE_PAUSED",
          data: { platform: "subcult" },
        });
      }
      listenStart = null;
      return;
    }

    if (playing && key && !listenStart && !scrobbled) {
      listenStart = Date.now();
      chrome.runtime.sendMessage({
        type: "SCROBBLE_START",
        data: { artist, track, platform: "subcult", threshold: SCROBBLE_THRESHOLD },
      });
    }

    if (playing && listenStart && !scrobbled) {
      const elapsed = Date.now() - listenStart;
      chrome.runtime.sendMessage({
        type: "SCROBBLE_PROGRESS",
        data: {
          artist, track, platform: "subcult",
          elapsed, threshold: SCROBBLE_THRESHOLD,
          percent: Math.min(100, Math.round((elapsed / SCROBBLE_THRESHOLD) * 100)),
        },
      });

      if (elapsed >= SCROBBLE_THRESHOLD) {
        scrobbled = true;
        chrome.runtime.sendMessage({
          type: "TRACK_DETECTED",
          data: { artist, track, platform: "subcult" },
        });
      }
    }
  }

  setInterval(detectAndScrobble, POLL_INTERVAL);
  setTimeout(detectAndScrobble, 1500);
})();
