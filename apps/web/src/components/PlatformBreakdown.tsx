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

interface PlatformStat {
  platform: string;
  displayName: string;
  count: number;
  percentage: number;
}

const platformNames: Record<string, string> = {
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  bandcamp: "Bandcamp",
  "youtube-music": "YouTube Music",
  subcult: "Subcult",
};

const platformColors: Record<string, string> = {
  spotify: "bg-[#1DB954]",
  soundcloud: "bg-[#FF5500]",
  bandcamp: "bg-[#1DA0C3]",
  "youtube-music": "bg-[#FF0000]",
  subcult: "bg-onda",
};

function aggregatePlatforms(gifts: GiftRecord[]): PlatformStat[] {
  const map = new Map<string, number>();

  for (const gift of gifts) {
    map.set(gift.platform, (map.get(gift.platform) || 0) + 1);
  }

  const total = gifts.length || 1;

  return Array.from(map.entries())
    .map(([platform, count]) => ({
      platform,
      displayName: platformNames[platform] || platform,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

export function PlatformBreakdown() {
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

  const platforms = aggregatePlatforms(gifts);

  return (
    <div>
      <h2 className="text-xs uppercase tracking-widest text-ink-faint mb-4">platforms</h2>
      {platforms.length === 0 ? (
        <div className="py-4 text-ink-faint text-sm">
          your platform breakdown will appear here.
        </div>
      ) : (
        <>
          {/* Stacked bar */}
          <div className="flex h-2 overflow-hidden mb-4">
            {platforms.map((p) => (
              <div
                key={p.platform}
                className={`${platformColors[p.platform] || "bg-ink/20"} transition-all duration-500`}
                style={{ width: `${p.percentage}%` }}
                title={`${p.displayName}: ${p.percentage}%`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="space-y-2">
            {platforms.map((p) => (
              <div key={p.platform} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 ${platformColors[p.platform] || "bg-ink/20"}`}
                  />
                  <span className="text-sm">{p.displayName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-ink-faint">
                    {p.count}x
                  </span>
                  <span className="font-mono text-xs font-bold w-8 text-right">
                    {p.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
