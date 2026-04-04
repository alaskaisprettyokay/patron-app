"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useReadContract } from "wagmi";
import type { Address } from "viem";
import { ESCROW_ADDRESS, PATRON_ESCROW_ABI, formatUSDC } from "@/lib/contracts";
import { FundExtension } from "@/components/FundExtension";
import { TipFeed } from "@/components/TipFeed";
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
  const [tipsThisWeek, setTipsThisWeek] = useState(0);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type === "PATRON_STATUS" && event.data.status) {
        setUniqueArtists(event.data.status.uniqueArtists || 0);

        // Count tips from last 7 days
        const tips = event.data.status.recentTips || [];
        const weekAgo = Date.now() - 7 * 86400000;
        setTipsThisWeek(tips.filter((t: { timestamp: number }) => t.timestamp >= weekAgo).length);
      }
    };
    window.addEventListener("message", handler);
    window.postMessage({ type: "PATRON_REQUEST_STATUS" }, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  const { data: extBalance } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: PATRON_ESCROW_ABI,
    functionName: "listenerBalance",
    args: extWalletAddr ? [extWalletAddr] : undefined,
    query: { enabled: !!extWalletAddr, refetchInterval: 5000 },
  });

  const { data: extTotalTipped } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: PATRON_ESCROW_ABI,
    functionName: "totalTipped",
    args: extWalletAddr ? [extWalletAddr] : undefined,
    query: { enabled: !!extWalletAddr, refetchInterval: 5000 },
  });

  const balance = (extBalance as bigint) || 0n;
  const totalTipped = (extTotalTipped as bigint) || 0n;

  const onExtWalletDetected = useCallback((addr: string) => {
    setExtWalletAddr(addr as Address);
  }, []);

  // Determine if setup is complete
  const setupComplete =
    isConnected && isHumanVerified && !!extWalletAddr && balance > 0n && totalTipped > 0n;

  if (!isConnected) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-ink-light text-sm mb-6">
          Connect your wallet to start tipping artists.
        </p>
        <div className="card">
          <p className="text-ink-light text-sm">
            Use the connect button in the navigation bar to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-ink-faint text-xs mt-0.5">
            {tipsThisWeek > 0
              ? `${tipsThisWeek} tip${tipsThisWeek !== 1 ? "s" : ""} this week`
              : "Start listening to tip artists automatically"}
          </p>
        </div>
        <WorldIDVerify onVerified={() => setIsHumanVerified(true)} />
      </div>

      {/* Stats row */}
      <div className="grid sm:grid-cols-4 gap-px bg-rule mb-8 border border-rule">
        <div className="bg-paper p-4">
          <div className="section-label mb-1">Tip balance</div>
          <div className="mono-value text-xl font-bold">
            ${balance ? formatUSDC(balance) : "0.00"}
          </div>
          <div className="text-xs text-ink-faint mt-0.5">USDC available</div>
        </div>
        <div className="bg-paper p-4">
          <div className="section-label mb-1">Total tipped</div>
          <div className="mono-value text-xl font-bold text-accent">
            ${totalTipped ? formatUSDC(totalTipped) : "0.00"}
          </div>
          <div className="text-xs text-ink-faint mt-0.5">Lifetime</div>
        </div>
        <div className="bg-paper p-4">
          <div className="section-label mb-1">Artists</div>
          <div className="mono-value text-xl font-bold">{uniqueArtists}</div>
          <div className="text-xs text-ink-faint mt-0.5">Unique supported</div>
        </div>
        <ListeningStreak />
      </div>

      {/* Activity chart */}
      <ListeningActivity />

      {/* Extension wallet */}
      <FundExtension onWalletDetected={onExtWalletDetected} />

      {/* Two-column: Top Artists + Platform Breakdown */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <TopArtists />
        <PlatformBreakdown />
      </div>

      {/* Setup checklist — collapsible once complete */}
      {setupComplete ? (
        <button
          onClick={() => setShowSetup(!showSetup)}
          className="w-full text-left card mb-8 group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="section-label">Setup</div>
              <span className="text-xs text-accent font-medium">Complete</span>
            </div>
            <svg
              className={`w-3.5 h-3.5 text-ink-faint transition-transform ${
                showSetup ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
      ) : null}

      {(showSetup || !setupComplete) && (
        <div className="card mb-8">
          {!setupComplete && <div className="section-label mb-4">Setup</div>}
          <div className="space-y-2.5">
            <CheckItem done={isConnected} label="Connect wallet" />
            <CheckItem done={isHumanVerified} label="Verify humanity (World ID)" />
            <CheckItem done={!!extWalletAddr} label="Extension detected" />
            <CheckItem done={balance > 0n} label="Fund extension for auto-tips" />
            <CheckItem done={totalTipped > 0n} label="Play a track and auto-tip" />
          </div>
        </div>
      )}

      {/* Recent tips */}
      <div className="card">
        <div className="section-label mb-4">Recent tips</div>
        <TipFeed />
      </div>
    </div>
  );
}

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div
        className={`w-4 h-4 border flex items-center justify-center ${
          done ? "border-accent bg-accent-muted" : "border-rule-dark"
        }`}
      >
        {done && (
          <svg className="w-2.5 h-2.5 text-accent" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      <span className={done ? "text-ink-faint line-through" : "text-ink"}>
        {label}
      </span>
    </div>
  );
}
