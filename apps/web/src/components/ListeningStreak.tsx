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

function calculateStreak(tips: TipRecord[]): { current: number; best: number; todayActive: boolean } {
  if (tips.length === 0) return { current: 0, best: 0, todayActive: false };

  // Get unique days with activity (as date strings)
  const activeDays = new Set<string>();
  for (const tip of tips) {
    const d = new Date(tip.timestamp);
    activeDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const todayActive = activeDays.has(todayKey);

  // Calculate current streak (counting backwards from today/yesterday)
  let current = 0;
  const checkDate = new Date(today);

  // If today isn't active, start from yesterday
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

  // Calculate best streak
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

  const { current, best, todayActive } = calculateStreak(tips);

  // Show last 7 days as dots
  const dots = [];
  const now = new Date();
  const activeDays = new Set<string>();
  for (const tip of tips) {
    const d = new Date(tip.timestamp);
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
    <div className="border border-rule p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="section-label">Streak</div>
        {todayActive && (
          <span className="text-[10px] font-mono text-accent uppercase tracking-wider">
            Active today
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1 mb-3">
        <span className="mono-value text-2xl font-bold">
          {current}
        </span>
        <span className="text-xs text-ink-faint">
          day{current !== 1 ? "s" : ""}
        </span>
        {best > current && (
          <span className="text-xs text-ink-faint ml-2">
            Best: {best}d
          </span>
        )}
      </div>

      <div className="flex gap-1.5">
        {dots.map((dot, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div
              className={`w-5 h-5 flex items-center justify-center text-[9px] font-mono ${
                dot.active
                  ? dot.isToday
                    ? "bg-accent text-paper"
                    : "bg-ink/15 text-ink"
                  : dot.isToday
                    ? "border border-accent/40 text-accent"
                    : "border border-rule text-ink-faint"
              }`}
            >
              {dot.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
