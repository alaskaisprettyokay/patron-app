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

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

const platformNames: Record<string, string> = {
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  bandcamp: "Bandcamp",
  "youtube-music": "YouTube Music",
};

export function TipFeed() {
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
    const interval = setInterval(() => {
      window.postMessage({ type: "PATRON_REQUEST_STATUS" }, "*");
    }, 5000);

    return () => {
      window.removeEventListener("message", handler);
      clearInterval(interval);
    };
  }, []);

  if (tips.length === 0) {
    return (
      <div className="py-6 text-ink-faint text-sm">
        No tips yet. Play music with the extension installed to start tipping artists.
      </div>
    );
  }

  return (
    <div className="divide-y divide-rule">
      {tips.slice(0, 10).map((tip, i) => (
        <div
          key={`${tip.timestamp}-${i}`}
          className="flex items-center justify-between py-3"
        >
          <div>
            <div className="font-medium text-sm">{tip.artist}</div>
            <div className="text-xs text-ink-faint">{tip.track}</div>
          </div>
          <div className="text-right">
            <div className="mono-value text-sm font-medium">
              {tip.txHash ? (
                <a
                  href={`https://testnet.arcscan.app/tx/${tip.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  ${tip.amount?.toFixed(2) || "0.01"}
                </a>
              ) : (
                <span className="text-ink">${tip.amount?.toFixed(2) || "0.01"}</span>
              )}
            </div>
            <div className="text-xs text-ink-faint">
              {platformNames[tip.platform] || tip.platform} · {timeAgo(tip.timestamp)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
