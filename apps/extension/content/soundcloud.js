// Patron Content Script — SoundCloud (soundcloud.com)

(function () {
  let lastDetected = "";

  function detectTrack() {
    let artist = null;
    let track = null;

    // Playback sound badge (bottom player bar)
    const titleLink = document.querySelector(
      ".playbackSoundBadge__titleLink"
    );
    const artistLink = document.querySelector(
      ".playbackSoundBadge__lightLink"
    );

    if (titleLink && artistLink) {
      track = titleLink.getAttribute("title")?.trim() || titleLink.textContent?.trim();
      artist = artistLink.getAttribute("title")?.trim() || artistLink.textContent?.trim();
    }

    // Fallback: document title "Artist - Track | SoundCloud"
    if (!track || !artist) {
      const title = document.title;
      const match = title.match(/^(.+?)\s-\s(.+?)\s*\|/);
      if (match) {
        artist = match[1].trim();
        track = match[2].trim();
      }
    }

    if (artist && track) {
      const key = `${artist}::${track}`;
      if (key !== lastDetected) {
        lastDetected = key;
        chrome.runtime.sendMessage({
          type: "TRACK_DETECTED",
          data: { artist, track, platform: "soundcloud" },
        });
      }
    }
  }

  setInterval(detectTrack, 3000);
  setTimeout(detectTrack, 2000);
})();
