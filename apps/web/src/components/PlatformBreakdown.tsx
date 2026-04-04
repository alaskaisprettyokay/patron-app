"use client";

import { useState, useEffect } from "react";

interface TipRecord {
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
};

const platformColors: Record<string, string> = {
  spotify: "bg-[#1DB954]",
  soundcloud: "bg-[#FF5500]",
  bandcamp: "bg-[#1DA0C3]",
  "youtube-music": "bg-[#FF0000]",
};

function aggregatePlatforms(tips: TipRecord[]): PlatformStat[] {
  const map = new Map<string, number>();

  for (const tip of tips) {
    map.set(tip.platform, (map.get(tip.platform) || 0) + 1);
  }

  const total = tips.length || 1;

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
  const [tips, setTips] = useState<TipRecord[]>([]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type === "PATRON_STATUS" && event.data.status?.recentTips) {
        setTips(event.data.status.recentTips);
      }
    };
    window.addEventListener("message", handler);
    window.postMessage({ type: "PATRON_REQUEST_STATUS" }, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  const platforms = aggregatePlatforms(tips);

  if (platforms.length === 0) {
    return (
      <div className="card">
        <div className="section-label mb-4">Platforms</div>
        <div className="py-4 text-ink-faint text-sm">
          Your platform breakdown will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="section-label mb-4">Platforms</div>

      {/* Stacked bar */}
      <div className="flex h-2 overflow-hidden mb-4">
        {platforms.map((p) => (
          <div
            key={p.platform}
            className={`${platformColors[p.platform] || "bg-ink/30"} transition-all duration-500`}
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
                className={`w-2.5 h-2.5 ${platformColors[p.platform] || "bg-ink/30"}`}
              />
              <span className="text-sm">{p.displayName}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="mono-value text-xs text-ink-faint">
                {p.count} tip{p.count !== 1 ? "s" : ""}
              </span>
              <span className="mono-value text-xs font-medium w-8 text-right">
                {p.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
