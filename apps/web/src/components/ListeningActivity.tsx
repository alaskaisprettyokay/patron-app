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

interface DayData {
  label: string;
  count: number;
  amount: number;
}

function getLast7Days(tips: TipRecord[]): DayData[] {
  const days: DayData[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 86400000;

    const dayTips = tips.filter((t) => t.timestamp >= dayStart && t.timestamp < dayEnd);
    days.push({
      label: d.toLocaleDateString("en", { weekday: "short" }),
      count: dayTips.length,
      amount: dayTips.reduce((sum, t) => sum + (t.amount || 0.01), 0),
    });
  }

  return days;
}

export function ListeningActivity() {
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

  const days = getLast7Days(tips);
  const maxCount = Math.max(...days.map((d) => d.count), 1);

  return (
    <div className="card mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="section-label">Activity — last 7 days</div>
        <div className="text-xs text-ink-faint mono-value">
          {tips.length} tip{tips.length !== 1 ? "s" : ""} total
        </div>
      </div>

      <div className="flex items-end gap-1.5 h-28">
        {days.map((day, i) => {
          const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
          const isToday = i === days.length - 1;

          return (
            <div key={day.label} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex items-end justify-center" style={{ height: "80px" }}>
                {day.count > 0 ? (
                  <div
                    className={`w-full max-w-[40px] transition-all duration-300 ${
                      isToday ? "bg-accent" : "bg-ink/20"
                    }`}
                    style={{ height: `${Math.max(height, 6)}%` }}
                    title={`${day.count} tip${day.count !== 1 ? "s" : ""} — $${day.amount.toFixed(2)}`}
                  />
                ) : (
                  <div
                    className="w-full max-w-[40px] bg-rule/50"
                    style={{ height: "3px" }}
                  />
                )}
              </div>
              <span
                className={`text-[10px] font-mono ${
                  isToday ? "text-accent font-medium" : "text-ink-faint"
                }`}
              >
                {day.label}
              </span>
            </div>
          );
        })}
      </div>

      {tips.length === 0 && (
        <div className="text-center text-ink-faint text-xs mt-3">
          Play music with the extension to see your activity here.
        </div>
      )}
    </div>
  );
}
