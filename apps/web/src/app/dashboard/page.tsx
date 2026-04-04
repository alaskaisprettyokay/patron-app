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
        <div className="max-w-md">
          <div className="text-display font-bold mb-4">--</div>
          <p className="text-ink-light text-sm font-mono">
            sign in to start supporting artists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Hero number — total given is the star */}
      <div className="mb-8">
        <div className="section-label mb-1">total given</div>
        <div className="text-display font-bold text-onda">
          ${totalGiven ? formatUSDC(totalGiven) : "0.00"}
        </div>
      </div>

      {/* Stats row — secondary numbers */}
      <div className="flex gap-8 mb-8 font-mono">
        <div>
          <div className="big-number">${balance ? formatUSDC(balance) : "0.00"}</div>
          <div className="section-label mt-0.5">balance</div>
        </div>
        <div>
          <div className="big-number">{uniqueArtists}</div>
          <div className="section-label mt-0.5">artists</div>
        </div>
        <div className="ml-auto">
          <WorldIDVerify onVerified={() => setIsHumanVerified(true)} />
        </div>
      </div>

      <div className="receipt-divider" />

      {/* Extension wallet */}
      <FundExtension onWalletDetected={onExtWalletDetected} />

      <div className="receipt-divider" />

      {/* Setup — monospace checklist */}
      <div className="mb-6">
        <div className="section-label mb-3">setup</div>
        <div className="font-mono text-xs space-y-1">
          <CheckItem done={isConnected} label="sign in" />
          <CheckItem done={isHumanVerified} label="verify you're human" />
          <CheckItem done={!!extWalletAddr} label="extension detected" />
          <CheckItem done={balance > 0n} label="add funds" />
          <CheckItem done={totalGiven > 0n} label="play a track" />
        </div>
      </div>

      <div className="receipt-divider" />

      {/* Recent gifts — the receipt */}
      <div>
        <div className="section-label mb-3">recent</div>
        <GiftFeed />
      </div>
    </div>
  );
}

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={done ? "text-onda" : "text-rule-dark"}>
        {done ? "[x]" : "[ ]"}
      </span>
      <span className={done ? "text-ink-faint line-through" : "text-ink"}>
        {label}
      </span>
    </div>
  );
}
