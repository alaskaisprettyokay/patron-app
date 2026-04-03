// Patron Content Script — Bandcamp (*.bandcamp.com)

(function () {
  const SCROBBLE_THRESHOLD = 10000;
  const POLL_INTERVAL = 1000;

  let currentTrack = null;
  let listenStart = null;
  let scrobbled = false;

  function getTrackInfo() {
    let artist = null;
    let track = null;

    // Method 1: Currently playing track in inline player
    const trackTitle = document.querySelector(".title_link span");
    const bandName = document.querySelector("#band-name-location .title");

    if (trackTitle) track = trackTitle.textContent?.trim();
    if (bandName) artist = bandName.textContent?.trim();

    // Method 2: Track page title area
    if (!track) {
      const trackNameEl = document.querySelector(".trackTitle");
      if (trackNameEl) track = trackNameEl.textContent?.trim();
    }
    if (!artist) {
      const artistEl = document.querySelector("#name-section a span");
      if (artistEl) artist = artistEl.textContent?.trim();
    }

    // Method 3: document.title — "Track | Artist"
    if (!track || !artist) {
      const title = document.title;
      const match = title.match(/^(.+?)\s*\|\s*(.+?)$/);
      if (match) {
        track = match[1].trim();
        artist = match[2].trim();
      }
    }

    return { artist, track };
  }

  function isPlaying() {
    // Bandcamp: check audio element
    const audio = document.querySelector("audio");
    if (audio) {
      return !audio.paused && !audio.ended && audio.currentTime > 0;
    }
    // Fallback: check play button state
    const playBtn = document.querySelector(".playbutton");
    if (playBtn) {
      return playBtn.classList.contains("playing");
    }
    return false;
  }

  function detectAndScrobble() {
    const { artist, track } = getTrackInfo();
    const playing = isPlaying();
    const key = artist && track ? `${artist}::${track}` : null;

    if (key !== currentTrack) {
      if (currentTrack && !scrobbled) {
        chrome.runtime.sendMessage({
          type: "SCROBBLE_SKIPPED",
          data: { platform: "bandcamp" },
        });
      }
      currentTrack = key;
      listenStart = playing && key ? Date.now() : null;
      scrobbled = false;

      if (key && playing) {
        chrome.runtime.sendMessage({
          type: "SCROBBLE_START",
          data: { artist, track, platform: "bandcamp", threshold: SCROBBLE_THRESHOLD },
        });
      }
    }

    if (!playing) {
      if (listenStart) {
        chrome.runtime.sendMessage({
          type: "SCROBBLE_PAUSED",
          data: { platform: "bandcamp" },
        });
      }
      listenStart = null;
      return;
    }

    if (playing && key && !listenStart && !scrobbled) {
      listenStart = Date.now();
      chrome.runtime.sendMessage({
        type: "SCROBBLE_START",
        data: { artist, track, platform: "bandcamp", threshold: SCROBBLE_THRESHOLD },
      });
    }

    if (playing && listenStart && !scrobbled) {
      const elapsed = Date.now() - listenStart;
      chrome.runtime.sendMessage({
        type: "SCROBBLE_PROGRESS",
        data: {
          artist, track, platform: "bandcamp",
          elapsed, threshold: SCROBBLE_THRESHOLD,
          percent: Math.min(100, Math.round((elapsed / SCROBBLE_THRESHOLD) * 100)),
        },
      });

      if (elapsed >= SCROBBLE_THRESHOLD) {
        scrobbled = true;
        chrome.runtime.sendMessage({
          type: "TRACK_DETECTED",
          data: { artist, track, platform: "bandcamp" },
        });
      }
    }
  }

  setInterval(detectAndScrobble, POLL_INTERVAL);
  setTimeout(detectAndScrobble, 1000);
})();
