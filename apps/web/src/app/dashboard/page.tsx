"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import type { Address } from "viem";
import { USDC_ADDRESS, ERC20_ABI, formatUSDC } from "@/lib/contracts";
import { GiftFeed } from "@/components/GiftFeed";
import { ListeningActivity } from "@/components/ListeningActivity";
import { TopArtists } from "@/components/TopArtists";
import { PlatformBreakdown } from "@/components/PlatformBreakdown";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { TopUpPanel } from "@/components/dashboard/TopUpPanel";

interface GiftRecord {
  artist: string;
  track: string;
  amount: number;
  platform: string;
  timestamp: number;
  txHash: string | null;
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const [extWalletAddr, setExtWalletAddr] = useState<Address | undefined>();
  const [gifts, setGifts] = useState<GiftRecord[]>([]);
  const [uniqueArtists, setUniqueArtists] = useState(0);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type === "ONDA_STATUS" && event.data.status) {
        setUniqueArtists(event.data.status.uniqueArtists || 0);
        setGifts(event.data.status.recentGifts || []);
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

  const { data: extBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: extWalletAddr ? [extWalletAddr] : undefined,
    query: { enabled: !!extWalletAddr, refetchInterval: 5000 },
  });
  const balance = (extBalance as bigint) || 0n;
  const balanceUSD = balance ? formatUSDC(balance) : "0.00";
  const [dollars, cents = "00"] = balanceUSD.split(".");

  const onExtWalletDetected = useCallback((addr: string) => {
    setExtWalletAddr(addr as Address);
  }, []);

  const giftsThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    return gifts.filter((g) => g.timestamp >= weekAgo).length;
  }, [gifts]);

  const giftsLastWeek = useMemo(() => {
    const twoWeekAgo = Date.now() - 14 * 86400000;
    const oneWeekAgo = Date.now() - 7 * 86400000;
    return gifts.filter((g) => g.timestamp >= twoWeekAgo && g.timestamp < oneWeekAgo).length;
  }, [gifts]);

  const weekDelta =
    giftsLastWeek > 0
      ? Math.round(((giftsThisWeek - giftsLastWeek) / giftsLastWeek) * 100)
      : null;

  const artistsThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    return new Set(gifts.filter((g) => g.timestamp >= weekAgo).map((g) => g.artist)).size;
  }, [gifts]);

  const dayStreak = useMemo(() => {
    if (gifts.length === 0) return 0;
    const days = new Set(gifts.map((g) => dayKey(g.timestamp)));
    let streak = 0;
    const cursor = new Date();
    while (true) {
      if (days.has(dayKey(cursor.getTime()))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else if (streak === 0) {
        cursor.setDate(cursor.getDate() - 1);
        if (!days.has(dayKey(cursor.getTime()))) break;
      } else break;
    }
    return streak;
  }, [gifts]);

  const sparkValues = useMemo(() => {
    const out: number[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const end = start + 86400000;
      out.push(gifts.filter((g) => g.timestamp >= start && g.timestamp < end).length);
    }
    return out;
  }, [gifts]);

  const week = useMemo(() => getISOWeek(new Date()), []);
  const remainingPlays = balance ? Number(balance / 10000n) * 100 : 0;

  if (!isConnected) {
    return (
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20">
        <div className="text-[10px] font-mono uppercase tracking-widest text-ink-faint mb-3">
          your wallet
        </div>
        <h1 className="text-4xl font-bold mb-3">sign in to start.</h1>
        <p className="text-ink-light text-sm">
          connect a wallet to see your balance, supported artists, and recent waves.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
      {/* Wallet hero */}
      <section className="mb-10">
        <div className="text-[10px] font-mono uppercase tracking-widest text-ink-faint mb-3">
          your wallet · week {week}
        </div>
        <div className="grid gap-6 items-end" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
          <div>
            <div className="flex items-baseline">
              <span className="font-mono text-5xl sm:text-7xl font-bold text-ink-faint">$</span>
              <span className="font-mono text-6xl sm:text-8xl font-bold tracking-tight leading-none">
                {dollars}
              </span>
              <span className="font-mono text-6xl sm:text-8xl font-bold tracking-tight leading-none text-onda">
                .{cents}
              </span>
            </div>
            <p className="text-ink-light max-w-md mt-4 leading-snug">
              balance — enough for{" "}
              <span className="onda-serif-italic">
                {remainingPlays.toLocaleString()} more plays
              </span>{" "}
              before you&apos;ll want to top up.
            </p>
          </div>
          <div className="hidden sm:block">
            <Sparkline values={sparkValues} width={420} height={110} />
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 border-t border-b border-rule mb-12">
        <StatCard
          value={giftsThisWeek}
          label="gifts sent"
          sub="this week"
          delta={
            weekDelta != null
              ? `${weekDelta >= 0 ? "+" : ""}${weekDelta}% vs last`
              : undefined
          }
        />
        <StatCard
          value={uniqueArtists}
          label="artists supported"
          sub="all time"
          delta={artistsThisWeek > 0 ? `${artistsThisWeek} new this week` : undefined}
          divider
        />
        <StatCard
          value={dayStreak}
          label="day streak"
          sub={dayStreak > 0 ? `best: ${dayStreak}d` : "start one today"}
          delta={dayStreak > 0 ? "don't break it" : undefined}
          divider
        />
      </section>

      <ListeningActivity />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-12">
        <TopArtists />
        <PlatformBreakdown />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-12">
        <div className="lg:col-span-2">
          <GiftFeed />
        </div>
        <div>
          <TopUpPanel onWalletDetected={onExtWalletDetected} />
        </div>
      </section>
    </div>
  );
}

interface StatCardProps {
  value: number | string;
  label: string;
  sub?: string;
  delta?: string;
  divider?: boolean;
}

function StatCard({ value, label, sub, delta, divider }: StatCardProps) {
  return (
    <div className={`px-5 py-7 ${divider ? "sm:border-l border-rule" : ""}`}>
      <div className="font-mono text-4xl sm:text-5xl font-bold leading-none mb-4">
        {value}
      </div>
      <div className="font-bold text-sm">{label}</div>
      {sub && <div className="text-xs text-ink-faint mt-0.5">{sub}</div>}
      {delta && <div className="text-xs text-onda mt-3">{delta}</div>}
    </div>
  );
}
