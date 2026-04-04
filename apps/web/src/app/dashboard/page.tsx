"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useReadContract } from "wagmi";
import type { Address } from "viem";
import { USDC_ADDRESS, ERC20_ABI, formatUSDC } from "@/lib/contracts";
import { FundExtension } from "@/components/FundExtension";
import { GiftFeed } from "@/components/GiftFeed";
import { WorldIDVerify } from "@/components/WorldIDVerify";
import { ListeningActivity } from "@/components/ListeningActivity";
import { TopArtists } from "@/components/TopArtists";
import { PlatformBreakdown } from "@/components/PlatformBreakdown";
import { ListeningStreak } from "@/components/ListeningStreak";

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [extWalletAddr, setExtWalletAddr] = useState<Address | undefined>();
  const [uniqueArtists, setUniqueArtists] = useState(0);
  const [giftsThisWeek, setGiftsThisWeek] = useState(0);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type === "ONDA_STATUS" && event.data.status) {
        setUniqueArtists(event.data.status.uniqueArtists || 0);

        const gifts = event.data.status.recentGifts || [];
        const weekAgo = Date.now() - 7 * 86400000;
        setGiftsThisWeek(gifts.filter((g: { timestamp: number }) => g.timestamp >= weekAgo).length);
      }
    };
    window.addEventListener("message", handler);
    window.postMessage({ type: "ONDA_REQUEST_STATUS" }, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  // extWalletAddr is the smart account address posted by the extension
  const { data: extBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: extWalletAddr ? [extWalletAddr] : undefined,
    query: { enabled: !!extWalletAddr, refetchInterval: 5000 },
  });

  const balance = (extBalance as bigint) || 0n;

  const onExtWalletDetected = useCallback((addr: string) => {
    setExtWalletAddr(addr as Address);
  }, []);

  const setupComplete =
    isConnected && isHumanVerified && !!extWalletAddr && balance > 0n && uniqueArtists > 0;

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-20">
        <h1 className="text-4xl font-bold mb-3">dashboard</h1>
        <p className="text-ink-light text-sm">
          sign in to start supporting artists.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-5 sm:px-8 py-10">
      {/* Hero — your total */}
      <div className="mb-12">
        <div className="text-xs uppercase tracking-widest text-ink-faint mb-2">total given</div>
        <div className="font-mono text-6xl sm:text-7xl font-bold tracking-tight text-onda leading-none">
          ${balance ? formatUSDC(balance) : "0.00"}
        </div>
        {giftsThisWeek > 0 && (
          <div className="text-sm text-ink-faint mt-2">
            {giftsThisWeek} gift{giftsThisWeek !== 1 ? "s" : ""} this week
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-6 mb-12">
        <div className="border-l-2 border-ink pl-4">
          <div className="font-mono text-2xl font-bold">${balance ? formatUSDC(balance) : "0.00"}</div>
          <div className="text-sm text-ink-light">balance remaining</div>
        </div>
        <div className="border-l-2 border-ink pl-4">
          <div className="font-mono text-2xl font-bold">{uniqueArtists}</div>
          <div className="text-sm text-ink-light">artists supported</div>
        </div>
        <div className="border-l-2 border-ink pl-4">
          <ListeningStreak />
        </div>
      </div>

      {/* Activity chart */}
      <ListeningActivity />

      {/* Extension wallet */}
      <FundExtension onWalletDetected={onExtWalletDetected} />

      {/* Two-column: Top Artists + Platform Breakdown */}
      <div className="grid sm:grid-cols-2 gap-6 mb-12">
        <TopArtists />
        <PlatformBreakdown />
      </div>

      {/* Setup — collapsible once complete */}
      <div className="mb-12">
        {setupComplete ? (
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="flex items-center gap-3 w-full text-left"
          >
            <h2 className="text-xs uppercase tracking-widest text-ink-faint">setup</h2>
            <span className="text-xs text-onda font-bold">complete</span>
            <svg
              className={`w-3 h-3 text-ink-faint transition-transform ml-auto ${
                showSetup ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        ) : (
          <h2 className="text-xs uppercase tracking-widest text-ink-faint mb-4">setup</h2>
        )}

        {(!setupComplete || showSetup) && (
          <div className={`space-y-2 ${setupComplete ? "mt-4" : ""}`}>
            <Check done={isConnected} label="sign in" />
            <Check done={isHumanVerified} label="verify you're human" />
            <Check done={!!extWalletAddr} label="extension detected" />
            <Check done={balance > 0n} label="add funds" />
            <Check done={uniqueArtists > 0} label="play a track" />
          </div>
        )}
      </div>

      {/* Recent */}
      <div>
        <h2 className="text-xs uppercase tracking-widest text-ink-faint mb-4">recent</h2>
        <GiftFeed />
      </div>
    </div>
  );
}

function Check({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className={`w-5 h-5 border-2 flex items-center justify-center ${done ? "border-onda bg-onda" : "border-rule"}`}>
        {done && (
          <svg className="w-3 h-3 text-paper" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="square" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={done ? "text-ink-faint line-through" : ""}>{label}</span>
    </div>
  );
}
