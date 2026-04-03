// Patron Content Script — Spotify (open.spotify.com)

(function () {
  let lastDetected = "";

  function detectTrack() {
    let artist = null;
    let track = null;

    // Method 1: data-testid selectors
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

    if (artist && track) {
      const key = `${artist}::${track}`;
      if (key !== lastDetected) {
        lastDetected = key;
        chrome.runtime.sendMessage({
          type: "TRACK_DETECTED",
          data: { artist, track, platform: "spotify" },
        });
      }
    }
  }

  // Poll every 3 seconds
  setInterval(detectTrack, 3000);
  // Also detect on initial load
  setTimeout(detectTrack, 2000);
})();
