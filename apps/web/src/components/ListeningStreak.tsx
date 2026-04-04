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

function calculateStreak(gifts: GiftRecord[]): { current: number; best: number; todayActive: boolean } {
  if (gifts.length === 0) return { current: 0, best: 0, todayActive: false };

  const activeDays = new Set<string>();
  for (const gift of gifts) {
    const d = new Date(gift.timestamp);
    activeDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const todayActive = activeDays.has(todayKey);

  let current = 0;
  const checkDate = new Date(today);
  if (!todayActive) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
    if (activeDays.has(key)) {
      current++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  const sortedDays = Array.from(activeDays)
    .map((key) => {
      const [y, m, d] = key.split("-").map(Number);
      return new Date(y, m, d).getTime();
    })
    .sort((a, b) => a - b);

  let best = 0;
  let streak = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const diff = (sortedDays[i] - sortedDays[i - 1]) / 86400000;
    if (diff === 1) {
      streak++;
    } else {
      best = Math.max(best, streak);
      streak = 1;
    }
  }
  best = Math.max(best, streak);
  if (sortedDays.length === 0) best = 0;

  return { current, best, todayActive };
}

export function ListeningStreak() {
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

  const { current, best, todayActive } = calculateStreak(gifts);

  // Last 7 days as dots
  const dots = [];
  const now = new Date();
  const activeDays = new Set<string>();
  for (const gift of gifts) {
    const d = new Date(gift.timestamp);
    activeDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    dots.push({
      active: activeDays.has(key),
      isToday: i === 0,
      label: d.toLocaleDateString("en", { weekday: "narrow" }),
    });
  }

  return (
    <div>
      <div className="font-mono text-2xl font-bold">
        {current}<span className="text-sm text-ink-light font-normal ml-1">day streak</span>
      </div>
      <div className="flex items-center gap-1 mt-2">
        {dots.map((dot, i) => (
          <div
            key={i}
            className={`w-4 h-4 flex items-center justify-center text-[8px] font-mono ${
              dot.active
                ? dot.isToday
                  ? "bg-onda text-paper font-bold"
                  : "bg-ink/15 text-ink"
                : dot.isToday
                  ? "border border-onda/40 text-onda"
                  : "border border-rule text-ink-faint"
            }`}
          >
            {dot.label}
          </div>
        ))}
        {todayActive && (
          <span className="text-[9px] font-mono text-onda font-bold ml-1 uppercase">active</span>
        )}
      </div>
      {best > current && (
        <div className="text-xs text-ink-faint mt-1">best: {best}d</div>
      )}
    </div>
  );
}
