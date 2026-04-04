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

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

const platformNames: Record<string, string> = {
  spotify: "spotify",
  soundcloud: "soundcloud",
  bandcamp: "bandcamp",
  "youtube-music": "youtube music",
};

export function GiftFeed() {
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
    const interval = setInterval(() => {
      window.postMessage({ type: "ONDA_REQUEST_STATUS" }, "*");
    }, 5000);

    return () => {
      window.removeEventListener("message", handler);
      clearInterval(interval);
    };
  }, []);

  if (gifts.length === 0) {
    return (
      <div className="py-6 text-ink-faint text-sm">
        nothing yet. play music with the extension installed to start.
      </div>
    );
  }

  return (
    <div className="divide-y divide-rule">
      {gifts.slice(0, 10).map((gift, i) => (
        <div
          key={`${gift.timestamp}-${i}`}
          className="flex items-center justify-between py-3"
        >
          <div>
            <div className="font-medium text-sm">{gift.artist}</div>
            <div className="text-xs text-ink-faint">{gift.track}</div>
          </div>
          <div className="text-right">
            <div className="mono-value text-sm font-medium">
              {gift.txHash ? (
                <a
                  href={`https://testnet.arcscan.app/tx/${gift.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-onda hover:underline"
                >
                  ${gift.amount?.toFixed(2) || "0.01"}
                </a>
              ) : (
                <span className="text-ink">${gift.amount?.toFixed(2) || "0.01"}</span>
              )}
            </div>
            <div className="text-xs text-ink-faint">
              {platformNames[gift.platform] || gift.platform} · {timeAgo(gift.timestamp)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
