"use client";

import { useState, useEffect } from "react";
import { ArtistConnect } from "./dashboard/ArtistConnect";

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

export function TopArtists({ limit = 6 }: { limit?: number }) {
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
  const top = artists.slice(0, limit);
  const max = top[0]?.gifts || 1;

  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-ink-faint mb-5">
        top artists · this month
      </div>

      {top.length === 0 ? (
        <div className="py-6 text-ink-faint text-sm">
          your most-supported artists will appear here.
        </div>
      ) : (
        <ul className="space-y-0">
          {top.map((artist, i) => {
            const pct = (artist.gifts / max) * 100;
            return (
              <li
                key={artist.name}
                className="border-t border-rule first:border-t-0 py-4"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] text-ink-faint w-6">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{artist.name}</div>
                  </div>
                  <span className="font-mono text-xs text-ink-faint w-12 text-right">
                    {artist.gifts}×
                  </span>
                  <span className="font-mono text-sm font-bold text-onda w-16 text-right">
                    ${artist.amount.toFixed(2)}
                  </span>
                </div>
                {/* Rust progress line */}
                <div
                  className="h-[2px] bg-rule/50 mt-2.5 overflow-hidden"
                  style={{ marginLeft: 36 }}
                >
                  <div
                    className="h-full bg-onda transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {/* Connect popover */}
                <div style={{ marginLeft: 36, marginTop: 6 }}>
                  <ArtistConnect artistName={artist.name} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
