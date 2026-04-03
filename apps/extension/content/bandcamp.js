// Patron Content Script — Bandcamp (*.bandcamp.com)

(function () {
  let lastDetected = "";

  function detectTrack() {
    let artist = null;
    let track = null;

    // Album/track page
    const trackTitle = document.querySelector(".title_link span");
    const artistName = document.querySelector(
      "#band-name-location .title"
    );

    if (trackTitle) track = trackTitle.textContent?.trim();
    if (artistName) artist = artistName.textContent?.trim();

    // Inline player
    if (!track) {
      const inlineTrack = document.querySelector(".track_info .title");
      if (inlineTrack) track = inlineTrack.textContent?.trim();
    }

    // Fallback: currently playing track in tracklist
    if (!track) {
      const playing = document.querySelector(
        ".track_list .playing .track-title"
      );
      if (playing) track = playing.textContent?.trim();
    }

    if (artist && track) {
      const key = `${artist}::${track}`;
      if (key !== lastDetected) {
        lastDetected = key;
        chrome.runtime.sendMessage({
          type: "TRACK_DETECTED",
          data: { artist, track, platform: "bandcamp" },
        });
      }
    }
  }

  setInterval(detectTrack, 3000);
  setTimeout(detectTrack, 2000);
})();
