// onda content script — SoundCloud (soundcloud.com)

(function () {
  const SCROBBLE_THRESHOLD = 10000;
  const POLL_INTERVAL = 1000;

  let currentTrack = null;
  let listenStart = null;
  let scrobbled = false;

  function getTrackInfo() {
    let artist = null;
    let track = null;

    // SoundCloud bottom player bar
    const titleEl = document.querySelector(".playbackSoundBadge__titleLink");
    const artistEl = document.querySelector(".playbackSoundBadge__lightLink");

    if (titleEl && artistEl) {
      track = titleEl.getAttribute("title")?.trim() || titleEl.textContent?.trim();
      artist = artistEl.getAttribute("title")?.trim() || artistEl.textContent?.trim();
    }

    // Fallback: document title — "Artist - Track | SoundCloud"
    if (!track || !artist) {
      const title = document.title;
      const match = title.match(/^(.+?)\s-\s(.+?)\s*\|/);
      if (match) {
        artist = match[1].trim();
        track = match[2].trim();
      }
    }

    return { artist, track };
  }

  function isPlaying() {
    // SoundCloud: play button has "playing" class when active
    const playBtn = document.querySelector(".playControls__play");
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
          data: { platform: "soundcloud" },
        });
      }
      currentTrack = key;
      listenStart = playing && key ? Date.now() : null;
      scrobbled = false;

      if (key && playing) {
        chrome.runtime.sendMessage({
          type: "SCROBBLE_START",
          data: { artist, track, platform: "soundcloud", threshold: SCROBBLE_THRESHOLD },
        });
      }
    }

    if (!playing) {
      if (listenStart) {
        chrome.runtime.sendMessage({
          type: "SCROBBLE_PAUSED",
          data: { platform: "soundcloud" },
        });
      }
      listenStart = null;
      return;
    }

    if (playing && key && !listenStart && !scrobbled) {
      listenStart = Date.now();
      chrome.runtime.sendMessage({
        type: "SCROBBLE_START",
        data: { artist, track, platform: "soundcloud", threshold: SCROBBLE_THRESHOLD },
      });
    }

    if (playing && listenStart && !scrobbled) {
      const elapsed = Date.now() - listenStart;
      chrome.runtime.sendMessage({
        type: "SCROBBLE_PROGRESS",
        data: {
          artist, track, platform: "soundcloud",
          elapsed, threshold: SCROBBLE_THRESHOLD,
          percent: Math.min(100, Math.round((elapsed / SCROBBLE_THRESHOLD) * 100)),
        },
      });

      if (elapsed >= SCROBBLE_THRESHOLD) {
        scrobbled = true;
        chrome.runtime.sendMessage({
          type: "TRACK_DETECTED",
          data: { artist, track, platform: "soundcloud" },
        });
      }
    }
  }

  setInterval(detectAndScrobble, POLL_INTERVAL);
  setTimeout(detectAndScrobble, 1000);
})();
