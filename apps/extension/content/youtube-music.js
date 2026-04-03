// Patron Content Script — YouTube Music (music.youtube.com)

(function () {
  const SCROBBLE_THRESHOLD = 10000;
  const POLL_INTERVAL = 1000;

  let currentTrack = null;
  let listenStart = null;
  let scrobbled = false;

  function getTrackInfo() {
    let artist = null;
    let track = null;

    // YouTube Music player bar
    const titleEl = document.querySelector(".title.ytmusic-player-bar");
    const artistEl = document.querySelector(
      ".byline.ytmusic-player-bar .yt-simple-endpoint"
    );

    if (titleEl) track = titleEl.textContent?.trim();
    if (artistEl) artist = artistEl.textContent?.trim();

    // Fallback: full byline
    if (!artist) {
      const byline = document.querySelector(".byline.ytmusic-player-bar");
      if (byline) {
        // Byline format: "Artist • Album • Year"
        const text = byline.textContent?.trim();
        if (text) {
          artist = text.split("•")[0]?.trim();
        }
      }
    }

    // Fallback: document title — "Track - Artist - YouTube Music"
    if (!track || !artist) {
      const title = document.title;
      const match = title.match(/^(.+?)\s-\s(.+?)\s-\s*YouTube Music/);
      if (match) {
        track = match[1].trim();
        artist = match[2].trim();
      }
    }

    return { artist, track };
  }

  function isPlaying() {
    // YouTube Music: check video element
    const video = document.querySelector("video");
    if (video) {
      return !video.paused && !video.ended && video.readyState > 2;
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
          data: { platform: "youtube-music" },
        });
      }
      currentTrack = key;
      listenStart = playing && key ? Date.now() : null;
      scrobbled = false;

      if (key && playing) {
        chrome.runtime.sendMessage({
          type: "SCROBBLE_START",
          data: { artist, track, platform: "youtube-music", threshold: SCROBBLE_THRESHOLD },
        });
      }
    }

    if (!playing) {
      if (listenStart) {
        chrome.runtime.sendMessage({
          type: "SCROBBLE_PAUSED",
          data: { platform: "youtube-music" },
        });
      }
      listenStart = null;
      return;
    }

    if (playing && key && !listenStart && !scrobbled) {
      listenStart = Date.now();
      chrome.runtime.sendMessage({
        type: "SCROBBLE_START",
        data: { artist, track, platform: "youtube-music", threshold: SCROBBLE_THRESHOLD },
      });
    }

    if (playing && listenStart && !scrobbled) {
      const elapsed = Date.now() - listenStart;
      chrome.runtime.sendMessage({
        type: "SCROBBLE_PROGRESS",
        data: {
          artist, track, platform: "youtube-music",
          elapsed, threshold: SCROBBLE_THRESHOLD,
          percent: Math.min(100, Math.round((elapsed / SCROBBLE_THRESHOLD) * 100)),
        },
      });

      if (elapsed >= SCROBBLE_THRESHOLD) {
        scrobbled = true;
        chrome.runtime.sendMessage({
          type: "TRACK_DETECTED",
          data: { artist, track, platform: "youtube-music" },
        });
      }
    }
  }

  setInterval(detectAndScrobble, POLL_INTERVAL);
  setTimeout(detectAndScrobble, 1000);
})();
