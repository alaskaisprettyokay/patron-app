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

interface ArtistStat {
  name: string;
  tips: number;
  amount: number;
}

function aggregateArtists(tips: TipRecord[]): ArtistStat[] {
  const map = new Map<string, { tips: number; amount: number }>();

  for (const tip of tips) {
    const existing = map.get(tip.artist) || { tips: 0, amount: 0 };
    existing.tips += 1;
    existing.amount += tip.amount || 0.01;
    map.set(tip.artist, existing);
  }

  return Array.from(map.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.tips - a.tips);
}

export function TopArtists() {
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

  const artists = aggregateArtists(tips);
  const topArtists = artists.slice(0, 5);
  const maxTips = topArtists[0]?.tips || 1;

  if (topArtists.length === 0) {
    return (
      <div className="card">
        <div className="section-label mb-4">Top artists</div>
        <div className="py-4 text-ink-faint text-sm">
          Your most-tipped artists will appear here.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="section-label mb-4">Top artists</div>
      <div className="space-y-3">
        {topArtists.map((artist, i) => {
          const barWidth = (artist.tips / maxTips) * 100;

          return (
            <div key={artist.name} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono text-ink-faint w-4 text-right">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium truncate max-w-[200px]">
                    {artist.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-faint">
                    {artist.tips} tip{artist.tips !== 1 ? "s" : ""}
                  </span>
                  <span className="mono-value text-xs font-medium text-accent">
                    ${artist.amount.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="ml-6.5 h-1 bg-rule/50 overflow-hidden" style={{ marginLeft: "26px" }}>
                <div
                  className={`h-full transition-all duration-500 ${
                    i === 0 ? "bg-accent" : "bg-ink/20"
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
