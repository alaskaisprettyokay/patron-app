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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-lg font-bold mb-1">dashboard</h1>
        <p className="text-ink-light text-xs mb-6">
          sign in to start supporting artists.
        </p>
        <div className="card">
          <p className="text-ink-light text-xs">
            use the connect button above to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold">dashboard</h1>
        <WorldIDVerify onVerified={() => setIsHumanVerified(true)} />
      </div>

      {/* Balance row — receipt style */}
      <div className="border border-rule mb-6">
        <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-rule">
          <div className="p-3">
            <div className="section-label mb-0.5">gift balance</div>
            <div className="mono-value text-lg font-bold">
              ${balance ? formatUSDC(balance) : "0.00"}
            </div>
          </div>
          <div className="p-3">
            <div className="section-label mb-0.5">total given</div>
            <div className="mono-value text-lg font-bold text-onda">
              ${totalGiven ? formatUSDC(totalGiven) : "0.00"}
            </div>
          </div>
          <div className="p-3">
            <div className="section-label mb-0.5">artists</div>
            <div className="mono-value text-lg font-bold">{uniqueArtists}</div>
          </div>
        </div>
      </div>

      {/* Extension wallet */}
      <FundExtension onWalletDetected={onExtWalletDetected} />

      {/* Setup checklist */}
      <div className="card mb-6">
        <div className="section-label mb-3">setup</div>
        <div className="space-y-2">
          <CheckItem done={isConnected} label="sign in" />
          <CheckItem done={isHumanVerified} label="verify you're human" />
          <CheckItem done={!!extWalletAddr} label="extension detected" />
          <CheckItem done={balance > 0n} label="add funds" />
          <CheckItem done={totalGiven > 0n} label="play a track" />
        </div>
      </div>

      {/* Recent gifts */}
      <div className="card">
        <div className="section-label mb-3">recent</div>
        <GiftFeed />
      </div>
    </div>
  );
}

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5 font-mono text-xs">
      <span className={done ? "text-onda" : "text-ink-faint"}>
        {done ? "[x]" : "[ ]"}
      </span>
      <span className={done ? "text-ink-faint line-through" : "text-ink"}>
        {label}
      </span>
    </div>
  );
}
