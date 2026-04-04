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
      <div className="py-6 text-ink-faint text-sm">
        nothing yet. play music with the extension installed.
      </div>
    );
  }

  return (
    <div>
      {gifts.slice(0, 10).map((gift, i) => (
        <div
          key={`${gift.timestamp}-${i}`}
          className="flex items-baseline justify-between py-3 border-b border-rule last:border-0"
        >
          <div className="min-w-0 mr-4">
            <span className="font-bold">{gift.artist}</span>
            <span className="text-ink-faint text-sm ml-2">{gift.track}</span>
          </div>
          <div className="flex items-baseline gap-3 shrink-0 text-sm">
            {gift.txHash ? (
              <a
                href={`https://testnet.arcscan.app/tx/${gift.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-onda font-bold font-mono hover:underline"
              >
                ${gift.amount?.toFixed(2) || "0.01"}
              </a>
            ) : (
              <span className="font-mono">${gift.amount?.toFixed(2) || "0.01"}</span>
            )}
            <span className="text-ink-faint text-xs">{timeAgo(gift.timestamp)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
