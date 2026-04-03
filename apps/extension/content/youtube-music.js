// Patron Content Script — YouTube Music (music.youtube.com)

(function () {
  let lastDetected = "";

  function detectTrack() {
    let artist = null;
    let track = null;

    // Player bar selectors
    const titleEl = document.querySelector(
      ".title.ytmusic-player-bar"
    );
    const artistEl = document.querySelector(
      ".byline.ytmusic-player-bar"
    );

    if (titleEl) track = titleEl.textContent?.trim();
    if (artistEl) {
      // byline may contain "Artist • Album • Year", take first part
      const byline = artistEl.textContent?.trim();
      if (byline) {
        artist = byline.split("•")[0].trim();
      }
    }

    // Fallback: document title "Track - Artist - YouTube Music"
    if (!track || !artist) {
      const title = document.title;
      const match = title.match(/^(.+?)\s-\s(.+?)\s-\s*YouTube Music/);
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
          data: { artist, track, platform: "youtube-music" },
        });
      }
    }
  }

  setInterval(detectTrack, 3000);
  setTimeout(detectTrack, 2000);
})();
