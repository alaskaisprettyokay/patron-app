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

interface DayData {
  label: string;
  count: number;
  amount: number;
}

function getLast7Days(gifts: GiftRecord[]): DayData[] {
  const days: DayData[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 86400000;

    const dayGifts = gifts.filter((g) => g.timestamp >= dayStart && g.timestamp < dayEnd);
    days.push({
      label: d.toLocaleDateString("en", { weekday: "short" }).toLowerCase(),
      count: dayGifts.length,
      amount: dayGifts.reduce((sum, g) => sum + (g.amount || 0.01), 0),
    });
  }

  return days;
}

export function ListeningActivity() {
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

  const days = getLast7Days(gifts);
  const maxCount = Math.max(...days.map((d) => d.count), 1);

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs uppercase tracking-widest text-ink-faint">activity</h2>
        <span className="text-xs text-ink-faint font-mono">
          {gifts.length} gift{gifts.length !== 1 ? "s" : ""} total
        </span>
      </div>

      <div className="flex items-end gap-2 h-28">
        {days.map((day, i) => {
          const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
          const isToday = i === days.length - 1;

          return (
            <div key={day.label} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center" style={{ height: "80px" }}>
                {day.count > 0 ? (
                  <div
                    className={`w-full max-w-[44px] transition-all duration-300 ${
                      isToday ? "bg-onda" : "bg-ink/15"
                    }`}
                    style={{ height: `${Math.max(height, 6)}%` }}
                    title={`${day.count} gift${day.count !== 1 ? "s" : ""} — $${day.amount.toFixed(2)}`}
                  />
                ) : (
                  <div
                    className="w-full max-w-[44px] bg-rule/40"
                    style={{ height: "2px" }}
                  />
                )}
              </div>
              <span
                className={`text-[10px] font-mono ${
                  isToday ? "text-onda font-bold" : "text-ink-faint"
                }`}
              >
                {day.label}
              </span>
            </div>
          );
        })}
      </div>

      {gifts.length === 0 && (
        <div className="text-center text-ink-faint text-xs mt-4">
          play music with the extension to see your activity here.
        </div>
      )}
    </div>
  );
}
