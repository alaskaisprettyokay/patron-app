"use client";

import { useState, useEffect } from "react";

interface GiftRecord {
  artist: string;
  track: string;
  amount: number;
  platform: string;
  timestamp: number;
  txHash: string | null;
}

interface ArtistStat {
  name: string;
  gifts: number;
  amount: number;
}

function aggregateArtists(gifts: GiftRecord[]): ArtistStat[] {
  const map = new Map<string, { gifts: number; amount: number }>();

  for (const gift of gifts) {
    const existing = map.get(gift.artist) || { gifts: 0, amount: 0 };
    existing.gifts += 1;
    existing.amount += gift.amount || 0.01;
    map.set(gift.artist, existing);
  }

  return Array.from(map.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.gifts - a.gifts);
}

export function TopArtists() {
  const [gifts, setGifts] = useState<GiftRecord[]>([]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type === "ONDA_STATUS" && event.data.status?.recentGifts) {
        setGifts(event.data.status.recentGifts);
      }
    };
    window.addEventListener("message", handler);
    window.postMessage({ type: "ONDA_REQUEST_STATUS" }, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  const artists = aggregateArtists(gifts);
  const topArtists = artists.slice(0, 5);
  const maxGifts = topArtists[0]?.gifts || 1;

  return (
    <div>
      <h2 className="text-xs uppercase tracking-widest text-ink-faint mb-4">top artists</h2>
      {topArtists.length === 0 ? (
        <div className="py-4 text-ink-faint text-sm">
          your most-supported artists will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {topArtists.map((artist, i) => {
            const barWidth = (artist.gifts / maxGifts) * 100;

            return (
              <div key={artist.name}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono text-ink-faint w-4 text-right">
                      {i + 1}
                    </span>
                    <span className="text-sm font-bold truncate max-w-[180px]">
                      {artist.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-faint">
                      {artist.gifts}x
                    </span>
                    <span className="font-mono text-xs font-bold text-onda">
                      ${artist.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="h-1 bg-rule/40 overflow-hidden" style={{ marginLeft: "26px" }}>
                  <div
                    className={`h-full transition-all duration-500 ${
                      i === 0 ? "bg-onda" : "bg-ink/15"
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
