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
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

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
      <div className="py-4 text-ink-faint text-xs font-mono">
        nothing yet. play music with the extension installed.
      </div>
    );
  }

  return (
    <div className="font-mono text-xs">
      {gifts.slice(0, 10).map((gift, i) => (
        <div
          key={`${gift.timestamp}-${i}`}
          className="flex items-baseline justify-between py-1.5 border-b border-rule/50 last:border-0"
        >
          <div className="min-w-0 mr-4">
            <span className="font-bold text-sm">{gift.artist}</span>
            <span className="text-ink-faint ml-2 text-2xs">{gift.track}</span>
          </div>
          <div className="flex items-baseline gap-2 shrink-0">
            {gift.txHash ? (
              <a
                href={`https://testnet.arcscan.app/tx/${gift.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-onda hover:underline font-bold"
              >
                ${gift.amount?.toFixed(2) || "0.01"}
              </a>
            ) : (
              <span>${gift.amount?.toFixed(2) || "0.01"}</span>
            )}
            <span className="text-ink-faint text-2xs">{timeAgo(gift.timestamp)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
