"use client";

import { useState, useEffect, useMemo } from "react";

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
  date: number;
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
      date: d.getDate(),
      count: dayGifts.length,
      amount: dayGifts.reduce((sum, g) => sum + (g.amount || 0.01), 0),
    });
  }
  return days;
}

const FULL_DAY: Record<string, string> = {
  sun: "sunday", mon: "monday", tue: "tuesday", wed: "wednesday",
  thu: "thursday", fri: "friday", sat: "saturday",
};

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

  const days = useMemo(() => getLast7Days(gifts), [gifts]);
  const total = days.reduce((s, d) => s + d.count, 0);
  const avg = total / Math.max(days.length, 1);
  const max = Math.max(...days.map((d) => d.count), 1);
  const bestIdx = days.reduce((best, d, i) => (d.count > days[best].count ? i : best), 0);
  const bestDay = days[bestIdx];

  const headline =
    total === 0
      ? "no waves yet — listen to something."
      : bestDay && bestDay.count > 0
        ? `${total} wave${total === 1 ? "" : "s"} sent — `
        : `${total} wave${total === 1 ? "" : "s"} sent.`;

  return (
    <section className="border-t border-b border-rule py-10">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[10px] font-mono uppercase tracking-widest text-ink-faint">
          activity · last 7 days
        </div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-ink-faint">
          daily average · {avg.toFixed(1)}
        </div>
      </div>

      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-8">
        {headline}
        {bestDay && bestDay.count > 0 && (
          <span className="onda-serif-italic text-onda">
            {FULL_DAY[bestDay.label]} was a good day.
          </span>
        )}
      </h2>

      <div className="grid grid-cols-7 gap-3 items-end" style={{ minHeight: 220 }}>
        {days.map((day, i) => {
          const heightPct = max > 0 ? (day.count / max) * 100 : 0;
          const isBest = i === bestIdx && day.count > 0;
          return (
            <div key={`${day.label}-${i}`} className="flex flex-col items-center">
              <div className="text-[11px] font-mono text-ink-faint mb-1 h-4">
                {day.count > 0 ? day.count : ""}
              </div>
              <div className="w-full flex items-end" style={{ height: 180 }}>
                <div
                  className="w-full transition-all duration-500"
                  style={{
                    height: `${Math.max(heightPct, day.count > 0 ? 8 : 2)}%`,
                    background: isBest
                      ? "var(--onda-rust, #B8621B)"
                      : "var(--onda-faded, #CFC6B6)",
                  }}
                  title={`${day.count} wave${day.count === 1 ? "" : "s"} — $${day.amount.toFixed(2)}`}
                />
              </div>
              <div
                className={`text-xs font-mono mt-3 ${isBest ? "text-onda font-bold" : "text-ink-faint"}`}
              >
                {day.label}
              </div>
              <div className="text-[10px] font-mono text-ink-faint">{day.date}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
