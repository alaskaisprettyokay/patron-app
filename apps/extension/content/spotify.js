// onda content script — Spotify (open.spotify.com)

(function () {
  const SCROBBLE_THRESHOLD = 10000; // 10s for demo (30s for production)
  const POLL_INTERVAL = 1000; // Check every second for smooth progress

  let currentTrack = null;
  let listenStart = null;
  let scrobbled = false;

  function getTrackInfo() {
    let artist = null;
    let track = null;

    // Method 1: data-testid selectors (Spotify Web Player)
    const titleEl = document.querySelector(
      '[data-testid="context-item-info-title"]'
    );
    const artistEl = document.querySelector(
      '[data-testid="context-item-info-artist"]'
    );

    if (titleEl && artistEl) {
      track = titleEl.textContent?.trim();
      artist = artistEl.textContent?.trim();
    }

    // Method 2: Now Playing bar
    if (!track || !artist) {
      const nowPlayingTrack = document.querySelector(
        '[data-testid="now-playing-widget"] [data-testid="context-item-link"]'
      );
      const nowPlayingArtist = document.querySelector(
        '[data-testid="now-playing-widget"] [data-testid="context-item-info-artist"]'
      );
      if (nowPlayingTrack) track = nowPlayingTrack.textContent?.trim();
      if (nowPlayingArtist) artist = nowPlayingArtist.textContent?.trim();
    }

    // Method 3: document.title fallback
    if (!track || !artist) {
      const title = document.title;
      const match = title.match(/^(.+?)\s[·\-]\s(.+?)\s*[|]/);
      if (match) {
        track = match[1].trim();
        artist = match[2].trim();
      }
    }

    return { artist, track };
  }

  function isPlaying() {
    // Spotify: play/pause button shows "Pause" aria-label when music is playing
    const playBtn = document.querySelector(
      '[data-testid="control-button-playpause"]'
    );
    if (playBtn) {
      const label = playBtn.getAttribute("aria-label")?.toLowerCase() || "";
      return label.includes("pause");
    }
    // Fallback: check if title is updating (has track info vs just "Spotify")
    return document.title !== "Spotify" && document.title.includes("·");
  }

  function detectAndScrobble() {
    const { artist, track } = getTrackInfo();
    const playing = isPlaying();
    const key = artist && track ? `${artist}::${track}` : null;

    // Track changed or stopped
    if (key !== currentTrack) {
      if (currentTrack && !scrobbled) {
        // Skipped before threshold — notify
        chrome.runtime.sendMessage({
          type: "SCROBBLE_SKIPPED",
          data: { platform: "spotify" },
        });
      }
      currentTrack = key;
      listenStart = playing && key ? Date.now() : null;
      scrobbled = false;

      if (key && playing) {
        chrome.runtime.sendMessage({
          type: "SCROBBLE_START",
          data: {
            artist,
            track,
            platform: "spotify",
            threshold: SCROBBLE_THRESHOLD,
          },
        });
      }
    }

    // Not playing — pause the timer
    if (!playing) {
      if (listenStart) {
        // Pause — keep elapsed time but stop counting
        chrome.runtime.sendMessage({
          type: "SCROBBLE_PAUSED",
          data: { platform: "spotify" },
        });
      }
      listenStart = null;
      return;
    }

    // Resumed playing same track
    if (playing && key && !listenStart && !scrobbled) {
      listenStart = Date.now();
      chrome.runtime.sendMessage({
        type: "SCROBBLE_START",
        data: {
          artist,
          track,
          platform: "spotify",
          threshold: SCROBBLE_THRESHOLD,
        },
      });
    }

    // Check if threshold met
    if (playing && listenStart && !scrobbled) {
      const elapsed = Date.now() - listenStart;

      // Send progress update
      chrome.runtime.sendMessage({
        type: "SCROBBLE_PROGRESS",
        data: {
          artist,
          track,
          platform: "spotify",
          elapsed,
          threshold: SCROBBLE_THRESHOLD,
          percent: Math.min(100, Math.round((elapsed / SCROBBLE_THRESHOLD) * 100)),
        },
      });

      if (elapsed >= SCROBBLE_THRESHOLD) {
        scrobbled = true;
        chrome.runtime.sendMessage({
          type: "TRACK_DETECTED",
          data: { artist, track, platform: "spotify" },
        });
      }
    }
  }

  // Poll every second for smooth progress updates
  setInterval(detectAndScrobble, POLL_INTERVAL);
  setTimeout(detectAndScrobble, 1000);
})();
