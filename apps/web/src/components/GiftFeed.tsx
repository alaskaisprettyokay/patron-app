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
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const PLATFORM_DISPLAY: Record<string, string> = {
  spotify: "spotify",
  soundcloud: "soundcloud",
  bandcamp: "bandcamp",
  "youtube-music": "yt music",
  subcult: "subcult",
};

export function GiftFeed({ limit = 6 }: { limit?: number }) {
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

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-ink-faint">
          recent tips
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-ink-faint hover:text-onda transition-colors cursor-default">
          live feed →
        </span>
      </div>

      {gifts.length === 0 ? (
        <div className="py-6 text-ink-faint text-sm">
          nothing yet. play music with the extension installed.
        </div>
      ) : (
        <div>
          {gifts.slice(0, limit).map((gift, i) => (
            <div
              key={`${gift.timestamp}-${i}`}
              className="grid items-baseline py-3 border-t border-rule first:border-t-0"
              style={{
                gridTemplateColumns: "70px 1fr 100px 70px",
                gap: 12,
              }}
            >
              <span className="text-xs font-mono text-ink-faint">
                {timeAgo(gift.timestamp)}
              </span>
              <span className="text-sm truncate">
                <span className="text-ink-light">{gift.track}</span>
                <span className="text-ink-faint"> · </span>
                <span className="font-bold lowercase">{gift.artist}</span>
              </span>
              <span className="text-xs text-ink-faint lowercase truncate">
                {PLATFORM_DISPLAY[gift.platform] || gift.platform}
              </span>
              {gift.txHash ? (
                <a
                  href={`https://testnet.arcscan.app/tx/${gift.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm font-bold text-onda hover:underline text-right"
                >
                  +${(gift.amount || 0.01).toFixed(2)}
                </a>
              ) : (
                <span className="font-mono text-sm font-bold text-onda text-right">
                  +${(gift.amount || 0.01).toFixed(2)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
