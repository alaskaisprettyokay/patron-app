"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useReadContract } from "wagmi";
import type { Address } from "viem";
import { ESCROW_ADDRESS, ONDA_ESCROW_ABI, formatUSDC } from "@/lib/contracts";
import { FundExtension } from "@/components/FundExtension";
import { GiftFeed } from "@/components/GiftFeed";
import { WorldIDVerify } from "@/components/WorldIDVerify";

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [extWalletAddr, setExtWalletAddr] = useState<Address | undefined>();
  const [uniqueArtists, setUniqueArtists] = useState(0);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type === "ONDA_STATUS" && event.data.status) {
        setUniqueArtists(event.data.status.uniqueArtists || 0);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const { data: extBalance } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ONDA_ESCROW_ABI,
    functionName: "listenerBalance",
    args: extWalletAddr ? [extWalletAddr] : undefined,
    query: { enabled: !!extWalletAddr, refetchInterval: 5000 },
  });

  const { data: extTotalGiven } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ONDA_ESCROW_ABI,
    functionName: "totalTipped",
    args: extWalletAddr ? [extWalletAddr] : undefined,
    query: { enabled: !!extWalletAddr, refetchInterval: 5000 },
  });

  const balance = (extBalance as bigint) || 0n;
  const totalGiven = (extTotalGiven as bigint) || 0n;

  const onExtWalletDetected = useCallback((addr: string) => {
    setExtWalletAddr(addr as Address);
  }, []);

  if (!isConnected) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <h1 className="text-2xl font-bold mb-2">dashboard</h1>
        <p className="text-ink-light text-sm mb-6">
          sign in to start supporting artists.
        </p>
        <div className="card">
          <p className="text-ink-light text-sm">
            use the connect button in the navigation bar to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">dashboard</h1>
        <WorldIDVerify onVerified={() => setIsHumanVerified(true)} />
      </div>

      {/* Balance row */}
      <div className="grid sm:grid-cols-3 gap-px bg-rule mb-8 border border-rule">
        <div className="bg-paper p-4">
          <div className="section-label mb-1">gift balance</div>
          <div className="mono-value text-xl font-bold">
            ${balance ? formatUSDC(balance) : "0.00"}
          </div>
          <div className="text-xs text-ink-faint mt-0.5">available</div>
        </div>
        <div className="bg-paper p-4">
          <div className="section-label mb-1">total given</div>
          <div className="mono-value text-xl font-bold text-onda">
            ${totalGiven ? formatUSDC(totalGiven) : "0.00"}
          </div>
          <div className="text-xs text-ink-faint mt-0.5">lifetime</div>
        </div>
        <div className="bg-paper p-4">
          <div className="section-label mb-1">artists</div>
          <div className="mono-value text-xl font-bold">{uniqueArtists}</div>
          <div className="text-xs text-ink-faint mt-0.5">supported</div>
        </div>
      </div>

      {/* Extension wallet */}
      <FundExtension onWalletDetected={onExtWalletDetected} />

      {/* Setup checklist */}
      <div className="card mb-8">
        <div className="section-label mb-4">setup</div>
        <div className="space-y-2.5">
          <CheckItem done={isConnected} label="sign in" />
          <CheckItem done={isHumanVerified} label="verify you're human" />
          <CheckItem done={!!extWalletAddr} label="extension detected" />
          <CheckItem done={balance > 0n} label="add funds" />
          <CheckItem done={totalGiven > 0n} label="play a track" />
        </div>
      </div>

      {/* Recent gifts */}
      <div className="card">
        <div className="section-label mb-4">recent</div>
        <GiftFeed />
      </div>
    </div>
  );
}

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div
        className={`w-4 h-4 border flex items-center justify-center ${
          done ? "border-onda bg-onda-muted" : "border-rule-dark"
        }`}
      >
        {done && (
          <svg className="w-2.5 h-2.5 text-onda" fill="currentColor" viewBox="0 0 20 20">
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
