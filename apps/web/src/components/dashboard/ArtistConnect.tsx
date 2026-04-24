"use client";

import { useState } from "react";
import { searchArtist, getArtistDetails, getArtistUrls } from "@/lib/musicbrainz";

interface ArtistConnectProps {
  artistName: string;
}

type Status = "idle" | "loading" | "ready" | "empty" | "error";

const PLATFORM_LABELS: Record<string, string> = {
  spotify: "spotify",
  bandcamp: "bandcamp",
  soundcloud: "soundcloud",
  youtube: "yt music",
  website: "website",
};

export function ArtistConnect({ artistName }: ArtistConnectProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [mbid, setMbid] = useState<string>("");

  const load = async () => {
    if (status === "ready" || status === "loading") return;
    setStatus("loading");
    try {
      const matches = await searchArtist(artistName);
      const top = matches[0];
      if (!top) {
        setStatus("empty");
        return;
      }
      setMbid(top.id);
      const details = await getArtistDetails(top.id);
      const found = getArtistUrls(details.relations);
      setUrls(found);
      setStatus(Object.keys(found).length === 0 ? "empty" : "ready");
    } catch {
      setStatus("error");
    }
  };

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) load();
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="text-[10px] font-mono uppercase tracking-widest text-ink-faint hover:text-onda transition-colors"
      >
        {open ? "hide ↑" : "connect ↓"}
      </button>
      {open && (
        <div
          style={{
            marginTop: 8,
            padding: "10px 12px",
            background: "var(--onda-paper-2, #E3DCCD)",
            border: "1px solid var(--onda-line, rgba(13,13,13,0.12))",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
          }}
        >
          {status === "loading" && (
            <span className="text-xs text-ink-faint font-mono">looking up…</span>
          )}
          {status === "error" && (
            <span className="text-xs text-ink-faint font-mono">couldn't reach musicbrainz</span>
          )}
          {status === "empty" && (
            <span className="text-xs text-ink-faint font-mono">no public links found on musicbrainz</span>
          )}
          {status === "ready" && (
            <>
              {Object.entries(urls).map(([key, href]) => (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2.5 py-1 border border-ink/40 hover:border-onda hover:text-onda transition-colors lowercase"
                >
                  {PLATFORM_LABELS[key] ?? key}
                </a>
              ))}
              {mbid && (
                <a
                  href={`https://musicbrainz.org/artist/${mbid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono uppercase tracking-widest text-ink-faint hover:text-onda transition-colors ml-auto"
                >
                  musicbrainz ↗
                </a>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
